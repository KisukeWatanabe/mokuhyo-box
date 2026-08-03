import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BottomSheet } from "@/src/components/BottomSheet";
import { BodyText, HandText } from "@/src/components/ui";
import { FrequencyType, MicroGoalStatus, ProgressType } from "@/src/types";

export type EditGoalPayload = {
  title: string;
  frequencyType?: FrequencyType;
  progressType?: ProgressType;
  targetCount?: number;
  numericTarget?: number;
  numericUnit?: string;
  checklistTarget?: number;
  /** undefined = 自動(週次リストに任せる) */
  manualStatus?: MicroGoalStatus;
};

/** マスの色の選択肢。null = 自動(週次リストの達成状況から決める) */
const STATUS_CHOICES: {
  value: MicroGoalStatus | null;
  label: string;
  dotColor: string;
  dashed?: boolean;
}[] = [
  { value: null, label: "自動", dotColor: "transparent", dashed: true },
  { value: "未着手", label: "未着手", dotColor: Palette.cream, dashed: true },
  { value: "週次リストに追加済み", label: "追加済", dotColor: Palette.salmon },
  { value: "達成済み", label: "達成", dotColor: Palette.green },
];

type Props = {
  visible: boolean;
  heading: string; // 例: "マスを編集" / "新しい中目標"
  placeholder?: string;
  initialTitle?: string;
  /** 指定すると頻度・進捗タイプのセレクタを表示(小目標のみ) */
  initialFrequency?: FrequencyType | null;
  initialProgressType?: ProgressType;
  initialTargetCount?: number;
  initialNumericTarget?: number;
  initialNumericUnit?: string;
  initialChecklistTarget?: number;
  /** マスの色を手動指定するセレクタを出す(既存の極小目標を編集するときのみ) */
  showStatusPicker?: boolean;
  initialManualStatus?: MicroGoalStatus | null;
  /** タイトル入力を自動フォーカス(新規作成時のみ true 推奨。編集時はキーボードを即出さない) */
  autoFocusTitle?: boolean;
  onSave: (payload: EditGoalPayload) => void;
  onDelete?: () => void;
  onSwap?: () => void; // 位置の入れ替えモードを開始
  onClose: () => void;
};

const FREQS: FrequencyType[] = ["毎日", "週数回", "週1回", "単発"];
const TYPES: { key: ProgressType; label: string }[] = [
  { key: "○×型", label: "○×" },
  { key: "回数型", label: "回数" },
  { key: "数値型", label: "数値" },
  { key: "動的チェックリスト型", label: "リスト" },
];

