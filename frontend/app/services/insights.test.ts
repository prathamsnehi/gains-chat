import assert from "node:assert/strict";
import test from "node:test";
import { historyLiftsForQuestion } from "./insights";
import type { Exercise, Lift } from "./bridge";

const exercises: Exercise[] = [
  { id: "flat", name: "Barbell Bench Press", aliases: ["bench", "bench press"] },
  { id: "incline", name: "Incline Dumbbell Bench Press", aliases: ["incline db bp"] },
  { id: "squat", name: "Barbell Squat", aliases: ["squat"] },
];
const lifts: Lift[] = [
  { id: "flat-old", exerciseId: "flat", exerciseName: "Barbell Bench Press", weight: 225, reps: 5, unit: "lb", performedAt: "2026-09-01T12:00:00Z" },
  { id: "flat-new", exerciseId: "flat", exerciseName: "Barbell Bench Press", weight: 185, reps: 8, unit: "lb", performedAt: "2026-10-01T12:00:00Z" },
  { id: "incline", exerciseId: "incline", exerciseName: "Incline Dumbbell Bench Press", weight: 55, reps: 6, unit: "lb", performedAt: "2026-10-02T12:00:00Z" },
  { id: "squat", exerciseId: "squat", exerciseName: "Barbell Squat", weight: 315, reps: 2, unit: "lb", performedAt: "2026-10-03T12:00:00Z" },
];

test("history lookup keeps similarly named exercises separate and includes older PRs", () => {
  assert.deepEqual(
    historyLiftsForQuestion("what was my last bench?", lifts, exercises).map((lift) => lift.id),
    ["flat-new", "flat-old"],
  );
  assert.deepEqual(
    historyLiftsForQuestion("how much did I bench last time?", lifts, exercises).map((lift) => lift.id),
    ["flat-new", "flat-old"],
  );
  assert.deepEqual(
    historyLiftsForQuestion("incline db bp PR?", lifts, exercises).map((lift) => lift.id),
    ["incline"],
  );
});

test("unknown exercise stays unmatched; a general last-lift question uses recent sets", () => {
  assert.deepEqual(historyLiftsForQuestion("last hack squat", lifts, exercises), []);
  assert.equal(historyLiftsForQuestion("what was my last lift?", lifts, exercises)[0].id, "squat");
});
