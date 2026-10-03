import { exportLegacyData } from "./aiClient";
import * as SecureStore from "expo-secure-store";
import { localStore } from "./localStore";
import { mapLegacyExercise, mapLegacyLift, verifiedLegacyLiftCount } from "./migrationRecords";

export interface ImportResult {
  imported: number;
  skipped: number;
  totalLogs: number;
}

/** Password-verified, paginated and idempotent import. Credentials are never persisted. */
export async function importLegacyAccount(email: string, password: string): Promise<ImportResult> {
  if (!email.trim() || !password) throw new Error("Enter your old account email and password.");
  await localStore.initialize();
  let cursor: string | undefined;
  let owner: string | undefined;
  let expected: number | undefined;
  let imported = 0;
  let skipped = 0;
  let ownerChecked = false;
  const seenCursors = new Set<string>();
  do {
    const page = await exportLegacyData({ email, password, cursor });
    if (!page.legacyUserId || !Number.isInteger(page.totalLogs) || page.totalLogs < 0) {
      throw new Error("The legacy export was incomplete. Please retry.");
    }
    if (owner && owner !== page.legacyUserId) throw new Error("The legacy account changed during import.");
    if (expected !== undefined && expected !== page.totalLogs) throw new Error("The legacy history changed during import. Please retry.");
    owner = page.legacyUserId;
    expected = page.totalLogs;
    if (!ownerChecked) {
      const storedOwner = await SecureStore.getItemAsync("userData");
      if (storedOwner) {
        let oldId: unknown;
        try {
          oldId = (JSON.parse(storedOwner) as { userId?: unknown }).userId;
        } catch {
          throw new Error("The previous phone account data is malformed. It was left untouched.");
        }
        if (oldId !== owner) throw new Error("This phone's previous account differs from the account being imported.");
      }
      const existing = await localStore.listLifts();
      if (existing.some((lift) =>
        lift.id.startsWith("legacy:") && !lift.id.startsWith(`legacy:${owner}:lift:`))) {
        throw new Error("Another legacy account is already stored on this iPhone.");
      }
      ownerChecked = true;
    }
    const lifts = page.logs.map((log) => mapLegacyLift(owner!, log));
    const exercises = page.exercises.map((exercise) => mapLegacyExercise(owner!, exercise));
    // A log can reference an exercise removed from the old catalog. Keep that identity too.
    const known = new Set(exercises.map((exercise) => exercise.id));
    for (const lift of lifts) {
      if (!known.has(lift.exerciseId)) {
        exercises.push({ id: lift.exerciseId, legacyId: lift.exerciseId.split(":").at(-1), name: lift.exerciseName });
        known.add(lift.exerciseId);
      }
    }
    const result = await localStore.importLegacy({ lifts, exercises });
    imported += result.inserted;
    skipped += result.skipped;
    cursor = page.nextCursor ?? undefined;
    if (cursor) {
      if (seenCursors.has(cursor)) throw new Error("The legacy export repeated a page. Please retry.");
      seenCursors.add(cursor);
    }
  } while (cursor);

  const device = await localStore.importLegacyDeviceStorage(owner!);
  imported += device.inserted;
  skipped += device.skipped;
  const saved = await localStore.listLifts();
  const verified = verifiedLegacyLiftCount(saved, owner!);
  if (verified !== expected) {
    throw new Error(`Imported ${verified} of ${expected} legacy lifts. Your old account remains available; retry the import.`);
  }
  return { imported, skipped, totalLogs: expected! };
}
