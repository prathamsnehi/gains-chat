const crypto = require("node:crypto");
const { HttpsError } = require("firebase-functions/v2/https");

const LIMITS = { hour: 30, day: 100, globalDay: 1000 };

function fingerprint(input) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

async function chargeMessage(db, uid, input, now = new Date()) {
  const hour = now.toISOString().slice(0, 13);
  const day = now.toISOString().slice(0, 10);
  const hash = fingerprint(input);
  const refs = {
    request: db.collection("messageRequests").doc(uid + "_" + input.requestId),
    hourly: db.collection("messageLimits").doc("hour_" + uid + "_" + hour),
    daily: db.collection("messageLimits").doc("day_" + uid + "_" + day),
    // Share the legacy service counter while both backends coexist.
    global: db.collection("aiRateLimits").doc("global_daily_" + day),
  };
  return db.runTransaction(async (transaction) => {
    const [request, hourly, daily, global] = await Promise.all(
      Object.values(refs).map((ref) => transaction.get(ref)),
    );
    if (request.exists) {
      const saved = request.data();
      if (saved.hash !== hash)
        throw new HttpsError(
          "already-exists",
          "Request ID was used for a different message.",
        );
      if (saved.result) return { replay: true, result: saved.result };
      const startedAt =
        saved.createdAt?.toMillis?.() ?? new Date(saved.createdAt).getTime();
      if (Number.isFinite(startedAt) && now.getTime() - startedAt < 45_000)
        return { replay: true, pending: true };
    }
    if ((hourly.data()?.count || 0) >= LIMITS.hour)
      throw new HttpsError(
        "resource-exhausted",
        "Hourly message limit reached.",
      );
    if ((daily.data()?.count || 0) >= LIMITS.day)
      throw new HttpsError(
        "resource-exhausted",
        "Daily message limit reached.",
      );
    if ((global.data()?.count || 0) >= LIMITS.globalDay)
      throw new HttpsError(
        "resource-exhausted",
        "Service message limit reached.",
      );
    transaction.set(refs.request, {
      hash,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 48 * 3600_000),
    });
    transaction.set(refs.hourly, {
      count: (hourly.data()?.count || 0) + 1,
      expiresAt: new Date(now.getTime() + 2 * 3600_000),
    });
    transaction.set(refs.daily, {
      count: (daily.data()?.count || 0) + 1,
      expiresAt: new Date(now.getTime() + 2 * 24 * 3600_000),
    });
    transaction.set(refs.global, {
      count: (global.data()?.count || 0) + 1,
      expiresAt: new Date(now.getTime() + 2 * 24 * 3600_000),
    });
    return { replay: false };
  });
}

async function chargeLegacyExport(db, uid, emailKey, now = new Date()) {
  const hour = now.toISOString().slice(0, 13);
  const day = now.toISOString().slice(0, 10);
  const refs = [
    {
      ref: db
        .collection("legacyExportLimits")
        .doc("hour_uid_" + uid + "_" + hour),
      limit: 5,
      ttl: 2 * 3600_000,
    },
    {
      ref: db
        .collection("legacyExportLimits")
        .doc("day_uid_" + uid + "_" + day),
      limit: 20,
      ttl: 2 * 24 * 3600_000,
    },
    {
      ref: db
        .collection("legacyExportLimits")
        .doc("hour_email_" + emailKey + "_" + hour),
      limit: 5,
      ttl: 2 * 3600_000,
    },
    {
      ref: db
        .collection("legacyExportLimits")
        .doc("day_email_" + emailKey + "_" + day),
      limit: 20,
      ttl: 2 * 24 * 3600_000,
    },
  ];
  await db.runTransaction(async (transaction) => {
    const docs = await Promise.all(refs.map(({ ref }) => transaction.get(ref)));
    if (
      docs.some((doc, index) => (doc.data()?.count || 0) >= refs[index].limit)
    )
      throw new HttpsError(
        "resource-exhausted",
        "Too many import attempts. Try again later.",
      );
    refs.forEach(({ ref, ttl }, index) =>
      transaction.set(ref, {
        count: (docs[index].data()?.count || 0) + 1,
        expiresAt: new Date(now.getTime() + ttl),
      }),
    );
  });
}

module.exports = { LIMITS, chargeMessage, chargeLegacyExport, fingerprint };
