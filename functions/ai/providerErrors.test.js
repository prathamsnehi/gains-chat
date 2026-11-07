const test = require("node:test");
const assert = require("node:assert/strict");
const { providerErrorMetadata, wrapProviderError } = require("./providerErrors");

test("classifies Gemini ClientError without logging its message or payload", () => {
  const secret = "private-key-and-user-message";
  const sdkError = Object.assign(new Error("400 " + secret), {
    name: "ClientError",
    status: 400,
    errorDetails: [{ reason: "API_KEY_INVALID", debug: secret }],
    response: { body: secret },
  });
  const wrapped = wrapProviderError(sdkError, { stage: "gemini_generate", provider: "gemini" });
  const metadata = providerErrorMetadata(wrapped);
  assert.deepEqual(metadata, {
    stage: "gemini_generate", provider: "gemini", status: 400, providerCode: "API_KEY_INVALID",
  });
  assert.equal(JSON.stringify(metadata).includes(secret), false);
  assert.equal(JSON.stringify(wrapped), "{}");
});

test("extracts only bounded status from the Jev adapter error", () => {
  const error = new Error("JEV_HTTP_429");
  assert.deepEqual(providerErrorMetadata(error, { stage: "jev_classify", provider: "jev" }), {
    stage: "jev_classify", provider: "jev", status: 429, providerCode: "UNSPECIFIED",
  });
});

test("recognizes a Google SDK status prefix without retaining message text", () => {
  const metadata = providerErrorMetadata(
    Object.assign(new Error("403 This message includes private text"), { name: "ClientError" }),
    { stage: "gemini_generate", provider: "gemini" },
  );
  assert.deepEqual(metadata, { stage: "gemini_generate", provider: "gemini", status: 403, providerCode: "CLIENT_ERROR" });
});

test("extracts status from the installed Google GenAI SDK error format", () => {
  const metadata = providerErrorMetadata(
    Object.assign(new Error('got status: 400 Bad Request. {"error":{"message":"private prompt"}}'), { name: "ClientError" }),
    { stage: "gemini_generate", provider: "gemini" },
  );
  assert.deepEqual(metadata, { stage: "gemini_generate", provider: "gemini", status: 400, providerCode: "CLIENT_ERROR" });
});

test("keeps only allowlisted Google error detail codes", () => {
  const error = Object.assign(new Error('got status: 400 Bad Request. {"error":{"message":"private key data","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID","metadata":"private key data"}]}}'), {
    name: "ClientError",
  });
  const metadata = providerErrorMetadata(error, { stage: "gemini_generate", provider: "gemini" });
  assert.deepEqual(metadata, { stage: "gemini_generate", provider: "gemini", status: 400, providerCode: "API_KEY_INVALID" });
  assert.equal(JSON.stringify(metadata).includes("private key data"), false);
});

test("rejects arbitrary provider codes, stages, and statuses", () => {
  const error = Object.assign(new Error("prompt with private data"), {
    status: 200,
    code: "USER_TEXT_AND_API_KEY",
    response: { status: "500; private text" },
  });
  assert.deepEqual(providerErrorMetadata(error, { stage: "user supplied", provider: "secret service" }), {
    stage: "unknown", provider: "unknown", status: null, providerCode: "UNSPECIFIED",
  });
});

test("handles throwing getters without exposing raw errors", () => {
  const error = { get status() { throw new Error("secret"); }, get code() { throw new Error("secret"); } };
  assert.deepEqual(providerErrorMetadata(error, { stage: "gemini_generate", provider: "gemini" }), {
    stage: "gemini_generate", provider: "gemini", status: null, providerCode: "UNSPECIFIED",
  });
});
