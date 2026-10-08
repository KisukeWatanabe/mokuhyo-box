/**
 * オンボーディング表示状態のテスト。
 *
 * ここで一番守りたいのは「resetOnboarding が目標データに触らない」こと
 * (CLAUDE.md 追加機能 2章)。設定画面の「チュートリアルをもう一度見る」で
 * ユーザーの目標が消えたら致命的なので、ストア間の分離をテストで固定する。
 */
import { useAppStore } from "@/src/store/useAppStore";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";
import {
  app,
  freezeTo,
  resetAppStore,
  resetOnboardingStore,
  seedOneMicro,
  WEDNESDAY,
} from "@/test/factories";

const ob = () => useOnboardingStore.getState();

beforeEach(() => {
  freezeTo(WEDNESDAY);
  resetAppStore();
  resetOnboardingStore();
});

describe("初期状態", () => {
  it("未完了・ヒントすべて未表示から始まる", () => {
    expect(ob().hasCompletedOnboarding).toBe(false);
    expect(ob().didFinishFlow).toBe(false);
    expect(ob().hintsShown).toEqual({
      mandalaGrid: false,
      weeklyList: false,
      progressSummary: false,
    });
    expect(ob().requestedHint).toBeNull();
  });
});

describe("completeOnboarding / skipOnboarding", () => {
  it("最後まで進めると両方のフラグが立つ", () => {
    ob().completeOnboarding();
    expect(ob().hasCompletedOnboarding).toBe(true);
    expect(ob().didFinishFlow).toBe(true);
  });

  it("スキップでは didFinishFlow が false のまま", () => {
    // 週次リストのヒントを別途出すための区別(Part B の出し分け)
    ob().skipOnboarding();
    expect(ob().hasCompletedOnboarding).toBe(true);
    expect(ob().didFinishFlow).toBe(false);
  });
});

describe("markHintShown", () => {
  it("指定したヒントだけを既読にする", () => {
    ob().markHintShown("mandalaGrid");
    expect(ob().hintsShown.mandalaGrid).toBe(true);
    expect(ob().hintsShown.weeklyList).toBe(false);
    expect(ob().hintsShown.progressSummary).toBe(false);
  });

  it("二度呼んでも状態オブジェクトを作り直さない(無駄な再描画を避ける)", () => {
    ob().markHintShown("weeklyList");
    const first = ob().hintsShown;
    ob().markHintShown("weeklyList");
    expect(ob().hintsShown).toBe(first);
  });
});

describe("requestHint / clearRequestedHint", () => {
  it("設定画面からの指示を保持し、消化できる", () => {
    ob().requestHint("progressSummary");
    expect(ob().requestedHint).toBe("progressSummary");

    ob().clearRequestedHint();
    expect(ob().requestedHint).toBeNull();
  });

  it("requestedHint は永続化対象に含めない(再起動で誤表示しないため)", () => {
    const persistOptions = (
      useOnboardingStore as unknown as {
        persist: { getOptions: () => { partialize?: (s: unknown) => object } };
      }
    ).persist.getOptions();

    ob().requestHint("mandalaGrid");
    const saved = persistOptions.partialize!(ob());
    expect(saved).not.toHaveProperty("requestedHint");
  });
});

describe("resetOnboarding", () => {
  it("オンボーディング関連のフラグだけを初期化する", () => {
    ob().completeOnboarding();
    ob().markHintShown("mandalaGrid");
    ob().markHintShown("weeklyList");
    ob().requestHint("progressSummary");

    ob().resetOnboarding();

    expect(ob().hasCompletedOnboarding).toBe(false);
    expect(ob().didFinishFlow).toBe(false);
    expect(ob().hintsShown).toEqual({
      mandalaGrid: false,
      weeklyList: false,
      progressSummary: false,
    });
    expect(ob().requestedHint).toBeNull();
  });

  it("目標データには一切触れない", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });
    const before = {
      mainGoals: app().mainGoals,
      subGoals: app().subGoals,
      microGoals: app().microGoals,
      weeklyItems: app().weeklyItems,
    };

    ob().completeOnboarding();
    ob().resetOnboarding();

    const after = useAppStore.getState();
    expect(after.mainGoals).toBe(before.mainGoals);
    expect(after.subGoals).toBe(before.subGoals);
    expect(after.microGoals).toBe(before.microGoals);
    expect(after.weeklyItems).toBe(before.weeklyItems);
    expect(after.microGoals).toHaveLength(1);
    expect(after.weeklyItems).toHaveLength(1);
  });
});
