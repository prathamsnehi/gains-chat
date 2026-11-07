const MAX_CANDIDATES = 24;

function validateMessageInput(data) {
  if (!data || typeof data !== "object") throw new Error("INVALID_INPUT");
  const { requestId, text } = data;
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) throw new Error("INVALID_REQUEST_ID");
  if (typeof text !== "string" || !text.trim() || text.length > 500) throw new Error("INVALID_TEXT");
  if (!Array.isArray(data.candidates) || data.candidates.length > MAX_CANDIDATES) throw new Error("INVALID_CANDIDATES");
  const candidates = data.candidates.map((candidate) => {
    if (!candidate || typeof candidate.id !== "string" || !/^[A-Za-z0-9_:-]{1,100}$/.test(candidate.id) ||
        typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 100) throw new Error("INVALID_CANDIDATES");
    const aliases = Array.isArray(candidate.aliases) ? candidate.aliases.filter((value) => typeof value === "string").slice(0, 8).map((value) => value.slice(0, 60)) : [];
    return { id: candidate.id, name: candidate.name.trim(), aliases };
  });
  if (new Set(candidates.map((x) => x.id)).size !== candidates.length) throw new Error("INVALID_CANDIDATES");
  const selectedExerciseId = data.selectedExerciseId;
  if (selectedExerciseId !== undefined &&
      (typeof selectedExerciseId !== "string" || !candidates.some((candidate) => candidate.id === selectedExerciseId))) {
    throw new Error("INVALID_CANDIDATES");
  }
  const historySnippets = Array.isArray(data.historySnippets) ? data.historySnippets.slice(0, 20).map((x) => ({
    exerciseName: String(x.exerciseName || "").slice(0, 100),
    weight: Number(x.weight), reps: Number(x.reps), unit: x.unit === "kg" ? "kg" : "lb",
    date: String(x.date || "").slice(0, 40),
  })).filter((x) => x.exerciseName && Number.isFinite(x.weight) && Number.isFinite(x.reps) && !Number.isNaN(Date.parse(x.date))) : [];
  const recentMessages = Array.isArray(data.recentMessages) ? data.recentMessages.slice(-6).map((x) => ({
    role: x.role === "assistant" ? "assistant" : "user", text: String(x.text || "").slice(0, 300),
  })) : [];
  return { requestId, text: text.trim(), candidates, selectedExerciseId, historySnippets, historyLookupComplete: data.historyLookupComplete === true, recentMessages };
}

function extractNumbers(text) {
  const values = [];
  const re = /(^|[^\d.])(\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const numberStart = match.index + match[1].length;
    const tail = text.slice(numberStart + match[2].length);
    const marker = /^\s*(kg|kgs|kilograms?|lb|lbs|pounds?|reps?|sets?|r\b|x\b|s\b)/i.exec(tail)?.[1]?.toLowerCase() || "";
    if (/^sets?$/.test(marker)) continue;
    values.push({ value: Number(match[2]), marker, start: numberStart });
  }
  return values.slice(0, 5);
}

function choice(answers, key, allowed) {
  const answer = answers?.[key];
  if (answer?.type !== "choice" || !allowed.includes(answer.choice)) throw new Error("INVALID_JEV_RESPONSE");
  if (!answer.probabilities || typeof answer.probabilities !== "object") throw new Error("INVALID_JEV_RESPONSE");
  const probability = answer.probabilities[answer.choice];
  if (typeof probability !== "number" || probability < 0 || probability > 1) throw new Error("INVALID_JEV_RESPONSE");
  return { value: answer.choice, probability, probabilities: answer.probabilities };
}

function parseLift(text, candidates, answers, selectedExerciseId) {
  const exerciseOptions = candidates.map((_, i) => "e" + i);
  let candidate = selectedExerciseId && candidates.find((item) => item.id === selectedExerciseId);
  if (!candidate) {
    const selected = choice(answers, "exercise", [...exerciseOptions, "none", "unlisted"]);
    if (selected.value === "none" || selected.value === "unlisted" || selected.probability < 0.55) return { kind: "clarification", message: "Which exercise was that?", options: candidates.slice(0, 5).map(({ id, name }) => ({ id, name })) };
    const others = Object.entries(selected.probabilities).filter(([key]) => key !== selected.value).map(([, value]) => value);
    if (selected.probability - Math.max(0, ...others) < 0.15) return { kind: "clarification", message: "Which exercise did you mean?", options: candidates.slice(0, 5).map(({ id, name }) => ({ id, name })) };
    candidate = candidates[Number(selected.value.slice(1))];
  }
  const numbers = extractNumbers(text);
  if (numbers.length < 2) return { kind: "clarification", message: "Send the weight and reps for that set." };
  if (numbers.length > 2) return { kind: "clarification", message: "Send one set at a time so I can log each one accurately." };
  const repItems = numbers.filter((n) => /^(reps?|r)$/.test(n.marker));
  const weightItems = numbers.filter((n) => /^(kg|kgs|kilograms?|lb|lbs|pounds?|s|x)$/.test(n.marker));
  let rep = repItems[0];
  let weight = weightItems[0];
  if (rep && !weight) weight = numbers.find((n) => n !== rep);
  if (weight && !rep) rep = numbers.find((n) => n !== weight);
  if (!weight || !rep) {
    if (numbers.length !== 2) return { kind: "clarification", message: "Which numbers are the weight and reps?" };
    const role = choice(answers, "first_number", ["weight", "reps"]);
    if (role.probability < 0.65) return { kind: "clarification", message: "Which number is the weight, and which is the reps?" };
    weight = role.value === "weight" ? numbers[0] : numbers[1];
    rep = role.value === "reps" ? numbers[0] : numbers[1];
  }
  if (!Number.isFinite(weight.value) || !Number.isFinite(rep.value) || weight.value <= 0 || rep.value <= 0 || weight.value > 2000 || rep.value > 1000 || weight === rep) {
    return { kind: "clarification", message: "I need a positive weight and rep count for one set." };
  }
  const unit = /(?:kg|kgs|kilograms?)\b/i.test(text) ? "kg" : "lb";
  const draft = { exerciseId: candidate.id, exerciseName: candidate.name, weight: weight.value, reps: rep.value, unit };
  return { kind: "lift_draft", draft, message: candidate.name + " · " + weight.value + " " + unit + " × " + rep.value };
}

function routeMessage(input, answers) {
  const intent = choice(answers, "intent", ["lift", "history", "chat"]);
  if (intent.probability < 0.55) return { kind: "clarification", message: "Do you want to log a set, check your history, or just chat?" };
  if (intent.value === "lift") return parseLift(input.text, input.candidates, answers, input.selectedExerciseId);
  if (intent.value === "history") return input.historySnippets.length || input.historyLookupComplete ? { kind: "history_answer_needed" } : { kind: "history_request", message: "I’ll check your local lift history." };
  return { kind: "chat_needed" };
}

module.exports = { validateMessageInput, extractNumbers, choice, routeMessage };
