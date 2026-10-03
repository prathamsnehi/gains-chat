import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GraphHomeScreen from "./screens/graph/GraphHomeScreen";
import GraphViewScreen from "./screens/graph/GraphViewScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <>
      <Stack.Navigator
        initialRouteName="Graph"
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen name="Graph" component={GraphHomeScreen} />
        <Stack.Screen name="View Graph" component={GraphViewScreen} />
      </Stack.Navigator>
    </>
  );
}
