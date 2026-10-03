import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { localStore } from "@/data/localStore";
import { ensureAnonymousAuth, processMessage } from "@/data/aiClient";

export type Lift = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  unit: "lb" | "kg";
  reps: number;
  performedAt: string;
  createdAt?: string;
  updatedAt?: string;
  requestId?: string;
  legacyId?: string;
};
export type Exercise = {
  id: string;
  name: string;
  aliases?: string[];
  group?: string;
  isCustom?: boolean;
};
export type Goal = {
  id: string;
  exerciseId: string;
  targetOneRepMax: number;
  unit?: "lb" | "kg";
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  status?: "pending" | "processing" | "sent" | "error";
  options?: Array<{ id: string; name: string }>;
  sourceText?: string;
};
export type PendingMessage = {
  id: string;
  requestId: string;
  text: string;
  createdAt: string;
  status: "pending" | "processing";
  selectedExerciseId?: string;
};
export type Snapshot = {
  lifts: Lift[];
  exercises: Exercise[];
  goals: Goal[];
  messages: ChatMessage[];
  pending: PendingMessage[];
};
export type MessageResponse =
  | {
      kind: "lift_draft";
      requestId: string;
      message: string;
      draft: {
        exerciseId: string;
        exerciseName: string;
        weight: number;
        reps: number;
        unit: "lb" | "kg";
      };
    }
  | { kind: "history_request"; requestId: string; message: string }
  | {
      kind: "chat_reply" | "clarification" | "error";
      requestId: string;
      message: string;
      options?: Array<{ id: string; name: string }>;
    };

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const empty: Snapshot = {
  lifts: [],
  exercises: [],
  goals: [],
  messages: [],
  pending: [],
};
let snapshot: Snapshot = empty;
let listeners = new Set<() => void>();
let draining = false;
let initialized = false;
const clarificationLocks = new Set<string>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function candidateList(text: string, exercises: Exercise[], lifts: Lift[]) {
  const query = text.toLowerCase();
  const recent = new Set(
    [...lifts]
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      .slice(0, 20)
      .map((l) => l.exerciseId),
  );
  const tokens = query.split(/[^a-z0-9]+/).filter((word) => word.length > 1);
  return [
    ...new Map(
      exercises
        .filter(
          (e) =>
            /^[A-Za-z0-9_:-]{1,100}$/.test(e.id) &&
            e.name.trim().length > 0 &&
            e.name.length <= 100,
        )
        .map((e) => [e.id, e]),
    ).values(),
  ]
    .map((exercise) => {
      const names = [exercise.name, ...(exercise.aliases ?? [])].map((value) =>
        value.toLowerCase(),
      );
      const exact = names.some((name) => query.includes(name));
      const tokenMatches = Math.max(
        ...names.map(
          (name) =>
            tokens.filter((token) => name.split(/[^a-z0-9]+/).includes(token))
              .length,
        ),
        0,
      );
      return {
        exercise,
        score:
          (exact ? 100 : 0) +
          tokenMatches * 12 +
          (recent.has(exercise.id) ? 3 : 0),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.exercise.name.localeCompare(b.exercise.name),
    )
    .slice(0, 24)
    .map(({ exercise }) => ({
      id: exercise.id,
      name: exercise.name,
      aliases: exercise.aliases,
    }));
}

function correctionFor(
  text: string,
  current: Snapshot,
): { lift: Lift; weight?: number; reps?: number; unit?: "lb" | "kg" } | null {
  if (
    !/^(actually|correction|correct|change|edit|make that|that was)\b/i.test(
      text.trim(),
    )
  )
    return null;
  const lower = text.toLowerCase();
  const pair = lower.match(
    /(?:to|was)\s+(\d+(?:\.\d+)?)\s*(?:lb|lbs|kg)?\s*(?:for|x|×)\s*(\d+(?:\.\d+)?)/,
  );
  const explicitWeight = lower.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|kg)\b/);
  const explicitReps = lower.match(/(\d+(?:\.\d+)?)\s*(?:reps?|r)\b/);
  const weight = pair
    ? Number(pair[1])
    : explicitWeight
      ? Number(explicitWeight[1])
      : undefined;
  const reps = pair
    ? Number(pair[2])
    : explicitReps
      ? Number(explicitReps[1])
      : undefined;
  if (
    (weight === undefined && reps === undefined) ||
    (weight !== undefined && weight <= 0) ||
    (reps !== undefined && reps <= 0)
  )
    return null;
  const mentioned = current.exercises.find((exercise) =>
    [exercise.name, ...(exercise.aliases ?? [])].some(
      (name) => name.length > 2 && lower.includes(name.toLowerCase()),
    ),
  );
  const lift = [...current.lifts]
    .filter((item) => !mentioned || item.exerciseId === mentioned.id)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0];
  if (!lift) return null;
  return {
    lift,
    weight,
    reps,
    unit: explicitWeight
      ? explicitWeight[2] === "kg"
        ? "kg"
        : "lb"
      : undefined,
  };
}

