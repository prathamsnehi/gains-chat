const test = require("node:test");
const assert = require("node:assert/strict");
const { processMessage, exportLegacyData } = require("../index");

test("message and legacy export reject callers without Firebase Auth", async () => {
  for (const callable of [processMessage, exportLegacyData]) {
    await assert.rejects(
      callable.run({ data: {}, auth: null }),
      (error) => error.code === "unauthenticated",
    );
  }
});
