const test = require("node:test");
const assert = require("node:assert/strict");
const { processMessageCore } = require("./messageService");

function fixture() {
  const docs = new Map();
  const db = {
    docs,
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`;
          return {
            key,
            async update(value) {
              docs.set(key, { ...docs.get(key), ...value });
            },
            async delete() {
              docs.delete(key);
            },
          };
        },
      };
    },
    async runTransaction(operation) {
      const writes = [];
      const result = await operation({
        get: async (ref) => ({
          exists: docs.has(ref.key),
          data: () => docs.get(ref.key),
        }),
        set: (ref, value) => writes.push([ref.key, value]),
      });
      for (const [key, value] of writes) docs.set(key, value);
      return result;
    },
  };
  let classifyCalls = 0;
  let replyCalls = 0;
  const providers = {
    async classify(_input, _key, options) {
      classifyCalls++;
      assert.ok(options.timeoutMs <= 8000);
      return {
        intent: {
          type: "choice",
          choice: "chat",
          probabilities: { chat: 0.99 },
        },
      };
    },
    async reply(_input, _key, _history, options) {
      replyCalls++;
      assert.ok(options.timeoutMs <= 12000);
      return "Hello";
    },
  };
  const input = {
    db,
    uid: "user1",
    data: { requestId: "request-test", text: "Hello", candidates: [] },
    jevKey: "unused",
    geminiKey: "unused",
    providers,
    logger: { info() {} },
  };
  return { db, input, calls: () => [classifyCalls, replyCalls] };
}

test("a cached response replays without a provider call or another quota charge", async () => {
  const f = fixture();
  const first = await processMessageCore(f.input);
  assert.deepEqual(await processMessageCore(f.input), first);
  assert.deepEqual(f.calls(), [1, 1]);
  const counter = [...f.db.docs.entries()].find(([key]) =>
    key.startsWith("messageLimits/hour_"),
  )[1];
  assert.equal(counter.count, 1);
});

test("provider failure clears the request marker but retains charged quota", async () => {
  const f = fixture();
  f.input.providers.reply = async () => {
    throw Object.assign(new Error("unavailable"), { status: 503 });
  };
  await assert.rejects(processMessageCore(f.input), /unavailable/);
  assert.equal(f.db.docs.has("messageRequests/user1_request-test"), false);
  f.input.providers.reply = async () => "Recovered";
  assert.equal((await processMessageCore(f.input)).message, "Recovered");
  const counter = [...f.db.docs.entries()].find(([key]) =>
    key.startsWith("messageLimits/hour_"),
  )[1];
  assert.equal(counter.count, 2);
});

test("the provider deadline includes time already spent charging the request", async () => {
  const f = fixture();
  let now = 0;
  const transaction = f.db.runTransaction;
  f.db.runTransaction = async (operation) => {
    const result = await transaction(operation);
    now = 24_001;
    return result;
  };
  await assert.rejects(
    processMessageCore({ ...f.input, now: () => now }),
    /PROVIDER_DEADLINE_EXCEEDED/,
  );
  assert.deepEqual(f.calls(), [0, 0]);
  assert.equal(f.db.docs.has("messageRequests/user1_request-test"), false);
});
