#!/usr/bin/env node
// Read-only MongoDB export. Run with DB_URI in the environment and an absolute
// output path outside this repository. The output includes password hashes.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { MongoClient } = require("mongodb");

async function main() {
  const outputPath = process.argv[2];
  const dbUri = process.env.DB_URI;
  const repoRoot = path.resolve(__dirname, "../..");
  if (!dbUri || !outputPath || !path.isAbsolute(outputPath)) throw new Error("Set DB_URI and pass an absolute output path.");
  const resolved = path.resolve(outputPath);
  if (resolved === repoRoot || resolved.startsWith(repoRoot + path.sep)) throw new Error("Backup path must be outside the repository.");
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent) || fs.lstatSync(parent).isSymbolicLink()) throw new Error("Use an existing private output directory.");
  const stat = fs.statSync(parent);
  if ((stat.mode & 0o077) !== 0) throw new Error("Output directory must deny group and other access (mode 0700).");
  if (fs.existsSync(resolved) || fs.existsSync(resolved + ".manifest.json")) throw new Error("Output already exists.");

  const client = new MongoClient(dbUri);
  const temporary = resolved + ".partial-" + process.pid;
  const counts = {};
  let handle;
  try {
    await client.connect();
    const db = client.db();
    handle = await fs.promises.open(temporary, "wx", 0o600);
    for (const collection of ["users", "exercises", "userlogs"]) {
      counts[collection] = 0;
      for await (const document of db.collection(collection).find({})) {
        await handle.write(JSON.stringify({ collection, document }) + "\n");
        counts[collection] += 1;
      }
    }
    await handle.sync();
    await handle.close();
    handle = null;
    const digest = crypto.createHash("sha256");
    const checkedCounts = { users: 0, exercises: 0, userlogs: 0 };
    const readStream = fs.createReadStream(temporary);
    let carry = "";
    for await (const chunk of readStream) {
      digest.update(chunk);
      carry += chunk.toString("utf8");
      let newline;
      while ((newline = carry.indexOf("\n")) >= 0) {
        const entry = JSON.parse(carry.slice(0, newline));
        if (!(entry.collection in checkedCounts) || !entry.document?._id) throw new Error("Backup verification failed.");
        checkedCounts[entry.collection] += 1;
        carry = carry.slice(newline + 1);
      }
    }
    if (carry || Object.keys(counts).some((name) => counts[name] !== checkedCounts[name])) throw new Error("Backup count verification failed.");
    const manifest = { createdAt: new Date().toISOString(), file: path.basename(resolved), sha256: digest.digest("hex"), counts };
    await fs.promises.writeFile(resolved + ".manifest.json", JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.promises.rename(temporary, resolved);
    process.stdout.write(JSON.stringify(manifest) + "\n");
  } finally {
    if (handle) await handle.close();
    await client.close();
    if (fs.existsSync(temporary)) await fs.promises.unlink(temporary);
  }
}

main().catch((error) => {
  process.stderr.write(error.message + "\n");
  process.exitCode = 1;
});
