import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BottomSheet } from "@/src/components/BottomSheet";
import { BodyText, HandText } from "@/src/components/ui";
import {
  addDays,
  currentWeekStart,
  shortLabel,
  todayKey,
} from "@/src/lib/dates";
import { useAppStore } from "@/src/store/useAppStore";
import { FrequencyType, MicroGoal } from "@/src/types";

type Props = {
  micro: MicroGoal | null;
  subGoalTitle: string;
  onClose: () => void;
};

const FREQS: FrequencyType[] = ["毎日", "週数回", "週1回", "単発"];

/** セル編集モーダル「今週にとり込む」(マンダラ → 週次リスト) */
export function TakeInSheet({ micro, subGoalTitle, onClose }: Props) {
  const addMicroToWeek = useAppStore((s) => s.addMicroToWeek);
  const [freq, setFreq] = useState<FrequencyType>("毎日");
  const [count, setCount] = useState(3);
  const [numTarget, setNumTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [clCount, setClCount] = useState(3);
  const [due, setDue] = useState<string>("");

  // 期限クイック候補
  const weekEnd = addDays(currentWeekStart(), 6);
  const plus2w = addDays(todayKey(), 14);
  const plus1m = addDays(todayKey(), 30);
  const dueOptions: { label: string; value: string }[] = [
    { label: "今週末", value: weekEnd },
    { label: "2週間後", value: plus2w },
    { label: "1ヶ月後", value: plus1m },
  ];

  useEffect(() => {
    if (micro) {
      setFreq(micro.frequencyType);
      setCount(micro.targetCount ?? 3);
      setNumTarget(
        micro.numericTarget != null ? String(micro.numericTarget) : "",
      );
      setUnit(micro.numericUnit ?? "");
      setClCount(micro.checklistTarget ?? 3);
      setDue(weekEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micro]);

  // 週次リストでの実効タイプ(ストアの決定ロジックと合わせる)
  const effectiveType =
    micro?.progressType === "数値型" ||
    micro?.progressType === "動的チェックリスト型"
      ? micro.progressType
      : freq === "週数回"
        ? "回数型"
        : "○×型";

  const submit = () => {
    if (!micro) return;
    addMicroToWeek(micro.id, {
      frequencyType: freq,
      targetCount: count,
      numericTarget: parseInt(numTarget.replace(/[^0-9]/g, ""), 10) || 0,
      numericUnit: unit.trim() || undefined,
      checklistTarget: clCount,
      dueDate: freq === "単発" ? due : undefined,
    });
    onClose();
  };

  return (
    <BottomSheet visible={micro !== null} onClose={onClose}>
      <HandText style={styles.title}>今週にとり込む</HandText>
      <BodyText style={styles.subtitle}>マンダラ → 週次リスト</BodyText>

      <View style={styles.targetCard}>
        <BodyText style={styles.targetLabel}>
          {subGoalTitle} の極小目標
        </BodyText>
        <BodyText style={styles.targetTitle}>{micro?.title ?? ""}</BodyText>
      </View>

      <BodyText style={styles.sectionLabel}>頻度</BodyText>
      <View style={styles.segmentRow}>
        {FREQS.map((f) => {
          const active = freq === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFreq(f)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <BodyText
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {f}
              </BodyText>
            </Pressable>
          );
        })}
      </View>

      {/* 回数型: 回数ステッパー */}
      {effectiveType === "回数型" && (
        <View style={styles.stepperRow}>
          <View style={styles.stepperBox}>
            <BodyText style={styles.stepperLabel}>回数</BodyText>
            <Pressable
              onPress={() => setCount((c) => Math.max(1, c - 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepperBtn}>−</HandText>
            </Pressable>
            <HandText style={styles.stepperValue}>{count}</HandText>
            <Pressable
              onPress={() => setCount((c) => Math.min(7, c + 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepperBtn}>＋</HandText>
            </Pressable>
          </View>
          <View style={styles.typeBox}>
            <BodyText style={styles.stepperLabel}>タイプ</BodyText>
            <BodyText style={styles.typeValue}>回数+日付</BodyText>
          </View>
        </View>
      )}

      {/* 数値型: 目標値 + 単位 */}
      {effectiveType === "数値型" && (
        <View style={styles.numRow}>
          <View style={{ flex: 1 }}>
            <BodyText style={styles.sectionLabel}>目標の数値</BodyText>
            <TextInput
              style={styles.numInput}
              value={numTarget}
              onChangeText={setNumTarget}
              placeholder="例: 3"
              placeholderTextColor={Palette.faint}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ width: 84 }}>
            <BodyText style={styles.sectionLabel}>単位</BodyText>
            <TextInput
              style={styles.numInput}
              value={unit}
              onChangeText={setUnit}
              placeholder="km"
              placeholderTextColor={Palette.faint}
              maxLength={4}
            />
          </View>
        </View>
      )}

      {/* 動的チェックリスト型: 項目数 */}
      {effectiveType === "動的チェックリスト型" && (
        <View style={styles.stepperRow}>
          <View style={styles.stepperBox}>
            <BodyText style={styles.stepperLabel}>埋める項目数</BodyText>
            <Pressable
              onPress={() => setClCount((c) => Math.max(1, c - 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepperBtn}>−</HandText>
            </Pressable>
            <HandText style={styles.stepperValue}>{clCount}</HandText>
            <Pressable
              onPress={() => setClCount((c) => Math.min(10, c + 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepperBtn}>＋</HandText>
            </Pressable>
          </View>
        </View>
      )}

      {/* 単発: 期限 */}
      {freq === "単発" && (
        <>
          <BodyText style={[styles.sectionLabel, { marginTop: 4 }]}>
            期限(過ぎると自動で消化)
          </BodyText>
          <View style={styles.segmentRow}>
            {dueOptions.map((o) => {
              const active = due === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setDue(o.value)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <BodyText
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {o.label}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
          <BodyText style={styles.dueHint}>
            期限: {shortLabel(due)} まで
          </BodyText>
        </>
      )}

      <BodyText style={styles.note}>
        達成すると、マンダラのマスも緑に変わります(双方向同期)
      </BodyText>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        onPress={submit}
      >
        <BodyText style={styles.ctaText}>追加する</BodyText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { color: Palette.muted, fontSize: 13, marginBottom: 16 },
  targetCard: {
    backgroundColor: Palette.accentSoft,
    borderWidth: 1,
    borderColor: "#E5BBA4",
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 18,
  },
  targetLabel: { fontSize: 12, color: Palette.salmonDark, marginBottom: 4 },
  targetTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Palette.accent,
  },
  sectionLabel: { fontSize: 13, color: Palette.inkSoft, marginBottom: 8 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  segmentText: { fontSize: 13, color: Palette.inkSoft },
  segmentTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  stepperRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  stepperBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Palette.card,
  },
  typeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    backgroundColor: Palette.card,
  },
  stepperLabel: { fontSize: 13, color: Palette.inkSoft },
  stepperBtn: { fontSize: 22, color: Palette.accent, paddingHorizontal: 6 },
  stepperValue: { fontSize: 20, color: Palette.ink },
  typeValue: { fontSize: 13, color: Palette.accent },
  numRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  numInput: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    backgroundColor: Palette.cardAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Palette.ink,
  },
  dueHint: { fontSize: 12, color: Palette.muted, marginBottom: 4 },
  note: {
    fontSize: 12,
    color: Palette.muted,
    textAlign: "center",
    marginVertical: 14,
    lineHeight: 18,
  },
  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 17 },
});
