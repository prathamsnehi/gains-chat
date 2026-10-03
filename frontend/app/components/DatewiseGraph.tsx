// SPECIALIZED COMPONENT FOR GAINSCHAT

import { Text, View, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useEffect, useState } from "react";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";

const EARLIEST_YEAR = 2024;
const LATEST_YEAR = new Date().getFullYear();

interface LiftEntry {
  date: Date;
  exerciseWeight: number;
  exerciseReps: number;
  workoutId: string;
  _id?: string;
  userId?: string;
  exercise?: {
    exerciseId: string;
    exerciseName: string;
  };
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DatewiseGraph({ exerciseId }) {
  useEffect(() => {
    // this useEffect first fetches the userId, then feeds that into a post request to get relevant user lift data
    SecureStore.getItemAsync("userData")
      .then((result) => {
        if (result != null) {
          const parsedUserData = JSON.parse(result);
          if (parsedUserData) {
            return parsedUserData.userId;
          }
        } else {
          console.log("error retrieving key from secure storage");
        }
      })
      .then((resultUserId) => {
        // fetching the particular lift data from the userLogs database:
        api
          .post(`/user/get-exercise-logs/${exerciseId}`, {
            userId: resultUserId,
          })
          .then((result) => {
            // adding date property to each of the entry items:
            setLiftData(
              result.data.map((logItem) => {
                return {
                  ...logItem,
                  //date: new Date(logItem.createdAt), // add a date property to the lift data based on the workoutId (in form of that day's date)
                  date: new Date(logItem.date),
                };
              })
            );
          })
          .catch((err) => {
            console.log(err);
          });
      });
  }, []);

  const [liftData, setLiftData] = useState<LiftEntry[]>([]);

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 16;
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const getMonthData = () => {
    return liftData.filter((entry) => {
      return (
        entry.date.getMonth() === currentMonth &&
        entry.date.getFullYear() === currentYear
      );
    });
  };

  const formatChartData = () => {
    const monthEntries = getMonthData().sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    if (monthEntries.length === 0) {
      return {
        labels: ["No entries"],
        datasets: [
          {
            data: [0],
            color: (opacity = 1) => `rgba(200, 200, 200, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      };
    }

    return {
      labels: monthEntries.map(
        (entry) =>
          (entry.date.getMonth() + 1).toString() +
          "/" +
          entry.date.getDate().toString()
      ),
      datasets: [
        {
          data: monthEntries.map((entry) => {
            // Using Epley's 1 RM Calculation Standards for finding 1 Rep Maxes for Rep Progression
            const dataOneRM =
              entry.exerciseWeight * (1 + 0.0333 * entry.exerciseReps);
            return dataOneRM;
          }),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const handlePreviousMonth = () => {
    if (currentYear === EARLIEST_YEAR && currentMonth === 0) {
      return;
    }

    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentYear === LATEST_YEAR && currentMonth === 11) {
      return;
    }

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getMonthButtonStyle = (isDisabled: boolean) => ({
    ...styles.monthButton,
    opacity: isDisabled ? 0.5 : 1,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Progress - {monthNames[currentMonth]} {currentYear}
        </Text>
        <View style={styles.monthSelector}>
          <Text
            style={getMonthButtonStyle(
              currentYear === EARLIEST_YEAR && currentMonth === 0
            )}
            onPress={handlePreviousMonth}
          >
            ←
          </Text>
          <Text
            style={getMonthButtonStyle(
              currentYear === LATEST_YEAR && currentMonth === 11
            )}
            onPress={handleNextMonth}
          >
            →
          </Text>
        </View>
      </View>
      {getMonthData().length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No entries for this month</Text>
        </View>
      ) : (
        <LineChart
          data={formatChartData()}
          width={chartWidth}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" lbs"
          // xAxisLabel={`th`}
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#0066FF",
            },
            propsForLabels: {
              fontSize: 12,
            },
          }}
          bezier
          style={styles.chart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  monthSelector: {
    flexDirection: "row",
    gap: 16,
  },
  monthButton: {
    fontSize: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  noDataContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
  },
});
