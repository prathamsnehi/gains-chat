const MODEL = "jev-1.13.0";
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

function questions(candidates) {
  const exerciseCriteria = Object.fromEntries(
    candidates.map((candidate, index) => [
      "e" + index,
      candidate.name +
        (candidate.aliases.length
          ? " (also: " + candidate.aliases.join(", ") + ")"
          : ""),
    ]),
  );
  exerciseCriteria.none =
    "No listed exercise matches, or no exercise is being logged.";
  exerciseCriteria.unlisted =
    "A specific exercise is named but it is not in the candidate list.";
  return {
    intent: {
      type: "choice",
      instructions:
        "Classify the user's current message. Lift means reporting one set actually performed, not goals or hypothetical sets. History means asking about earlier logged workouts. Chat means everything else.",
      criteria: {
        lift: "Reports an exercise actually completed, possibly abbreviated or missing details.",
        history:
          "Asks about previous lifts, records, progress, or personal bests.",
        chat: "Conversation, plans, goals, questions, or anything not reporting a completed lift or asking about prior logged data.",
      },
    },
    exercise: {
      type: "choice",
      instructions:
        "For the current message, choose the exact exercise from the supplied candidates. Keep incline/flat, dumbbell/barbell, chin-up/pull-up, and assisted/unassisted variants distinct. Choose none if not logging an exercise.",
      criteria: exerciseCriteria,
    },
    first_number: {
      type: "choice",
      instructions:
        "If a completed lift has two unlabeled numeric quantities, is the first quantity weight or repetitions? Infer using gym conventions and context; explicit labels override inference.",
      criteria: {
        weight: "The first number is the load used.",
        reps: "The first number is repetitions performed.",
      },
    },
  };
}

async function classifyWithJev(
  input,
  apiKey,
  { signal = AbortSignal.timeout(8000) } = {},
) {
  const state = {
    message: input.text,
    recentConversation: input.recentMessages,
  };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      model: MODEL,
      questions: questions(input.candidates),
    }),
    signal,
  });
  if (!response.ok) throw new Error("JEV_HTTP_" + response.status);
  const result = await response.json();
  if (
    result.model !== MODEL ||
    !result.answers ||
    typeof result.answers !== "object"
  )
    throw new Error("JEV_BAD_RESPONSE");
  return result.answers;
}

module.exports = { MODEL, questions, classifyWithJev };
