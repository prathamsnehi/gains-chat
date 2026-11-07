const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("../app");
const functions = require("../index");

function request(method, url) {
  const response = {
    headers: {},
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    status(code) {
      this.code = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  http({ method, url }, response);
  return response;
}

test("retirement preserves the existing privacy URL without external assets or scripts", () => {
  const response = request("GET", "/privacy-policy?lang=en");
  assert.equal(response.code, 200);
  assert.match(response.body, /Privacy Policy/);
  assert.doesNotMatch(response.body, /<script\b|<link\b|<%/i);
  assert.equal(request("HEAD", "/privacy-policy").body, "");
});

test("old account and workout routes are gone and the export callable is absent", () => {
  for (const url of ["/", "/user/login", "/user/log-workout", "/admin"]) {
    assert.equal(request("POST", url).code, 410);
  }
  assert.deepEqual(Object.keys(functions).sort(), [
    "api",
    "cleanupRateLimits",
    "processMessage",
  ]);
});
