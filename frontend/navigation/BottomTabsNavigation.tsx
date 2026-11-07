import React from "react";
import { Tabs } from "expo-router/js-tabs";
import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useColorScheme } from "react-native";
import { colorsFor } from "../theme/palette";

export default function BottomTabsNavigation() {
  const c = colorsFor(useColorScheme() === "dark");
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 84,
          paddingTop: 8,
          paddingBottom: 22,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const names: Record<
            string,
            React.ComponentProps<typeof Ionicons>["name"]
          > = {
            index: "chatbubble-ellipses",
            history: "time",
            progress: "trending-up",
            goals: "flag",
            settings: "settings-outline",
          };
          return (
            <Ionicons
              name={names[route.name]}
              color={color}
              size={size ?? 23}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="goals" options={{ title: "Goals" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
