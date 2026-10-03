// Components:
import Login from "@/app/components/Login";
import LoginPageOnboarding from "@/app/components/LoginPageOnboarding";

export default function LoginHomeScreen({ navigation }) {
  return (
    <>
      <LoginPageOnboarding
        onboardingData={[
          {
            title: "Gains Chat with AI",
            description: "Your own AI Workout Logger and Tracking Assistant",
            image: require("@/assets/images/icon-transparent.png"),
          },
          {
            title: "AI Workout Logging",
            description:
              "Track workouts effortlessly with AI Workout Buddy—your personal exercise logkeeper.",
            image: require("@/assets/images/onboarding/homeOnboarding.png"),
          },
          {
            title: "Progress Graphs",
            description:
              "Easily visualize your progress by looking at beautifully-made progress graphs",
            image: require("@/assets/images/onboarding/graphOnboarding.png"),
          },
          {
            title: "Log Workouts, View Anytime",
            description:
              "Logs Workouts by texting your workout buddy, see the logs anytime",
            image: require("@/assets/images/onboarding/logandhistoryOnboarding.png"),
          },

          {
            title: "Set and Achieve Goals",
            description:
              "Set personal weight goals in the app, and track your progress towards your goals",
            image: require("@/assets/images/onboarding/goalsOnboarding.png"),
          },
        ]}
      />
      <Login
        onLoginPress={() => {
          navigation.navigate("Login");
        }}
        onSignupPress={() => {
          navigation.navigate("Signup");
        }}
      />
    </>
  );
}