/** マスの新規作成・書き換え・削除・入れ替えを行う共通シート */
export function EditGoalSheet({
  visible,
  heading,
  placeholder,
  initialTitle = "",
  initialFrequency = null,
  initialProgressType = "○×型",
  initialTargetCount = 3,
  initialNumericTarget,
  initialNumericUnit = "",
  initialChecklistTarget = 3,
  showStatusPicker = false,
  initialManualStatus = null,
  autoFocusTitle = false,
  onSave,
  onDelete,
  onSwap,
  onClose,
}: Props) {
  const isMicro = initialFrequency !== null;
  const [title, setTitle] = useState(initialTitle);
  const [freq, setFreq] = useState<FrequencyType>(initialFrequency ?? "毎日");
  const [type, setType] = useState<ProgressType>(initialProgressType);
  const [count, setCount] = useState(initialTargetCount);
  const [numTarget, setNumTarget] = useState(
    initialNumericTarget != null ? String(initialNumericTarget) : "",
  );
  const [unit, setUnit] = useState(initialNumericUnit);
  const [clCount, setClCount] = useState(initialChecklistTarget);
  const [manualStatus, setManualStatus] = useState<MicroGoalStatus | null>(
    initialManualStatus,
  );

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setFreq(initialFrequency ?? "毎日");
      setType(initialProgressType);
      setCount(initialTargetCount);
      setNumTarget(
        initialNumericTarget != null ? String(initialNumericTarget) : "",
      );
      setUnit(initialNumericUnit);
      setClCount(initialChecklistTarget);
      setManualStatus(initialManualStatus);
    }
    // 初期値が変わった時のみ同期(依存は visible とタイトルで十分)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTitle, initialFrequency, initialProgressType]);

  const confirmDelete = () => {
    Alert.alert(
      "マスを削除",
      "このマスを削除しますか?週次リストの項目も削除されます。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ],
    );
  };

  const save = () => {
    onSave({
      title: title.trim(),
      frequencyType: isMicro ? freq : undefined,
      progressType: isMicro ? type : undefined,
      targetCount: isMicro && type === "回数型" ? count : undefined,
      numericTarget:
        isMicro && type === "数値型"
          ? parseInt(numTarget.replace(/[^0-9]/g, ""), 10) || 0
          : undefined,
      numericUnit:
        isMicro && type === "数値型" ? unit.trim() || undefined : undefined,
      checklistTarget:
        isMicro && type === "動的チェックリスト型" ? clCount : undefined,
      // null(自動)は undefined として渡し、手動指定を解除する
      manualStatus: showStatusPicker ? manualStatus ?? undefined : undefined,
    });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <HandText style={styles.title}>{heading}</HandText>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={placeholder ?? "目標を入力"}
        placeholderTextColor={Palette.faint}
        maxLength={24}
        autoFocus={autoFocusTitle}
      />

      {isMicro && (
        <>
          <BodyText style={styles.sectionLabel}>
            頻度タイプ(あとから変更可)
          </BodyText>
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

          <BodyText style={styles.sectionLabel}>
            記録のしかた(進捗タイプ)
          </BodyText>
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
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {t.label}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>

          {type === "回数型" && (
            <Stepper
              label="週の目標回数"
              value={count}
              onDec={() => setCount((c) => Math.max(1, c - 1))}
              onInc={() => setCount((c) => Math.min(7, c + 1))}
              suffix="回"
            />
          )}

          {type === "数値型" && (
            <View style={styles.numRow}>
              <View style={{ flex: 1 }}>
                <BodyText style={styles.sectionLabel}>目標の数値</BodyText>
                <TextInput
                  style={styles.input}
                  value={numTarget}
                  onChangeText={setNumTarget}
                  placeholder="例: 3"
                  placeholderTextColor={Palette.faint}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ width: 90 }}>
                <BodyText style={styles.sectionLabel}>単位</BodyText>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="円 / km"
                  placeholderTextColor={Palette.faint}
                  maxLength={4}
                />
              </View>
            </View>
          )}

          {type === "動的チェックリスト型" && (
            <Stepper
              label="埋める項目数"
              value={clCount}
              onDec={() => setClCount((c) => Math.max(1, c - 1))}
              onInc={() => setClCount((c) => Math.min(10, c + 1))}
              suffix="個"
            />
          )}

          {showStatusPicker && (
            <>
              <BodyText style={styles.sectionLabel}>マスの色(状態)</BodyText>
              <View style={styles.segmentRow}>
                {STATUS_CHOICES.map((c) => {
                  const active = manualStatus === c.value;
                  return (
                    <Pressable
                      key={c.label}
                      onPress={() => setManualStatus(c.value)}
                      style={[styles.segment, active && styles.segmentActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: c.dotColor },
                          c.dashed && styles.statusDotDashed,
                          active && { borderColor: Palette.white },
                        ]}
                      />
                      <BodyText
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {c.label}
                      </BodyText>
                    </Pressable>
                  );
                })}
              </View>
              <BodyText style={styles.statusNote}>
                {manualStatus === null
                  ? "週次リストの達成状況に合わせて自動で色が変わります。"
                  : "色を固定します。週次リストで達成しても変わりません(「自動」に戻すと再び連動します)。"}
              </BodyText>
            </>
          )}
        </>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          !title.trim() && { opacity: 0.4 },
          pressed && { opacity: 0.85 },
        ]}
        disabled={!title.trim()}
        onPress={save}
      >
        <BodyText style={styles.ctaText}>保存する</BodyText>
      </Pressable>

      <View style={styles.secondaryRow}>
        {onSwap && (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              onSwap();
              onClose();
            }}
          >
            <BodyText style={styles.secondaryText}>⇄ 位置を入れ替え</BodyText>
          </Pressable>
        )}
        {onDelete && (
          <Pressable style={styles.secondaryBtn} onPress={confirmDelete}>
            <BodyText style={[styles.secondaryText, { color: Palette.accent }]}>
              削除する
            </BodyText>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  suffix,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  suffix?: string;
}) {
  return (
    <View style={{ marginBottom: 6 }}>
      <BodyText style={styles.sectionLabel}>{label}</BodyText>
      <View style={styles.stepper}>
        <Pressable onPress={onDec} hitSlop={8}>
          <HandText style={styles.stepBtn}>−</HandText>
        </Pressable>
        <HandText style={styles.stepValue}>
          {value}
          {suffix ? (
            <HandText style={{ fontSize: 14 }}> {suffix}</HandText>
          ) : null}
        </HandText>
        <Pressable onPress={onInc} hitSlop={8}>
          <HandText style={styles.stepBtn}>＋</HandText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    backgroundColor: Palette.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Palette.ink,
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 13, color: Palette.inkSoft, marginBottom: 8 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statusDotDashed: { borderStyle: "dashed", borderColor: Palette.dashed },
  statusNote: {
    fontSize: 11.5,
    color: Palette.muted,
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 16,
  },
  segmentActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  segmentText: { fontSize: 12, color: Palette.inkSoft },
  segmentTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  numRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: Palette.card,
    marginBottom: 16,
  },
  stepBtn: { fontSize: 24, color: Palette.accent, paddingHorizontal: 8 },
  stepValue: { fontSize: 22, color: Palette.ink },
  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: "center",
  },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 16 },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 14,
  },
  secondaryBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  secondaryText: { fontSize: 14, color: Palette.inkSoft },
});
