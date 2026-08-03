/**
 * 通知設定(端末ローカルのUI状態)。
 *
 * 目標データとは別ストアにしている。理由は onboardingStore と同じで、
 * 通知は「この端末でどう鳴らすか」の設定であり、目標の中身ではないため。
 *
 * 今は「今週の目標リマインド」1種類だけだが、
 * 通知を増やすときはここにフラグを足し、app/notifications.tsx に行を足す。
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createMigratingStorage } from "./persistStorage";

export type NotificationState = {
  /** 「今週の目標は何ですか?」のリマインド(月曜朝 + 未設定なら夕方に催促) */
  weeklyEnabled: boolean;
  /**
   * 一度でも通知の許可を求めたか。
   * 「まだ聞いていない」と「拒否された」を書き分けるために持つ。
   */
  permissionRequested: boolean;
};

type Actions = {
  setWeeklyEnabled: (enabled: boolean) => void;
  markPermissionRequested: () => void;
};

export const useNotificationStore = create<NotificationState & Actions>()(
  persist(
    (set) => ({
      weeklyEnabled: false,
      permissionRequested: false,

      setWeeklyEnabled: (weeklyEnabled) => set({ weeklyEnabled }),
      markPermissionRequested: () => set({ permissionRequested: true }),
    }),
    {
      name: "mokuhyo-box-notifications-v1",
      version: 2,
      // 旧名(MANDALAWEEK)で保存された設定を引き継ぐ
      storage: createMigratingStorage("mandalaweek-notifications-v1"),
      migrate: (persisted: any, version) => {
        // v1 は曜日と時刻を持っていた。月曜6時固定にしたので捨てる。
        if (version < 2 && persisted) {
          delete persisted.weeklyWeekday;
          delete persisted.weeklyHour;
          delete persisted.weeklyMinute;
        }
        return persisted;
      },
    },
  ),
);
