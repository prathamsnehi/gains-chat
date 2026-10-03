// Dependencies:
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Alert,
} from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native";
const { width, height } = Dimensions.get("window");

// Interfaces:
interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    api
      .post("/user/login", {
        email: email,
        password: password,
      })
      .then((response) => {
        // check to see if server should authenticate user or not based on the login info
        if (response.data.success) {
          // Store auth and user data from response
          const userData = JSON.stringify(response.data);
          SecureStore.setItemAsync("userData", userData).then((result) => {
            SecureStore.setItemAsync("isAuthenticated", "true").then(
              (result) => {
                AsyncStorage.setItem(
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
                ); // clear the logMessages upon user logging on to give the user a fresh start each time (Ik this is very inefficient, might fix later)
                router.replace("/");
              }
            );
          });
          // we will freely use the above userData key in our components,
          // as it is safe to assume that if the user has logged in,
          // the user must have a valid userData stored as well

          // we used a complicated nested promise syntax, but basically
          // what it does is to save userData in the storage
          // and then set the isAuthenticated property to true
          // which we then use to redirect the user to root
          // so that they can get into the app using conditional rendering in index
        } else {
          Alert.alert("Error", "Login Failed");
        }
      })
      .catch((err) => {
        console.log(err);
        if (err.response) {
          Alert.alert("Error", err.response.data.message || "Login failed");
        } else {
          Alert.alert("Error", "Connection error");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleSignUp = () => {
    navigation.navigate("Signup");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <View style={styles.content}>
              {/* Prompt Text */}
              <Text style={styles.promptText}>Welcome back</Text>

              {/* Login Form */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Username or Email"
                  placeholderTextColor="#AAAAAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#AAAAAA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.button, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Logging in..." : "Log In"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Option */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account?</Text>
                <TouchableOpacity onPress={handleSignUp}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <Text style={styles.footerText}>
                By continuing, you agree to our Terms of Service
              </Text>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: height * 0.05,
    alignItems: "center",
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  promptText: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    color: "#333333",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
  },
  signupText: {
    color: "#666666",
    marginRight: 5,
  },
  signupLink: {
    color: "#007AFF",
    fontWeight: "600",
  },
  footerText: {
    marginTop: 30,
    color: "#888888",
    textAlign: "center",
    fontSize: 12,
  },
});

export default LoginScreen;
