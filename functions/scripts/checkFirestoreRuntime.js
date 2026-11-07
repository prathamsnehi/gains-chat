const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { chargeMessage } = require("../ai/limits");
const { processMessageCore } = require("../ai/messageService");

// This check writes synthetic documents and must never target production.
assert.match(
  process.env.FIRESTORE_EMULATOR_HOST ?? "",
  /^(127\.0\.0\.1|localhost):\d+$/,
);
const app = initializeApp({ projectId: "demo-gains-chat" });
const db = getFirestore(app);
const data = {
  requestId: "emulator-migration-check",
  text: "Hello",
  candidates: [],
};
const uid = "migration-emulator-user";

(async () => {
  let providerCalls = 0;
  const providers = {
    async classify() {
      providerCalls++;
      return {
        intent: {
          type: "choice",
          choice: "chat",
          probabilities: { chat: 0.99 },
        },
      };
    },
    async reply() {
      providerCalls++;
      return "Synthetic response";
    },
  };
  const input = {
    data,
    uid,
    db,
    providers,
    jevKey: "unused",
    geminiKey: "unused",
    logger: { info() {} },
  };
  const first = await processMessageCore(input);
  assert.deepEqual(await processMessageCore(input), first);
  assert.equal(providerCalls, 2);
  const request = await db
    .collection("messageRequests")
    .doc(`${uid}_${data.requestId}`)
    .get();
  assert.equal(typeof request.data().createdAt.toMillis(), "number");
  assert.equal(typeof request.data().expiresAt.toMillis(), "number");
  const counters = await db.collection("messageLimits").get();
  assert.equal(counters.size, 2);
  for (const counter of counters.docs) assert.equal(counter.data().count, 1);
  await assert.rejects(
    chargeMessage(db, uid, { ...data, text: "Different input" }),
    (error) => error.code === "already-exists",
  );
  console.log(
    "Firestore emulator: Admin 14 transactions, timestamps, replay, quota accounting and input fingerprint checks passed.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.terminate();
    await deleteApp(app);
  });
