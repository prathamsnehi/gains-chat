import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { localStore } from "@/data/localStore";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function SettingsScreen() {
  const c = usePalette();
  const { bridge } = useGains();
  const [sync, setSync] = useState("Checking iCloud sync…");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void bridge.refresh().catch(() => {});
      localStore
        .getSyncStatus()
        .then((status) => {
          if (!active) return;
          if (status.icloudAccount === "noAccount") {
            setSync("Sign in to iCloud in iPhone Settings to sync your lifts.");
          } else if (status.icloudAccount === "restricted") {
            setSync(
              "iCloud is restricted on this device. Your lifts stay saved here.",
            );
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
        .catch(() => {
          if (active) setSync("iCloud sync status unavailable");
        });
      return () => {
        active = false;
      };
    }, [bridge]),
  );

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
    </ScrollView>
  );
}
