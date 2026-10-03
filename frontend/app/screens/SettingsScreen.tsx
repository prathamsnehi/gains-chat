import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { importLegacyAccount } from "@/data/migration";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function SettingsScreen() {
  const c = usePalette();
  const { bridge } = useGains();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { imported: number; skipped: number; totalLogs: number } | undefined
  >();
  const [error, setError] = useState("");
  const [sync, setSync] = useState("Checking iCloud sync…");
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
      import("@/data/localStore")
        .then(({ localStore }) => localStore.getSyncStatus())
        .then((status) =>
          setSync(typeof status === "string" ? status : JSON.stringify(status)),
        )
        .catch(() => setSync("iCloud sync status unavailable"));
    }, [bridge]),
  );
  async function runImport() {
    if (!email.trim() || !password) {
      setError("Enter your old Gains Chat email and password.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      const value = await importLegacyAccount(email.trim(), password);
      setResult(value);
      setPassword("");
      await bridge.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Import failed. Your old data remains available.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  const input = {
    backgroundColor: c.elevated,
    color: c.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginTop: 10,
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
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
      <View
        style={{
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 18,
          padding: 18,
          marginTop: 24,
        }}
      >
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
      <View
        style={{
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 18,
          padding: 18,
          marginTop: 16,
        }}
      >
        <Text style={{ color: c.text, fontSize: 19, fontWeight: "700" }}>
          Bring your old history over
        </Text>
        <Text style={{ color: c.muted, marginTop: 7, lineHeight: 21 }}>
          Sign in once with your previous Gains Chat account. Imported lifts,
          goals, and available chat keep their dates. You can safely retry.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Old account email"
          placeholderTextColor={c.muted}
          style={input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="Password"
          placeholderTextColor={c.muted}
          style={input}
        />
        <Pressable
          onPress={runImport}
          disabled={busy}
          style={{
            backgroundColor: busy ? c.elevated : c.accent,
            borderRadius: 14,
            padding: 15,
            alignItems: "center",
            marginTop: 14,
          }}
        >
          {busy ? (
            <ActivityIndicator color={c.accentText} />
          ) : (
            <Text style={{ color: c.accentText, fontWeight: "700" }}>
              Import history
            </Text>
          )}
        </Pressable>
        {!!error && (
          <Text style={{ color: c.danger, marginTop: 12 }}>{error}</Text>
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
              Import checked
            </Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>
              {result.imported} records added · {result.skipped} already present
              · {result.totalLogs} legacy lifts found
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{ color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 20 }}
      >
        Legacy credentials are used only for this import and are cleared from
        this screen after it succeeds.
      </Text>
    </ScrollView>
  );
}
