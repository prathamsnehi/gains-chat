import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingHomeScreen from "./screens/setting/SettingHomeScreen";
import DeleteAccountScreen from "./screens/setting/DeleteAccountScreen";
const Stack = createNativeStackNavigator();

export default function SettingStack() {
  return (
    <>
      <Stack.Navigator
        initialRouteName="Settings"
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen name="Settings" component={SettingHomeScreen} />
        <Stack.Screen name="Delete Account" component={DeleteAccountScreen} />
      </Stack.Navigator>
    </>
  );
}
