// Dependencies:
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/app/utils/api";

export default function SettingHomeScreen({ navigation }) {
  const handleAlertConfirmation = function (
    action,
    handlePressConfirm,
    noCancelOption = false
  ) {
    if (noCancelOption) {
      Alert.alert(action, `Are you sure you want to ${action}?`, [
        {
          text: action,
          style: "destructive",
          onPress: handlePressConfirm,
        },
      ]);
    } else {
      Alert.alert(action, `Are you sure you want to ${action}?`, [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: action,
          style: "destructive",
          onPress: handlePressConfirm,
        },
      ]);
    }
  };
  // Handle sign out
  const handleSignOut = function () {
    handleAlertConfirmation("Sign Out", async () => {
      try {
        await SecureStore.deleteItemAsync("userData");
        await SecureStore.setItemAsync("isAuthenticated", "false"); // force logout
        router.replace("/");
        // Navigate to login screen or app entry point

        await AsyncStorage.removeItem("exerciseGoals"); // force clear exercise goals
      } catch (error) {
        Alert.alert("Error", "Error siging the user out:" + String(error));
      }
    });
  };

  const handleClearLogs = function () {
    handleAlertConfirmation("Clear Logs", async () => {
      try {
        await AsyncStorage.setItem(
          "logMessages",
          JSON.stringify([
            {
              messageSender: "bot",
              messageContent:
                "🔥 Welcome to Workout Logger! Let’s track your gains 💪. Just tell me what exercise you did, how many reps, and the weight. I'll log it and help you track progress over time! 📊",
              messageDate: new Date(),
            },
            {
              messageSender: "bot",
              messageContent:
                "🚀 Once you’ve logged some workouts, tap the 📈 Graphs tab (bottom middle) to see your progress visually!",
              messageDate: new Date(),
            },
            {
              messageSender: "bot",
              messageContent:
                "🏆 Explore features like viewing logs, setting 1-rep max goals, and tracking progress. I’ve got your back—text me, and let’s smash those PRs! 🔥",
              messageDate: new Date(),
            },
          ])
        ); // force clear log messages
        // log messages are in this format:
        // {
        //   messageSender: sender,
        //   messageContent: newMessage,
        //   messageDate: new Date(),
        // },
        router.replace("/");
      } catch (error) {
        Alert.alert("Error", "Error clearing log messages:" + String(error));
      }
    });
  };

  const handleClearGoals = function () {
    handleAlertConfirmation("Clear Goals", async () => {
      try {
        await AsyncStorage.removeItem("exerciseGoals"); // force clear exercise goals
      } catch (error) {
        Alert.alert("Error", "Error clearing goals:" + String(error));
      }
    });
  };

  const openExternalLink = async function (url) {
    // trying to open the link:
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      try {
        await Linking.openURL(url);
      } catch (err) {
        Alert.alert("Error", "Could not open the link, please try again later");
      }
    } else {
      Alert.alert("Error", "Your device does not support opening links");
    }
  };

  const openGitHubRepo = () => {
    openExternalLink("https://github.com/blackmask-exe");
  };

  const openDeveloperInfo = () => {
    openExternalLink("https://prathamsnehi.com");
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>RESET SETTINGS</Text>
        </View>

        {/* Settings Group */}
        <View style={styles.settingsGroup}>
          {/* Clear Logs Button */}
          <TouchableOpacity
            style={[styles.settingItem, styles.topSettingItem]}
            onPress={handleClearLogs}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="trash-outline" size={22} color="#007AFF" />
              </View>
              <Text style={styles.settingItemText}>Clear Log Messages</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Clear Goals Button */}
          <TouchableOpacity
            style={[styles.settingItem, styles.bottomSettingItem]}
            onPress={handleClearGoals}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="refresh-outline" size={22} color="#007AFF" />
              </View>
              <Text style={styles.settingItemText}>Clear Goals</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Some spacing */}
        <View />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>ABOUT</Text>
        </View>

        {/* About Group */}
        <View style={styles.settingsGroup}>
          {/* About the Dev */}
          <TouchableOpacity
            style={[styles.settingItem, styles.topSettingItem]}
            onPress={openDeveloperInfo}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="help-outline" size={22} color="#007AFF" />
              </View>
              <Text style={styles.settingItemText}>About the Developer</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Github Repo */}
          <TouchableOpacity
            style={[styles.settingItem, styles.bottomSettingItem]}
            onPress={openGitHubRepo}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="logo-github" size={22} color="#007AFF" />
              </View>
              <Text style={styles.settingItemText}>Github Repository</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>DANGER ZONE</Text>
        </View>

        <View style={styles.settingsGroup}>
          {/* About the Dev */}

          {/* Github Repo */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              styles.bottomSettingItem,
              styles.topSettingItem,
            ]}
            onPress={() => {
              navigation.navigate("Delete Account");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#007AFF"
                />
              </View>
              <Text style={styles.settingItemText}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Some spacing */}
        <View style={styles.spacer} />
        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version at the bottom */}
        <Text style={styles.versionText}>Gains Chat v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0f0f0", // iOS default background color is #F2F2F7
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  settingsGroup: {
    backgroundColor: "white",
    borderRadius: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  // Add new styles for top and bottom items
  topSettingItem: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bottomSettingItem: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingItemText: {
    fontSize: 17,
    color: "#000",
  },
  divider: {
    height: 0.5,
    backgroundColor: "#C7C7CC",
    marginLeft: 56, // Align with text start
    opacity: 0.5,
  },
  spacer: {
    height: 40,
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 16,
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 20,
    marginBottom: 24,
  },
});
