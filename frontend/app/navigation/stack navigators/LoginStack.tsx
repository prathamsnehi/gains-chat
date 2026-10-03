import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginHomeScreen from "./screens/login/LoginHomeScreen";
import LoginScreen from "./screens/login/LoginScreen";
import SignupScreen from "./screens/login/SignupScreen";

const Stack = createNativeStackNavigator();

export default function LoginStack(onboarding) {
  return (
    <>
      <Stack.Navigator
        initialRouteName="Login Home"
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen name="Login Home" component={LoginHomeScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          initialParams={onboarding} // accepting the onboarding true or false
        />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    </>
  );
}
