import test from "node:test";
import assert from "node:assert/strict";
import { createDurableQueue } from "./durableQueue";
import type { PendingMessage } from "../data/localStore";
import type { ProcessMessageRequest } from "../data/aiClient";

const clone = <T>(value: T): T => structuredClone(value);
const pending = (id: string): PendingMessage => ({
  id,
  requestId: `request-${id}`,
  text: "How was bench?",
  status: "pending",
  createdAt: id,
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  const records = new Map<string, PendingMessage>([["a", pending("a")]]);
  const calls: ProcessMessageRequest[] = [];
  const completed: string[] = [];
  let context = "original context";
  const deps = {
    store: {
      async listPendingMessages() {
        return clone([...records.values()]);
      },
      async updatePendingMessage(item: PendingMessage) {
        records.set(item.id, clone(item));
      },
    },
    prepare: async () => {},
    async buildRequest(item: PendingMessage): Promise<ProcessMessageRequest> {
      return {
        requestId: item.requestId,
        text: item.text,
        candidates: [],
        recentMessages: [{ role: "assistant", text: context }],
      };
    },
    async buildHistoryRequest(
      request: ProcessMessageRequest,
    ): Promise<ProcessMessageRequest> {
      return {
        ...request,
        requestId: "request-history",
        historyLookupComplete: true,
        historySnippets: [],
      };
    },
    async send(request: ProcessMessageRequest): Promise<any> {
      calls.push(clone(request));
      return {
        kind: "chat_reply",
        requestId: request.requestId,
        message: "Done",
      };
    },
    async complete(item: PendingMessage) {
      completed.push(item.id);
      records.delete(item.id);
    },
    failed: async () => {},
    errorMessage: () => "Retry this message.",
  };
  return {
    records,
    calls,
    completed,
    deps,
    changeContext: () => {
      context = "changed context";
    },
  };
}

test("drains messages enqueued while a provider request is in flight", async () => {
  const f = fixture();
  const entered = deferred();
  const release = deferred();
  const send = f.deps.send;
  f.deps.send = async (request) => {
    if (!f.calls.length) {
      entered.resolve();
      await release.promise;
    }
    return send(request);
  };
  const queue = createDurableQueue(f.deps);
  const draining = queue.drain();
  await entered.promise;
  f.records.set("b", pending("b"));
  assert.equal(queue.drain(), draining);
  release.resolve();
  await draining;
  assert.deepEqual(f.completed, ["a", "b"]);
  assert.equal(f.records.size, 0);
});

test("a restarted queue retries exactly the persisted request after context changes", async () => {
  const f = fixture();
  const send = f.deps.send;
  f.deps.send = async (request) => {
    f.calls.push(clone(request));
    throw new Error("lost response");
  };
  await createDurableQueue(f.deps).drain();
  assert.equal(f.records.get("a")!.attemptCount, 1);
  f.changeContext();
  f.deps.buildRequest = async () => {
    throw new Error("Must use persisted payload");
  };
  f.deps.send = send;
  await createDurableQueue(f.deps).drain();
  assert.deepEqual(f.calls[0], f.calls[1]);
  assert.equal(f.records.size, 0);
});

test("history follow-up ID, phase and payload survive failure and process restart", async () => {
  const f = fixture();
  f.deps.send = async (request) => {
    f.calls.push(clone(request));
    if (!request.historyLookupComplete)
      return {
        kind: "history_request",
        requestId: request.requestId,
        message: "Look up history",
      };
    throw new Error("network failed after follow-up transmission");
  };
  await createDurableQueue(f.deps).drain();
  assert.equal(f.records.get("a")!.phase, "history");
  assert.equal(f.records.get("a")!.requestId, "request-history");
  f.deps.buildHistoryRequest = async () => {
    throw new Error("Must not generate another ID");
  };
  f.deps.send = async (request) => {
    f.calls.push(clone(request));
    return {
      kind: "chat_reply",
      requestId: request.requestId,
      message: "History",
    };
  };
  await createDurableQueue(f.deps).drain();
  assert.equal(f.calls.length, 3);
  assert.deepEqual(f.calls[1], f.calls[2]);
  assert.equal(f.records.size, 0);
});

test("failure stops the ordered queue without spinning or sending later messages", async () => {
  const f = fixture();
  f.records.set("b", pending("b"));
  f.deps.send = async (request) => {
    f.calls.push(clone(request));
    throw new Error("offline");
  };
  await createDurableQueue(f.deps).drain();
  assert.equal(f.calls.length, 1);
  assert.equal(f.records.get("b")!.attemptCount, undefined);
  assert.equal(f.records.get("a")!.status, "pending");
});

test("rejects mismatched response IDs and preserves the original request for retry", async () => {
  const f = fixture();
  f.deps.send = async () => ({
    kind: "chat_reply",
    requestId: "wrong-id",
    message: "Wrong response",
  });
  await createDurableQueue(f.deps).drain();
  assert.equal(f.completed.length, 0);
  assert.equal(f.records.get("a")!.requestId, "request-a");
});

test("a failed durable write prevents network transmission", async () => {
  const f = fixture();
  f.deps.store.updatePendingMessage = async () => {
    throw new Error("disk unavailable");
  };
  await createDurableQueue(f.deps).drain();
  assert.equal(f.calls.length, 0);
});

test("a wake-up during an empty storage read is not lost", async () => {
  const f = fixture();
  f.records.clear();
  const entered = deferred();
  const release = deferred();
  const list = f.deps.store.listPendingMessages;
  let firstRead = true;
  f.deps.store.listPendingMessages = async () => {
    if (firstRead) {
      firstRead = false;
      entered.resolve();
      await release.promise;
      return [];
    }
    return list();
  };
  const queue = createDurableQueue(f.deps);
  const draining = queue.drain();
  await entered.promise;
  f.records.set("a", pending("a"));
  void queue.drain();
  release.resolve();
  await draining;
  assert.deepEqual(f.completed, ["a"]);
});

test("overlapping wake-ups do not spin on a provider failure", async () => {
  const f = fixture();
  const entered = deferred();
  const release = deferred();
  f.deps.send = async (request) => {
    f.calls.push(clone(request));
    entered.resolve();
    await release.promise;
    throw new Error("provider unavailable");
  };
  const queue = createDurableQueue(f.deps);
  const draining = queue.drain();
  await entered.promise;
  f.records.set("b", pending("b"));
  void queue.drain();
  release.resolve();
  await draining;
  assert.equal(f.calls.length, 1);
  assert.equal(f.records.size, 2);
});
