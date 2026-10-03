// Dependencies:
import { ScrollView, StyleSheet, View, Text } from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components:
import TypewriterText from "@/app/components/TypewriterText";
import CardWithoutImage from "@/app/components/CardWithoutImage";
import GenericTextInput from "@/app/components/GenericTextInput";
import CTAButton from "@/app/components/CTAButton";

// Interfaces:
interface Exercise {
  exerciseName: string;
  exerciseId: string;
}

export default function AddGoalScreen({ navigation }) {
  // state that displays all the unique exercises that the User has logged
  const [uniqueExercises, setUniqueExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState(null);
  const [goalWeight, setGoalWeight] = useState("0");

  useEffect(() => {
    // this useEffect first fetches the userId, then feeds that into a post request to get relevant unique exercises belonging to the user
    SecureStore.getItemAsync("userData")
      .then((result) => {
        if (result != null) {
          const parsedUserData = JSON.parse(result);
          if (parsedUserData) {
            return parsedUserData.userId; // returning the userId so that the next 'then' construct can use this promise return value
            // if I just relied on using the userId state, it wasn't working as intended
          }
        } else {
          console.log("error retrieving key from secure storage");
        }
      })
      .then((resultUserId) => {
        // after the userId state has been set, execute this block next
        // fetching the particular lift data from the userLogs database:
        api
          .post("/user/get-exercises", {
            userId: resultUserId,
          })
          .then((result) => {
            setUniqueExercises(result.data);
          })
          .catch((err) => {
            console.log(err);
          });
      });
  }, []);

  const handleChangeSearchText = function (currentSearchText) {
    // filtering the uniqueExercises array by the letters in the currentSearchText
    const currentExercisesArray = uniqueExercises;
    const filteredExercisesArray = currentExercisesArray.filter(
      (exerciseObject) => {
        if (
          exerciseObject.exerciseName
            .toLowerCase()
            .includes(currentSearchText.toLowerCase())
        ) {
          return true;
        } else {
          return false;
        }
      }
    );
    setFilteredExercises(filteredExercisesArray);
  };

  const handleExerciseClick = function (exerciseId) {
    setActiveExerciseId(exerciseId);
  };

  return (
    <>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TypewriterText
          textContent={"Choose an Exercise to view Logs"}
          typingSpeed={0.95}
        />

        <GenericTextInput
          placeholder="Search an Exercise"
          onTextChange={handleChangeSearchText}
        />

        {(filteredExercises.length > 0
          ? filteredExercises
          : uniqueExercises
        ).map((uniqueExercise) => {
          return (
            <View
              key={uniqueExercise.exerciseId} // the exerciseId is in the form of string here rn
            >
              <CardWithoutImage
                title={uniqueExercise.exerciseName}
                description=""
                mode="light"
                textColor="dark"
                callback={() => {
                  handleExerciseClick(uniqueExercise.exerciseId);
                }}
              >
                {activeExerciseId === uniqueExercise.exerciseId ? (
                  <View style={styles.expandedMenu}>
                    <Text style={styles.menuLabel}>
                      What's your target weight for
                      {uniqueExercise.exerciseName}?
                    </Text>

                    <View style={styles.inputContainer}>
                      <GenericTextInput
                        placeholder="Enter weight in lbs"
                        // onTextChange={handleGoalTextChange}
                        keyboardType="numeric"
                        onTextChange={(goalWeight) => {
                          setGoalWeight(goalWeight);
                        }}
                      />
                    </View>

                    <View style={styles.buttonContainer}>
                      <CTAButton
                        title="Set Goal"
                        iconName="checkmark-circle-outline"
                        onPress={() => {
                          AsyncStorage.getItem("exerciseGoals").then(
                            (exerciseGoalsArray) => {
                              // the received array will be in the form of:
                              // [
                              //   {
                              //     exerciseName: string
                              //     exerciseId: string
                              //     goalWeight:number
                              //   },
                              // ]
                              if (exerciseGoalsArray != null) {
                                const parsedGoalsArray =
                                  JSON.parse(exerciseGoalsArray);
                                for (
                                  let i = 0;
                                  i < parsedGoalsArray.length;
                                  i++
                                ) {
                                  if (
                                    parsedGoalsArray[i].exerciseId ==
                                    uniqueExercise.exerciseId
                                  ) {
                                    parsedGoalsArray.splice(i, 1); // remove the old goal if the new goal is being added for a pre-existing exercise
                                    // basically, replace an old goal
                                  }
                                }
                                const newGoalsArray = [
                                  {
                                    exerciseName: uniqueExercise.exerciseName,
                                    exerciseId: uniqueExercise.exerciseId,
                                    goalWeight: parseFloat(goalWeight),
                                  },
                                  ...parsedGoalsArray,
                                ];
                                AsyncStorage.setItem(
                                  "exerciseGoals",
                                  JSON.stringify(newGoalsArray)
                                ).then(() => {
                                  navigation.goBack();
                                });
                              }
                            }
                          );
                        }}
                      />
                    </View>
                  </View>
                ) : null}
              </CardWithoutImage>
            </View>
          );
        })}
        {uniqueExercises.length == 0 ? (
          <Text
            style={[
              styles.menuLabel,
              {
                width: "90%",
                alignSelf: "center",
              },
            ]}
          >
            Please add an exercise using the Log Workout in order to set goals
          </Text>
        ) : null}
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
  spacing: {
    height: "2%",
  },
  expandedMenu: {
    // backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e9ecef",
    marginTop: -12, // Pull up slightly to create a seamless connection
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#495057",
    marginVertical: 12,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 8,
  },
});
