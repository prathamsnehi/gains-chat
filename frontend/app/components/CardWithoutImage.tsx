import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

type CardProps = {
  title: string;
  description?: string;
  backgroundColor?: string;
  mode?: "light" | "dark";
  textColor?: string;
  borderRadius?: number;
  padding?: number;
  callback?: any;
  children?: any;
};

const CardWithoutImage: React.FC<CardProps> = ({
  title,
  description,
  backgroundColor,
  mode = "dark", // 'light' or 'dark'
  textColor = "#ffffff",
  borderRadius = 16,
  padding = 16,
  callback,
  children,
}) => {
  const defaultBackground =
    backgroundColor || (mode === "dark" ? "#1A1A1A" : "#f0f0f0");
  const defaultTextColor = mode === "dark" ? "#ffffff" : "#000000";

  const hasChildren = React.Children.count(children) > 0;
  // we use this property to determine how we want to style the height of our CardWithoutImage component

  return (
    <TouchableOpacity
      onPress={() => {
        if (callback) {
          callback();
        }
      }}
      activeOpacity={callback ? 0.8 : 1}
      style={[
        styles.card,
        {
          backgroundColor: defaultBackground,
          borderRadius,
          padding,
          height: hasChildren ? "auto" : 90,
        },
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{title[0].toUpperCase()}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: textColor || defaultTextColor }]}
          >
            {title}
          </Text>
          {description && description.trim().length > 0 ? (
            <Text
              style={[
                styles.description,
                { color: textColor || defaultTextColor },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {hasChildren && <View style={styles.childrenContainer}>{children}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    margin: 10,
    width: "90%", // Takes up 90% of parent width
    alignSelf: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF", // Constant grey color
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  textContainer: {
    flex: 1,
  },
  childrenContainer: {
    width: "100%",
    paddingTop: 8, // Space between header and children
    // borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)", // Light separator line
  },
});

export default CardWithoutImage;

// Some Example Usages of this Card Component:
{
  /* <CustomCard
imageSource={{ uri: "https://via.placeholder.com/300" }}
title="Welcome to React Native"
description="This is a sample card showcasing a minimal design."
mode="light"
textColor="#FF9500"
/>

<CustomCard
imageSource={{ uri: "https://via.placeholder.com/300" }}
title="Dark Mode Design"
description="Experience the sleek and modern UI with our new dark theme."
backgroundColor="#252525"
textColor="#FFA500"
/>

<CustomCard
imageSource={{ uri: "https://via.placeholder.com/300" }}
title="Customizable Card"
description="Play with props like colors, padding, and text styles."
backgroundColor="#292929"
textColor="#F0F0F0"
borderRadius={20}
padding={20}
/>

<CustomCard
imageSource={{ uri: "https://via.placeholder.com/300" }}
title="Elegant Design"
description="Inspired by minimalist design with a touch of elegance."
backgroundColor="#1A1A1A"
textColor="#FF6347"
// note that dark mode coupled with the above ff6347 theme looks the best
/> */
}
