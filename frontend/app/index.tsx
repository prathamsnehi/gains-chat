import * as SecureStore from "expo-secure-store";
import { useState, useEffect } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";

import BottomTabsNavigation from "./navigation/BottomTabsNavigation";
import LoginStack from "./navigation/stack navigators/LoginStack";
import LoginPageOnboarding from "./components/LoginPageOnboarding";

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync("isAuthenticated")
      .then((isAuthenticated) => {
        setIsAuthenticated(isAuthenticated === "true");
      })
      .catch((err) => console.log(err));
  }, []);
  if (isAuthenticated == null) {
    // use as a loading screen when the isAuthenticated key is being fetched from secure storage
    return (
      <>
        {/* makes it so that the statusbar items are black because app bg is white */}
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </>
    );
  }
  return isAuthenticated ? (
    <BottomTabsNavigation />
  ) : (
    <>
      <LoginStack onboarding={true} />
    </>
  );
}
