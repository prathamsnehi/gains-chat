const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const local = createRequire(
  path.resolve(__dirname, "../functions/package.json"),
);
const { CloudEvent, HTTP } = local("cloudevents");
const event = new CloudEvent({
  type: "migration.test",
  source: "/gainschat",
  data: { ok: true },
});
assert.match(event.id, /^[0-9a-f-]{36}$/i);
const message = HTTP.structured(event);
assert.equal(HTTP.toEvent(message).id, event.id);
const framework = local("@google-cloud/functions-framework");
assert.equal(typeof framework.http, "function");
console.log(
  "CloudEvent IDs, HTTP serialization and the Functions Framework API are compatible.",
);