function normalize(raw: any): Snapshot {
  return {
    lifts: raw?.lifts ?? [],
    exercises: raw?.exercises ?? [],
    goals: raw?.goals ?? [],
    messages: raw?.messages ?? [],
    pending: raw?.pending ?? [],
  };
}

export const bridge = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async initialize() {
    if (!initialized) {
      await localStore.initialize();
      initialized = true;
    }
    await this.refresh();
    void this.processPending();
  },
  async refresh() {
    publish(normalize(await localStore.loadSnapshot()));
  },
  async saveLift(lift: Lift) {
    if (
      !lift.exerciseId ||
      !lift.exerciseName.trim() ||
      !Number.isFinite(lift.weight) ||
      lift.weight <= 0 ||
      !Number.isFinite(lift.reps) ||
      lift.reps <= 0 ||
      Number.isNaN(Date.parse(lift.performedAt))
    )
      throw new Error("Enter a valid exercise, weight, reps, and date.");
    await localStore.upsertLift(lift);
    await this.refresh();
  },
  async deleteLift(id: string) {
    await localStore.deleteLift(id);
    await this.refresh();
  },
  async saveExercise(exercise: Exercise) {
    await localStore.upsertExercise(exercise);
    await this.refresh();
  },
  async addAlias(exerciseId: string, alias: string) {
    await localStore.addAlias(exerciseId, alias);
    await this.refresh();
  },
  async saveGoal(goal: Goal) {
    await localStore.upsertGoal(goal);
    await this.refresh();
  },
  async deleteGoal(id: string) {
    await localStore.deleteGoal(id);
    await this.refresh();
  },
  async send(
    text: string,
    options: { skipLocalCorrection?: boolean; selectedExerciseId?: string } = {},
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 500)
      throw new Error("Keep messages under 500 characters.");
    const id = makeId("message");
    const createdAt = new Date().toISOString();
    const correction = options.skipLocalCorrection
      ? null
      : correctionFor(trimmed, snapshot);
    if (correction) {
      const changed: Lift = {
        ...correction.lift,
        weight: correction.weight ?? correction.lift.weight,
        reps: correction.reps ?? correction.lift.reps,
        unit: correction.unit ?? correction.lift.unit,
        updatedAt: createdAt,
      };
      await localStore.upsertLift(changed);
      await localStore.upsertChatMessage({
        id,
        role: "user",
        text: trimmed,
        createdAt,
        status: "sent",
      });
      await localStore.upsertChatMessage({
        id: `reply-${id}`,
        role: "assistant",
        text: `Updated ${changed.exerciseName}: ${changed.weight} ${changed.unit} × ${changed.reps}.`,
        createdAt: new Date().toISOString(),
        status: "sent",
      });
      await this.refresh();
      return;
    }
    const user: ChatMessage = {
      id,
      role: "user",
      text: trimmed,
      createdAt,
      status: "pending",
    };
    const pending: PendingMessage = {
      id,
      requestId: id,
      text: trimmed,
      createdAt,
      status: "pending",
      selectedExerciseId: options.selectedExerciseId,
    };
    await localStore.upsertChatMessage(user);
    await localStore.enqueueMessage(pending);
    await this.refresh();
    void this.processPending();
  },
  async chooseClarification(messageId: string, exerciseId: string) {
    if (clarificationLocks.has(messageId)) return;
    const message = snapshot.messages.find((item) => item.id === messageId);
    const exercise = snapshot.exercises.find((item) => item.id === exerciseId);
    if (!message?.sourceText || !exercise) throw new Error("This correction is no longer available.");
    clarificationLocks.add(messageId);
    try {
      const alias = message.sourceText
        .toLowerCase()
        .replace(/\d+(?:\.\d+)?\s*(?:kg|kgs|lbs?|reps?|sets?|s)?/g, " ")
        .replace(/\b(?:for|did|i|my|the|set|sets|x)\b/g, " ")
        .replace(/[^a-z ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (alias.length >= 3 && alias.length <= 50 && alias !== exercise.name.toLowerCase())
        await this.addAlias(exerciseId, alias);
      await this.send(message.sourceText, {
        skipLocalCorrection: true,
        selectedExerciseId: exerciseId,
      });
      await localStore.upsertChatMessage({
        ...message,
        options: undefined,
        sourceText: undefined,
      });
      await this.refresh();
    } finally {
      clarificationLocks.delete(messageId);
    }
  },
  async processPending() {
    if (draining) return;
    draining = true;
    try {
      const queue = (
        (await localStore.listPendingMessages()) as PendingMessage[]
      ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (!queue.length) return;
      const network = await NetInfo.fetch();
      if (network.isConnected === false) return;
      await ensureAnonymousAuth();
      for (const item of queue) {
        const processingStarted = Date.now();
        let functionMs = 0;
        const current = normalize(await localStore.loadSnapshot());
        const recentMessages = current.messages
          .filter((m) => m.id !== item.id && m.status !== "pending")
          .slice(-8)
          .map((m) => ({ role: m.role, text: m.text }));
        const candidates = candidateList(
          item.text,
          current.exercises,
          current.lifts,
        );
        if (
          item.selectedExerciseId &&
          !candidates.some((candidate) => candidate.id === item.selectedExerciseId)
        ) {
          const selected = current.exercises.find(
            (exercise) => exercise.id === item.selectedExerciseId,
          );
          if (selected)
            candidates.splice(0, 1, {
              id: selected.id,
              name: selected.name,
              aliases: selected.aliases,
            });
        }
        try {
          await localStore.updatePendingMessage({
            ...item,
            status: "processing",
          });
          const firstCallStarted = Date.now();
          let response = (await processMessage({
            requestId: item.requestId,
            text: item.text,
            candidates,
            recentMessages,
            selectedExerciseId: item.selectedExerciseId,
          })) as MessageResponse;
          functionMs += Date.now() - firstCallStarted;
          if (response.requestId !== item.requestId)
            throw new Error("Response request ID did not match.");
          if (response.kind === "history_request") {
            const question = item.text.toLowerCase();
            const matching = candidates
              .filter((candidate) =>
                [candidate.name, ...(candidate.aliases ?? [])].some(
                  (name) => name.length > 2 && question.includes(name.toLowerCase()),
                ),
              )
              .slice(0, 4);
            const relevant = matching.flatMap((candidate) =>
              current.lifts
                .filter((lift) => lift.exerciseId === candidate.id)
                .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
                .slice(0, 2),
            );
            const historySnippets = (
              relevant.length
                ? relevant
                : [...current.lifts]
                    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
                    .slice(0, 8)
            ).map((l) => ({
              exerciseName: l.exerciseName,
              weight: l.weight,
              reps: l.reps,
              unit: l.unit,
              date: l.performedAt,
            }));
            const retryRequestId = makeId("request");
            await localStore.updatePendingMessage({
              ...item,
              requestId: retryRequestId,
              status: "processing",
            });
            const historyCallStarted = Date.now();
            response = (await processMessage({
              requestId: retryRequestId,
              text: item.text,
              candidates,
              recentMessages,
              historySnippets,
              historyLookupComplete: true,
            })) as MessageResponse;
            functionMs += Date.now() - historyCallStarted;
            if (response.requestId !== retryRequestId)
              throw new Error("Response request ID did not match.");
          }
          if (response.kind === "lift_draft") {
            const draft = response.draft;
            const exercise = current.exercises.find(
              (e) => e.id === draft.exerciseId,
            );
            const valid =
              !!exercise &&
              Number.isFinite(draft.weight) &&
              draft.weight > 0 &&
              Number.isFinite(draft.reps) &&
              draft.reps > 0 &&
              (draft.unit === "lb" || draft.unit === "kg");
            if (!valid)
              throw new Error(
                "The lift needs a correction before it can be saved.",
              );
            const existing = current.lifts.find((l) => l.requestId === item.id);
            if (!existing)
              await localStore.upsertLift({
                id: makeId("lift"),
                exerciseId: draft.exerciseId,
                exerciseName: exercise!.name,
                weight: draft.weight,
                reps: draft.reps,
                unit: draft.unit,
                performedAt: item.createdAt,
                createdAt: item.createdAt,
                updatedAt: new Date().toISOString(),
                requestId: item.id,
              });
          }
          const assistant: ChatMessage = {
            id: `reply-${item.id}`,
            role: "assistant",
            text: response.kind === "clarification" && !response.options?.length
              ? `${response.message} Send the full set again with exercise, weight, and reps.`
              : response.message,
            createdAt: new Date().toISOString(),
            status: "sent",
            options: response.kind === "clarification" ? response.options : undefined,
            sourceText: response.kind === "clarification" ? item.text : undefined,
          };
          await localStore.upsertChatMessage(assistant);
          await localStore.upsertChatMessage({
            id: item.id,
            role: "user",
            text: item.text,
            createdAt: item.createdAt,
            status: "sent",
          });
          await localStore.deletePendingMessage(item.id);
          await this.refresh();
          console.info("Gains Chat client timing", {
            requestId: item.id,
            queueDelayMs: Math.max(0, processingStarted - Date.parse(item.createdAt)),
            functionMs,
            processingMs: Date.now() - processingStarted,
            kind: response.kind,
          });
        } catch (error) {
          await localStore.updatePendingMessage({ ...item, status: "pending" });
          await this.refresh();
          break; // Keep the durable queue in order; retry when online or foregrounded.
        }
      }
    } catch {
      // Auth, networking, and transient native errors leave messages queued for retry.
    } finally {
      draining = false;
    }
  },
};

NetInfo.addEventListener((state) => {
  if (state.isConnected) void bridge.processPending();
});
AppState.addEventListener("change", (state) => {
  if (state === "active") void bridge.processPending();
});
