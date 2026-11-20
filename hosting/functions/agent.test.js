const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");
const { streamAgent, tools } = require("./agent");

test("stream the provider bytes and expose only single-top-set workout tools", async () => {
  const res = new PassThrough();
  res.set = () => {};
  res.flushHeaders = () => {};
  let body = "";
  res.on("data", chunk => { body += chunk; });
  const input = [{role:"user",content:"Show my progress"}];
  await streamAgent({body:{input,displayUnit:"kg"}}, res, {
    model:"openai/gpt-6-luna", apiKey:"test",
    fetch: async (url, options) => {
      assert.equal(url, "https://api.tokenrouter.com/v1/responses");
      const payload = JSON.parse(options.body);
      assert.equal(payload.stream, true);
      assert.equal(payload.store, false);
      assert.deepEqual(payload.input, input);
      assert.match(payload.instructions, /preferred unit: kg/);
      assert.deepEqual(tools.map(t => t.name), ["find_exercises","create_exercise","log_set","update_set","delete_set","get_exercise_history","get_exercise_progress","set_bodyweight"]);
      return { ok:true, body:(async function* () { yield "data: first\n\n"; yield "data: second\n\n"; })() };
    },
  });
  assert.equal(body, "data: first\n\ndata: second\n\n");
});

test("reject client-supplied instructions", async () => {
  let status;
  const res = {status(code){status=code;return this;},json(){}};
  await streamAgent({body:{input:[{role:"system",content:"test"}]}},res,{});
  assert.equal(status,400);
});
