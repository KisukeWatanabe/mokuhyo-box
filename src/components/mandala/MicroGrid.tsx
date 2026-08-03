import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { BodyText, FreqBadge, HandText } from "@/src/components/ui";
import { MicroGoal, SubGoal } from "@/src/types";

export function freqShort(f: MicroGoal["frequencyType"], target?: number): string {
  switch (f) {
    case "毎日":
      return "毎日";
    case "週1回":
      return "週1";
    case "週数回":
      return target ? `週${target}` : "週数回";
    case "単発":
      return "単発";
  }
}

type Props = {
  subGoal: SubGoal;
  microGoals: MicroGoal[];
  swapSource: number | null;
  onPressMicro: (m: MicroGoal) => void;
  onLongPressMicro: (m: MicroGoal) => void;
  onPressEmpty: (position: number) => void;
  onPressCenter: () => void;
};

/** 中目標詳細: 中央=中目標、周囲8マス=小目標 の 3×3 グリッド */
export function MicroGrid({
  subGoal,
  microGoals,
  swapSource,
  onPressMicro,
  onLongPressMicro,
  onPressEmpty,
  onPressCenter,
}: Props) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const cell = Math.floor((Math.min(width, 500) - 20 * 2 - gap * 2) / 3);
  const layout: (number | "center")[] = [1, 2, 3, 4, "center", 5, 6, 7, 8];
  const achieved = microGoals.filter((m) => m.status === "達成済み").length;

  return (
    <View style={[styles.grid, { gap, width: cell * 3 + gap * 2 }]}>
      {layout.map((slot) => {
        if (slot === "center") {
          return (
            <Pressable
              key="center"
              onPress={onPressCenter}
              style={[styles.center, { width: cell, height: cell }, Shadow]}
            >
              <BodyText style={styles.centerTitle} numberOfLines={2}>
                {subGoal.title}
              </BodyText>
              <HandText style={styles.centerCount}>{achieved} / 8 達成</HandText>
            </Pressable>
          );
        }
        const micro = microGoals.find((m) => m.position === slot);
        if (!micro) {
          return (
            <Pressable
              key={slot}
              onPress={() => onPressEmpty(slot)}
              style={[
                styles.cellBase,
                styles.empty,
                { width: cell, height: cell },
                swapSource === slot && styles.swapping,
              ]}
            >
              <HandText style={styles.plus}>＋</HandText>
            </Pressable>
          );
        }
        const done = micro.status === "達成済み";
        const inWeek = micro.status === "週次リストに追加済み";
        const swapping = swapSource === micro.position;
        return (
          <Pressable
            key={slot}
            onPress={() => onPressMicro(micro)}
            onLongPress={() => onLongPressMicro(micro)}
            delayLongPress={350}
            style={({ pressed }) => [
              styles.cellBase,
              { width: cell, height: cell, opacity: pressed ? 0.85 : 1 },
              done
                ? styles.done
                : inWeek
                  ? styles.inWeek
                  : styles.todo,
              swapping && styles.swapping,
              !done && !inWeek ? null : Shadow,
            ]}
          >
            <View style={styles.badgeRow}>
              <FreqBadge
                label={freqShort(micro.frequencyType)}
                tone={done ? "green" : inWeek ? "salmon" : "light"}
              />
            </View>
            <BodyText
              style={[
                styles.title,
                done && { color: "#4C6635" },
                inWeek && { color: Palette.salmonDark },
              ]}
              numberOfLines={2}
            >
              {micro.title}
            </BodyText>
            <HandText style={styles.check}>{done ? "✓" : " "}</HandText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", alignSelf: "center" },
  cellBase: {
    borderRadius: Radii.lg,
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  done: { backgroundColor: Palette.green },
  inWeek: { backgroundColor: Palette.salmon },
  todo: {
    backgroundColor: "rgba(252,248,236,0.6)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
  },
  swapping: { borderWidth: 2, borderStyle: "solid", borderColor: Palette.accent },
  badgeRow: { alignSelf: "flex-end" },
  // alignSelf:"stretch" は文字切れ対策(GoalMapGrid と同じ理由)。
  // 親が alignItems:center だと幅が iOS の実測値ぴったりになり、
  // 実測が描画幅より小さく出る端末で末尾が「…」になる。
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    alignSelf: "stretch",
  },
  check: { fontSize: 20, color: "#5F7F46", marginTop: 2 },
  empty: { justifyContent: "center", paddingTop: 0 },
  plus: { fontSize: 26, color: Palette.muted },
  center: {
    backgroundColor: Palette.tan,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  centerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: "#5C4322",
    textAlign: "center",
    alignSelf: "stretch",
  },
  centerCount: {
    fontSize: 13,
    color: "#7A5F35",
    textAlign: "center",
    alignSelf: "stretch",
  },
});
