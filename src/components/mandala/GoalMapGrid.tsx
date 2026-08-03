import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { BodyText, HandText, ProgressBar } from "@/src/components/ui";
import { mainGoalLabel } from "@/src/lib/labels";
import { MainGoal, MicroGoal, SubGoal } from "@/src/types";

type Props = {
  mainGoal: MainGoal;
  subGoals: SubGoal[];
  microGoals: MicroGoal[];
  swapSource: number | null; // 入れ替えモード中の position
  onPressSub: (sub: SubGoal) => void;
  onLongPressSub: (sub: SubGoal) => void;
  onPressEmpty: (position: number) => void;
  onPressCenter: () => void;
};

/** 目標マップ: 中央=大目標、周囲8マス=中目標 の 3×3 グリッド */
export function GoalMapGrid({
  mainGoal,
  subGoals,
  microGoals,
  swapSource,
  onPressSub,
  onLongPressSub,
  onPressEmpty,
  onPressCenter,
}: Props) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const cell = Math.floor((Math.min(width, 500) - 20 * 2 - gap * 2) / 3);

  // 3×3 の並び: [1,2,3] / [4,中央,5] / [6,7,8]
  const layout: (number | "center")[] = [1, 2, 3, 4, "center", 5, 6, 7, 8];

  const achievedOf = (sub: SubGoal) =>
    microGoals.filter((m) => m.subGoalId === sub.id && m.status === "達成済み")
      .length;

  return (
    <View style={[styles.grid, { gap, width: cell * 3 + gap * 2 }]}>
      {layout.map((slot) => {
        if (slot === "center") {
          return (
            <Pressable
              key="center"
              onPress={onPressCenter}
              style={({ pressed }) => [
                styles.center,
                { width: cell, height: cell, opacity: pressed ? 0.85 : 1 },
                Shadow,
              ]}
            >
              <HandText style={styles.centerYear}>{mainGoal.year}</HandText>
              <BodyText style={styles.centerTitle} numberOfLines={3}>
                {mainGoalLabel(mainGoal)}
              </BodyText>
            </Pressable>
          );
        }
        const sub = subGoals.find((g) => g.position === slot);
        if (!sub) {
          return (
            <Pressable
              key={slot}
              onPress={() => onPressEmpty(slot)}
              style={[
                styles.empty,
                { width: cell, height: cell },
                swapSource === slot && styles.swapping,
              ]}
            >
              <HandText style={styles.plus}>＋</HandText>
            </Pressable>
          );
        }
        const achieved = achievedOf(sub);
        const swapping = swapSource === sub.position;
        return (
          <Pressable
            key={slot}
            onPress={() => onPressSub(sub)}
            onLongPress={() => onLongPressSub(sub)}
            delayLongPress={350}
            style={({ pressed }) => [
              styles.card,
              { width: cell, height: cell, opacity: pressed ? 0.85 : 1 },
              swapping && styles.swapping,
              Shadow,
            ]}
          >
            <BodyText style={styles.cardTitle} numberOfLines={2}>
              {sub.title}
            </BodyText>
            <View style={{ width: "72%", gap: 5, alignItems: "center" }}>
              <ProgressBar rate={achieved / 8} />
              <HandText style={styles.count}>{achieved} / 8</HandText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "center",
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 8,
  },
  swapping: {
    borderWidth: 2,
    borderColor: Palette.accent,
  },
  // alignSelf:"stretch" は見た目のためではなく、文字切れ対策。
  // 親が alignItems:center だとテキストの幅が iOS の実測値ぴったりになり、
  // 実測が描画幅より小さく出る端末では末尾が「…」や欠けになる。
  // セルの幅いっぱいを与えて、実測値に幅を決めさせない。
  cardTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    textAlign: "center",
    alignSelf: "stretch",
  },
  count: {
    fontSize: 12,
    color: Palette.muted,
    textAlign: "center",
    alignSelf: "stretch",
  },
  center: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  centerYear: {
    color: "#F8E3D4",
    fontSize: 15,
    marginBottom: 2,
    textAlign: "center",
    alignSelf: "stretch",
  },
  centerTitle: {
    color: Palette.white,
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    alignSelf: "stretch",
  },
  empty: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    backgroundColor: "rgba(252,248,236,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { fontSize: 26, color: Palette.muted },
});
