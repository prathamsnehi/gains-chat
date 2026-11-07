import type { PendingMessage } from "../data/localStore";
import type {
  ProcessMessageRequest,
  ProcessMessageResponse,
} from "../data/aiClient";

type Dependencies = {
  store: {
    listPendingMessages(): Promise<PendingMessage[]>;
    updatePendingMessage(item: PendingMessage): Promise<void>;
  };
  prepare(): Promise<void>;
  buildRequest(item: PendingMessage): Promise<ProcessMessageRequest>;
  buildHistoryRequest(
    request: ProcessMessageRequest,
  ): Promise<ProcessMessageRequest>;
  send(request: ProcessMessageRequest): Promise<ProcessMessageResponse>;
  complete(
    item: PendingMessage,
    response: ProcessMessageResponse,
    timing: { functionMs: number; processingMs: number; queueDelayMs: number },
  ): Promise<void>;
  failed(error: unknown): Promise<void>;
  errorMessage(error: unknown): string;
};

// Freeze the JSON wire payload before sending. Context must not change for an ID.
const wireRequest = (request: ProcessMessageRequest): ProcessMessageRequest =>
  JSON.parse(JSON.stringify(request));

export function createDurableQueue(deps: Dependencies) {
  let running: Promise<void> | undefined;
  let requested = false;

  async function run(): Promise<boolean> {
    for (;;) {
      requested = false;
      const queue = await deps.store.listPendingMessages();
      const first = queue.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      )[0];
      if (!first) {
        if (requested) continue;
        return false;
      }
      let active = first;
      const started = Date.now();
      let functionMs = 0;
      const send = async (request: ProcessMessageRequest) => {
        const callStarted = Date.now();
        try {
          return await deps.send(request);
        } finally {
          functionMs += Date.now() - callStarted;
        }
      };
      try {
        await deps.prepare();
        active = {
          ...active,
          phase: active.phase ?? "message",
          request:
            active.request ?? wireRequest(await deps.buildRequest(active)),
          status: "processing",
          lastError: undefined,
        };
        active.requestId = active.request!.requestId;
        await deps.store.updatePendingMessage(active);
        let response = await send(active.request!);
        if (response.requestId !== active.requestId)
          throw new Error("Response request ID did not match.");
        if (response.kind === "history_request" && active.phase !== "history") {
          const request = wireRequest(
            await deps.buildHistoryRequest(active.request!),
          );
          active = {
            ...active,
            request,
            requestId: request.requestId,
            phase: "history",
          };
          await deps.store.updatePendingMessage(active);
          response = await send(request);
          if (response.requestId !== active.requestId)
            throw new Error("Response request ID did not match.");
        }
        if (response.kind === "history_request")
          throw new Error("History lookup did not complete.");
        await deps.complete(active, response, {
          functionMs,
          processingMs: Date.now() - started,
          queueDelayMs: Math.max(0, started - Date.parse(active.createdAt)),
        });
      } catch (error) {
        await deps.store.updatePendingMessage({
          ...active,
          status: "pending",
          attemptCount: (active.attemptCount ?? 0) + 1,
          lastError: deps.errorMessage(error),
        });
        await deps.failed(error);
        return true; // Stop at the failed head; a later explicit/network retry resumes it.
      }
      // Read again after every success, including messages added during a send.
    }
  }

  function drain(): Promise<void> {
    requested = true;
    if (running) return running;
    running = run().then(
      (blocked) => {
        running = undefined;
        // Cover a wake-up between observing an empty queue and settling this promise.
        if (!blocked && requested) return drain();
      },
      async (error) => {
        running = undefined;
        await deps.failed(error);
      },
    );
    return running;
  }
  return { drain };
}
