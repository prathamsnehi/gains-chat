const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAppCheck } = require("firebase-admin/app-check");
const { chatOptions, handleChat } = require("./chatCore");
const { streamAgent } = require("./agent");

initializeApp();
const key = defineSecret("TOKENROUTER_API_KEY");

exports.chat = onRequest({region:chatOptions.region, timeoutSeconds:60, secrets:[key]}, async (req,res) => {
  if (req.method !== "POST") return res.status(405).json({error:"POST only."});
  try {
    await getAppCheck().verifyToken(req.get("X-Firebase-AppCheck") || "");
  } catch {
    return res.status(401).json({error:"App Check required."});
  }
  const deps = {apiKey:key.value(), model:"openai/gpt-6-luna", fetch:global.fetch};
  try {
    if (req.body?.input) await streamAgent(req,res,deps);
    else await handleChat(req,res,deps);
  } catch {
    if (!res.headersSent) res.status(502).json({error:"Assistant unavailable."});
    else res.end();
  }
});
