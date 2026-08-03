/**
 * 初回訪問時に一度だけコーチマークを出すためのフック(Part B)。
 *
 * 既読フラグは AsyncStorage 永続化なので、必ず復元完了を待ってから判定する。
 * 待たずに判定すると、既に見たことがあるユーザーにも毎回出てしまう。
 */
import { useCallback, useEffect, useState } from "react";

import { useStoresHydrated } from "@/src/store/useHydrated";
import { HintKey, useOnboardingStore } from "@/src/store/useOnboardingStore";

type Options = {
  /** 表示条件。タブ切り替え等で「今この画面を見ているか」を渡す */
  enabled?: boolean;
  /** 画面の描画が落ち着くまでの待ち時間(ms) */
  delayMs?: number;
};

export function useFirstVisitHint(
  key: HintKey,
  { enabled = true, delayMs = 500 }: Options = {},
) {
  const hydrated = useStoresHydrated();
  const alreadyShown = useOnboardingStore((s) => s.hintsShown[key]);
  const markHintShown = useOnboardingStore((s) => s.markHintShown);
  // 設定画面から「実際の画面で見る」と指定された場合は、既読でも表示する
  const requested = useOnboardingStore((s) => s.requestedHint === key);
  const clearRequestedHint = useOnboardingStore((s) => s.clearRequestedHint);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    if (!requested && alreadyShown) return;
    const timer = setTimeout(() => {
      setVisible(true);
      // 表示できた時点で指示は消化する(タブを離れても残さない)
      if (requested) clearRequestedHint();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [hydrated, enabled, alreadyShown, requested, clearRequestedHint, delayMs]);

  // 表示条件から外れたら引っ込める(既読にはしない。次に来たときに出す)
  useEffect(() => {
    if (!enabled) setVisible(false);
  }, [enabled]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markHintShown(key);
  }, [key, markHintShown]);

  return { visible, dismiss };
}
