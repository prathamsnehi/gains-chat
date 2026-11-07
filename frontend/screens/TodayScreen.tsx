import React, { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useFocusEffect } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from "react-native";
import { LiftEditor } from "../components/LiftEditor";
import { Lift } from "../services/bridge";
import { formatDate, formatLift, likelyToday } from "../services/insights";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function TodayScreen() {
  const c = usePalette();
  const { lifts, exercises, messages, pending, bridge } = useGains();
  const [text, setText] = useState("");
  const [editor, setEditor] = useState<{
    lift?: Lift;
    exerciseId?: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const seenMessages = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
      void bridge.processPending();
    }, [bridge]),
  );
  useEffect(() => {
    if (seenMessages.current !== null && messages.length > seenMessages.current)
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    seenMessages.current = messages.length;
  }, [messages.length]);
  const suggestions = likelyToday(lifts, exercises);
  const latest = [...lifts]
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .slice(0, 5);
  const recentMessages = [...messages]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-20);
  async function send() {
    if (!text.trim() || sending) return;
    const value = text;
    setText("");
    setSending(true);
    try {
      await bridge.send(value);
    } catch {
      setText(value);
    } finally {
      setSending(false);
    }
  }
  const card = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: c.muted,
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 1.5,
            marginTop: 8,
          }}
        >
          GAINS CHAT ·{" "}
          {new Date()
            .toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })
            .toUpperCase()}
        </Text>
        <Text
          style={{
            color: c.text,
            fontSize: 34,
            fontWeight: "800",
            letterSpacing: -1,
            marginTop: 8,
          }}
        >
          What did you lift?
        </Text>
        <Text
          style={{ color: c.muted, fontSize: 16, marginTop: 7, lineHeight: 22 }}
        >
          Type a set the way you say it. Your last lift is always close by.
        </Text>
        {suggestions.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <Text
              style={{
                color: c.text,
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Likely today
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
            >
              {suggestions.map(({ exercise, last }) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => setEditor({ exerciseId: exercise.id })}
                  style={[card, { width: 190, minHeight: 112 }]}
                  accessibilityLabel={`Log ${exercise.name}; last was ${formatLift(last)}`}
                >
                  <Text
                    style={{ color: c.text, fontWeight: "700", fontSize: 16 }}
                    numberOfLines={2}
                  >
                    {exercise.name}
                  </Text>
                  <Text style={{ color: c.muted, marginTop: 10, fontSize: 13 }}>
                    LAST SET
                  </Text>
                  <Text
                    style={{
                      color: c.accent,
                      fontWeight: "700",
                      fontSize: 17,
                      marginTop: 3,
                    }}
                  >
                    {formatLift(last)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <View
          style={{
            marginTop: 30,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>
            Recent lifts
          </Text>
          <Pressable
            onPress={() => setEditor({})}
            accessibilityLabel="Manually log a lift"
          >
            <Ionicons name="add-circle" size={30} color={c.accent} />
          </Pressable>
        </View>
        {latest.length === 0 ? (
          <View style={[card, { marginTop: 12 }]}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "600" }}>
              Start with your first set
            </Text>
            <Text style={{ color: c.muted, marginTop: 6, lineHeight: 20 }}>
              Try “bench 225 for 5” or tap + to enter it manually.
            </Text>
          </View>
        ) : (
          latest.map((lift) => (
            <Pressable
              key={lift.id}
              onPress={() => setEditor({ lift })}
              style={[
                card,
                { marginTop: 10, flexDirection: "row", alignItems: "center" },
              ]}
              accessibilityLabel={`Edit ${lift.exerciseName} ${formatLift(lift)}`}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: c.text, fontSize: 16, fontWeight: "700" }}
                >
                  {lift.exerciseName}
                </Text>
                <Text style={{ color: c.muted, marginTop: 4, fontSize: 13 }}>
                  {formatDate(lift.performedAt)}
                </Text>
              </View>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>
                {formatLift(lift)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={c.muted}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          ))
        )}
        <View
          style={{
            marginTop: 30,
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={19}
            color={c.accent}
          />
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>
            Chat
          </Text>
          {pending.length > 0 && (
            <Text style={{ color: c.muted, fontSize: 12 }}>
              · {pending.length} pending
            </Text>
          )}
        </View>
        {recentMessages.length === 0 && (
          <Text style={{ color: c.muted, marginTop: 12, lineHeight: 21 }}>
            Log a lift, ask about your history, or just talk training.
          </Text>
        )}
        {recentMessages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              marginTop: 12,
              backgroundColor:
                message.role === "user" ? c.userBubble : c.assistantBubble,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 18,
              paddingVertical: 11,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
              {message.text}
            </Text>
            {message.status === "pending" && (
              <Text style={{ color: c.muted, fontSize: 11, marginTop: 6 }}>
                {pending.find((item) => item.id === message.id)?.lastError ??
                  (pending.find((item) => item.id === message.id)?.status ===
                  "processing"
                    ? "Processing…"
                    : "Pending · tap retry below")}
              </Text>
            )}
            {message.options?.length ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 7,
                  marginTop: 10,
                }}
              >
                {message.options.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() =>
                      void bridge.chooseClarification(message.id, option.id)
                    }
                    style={{
                      backgroundColor: c.elevated,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                    }}
                  >
                    <Text
                      style={{ color: c.text, fontSize: 13, fontWeight: "600" }}
                    >
                      {option.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {pending.length > 0 && (
          <Pressable
            onPress={() => void bridge.processPending()}
            style={{
              alignSelf: "flex-start",
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: c.elevated,
            }}
          >
            <Text style={{ color: c.text, fontWeight: "600" }}>
              Retry pending messages
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 12 : 8,
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.background,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Bench 225 for 5…"
          maxLength={500}
          placeholderTextColor={c.muted}
          multiline
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 110,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 10,
            color: c.text,
            fontSize: 16,
          }}
          accessibilityLabel="Message or log a lift"
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: text.trim() ? c.accent : c.elevated,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Send"
        >
          <Ionicons
            name="arrow-up"
            color={text.trim() ? c.accentText : c.muted}
            size={22}
          />
        </Pressable>
      </View>
      <LiftEditor
        visible={!!editor}
        onClose={() => setEditor(null)}
        lift={editor?.lift}
        originalMessage={
          messages.find((message) => message.id === editor?.lift?.requestId)
            ?.text
        }
        exercise={exercises.find((e) => e.id === editor?.exerciseId)}
        exercises={exercises}
      />
    </KeyboardAvoidingView>
  );
}
