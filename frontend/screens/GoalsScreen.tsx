import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Exercise, makeId } from "../services/bridge";
import { estimateOneRepMax, personalRecords } from "../services/insights";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

export default function GoalsScreen() {
  const c = usePalette();
  const { goals, lifts, exercises, bridge } = useGains();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | undefined>();
  const [target, setTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState<"lb" | "kg">("lb");
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
    }, [bridge]),
  );
  const records = personalRecords(lifts);
  async function save() {
    if (!selected || !Number.isFinite(Number(target)) || Number(target) <= 0) {
      setError("Choose an exercise and enter a target.");
      return;
    }
    const old = goals.find((g) => g.exerciseId === selected.id);
    await bridge.saveGoal({
      id: old?.id ?? makeId("goal"),
      exerciseId: selected.id,
      targetOneRepMax: Number(target),
      unit: goalUnit,
    });
    setOpen(false);
    setSelected(undefined);
    setQuery("");
    setTarget("");
    setError("");
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text
          style={{
            color: c.muted,
            fontWeight: "700",
            letterSpacing: 1.5,
            marginTop: 8,
          }}
        >
          A LITTLE FURTHER
        </Text>
        <Text
          style={{
            color: c.text,
            fontSize: 34,
            fontWeight: "800",
            marginTop: 7,
          }}
        >
          Goals
        </Text>
        <Text style={{ color: c.muted, marginTop: 6, lineHeight: 21 }}>
          A target when you want one. Your daily log comes first.
        </Text>
        <Pressable
          onPress={() => setOpen(true)}
          style={{
            backgroundColor: c.accent,
            borderRadius: 14,
            padding: 15,
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <Text
            style={{ color: c.accentText, fontWeight: "700", fontSize: 16 }}
          >
            Set a strength goal
          </Text>
        </Pressable>
        {goals.length === 0 ? (
          <Text style={{ color: c.muted, marginTop: 25 }}>
            No goals yet. Add a target estimated one rep max for any exercise.
          </Text>
        ) : (
          goals.map((goal) => {
            const record = records.get(goal.exerciseId)?.maxEstimated;
            const current = record
              ? estimateOneRepMax(record, goal.unit ?? "lb")
              : 0;
            const progress = Math.max(
              0,
              Math.min(1, current / goal.targetOneRepMax),
            );
            const exercise = exercises.find((e) => e.id === goal.exerciseId);
            return (
              <View
                key={goal.id}
                style={{
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 17,
                  padding: 17,
                  marginTop: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: c.text,
                      fontSize: 17,
                      fontWeight: "700",
                      flex: 1,
                    }}
                  >
                    {exercise?.name ?? record?.exerciseName ?? "Exercise"}
                  </Text>
                  <Pressable onPress={() => void bridge.deleteGoal(goal.id)}>
                    <Text style={{ color: c.danger }}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={{ color: c.muted, marginTop: 8 }}>
                  {current ? `${Math.round(current)} / ` : "— / "}
                  {goal.targetOneRepMax} {goal.unit ?? "lb"} estimated 1RM
                </Text>
                <View
                  style={{
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: c.elevated,
                    marginTop: 15,
                  }}
                >
                  <View
                    style={{
                      height: 7,
                      width: `${progress * 100}%`,
                      borderRadius: 4,
                      backgroundColor: c.accent,
                    }}
                  />
                </View>
                <Text style={{ color: c.muted, fontSize: 12, marginTop: 7 }}>
                  {current
                    ? `${Math.round(progress * 100)}% of goal`
                    : "Log a set to see progress"}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background, padding: 20 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: c.text, fontSize: 25, fontWeight: "700" }}>
              Strength goal
            </Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={{ color: c.accent, fontSize: 16 }}>Done</Text>
            </Pressable>
          </View>
          <Text style={{ color: c.muted, marginTop: 25, marginBottom: 8 }}>
            EXERCISE
          </Text>
          <TextInput
            placeholder="Search exercise"
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setSelected(undefined);
            }}
            style={{
              backgroundColor: c.elevated,
              borderRadius: 12,
              padding: 13,
              color: c.text,
              fontSize: 16,
            }}
          />
          {!selected &&
            exercises
              .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setSelected(e);
                    setQuery(e.name);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <Text style={{ color: c.text }}>{e.name}</Text>
                </Pressable>
              ))}
          <Text style={{ color: c.muted, marginTop: 22, marginBottom: 8 }}>
            TARGET ESTIMATED ONE REP MAX
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            {(["lb", "kg"] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setGoalUnit(unit)}
                style={{
                  backgroundColor: goalUnit === unit ? c.accent : c.elevated,
                  borderRadius: 10,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    color: goalUnit === unit ? c.accentText : c.text,
                    fontWeight: "700",
                  }}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            keyboardType="decimal-pad"
            value={target}
            onChangeText={setTarget}
            placeholder="e.g. 315"
            placeholderTextColor={c.muted}
            style={{
              backgroundColor: c.elevated,
              borderRadius: 12,
              padding: 13,
              color: c.text,
              fontSize: 16,
            }}
          />
          {!!error && (
            <Text style={{ color: c.danger, marginTop: 12 }}>{error}</Text>
          )}
          <Pressable
            onPress={save}
            style={{
              backgroundColor: c.accent,
              borderRadius: 14,
              padding: 15,
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ color: c.accentText, fontWeight: "700" }}>
              Save goal
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
