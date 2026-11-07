import { requireNativeModule } from "expo";

export type RecordKind =
  "lift" | "exercise" | "alias" | "goal" | "chat" | "pending";

type NativeRecord = {
  id: string;
  kind: RecordKind;
  payload: string;
  updatedAt: string;
};

type NativeModule = {
  initialize(): Promise<void>;
  list(kind: RecordKind): Promise<NativeRecord[]>;
  upsert(
    kind: RecordKind,
    id: string,
    payload: string,
    updatedAt: string,
  ): Promise<void>;
  remove(kind: RecordKind, id: string): Promise<void>;
  clearAll(): Promise<void>;
  getSyncStatus(): Promise<{
    icloudAccount:
      "available" | "noAccount" | "restricted" | "couldNotDetermine";
    cloudEnabled: boolean;
    phase: "idle" | "setup" | "importing" | "exporting" | "failed";
  }>;
};

export default requireNativeModule<NativeModule>("GainsLocalStore");
