import React, { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LiftEditor } from "../components/LiftEditor";
import { Exercise, Lift, makeId } from "../services/bridge";
import { formatDate, formatLift, recentByExercise } from "../services/insights";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

function ExerciseManager({
  visible,
  onClose,
  exercises,
}: {
  visible: boolean;
  onClose: () => void;
  exercises: Exercise[];
}) {
  const c = usePalette();
  const { bridge } = useGains();
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [selected, setSelected] = useState<Exercise | undefined>();
  const [error, setError] = useState("");
  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) {
      setError("Keep exercise names under 100 characters.");
      return;
    }
    if (exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("This exercise already exists.");
      return;
    }
    await bridge.saveExercise({
      id: makeId("exercise"),
      name: trimmed,
      isCustom: true,
      aliases: [],
    });
    setName("");
    setError("Exercise added.");
  }
  async function saveAlias() {
    if (!selected || !alias.trim()) return;
    await bridge.addAlias(selected.id, alias.trim());
    setAlias("");
    setError(`“${alias.trim()}” will now mean ${selected.name}.`);
  }
  const input = {
    backgroundColor: c.elevated,
    color: c.text,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: c.text, fontSize: 25, fontWeight: "700" }}>
            Exercises
          </Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: c.accent, fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.muted, marginTop: 28, marginBottom: 8 }}>
            CREATE EXERCISE
          </Text>
          <TextInput
            placeholder="Exercise name"
            placeholderTextColor={c.muted}
            value={name}
            onChangeText={setName}
            style={input}
          />
          <Pressable
            onPress={create}
            style={{
              backgroundColor: c.accent,
              borderRadius: 12,
              padding: 13,
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Text style={{ color: c.accentText, fontWeight: "700" }}>
              Add exercise
            </Text>
          </Pressable>
          <Text style={{ color: c.muted, marginTop: 28, marginBottom: 8 }}>
            TEACH A NAME YOU USE
          </Text>
          <Text style={{ color: c.muted, marginBottom: 10 }}>
            Choose the exercise, then add your shorthand. Corrections will use
            this alias next time.
          </Text>
          <TextInput
            placeholder="Search exercise"
            placeholderTextColor={c.muted}
            value={selected?.name ?? name}
            onChangeText={(v) => {
              setSelected(undefined);
              setName(v);
            }}
            style={input}
          />
          {!selected &&
            exercises
              .filter((e) => e.name.toLowerCase().includes(name.toLowerCase()))
              .slice(0, 7)
              .map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setSelected(e);
                    setName(e.name);
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
          <TextInput
            placeholder="e.g. incline db bp"
            placeholderTextColor={c.muted}
            value={alias}
            onChangeText={setAlias}
            style={[input, { marginTop: 12 }]}
          />
          <Pressable
            onPress={saveAlias}
            style={{
              backgroundColor: c.accent,
              borderRadius: 12,
              padding: 13,
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Text style={{ color: c.accentText, fontWeight: "700" }}>
              Save alias
            </Text>
          </Pressable>
          {!!error && (
            <Text style={{ color: c.muted, marginTop: 14 }}>{error}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function HistoryScreen() {
  const c = usePalette();
  const { lifts, exercises, bridge } = useGains();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Lift | undefined>();
  const [editorVisible, setEditorVisible] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);
  const [deleted, setDeleted] = useState<Lift | undefined>();
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
    }, [bridge]),
  );
  const filtered = useMemo(
    () =>
      [...lifts]
        .filter((l) =>
          l.exerciseName.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
    [lifts, query],
  );
  const exerciseCount = recentByExercise(lifts).size;
  function remove(lift: Lift) {
    Alert.alert(
      "Delete this set?",
      `${lift.exerciseName} · ${formatLift(lift)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void bridge.deleteLift(lift.id).then(() => setDeleted(lift));
          },
        },
      ],
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: c.muted,
            fontWeight: "700",
            letterSpacing: 1.5,
            marginTop: 8,
          }}
        >
          YOUR TRAINING
        </Text>
        <Text
          style={{
            color: c.text,
            fontSize: 34,
            fontWeight: "800",
            marginTop: 7,
          }}
        >
          History
        </Text>
        <Text style={{ color: c.muted, marginTop: 6 }}>
          {lifts.length} sets · {exerciseCount} exercises
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.surface,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 12,
            }}
          >
            <Ionicons name="search" size={18} color={c.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Find an exercise"
              placeholderTextColor={c.muted}
              style={{
                flex: 1,
                color: c.text,
                paddingVertical: 13,
                fontSize: 16,
              }}
            />
          </View>
          <Pressable
            onPress={() => setManagerVisible(true)}
            style={{
              backgroundColor: c.elevated,
              borderRadius: 14,
              width: 47,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Manage exercises"
          >
            <Ionicons name="options-outline" size={22} color={c.text} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setEditing(undefined);
            setEditorVisible(true);
          }}
          style={{
            backgroundColor: c.accent,
            borderRadius: 14,
            padding: 14,
            alignItems: "center",
            marginTop: 14,
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="add" size={20} color={c.accentText} />
          <Text
            style={{ color: c.accentText, fontWeight: "700", fontSize: 16 }}
          >
            Add or backfill a set
          </Text>
        </Pressable>
        {deleted && (
          <Pressable
            onPress={() => {
              void bridge.saveLift(deleted).then(() => setDeleted(undefined));
            }}
            style={{
              backgroundColor: c.elevated,
              padding: 12,
              borderRadius: 12,
              marginTop: 14,
            }}
          >
            <Text style={{ color: c.text }}>Set deleted · Tap to undo</Text>
          </Pressable>
        )}
        <Text
          style={{
            color: c.text,
            fontSize: 20,
            fontWeight: "700",
            marginTop: 28,
            marginBottom: 12,
          }}
        >
          All sets
        </Text>
        {filtered.length === 0 ? (
          <Text style={{ color: c.muted, lineHeight: 21 }}>
            {query
              ? "No matching sets."
              : "Your lift history will appear here."}
          </Text>
        ) : (
          filtered.map((lift) => (
            <Pressable
              key={lift.id}
              onPress={() => {
                setEditing(lift);
                setEditorVisible(true);
              }}
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: c.text, fontSize: 16, fontWeight: "700" }}
                >
                  {lift.exerciseName}
                </Text>
                <Text style={{ color: c.muted, marginTop: 5 }}>
                  {formatDate(lift.performedAt)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{ color: c.text, fontWeight: "700", fontSize: 16 }}
                >
                  {formatLift(lift)}
                </Text>
                <Pressable
                  onPress={() => remove(lift)}
                  hitSlop={8}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ color: c.danger, fontSize: 12 }}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <LiftEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        lift={editing}
        exercises={exercises}
      />
      <ExerciseManager
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        exercises={exercises}
      />
    </View>
  );
}
