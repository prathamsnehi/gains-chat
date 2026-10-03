import type { Exercise, LegacyImport, Lift } from "./localStore";

export const MAX_RESTORE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LIFTS = 5000;

export interface WorkoutRestore {
  schemaVersion: 1;
  exportedAt: string;
  from: string;
  to: string;
  lifts: Array<
    Pick<
      Lift,
      | "id"
      | "exerciseId"
      | "exerciseName"
      | "weight"
      | "reps"
      | "unit"
      | "performedAt"
    >
  >;
}

export interface PreparedWorkoutRestore {
  exportedAt: string;
  from: string;
  to: string;
  lifts: Lift[];
  exercises: Exercise[];
  duplicateEntries: number;
}

function record(
  value: unknown,
  keys: string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  const item = value as Record<string, unknown>;
  if (
    Object.keys(item).some((key) => !keys.includes(key)) ||
    keys.some((key) => !(key in item))
  ) {
    throw new Error(
      `${label} has unexpected or missing fields. Choose a workout-only export.`,
    );
  }
  return item;
}

function identity(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(value)) {
    throw new Error(`${label} must be a stable source ID.`);
  }
  return value;
}

function timestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    throw new Error(`${label} must include a date, time, and time zone.`);
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  ) {
    throw new Error(`${label} is invalid.`);
  }
  // Date.parse can normalize February 30; reject invalid calendar dates before conversion.
  const calendar = value.slice(0, 10);
  const calendarDate = new Date(`${calendar}T00:00:00.000Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== calendar
  ) {
    throw new Error(`${label} is invalid.`);
  }
  return parsed.toISOString();
}

/** Validate the complete export before any native records are written. */
export function prepareWorkoutRestore(text: string): PreparedWorkoutRestore {
  if (text.length > MAX_RESTORE_FILE_BYTES)
    throw new Error("The workout file is too large.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid workout JSON file.");
  }
  const source = record(
    json,
    ["schemaVersion", "exportedAt", "from", "to", "lifts"],
    "Workout export",
  );
  if (source.schemaVersion !== 1)
    throw new Error("This workout export version is not supported.");
  const exportedAt = timestamp(source.exportedAt, "Export time");
  const from = timestamp(source.from, "Start date");
  const to = timestamp(source.to, "End date");
  if (from > to) throw new Error("The workout date range is reversed.");
  if (
    !Array.isArray(source.lifts) ||
    source.lifts.length === 0 ||
    source.lifts.length > MAX_LIFTS
  ) {
    throw new Error(
      `The workout file must contain between 1 and ${MAX_LIFTS} lifts.`,
    );
  }
  const lifts = new Map<string, Lift>();
  const exercises = new Map<string, Exercise>();
  let duplicateEntries = 0;
  for (const [index, item] of source.lifts.entries()) {
    const label = `Lift ${index + 1}`;
    const lift = record(
      item,
      [
        "id",
        "exerciseId",
        "exerciseName",
        "weight",
        "reps",
        "unit",
        "performedAt",
      ],
      label,
    );
    const sourceId = identity(lift.id, `${label} ID`);
    const sourceExerciseId = identity(lift.exerciseId, `${label} exercise ID`);
    if (
      typeof lift.exerciseName !== "string" ||
      !lift.exerciseName.trim() ||
      lift.exerciseName.length > 200
    ) {
      throw new Error(`${label} needs an exercise name.`);
    }
    if (
      typeof lift.weight !== "number" ||
      !Number.isFinite(lift.weight) ||
      lift.weight < 0 ||
      typeof lift.reps !== "number" ||
      !Number.isFinite(lift.reps) ||
      lift.reps <= 0
    ) {
      throw new Error(`${label} has an invalid weight or rep count.`);
    }
    if (lift.unit !== "lb" && lift.unit !== "kg")
      throw new Error(`${label} unit must be lb or kg.`);
    const performedAt = timestamp(lift.performedAt, `${label} date`);
    if (performedAt < from || performedAt > to)
      throw new Error(`${label} is outside the exported date range.`);
    const exerciseId = `restore:exercise:${sourceExerciseId}`;
    const exerciseName = lift.exerciseName.trim();
    const existingExercise = exercises.get(exerciseId);
    if (existingExercise && existingExercise.name !== exerciseName) {
      throw new Error(
        `${label} conflicts with another name for the same exercise ID.`,
      );
    }
    exercises.set(exerciseId, {
      id: exerciseId,
      legacyId: sourceExerciseId,
      name: exerciseName,
    });
    const mapped: Lift = {
      id: `restore:${sourceId}`,
      legacyId: sourceId,
      exerciseId,
      exerciseName,
      weight: lift.weight,
      reps: lift.reps,
      unit: lift.unit,
      performedAt,
      createdAt: performedAt,
      updatedAt: performedAt,
    };
    const existing = lifts.get(mapped.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(mapped))
        throw new Error(
          `${label} conflicts with another lift with the same ID.`,
        );
      duplicateEntries += 1;
    } else lifts.set(mapped.id, mapped);
  }
  return {
    exportedAt,
    from,
    to,
    lifts: [...lifts.values()],
    exercises: [...exercises.values()],
    duplicateEntries,
  };
}

interface RestoreStore {
  listLifts(): Promise<Lift[]>;
  importLegacy(
    data: LegacyImport,
  ): Promise<{ inserted: number; skipped: number }>;
}

export async function restoreWorkouts(
  prepared: PreparedWorkoutRestore,
  store: RestoreStore,
): Promise<{
  added: number;
  alreadyPresent: number;
  totalLifts: number;
}> {
  const existingIds = new Set((await store.listLifts()).map((lift) => lift.id));
  // Native import is one transaction and skips existing IDs, including locally edited lifts.
  await store.importLegacy({
    lifts: prepared.lifts,
    exercises: prepared.exercises,
  });
  const savedIds = new Set((await store.listLifts()).map((lift) => lift.id));
  if (prepared.lifts.some((lift) => !savedIds.has(lift.id))) {
    throw new Error(
      "Some workouts could not be verified. Keep the export file and retry.",
    );
  }
  const alreadyPresent = prepared.lifts.filter((lift) =>
    existingIds.has(lift.id),
  ).length;
  return {
    added: prepared.lifts.length - alreadyPresent,
    alreadyPresent,
    totalLifts: prepared.lifts.length,
  };
}
