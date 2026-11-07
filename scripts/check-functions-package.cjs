const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const source = path.resolve(__dirname, "../functions");
const target = fs.mkdtempSync(
  path.join(os.tmpdir(), "gainschat-functions-package-"),
);
for (const entry of [
  "index.js",
  "app.js",
  "privacy-policy.html",
  "ai",
  "utils",
  "package.json",
  "yarn.lock",
  ".yarnrc.yml",
  ".yarn/releases",
]) {
  fs.cpSync(path.join(source, entry), path.join(target, entry), {
    recursive: true,
    filter: (name) => !name.endsWith(".test.js"),
  });
}

function run(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: target,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  assert.equal(
    result.status,
    0,
    `Packaged Functions check failed: ${args.join(" ")}`,
  );
}
const yarn = ".yarn/releases/yarn-4.18.1.cjs";
const before = fs.readFileSync(path.join(target, "yarn.lock"), "utf8");
run([yarn, "install", "--immutable"]);
run([yarn, "workspaces", "focus", "--all", "--production"]);
assert.equal(fs.readFileSync(path.join(target, "yarn.lock"), "utf8"), before);
assert.equal(
  fs.existsSync(path.join(target, "node_modules/firebase-tools")),
  false,
);
assert.equal(
  require(
    path.join(
      target,
      "node_modules/@google-cloud/functions-framework/package.json",
    ),
  ).version,
  "5.0.5",
);
assert.equal(fs.existsSync(path.join(target, ".yarn/cache")), false);
const manifestPath = path.join(target, "functions-manifest.json");
run(["node_modules/firebase-functions/lib/bin/firebase-functions.js", "."], {
  FUNCTIONS_MANIFEST_OUTPUT_PATH: manifestPath,
});
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.deepEqual(Object.keys(manifest.endpoints).sort(), [
  "api",
  "cleanupRateLimits",
  "processMessage",
]);
console.log(
  `Production-pruned Functions discovery passed. Isolated source: ${target}`,
);
// Keep the isolated tree for the Linux buildpack check; never upload its node_modules.
