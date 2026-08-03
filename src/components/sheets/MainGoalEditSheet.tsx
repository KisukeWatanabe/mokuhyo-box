import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BottomSheet } from "@/src/components/BottomSheet";
import { BodyText, HandText } from "@/src/components/ui";
import { MainGoal } from "@/src/types";

type Props = {
  visible: boolean;
  mainGoal: MainGoal | null;
  canDelete: boolean;
  onSave: (patch: { title: string; year: number }) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** 大目標(マンダラ)のタイトル・年の編集と削除 */
export function MainGoalEditSheet({
  visible,
  mainGoal,
  canDelete,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (visible && mainGoal) {
      setTitle(mainGoal.title);
      setYear(mainGoal.year);
    }
  }, [visible, mainGoal]);

  const confirmDelete = () => {
    Alert.alert(
      "マンダラを削除",
      "このマンダラと、その中目標・極小目標・紐づく週次項目をすべて削除します。取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <HandText style={styles.title}>マンダラを編集</HandText>

      <BodyText style={styles.label}>大目標</BodyText>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="例: 健康的で充実した1年に"
        placeholderTextColor={Palette.faint}
        maxLength={40}
        multiline
      />

      <BodyText style={styles.label}>年</BodyText>
      <View style={styles.stepper}>
        <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={8}>
          <HandText style={styles.stepBtn}>−</HandText>
        </Pressable>
        <HandText style={styles.stepValue}>{year}</HandText>
        <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={8}>
          <HandText style={styles.stepBtn}>＋</HandText>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          !title.trim() && { opacity: 0.4 },
          pressed && { opacity: 0.85 },
        ]}
        disabled={!title.trim()}
        onPress={() => {
          onSave({ title: title.trim(), year });
          onClose();
        }}
      >
        <BodyText style={styles.ctaText}>保存する</BodyText>
      </Pressable>

      {canDelete && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <BodyText style={styles.deleteText}>このマンダラを削除</BodyText>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, marginBottom: 16 },
  label: { fontSize: 13, color: Palette.inkSoft, marginBottom: 8 },
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
    minHeight: 48,
    textAlignVertical: "top",
  },
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
    marginBottom: 18,
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
  deleteBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  deleteText: { color: Palette.accent, fontSize: 14 },
});
