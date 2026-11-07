// One synthetic request per provider; no workout data or Firestore writes.
// Secret values remain in memory and are never passed as shell arguments.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { classifyWithJev } = require("../functions/ai/jev");
const { chatReply } = require("../functions/ai/messageService");
const { validateMessageInput } = require("../functions/ai/messageLogic");
const { runProvider } = require("../functions/ai/providerBudget");

function secret(name) {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve(
        __dirname,
        "../functions/node_modules/firebase-tools/lib/bin/firebase.js",
      ),
      "functions:secrets:access",
      name,
      "--project",
      "gains-chat",
      "--non-interactive",
    ],
    {
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, DEBUG: "", NODE_DEBUG: "", EXPO_DEBUG: "" },
    },
  );
  if (result.status !== 0 || !result.stdout.trim())
    throw new Error("SECRET_ACCESS_FAILED");
  return result.stdout.trim();
}

(async () => {
  const input = validateMessageInput({
    requestId: "migration-provider-check",
    text: "Hello",
    candidates: [],
  });
  for (const [provider, name, maximumMs, call] of [
    [
      "jev",
      "TYPESAFE_API_KEY",
      8000,
      (key, options) => classifyWithJev(input, key, options),
    ],
    [
      "gemini",
      "GEMINI_API_KEY",
      12000,
      (key, options) => chatReply(input, key, false, options),
    ],
  ]) {
    const start = Date.now();
    try {
      const key = secret(name);
      const result = await runProvider(
        Date.now() + maximumMs,
        maximumMs,
        (options) => call(key, options),
      );
      if (!result) throw new Error("EMPTY_PROVIDER_RESPONSE");
      console.log(
        JSON.stringify({
          provider,
          available: true,
          elapsedMs: Date.now() - start,
        }),
      );
    } catch (error) {
      // Do not print provider messages, SDK responses, CLI output, or credentials.
      console.log(
        JSON.stringify({
          provider,
          available: false,
          code:
            error.message === "SECRET_ACCESS_FAILED"
              ? "SECRET_ACCESS_FAILED"
              : "PROVIDER_CHECK_FAILED",
          status: Number.isInteger(error.status) ? error.status : null,
        }),
      );
      process.exitCode = 1;
    }
  }
})();
