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
import { FrequencyType, ProgressType } from "@/src/types";

const TYPES: { key: ProgressType; label: string }[] = [
  { key: "○×型", label: "○×" },
  { key: "回数型", label: "回数" },
  { key: "数値型", label: "数値" },
  { key: "動的チェックリスト型", label: "リスト" },
];
const FREQS: FrequencyType[] = ["毎日", "週数回", "週1回", "単発"];

/** マンダラに紐づかない、その週だけのフリー項目を追加するシート */
export function AddFreeItemSheet({
  visible,
  onClose,
  weekStart,
  weekLabel,
}: {
  visible: boolean;
  onClose: () => void;
  /** 追加先の週(省略時は今週)。振り返りから過去週に追加する用 */
  weekStart?: string;
  /** シートに表示する対象週のラベル(任意) */
  weekLabel?: string;
}) {
  const addFreeItem = useAppStore((s) => s.addFreeItem);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProgressType>("○×型");
  const [freq, setFreq] = useState<FrequencyType>("単発");
  const [count, setCount] = useState(3);
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [due, setDue] = useState("");

  const weekEnd = addDays(currentWeekStart(), 6);
  const dueOptions = [
    { label: "今週末", value: weekEnd },
    { label: "2週間後", value: addDays(todayKey(), 14) },
    { label: "1ヶ月後", value: addDays(todayKey(), 30) },
  ];

  useEffect(() => {
    if (visible) {
      setTitle("");
      setType("○×型");
      setFreq("単発");
      setCount(3);
      setTarget("");
      setUnit("");
      setDue(weekEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ○×型で頻度=単発の時だけ期限を出す
  const showDue = type === "○×型" && freq === "単発";

  const submit = () => {
    if (!title.trim()) return;
    addFreeItem({
      title: title.trim(),
      progressType: type,
      frequencyType: type === "回数型" ? "週数回" : freq,
      targetCount: count,
      numericTarget: parseInt(target.replace(/[^0-9]/g, ""), 10) || 0,
      numericUnit: unit.trim() || undefined,
      dueDate: showDue ? due : undefined,
      weekStart,
    });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <HandText style={styles.title}>
        {weekLabel ? `${weekLabel} に追加` : "今週の目標を追加"}
      </HandText>
      <BodyText style={styles.subtitle}>
        マンダラに無い、その週だけの項目もOK
      </BodyText>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="例: 保険の見直し、美容院を予約"
        placeholderTextColor={Palette.faint}
        maxLength={30}
      />

      <BodyText style={styles.sectionLabel}>記録のしかた</BodyText>
      <View style={styles.segmentRow}>
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <BodyText
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {t.label}
              </BodyText>
            </Pressable>
          );
        })}
      </View>

      {type === "○×型" && (
        <>
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
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {f}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {showDue && (
        <>
          <BodyText style={styles.sectionLabel}>
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

      {type === "回数型" && (
        <View style={styles.stepperBox}>
          <BodyText style={styles.sectionLabel}>週の回数</BodyText>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setCount((c) => Math.max(1, c - 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepBtn}>−</HandText>
            </Pressable>
            <HandText style={styles.stepValue}>{count}</HandText>
            <Pressable
              onPress={() => setCount((c) => Math.min(7, c + 1))}
              hitSlop={8}
            >
              <HandText style={styles.stepBtn}>＋</HandText>
            </Pressable>
          </View>
        </View>
      )}

      {type === "数値型" && (
        <View style={styles.numRow}>
          <View style={{ flex: 1 }}>
            <BodyText style={styles.sectionLabel}>目標の数値</BodyText>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="例: 60000"
              placeholderTextColor={Palette.faint}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ width: 84 }}>
            <BodyText style={styles.sectionLabel}>単位</BodyText>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="km"
              placeholderTextColor={Palette.faint}
              maxLength={4}
            />
          </View>
        </View>
      )}

      <Pressable
        style={[styles.cta, !title.trim() && { opacity: 0.4 }]}
        disabled={!title.trim()}
        onPress={submit}
      >
        <BodyText style={styles.ctaText}>追加する</BodyText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, marginBottom: 4 },
  subtitle: { color: Palette.muted, fontSize: 12, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    backgroundColor: Palette.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Palette.ink,
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 13, color: Palette.inkSoft, marginBottom: 8 },
  numRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dueHint: {
    fontSize: 12,
    color: Palette.muted,
    marginTop: -6,
    marginBottom: 10,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  segment: {
    flex: 1,
    paddingVertical: 10,
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
  segmentText: { fontSize: 12, color: Palette.inkSoft },
  segmentTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  stepperBox: { marginBottom: 6 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Palette.card,
    marginBottom: 8,
  },
  stepBtn: { fontSize: 24, color: Palette.accent, paddingHorizontal: 8 },
  stepValue: { fontSize: 22 },
  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 16 },
});
