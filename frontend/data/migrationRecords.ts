import type { LegacyExport } from "./aiClient";
import type { Exercise, Lift } from "./localStore";

export function mapLegacyExercise(owner: string, source: LegacyExport["exercises"][number]): Exercise {
  if (!source.id || !source.name?.trim()) throw new Error("A legacy exercise is missing its identity or name.");
  return {
    id: `legacy:${owner}:exercise:${source.id}`,
    legacyId: source.id,
    name: source.name.trim(),
    group: source.muscleGroups?.join(", ") || undefined,
  };
}

export function mapLegacyLift(owner: string, source: LegacyExport["logs"][number]): Lift {
  const time = Date.parse(source.date);
  if (!source.id || !source.exerciseId || !source.exerciseName?.trim() ||
      !Number.isFinite(source.weight) || source.weight < 0 ||
      !Number.isFinite(source.reps) || source.reps <= 0 || Number.isNaN(time)) {
    throw new Error(`A legacy lift (${source.id || "unknown"}) has invalid data. Import stopped so no entry is silently lost.`);
  }
  const performedAt = new Date(time).toISOString();
  return {
    id: `legacy:${owner}:lift:${source.id}`,
    legacyId: source.id,
    exerciseId: `legacy:${owner}:exercise:${source.exerciseId}`,
    exerciseName: source.exerciseName.trim(),
    weight: source.weight,
    reps: source.reps,
    unit: "lb",
    performedAt,
    createdAt: performedAt,
    updatedAt: performedAt,
  };
}

export function verifiedLegacyLiftCount(lifts: Lift[], owner: string): number {
  return lifts.filter((lift) => lift.id.startsWith(`legacy:${owner}:lift:`)).length;
}
