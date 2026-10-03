import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";

interface Message {
  messageSender: "user" | "bot";
  messageContent: string;
  messageDate: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages = [],
  isLoading = false,
}) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardWillShow",
      () => {
        setKeyboardVisible(true);
        // Scroll after a small delay to ensure view has updated
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardWillHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    // Clean up listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Auto-scroll to bottom whenever messages change or keyboard status changes

  // Ensure all date objects are proper Date instances
  const processedMessages = messages.map((msg) => ({
    ...msg,
    messageDate:
      msg.messageDate instanceof Date
        ? msg.messageDate
        : new Date(msg.messageDate),
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [processedMessages, keyboardVisible]);

  const scrollViewRef = useRef<ScrollView>(null);
  const { height } = Dimensions.get("window");

  // Helper function to format date
  const formatMessageDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "Unknown date";
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
      return "Today";
    } else if (isSameDay(date, yesterday)) {
      return "Yesterday";
    } else {
      // Format date as "Mar 15, 2025"
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Function to format time
  const formatMessageTime = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper function to check if two dates are the same day with error handling
  const isSameDay = (date1: Date, date2: Date) => {
    if (
      !date1 ||
      !date2 ||
      !(date1 instanceof Date) ||
      !(date2 instanceof Date)
    ) {
      return false;
    }

    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  // Check if we have messages to display
  const hasMessages = processedMessages && processedMessages.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.containerWrapper, { height: height * 0.7 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          !hasMessages && styles.emptyContentContainer,
          // Add extra padding when keyboard is visible
          keyboardVisible && { paddingBottom: 80 },
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }}
        onLayout={() => {
          // Also scroll when layout changes (important for keyboard appearance)
          if (keyboardVisible) {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }
        }}
      >
        {!hasMessages ? (
          <Text style={styles.emptyText}>No messages yet</Text>
        ) : (
          <>
            {processedMessages.map((item, index) => {
              const isUser = item.messageSender === "user";
              const isFirstInGroup =
                index === 0 ||
                processedMessages[index - 1].messageSender !==
                  item.messageSender;
              const isLastInGroup =
                index === processedMessages.length - 1 ||
                processedMessages[index + 1].messageSender !==
                  item.messageSender;

              // Check if we need to display date header
              const showDateHeader =
                index === 0 ||
                !isSameDay(
                  processedMessages[index - 1].messageDate,
                  item.messageDate
                );

              return (
                <React.Fragment key={index}>
                  {showDateHeader && (
                    <View style={styles.dateHeaderContainer}>
                      <Text style={styles.dateHeaderText}>
                        {formatMessageDate(item.messageDate)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageContainer,
                      isUser
                        ? styles.userMessageContainer
                        : styles.botMessageContainer,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.botBubble,
                        isFirstInGroup &&
                          (isUser
                            ? styles.userFirstBubble
                            : styles.botFirstBubble),
                        isLastInGroup &&
                          (isUser
                            ? styles.userLastBubble
                            : styles.botLastBubble),
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isUser
                            ? styles.userMessageText
                            : styles.botMessageText,
                        ]}
                      >
                        {item.messageContent}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isUser ? styles.userTimeText : styles.botTimeText,
                        ]}
                      >
                        {formatMessageTime(item.messageDate)}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Adding extra space at the bottom for better UX */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    backgroundColor: "#f5f5f5",
    // Explicitly set dimensions to ensure it takes up space
    minHeight: 300,
  },
  container: {
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 10,
    // Don't use flex: 1 here - can prevent scrolling on smaller content
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    minHeight: 300,
  },
  messageContainer: {
    marginVertical: 2,
    flexDirection: "row",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  botMessageContainer: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    position: "relative",
  },
  userBubble: {
    backgroundColor: "#0084ff",
    borderTopRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#e9e9eb",
    borderTopLeftRadius: 4,
  },
  userFirstBubble: {
    borderTopRightRadius: 18,
  },
  userLastBubble: {
    borderBottomRightRadius: 18,
  },
  botFirstBubble: {
    borderTopLeftRadius: 18,
  },
  botLastBubble: {
    borderBottomLeftRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "white",
  },
  botMessageText: {
    color: "#000000",
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  botTimeText: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    color: "#8e8e93",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
});

export default ChatMessages;
