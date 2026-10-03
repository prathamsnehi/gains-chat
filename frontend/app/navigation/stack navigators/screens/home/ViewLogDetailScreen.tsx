// the dates on this thing are crazy complicated
// might streamline it in the future, or not, let is stay as bad code hehe

// Dependencies:
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

// Interfaces:
interface ExerciseLogItem {
  _id: string;
  exercise: {
    exerciseId: string;
    exerciseName: string;
  };
  exerciseWeight: number;
  exerciseReps: number;
  date: string; // In format YYYY-MM-DD
}

const getDateFromUserLocalTime = function (dateString: string) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`; // stupid way to make sure that user sees the logs in the date they logged it for them, and not the ISO date
};

export default function ViewLogDetailScreen({ route }) {
  useEffect(() => {
    SecureStore.getItemAsync("userData")
      .then((userDataString) => {
        if (userDataString != null) {
          const parsedUserData = JSON.parse(userDataString);
          return parsedUserData.userId;
        }
      })
      .then((userId) => {
        api
          .post(`/user/get-exercise-logs/${route.params.exerciseId}`, {
            userId: userId, // userId is in the form of a string rn
          })
          .then((resultLogs) => {
            setExerciseLogs(resultLogs.data);
          });
      });
  }, []);

  // State to store exercise logs (will be populated from API)
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Format the date from YYYY-MM-DD to a more readable format
  const formatDate = (dateString: string) => {
    // Create date object
    const date = new Date(dateString);

    // Extract UTC date components
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Create a new date using local timezone interpretation of those components
    const localDate = new Date(year, month, day);

    return localDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group logs by date for better organization
  const groupLogsByDate = () => {
    const groups: { [key: string]: ExerciseLogItem[] } = {};

    // Sort logs by date (newest first)
    const sortedLogs = [...exerciseLogs].sort(
      (a, b) =>
        new Date(getDateFromUserLocalTime(b.date)).getTime() -
        new Date(getDateFromUserLocalTime(a.date)).getTime()
    );

    // Group by date
    sortedLogs.forEach((log) => {
      if (!groups[getDateFromUserLocalTime(log.date)]) {
        groups[getDateFromUserLocalTime(log.date)] = [];
      }
      groups[getDateFromUserLocalTime(log.date)].push(log);
    });

    return groups;
  };

  const groupedLogs = groupLogsByDate(); // the keys are dates, and the values is an array of all the workouts that were done on that day

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Exercise History</Text>

        <TouchableOpacity // button to toggle editing mode to delete logs
          style={styles.editButton}
          onPress={() => {
            console.log("Edit button pressed");
            setIsEditing(!isEditing);
          }}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "Done" : "Edit"}
          </Text>
          {/* Alternatively, use an icon:
        <Feather name="edit-2" size={20} color="#007AFF" /> */}
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeaderContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.exerciseHeader]}>
            Exercise
          </Text>
          <Text style={[styles.headerText, styles.weightHeader]}>Weight</Text>
          <Text style={[styles.headerText, styles.repsHeader]}>Reps</Text>
          {isEditing && (
            <Text style={[styles.headerText, styles.deleteHeader]}>Delete</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {Object.keys(groupedLogs).length > 0 ? (
          Object.entries(groupedLogs).map(([date, logs], groupIndex) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
              </View>

              {logs.map((log, logIndex) => (
                <View
                  key={`${date}-${logIndex}`}
                  style={[
                    styles.logRow,
                    logIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                    logIndex === logs.length - 1 && styles.lastRowInGroup,
                  ]}
                >
                  <Text
                    style={[
                      styles.exerciseText,
                      isEditing && styles.editModeText,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {log.exercise.exerciseName}
                  </Text>
                  <Text
                    style={[
                      styles.weightText,
                      isEditing && styles.editModeText,
                    ]}
                  >
                    {log.exerciseWeight}
                    {log.exerciseWeight === 1 ? "lb" : "lbs"}
                  </Text>
                  <Text
                    style={[styles.repsText, isEditing && styles.editModeText]}
                  >
                    {log.exerciseReps} {log.exerciseReps === 1 ? "rep" : "reps"}
                  </Text>
                  {isEditing && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        console.log(
                          `Delete log pressed for ${log.exercise.exerciseName} on ${date}`
                        );
                        // deleting the workout log from the exerciseLogs state so that it makes the page refresh and update view
                        setExerciseLogs((oldExerciseLogs) => {
                          return oldExerciseLogs.filter((logItem) => {
                            return logItem._id != log._id;
                          });
                          // finally, sending a post request to get rid of that log from the server as well
                        });
                        api.post("/user/remove-workout-log", {
                          userLogId: log._id,
                        });
                      }}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={22}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No exercise logs found</Text>
            <Text style={styles.emptyStateSubtext}>
              Your exercise history for this movement will appear here once you
              start logging workouts
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 16,
  },

  tableHeaderContainer: {
    backgroundColor: "#F8F9FA",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE2E6",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    backgroundColor: "#F8F9FA",
  },
  headerText: {
    fontWeight: "600",
    fontSize: 13,
    color: "#6C757D",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateHeader: {
    width: "40%",
    paddingLeft: 16,
  },
  weightHeader: {
    flex: 2,
    textAlign: "center",
  },
  repsHeader: {
    flex: 2,
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateHeaderRow: {
    backgroundColor: "#E9ECEF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE2E6",
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  logRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  evenRow: {
    backgroundColor: "#FFFFFF",
  },
  oddRow: {
    backgroundColor: "#F8F9FA",
  },
  lastRowInGroup: {
    borderBottomWidth: 0,
  },
  exerciseNameText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#212529",
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  weightText: {
    flex: 2,
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
  },
  repsText: {
    flex: 2,
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#ADB5BD",
    textAlign: "center",
  },
  exerciseHeader: {
    flex: 3,
    textAlign: "left",
  },
  exerciseText: {
    flex: 3,
    fontSize: 15,
    fontWeight: "500",
    color: "#212529",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#212529",
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  editModeText: {
    // Slightly shrink text when in edit mode to make room for delete button
    fontSize: 13,
  },
  deleteButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteHeader: {
    flex: 1,
    textAlign: "center",
  },
});
