const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "gainschat-firestore-check-"),
);
const root = path.resolve(__dirname, "../..");
const config = path.join(temporary, "firebase.json");
fs.writeFileSync(
  config,
  JSON.stringify({
    firestore: {
      rules: path.join(root, "firestore.rules"),
      indexes: path.join(root, "firestore.indexes.json"),
    },
    emulators: {
      firestore: { host: "127.0.0.1", port: 18080 },
      hub: { host: "127.0.0.1", port: 14400 },
      logging: { host: "127.0.0.1", port: 14500 },
      ui: { enabled: false },
      singleProjectMode: true,
    },
  }),
);
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
try {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve(
        __dirname,
        "../node_modules/firebase-tools/lib/bin/firebase.js",
      ),
      "emulators:exec",
      "--project",
      "demo-gains-chat",
      "--only",
      "firestore",
      "--config",
      config,
      `${quote(process.execPath)} ${quote(path.join(__dirname, "checkFirestoreRuntime.js"))}`,
    ],
    { cwd: temporary, stdio: "inherit", timeout: 180_000 },
  );
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
