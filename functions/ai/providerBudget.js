const PROVIDER_BUDGET_MS = 24_000;
const JEV_TIMEOUT_MS = 8_000;
const GEMINI_TIMEOUT_MS = 12_000;

async function runProvider(deadline, maximumMs, operation, now = Date.now) {
  const timeoutMs = Math.min(maximumMs, deadline - now());
  if (timeoutMs <= 0) throw new Error("PROVIDER_DEADLINE_EXCEEDED");
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("PROVIDER_DEADLINE_EXCEEDED");
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() =>
        operation({ signal: controller.signal, timeoutMs }),
      ),
      expired,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  runProvider,
  PROVIDER_BUDGET_MS,
  JEV_TIMEOUT_MS,
  GEMINI_TIMEOUT_MS,
};
