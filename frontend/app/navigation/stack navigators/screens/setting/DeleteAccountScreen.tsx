import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import api from "@/app/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function DeleteAccountScreen() {
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

  const handleDeleteAccount = function () {
    handleAlertConfirmation("Permanently Delete Account", async () => {
      handleAlertConfirmation("Proceed", () => {
        SecureStore.getItemAsync("userData")
          .then((userData) => {
            if (userData != null) {
              const parsedUserData = JSON.parse(userData);
              if (parsedUserData) {
                return parsedUserData.userId; // returning the userId so that the next 'then' construct can use this promise return value
                // if I just relied on using the userId state, it wasn't working as intended
              }
            } else {
              console.log("error retrieving key from secure storage");
            }
          })
          .then((userId) => {
            api
              .post("/user/delete-account", {
                userId: userId,
              })
              .then((result) => {
                handleAlertConfirmation(
                  "Clear All Data",
                  async () => {
                    try {
                      await SecureStore.deleteItemAsync("userData");
                      await SecureStore.setItemAsync(
                        "isAuthenticated",
                        "false"
                      ); // force logout
                      router.replace("/");
                      // Navigate to login screen or app entry point

                      await AsyncStorage.removeItem("exerciseGoals"); // force clear exercise goals
                    } catch (error) {
                      Alert.alert(
                        "Error",
                        "Error siging the user out:" + String(error)
                      );
                    }
                  },
                  true
                );
              });
          });
      });
    });
  };
  return (
    <>
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              Proceed with deleting account
            </Text>
          </View>

          {/* Settings Group */}
          <View style={styles.settingsGroup}>
            {/* Clear Logs Button */}
            <TouchableOpacity
              style={[
                styles.settingItem,
                styles.topSettingItem,
                styles.bottomSettingItem,
              ]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="trash-outline" size={22} color="#007AFF" />
                </View>
                <Text style={styles.settingItemText}>
                  Delete Account and Data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>

            {/* Divider */}
          </View>
        </ScrollView>
      </View>
    </>
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
