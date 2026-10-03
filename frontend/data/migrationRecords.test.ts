import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyExercise, mapLegacyLift, verifiedLegacyLiftCount } from "./migrationRecords";

test("legacy lifts keep exercise identity, fractional reps, and the exact instant", () => {
  const exercise = mapLegacyExercise("owner-1", {
    id: "exercise-1",
    name: "Incline Dumbbell Bench Press",
    muscleGroups: ["Chest"],
  });
  const lift = mapLegacyLift("owner-1", {
    id: "log-1",
    exerciseId: "exercise-1",
    exerciseName: "Incline Dumbbell Bench Press",
    weight: 55,
    reps: 2.5,
    date: "2025-04-12T19:15:00.000-05:00",
  });
  assert.equal(lift.id, "legacy:owner-1:lift:log-1");
  assert.equal(lift.exerciseId, exercise.id);
  assert.equal(lift.performedAt, "2025-04-13T00:15:00.000Z");
  assert.equal(lift.reps, 2.5);
  assert.equal(verifiedLegacyLiftCount([lift], "owner-1"), 1);
  assert.equal(verifiedLegacyLiftCount([lift], "owner-2"), 0);
});

test("invalid legacy dates stop import instead of silently changing the count", () => {
  assert.throws(() => mapLegacyLift("owner-1", {
    id: "log-2",
    exerciseId: "exercise-1",
    exerciseName: "Bench Press",
    weight: 225,
    reps: 5,
    date: "not-a-date",
  }), /invalid data/);
});
