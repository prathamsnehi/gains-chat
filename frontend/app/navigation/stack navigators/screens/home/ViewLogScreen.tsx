// Dependencies:
import { ScrollView, StyleSheet, Text } from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

// Components:
import TypewriterText from "@/app/components/TypewriterText";
import CardWithoutImage from "@/app/components/CardWithoutImage";
import GenericTextInput from "@/app/components/GenericTextInput";

// Interfaces:
interface Exercise {
  exerciseName: string;
  exerciseId: string;
}

export default function ViewLogScreen({ navigation }) {
  // state that displays all the unique exercises that the User has logged
  const [uniqueExercises, setUniqueExercises] = useState<Exercise[]>([]);
  // each element of the uniqueExercises array is in this form:

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
            <CardWithoutImage
              title={uniqueExercise.exerciseName}
              key={uniqueExercise.exerciseId}
              description={`Track your progression for ${uniqueExercise.exerciseName}`}
              mode="light"
              textColor="dark"
              callback={() => {
                navigation.navigate("Log Detail", {
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
    textAlign: "center", // nah bro ain't gonna see "How to center a div"
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
