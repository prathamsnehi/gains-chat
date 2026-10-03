const fs = require("node:fs");
const path = require("node:path");
const { FirestoreApi } = require("firebase-tools/lib/firestore/api");

// Use the installed deploy CLI's own validator without contacting Firebase.
const root = path.resolve(__dirname, "../..");
const config = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const databases = Array.isArray(config.firestore) ? config.firestore : [config.firestore];
if (!databases.length || databases.some((database) => !database?.rules || !database?.indexes)) {
  throw new Error("Each Firestore database must declare rules and indexes files in firebase.json.");
}
for (const database of databases) {
  const rules = fs.readFileSync(path.resolve(root, database.rules), "utf8");
  if (!rules.trim()) throw new Error("Firestore rules file is empty.");
  const specification = JSON.parse(fs.readFileSync(path.resolve(root, database.indexes), "utf8"));
  new FirestoreApi().validateSpec(specification);
  console.log(`Firestore ${database.database || "(default)"}: rules file present; index/TTL configuration valid.`);
}
console.log("Rules syntax is compiled by Firebase during deployment; this local check validates referenced files and index configuration.");
