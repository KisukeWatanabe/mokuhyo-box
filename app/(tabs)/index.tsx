import { Href, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { GoalMapGrid } from "@/src/components/mandala/GoalMapGrid";
import { OverviewGrid } from "@/src/components/mandala/OverviewGrid";
import { CoachMark } from "@/src/components/onboarding/CoachMark";
import { OnboardingRedirect } from "@/src/components/onboarding/OnboardingRedirect";
import { HINTS } from "@/src/components/onboarding/hintContent";
import { EditGoalSheet } from "@/src/components/sheets/EditGoalSheet";
import { MainGoalEditSheet } from "@/src/components/sheets/MainGoalEditSheet";
import { MandalaSwitcherSheet } from "@/src/components/sheets/MandalaSwitcherSheet";
import { BodyText, HandText } from "@/src/components/ui";
import { useFirstVisitHint } from "@/src/hooks/useFirstVisitHint";
import { mainGoalLabel } from "@/src/lib/labels";
import { estimateTextWidth } from "@/src/lib/textWidth";
import {
  orderMainGoals,
  selectActiveMainGoal,
  useAppStore,
} from "@/src/store/useAppStore";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";
import { SubGoal } from "@/src/types";

/**
 * ピル型ボタンは幅が中身ぴったりに決まるため、iOS の実測幅が描画幅より
 * 小さく出る端末では最後の1文字が欠ける。必要幅を自前で見積もって確保する。
 */
const PILL_FRAME = 12 * 2 + 1 * 2; // reorderBtn の paddingHorizontal + borderWidth
const SAMPLE_BTN_MIN_WIDTH = estimateTextWidth("＋ 記入例", 12) + PILL_FRAME;
/** 「⇄ 入れ替え」と「完了」で幅が変わらないよう、広いほうに合わせる */
const REORDER_BTN_MIN_WIDTH =
  Math.max(estimateTextWidth("⇄ 入れ替え", 12), estimateTextWidth("完了", 12)) +
  PILL_FRAME;

type SheetState =
  | { kind: "none" }
  | { kind: "createSub"; position: number }
  | { kind: "editSub"; sub: SubGoal }
  | { kind: "editMain" };

/** 目標マップ(中目標タブ)/ 全体マップ(全体タブ) */
export default function MandalaScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const mainGoals = useAppStore((s) => s.mainGoals);
  const activeMainGoalId = useAppStore((s) => s.activeMainGoalId);
  const mainGoal = useAppStore(selectActiveMainGoal);
  const allSubGoals = useAppStore((s) => s.subGoals);
  const allMicroGoals = useAppStore((s) => s.microGoals);
  const upsertSubGoal = useAppStore((s) => s.upsertSubGoal);
  const deleteSubGoal = useAppStore((s) => s.deleteSubGoal);
  const swapSubGoals = useAppStore((s) => s.swapSubGoals);
  const addMainGoal = useAppStore((s) => s.addMainGoal);
  const moveMainGoal = useAppStore((s) => s.moveMainGoal);
  const setActiveMainGoal = useAppStore((s) => s.setActiveMainGoal);
  const updateMainGoal = useAppStore((s) => s.updateMainGoal);
  const deleteMainGoal = useAppStore((s) => s.deleteMainGoal);
  const loadSample = useAppStore((s) => s.loadSample);

  // 切り替えリストはユーザーが決めた並び順で見せる
  const orderedMainGoals = React.useMemo(
    () => orderMainGoals(mainGoals),
    [mainGoals],
  );

  // アクティブなマンダラに属する中目標/極小目標だけに絞る
  const subGoals = allSubGoals.filter((g) => g.mainGoalId === mainGoal.id);
  const subIds = new Set(subGoals.map((g) => g.id));
  const microGoals = allMicroGoals.filter((m) => subIds.has(m.subGoalId));

  const [view, setView] = useState<"sub" | "all">("sub");
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  // Part B: 表示中のビューに応じて、それぞれ初回だけヒントを出す
  const goalMapRef = useRef<View>(null);
  const overviewRef = useRef<View>(null);

  // 設定画面から特定のヒントを指定して来た場合、対象が映るビューへ切り替える
  const requestedHint = useOnboardingStore((s) => s.requestedHint);
  React.useEffect(() => {
    const wanted = requestedHint && HINTS[requestedHint].mandalaView;
    if (wanted) setView(wanted);
  }, [requestedHint]);

  const progressHint = useFirstVisitHint("progressSummary", {
    enabled: view === "sub",
  });
  const gridHint = useFirstVisitHint("mandalaGrid", {
    enabled: view === "all",
  });

  // 入れ替え選択: 1つ目=選択、2つ目=入れ替え(空きマスへの移動もOK)
  const selectOrSwap = (position: number) => {
    if (swapSource === null) {
      setSwapSource(position);
    } else if (swapSource !== position) {
      swapSubGoals(swapSource, position);
      setSwapSource(null);
    } else {
      setSwapSource(null);
    }
  };

  const handlePressSub = (sub: SubGoal) => {
    if (reordering || swapSource !== null) {
      selectOrSwap(sub.position);
      return;
    }
    router.push(`/subgoal/${sub.id}` as Href);
  };

  const handlePressEmpty = (position: number) => {
    if (reordering || swapSource !== null) {
      selectOrSwap(position);
      return;
    }
    setSheet({ kind: "createSub", position });
  };

  const exitReorder = () => {
    setReordering(false);
    setSwapSource(null);
  };

  /**
   * 81マス埋まった記入例を「別のマンダラ」として追加する。
   * 何を書けばいいか分からないときに、完成形を見て真似できるようにするため。
   *
   * いま編集中の内容は消えないが、表示が記入例に切り替わるので確認をはさむ。
   * (元に戻すには切り替えメニューから選び直す/記入例を削除する)
   */
  const confirmLoadSample = () => {
    Alert.alert(
      "記入例を追加しますか?",
      "81マスすべて埋まったマンダラを、別のマンダラとして追加します。いま作っている内容はそのまま残ります。不要になったら切り替えメニューから削除できます。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "追加する", onPress: () => loadSample() },
      ],
    );
  };

  return (
    <Screen>
      {/* 初回起動ならオンボーディングへ。
          遷移はルートレイアウトではなく、最初に着地するこの画面から行う
          (ルートの effect はナビゲーターの準備前に走って失敗するため)。 */}
      <OnboardingRedirect />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* マンダラ切り替え(タップで一覧) */}
        <Pressable
          style={[
            styles.switcher,
            {
              // 内容ぴったり幅だと iOS の実測不足で末尾が「…」になるため、
              // 必要幅を見積もって確保する(画面幅は超えないよう頭打ち)
              minWidth: Math.min(
                estimateTextWidth(mainGoalLabel(mainGoal), 13) + 12 * 2 + 6 + 12,
                screenWidth - 20 * 2,
              ),
            },
          ]}
          onPress={() => setSwitcherOpen(true)}
        >
          <BodyText style={styles.switcherText} numberOfLines={1}>
            {mainGoalLabel(mainGoal)}
          </BodyText>
          <BodyText style={styles.switcherCaret}>▼</BodyText>
        </Pressable>

        <View style={styles.headerRow}>
          <HandText style={styles.title}>
            {view === "sub" ? "目標マップ" : "全体マップ"}
          </HandText>
          <View style={styles.toggle}>
            {(
              [
                ["sub", "中目標"],
                ["all", "全体"],
              ] as const
            ).map(([key, label]) => {
              const active = view === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setView(key);
                    setSwapSource(null);
                    setReordering(false);
                  }}
                  style={[
                    styles.toggleBtn,
                    { minWidth: estimateTextWidth(label, 13) + 14 * 2 },
                    active && styles.toggleBtnActive,
                  ]}
                >
                  <BodyText
                    style={[
                      styles.toggleText,
                      active && styles.toggleTextActive,
                    ]}
                  >
                    {label}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.subtitleRow}>
          <BodyText style={styles.subtitle}>
            {view === "sub"
              ? `大目標 ・ 中目標${subGoals.length}`
              : "9 × 9 ・ 81マス"}
          </BodyText>
          {view === "sub" && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={confirmLoadSample}
                style={[
                  styles.reorderBtn,
                  { minWidth: SAMPLE_BTN_MIN_WIDTH },
                ]}
                accessibilityRole="button"
                accessibilityLabel="記入例のマンダラを追加する"
              >
                <BodyText style={styles.reorderBtnText}>＋ 記入例</BodyText>
              </Pressable>
              <Pressable
                onPress={() =>
                  reordering ? exitReorder() : setReordering(true)
                }
                style={[
                  styles.reorderBtn,
                  { minWidth: REORDER_BTN_MIN_WIDTH },
                  reordering && styles.reorderBtnActive,
                ]}
                accessibilityRole="button"
              >
                <BodyText
                  style={[
                    styles.reorderBtnText,
                    reordering && styles.reorderBtnTextActive,
                  ]}
                >
                  {reordering ? "完了" : "⇄ 入れ替え"}
                </BodyText>
              </Pressable>
            </View>
          )}
        </View>

        {view === "sub" ? (
          <>
            <View ref={goalMapRef} collapsable={false}>
              <GoalMapGrid
                mainGoal={mainGoal}
                subGoals={subGoals}
                microGoals={microGoals}
                swapSource={swapSource}
                onPressSub={handlePressSub}
                onLongPressSub={(sub) => setSheet({ kind: "editSub", sub })}
                onPressEmpty={handlePressEmpty}
                onPressCenter={() => setSheet({ kind: "editMain" })}
              />
            </View>
            <BodyText style={styles.hint}>
              {reordering
                ? "入れ替えたい2つのマスをタップ(空きマスへ移動もOK)"
                : swapSource !== null
                  ? "入れ替え先のマスをタップ(同じマスで解除)"
                  : "中央の大目標をタップ → マンダラチャートの編集・削除"}
            </BodyText>
          </>
        ) : (
          // 全体マップは横スクロールで見せるため、親の左右パディングを打ち消す
          <View
            style={styles.overviewBreakout}
            ref={overviewRef}
            collapsable={false}
          >
            <OverviewGrid
              mainGoal={mainGoal}
              subGoals={subGoals}
              microGoals={microGoals}
              onPressBlock={(sub) => router.push(`/subgoal/${sub.id}` as Href)}
            />
          </View>
        )}
      </ScrollView>

      {/* Part B: 初回訪問時のヒント(それぞれ1回だけ) */}
      <CoachMark
        visible={progressHint.visible}
        targetRef={goalMapRef}
        title={HINTS.progressSummary.title}
        body={HINTS.progressSummary.body}
        onClose={progressHint.dismiss}
      />
      <CoachMark
        visible={gridHint.visible}
        targetRef={overviewRef}
        title={HINTS.mandalaGrid.title}
        body={HINTS.mandalaGrid.body}
        onClose={gridHint.dismiss}
      />

      <EditGoalSheet
        visible={sheet.kind === "createSub"}
        heading="新しい中目標"
        placeholder="例: 体づくり"
        autoFocusTitle
        onSave={({ title }) => {
          if (sheet.kind === "createSub") upsertSubGoal(sheet.position, title);
        }}
        onClose={() => setSheet({ kind: "none" })}
      />
      <EditGoalSheet
        visible={sheet.kind === "editSub"}
        heading="中目標を編集"
        initialTitle={sheet.kind === "editSub" ? sheet.sub.title : ""}
        onSave={({ title }) => {
          if (sheet.kind === "editSub")
            upsertSubGoal(sheet.sub.position, title);
        }}
        onDelete={() => {
          if (sheet.kind === "editSub") deleteSubGoal(sheet.sub.id);
        }}
        onSwap={() => {
          if (sheet.kind === "editSub") setSwapSource(sheet.sub.position);
        }}
        onClose={() => setSheet({ kind: "none" })}
      />
      <MainGoalEditSheet
        visible={sheet.kind === "editMain"}
        mainGoal={mainGoal}
        canDelete={mainGoals.length > 1}
        onSave={({ title, year }) =>
          updateMainGoal(mainGoal.id, { title, year })
        }
        onDelete={() => deleteMainGoal(mainGoal.id)}
        onClose={() => setSheet({ kind: "none" })}
      />

      <MandalaSwitcherSheet
        visible={switcherOpen}
        mainGoals={orderedMainGoals}
        activeId={activeMainGoalId}
        onSelect={(id) => {
          setActiveMainGoal(id);
          setSwapSource(null);
          setReordering(false);
        }}
        onCreate={(title, year) => addMainGoal(title, year)}
        onMove={moveMainGoal}
        onDelete={deleteMainGoal}
        onClose={() => setSwitcherOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  overviewBreakout: { marginHorizontal: -20 },
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    maxWidth: "100%",
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  switcherText: {
    fontSize: 13,
    color: Palette.inkSoft,
    fontFamily: Fonts.bodyBold,
    flexShrink: 1,
  },
  switcherCaret: { fontSize: 10, color: Palette.muted },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // flex:1 は文字切れ対策。行の中で「内容ぴったり幅」になると、
  // iOS の実測幅が描画幅より小さい端末で末尾が欠ける
  title: { fontSize: 32, flex: 1 },
  toggle: {
    flexDirection: "row",
    backgroundColor: Palette.cardAlt,
    borderRadius: Radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.md - 3,
  },
  toggleBtnActive: { backgroundColor: Palette.accent },
  toggleText: { fontSize: 13, color: Palette.muted, textAlign: "center" },
  toggleTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 18,
  },
  subtitle: { color: Palette.muted, fontSize: 13, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8 },
  reorderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  reorderBtnActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  // minWidth で広げたぶんを中央寄せで受ける(親は既定の stretch なので
  // テキスト自体はボタンの内寸いっぱいの幅を持つ = 実測幅に依存しない)
  reorderBtnText: { fontSize: 12, color: Palette.inkSoft, textAlign: "center" },
  reorderBtnTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
  hint: {
    textAlign: "center",
    color: Palette.inkSoft,
    fontSize: 13,
    marginTop: 24,
  },
});
