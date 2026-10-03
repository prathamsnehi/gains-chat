// Dependencies:
import { ScrollView, View, Text } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/app/utils/api";

// Components:
import CTAButton from "@/app/components/CTAButton";
import CardWithoutImage from "@/app/components/CardWithoutImage";
import GenericTextInput from "@/app/components/GenericTextInput";
import ProgressBar from "@/app/components/ProgressBar";

// Interfaces:
interface Exercise {
  exerciseName: string;
  exerciseId: string;
  goalWeight: number;
}

interface MostRecentExerciseLog {
  exerciseId: string;
  recentWeight: number;
  recentReps: number;
}

export default function GoalScreen({ navigation }) {
  const [exerciseGoalInfo, setExerciseGoalInfo] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [mostRecentExercises, setMostRecentExercises] = useState<
    MostRecentExerciseLog[]
  >([]);

  useFocusEffect(
    React.useCallback(() => {
      SecureStore.getItemAsync("userData")
        .then((userData) => {
          if (userData != null) {
            return JSON.parse(userData).userId;
          }
        })
        .then((userIdString) => {
          AsyncStorage.getItem("exerciseGoals").then((result) => {});
          AsyncStorage.getItem("exerciseGoals").then((exerciseGoalsArray) => {
            if (exerciseGoalsArray != null && exerciseGoalsArray.length > 0) {
              const parsedGoalsArray = JSON.parse(exerciseGoalsArray);

              // the paresd Goals Array is in the following form:
              // [
              //   {
              //     exerciseName: string
              //     exerciseId: string
              //     goalWeight:number
              //   },
              // ]
              setExerciseGoalInfo(parsedGoalsArray); // update the state variable with the parsed array of goals

              // looping through the parsedGoalsArray, and adding the most recent exercise of that kind to the mostRecentExercises array
              for (const exercise of parsedGoalsArray) {
                api
                  .post(`/user/get-exercise-logs/${exercise.exerciseId}`, {
                    userId: userIdString,
                  })
                  .then((resultLogs) => {
                    setMostRecentExercises((oldMostRecentExercises) => {
                      const mostRecentLog = resultLogs.data.at(-1);

                      // recent log is in this format:
                      // {
                      //   userId: Schema.Types.ObjectId,
                      //   workoutId: String,
                      //   exercise: {
                      //     exerciseId: Schema.Types.ObjectId,
                      //     exerciseName: String,
                      //   },
                      //   exerciseWeight: Number,
                      //   exerciseReps: Number,
                      // },

                      // note that this crashes if a new user is initialized, and it still has the goals of the previous user that was signed in
                      // solution: clear goals when signing out as well
                      // will need to change this in the future tho, so the goals array will be tied to a particular user, and not the device persisting storage
                      return [
                        ...oldMostRecentExercises,
                        {
                          exerciseId: mostRecentLog.exercise.exerciseId,
                          recentWeight: mostRecentLog.exerciseWeight,
                          recentReps: mostRecentLog.exerciseReps,
                        },
                      ];
                    });
                  });
              }
            }
          });
        });
      return () => {
        // Do something when the screen is unfocused
        // Useful for cleanup functions
      };
    }, [])
  );

  const handleChangeSearchText = function (currentSearchText) {
    // filtering the uniqueExercises array by the letters in the currentSearchText
    const currentExercisesArray = exerciseGoalInfo;
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

  return (
    <>
      <CTAButton
        title={"Add Goal"}
        onPress={() => {
          navigation.navigate("Add Goals");
        }}
        iconName="add-circle-outline"
        iconSize={24}
      />
      <GenericTextInput
        placeholder="Search an Exercise"
        onTextChange={handleChangeSearchText}
      />

      <View
        style={{
          height: "2%",
        }}
      />
      <ScrollView>
        {(filteredExercises.length > 0
          ? filteredExercises
          : exerciseGoalInfo
        ).map((uniqueExercise) => {
          let recentOneRepMax = 0;
          for (let i = 0; i < mostRecentExercises.length; i++) {
            if (
              mostRecentExercises[i].exerciseId == uniqueExercise.exerciseId
            ) {
              recentOneRepMax = Number(
                (
                  mostRecentExercises[i].recentWeight *
                  (1 + mostRecentExercises[i].recentReps / 30)
                ).toFixed(2)
              );
            }
          }

          return (
            <CardWithoutImage
              title={uniqueExercise.exerciseName}
              key={uniqueExercise.exerciseId}
              description={`Goal 1RM: ${uniqueExercise.goalWeight}; Current: ${
                recentOneRepMax ? recentOneRepMax : 2121
              }`}
              mode="light"
              textColor="dark"
            >
              <ProgressBar
                currentValue={recentOneRepMax}
                maxValue={uniqueExercise.goalWeight}
                showPercentage={true}
              />
            </CardWithoutImage>
          );
        })}
      </ScrollView>
    </>
  );
}
