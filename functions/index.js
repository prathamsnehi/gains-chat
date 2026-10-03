// functions/index.js
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const { defineSecret } = require("firebase-functions/params");
const app = require("./app");
const { cleanupExpiredRateLimits } = require("./utils/cleanupRateLimits");

const DB_URI = defineSecret("DB_URI");
const JWT_SECRET = defineSecret("JWT_SECRET");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const TYPESAFE_API_KEY = defineSecret("TYPESAFE_API_KEY");
const { processMessageCore } = require("./ai/messageService");
const { exportLegacyCore } = require("./ai/legacyExport");
const { chargeLegacyExport } = require("./ai/limits");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

if (!admin.apps.length) admin.initializeApp();

exports.processMessage = onCall(
  { enforceAppCheck: true, minInstances: 0, secrets: [TYPESAFE_API_KEY, GEMINI_API_KEY], timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before sending a message.");
    try {
      return await processMessageCore({
        data: request.data,
        uid: request.auth.uid,
        db: admin.firestore(),
        jevKey: TYPESAFE_API_KEY.value(),
        geminiKey: GEMINI_API_KEY.value(),
        logger: require("firebase-functions/logger"),
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (/^INVALID_(INPUT|REQUEST_ID|TEXT|CANDIDATES)$/.test(error.message)) throw new HttpsError("invalid-argument", "Check the message and exercise candidates.");
      require("firebase-functions/logger").error("processMessage failed", { code: error.code || error.name || "unknown" });
      throw new HttpsError("unavailable", "Message processing is temporarily unavailable. Retry this message.");
    }
  }
);

exports.exportLegacyData = onCall(
  { enforceAppCheck: true, minInstances: 0, secrets: [DB_URI], timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before importing legacy data.");
    const email = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : "";
    const emailKey = crypto.createHash("sha256").update(email).digest("hex").slice(0, 24);
    try {
      await chargeLegacyExport(admin.firestore(), request.auth.uid, emailKey);
      return await exportLegacyCore(request.data);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      require("firebase-functions/logger").error("exportLegacyData failed", { code: error.code || error.name || "unknown" });
      throw new HttpsError("unavailable", "Legacy import is temporarily unavailable.");
    }
  }
);

exports.api = onRequest({ secrets: [DB_URI, JWT_SECRET, GEMINI_API_KEY] }, app);

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
  }
);
