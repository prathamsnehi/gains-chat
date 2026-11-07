const TOKENROUTER_URL = "https://api.tokenrouter.com/v1/chat/completions";

const chatOptions = {
  enforceAppCheck: true,
  region: "us-central1",
  timeoutSeconds: 30,
};

function appCheckHeader(req) {
  if (typeof req.get === "function") {
    return req.get("X-Firebase-AppCheck") || "";
  }
  return req.headers?.["x-firebase-appcheck"] || "";
}

function authorize(req) {
  if (!appCheckHeader(req)) {
    return { status: 401, body: { error: "App Check required." } };
  }
  return null;
}

function normalizeLift(lift) {
  if (!lift || typeof lift.exerciseName !== "string" || !lift.exerciseName.trim()) return null;
  const weight = Number(lift.weight);
  const reps = Number(lift.reps);
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  return {
    exerciseName: lift.exerciseName.trim().slice(0, 100),
    weight,
    reps,
    unit: lift.unit === "kg" ? "kg" : "lb",
    performedAt: String(lift.performedAt || "").slice(0, 40),
  };
}

function buildMessages(text, lifts) {
  const lines = lifts.map(
    (lift) =>
      `${lift.performedAt}: ${lift.exerciseName}, ${lift.weight} ${lift.unit} × ${lift.reps}`,
  );
  const system = [
    "You are Gains Chat, a concise gym companion.",
    "Answer only from the local workout records below. If there are no records, say that no matching lifts were found. If the records do not answer the question, say so. Never invent lifts. Never claim you logged a set.",
    lines.length ? `Records:\n${lines.join("\n")}` : "Records:\n(No matching records)",
  ].join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: text },
  ];
}

async function handleChat(req, res, deps) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only." });
    return;
  }
  const denied = authorize(req);
  if (denied) {
    res.status(denied.status).json(denied.body);
    return;
  }
  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 500) {
    res.status(400).json({ error: "Check the question." });
    return;
  }
  const lifts = Array.isArray(body.lifts)
    ? body.lifts.slice(0, 8).map(normalizeLift).filter(Boolean)
    : [];
  const messages = buildMessages(text, lifts);
  let response;
  try {
    response = await deps.fetch(TOKENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deps.model,
        temperature: 0.3,
        max_tokens: 180,
        messages,
      }),
    });
  } catch {
    res.status(502).json({ error: "Chat is temporarily unavailable." });
    return;
  }
  if (!response.ok) {
    res.status(502).json({ error: "Chat is temporarily unavailable." });
    return;
  }
  const payload = await response.json();
  const message = payload?.choices?.[0]?.message?.content;
  if (typeof message !== "string" || !message.trim()) {
    res.status(502).json({ error: "Chat is temporarily unavailable." });
    return;
  }
  res.status(200).json({ message: message.trim().slice(0, 900) });
}

module.exports = {
  TOKENROUTER_URL,
  chatOptions,
  authorize,
  buildMessages,
  handleChat,
};
