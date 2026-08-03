import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { BodyText } from "@/src/components/ui";
import { currentWeekStart } from "@/src/lib/dates";
import {
  REMINDER_TIMES,
  ensureNotificationPermission,
  getPermissionStatus,
  sendTestNotification,
} from "@/src/lib/notifications";
import { useAppStore } from "@/src/store/useAppStore";
import { useNotificationStore } from "@/src/store/useNotificationStore";

export function WeeklyReminderCard() {
  const enabled = useNotificationStore((s) => s.weeklyEnabled);
  const setEnabled = useNotificationStore((s) => s.setWeeklyEnabled);
  const markRequested = useNotificationStore((s) => s.markPermissionRequested);

  // いま催促の対象かどうかを見せると、動きが伝わりやすい
  const weeklyItems = useAppStore((s) => s.weeklyItems);
  const week = currentWeekStart();
  const hasGoalsThisWeek = weeklyItems.some((w) => w.weekStart === week);

  // OS 側の許可は設定アプリで後から変えられるので、開くたびに読み直す
  const [blocked, setBlocked] = useState(false);
  const refreshPermission = useCallback(() => {
    getPermissionStatus()
      .then((p) => setBlocked(!p.granted && !p.canAskAgain))
      .catch(() => setBlocked(false));
  }, []);
  useEffect(refreshPermission, [refreshPermission]);

  const toggle = async (next: boolean) => {
    if (!next) {
      setEnabled(false);
      return;
    }
    markRequested();
    const granted = await ensureNotificationPermission();
    refreshPermission();
    if (!granted) {
      // OS は一度拒否されると再度ダイアログを出せない。設定アプリへ案内する
      Alert.alert(
        "通知が許可されていません",
        "iPhone の「設定」アプリから 目標BOX の通知を許可すると、リマインドを受け取れます。",
        [
          { text: "閉じる", style: "cancel" },
          { text: "設定を開く", onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setEnabled(true);
  };

  const test = async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert("通知が許可されていません");
      return;
    }
    await sendTestNotification();
    Alert.alert("3秒後に通知が届きます", "アプリを閉じた状態でも届きます。");
  };

  return (
    <View style={[styles.card, Shadow]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <BodyText style={styles.title}>今週の目標リマインド</BodyText>
          <BodyText style={styles.note}>
            週のはじめに「今週の目標は何ですか?」とお知らせします。マンダラのマスを今週のリストへ入れるきっかけになります。
          </BodyText>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ false: Palette.border, true: Palette.accent }}
          thumbColor={Palette.white}
          ios_backgroundColor={Palette.border}
          accessibilityLabel="今週の目標リマインドを有効にする"
        />
      </View>

      {blocked && !enabled && (
        <Pressable
          style={styles.blockedRow}
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
        >
          <BodyText style={styles.blockedText}>
            通知がオフになっています。タップして設定アプリを開く ›
          </BodyText>
        </Pressable>
      )}

      {enabled && (
        <View style={styles.detail}>
          {/* いつ何が届くのかを、時系列のまま見せる */}
          <Timing
            when={`毎週 月曜 ${REMINDER_TIMES.morningHour}:00`}
            what="今週の目標は何ですか?"
          />
          <View style={styles.arrow}>
            <BodyText style={styles.arrowText}>
              目標が1つも入っていなければ
            </BodyText>
          </View>
          <Timing
            when={`${REMINDER_TIMES.nudgeDaysLabel} の ${REMINDER_TIMES.nudgeHour}:00`}
            what="今週の目標がまだ空です"
            muted
          />

          <BodyText style={styles.limit}>
            催促は水曜まで。1週間に届く通知は最大
            {REMINDER_TIMES.maxPerWeek}回です。
          </BodyText>

          <BodyText style={styles.status}>
            {hasGoalsThisWeek
              ? "今週はすでに目標が入っているので、夕方の催促は届きません。"
              : "今週はまだ目標が空です。このままだと夕方に催促が届きます。"}
          </BodyText>

          <Pressable
            style={styles.testBtn}
            onPress={test}
            accessibilityRole="button"
          >
            <BodyText style={styles.testBtnText}>通知を試してみる</BodyText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Timing({
  when,
  what,
  muted,
}: {
  when: string;
  what: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.timing}>
      <View style={[styles.dot, muted && styles.dotMuted]} />
      <View style={{ flex: 1 }}>
        <BodyText style={styles.when}>{when}</BodyText>
        <BodyText style={styles.what}>「{what}」</BodyText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Palette.card, borderRadius: Radii.lg, padding: 16 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { color: Palette.ink, fontFamily: Fonts.bodyBold, fontSize: 15 },
  note: { fontSize: 12, color: Palette.muted, lineHeight: 18, marginTop: 8 },

  blockedRow: {
    marginTop: 12,
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  blockedText: { fontSize: 12, color: Palette.salmonDark, lineHeight: 18 },

  detail: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 14,
  },
  timing: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.accent,
    marginTop: 5,
  },
  dotMuted: { backgroundColor: Palette.salmonDark },
  when: { fontSize: 13, color: Palette.ink, fontFamily: Fonts.bodyMedium },
  what: { fontSize: 12, color: Palette.muted, marginTop: 3 },
  arrow: {
    marginLeft: 3,
    paddingLeft: 15,
    paddingVertical: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: Palette.dashed,
    marginVertical: 2,
  },
  arrowText: { fontSize: 11, color: Palette.faint },
  limit: { fontSize: 11, color: Palette.faint, marginTop: 12, marginLeft: 18 },

  status: {
    fontSize: 12,
    color: Palette.inkSoft,
    lineHeight: 18,
    marginTop: 16,
    backgroundColor: Palette.cardAlt,
    borderRadius: Radii.sm,
    padding: 12,
  },

  testBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  testBtnText: {
    fontSize: 13,
    color: Palette.inkSoft,
    fontFamily: Fonts.bodyMedium,
  },
});
