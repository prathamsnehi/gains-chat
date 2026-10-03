import {
  TextInput,
  StyleSheet,
  TextInputProps,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";

interface LogChatTextBoxProps extends TextInputProps {
  placeholderText?: string;
  onTextSubmit?: (text: string) => void | null;
}

export default function LogChatTextBox({
  placeholderText = "Type your log here",
  onTextSubmit,
  ...props
}: LogChatTextBoxProps) {
  const [currentText, setCurrentText] = useState("");

  const handleSubmit = () => {
    if (currentText.trim() && onTextSubmit) {
      onTextSubmit(currentText);
      setCurrentText("");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder={placeholderText}
          value={currentText}
          onChangeText={setCurrentText}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          // autoCorrect={false}
          // autoCapitalize="none"
          placeholderTextColor="#AAAAAA"
          {...props}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    width: "100%",
    minHeight: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: "#1a1a1a",
  },
});
