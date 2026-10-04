import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { localStore } from "@/data/localStore";
import {
  MAX_RESTORE_FILE_BYTES,
  prepareWorkoutRestore,
  restoreWorkouts,
  type PreparedWorkoutRestore,
} from "@/data/workoutRestore";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function SettingsScreen() {
  const c = usePalette();
  const { bridge } = useGains();
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedWorkoutRestore>();
  const [result, setResult] = useState<{
    added: number;
    alreadyPresent: number;
    totalLifts: number;
  }>();
  const [error, setError] = useState("");
  const [sync, setSync] = useState("Checking iCloud sync…");
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
      localStore
        .getSyncStatus()
        .then((status) => {
          if (status.icloudAccount === "noAccount") {
            setSync("Sign in to iCloud in iPhone Settings to sync your lifts.");
          } else if (status.icloudAccount === "restricted") {
            setSync("iCloud is restricted on this device. Your lifts stay saved here.");
          } else if (!status.cloudEnabled) {
            setSync("iCloud is unavailable. Your lifts stay saved here.");
          } else if (status.phase === "failed") {
            setSync("iCloud sync will retry. Your lifts stay saved here.");
          } else if (status.phase === "idle") {
            setSync("iCloud is connected.");
          } else {
            setSync("Syncing with iCloud…");
          }
        })
        .catch(() => setSync("iCloud sync status unavailable"));
    }, [bridge]),
  );

  async function chooseFile() {
    setError("");
    setResult(undefined);
    setPrepared(undefined);
    setBusy(true);
    let copiedFile: File | undefined;
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      copiedFile = new File(asset.uri);
      if ((asset.size ?? copiedFile.size) > MAX_RESTORE_FILE_BYTES)
        throw new Error("The workout file is too large.");
      setPrepared(prepareWorkoutRestore(await copiedFile.text()));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The workout file could not be opened.",
      );
    } finally {
      // The picker copy is disposable; the selected original stays in Files.
      try {
        if (copiedFile?.exists) copiedFile.delete();
      } catch {
        /* Cache cleanup can retry through iOS. */
      }
      setBusy(false);
    }
  }

  async function runRestore() {
    if (!prepared) return;
    setBusy(true);
    setError("");
    try {
      const value = await restoreWorkouts(prepared, localStore);
      await bridge.refresh();
      setResult(value);
      setPrepared(undefined);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Restore failed. Keep the file and retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  const card = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text
        style={{
          color: c.muted,
          fontWeight: "700",
          letterSpacing: 1.5,
          marginTop: 8,
        }}
      >
        YOUR DATA
      </Text>
      <Text
        style={{ color: c.text, fontSize: 34, fontWeight: "800", marginTop: 7 }}
      >
        Settings
      </Text>
      <View style={{ ...card, marginTop: 24 }}>
        <Text style={{ color: c.text, fontSize: 19, fontWeight: "700" }}>
          On this iPhone
        </Text>
        <Text style={{ color: c.muted, marginTop: 7, lineHeight: 21 }}>
          Your lifts are saved locally and mirrored to your private iCloud when
          sync is available.
        </Text>
        <Text style={{ color: c.muted, marginTop: 13, fontSize: 13 }}>
          {sync}
        </Text>
      </View>
      <View style={card}>
        <Text style={{ color: c.text, fontSize: 19, fontWeight: "700" }}>
          Restore recent workouts
        </Text>
        <Text style={{ color: c.muted, marginTop: 7, lineHeight: 21 }}>
          Choose your workout JSON export from Files. Each lift keeps its
          exercise, weight, reps, and date. Restoring the same file again safely
          skips lifts already saved.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={chooseFile}
          disabled={busy}
          style={{
            backgroundColor: c.elevated,
            borderRadius: 14,
            padding: 15,
            alignItems: "center",
            marginTop: 14,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ color: c.text, fontWeight: "700" }}>
            Choose workout file
          </Text>
        </Pressable>
        {prepared && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: c.text, fontWeight: "700" }}>
              {prepared.lifts.length} workouts ready
            </Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>
              {new Date(prepared.from).toLocaleDateString()} –{" "}
              {new Date(prepared.to).toLocaleDateString()}
            </Text>
            {prepared.duplicateEntries > 0 && (
              <Text style={{ color: c.muted, marginTop: 4 }}>
                {prepared.duplicateEntries} repeated entries in the file will be
                skipped.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={runRestore}
              disabled={busy}
              style={{
                backgroundColor: c.accent,
                borderRadius: 14,
                padding: 15,
                alignItems: "center",
                marginTop: 14,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: c.accentText, fontWeight: "700" }}>
                Restore workouts
              </Text>
            </Pressable>
          </View>
        )}
        {busy && (
          <ActivityIndicator color={c.accent} style={{ marginTop: 14 }} />
        )}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: c.danger, marginTop: 12 }}
          >
            {error}
          </Text>
        )}
        {result && (
          <View
            style={{
              backgroundColor: c.elevated,
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text style={{ color: c.text, fontWeight: "700" }}>
              Workouts restored
            </Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>
              {result.added} lifts added · {result.alreadyPresent} already
              present · {result.totalLifts} verified
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
