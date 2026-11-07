// Only these fixed fields are safe to send to operational logs. Provider SDK
// messages and response bodies can contain user text, prompts, or credentials.
const STAGES = new Set(["jev_classify", "gemini_generate", "unknown"]);
const PROVIDERS = new Set(["jev", "gemini", "unknown"]);
const PROVIDER_CODES = new Set([
  "INVALID_ARGUMENT",
  "UNAUTHENTICATED",
  "PERMISSION_DENIED",
  "RESOURCE_EXHAUSTED",
  "NOT_FOUND",
  "FAILED_PRECONDITION",
  "DEADLINE_EXCEEDED",
  "INTERNAL",
  "UNAVAILABLE",
  "OVERLOADED",
  "QUOTA_EXCEEDED",
  "API_KEY_INVALID",
  "MODEL_NOT_FOUND",
  "CLIENT_ERROR",
  "SERVER_ERROR",
]);
const METADATA = Symbol("gainschat.providerErrorMetadata");

function object(value) {
  return value !== null && (typeof value === "object" || typeof value === "function") ? value : {};
}

function safeGet(value, key) {
  try {
    return object(value)[key];
  } catch {
    return undefined;
  }
}

function statusFrom(error) {
  const candidates = [
    safeGet(error, "status"),
    safeGet(error, "statusCode"),
    safeGet(safeGet(error, "response"), "status"),
    safeGet(safeGet(error, "error"), "code"),
  ];
  for (const candidate of candidates) {
    const number = typeof candidate === "number" ? candidate : /^\d{3}$/.test(candidate) ? Number(candidate) : NaN;
    if (Number.isInteger(number) && number >= 400 && number <= 599) return number;
  }
  // Our Jev adapter constructs only this exact, bounded error shape.
  const message = safeGet(error, "message");
  const jevMatch = typeof message === "string" ? /^JEV_HTTP_(\d{3})$/.exec(message) : null;
  if (jevMatch) {
    const number = Number(jevMatch[1]);
    if (number >= 400 && number <= 599) return number;
  }
  // @google/genai 1.5.1 puts the HTTP status only in its message:
  // "got status: 400 ...". Extract digits from that fixed prefix only.
  const googlePrefix = typeof message === "string" ? /^got status: ([45]\d{2})\b/.exec(message) : null;
  if (googlePrefix) return Number(googlePrefix[1]);
  // Other SDK versions may use a plain numeric prefix.
  const sdkPrefix = typeof message === "string" ? /^([45]\d{2})(?:\s|$)/.exec(message) : null;
  if (sdkPrefix) return Number(sdkPrefix[1]);
  return null;
}

function codeFrom(error) {
  const message = safeGet(error, "message");
  let googleBody = {};
  if (typeof message === "string" && message.length <= 20_000 && /^got status: [45]\d{2}\b/.test(message)) {
    const bodyStart = message.indexOf(". {");
    if (bodyStart >= 0) {
      try {
        googleBody = JSON.parse(message.slice(bodyStart + 2));
      } catch {
        googleBody = {};
      }
    }
  }
  const googleError = safeGet(googleBody, "error");
  const googleDetails = safeGet(googleError, "details");
  const details = safeGet(error, "errorDetails");
  const reasons = Array.isArray(details) ? details.slice(0, 8).map((detail) => safeGet(detail, "reason")) : [];
  const googleReasons = Array.isArray(googleDetails) ? googleDetails.slice(0, 8).map((detail) => safeGet(detail, "reason")) : [];
  const candidates = [
    ...googleReasons,
    safeGet(googleError, "status"),
    safeGet(error, "code"),
    safeGet(error, "status"),
    safeGet(safeGet(error, "error"), "status"),
    safeGet(safeGet(error, "error"), "code"),
    ...reasons,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && PROVIDER_CODES.has(candidate)) return candidate;
  }
  const name = safeGet(error, "name");
  if (name === "ClientError") return "CLIENT_ERROR";
  if (name === "ServerError") return "SERVER_ERROR";
  return "UNSPECIFIED";
}

function providerErrorMetadata(error, context = {}) {
  const saved = safeGet(error, METADATA);
  if (saved) return { ...saved };
  const stage = STAGES.has(context.stage) ? context.stage : "unknown";
  const provider = PROVIDERS.has(context.provider) ? context.provider : "unknown";
  return { stage, provider, status: statusFrom(error), providerCode: codeFrom(error) };
}

function wrapProviderError(error, context) {
  // Deliberately omit cause: generic error serializers may include it.
  const wrapped = new Error("PROVIDER_FAILURE");
  Object.defineProperty(wrapped, METADATA, { value: providerErrorMetadata(error, context) });
  return wrapped;
}

module.exports = { providerErrorMetadata, wrapProviderError };
