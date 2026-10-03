# One-time legacy import

The old service stores users, exercises, and lifts in MongoDB. `functions/scripts/exportLegacyBackup.js` exports those collections to a private JSONL file with verified counts and a SHA-256 manifest. Create this backup **before** deployment or live import, outside the repository with private permissions. Supply `DB_URI` through the process environment, or use `--prompt` to enter it without terminal echo, a credential file, or shell history. Keep the backup until TestFlight import and iCloud recovery are checked.

From the repository root, this saves only the backup and its manifest directly in the existing Downloads folder (which must have mode 0700):

```sh
node functions/scripts/exportLegacyBackup.js --prompt "$HOME/Downloads/gainschat-legacy-2026-10-03.jsonl"
```

Paste the existing `DB_URI` secret at the hidden prompt. The exporter refuses to overwrite a backup. Atlas cloud backups are unavailable on free clusters; the Data Explorer's “Export code” action exports a query rather than collection data.

Settings asks for the previous account email and password once. `exportLegacyData` verifies that password against the old hash and returns pages of up to 500 logs, including exercise identities, names, weights, reps, dates, total count, and cursor. The first page includes the shared legacy exercise catalog, preserving exercises without logs too. The phone imports stable legacy IDs, and retries skip records already present. It also reads old `exerciseGoals` and `logMessages` from existing iPhone storage, checking the stored owner ID when available. Those old values remain in place during verification. Credentials are not persisted by the new flow.

After import, the phone counts saved legacy lifts and compares that count with the export total. Check sample dates, exercise variations, goals, and available chat on the actual iPhone. Verify private iCloud recovery before retiring the old service. An interrupted page leaves earlier imports intact; retry after fixing the error.

The old HTTP user and admin routes remain a security risk because user routes accept a client supplied ID. Keep them out of the new app and retire them at cutover after the backup and import have been checked. Do not remove the old service before that gate.
