const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { chatOptions, handleChat } = require("./chatCore");

const tokenRouterKey = defineSecret("TOKENROUTER_API_KEY");
const tokenRouterModel = defineString("TOKENROUTER_MODEL", {
  default: "openai/gpt-5-mini",
  description: "TokenRouter model id. This is TokenRouter, not OpenRouter.",
});

exports.chat = onRequest(
  {
    region: chatOptions.region,
    enforceAppCheck: chatOptions.enforceAppCheck,
    timeoutSeconds: chatOptions.timeoutSeconds,
    secrets: [tokenRouterKey],
  },
  (request, response) =>
    handleChat(request, response, {
      apiKey: tokenRouterKey.value(),
      model: tokenRouterModel.value(),
      fetch: global.fetch,
    }),
);
