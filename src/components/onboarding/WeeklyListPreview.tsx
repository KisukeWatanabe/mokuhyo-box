import React from "react";
import { StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BodyText, HandText } from "@/src/components/ui";
import { WeeklyCard } from "@/src/components/weekly/WeeklyCard";
import { currentWeekStart, weekRangeLabel } from "@/src/lib/dates";
import { useAppStore } from "@/src/store/useAppStore";

/**
 * Step 5 用のミニプレビュー。
 *
 * 説明用のモックではなく、実際の週次リストUI(WeeklyCard)に、たった今作った
 * 本物の項目を流し込んで見せる。「マンダラに書いた行動が、そのまま今週の
 * リストに出てくる」ことを、その場で確かめられるようにするため。
 */
export function WeeklyListPreview({ microGoalId }: { microGoalId: string | null }) {
  const weeklyItems = useAppStore((s) => s.weeklyItems);
  const week = currentWeekStart();
  const item = weeklyItems.find(
    (w) => w.weekStart === week && w.microGoalId === microGoalId,
  );

  return (
    <View style={styles.frame}>
      <View style={styles.header}>
        <View>
          <HandText style={styles.title}>今週の目標</HandText>
          <BodyText style={styles.range}>{weekRangeLabel(week)}</BodyText>
        </View>
        <View style={styles.newBadge}>
          <BodyText style={styles.newBadgeText}>NEW</BodyText>
        </View>
      </View>
      <View style={styles.divider} />

      {item ? (
        <View style={styles.highlight}>
          <WeeklyCard item={item} />
        </View>
      ) : (
        <BodyText style={styles.missing}>
          週次リストの項目を準備しています…
        </BodyText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: Palette.cream,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 20 },
  range: { fontSize: 12, color: Palette.muted, marginTop: 2, letterSpacing: 1 },
  newBadge: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: Palette.white,
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    marginVertical: 14,
  },
  // 追加されたばかりの項目だけをアクセント色の枠で強調する
  highlight: {
    borderWidth: 2,
    borderColor: Palette.accent,
    borderRadius: Radii.lg + 2,
    padding: 4,
  },
  missing: {
    fontSize: 12.5,
    color: Palette.muted,
    textAlign: "center",
    paddingVertical: 20,
  },
});
