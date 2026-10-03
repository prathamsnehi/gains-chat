import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TypewriterText({
  textContent,
  typingSpeed = 0.5,
  heading = false,
  title = "",
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const textComplete = useRef(false);

  // Get layout dimensions with onLayout
  const onTextLayout = (event) => {
    if (!textComplete.current) {
      setTextHeight(event.nativeEvent.layout.height);
    }
  };

  // Convert typingSpeed (0-1) to milliseconds
  const speed = 150 - typingSpeed * 150;

  useEffect(() => {
    if (currentIndex < textContent.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + textContent[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      textComplete.current = true;
    }
  }, [currentIndex, textContent, speed]);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={{ height: textHeight, width: "100%" }}>
        <Text style={[styles.description, heading && styles.headingText]}>
          {displayedText}
        </Text>

        {/* Invisible text to measure */}
        <Text
          style={[
            styles.description,
            heading && styles.headingText,
            styles.hiddenText,
          ]}
          onLayout={onTextLayout}
        >
          {textContent}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333333",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#1a1a1a",
    textAlign: "center",
    width: "100%",
  },
  headingText: {
    fontSize: 24,
    fontWeight: "600",
  },
  hiddenText: {
    position: "absolute",
    opacity: 0,
  },
});
