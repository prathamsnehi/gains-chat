import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Interfaces:
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface CTAButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconName?: IoniconsName; // Changed to string for Ionicons name
  iconSize?: number; // Optional size for the icon
  theme?: string; // TODO IN THE FUTURE: ACCOMODATE FOR BOTH LIGHT AND DARK THEMES
}

// Component Export
const CTAButton: React.FC<CTAButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  iconName,
  iconSize = 20, // Default icon size
  theme = "light", // DEFAULTED TO LIGHT THEME, BUT DOES NOTHING AT THE MOMENT
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.contentContainer}>
          {iconName && (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={iconSize} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Styling (Minimalistic + Apple Blue + Light Themed)
const styles = StyleSheet.create({
  button: {
    width: "90%",
    height: 54,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 12,
  },
  buttonDisabled: {
    backgroundColor: "#E0E0E0",
    shadowOpacity: 0,
    elevation: 0,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default CTAButton;
