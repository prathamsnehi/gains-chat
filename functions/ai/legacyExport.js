const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { HttpsError } = require("firebase-functions/v2/https");
const connectDb = require("../utils/connect");
const UsersModel = require("../models/usersModel");
const UserLogsModel = require("../models/userLogsModel");
const ExercisesModel = require("../models/exercisesModel");

const PAGE_SIZE = 500;

async function exportLegacyCore(data) {
  const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data?.password === "string" ? data.password : "";
  const cursor = data?.cursor;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 200 ||
      (cursor !== undefined && (!mongoose.isValidObjectId(cursor) || typeof cursor !== "string"))) {
    throw new HttpsError("invalid-argument", "Enter your legacy email and password.");
  }
  await connectDb();
  const user = await UsersModel.findOne({ email }).lean();
  const valid = user ? await bcrypt.compare(password, user.password) : false;
  if (!valid) throw new HttpsError("permission-denied", "Legacy email or password was incorrect.");
  const userId = user._id;
  const query = { userId, ...(cursor ? { _id: { $gt: new mongoose.Types.ObjectId(cursor) } } : {}) };
  const [logs, totalLogs] = await Promise.all([
    UserLogsModel.find(query).sort({ _id: 1 }).limit(PAGE_SIZE + 1).lean(),
    UserLogsModel.countDocuments({ userId }),
  ]);
  const page = logs.slice(0, PAGE_SIZE);
  // Exercises were a shared catalog in the old app, with no owner field. Export
  // it once so unlogged custom exercises retain their original identity too.
  const exercises = cursor ? [] : await ExercisesModel.find({}).lean();
  return {
    name: user.name,
    legacyUserId: String(user._id),
    totalLogs,
    nextCursor: logs.length > PAGE_SIZE ? String(page[page.length - 1]._id) : null,
    logs: page.map((log) => ({
      id: String(log._id),
      exerciseId: String(log.exercise?.exerciseId || ""),
      exerciseName: String(log.exercise?.exerciseName || ""),
      weight: Number(log.exerciseWeight),
      reps: Number(log.exerciseReps),
      date: String(log.date || ""),
    })),
    exercises: exercises.map((exercise) => ({ id: String(exercise._id), name: exercise.name, muscleGroups: exercise.muscleGroups || [] })),
  };
}

module.exports = { exportLegacyCore, PAGE_SIZE };
