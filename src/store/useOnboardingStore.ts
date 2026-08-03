/**
 * オンボーディング/チュートリアルの表示状態(端末ローカルのUI状態)。
 *
 * 目標データ(MainGoal/SubGoal/MicroGoal)とは意図的に分離している:
 *  - こちらは「この端末でチュートリアルを見たか」だけを持つ
 *
 * Part A(初回起動ウィザード)と Part B(個別機能のコーチマーク)は独立管理する。
 * オンボーディングをスキップしたユーザーにも、各機能のヒントは個別に出したいため。
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createMigratingStorage } from "./persistStorage";

/**
 * Part B(初回訪問時に一度だけ出すヒント)のキー。
 *
 * 仕様には "horizontalScroll"(9×9の横スクロール)もあったが、
 * CLAUDE.md 6章で「横スクロール不可・画面幅に必ず収める」としており
 * 該当する操作が存在しないため設けていない。代わりに全体マップの
 * 「ブロックをタップすると中目標へ移動できる」を mandalaGrid に含めている。
 */
export type HintKey = "mandalaGrid" | "weeklyList" | "progressSummary";

const NO_HINTS_SHOWN: Record<HintKey, boolean> = {
  mandalaGrid: false,
  weeklyList: false,
  progressSummary: false,
};

type OnboardingState = {
  hasCompletedOnboarding: boolean;
  /** Part A を最後まで進めたか(スキップの場合は false)。Part B の出し分けに使う */
  didFinishFlow: boolean;
  hintsShown: Record<HintKey, boolean>;
  /**
   * 設定画面から「実際の画面で見る」と指定されたヒント。
   * 遷移先の画面がこれを見て、既読でも強制的に表示する。
   * 一時的な指示なので永続化しない(partialize を参照)。
   */
  requestedHint: HintKey | null;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  markHintShown: (key: HintKey) => void;
  requestHint: (key: HintKey) => void;
  clearRequestedHint: () => void;
  /** 設定画面の「チュートリアルをもう一度見る」用。目標データには一切触れない */
  resetOnboarding: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      didFinishFlow: false,
      hintsShown: { ...NO_HINTS_SHOWN },
      requestedHint: null,

      completeOnboarding: () =>
        set(() => ({ hasCompletedOnboarding: true, didFinishFlow: true })),

      // スキップでも「もう出さない」扱いにする(入力済みデータはそのまま残る)。
      // didFinishFlow は false のままなので、週次リストのヒントは別途表示される。
      skipOnboarding: () =>
        set(() => ({ hasCompletedOnboarding: true, didFinishFlow: false })),

      markHintShown: (key) =>
        set((s) =>
          s.hintsShown[key]
            ? s
            : { hintsShown: { ...s.hintsShown, [key]: true } },
        ),

      requestHint: (key) => set(() => ({ requestedHint: key })),
      clearRequestedHint: () => set(() => ({ requestedHint: null })),

      resetOnboarding: () =>
        set(() => ({
          hasCompletedOnboarding: false,
          didFinishFlow: false,
          hintsShown: { ...NO_HINTS_SHOWN },
          requestedHint: null,
        })),
    }),
    {
      name: "mokuhyo-box-onboarding-v1",
      // 旧名(MANDALAWEEK)で保存された状態を引き継ぐ
      storage: createMigratingStorage("mandalaweek-onboarding-v1"),
      // requestedHint は一時的な指示なので保存しない(再起動で復活すると誤表示になる)
      partialize: (s) => ({
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        didFinishFlow: s.didFinishFlow,
        hintsShown: s.hintsShown,
      }),
      // 古いバージョンに無いヒントキーが増えても未表示扱いで埋める
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>;
        return {
          ...current,
          ...p,
          hintsShown: { ...NO_HINTS_SHOWN, ...(p.hintsShown ?? {}) },
        };
      },
    },
  ),
);
