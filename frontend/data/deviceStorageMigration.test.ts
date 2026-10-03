import test from "node:test";
import assert from "node:assert/strict";
import {
  legacyDeviceOwner,
  prepareLegacyDeviceData,
} from "./deviceStorageMigration";
import { prepareWorkoutRestore } from "./workoutRestore";

const now = "2026-10-03T12:00:00.000Z";
const goals = JSON.stringify([
  { exerciseId: "exercise-1", exerciseName: "Bench Press", goalWeight: 315 },
]);
const messages = JSON.stringify([
  {
    messageSender: "user",
    messageContent: "bench 225 x 2.5",
    messageDate: "2026-09-12T19:15:00-05:00",
  },
]);

test("device migration reads only owner identity and skips absent or invalid previous account storage", () => {
  assert.equal(legacyDeviceOwner(null), undefined);
  assert.equal(
    legacyDeviceOwner(
      JSON.stringify({ userId: "owner-1", email: "private", token: "private" }),
    ),
    "owner-1",
  );
  for (const raw of ["broken", "null", "[]", '{"userId":44}', '{"userId":""}'])
    assert.throws(() => legacyDeviceOwner(raw));
});

test("old phone goals and chat retain stable IDs and match later workout exercise IDs", () => {
  const prepared = prepareLegacyDeviceData("owner-1", goals, messages, [], now);
  const restored = prepareWorkoutRestore(
    JSON.stringify({
      schemaVersion: 1,
      exportedAt: now,
      from: "2026-09-03T00:00:00.000Z",
      to: now,
      lifts: [
        {
          id: "lift-1",
          exerciseId: "exercise-1",
          exerciseName: "Bench Press",
          weight: 225,
          reps: 2.5,
          unit: "lb",
          performedAt: "2026-09-12T19:15:00-05:00",
        },
      ],
    }),
  );
  assert.equal(
    prepared.data.goals?.[0].exerciseId,
    restored.lifts[0].exerciseId,
  );
  assert.equal(prepared.data.goals?.[0].targetOneRepMax, 315);
  assert.equal(
    prepared.data.chatMessages?.[0].createdAt,
    "2026-09-13T00:15:00.000Z",
  );
  assert.equal(prepared.data.chatMessages?.[0].role, "user");
  assert.equal(prepared.data.exercises?.[0].id, "restore:exercise:exercise-1");
  assert.deepEqual(
    prepared,
    prepareLegacyDeviceData("owner-1", goals, messages, [], now),
  );
  assert.deepEqual(prepared.warnings, []);
  assert.equal("accounts" in prepared.data, false);
});

test("available chat still imports when previous goal JSON is corrupted", () => {
  const prepared = prepareLegacyDeviceData(
    "owner-1",
    "broken",
    messages,
    [],
    now,
  );
  assert.equal(prepared.data.goals?.length, 0);
  assert.equal(prepared.data.chatMessages?.length, 1);
  assert.equal(prepared.warnings.length, 1);
});

test("existing restored exercise is preferred without reimporting or overwriting it", () => {
  const prepared = prepareLegacyDeviceData(
    "owner-1",
    goals,
    null,
    [
      {
        id: "restore:exercise:exercise-1",
        legacyId: "exercise-1",
        name: "Barbell Bench Press",
        aliases: ["bench"],
      },
    ],
    now,
  );
  assert.equal(prepared.data.exercises?.length, 0);
  assert.equal(prepared.data.goals?.[0].exerciseName, "Barbell Bench Press");
});

test("malformed records warn and preserve available records instead of preventing startup", () => {
  const prepared = prepareLegacyDeviceData(
    "owner-1",
    JSON.stringify([null, { exerciseId: "e", goalWeight: -1 }]),
    JSON.stringify([
      { messageSender: "ai", messageContent: "Saved", messageDate: "broken" },
      {
        messageSender: "user",
        messageContent: "leg day",
        messageDate: 1728000000000,
      },
      null,
    ]),
    [],
    now,
  );
  assert.equal(prepared.data.goals?.length, 0);
  assert.equal(prepared.data.chatMessages?.length, 2);
  assert.equal(prepared.data.chatMessages?.[0].createdAt, now);
  assert.equal(prepared.data.chatMessages?.[0].role, "assistant");
  assert.equal(
    prepared.data.chatMessages?.[1].createdAt,
    new Date(1728000000000).toISOString(),
  );
  assert.equal(prepared.warnings.length, 4);
});

test("a goal with no available name does not reserve a placeholder exercise before workout restore", () => {
  const prepared = prepareLegacyDeviceData(
    "owner-1",
    JSON.stringify([{ exerciseId: "exercise-1", goalWeight: 315 }]),
    null,
    [],
    now,
  );
  assert.equal(
    prepared.data.goals?.[0].exerciseId,
    "restore:exercise:exercise-1",
  );
  assert.equal(prepared.data.exercises?.length, 0);
  assert.equal(prepared.warnings.length, 1);
});
