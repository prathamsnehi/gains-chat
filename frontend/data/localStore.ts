import NativeStore, { type RecordKind } from "../modules/gains-local-store/src";
import { BUILTIN_EXERCISES } from "./catalog";
import type { ProcessMessageRequest } from "./aiClient";

export type WeightUnit = "lb" | "kg";

export interface Lift {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  unit: WeightUnit;
  performedAt: string;
  createdAt?: string;
  updatedAt?: string;
  requestId?: string;
}

export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  group?: string;
  isCustom?: boolean;
}

export interface Alias {
  id: string;
  exerciseId: string;
  name: string;
  createdAt?: string;
}

export interface Goal {
  id: string;
  exerciseId: string;
  targetOneRepMax: number;
  exerciseName?: string;
  unit?: WeightUnit;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  status?: "pending" | "processing" | "sent" | "error";
  requestId?: string;
  options?: Array<{ id: string; name: string }>;
  sourceText?: string;
}

export interface PendingMessage {
  id: string;
  requestId: string;
  text: string;
  createdAt: string;
  status: "pending" | "processing";
  attemptCount?: number;
  lastError?: string;
  selectedExerciseId?: string;
  phase?: "message" | "history";
  request?: ProcessMessageRequest;
}

export interface Snapshot {
  lifts: Lift[];
  exercises: Exercise[];
  aliases: Alias[];
  goals: Goal[];
  messages: ChatMessage[];
  pending: PendingMessage[];
}

const updatedAt = (value: { updatedAt?: string; createdAt?: string }): string =>
  value.updatedAt ?? value.createdAt ?? new Date().toISOString();

function validateLift(lift: Lift): void {
  if (!lift.id || !lift.exerciseId || !lift.exerciseName || !lift.performedAt)
    throw new Error("Lift identity, exercise and date are required");
  if (
    !Number.isFinite(lift.weight) ||
    lift.weight < 0 ||
    !Number.isFinite(lift.reps) ||
    lift.reps <= 0
  )
    throw new Error("Lift weight and reps must be valid numbers");
  if (lift.unit !== "lb" && lift.unit !== "kg")
    throw new Error("Lift unit must be lb or kg");
}

async function list<T>(kind: RecordKind): Promise<T[]> {
  const records = await NativeStore.list(kind);
  return records.map((record) => JSON.parse(record.payload) as T);
}

async function upsert<
  T extends { id: string; updatedAt?: string; createdAt?: string },
>(kind: RecordKind, value: T): Promise<void> {
  if (!value.id) throw new Error("Record id is required");
  await NativeStore.upsert(
    kind,
    value.id,
    JSON.stringify(value),
    updatedAt(value),
  );
}

function orderByDate<T>(values: T[], date: (value: T) => string): T[] {
  return values.sort((a, b) => date(b).localeCompare(date(a)));
}

export const localStore = {
  initialize: () => NativeStore.initialize(),

  async loadSnapshot(): Promise<Snapshot> {
    const [lifts, exercises, aliases, goals, messages, pending] =
      await Promise.all([
        this.listLifts(),
        this.listExercises(),
        this.listAliases(),
        this.listGoals(),
        this.listMessages(),
        this.listPendingMessages(),
      ]);
    return { lifts, exercises, aliases, goals, messages, pending };
  },

  async listLifts(
    options: { exerciseId?: string; limit?: number } = {},
  ): Promise<Lift[]> {
    let lifts = orderByDate(
      await list<Lift>("lift"),
      (lift) => lift.performedAt,
    );
    if (options.exerciseId)
      lifts = lifts.filter((lift) => lift.exerciseId === options.exerciseId);
    return options.limit ? lifts.slice(0, options.limit) : lifts;
  },
  async upsertLift(lift: Lift): Promise<void> {
    validateLift(lift);
    if (lift.requestId) {
      const existing = (await list<Lift>("lift")).find(
        (item) => item.requestId === lift.requestId && item.id !== lift.id,
      );
      if (existing) return; // A retried queued request has already produced a saved set.
    }
    await upsert("lift", lift);
  },
  deleteLift: (id: string) => NativeStore.remove("lift", id),

  async listExercises(): Promise<Exercise[]> {
    const [stored, aliases] = await Promise.all([
      list<Exercise>("exercise"),
      list<Alias>("alias"),
    ]);
    const storedNames = new Set(
      stored.map((exercise) => exercise.name.trim().toLocaleLowerCase()),
    );
    return [
      ...stored,
      ...BUILTIN_EXERCISES.filter(
        (exercise) => !storedNames.has(exercise.name.toLocaleLowerCase()),
      ),
    ].map((exercise) => ({
      ...exercise,
      aliases: [
        ...new Set([
          ...(exercise.aliases ?? []),
          ...aliases
            .filter((alias) => alias.exerciseId === exercise.id)
            .map((alias) => alias.name),
        ]),
      ],
    }));
  },
  upsertExercise: (exercise: Exercise) => upsert("exercise", exercise),
  listAliases: () => list<Alias>("alias"),
  async addAlias(exerciseId: string, alias: string): Promise<void> {
    const normalized = alias.trim().toLocaleLowerCase();
    if (!exerciseId || !normalized)
      throw new Error("Exercise and alias are required");
    await upsert("alias", {
      id: `alias:${exerciseId}:${normalized}`,
      exerciseId,
      name: alias.trim(),
    });
    const exercise = (await this.listExercises()).find(
      (item) => item.id === exerciseId,
    );
    if (
      exercise &&
      !(exercise.aliases ?? []).some(
        (value) => value.toLocaleLowerCase() === normalized,
      )
    ) {
      await this.upsertExercise({
        ...exercise,
        aliases: [...(exercise.aliases ?? []), alias.trim()],
      });
    }
  },

  listGoals: () => list<Goal>("goal"),
  upsertGoal: (goal: Goal) => upsert("goal", goal),
  deleteGoal: (id: string) => NativeStore.remove("goal", id),

  async listMessages(limit?: number): Promise<ChatMessage[]> {
    const messages = orderByDate(
      await list<ChatMessage>("chat"),
      (message) => message.createdAt,
    );
    return limit ? messages.slice(0, limit).reverse() : messages.reverse();
  },
  upsertChatMessage: (message: ChatMessage) => upsert("chat", message),
  deleteChatMessage: (id: string) => NativeStore.remove("chat", id),

  async listPendingMessages(): Promise<PendingMessage[]> {
    return (await list<PendingMessage>("pending")).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  },
  enqueueMessage: (message: PendingMessage) => upsert("pending", message),
  updatePendingMessage: (message: PendingMessage) => upsert("pending", message),
  deletePendingMessage: (id: string) => NativeStore.remove("pending", id),

  getSyncStatus: () => NativeStore.getSyncStatus(),
  clearAllData: () => NativeStore.clearAll(),
};
