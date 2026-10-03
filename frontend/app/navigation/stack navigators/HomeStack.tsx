import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./screens/home/HomeScreen";
import LogScreen from "./screens/home/LogScreen";
import ViewLogScreen from "./screens/home/ViewLogScreen";
import ViewLogDetailScreen from "./screens/home/ViewLogDetailScreen";
import GoalScreen from "./screens/home/GoalScreen";
import AddGoalScreen from "./screens/home/AddGoalScreen";
import { Image, Text, View, StyleSheet } from "react-native";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Log Chat"
          component={LogScreen}
          options={{
            headerTitle: () => (
              <View style={styles.headerContainer}>
                <Image
                  source={{
                    uri: "https://preview.redd.it/random-ahh-images-from-my-gallery-v0-nu3zm16ez23a1.jpg?width=336&format=pjpg&auto=webp&s=64b04af8bda026b29a4f8034da55e826020864ed",
                  }}
                  style={styles.headerIcon}
                />
                <Text style={styles.headerText}>Log Chat</Text>
              </View>
            ),
          }}
        />
        <Stack.Screen name="View Logs" component={ViewLogScreen} />
        <Stack.Screen name="Log Detail" component={ViewLogDetailScreen} />
        <Stack.Screen name="Goals" component={GoalScreen} />
        <Stack.Screen name="Add Goals" component={AddGoalScreen} />
      </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  headerText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
