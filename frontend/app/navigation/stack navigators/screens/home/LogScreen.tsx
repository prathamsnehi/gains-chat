// Dependencies:
import { View, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import api from "@/app/utils/api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// Components:
import LogChatTextBox from "@/app/components/log chat/LogChatTextBox";
import ChatMessages from "@/app/components/log chat/ChatMessages";

// Interfaces:
interface Message {
  messageSender: string;
  messageContent: string;
  messageDate: Date;
}

export default function LogScreen() {
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    // fetching the userId and storing it in the state variable
    SecureStore.getItemAsync("userData").then((result) => {
      if (result != null) {
        const parsedUserData = JSON.parse(result);
        if (parsedUserData) {
          setUserId(parsedUserData.userId);
        }
      } else {
        console.log("error retrieving key from secure storage");
      }
    });
  }, []);

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  useEffect(() => {
    // Initial fetching of the old user chat messages that are saved in the system, does not deal with
    // adding of new messages to the async storage (that is handled on the go when new messages are typed)

    // this useEffect fetches the user messages saved in the Async storage, and feeds them into the state variable
    AsyncStorage.getItem("logMessages")
      .then((logMessages) => {
        if (logMessages == undefined) {
          // add a blank value to the async storage if the key does not yet exist
          AsyncStorage.setItem(
            "logMessages",
            JSON.stringify([
              {
                messageSender: "bot",
                messageContent:
                  "🔥 Welcome to Workout Logger! Let’s track your gains 💪. Just tell me what exercise you did, how many reps, and the weight. I'll log it and help you track progress over time! 📊",
                messageDate: new Date(),
              },
              {
                messageSender: "bot",
                messageContent:
                  "🚀 Once you’ve logged some workouts, tap the 📈 Graphs tab (bottom middle) to see your progress visually!",
                messageDate: new Date(),
              },
              {
                messageSender: "bot",
                messageContent:
                  "🏆 Explore features like viewing logs, setting 1-rep max goals, and tracking progress. I’ve got your back—text me, and let’s smash those PRs! 🔥",
                messageDate: new Date(),
              },
            ])
          ) // initialize a new message chain

            .then()
            .catch((err) => console.log(err));
        }
        if (logMessages != null) {
          setChatMessages(JSON.parse(logMessages));
        }
      })
      .catch((err) => console.log(err));
  }, []);

  const handleNewMessages = function (newMessage: string, sender = "user") {
    // setting the display to add that message instantly to the user's view
    setChatMessages((oldChatMessageArray) => {
      return [
        ...oldChatMessageArray,
        {
          messageSender: sender,
          messageContent: newMessage,
          messageDate: new Date(),
        },
      ];
    });

    // updating the async storage with the new message as well
    AsyncStorage.getItem("logMessages").then((logMessages) => {
      if (logMessages) {
        const oldMessagesArray = JSON.parse(logMessages);
        const newMessagesArray = [
          ...oldMessagesArray,
          {
            messageSender: sender,
            messageContent: newMessage,
            messageDate: new Date(),
          },
        ];
        AsyncStorage.setItem("logMessages", JSON.stringify(newMessagesArray));
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
        }}
      >
        <ChatMessages messages={chatMessages as any} />
      </View>
      <View
        style={{
          width: "100%",
          marginTop: "auto", // Force to bottom of container
        }}
      >
        <LogChatTextBox
          // only performs the enter functinality once the userId has been fetched
          // from encrypted storage
          onTextSubmit={
            userId
              ? (message) => {
                  Keyboard.dismiss();
                  handleNewMessages(message);
                  const aiOldChatMessagePayload = chatMessages.slice(-20); // doesn't crash if the payload array size is less than 20

                  api
                    .post("/user/log-workout", {
                      logMessage: message,
                      userId: userId,
                      oldChatHistory: aiOldChatMessagePayload,
                      // sending the last 20 messages in the chat history to the bot to
                      // get better context
                      localDate: new Date().toString(),
                    })
                    .then((result) => {
                      handleNewMessages(result.data.botMessage, "bot");
                    });
                }
              : undefined
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
