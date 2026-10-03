import type { ChatMessage, Exercise, Goal, LegacyImport } from "./localStore";

/** Only the old device owner ID is read; credentials never enter the new store. */
export function legacyDeviceOwner(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Previous phone account data is malformed.");
  const id = (value as { userId?: unknown }).userId;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id))
    throw new Error("Previous phone account ID is missing or invalid.");
  return id;
}

export function prepareLegacyDeviceData(
  ownerId: string,
  goalsRaw: string | null,
  messagesRaw: string | null,
  existingExercises: Exercise[],
  now: string,
): { data: LegacyImport; warnings: string[] } {
  const warnings: string[] = [];
  const parseArray = (raw: string | null, label: string): unknown[] => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      warnings.push(
        `Previous ${label} could not be read; original storage was kept.`,
      );
      return [];
    }
  };
  const exercises = new Map<string, Exercise>();
  const goals = new Map<string, Goal>();
  for (const item of parseArray(goalsRaw, "goals")) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      warnings.push("An invalid previous goal was skipped.");
      continue;
    }
    const old = item as {
      exerciseId?: unknown;
      exerciseName?: unknown;
      goalWeight?: unknown;
    };
    if (
      typeof old.exerciseId !== "string" ||
      !/^[A-Za-z0-9_-]{1,160}$/.test(old.exerciseId) ||
      typeof old.goalWeight !== "number" ||
      !Number.isFinite(old.goalWeight) ||
      old.goalWeight <= 0
    ) {
      warnings.push("An invalid previous goal was skipped.");
      continue;
    }
    const canonicalId = `restore:exercise:${old.exerciseId}`;
    const stored = existingExercises.find(
      (exercise) => exercise.id === canonicalId,
    );
    // The canonical source ID matches the later workout-file restore even before it runs.
    const sourceExercise =
      stored ??
      existingExercises.find(
        (exercise) => exercise.legacyId === old.exerciseId,
      );
    const knownName =
      sourceExercise?.name ||
      (typeof old.exerciseName === "string" ? old.exerciseName.trim() : "");
    const name = knownName || "Previous exercise";
    if (!knownName)
      warnings.push(
        "A previous goal needs its exercise name from the workout restore.",
      );
    // Do not reserve the ID with a placeholder that would hide its later restored name.
    if (!stored && knownName)
      exercises.set(canonicalId, {
        ...sourceExercise,
        id: canonicalId,
        legacyId: old.exerciseId,
        name,
      });
    const goal: Goal = {
      id: `legacy:${ownerId}:goal:${old.exerciseId}`,
      exerciseId: canonicalId,
      exerciseName: name,
      targetOneRepMax: old.goalWeight,
      unit: "lb",
    };
    goals.set(goal.id, goal);
  }
  const chatMessages: ChatMessage[] = [];
  for (const [index, item] of parseArray(messagesRaw, "chat").entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      warnings.push("An invalid previous chat message was skipped.");
      continue;
    }
    const old = item as {
      messageSender?: unknown;
      messageContent?: unknown;
      messageDate?: unknown;
    };
    if (typeof old.messageContent !== "string") {
      warnings.push("An invalid previous chat message was skipped.");
      continue;
    }
    const parsedTime =
      typeof old.messageDate === "string" || typeof old.messageDate === "number"
        ? Date.parse(String(old.messageDate))
        : NaN;
    const timestamp =
      typeof old.messageDate === "number"
        ? new Date(old.messageDate).getTime()
        : parsedTime;
    if (!Number.isFinite(timestamp))
      warnings.push(
        "A previous chat date was unavailable; its message was preserved.",
      );
    chatMessages.push({
      id: `legacy:${ownerId}:chat:${index}`,
      role: old.messageSender === "user" ? "user" : "assistant",
      text: old.messageContent,
      createdAt: Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : now,
      status: "sent",
    });
  }
  return {
    data: {
      exercises: [...exercises.values()],
      goals: [...goals.values()],
      chatMessages,
    },
    warnings,
  };
}
