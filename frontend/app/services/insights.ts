import type { Exercise, Lift } from "./bridge";

export const weightIn = (lift: Lift, unit: "lb" | "kg") =>
  lift.unit === unit
    ? lift.weight
    : unit === "lb"
      ? lift.weight * 2.2046226218
      : lift.weight / 2.2046226218;
export const estimateOneRepMax = (lift: Lift, unit: "lb" | "kg" = lift.unit) =>
  weightIn(lift, unit) * (1 + lift.reps / 30);

export function recentByExercise(lifts: Lift[]) {
  const sorted = [...lifts].sort(
    (a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt),
  );
  const result = new Map<string, Lift>();
  sorted.forEach((lift) => {
    if (!result.has(lift.exerciseId)) result.set(lift.exerciseId, lift);
  });
  return result;
}

export function personalRecords(lifts: Lift[]) {
  const result = new Map<
    string,
    { maxWeight: Lift; maxReps: Lift; maxEstimated: Lift }
  >();
  for (const lift of lifts) {
    const old = result.get(lift.exerciseId);
    if (!old)
      result.set(lift.exerciseId, {
        maxWeight: lift,
        maxReps: lift,
        maxEstimated: lift,
      });
    else {
      if (weightIn(lift, "lb") > weightIn(old.maxWeight, "lb"))
        old.maxWeight = lift;
      if (lift.reps > old.maxReps.reps) old.maxReps = lift;
      if (
        estimateOneRepMax(lift, "lb") >
        estimateOneRepMax(old.maxEstimated, "lb")
      )
        old.maxEstimated = lift;
    }
  }
  return result;
}

export function likelyToday(
  lifts: Lift[],
  exercises: Exercise[],
  now = new Date(),
): { exercise: Exercise; last: Lift; score: number }[] {
  const latest = recentByExercise(lifts);
  const weekday = now.getDay();
  const recentCutoff = now.getTime() - 56 * 24 * 60 * 60 * 1000;
  const scored = new Map<string, number>();
  const lookup = new Map(exercises.map((e) => [e.id, e]));
  const groupDays = new Map<string, Set<string>>();
  for (const lift of lifts) {
    const at = new Date(lift.performedAt);
    if (at.getTime() < recentCutoff) continue;
    const dayDistance = Math.min(
      Math.abs(at.getDay() - weekday),
      7 - Math.abs(at.getDay() - weekday),
    );
    const group = lookup.get(lift.exerciseId)?.group;
    if (dayDistance === 0 && group) {
      const days = groupDays.get(group) ?? new Set<string>();
      days.add(at.toDateString());
      groupDays.set(group, days);
    }
    const recency = Math.max(
      0,
      1 - (now.getTime() - at.getTime()) / (56 * 86400000),
    );
    scored.set(
      lift.exerciseId,
      (scored.get(lift.exerciseId) ?? 0) +
        (dayDistance === 0 ? 3 : dayDistance === 1 ? 0.8 : 0.15) +
        recency,
    );
  }
  return [...scored.entries()]
    .map(([id, score]) => ({
      exercise: lookup.get(id) ?? {
        id,
        name: latest.get(id)?.exerciseName ?? "Exercise",
      },
      last: latest.get(id)!,
      score: score + (groupDays.get(lookup.get(id)?.group ?? "")?.size ?? 0) * 1.2,
    }))
    .filter((v) => !!v.last)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function formatLift(lift: Lift) {
  return `${lift.weight} ${lift.unit} × ${lift.reps}`;
}

export function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}
