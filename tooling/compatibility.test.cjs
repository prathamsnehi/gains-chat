const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const eas = createRequire(require.resolve("eas-cli/package.json"));

test("EAS schema, glob, ID and archive APIs retain compatible behavior after security patches", () => {
  const Ajv = eas("ajv");
  assert.equal(new Ajv().validate({ type: "string" }, "value"), true);
  const Joi = eas("joi");
  assert.equal(
    Joi.object({ image: Joi.string().required() }).validate({
      image: "xcode-27",
    }).error,
    undefined,
  );
  assert.equal(eas("minimatch")("src/app.ts", "src/*.ts"), true);
  assert.match(eas("nanoid").nanoid(), /^[\w-]+$/);
  assert.equal(eas("yaml").parse("node: 24").node, 24);
  const tar = eas("tar");
  for (const method of ["create", "extract", "list"])
    assert.equal(typeof tar[method], "function");
});

test("the real EAS JSON parser accepts production and simulator profiles", async () => {
  const { EasJsonAccessor, EasJsonUtils } = eas("@expo/eas-json");
  const accessor = EasJsonAccessor.fromProjectPath(
    path.resolve(__dirname, "../frontend"),
  );
  const profile = await EasJsonUtils.getBuildProfileAsync(
    accessor,
    "ios",
    "production",
  );
  assert.equal(profile.node, "24.21.0");
  assert.equal(profile.image, "macos-tahoe-26.6-xcode-27.0");
  const simulator = await EasJsonUtils.getBuildProfileAsync(
    accessor,
    "ios",
    "simulator",
  );
  assert.equal(simulator.simulator, true);
});
