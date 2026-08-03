import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BottomSheet } from "@/src/components/BottomSheet";
import { BodyText, HandText } from "@/src/components/ui";
import { mainGoalLabel } from "@/src/lib/labels";
import { MainGoal } from "@/src/types";

type Props = {
  visible: boolean;
  /** 表示順に並んだマンダラ */
  mainGoals: MainGoal[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (title: string, year: number) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

/** マンダラの切り替え・新規作成・並び替え・削除 */
export function MandalaSwitcherSheet({
  visible,
  mainGoals,
  activeId,
  onSelect,
  onCreate,
  onMove,
  onDelete,
  onClose,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (visible) {
      setCreating(false);
      setEditing(false);
      setTitle("");
      setYear(new Date().getFullYear());
    }
  }, [visible]);

  // 最後の1つは残す(アプリが大目標ゼロの状態を想定していないため)
  const canDelete = mainGoals.length > 1;

  const confirmDelete = (g: MainGoal) => {
    Alert.alert(
      `「${mainGoalLabel(g)}」を削除`,
      "このマンダラの中目標・極小目標と、そこから作られた週次リストの項目もすべて削除されます。この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => onDelete(g.id),
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <HandText style={styles.title}>マンダラチャートを切り替え</HandText>
        <Pressable
          onPress={() => {
            setEditing((e) => !e);
            setCreating(false);
          }}
          hitSlop={8}
          style={[styles.editBtn, editing && styles.editBtnActive]}
        >
          <BodyText style={[styles.editText, editing && styles.editTextActive]}>
            {editing ? "完了" : "編集"}
          </BodyText>
        </Pressable>
      </View>

      {editing && (
        <BodyText style={styles.editHint}>
          ▲▼ で並び替え、ゴミ箱で削除できます
        </BodyText>
      )}

      {mainGoals.map((g, i) => {
        const active = g.id === activeId;

        if (editing) {
          return (
            <View key={g.id} style={[styles.row, active && styles.rowActive]}>
              <View style={styles.arrows}>
                <Pressable
                  onPress={() => onMove(g.id, -1)}
                  disabled={i === 0}
                  hitSlop={6}
                  accessibilityLabel="上へ移動"
                >
                  <BodyText style={[styles.arrow, i === 0 && styles.arrowOff]}>
                    ▲
                  </BodyText>
                </Pressable>
                <Pressable
                  onPress={() => onMove(g.id, 1)}
                  disabled={i === mainGoals.length - 1}
                  hitSlop={6}
                  accessibilityLabel="下へ移動"
                >
                  <BodyText
                    style={[
                      styles.arrow,
                      i === mainGoals.length - 1 && styles.arrowOff,
                    ]}
                  >
                    ▼
                  </BodyText>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <BodyText
                  style={[styles.rowTitle, active && styles.rowTitleActive]}
                  numberOfLines={1}
                >
                  {mainGoalLabel(g)}
                </BodyText>
                <BodyText style={styles.rowMeta}>
                  {g.year}年{active ? " ・ 表示中" : ""}
                </BodyText>
              </View>

              <Pressable
                onPress={() => confirmDelete(g)}
                disabled={!canDelete}
                hitSlop={8}
                accessibilityLabel="このマンダラを削除"
                style={[styles.trash, !canDelete && styles.trashOff]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={canDelete ? Palette.accent : Palette.faint}
                />
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            key={g.id}
            style={[styles.row, active && styles.rowActive]}
            onPress={() => {
              onSelect(g.id);
              onClose();
            }}
          >
            <View style={{ flex: 1 }}>
              <BodyText
                style={[styles.rowTitle, active && styles.rowTitleActive]}
                numberOfLines={1}
              >
                {mainGoalLabel(g)}
              </BodyText>
              <BodyText style={styles.rowMeta}>{g.year}年</BodyText>
            </View>
            {active && <BodyText style={styles.check}>✓</BodyText>}
          </Pressable>
        );
      })}

      {editing && !canDelete && (
        <BodyText style={styles.lastOneHint}>
          マンダラは最低1つ必要です。新しく作ると、こちらを削除できます。
        </BodyText>
      )}

      {editing ? null : creating ? (
        <View style={styles.createBox}>
          <BodyText style={styles.label}>新しいマンダラ</BodyText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例: 2027年の目標"
            placeholderTextColor={Palette.faint}
            maxLength={40}
            autoFocus
          />
          <View style={styles.yearRow}>
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
          </View>
          <Pressable
            style={[styles.cta, !title.trim() && { opacity: 0.4 }]}
            disabled={!title.trim()}
            onPress={() => {
              onCreate(title.trim(), year);
              onClose();
            }}
          >
            <BodyText style={styles.ctaText}>作成して切り替え</BodyText>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addRow} onPress={() => setCreating(true)}>
          <BodyText style={styles.addText}>＋ 新しいマンダラを作る</BodyText>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  title: { fontSize: 24, flexShrink: 1 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  editBtnActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  editText: { fontSize: 13, color: Palette.inkSoft },
  editTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  editHint: {
    fontSize: 12,
    color: Palette.muted,
    marginTop: -8,
    marginBottom: 12,
  },
  arrows: { alignItems: "center", justifyContent: "center", gap: 2, width: 26 },
  arrow: { fontSize: 13, color: Palette.accent, paddingVertical: 2 },
  arrowOff: { color: Palette.faint },
  trash: {
    padding: 8,
    borderRadius: Radii.sm,
    backgroundColor: Palette.accentSoft,
  },
  trashOff: { backgroundColor: Palette.cardAlt },
  lastOneHint: {
    fontSize: 11.5,
    color: Palette.muted,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    marginBottom: 8,
  },
  rowActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentSoft,
  },
  rowTitle: { fontSize: 15, color: Palette.ink, fontFamily: Fonts.bodyMedium },
  rowTitleActive: { color: Palette.accent, fontFamily: Fonts.bodyBold },
  rowMeta: { fontSize: 12, color: Palette.muted, marginTop: 2 },
  check: { fontSize: 18, color: Palette.accent },
  addRow: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  addText: {
    color: Palette.inkSoft,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
  createBox: { marginTop: 6 },
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
    marginBottom: 14,
  },
  yearRow: { marginBottom: 16 },
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
});
