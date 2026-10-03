import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_CONTAINER_WIDTH = 800; // Maximum width for the container

type CardGridProps = {
  children: React.ReactNode;
};

const CardGrid: React.FC<CardGridProps> = ({ children }) => {
  const validChildren = React.Children.toArray(children).slice(0, 2);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.gridContainer}>{validChildren}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    alignItems: "center", // Center the inner container
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "center", // Changed from space-between to center
    alignItems: "center",
    width: "100%",
    maxWidth: MAX_CONTAINER_WIDTH, // Limit maximum width
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 16, // Add consistent spacing between items
  },
});

export default CardGrid;
