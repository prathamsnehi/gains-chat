const crypto = require("node:crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { validateMessageInput, routeMessage } = require("./messageLogic");
const { classifyWithJev } = require("./jev");
const { chargeMessage } = require("./limits");
const {
  runProvider,
  PROVIDER_BUDGET_MS,
  JEV_TIMEOUT_MS,
  GEMINI_TIMEOUT_MS,
} = require("./providerBudget");

let gemini;
let firstInvocation = true;
function geminiClient(apiKey) {
  if (!gemini)
    gemini = new GoogleGenAI({
      apiKey,
      httpOptions: { retryOptions: { attempts: 1 } },
    });
  return gemini;
}

async function chatReply(
  input,
  apiKey,
  historyMode,
  { signal, timeoutMs = GEMINI_TIMEOUT_MS } = {},
) {
  const snippets = input.historySnippets
    .map(
      (x) =>
        x.date +
        ": " +
        x.exerciseName +
        ", " +
        x.weight +
        " " +
        x.unit +
        " × " +
        x.reps,
    )
    .join("\n");
  const conversation = input.recentMessages
    .map((x) => x.role + ": " + x.text)
    .join("\n");
  const prompt = [
    "You are Gains Chat, a friendly gym companion. Match casual gym banter when invited. Be concise, kind, and specific. Do not pretend to have logged a lift. Do not give unsolicited coaching.",
    historyMode
      ? "Answer only from these local workout records. If there are no records, say that no matching lifts were found. If the records do not answer the question, say so. Never invent lifts.\n" +
        (snippets || "(No matching records)")
      : "",
    conversation ? "Recent chat:\n" + conversation : "",
    "User: " + input.text,
  ]
    .filter(Boolean)
    .join("\n\n");
  const response = await geminiClient(apiKey).models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      maxOutputTokens: 180,
      temperature: 0.65,
      abortSignal: signal,
      httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
    },
  });
  return typeof response.text === "string" && response.text.trim()
    ? response.text.trim().slice(0, 900)
    : "I’m here. Tell me what’s up.";
}

async function processMessageCore({
  data,
  uid,
  db,
  jevKey,
  geminiKey,
  logger = console,
  providers = { classify: classifyWithJev, reply: chatReply },
  now = Date.now,
}) {
  const started = now();
  const deadline = started + PROVIDER_BUDGET_MS;
  const coldStart = firstInvocation;
  firstInvocation = false;
  const input = validateMessageInput(data);
  const rate = await chargeMessage(db, uid, input);
  if (rate.replay) {
    if (rate.result) return rate.result;
    throw new HttpsError(
      "aborted",
      "This message is still processing. Retry shortly.",
    );
  }
  const requestRef = db
    .collection("messageRequests")
    .doc(uid + "_" + input.requestId);
  try {
    const classifiedAt = Date.now();
    const answers = await runProvider(
      deadline,
      JEV_TIMEOUT_MS,
      (options) => providers.classify(input, jevKey, options),
      now,
    );
    const jevMs = Date.now() - classifiedAt;
    const decision = routeMessage(input, answers);
    let result = decision;
    let geminiMs = 0;
    if (
      decision.kind === "chat_needed" ||
      decision.kind === "history_answer_needed"
    ) {
      const geminiAt = Date.now();
      const message = await runProvider(
        deadline,
        GEMINI_TIMEOUT_MS,
        (options) =>
          providers.reply(
            input,
            geminiKey,
            decision.kind === "history_answer_needed",
            options,
          ),
        now,
      );
      geminiMs = Date.now() - geminiAt;
      result = { kind: "chat_reply", message };
    }
    const response = { ...result, requestId: input.requestId };
    await requestRef.update({ result: response, finishedAt: new Date() });
    logger.info("processMessage timing", {
      traceId: crypto.randomUUID(),
      coldStart,
      jevMs,
      geminiMs,
      totalMs: Date.now() - started,
      replay: false,
      kind: result.kind,
    });
    return response;
  } catch (error) {
    // A failed attempt stays charged, but its request ID must be retryable.
    await requestRef.delete().catch(() => {});
    throw error;
  }
}

module.exports = { processMessageCore, chatReply };
