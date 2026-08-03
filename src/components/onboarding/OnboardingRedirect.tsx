/**
 * 初回起動時だけオンボーディングへ送り出す。
 *
 * ルートレイアウト(app/_layout.tsx)から router.replace で飛ばしていたが、
 * ルートの effect はナビゲーターが遷移を受け付ける前に走るため
 * "Attempted to navigate before mounting the Root Layout" で失敗していた。
 * expo-router の Redirect は画面が表示されてから動く(useFocusEffect)ので、
 * 判定は最初に着地する画面の中で行う。
 *
 * 条件は「未完了 かつ まだ何も入力されていない」の両方。
 * データを持っている既存ユーザーには出さず、設定画面から手動で開いてもらう。
 * スキップした場合も完了扱いになるので、ここには戻ってこない。
 */
import { Redirect } from "expo-router";
import React from "react";

import { selectIsFreshStart, useAppStore } from "@/src/store/useAppStore";
import { useStoresHydrated } from "@/src/store/useHydrated";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";

export function OnboardingRedirect() {
  // 判定は必ず AsyncStorage の復元後に行う(復元前は初期値=空に見えるため)
  const hydrated = useStoresHydrated();
  const hasCompleted = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const isFresh = useAppStore(selectIsFreshStart);

  if (!hydrated || hasCompleted || !isFresh) return null;
  return <Redirect href="/onboarding" />;
}
