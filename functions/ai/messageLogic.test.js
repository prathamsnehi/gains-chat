const test = require("node:test");
const assert = require("node:assert/strict");
const { validateMessageInput, extractNumbers, routeMessage } = require("./messageLogic");

const candidates = [
  { id: "incline-db", name: "Incline Dumbbell Bench Press", aliases: ["incline db bp"] },
  { id: "flat-bb", name: "Barbell Bench Press", aliases: ["bench"] },
];
function answer(value, probability = 0.9, other = {}) {
  return { type: "choice", choice: value, probabilities: { [value]: probability, ...other }, confidence: probability };
}
function parsed(text, exercise = "e0", numberRole = "weight") {
  const input = validateMessageInput({ requestId: "request_123", text, candidates });
  return routeMessage(input, {
    intent: answer("lift"),
    exercise: answer(exercise, 0.9, { none: 0.02, e1: exercise === "e1" ? 0.9 : 0.08 }),
    first_number: answer(numberRole),
  });
}

test("extracts abbreviated dumbbell weight and decimal reps", () => {
  assert.deepEqual(extractNumbers("55s incline db bp 6 reps").map((x) => x.value), [55, 6]);
  assert.deepEqual(parsed("55s incline db bp 6 reps").draft, {
    exerciseId: "incline-db", exerciseName: "Incline Dumbbell Bench Press", weight: 55, reps: 6, unit: "lb",
  });
  assert.deepEqual(parsed("bench 225 2.5 reps", "e1").draft, {
    exerciseId: "flat-bb", exerciseName: "Barbell Bench Press", weight: 225, reps: 2.5, unit: "lb",
  });
});

test("parses x notation, explicit kilograms, and ignores set count", () => {
  assert.deepEqual(parsed("bench 225x6", "e1").draft.weight, 225);
  assert.deepEqual(parsed("3 sets incline db bench 55kg for 6 reps").draft, {
    exerciseId: "incline-db", exerciseName: "Incline Dumbbell Bench Press", weight: 55, reps: 6, unit: "kg",
  });
});

test("clarifies missing, invalid, or uncertain lift values", () => {
  assert.equal(parsed("bench 225", "e1").kind, "clarification");
  assert.equal(parsed("bench 0 lbs 6 reps", "e1").kind, "clarification");
  const input = validateMessageInput({ requestId: "request_124", text: "bench 225 6", candidates });
  assert.equal(routeMessage(input, {
    intent: answer("lift"),
    exercise: answer("e1", 0.56, { e0: 0.43 }),
    first_number: answer("weight"),
  }).kind, "clarification");
});

test("an explicit correction keeps the chosen exercise while parsing original numbers", () => {
  const input = validateMessageInput({
    requestId: "request_127",
    text: "55s incline db bp 6 reps",
    candidates,
    selectedExerciseId: "incline-db",
  });
  const result = routeMessage(input, {
    intent: answer("lift"),
    exercise: answer("e1", 0.9, { e0: 0.1 }),
    first_number: answer("weight"),
  });
  assert.equal(result.kind, "lift_draft");
  assert.equal(result.draft.exerciseId, "incline-db");
  assert.equal(result.draft.weight, 55);
  assert.throws(() => validateMessageInput({
    requestId: "request_128", text: "bench 225 6", candidates, selectedExerciseId: "unknown",
  }), /INVALID_CANDIDATES/);
});

test("history requires phone records before an answer", () => {
  const input = validateMessageInput({ requestId: "request_125", text: "What did I last bench?", candidates });
  assert.equal(routeMessage(input, { intent: answer("history") }).kind, "history_request");
  input.historySnippets = [{ exerciseName: "Barbell Bench Press", weight: 225, reps: 6, unit: "lb", date: "2026-10-01" }];
  assert.equal(routeMessage(input, { intent: answer("history") }).kind, "history_answer_needed");
  input.historySnippets = [];
  input.historyLookupComplete = true;
  assert.equal(routeMessage(input, { intent: answer("history") }).kind, "history_answer_needed");
});

test("rejects malformed input and model decisions", () => {
  assert.throws(() => validateMessageInput({ requestId: "bad", text: "bench", candidates: [] }), /INVALID_REQUEST_ID/);
  const input = validateMessageInput({ requestId: "request_126", text: "bench 225 6", candidates });
  assert.throws(() => routeMessage(input, { intent: { type: "choice", choice: "lift", probabilities: {} } }), /INVALID_JEV_RESPONSE/);
});
