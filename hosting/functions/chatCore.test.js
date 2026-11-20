const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const {
  TOKENROUTER_URL,
  chatOptions,
  buildMessages,
  handleChat,
} = require("./chatCore");

function response() {
  return {
    statusCode: 0,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("App Check is required before TokenRouter is called", async () => {
  assert.equal(chatOptions.enforceAppCheck, true);
  let called = false;
  const res = response();
  await handleChat(
    { method: "POST", body: { text: "what did I bench" }, headers: {} },
    res,
    {
      apiKey: "secret",
      model: "openai/gpt-5-mini",
      fetch: async () => {
        called = true;
        throw new Error("should not be called");
      },
    },
  );
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "App Check required.");
});

test("a question is sent to TokenRouter with only the supplied lifts", async () => {
  let sent;
  const res = response();
  await handleChat(
    {
      method: "POST",
      headers: { "x-firebase-appcheck": "token" },
      body: {
        text: "what was the last weight I did on the bench press",
        lifts: [
          {
            exerciseName: "Barbell Bench Press",
            weight: 165,
            reps: 5,
            unit: "lb",
            performedAt: "2024-05-01T12:00:00Z",
          },
          { exerciseName: "", weight: 1, reps: 1 },
        ],
      },
    },
    res,
    {
      apiKey: "secret",
      model: "openai/gpt-5-mini",
      fetch: async (url, options) => {
        sent = { url, options };
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "It was 165 lb for 5 reps." } }],
          }),
        };
      },
    },
  );
  assert.equal(sent.url, TOKENROUTER_URL);
  const body = JSON.parse(sent.options.body);
  assert.equal(body.model, "openai/gpt-5-mini");
  assert.equal(sent.options.headers.Authorization, "Bearer secret");
  assert.match(body.messages[0].content, /Barbell Bench Press, 165 lb × 5/);
  assert.match(body.messages[0].content, /Never invent lifts/);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "It was 165 lb for 5 reps.");
});

test("the prompt refuses to treat missing records as another exercise", () => {
  const messages = buildMessages("what did I curl", []);
  assert.match(messages[0].content, /No matching records/);
  assert.match(messages[0].content, /Never claim you logged a set/);
});

test("the preserved privacy policy is what Hosting will serve", () => {
  const policy = fs.readFileSync(
    path.join(__dirname, "../public/privacy-policy.html"),
    "utf8",
  );
  const firebase = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../firebase.json"), "utf8"),
  );
  assert.match(policy, /Privacy Policy for Gains Chat/);
  assert.equal(firebase.hosting.public, "hosting/public");
  assert.equal(firebase.hosting.cleanUrls, true);
  assert.deepEqual(firebase.hosting.rewrites, [
    { source: "/chat", function: { functionId: "chat", region: "us-central1" } },
  ]);
});
