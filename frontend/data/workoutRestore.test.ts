import test from "node:test";
import assert from "node:assert/strict";
import { prepareWorkoutRestore, restoreWorkouts } from "./workoutRestore";
import type { LegacyImport, Lift } from "./localStore";

const sourceLift = {
  id: "mongo-log-1",
  exerciseId: "mongo-exercise-1",
  exerciseName: "Incline Dumbbell Bench Press",
  weight: 55,
  reps: 2.5,
  unit: "lb",
  performedAt: "2026-09-12T19:15:00.000-05:00",
};
const file = (lifts: unknown[] = [sourceLift], fields = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    exportedAt: "2026-10-03T12:00:00.000Z",
    from: "2026-09-03T00:00:00.000Z",
    to: "2026-10-03T12:00:00.000Z",
    lifts,
    ...fields,
  });

test("workout restore preserves distinct exercises, weight units, fractional reps, and exact instants", () => {
  const value = prepareWorkoutRestore(
    file([
      sourceLift,
      {
        ...sourceLift,
        id: "mongo-log-2",
        exerciseId: "barbell-exercise",
        exerciseName: "Incline Barbell Bench Press",
        unit: "kg",
        weight: 100,
      },
    ]),
  );
  assert.equal(value.lifts[0].id, "restore:mongo-log-1");
  assert.equal(value.lifts[0].exerciseId, "restore:exercise:mongo-exercise-1");
  assert.equal(value.lifts[0].performedAt, "2026-09-13T00:15:00.000Z");
  assert.equal(value.lifts[0].reps, 2.5);
  assert.equal(value.lifts[0].weight, 55);
  assert.equal(value.lifts[1].unit, "kg");
  assert.equal(value.exercises.length, 2);
});

test("invalid fields and private account data reject the whole file", () => {
  for (const lift of [
    { ...sourceLift, weight: "55" },
    { ...sourceLift, weight: -1 },
    { ...sourceLift, reps: 0 },
    { ...sourceLift, unit: "lbs" },
    { ...sourceLift, performedAt: "2026-09-12" },
    { ...sourceLift, performedAt: "2026-09-31T12:00:00.000Z" },
    { ...sourceLift, performedAt: "2026-08-01T12:00:00.000Z" },
    { ...sourceLift, password: "not-allowed" },
  ])
    assert.throws(() => prepareWorkoutRestore(file([lift])));
  assert.throws(
    () => prepareWorkoutRestore(file([sourceLift], { accounts: [] })),
    /workout-only/,
  );
  assert.throws(
    () => prepareWorkoutRestore(file([sourceLift], { schemaVersion: 2 })),
    /version/,
  );
  assert.throws(
    () =>
      prepareWorkoutRestore(
        file([sourceLift], { from: "2026-11-03T00:00:00Z" }),
      ),
    /reversed/,
  );
});

test("duplicate IDs deduplicate identical sets and reject conflicting records", () => {
  const value = prepareWorkoutRestore(file([sourceLift, { ...sourceLift }]));
  assert.equal(value.lifts.length, 1);
  assert.equal(value.duplicateEntries, 1);
  assert.throws(
    () => prepareWorkoutRestore(file([sourceLift, { ...sourceLift, reps: 6 }])),
    /same ID/,
  );
  assert.throws(
    () =>
      prepareWorkoutRestore(
        file([
          sourceLift,
          { ...sourceLift, id: "other", exerciseName: "Flat DB Bench Press" },
        ]),
      ),
    /same exercise ID/,
  );
});

test("retry is idempotent and does not overwrite a restored lift edited on the phone", async () => {
  const value = prepareWorkoutRestore(file());
  const saved = new Map<string, Lift>();
  const store = {
    async listLifts() {
      return [...saved.values()];
    },
    async importLegacy(data: LegacyImport) {
      let inserted = 0;
      let skipped = 0;
      for (const lift of data.lifts ?? []) {
        if (saved.has(lift.id)) skipped += 1;
        else {
          saved.set(lift.id, { ...lift });
          inserted += 1;
        }
      }
      return { inserted, skipped };
    },
  };
  assert.deepEqual(await restoreWorkouts(value, store), {
    added: 1,
    alreadyPresent: 0,
    totalLifts: 1,
  });
  saved.set(value.lifts[0].id, { ...value.lifts[0], weight: 60 });
  assert.deepEqual(await restoreWorkouts(value, store), {
    added: 0,
    alreadyPresent: 1,
    totalLifts: 1,
  });
  assert.equal(saved.get(value.lifts[0].id)?.weight, 60);
});

test("restore checks saved IDs and reports incomplete persistence", async () => {
  const value = prepareWorkoutRestore(file());
  await assert.rejects(
    () =>
      restoreWorkouts(value, {
        async listLifts() {
          return [];
        },
        async importLegacy() {
          return { inserted: 0, skipped: 0 };
        },
      }),
    /could not be verified/,
  );
});
