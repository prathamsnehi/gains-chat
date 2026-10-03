import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import TodayScreen from "../screens/TodayScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProgressScreen from "../screens/ProgressScreen";
import GoalsScreen from "../screens/GoalsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { colorsFor } from "../theme/palette";

const Tab = createBottomTabNavigator();
export default function BottomTabsNavigation() {
  const c = colorsFor(useColorScheme() === "dark");
  return (
    <Tab.Navigator
      initialRouteName="Today"
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
            Today: "chatbubble-ellipses",
            History: "time",
            Progress: "trending-up",
            Goals: "flag",
            Settings: "settings-outline",
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
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
