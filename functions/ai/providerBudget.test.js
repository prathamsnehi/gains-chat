const test = require("node:test");
const assert = require("node:assert/strict");
const { runProvider } = require("./providerBudget");

test("a hung provider is aborted and cannot exhaust the callable deadline", async () => {
  let signal;
  await assert.rejects(
    runProvider(Date.now() + 1000, 15, (options) => {
      signal = options.signal;
      return new Promise(() => {});
    }),
    /PROVIDER_DEADLINE_EXCEEDED/,
  );
  assert.equal(signal.aborted, true);
});

test("remaining invocation budget caps each provider timeout", async () => {
  const value = await runProvider(
    24_000,
    12_000,
    ({ timeoutMs }) => timeoutMs,
    () => 23_500,
  );
  assert.equal(value, 500);
  let called = false;
  await assert.rejects(
    runProvider(
      24_000,
      8000,
      () => {
        called = true;
      },
      () => 24_001,
    ),
    /DEADLINE/,
  );
  assert.equal(called, false);
});

test("provider throttling and service failures propagate without SDK-level retry loops", async () => {
  for (const status of [429, 503]) {
    let attempts = 0;
    const error = Object.assign(new Error("provider failure"), { status });
    await assert.rejects(
      runProvider(Date.now() + 1000, 500, () => {
        attempts++;
        throw error;
      }),
      (caught) => caught === error,
    );
    assert.equal(attempts, 1);
  }
});
