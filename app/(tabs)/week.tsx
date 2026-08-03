import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { CoachMark } from "@/src/components/onboarding/CoachMark";
import { HINTS } from "@/src/components/onboarding/hintContent";
import { BodyText, HandText } from "@/src/components/ui";
import { AddFreeItemSheet } from "@/src/components/weekly/AddFreeItemSheet";
import { WeeklyCard } from "@/src/components/weekly/WeeklyCard";
import { useFirstVisitHint } from "@/src/hooks/useFirstVisitHint";
import { currentWeekStart, weekRangeLabel } from "@/src/lib/dates";
import { useAppStore } from "@/src/store/useAppStore";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";

/** 今週の目標(週次リスト) */
export default function WeekScreen() {
  const week = currentWeekStart();
  // セレクタ内で filter せず(新規参照は無限再レンダーの元)、レンダー内で絞り込む
  const weeklyItems = useAppStore((s) => s.weeklyItems);
  const reviews = useAppStore((s) => s.reviews);
  const setReviewScore = useAppStore((s) => s.setReviewScore);
  const items = weeklyItems.filter((w) => w.weekStart === week);
  const thisScore = reviews.find((r) => r.weekStart === week)?.score ?? 50;
  const [adding, setAdding] = useState(false);

  // オンボーディングを完走した人はStep5で連携を体験済みなので出さない
  const didFinishFlow = useOnboardingStore((s) => s.didFinishFlow);
  const listRef = useRef<View>(null);
  const listHint = useFirstVisitHint("weeklyList", { enabled: !didFinishFlow });

  // 今週の点数をその場で編集
  const [editingScore, setEditingScore] = useState(false);
  const [scoreDraft, setScoreDraft] = useState("");

  const startEditScore = () => {
    setScoreDraft(String(thisScore));
    setEditingScore(true);
  };
  const commitScore = () => {
    const raw = parseInt(scoreDraft.replace(/[^0-9]/g, ""), 10);
    const v = Math.max(0, Math.min(100, isNaN(raw) ? thisScore : raw));
    setReviewScore(week, v);
    setEditingScore(false);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.headerRow}>
            <View>
              <HandText style={styles.title}>今週の目標</HandText>
              <BodyText style={styles.range}>{weekRangeLabel(week)}</BodyText>
            </View>
            <Pressable style={styles.scoreBadge} onPress={startEditScore}>
              <BodyText style={styles.scoreBadgeLabel}>今週の手応え</BodyText>
              {editingScore ? (
                <View style={styles.scoreEditRow}>
                  <TextInput
                    style={styles.scoreInput}
                    value={scoreDraft}
                    onChangeText={setScoreDraft}
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={3}
                    selectTextOnFocus
                    onSubmitEditing={commitScore}
                    onBlur={commitScore}
                  />
                  <BodyText style={styles.scoreUnit}>点</BodyText>
                </View>
              ) : (
                <HandText style={styles.scoreBadgeValue}>
                  {thisScore}
                  <HandText style={{ fontSize: 12 }}>点</HandText>
                </HandText>
              )}
            </Pressable>
          </View>

          <View style={styles.divider} />

          {items.length === 0 && (
            <View style={styles.emptyBox}>
              <BodyText style={styles.emptyText}>
                まだ項目がありません。{"\n"}
                マンダラのマスをタップして今週にとり込むか、{"\n"}
                下のボタンから自由に追加できます。
              </BodyText>
            </View>
          )}

          <View ref={listRef} collapsable={false}>
            {items.map((item) => (
              <WeeklyCard key={item.id} item={item} />
            ))}

            <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
              <BodyText style={styles.addBtnText}>＋ 今週の目標を追加</BodyText>
            </Pressable>
          </View>

          <BodyText style={styles.hint}>
            カードをスワイプ、または長押しで削除
          </BodyText>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddFreeItemSheet visible={adding} onClose={() => setAdding(false)} />

      {/* Part B: オンボーディングを最後まで見ていない人にだけ、連携の仕組みを補足する */}
      <CoachMark
        visible={listHint.visible}
        targetRef={listRef}
        title={HINTS.weeklyList.title}
        body={HINTS.weeklyList.body}
        onClose={listHint.dismiss}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 32 },
  range: { color: Palette.muted, fontSize: 14, marginTop: 4, letterSpacing: 1 },
  scoreBadge: {
    backgroundColor: Palette.card,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.border,
    minWidth: 84,
  },
  scoreBadgeLabel: { fontSize: 10, color: Palette.muted },
  scoreBadgeValue: { fontSize: 20, color: Palette.ink },
  scoreEditRow: { flexDirection: "row", alignItems: "baseline" },
  scoreInput: {
    fontFamily: Fonts.hand,
    fontSize: 20,
    color: Palette.accent,
    minWidth: 40,
    padding: 0,
    textAlign: "center",
  },
  scoreUnit: { fontSize: 12, color: Palette.muted },
  divider: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    marginVertical: 16,
  },
  emptyBox: { paddingVertical: 28 },
  emptyText: {
    textAlign: "center",
    color: Palette.muted,
    fontSize: 13,
    lineHeight: 22,
  },
  addBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.lg,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnText: {
    color: Palette.muted,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
  hint: {
    textAlign: "center",
    color: Palette.faint,
    fontSize: 11,
    marginTop: 12,
  },
});
