# Restore recent workouts

The owner replaced the original full MongoDB backup and password import with preservation of only recent workout records. No accounts, password hashes, or unrelated users belong in the restore file.

Read the owner's filtered workout records from Atlas and preserve their source log IDs, exercise IDs and names, numeric weights and reps, and original timestamps. Convert the original timestamp to ISO UTC without changing its instant. Legacy weights without a unit use pounds. Confirm the date window with the owner if the latest recorded workout predates the calendar month.

The local `recent-workouts.private.json` file is ignored by Git and EAS, has private file permissions, and is never bundled into a release. Its schema is:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-03T00:00:00.000Z",
  "from": "2026-08-02T00:00:00.000Z",
  "to": "2026-09-02T23:59:59.999Z",
  "lifts": [
    {
      "id": "source-log-id",
      "exerciseId": "source-exercise-id",
      "exerciseName": "Incline Dumbbell Press",
      "weight": 45,
      "reps": 10,
      "unit": "lb",
      "performedAt": "2026-08-25T23:46:08.000Z"
    }
  ]
}
```

Once the new app is ready, transfer the file privately to the owner's iPhone Files app. In Settings, choose the workout file, review the date range and count, then restore it. Validation rejects unexpected account fields, invalid numbers or dates, conflicting identities, and records outside the declared range before any write. Core Data imports in one transaction using stable `restore:` IDs; repeating the restore skips saved lifts and preserves later edits.

Compare the imported count, timestamps, exercise names, weights, and fractional reps with Atlas. Check private iCloud recovery before removing the restore file or retiring the old service. Existing goals and available chat can still be read from storage on the same iPhone during the in-place update.

The legacy password export callable and backup script remain available for compatibility, but this owner's restore flow does not use them. The old HTTP user routes trust a client-supplied identity. Retire the legacy user and admin data routes at verified cutover; the new app does not call them.
