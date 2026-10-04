import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { bridge, Exercise, Lift, makeId } from "../services/bridge";
import { usePalette } from "../theme/palette";

function localDay(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function numbersFrom(text?: string) {
  if (!text) return { weight: "", reps: "", unit: "lb" as const };
  const values = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
  const rep = text.match(/(\d+(?:\.\d+)?)\s*(?:reps?|r)\b/i)?.[1];
  const weighted = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|s)\b/i);
  return {
    weight: weighted?.[1] ?? values.find((value) => value !== rep) ?? "",
    reps: rep ?? values.find((value) => value !== weighted?.[1]) ?? "",
    unit:
      weighted?.[2]?.toLowerCase() === "kg" ? ("kg" as const) : ("lb" as const),
  };
}

function shorthandFrom(text?: string) {
  return (text ?? "")
    .replace(/\d+(?:\.\d+)?\s*(?:lbs?|kg|reps?|r|s)\b/gi, " ")
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/\b(for|at|sets?|x)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function LiftEditor({
  visible,
  onClose,
  exercise,
  lift,
  exercises,
  draftText,
  originalMessage,
}: {
  visible: boolean;
  onClose: () => void;
  exercise?: Exercise;
  lift?: Lift;
  exercises: Exercise[];
  draftText?: string;
  originalMessage?: string;
}) {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | undefined>();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [alias, setAlias] = useState("");
  useEffect(() => {
    setSelected(
      exercise ??
        (lift ? exercises.find((e) => e.id === lift.exerciseId) : undefined),
    );
    setQuery(exercise?.name ?? lift?.exerciseName ?? "");
    const draft = numbersFrom(draftText);
    setWeight(lift ? String(lift.weight) : draft.weight);
    setReps(lift ? String(lift.reps) : draft.reps);
    setUnit(lift?.unit ?? draft.unit);
    setAlias(shorthandFrom(originalMessage));
    setDate(localDay(lift?.performedAt ?? new Date().toISOString()));
    setError("");
  }, [visible, exercise, lift, exercises, draftText, originalMessage]);
  const input = {
    backgroundColor: c.elevated,
    color: c.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  };
  const filtered = exercises
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);
  async function save() {
    try {
      const found =
        selected ??
        exercises.find(
          (e) => e.name.toLowerCase() === query.trim().toLowerCase(),
        );
      if (!found) {
        setError("Choose an exercise or create it in Exercises.");
        return;
      }
      const chosenDate = new Date(`${date}T12:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          Number.isNaN(chosenDate.getTime()) ||
          localDay(chosenDate.toISOString()) !== date) {
        setError("Enter a valid date in YYYY-MM-DD format.");
        return;
      }
      const performedAt =
        lift && date === localDay(lift.performedAt)
          ? lift.performedAt
          : chosenDate.toISOString();
      const changedExercise = !!lift && lift.exerciseId !== found.id;
      await bridge.saveLift({
        id: lift?.id ?? makeId("lift"),
        exerciseId: found.id,
        exerciseName: found.name,
        weight: Number(weight),
        reps: Number(reps),
        unit,
        performedAt,
        createdAt: lift?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requestId: lift?.requestId,
      });
      if (
        changedExercise &&
        alias.trim() &&
        alias.trim().toLowerCase() !== found.name.toLowerCase()
      ) {
        const conflict = exercises.some(
          (e) =>
            e.id !== found.id &&
            [e.name, ...(e.aliases ?? [])].some(
              (value) => value.toLowerCase() === alias.trim().toLowerCase(),
            ),
        );
        if (conflict) {
          setError(
            "Lift saved. This shorthand already belongs to another exercise.",
          );
          return;
        }
        await bridge.addAlias(found.id, alias.trim());
      }
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Could not save the lift.");
    }
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background, padding: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "700", color: c.text }}>
            {lift ? "Edit lift" : "Log a lift"}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: c.accent, fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.muted, marginBottom: 8 }}>EXERCISE</Text>
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setSelected(undefined);
            }}
            style={input}
            placeholder="Search exercise"
            placeholderTextColor={c.muted}
          />
          {!selected &&
            filtered.map((e) => (
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
                <Text style={{ color: c.text, fontSize: 15 }}>{e.name}</Text>
              </Pressable>
            ))}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.muted, marginBottom: 8 }}>WEIGHT</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                style={input}
                placeholder="225"
                placeholderTextColor={c.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.muted, marginBottom: 8 }}>REPS</Text>
              <TextInput
                value={reps}
                onChangeText={setReps}
                keyboardType="decimal-pad"
                style={input}
                placeholder="5"
                placeholderTextColor={c.muted}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {(["lb", "kg"] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setUnit(v)}
                style={{
                  backgroundColor: unit === v ? c.accent : c.elevated,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: unit === v ? c.accentText : c.text,
                    fontWeight: "700",
                  }}
                >
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: c.muted, marginTop: 20, marginBottom: 8 }}>
            DATE · YYYY-MM-DD
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            style={input}
            placeholder="2026-10-03"
            placeholderTextColor={c.muted}
          />
          {!!lift && !!selected && selected.id !== lift.exerciseId && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: c.muted, marginBottom: 8 }}>
                LEARN YOUR SHORTHAND
              </Text>
              <Text style={{ color: c.muted, marginBottom: 10 }}>
                You changed the exercise. Edit this phrase to teach Gains Chat
                what you meant.
              </Text>
              <TextInput
                value={alias}
                onChangeText={setAlias}
                style={input}
                placeholder="Optional shorthand"
                placeholderTextColor={c.muted}
                maxLength={60}
              />
            </View>
          )}
          {!!error && (
            <Text style={{ color: c.danger, marginTop: 16 }}>{error}</Text>
          )}
          <Pressable
            onPress={save}
            style={{
              backgroundColor: c.accent,
              borderRadius: 15,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text
              style={{ color: c.accentText, fontSize: 16, fontWeight: "700" }}
            >
              Save lift
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
