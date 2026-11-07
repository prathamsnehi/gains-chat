// functions/index.js
const {
  onRequest,
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const { defineSecret } = require("firebase-functions/params");
const app = require("./app");
const { cleanupExpiredRateLimits } = require("./utils/cleanupRateLimits");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const TYPESAFE_API_KEY = defineSecret("TYPESAFE_API_KEY");
const { processMessageCore } = require("./ai/messageService");
const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (!getApps().length) initializeApp();

exports.processMessage = onCall(
  {
    enforceAppCheck: true,
    minInstances: 0,
    secrets: [TYPESAFE_API_KEY, GEMINI_API_KEY],
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth?.uid)
      throw new HttpsError(
        "unauthenticated",
        "Sign in before sending a message.",
      );
    try {
      return await processMessageCore({
        data: request.data,
        uid: request.auth.uid,
        db: getFirestore(),
        jevKey: TYPESAFE_API_KEY.value(),
        geminiKey: GEMINI_API_KEY.value(),
        logger: require("firebase-functions/logger"),
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (/^INVALID_(INPUT|REQUEST_ID|TEXT|CANDIDATES)$/.test(error.message))
        throw new HttpsError(
          "invalid-argument",
          "Check the message and exercise candidates.",
        );
      require("firebase-functions/logger").error("processMessage failed", {
        code: error.code || error.name || "unknown",
      });
      throw new HttpsError(
        "unavailable",
        "Message processing is temporarily unavailable. Retry this message.",
      );
    }
  },
);

exports.api = onRequest(app);

exports.cleanupRateLimits = onSchedule(
  {
    schedule: "0 2 * * *", // Every day at 2 AM UTC
    timeZone: "UTC",
  },
  async (event) => {
    console.log("Starting scheduled rate limit cleanup...");
    try {
      await cleanupExpiredRateLimits();
      console.log("Rate limit cleanup completed successfully");
    } catch (error) {
      console.error("Rate limit cleanup failed:", error);
    }
  },
);
