// Dependencies:
import { ScrollView, StyleSheet, Text } from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";

// Components:
import TypewriterText from "@/app/components/TypewriterText";
import CardWithoutImage from "@/app/components/CardWithoutImage";
import GenericTextInput from "@/app/components/GenericTextInput";

interface Exercise {
  exerciseName: string;
  exerciseId: string;
}

export default function GraphHomeScreen({ navigation }) {
  // state that displays all the unique exercises that the User has logged
  const [uniqueExercises, setUniqueExercises] = useState<Exercise[]>([]);

  useFocusEffect(
    // run the useEffect whenever the screen comes into focus, to
    // effectively render new added items to the view, whereas using simple useEffect would only run once, period
    React.useCallback(() => {
      SecureStore.getItemAsync("userData")
        .then((result) => {
          if (result != null) {
            const parsedUserData = JSON.parse(result);
            if (parsedUserData) {
              // setUserId(parsedUserData.userId);
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
      return () => {
        // Do something when the screen is unfocused
        // Useful for cleanup functions
      };
    }, [])
  );

  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

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

  return (
    <>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TypewriterText
          textContent={"Choose an Exercise to view Progress Graph"}
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
            <CardWithoutImage
              title={uniqueExercise.exerciseName}
              key={uniqueExercise.exerciseId}
              description={`Track your progression for ${uniqueExercise.exerciseName}`}
              mode="light"
              textColor="dark"
              callback={() => {
                navigation.navigate("View Graph", {
                  exerciseId: uniqueExercise.exerciseId,
                });
              }}
            />
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
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#495057",
    marginVertical: 12,
    textAlign: "center",
  },
});
