import test from "node:test";
import assert from "node:assert/strict";
import { waitForAppCheckToken } from "./appCheckReadiness";

test("Firebase work waits through native provider setup until a token exists", async () => {
  let attempts = 0;
  let pauses = 0;
  await waitForAppCheckToken(async () => {
    attempts += 1;
    if (attempts < 3) throw { code: "appCheck/provider-not-ready" };
    return { token: "valid-test-token" };
  }, async () => { pauses += 1; });
  assert.equal(attempts, 3);
  assert.equal(pauses, 2);
});

test("attestation failures and empty tokens do not allow Firebase work", async () => {
  const denied = { code: "appCheck/token-error" };
  await assert.rejects(waitForAppCheckToken(async () => { throw denied; }), (error) => error === denied);
  await assert.rejects(waitForAppCheckToken(async () => ({ token: "" })), /empty token/);
});

test("a provider that never becomes ready stops after a bounded wait", async () => {
  let attempts = 0;
  await assert.rejects(waitForAppCheckToken(async () => {
    attempts += 1;
    throw { code: "app-check/provider-not-ready" };
  }, async () => {}));
  assert.equal(attempts, 20);
});
