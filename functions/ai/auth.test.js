const test = require("node:test");
const assert = require("node:assert/strict");
const { processMessage } = require("../index");

test("message rejects callers without Firebase Auth", async () => {
  for (const callable of [processMessage]) {
    await assert.rejects(
      callable.run({ data: {}, auth: null }),
      (error) => error.code === "unauthenticated",
    );
  }
});
