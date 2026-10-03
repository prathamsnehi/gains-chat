const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const moduleObject = { exports: {} };
vm.runInNewContext(fs.readFileSync(require.resolve("./limits"), "utf8"), {
  module: moduleObject,
  require: (name) =>
    name === "firebase-functions/v2/https" ? { HttpsError } : require(name),
  Date,
  JSON,
  Promise,
});
const { chargeMessage, chargeLegacyExport } = moduleObject.exports;

function database() {
  const docs = new Map();
  return {
    docs,
    collection(name) {
      return { doc: (id) => ({ key: name + "/" + id }) };
    },
    async runTransaction(fn) {
      const pending = [];
      const tx = {
        get: async (ref) => ({
          exists: docs.has(ref.key),
          data: () => docs.get(ref.key),
        }),
        set: (ref, value) => pending.push([ref.key, value]),
      };
      const result = await fn(tx);
      pending.forEach(([key, value]) => docs.set(key, value));
      return result;
    },
  };
}
const fixedDate = new Date("2026-10-03T15:20:00Z");
const message = {
  requestId: "request_123",
  text: "bench 225 6",
  candidates: [],
};

test("message request ID replay does not consume quota", async () => {
  const db = database();
  assert.equal(
    (await chargeMessage(db, "user1", message, fixedDate)).replay,
    false,
  );
  const pendingReplay = await chargeMessage(db, "user1", message, fixedDate);
  assert.equal(pendingReplay.replay, true);
  assert.equal(pendingReplay.pending, true);
  assert.equal(db.docs.get("messageLimits/hour_user1_2026-10-03T15").count, 1);
  const saved = { kind: "lift_draft", requestId: message.requestId };
  db.docs.get("messageRequests/user1_request_123").result = saved;
  assert.equal(
    (await chargeMessage(db, "user1", message, fixedDate)).result,
    saved,
  );
  await assert.rejects(
    chargeMessage(db, "user1", { ...message, text: "other" }, fixedDate),
    (error) => error.code === "already-exists",
  );
});

test("a stale unfinished request retries against the same cost limits", async () => {
  const db = database();
  await chargeMessage(db, "user1", message, fixedDate);
  db.docs.get("messageRequests/user1_request_123").createdAt = new Date(
    fixedDate.getTime() - 60_000,
  );
  assert.equal(
    (await chargeMessage(db, "user1", message, fixedDate)).replay,
    false,
  );
  assert.equal(db.docs.get("messageLimits/hour_user1_2026-10-03T15").count, 2);
});

test("hourly and global quotas fail closed", async () => {
  const db = database();
  db.docs.set("messageLimits/hour_user1_2026-10-03T15", { count: 30 });
  await assert.rejects(
    chargeMessage(db, "user1", message, fixedDate),
    (error) => error.code === "resource-exhausted",
  );
  db.docs.delete("messageLimits/hour_user1_2026-10-03T15");
  db.docs.set("aiRateLimits/global_daily_2026-10-03", { count: 1000 });
  await assert.rejects(
    chargeMessage(db, "user1", message, fixedDate),
    (error) => error.code === "resource-exhausted",
  );
});

test("legacy export throttles by email across anonymous identities", async () => {
  const db = database();
  for (let n = 0; n < 5; n++)
    await chargeLegacyExport(db, "user" + n, "emailhash", fixedDate);
  await assert.rejects(
    chargeLegacyExport(db, "new-user", "emailhash", fixedDate),
    (error) => error.code === "resource-exhausted",
  );
});
