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

/** Keep history answers grounded in the named exercise, including its best sets. */
export function historyLiftsForQuestion(
  question: string,
  lifts: Lift[],
  exercises: Exercise[],
): Lift[] {
  const query = question.toLowerCase();
  const words = (value: string) => value.toLowerCase().match(/[a-z]+/g) ?? [];
  const questionWords = new Set([
    "a", "about", "am", "at", "best", "can", "day", "did", "do", "ever",
    "for", "have", "history", "i", "in", "is", "last", "lift", "lifts",
    "many", "max", "me", "most", "much", "my", "on", "one", "pr", "recent",
    "rep", "reps", "set", "sets", "show", "the", "this", "today", "was",
    "week", "weight", "what", "when", "yesterday",
  ]);
  const queryWords = words(query).filter(
    (word) => !questionWords.has(word),
  );
  const names = (exercise: Exercise) => [exercise.name, ...(exercise.aliases ?? [])];
  const phraseMatches = exercises
    .map((exercise) => ({
      exercise,
      length: Math.max(
        0,
        ...names(exercise)
          .filter((name) => {
            const phrase = words(name).join(" ");
            return phrase && new RegExp(`(?:^|[^a-z])${phrase.replace(/ /g, "\\s+")}(?:$|[^a-z])`).test(query);
          })
          .map((name) => words(name).length),
      ),
    }))
    .filter(({ length }) => length > 0);
  const longest = Math.max(0, ...phraseMatches.map(({ length }) => length));
  let selected = phraseMatches
    .filter(({ length }) => length === longest)
    .map(({ exercise }) => exercise);
  selected = selected.filter((exercise) => {
    const exerciseWords = new Set(names(exercise).flatMap(words));
    return queryWords.every((word) => exerciseWords.has(word));
  });
  if (!selected.length && queryWords.length) {
    selected = exercises.filter((exercise) =>
      names(exercise).some((name) => {
        const nameWords = new Set(words(name));
        return queryWords.every((word) => nameWords.has(word));
      }),
    );
  }
  if (!selected.length) {
    // An unknown exercise name must not silently resolve to a different lift.
    const knownWords = new Set(exercises.flatMap((exercise) => names(exercise).flatMap(words)));
    if (queryWords.some((word) => knownWords.has(word))) return [];
    return [...lifts].sort((a, b) => b.performedAt.localeCompare(a.performedAt)).slice(0, 8);
  }
  const records = personalRecords(lifts);
  const found = selected.flatMap((exercise) => {
    const recent = lifts
      .filter((lift) => lift.exerciseId === exercise.id)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      .slice(0, 2);
    const best = records.get(exercise.id);
    return [...recent, ...(best ? [best.maxWeight, best.maxReps, best.maxEstimated] : [])];
  });
  return [...new Map(found.map((lift) => [lift.id, lift])).values()].slice(0, 20);
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
