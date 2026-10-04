import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import BottomTabsNavigation from "../navigation/BottomTabsNavigation";
import { useInitializeGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function Index() {
  const c = usePalette();
  const state = useInitializeGains();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar
        barStyle={c.background === "#101311" ? "light-content" : "dark-content"}
        backgroundColor={c.background}
      />
      {state.ready ? (
        <BottomTabsNavigation />
      ) : state.error ? (
        <View style={{ flex: 1, justifyContent: "center", padding: 30 }}>
          <Text style={{ color: c.text, fontSize: 25, fontWeight: "700" }}>
            Couldn’t open your training data
          </Text>
          <Text style={{ color: c.muted, marginTop: 10, lineHeight: 21 }}>
            {state.error}
          </Text>
          <Pressable
            onPress={state.retry}
            style={{
              backgroundColor: c.accent,
              padding: 14,
              borderRadius: 14,
              marginTop: 20,
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.accentText, fontWeight: "700" }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}
