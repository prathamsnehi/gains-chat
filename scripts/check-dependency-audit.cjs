const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const project = process.argv[2];
assert.ok(
  ["frontend", "functions", "tooling"].includes(project),
  "Choose frontend, functions, or tooling",
);
const root = path.resolve(__dirname, "..");
const baseline = require("../security/dependency-audit-baseline.json")[project];
let unexpected = false;
for (const environment of ["full", "production"]) {
  const args = [
    ".yarn/releases/yarn-4.18.1.cjs",
    "npm",
    "audit",
    "--all",
    "--recursive",
    "--json",
  ];
  if (environment === "production") args.push("--environment", "production");
  const result = spawnSync(process.execPath, args, {
    cwd: path.join(root, project),
    encoding: "utf8",
  });
  fs.writeFileSync(
    path.join(root, project, `audit-${environment}.jsonl`),
    result.stdout ?? "",
  );
  assert.ok(
    result.status === 0 || result.status === 1,
    result.stderr || "Audit execution failed",
  );
  const records = (result.stdout ?? "")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  if (result.status !== 0)
    assert.ok(
      records.some((record) => record.children?.ID),
      "Audit failed without advisory data",
    );
  for (const record of records) {
    if (!record.children?.ID) {
      assert.notEqual(record.type, "error", record.data);
      continue;
    }
    const finding = {
      package: record.value,
      id: String(record.children.ID),
      severity: record.children.Severity,
      versions: [...record.children["Tree Versions"]].sort(),
    };
    const known = baseline[environment].some(
      (accepted) => JSON.stringify(accepted) === JSON.stringify(finding),
    );
    const deprecated = finding.id.endsWith(" (deprecation)");
    console.log(
      `${project}/${environment}: ${known ? "documented" : "NEW"} ${deprecated ? "deprecation" : finding.severity} ${finding.package} ${finding.id}`,
    );
    if (!known || finding.severity === "critical") unexpected = true;
  }
}
if (unexpected) {
  console.error(
    "New or critical findings require remediation and review; see docs/dependency-migration.md.",
  );
  process.exitCode = 1;
}
