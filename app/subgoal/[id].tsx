import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { MicroGrid } from "@/src/components/mandala/MicroGrid";
import { EditGoalSheet } from "@/src/components/sheets/EditGoalSheet";
import { TakeInSheet } from "@/src/components/sheets/TakeInSheet";
import { BodyText, HandText } from "@/src/components/ui";
import { useAppStore } from "@/src/store/useAppStore";
import { MicroGoal } from "@/src/types";

type SheetState =
  | { kind: "none" }
  | { kind: "takeIn"; micro: MicroGoal }
  | { kind: "create"; position: number }
  | { kind: "edit"; micro: MicroGoal };

/** 中目標詳細(小目標の 3×3 グリッド) */
export default function SubGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // 注意: zustand のセレクタで filter/find の結果(新規参照)を返すと
  // 無限再レンダーになるため、生の配列を選択してレンダー内で絞り込む
  const subGoals = useAppStore((s) => s.subGoals);
  const allMicroGoals = useAppStore((s) => s.microGoals);
  const subGoal = subGoals.find((g) => g.id === id);
  const microGoals = allMicroGoals.filter((m) => m.subGoalId === id);
  const addMicroGoal = useAppStore((s) => s.addMicroGoal);
  const updateMicroGoal = useAppStore((s) => s.updateMicroGoal);
  const deleteMicroGoal = useAppStore((s) => s.deleteMicroGoal);
  const swapMicroGoals = useAppStore((s) => s.swapMicroGoals);
  const upsertSubGoal = useAppStore((s) => s.upsertSubGoal);

  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [editingCenter, setEditingCenter] = useState(false);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  if (!subGoal) {
    return (
      <Screen>
        <View style={styles.missing}>
          <BodyText>この中目標は削除されました</BodyText>
          <Pressable onPress={() => router.back()}>
            <BodyText style={styles.backLink}>‹ 目標マップへ戻る</BodyText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // 入れ替え選択: 1つ目=選択、2つ目=入れ替え(空きマスへの移動もOK)
  const selectOrSwap = (position: number) => {
    if (swapSource === null) {
      setSwapSource(position);
    } else if (swapSource !== position) {
      swapMicroGoals(subGoal.id, swapSource, position);
      setSwapSource(null);
    } else {
      setSwapSource(null);
    }
  };

  const handlePressMicro = (micro: MicroGoal) => {
    if (reordering || swapSource !== null) {
      selectOrSwap(micro.position);
      return;
    }
    // タップ=編集
    setSheet({ kind: "edit", micro });
  };

  const handlePressEmpty = (position: number) => {
    if (reordering || swapSource !== null) {
      selectOrSwap(position);
      return;
    }
    setSheet({ kind: "create", position });
  };

  const exitReorder = () => {
    setReordering(false);
    setSwapSource(null);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backRow}>
          <BodyText style={styles.backText}>‹ 目標マップ</BodyText>
        </Pressable>
        <View style={styles.titleRow}>
          <HandText style={styles.title}>{subGoal.title}</HandText>
          <Pressable
            onPress={() => (reordering ? exitReorder() : setReordering(true))}
            style={[styles.reorderBtn, reordering && styles.reorderBtnActive]}
          >
            <BodyText
              style={[
                styles.reorderBtnText,
                reordering && styles.reorderBtnTextActive,
              ]}
            >
              {reordering ? "完了" : "⇄ 並べ替え"}
            </BodyText>
          </Pressable>
        </View>

        <MicroGrid
          subGoal={subGoal}
          microGoals={microGoals}
          swapSource={swapSource}
          onPressMicro={handlePressMicro}
          onLongPressMicro={(micro) => setSheet({ kind: "takeIn", micro })}
          onPressEmpty={handlePressEmpty}
          onPressCenter={() => setEditingCenter(true)}
        />

        <BodyText style={styles.hint}>
          {reordering
            ? "入れ替えたい2つのマスをタップ(空きマスへ移動もOK)"
            : swapSource !== null
              ? "入れ替え先のマスをタップ"
              : "マスをタップで編集 ・ 長押しで今週のリストへ追加"}
        </BodyText>
      </ScrollView>

      <TakeInSheet
        micro={sheet.kind === "takeIn" ? sheet.micro : null}
        subGoalTitle={subGoal.title}
        onClose={() => setSheet({ kind: "none" })}
      />
      <EditGoalSheet
        visible={sheet.kind === "create"}
        heading="新しい極小目標"
        placeholder="例: 朝ストレッチ"
        initialFrequency="毎日"
        autoFocusTitle
        onSave={(p) => {
          if (sheet.kind === "create")
            addMicroGoal(subGoal.id, sheet.position, {
              title: p.title,
              frequencyType: p.frequencyType ?? "毎日",
              progressType: p.progressType ?? "○×型",
              targetCount: p.targetCount,
              numericTarget: p.numericTarget,
              numericUnit: p.numericUnit,
              checklistTarget: p.checklistTarget,
            });
        }}
        onClose={() => setSheet({ kind: "none" })}
      />
      <EditGoalSheet
        visible={sheet.kind === "edit"}
        heading="極小目標を編集"
        initialTitle={sheet.kind === "edit" ? sheet.micro.title : ""}
        initialFrequency={sheet.kind === "edit" ? sheet.micro.frequencyType : "毎日"}
        initialProgressType={sheet.kind === "edit" ? sheet.micro.progressType : "○×型"}
        initialTargetCount={sheet.kind === "edit" ? sheet.micro.targetCount ?? 3 : 3}
        initialNumericTarget={sheet.kind === "edit" ? sheet.micro.numericTarget : undefined}
        initialNumericUnit={sheet.kind === "edit" ? sheet.micro.numericUnit ?? "" : ""}
        initialChecklistTarget={
          sheet.kind === "edit" ? sheet.micro.checklistTarget ?? 3 : 3
        }
        showStatusPicker
        initialManualStatus={
          sheet.kind === "edit" ? sheet.micro.manualStatus ?? null : null
        }
        onSave={(p) => {
          if (sheet.kind === "edit")
            updateMicroGoal(sheet.micro.id, {
              title: p.title,
              frequencyType: p.frequencyType,
              progressType: p.progressType,
              targetCount: p.targetCount,
              numericTarget: p.numericTarget,
              numericUnit: p.numericUnit,
              checklistTarget: p.checklistTarget,
              manualStatus: p.manualStatus,
            });
        }}
        onDelete={() => {
          if (sheet.kind === "edit") deleteMicroGoal(sheet.micro.id);
        }}
        onSwap={() => {
          if (sheet.kind === "edit") setSwapSource(sheet.micro.position);
        }}
        onClose={() => setSheet({ kind: "none" })}
      />
      <EditGoalSheet
        visible={editingCenter}
        heading="中目標を編集"
        initialTitle={subGoal.title}
        onSave={({ title }) => upsertSubGoal(subGoal.position, title)}
        onClose={() => setEditingCenter(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  backRow: { marginBottom: 6 },
  backText: { color: Palette.muted, fontSize: 14 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  title: { fontSize: 34, flex: 1 },
  reorderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  reorderBtnActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  reorderBtnText: { fontSize: 12, color: Palette.inkSoft },
  reorderBtnTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  hint: {
    textAlign: "center",
    color: Palette.inkSoft,
    fontSize: 13,
    marginTop: 24,
  },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  backLink: { color: Palette.accent },
});
