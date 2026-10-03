// Dependencies:
import { ScrollView, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
const logWorkoutImage = require("@/assets/images/log-workout-image.png");

// Components
import Card from "@/app/components/Card";
import MiniCard from "@/app/components/MiniCard";
import CardGrid from "@/app/components/CardGrid";
import TypewriterText from "@/app/components/TypewriterText";
import { useEffect, useState, version } from "react";

export default function HomeScreen({ navigation }) {
  useEffect(() => {
    // fetching the user's name
    SecureStore.getItemAsync("userData").then((result) => {
      // the result is a string version of the following object:
      // {
      //   success: true,
      //   isAuthenticated: true,
      //   userId: string
      //   name: string
      // }
      if (result) {
        const userDataParsed = JSON.parse(result);
        if (userDataParsed.name) {
          setUserName(userDataParsed.name);
        }
      }
    });
  }, []);
  const [userName, setUserName] = useState("User");
  return (
    <>
      <ScrollView style={styles.container}>
        <TypewriterText
          textContent={`Hello there, ${userName}`}
          typingSpeed={0.8} // Faster typing (0.1 is slow, 1 is fast)
          heading={true} // Will use larger font size
        />

        <Card
          imageSource={logWorkoutImage}
          title="Log Workouts"
          description="Use a chat-like intuitive interface to track your progress"
          mode="light"
          textColor="#1a1a1a"
          callback={() => {
            navigation.navigate("Log Chat");
          }}
        />
        <View />
        <CardGrid>
          <MiniCard
            iconName="search-outline"
            iconSize={56}
            iconColor="#007AFF"
            title="View Logs"
            description="Chat turned into Beautiful Logs"
            mode="light"
            callback={() => {
              navigation.navigate("View Logs");
            }}
            backgroundColor="#f0f0f0"
            textColor="#1a1a1a"
          />
          {/* Example usage with icon */}
          <MiniCard
            iconName="trophy-outline"
            iconSize={56}
            iconColor="#007AFF"
            title="View Goals"
            description="Set, View, and Achieve Goals"
            mode="light"
            textColor="#1a1a1a"
            callback={() => {
              AsyncStorage.getItem("exerciseGoals").then((exerciseGoals) => {
                // initializes an empty exerciseGoals array in the AsyncStorage if there isn't one already
                if (exerciseGoals == null) {
                  AsyncStorage.setItem(
                    "exerciseGoals",
                    JSON.stringify([])
                  ).then(() => {
                    navigation.navigate("Goals");
                  });
                } else {
                  navigation.navigate("Goals");
                }
              });
            }}
          />
        </CardGrid>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1a1a1a",
    marginVertical: 20,
    textAlign: "center",
  },
});
