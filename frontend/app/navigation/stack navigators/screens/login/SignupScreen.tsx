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
  ScrollView,
} from "react-native";
import api from "@/app/utils/api";
const { width, height } = Dimensions.get("window");

// Interfaces:
interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    // Basic form validation
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    api
      .post("/user/signup", {
        name: name,
        email: email,
        password: password,
      })
      .then((response) => {
        if (response.data.success) {
          navigation.navigate("Login");
        } else {
          Alert.alert("Error", response.data.message);
          setIsLoading(false);
        }
      });
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.content}>
                {/* Prompt Text */}
                <Text style={styles.promptText}>Create your account</Text>

                {/* Signup Form */}
                <View style={styles.formContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nickname"
                    placeholderTextColor="#AAAAAA"
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Username / Email"
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
                    onPress={handleSignup}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Login Option */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity onPress={handleLogin}>
                    <Text style={styles.loginLink}>Log In</Text>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footerText}>
                  No one except you will know the password of your account. Make
                  sure to remember it!
                </Text>
              </View>
            </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: height * 0.03,
    alignItems: "center",
  },
  logo: {
    width: width * 0.3, // Smaller logo for signup to make room for form
    height: width * 0.3,
  },
  promptText: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 25,
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
  loginContainer: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
  },
  loginText: {
    color: "#666666",
    marginRight: 5,
  },
  loginLink: {
    color: "#007AFF",
    fontWeight: "600",
  },
  footerText: {
    marginTop: 25,
    color: "#888888",
    textAlign: "center",
    fontSize: 12,
  },
});

export default SignupScreen;
