const admin = require("firebase-admin");

const createAIRateLimit = function (options = {}) {
  // Request Limits PER PERSON
  // NOTHING BEATS A JET2 HOLIDAY,
  // SAVE 50 POUNDS, PER PERSON
  const {
    maxRequestsPerDay = 50,
    maxRequestsPerHour = 10,
    maxMessageLength = 500,
    maxGlobalRequestsPerDay = 1000, // Global limit across all users
    windowDayMs = 24 * 60 * 60 * 1000,
    windowHourMs = 60 * 60 * 1000,
  } = options;

  return async (req, res, next) => {
    try {
      const { userId, logMessage } = req.body;

      // Input validation
      if (!userId || !logMessage) {
        return res.status(400).json({
          success: false,
          botMessage: "Missing required fields: userId and logMessage",
        });
      }

      if (logMessage.length > maxMessageLength) {
        return res.status(400).json({
          success: false,
          botMessage: `Message too long. Maximum ${maxMessageLength} characters allowed.`,
        });
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentHour = now.getHours();

      const db = admin.firestore();

      // Use transaction for atomic rate limit checks
      await db.runTransaction(async (transaction) => {
        // Global rate limit check (across all users)
        const globalRef = db
          .collection("aiRateLimits")
          .doc(`global_daily_${today}`);
        const globalDoc = await transaction.get(globalRef);
        const globalCount = globalDoc.exists ? globalDoc.data().count : 0;

        if (globalCount >= maxGlobalRequestsPerDay) {
          throw new Error("GLOBAL_LIMIT_EXCEEDED");
        }

        // Daily rate limit (per user)
        const dailyRef = db
          .collection("aiRateLimits")
          .doc(`daily_${userId}_${today}`);
        const dailyDoc = await transaction.get(dailyRef);
        const dailyCount = dailyDoc.exists ? dailyDoc.data().count : 0;

        // Hourly rate limit (per user)
        const hourlyRef = db
          .collection("aiRateLimits")
          .doc(`hourly_${userId}_${today}_${currentHour}`);
        const hourlyDoc = await transaction.get(hourlyRef);
        const hourlyCount = hourlyDoc.exists ? hourlyDoc.data().count : 0;

        if (dailyCount >= maxRequestsPerDay) {
          throw new Error("DAILY_LIMIT_EXCEEDED");
        }

        if (hourlyCount >= maxRequestsPerHour) {
          throw new Error("HOURLY_LIMIT_EXCEEDED");
        }

        // Update all counters
        transaction.set(globalRef, {
          count: globalCount + 1,
          lastRequest: now,
          expiresAt: new Date(now.getTime() + windowDayMs),
        });

        transaction.set(dailyRef, {
          count: dailyCount + 1,
          lastRequest: now,
          expiresAt: new Date(now.getTime() + windowDayMs),
        });

        transaction.set(hourlyRef, {
          count: hourlyCount + 1,
          lastRequest: now,
          expiresAt: new Date(now.getTime() + windowHourMs),
        });
      });

      next();
    } catch (error) {
      if (error.message === "GLOBAL_LIMIT_EXCEEDED") {
        return res.status(429).json({
          success: false,
          botMessage:
            "Server daily limit reached (1000/day). Try again tomorrow! The gains train is packed today 🚂💪",
        });
      }

      if (error.message === "DAILY_LIMIT_EXCEEDED") {
        return res.status(429).json({
          success: false,
          botMessage:
            "Daily AI interaction limit reached (50/day). Try again tomorrow! 💪",
        });
      }

      if (error.message === "HOURLY_LIMIT_EXCEEDED") {
        return res.status(429).json({
          success: false,
          botMessage:
            "Hourly AI limit reached (10/hour). Slow down there, champ! ⏰",
        });
      }

      console.error("AI Rate limiting error:", error);
      return res.status(503).json({
        success: false,
        botMessage: "Message service is temporarily unavailable. Please retry.",
      });
    }
  };
};

module.exports = { createAIRateLimit };
