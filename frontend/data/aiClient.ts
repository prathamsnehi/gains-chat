import { getApp } from "@react-native-firebase/app";
import { getAuth, signInAnonymously } from "@react-native-firebase/auth";
import {
  initializeAppCheck,
  getToken,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import { waitForAppCheckToken } from "./appCheckReadiness";

export interface ExerciseCandidate {
  id: string;
  name: string;
  aliases?: string[];
}

export interface HistorySnippet {
  exerciseName: string;
  weight: number;
  reps: number;
  unit?: "lb" | "kg";
  date: string;
}

export interface RecentMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ProcessMessageRequest {
  requestId: string;
  text: string;
  candidates: ExerciseCandidate[];
  historySnippets?: HistorySnippet[];
  recentMessages?: RecentMessage[];
  historyLookupComplete?: boolean;
  selectedExerciseId?: string;
}

export type ProcessMessageResponse =
  | {
      kind: "lift_draft";
      requestId: string;
      draft: {
        exerciseId: string;
        exerciseName: string;
        weight: number;
        reps: number;
        unit: "lb" | "kg";
      };
      message: string;
    }
  | {
      kind: "history_request" | "chat_reply" | "error";
      requestId: string;
      message: string;
    }
  | {
      kind: "clarification";
      requestId: string;
      message: string;
      options?: ExerciseCandidate[];
    };

let initialization: Promise<void> | undefined;

async function initializeFirebase(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      const app = getApp();
      const provider = new ReactNativeFirebaseAppCheckProvider();
      provider.configure({
        apple: {
          provider: __DEV__ ? "debug" : "appAttest",
        },
      });
      const appCheck = initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      await waitForAppCheckToken(() => getToken(appCheck, false));
      const auth = getAuth(app);
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

export async function ensureAnonymousAuth(): Promise<void> {
  await initializeFirebase();
}

export async function processMessage(
  request: ProcessMessageRequest,
): Promise<ProcessMessageResponse> {
  await initializeFirebase();
  const call = httpsCallable<ProcessMessageRequest, ProcessMessageResponse>(
    getFunctions(getApp(), "us-central1"),
    "processMessage",
  );
  const result = await call(request);
  return result.data;
}
