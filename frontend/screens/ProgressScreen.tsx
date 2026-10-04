import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  estimateOneRepMax,
  formatDate,
  formatLift,
  personalRecords,
} from "../services/insights";
import { useGains } from "../services/useGains";
import { usePalette } from "../theme/palette";

function trendUnit(history: { unit: "lb" | "kg" }[]): "lb" | "kg" {
  return history.length ? history[history.length - 1].unit : "lb";
}

export default function ProgressScreen() {
  const c = usePalette();
  const { lifts, exercises, bridge } = useGains();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  useFocusEffect(
    useCallback(() => {
      void bridge.refresh();
    }, [bridge]),
  );
  const ids = useMemo(
    () => [...new Set(lifts.map((l) => l.exerciseId))],
    [lifts],
  );
  const active = selectedId && ids.includes(selectedId) ? selectedId : ids[0];
  const history = useMemo(
    () =>
      lifts
        .filter((l) => l.exerciseId === active)
        .sort((a, b) => a.performedAt.localeCompare(b.performedAt)),
    [lifts, active],
  );
  const record = personalRecords(lifts).get(active ?? "");
  const displayUnit = trendUnit(history);
  const max = Math.max(
    1,
    ...history.map((lift) => estimateOneRepMax(lift, displayUnit)),
  );
  const trend = history.slice(-12);
  const label =
    exercises.find((e) => e.id === active)?.name ?? history[0]?.exerciseName;
  const tile = (title: string, value: string, detail: string) => (
    <View
      style={{
        width: "48%",
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: c.muted,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
        }}
      >
        {title}
      </Text>
      <Text
        style={{ color: c.text, fontSize: 23, fontWeight: "800", marginTop: 8 }}
      >
        {value}
      </Text>
      <Text style={{ color: c.muted, marginTop: 3, fontSize: 12 }}>
        {detail}
      </Text>
    </View>
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text
        style={{
          color: c.muted,
          fontWeight: "700",
          letterSpacing: 1.5,
          marginTop: 8,
        }}
      >
        THE LONG VIEW
      </Text>
      <Text
        style={{ color: c.text, fontSize: 34, fontWeight: "800", marginTop: 7 }}
      >
        Progress
      </Text>
      <Text style={{ color: c.muted, marginTop: 6 }}>
        Your best sets, earned over time.
      </Text>
      {ids.length === 0 ? (
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 16,
            padding: 20,
            marginTop: 30,
          }}
        >
          <Text style={{ color: c.text, fontWeight: "700" }}>No lifts yet</Text>
          <Text style={{ color: c.muted, marginTop: 6 }}>
            Your records and trends will show after your first set.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 22 }}
          >
            {ids.map((id) => (
              <Pressable
                key={id}
                onPress={() => setSelectedId(id)}
                style={{
                  backgroundColor: id === active ? c.accent : c.elevated,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: id === active ? c.accentText : c.text,
                    fontWeight: "700",
                  }}
                >
                  {exercises.find((e) => e.id === id)?.name ??
                    lifts.find((l) => l.exerciseId === id)?.exerciseName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={{ color: c.text, fontSize: 21, fontWeight: "700" }}>
            {label}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            {record &&
              tile(
                "HEAVIEST",
                `${record.maxWeight.weight} ${record.maxWeight.unit}`,
                `${record.maxWeight.reps} reps · ${formatDate(record.maxWeight.performedAt)}`,
              )}
            {record &&
              tile(
                "MOST REPS",
                `${record.maxReps.reps} reps`,
                `${record.maxReps.weight} ${record.maxReps.unit} · ${formatDate(record.maxReps.performedAt)}`,
              )}
            {record &&
              tile(
                "EST. 1RM",
                `${Math.round(estimateOneRepMax(record.maxEstimated))} ${record.maxEstimated.unit}`,
                `From ${formatLift(record.maxEstimated)}`,
              )}
            {tile("TOTAL SETS", String(history.length), "All time")}
          </View>
          <View
            style={{
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 18,
              padding: 18,
              marginTop: 24,
            }}
          >
            <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>
              Estimated one rep max
            </Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
              Last {trend.length} sets · Epley estimate
            </Text>
            <View
              style={{
                height: 165,
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 5,
                marginTop: 20,
              }}
            >
              {trend.map((lift) => (
                <View
                  key={lift.id}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: Math.max(
                        10,
                        (estimateOneRepMax(lift, displayUnit) / max) * 145,
                      ),
                      backgroundColor: c.accent,
                      borderRadius: 5,
                    }}
                  />
                </View>
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {trend[0] && formatDate(trend[0].performedAt)}
              </Text>
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {trend.at(-1) && formatDate(trend.at(-1)!.performedAt)}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
