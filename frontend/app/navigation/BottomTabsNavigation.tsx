import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { View, TextInput, StyleSheet } from "react-native";

// Component Imports:
import HomeStack from "./stack navigators/HomeStack";
import GraphStack from "./stack navigators/GraphStack";
import SettingStack from "./stack navigators/SettingStack";

const Tab = createBottomTabNavigator();

export default function BottomTabsNavigation() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: true,
        headerShown: false,
        tabBarStyle: {
          height: 64, // Reduced from default ~49
          paddingBottom: 4, // Add small padding at bottom
          paddingTop: 4, // Add small padding at top
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            return (
              <Ionicons name="home" size={focused ? 28 : 24} color={color} />
            );
          },
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="GraphsTab"
        component={GraphStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="bar-chart-outline"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
          tabBarLabel: "Graphs",
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="settings-sharp"
              size={focused ? 28 : 24}
              color={color}
            />
          ),
          tabBarLabel: "Settings",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  textInputContainer: {
    backgroundColor: "#fff",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 49,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
});
