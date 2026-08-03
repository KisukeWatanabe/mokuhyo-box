/**
 * 通知まわりを OS とつなぐフック。
 *
 * expo-notifications を直接触るのは src/lib/notifications.ts とこのファイルだけに
 * とどめている(画面側は設定ストアを更新するだけでよくする)。
 */
import { Href, useRouter } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import {
  configureNotificationHandler,
  setupAndroidChannel,
  syncGoalReminders,
} from "../lib/notifications";
import { useAppStore } from "../store/useAppStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { WeeklyItem } from "../types";

// アプリを開いている間の表示方法。読み込み時に一度だけ設定すればよい
configureNotificationHandler();

/**
 * 目標が入っている週を、比較しやすい1本の文字列にする。
 *
 * weeklyItems の配列は再計算のたびに新しい参照になるため、そのまま
 * 依存配列に入れるとチェックを1つ付けるだけで通知を貼り直してしまう。
 * 「どの週に目標があるか」だけが通知に効くので、そこまで削ってから比べる。
 */
function weeksWithGoalsKey(items: WeeklyItem[]): string {
  return Array.from(new Set(items.map((i) => i.weekStart)))
    .sort()
    .join(",");
}

/**
 * 通知の予約を、設定と週次リストの状況に合わせて貼り直す。
 * 起動のたびに走らせる(端末再起動や時刻変更で OS 側の予約が
 * 失われることがあるため、開いたときに貼り直しておく)。
 *
 * @param ready 保存データの復元が終わったか。復元前は空に見えるので待つ
 */
export function useGoalReminderSync(ready: boolean) {
  const enabled = useNotificationStore((s) => s.weeklyEnabled);
  const weeksKey = useAppStore((s) => weeksWithGoalsKey(s.weeklyItems));

  useEffect(() => {
    if (!ready) return;
    setupAndroidChannel();
    syncGoalReminders({
      enabled,
      weeksWithGoals: new Set(weeksKey ? weeksKey.split(",") : []),
    }).catch(() => {
      // 許可が取り消された等で失敗しても、アプリの動作は止めない
    });
  }, [ready, enabled, weeksKey]);
}

/** 通知をタップして開いたときに、その通知が指す画面へ移動する */
export function useNotificationTapRouting() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const route = res.notification.request.content.data?.route;
      if (typeof route === "string") router.navigate(route as Href);
    });
    return () => sub.remove();
  }, [router]);
}
