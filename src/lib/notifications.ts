/**
 * ローカル通知のスケジューリング。
 *
 * 端末内で完結するローカル通知だけを使う。端末トークンを外部へ送る
 * プッシュ通知は使わないので、外部への通信は発生しない
 * (プライバシーポリシーの「外部送信なし」を保つための方針)。
 *
 * ── 「目標が0件なら催促する」をどう実現しているか ────────────────
 * 通知は OS に前もって予約する仕組みで、鳴る瞬間にアプリが条件を判定する
 * ことはできない。そこで逆向きに作っている:
 *
 *   1. 催促(18:00)を先に予約しておく
 *   2. 目標が入ったら、その週の催促を取り消す
 *
 * 週次リストはアプリを開かないと変化しないので、
 * 「開いたときに予約を貼り直す」だけで常に正しい状態を保てる。
 * ──────────────────────────────────────────────
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { addDays, parseKey, todayKey, weekStartOf } from "./dates";

/** 週のはじめの声かけ(毎週月曜に繰り返す) */
export const MONDAY_REMINDER_ID = "weekly-goal-reminder";
/** 催促の識別子は日付ごと。まとめて消せるよう接頭辞を決めておく */
const NUDGE_PREFIX = "weekly-goal-nudge-";

/** expo-notifications の weekday は 1=日曜。月曜は 2 */
const MONDAY = 2;
/** 週のはじめの声かけを送る時刻 */
const MORNING_HOUR = 6;
/** 目標が空のときに催促する時刻 */
const NUDGE_HOUR = 18;
/**
 * 催促する曜日(Date.getDay() の値。1=月 2=火 3=水)。
 * 水曜で打ち切るのは、週の後半まで言い続けても目標を立てる意味が薄れるうえ、
 * 毎日鳴らし続けると通知そのものを切られてしまうため。
 * 結果、1週間に届く通知は最大4回(月6:00 + 月火水 18:00)。
 */
const NUDGE_WEEKDAYS = [1, 2, 3];
/**
 * 催促を何日先まで予約しておくか。
 * 週をまたいでもアプリを開かない人に届けるため、2週間ぶん確保する。
 */
const NUDGE_LOOKAHEAD_DAYS = 14;

const MORNING_CONTENT = {
  title: "今週の目標は何ですか?",
  body: "マンダラのマスから、今週やることを決めましょう。",
};

const NUDGE_CONTENT = {
  title: "今週の目標がまだ空です",
  body: "1つだけでも決めておくと、今週が動き出します。",
};

/** 通知タップ時の遷移先。data に載せて受け取り側で使う */
export const WEEK_ROUTE = "/(tabs)/week";

/**
 * アプリを開いている間に通知が届いたときの扱い。
 * 音は鳴らさずバナーだけ出す(静かに気づかせたいだけなので)。
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * 通知の許可を取る。
 * 既に許可済みなら何も聞かずに true。拒否済みの場合は OS が再度ダイアログを
 * 出させてくれないため false を返し、呼び出し側で設定アプリへ誘導する。
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

/** 現在の許可状態(設定画面の表示用) */
export async function getPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const p = await Notifications.getPermissionsAsync();
  return { granted: p.granted, canAskAgain: p.canAskAgain };
}

export type ReminderSyncInput = {
  enabled: boolean;
  /** 目標が1件以上ある週(週開始日 YYYY-MM-DD)の集合 */
  weeksWithGoals: Set<string>;
};

/**
 * 予約を設定内容に合わせて貼り直す。
 * 起動のたび・週次リストが変わるたびに呼んでよい(毎回作り直すので冪等)。
 */
export async function syncGoalReminders(input: ReminderSyncInput): Promise<void> {
  // 催促は「今の状況」から組み直すので、まず今あるぶんを全部消す。
  // 過ぎた週の予約が残っていても、ここでまとめて片付く。
  await cancelAllNudges();

  if (!input.enabled) {
    await cancelById(MONDAY_REMINDER_ID);
    return;
  }

  await scheduleMondayReminder();
  await scheduleNudges(input.weeksWithGoals);
}

/** 月曜朝の声かけ。毎週繰り返すので一度登録すれば足りる */
async function scheduleMondayReminder(): Promise<void> {
  await cancelById(MONDAY_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: MONDAY_REMINDER_ID,
    content: { ...MORNING_CONTENT, data: { route: WEEK_ROUTE }, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: MONDAY,
      hour: MORNING_HOUR,
      minute: 0,
    },
  });
}

/**
 * 目標が空の週の 月・火・水 に、18:00 の催促を仕込む。
 * 目標が入っている週はまるごと飛ばすので、1件でも入れれば催促は止まる。
 */
async function scheduleNudges(weeksWithGoals: Set<string>): Promise<void> {
  const now = new Date();
  const today = todayKey();

  for (let i = 0; i < NUDGE_LOOKAHEAD_DAYS; i++) {
    const dateKey = addDays(today, i);
    // その日が属する週に目標があるなら、その日は催促しない
    if (weeksWithGoals.has(weekStartOf(parseKey(dateKey)))) continue;

    const at = parseKey(dateKey);
    if (!NUDGE_WEEKDAYS.includes(at.getDay())) continue; // 木曜以降は催促しない

    at.setHours(NUDGE_HOUR, 0, 0, 0);
    if (at <= now) continue; // 今日の18時を過ぎていれば今日は飛ばす

    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_PREFIX + dateKey,
      content: { ...NUDGE_CONTENT, data: { route: WEEK_ROUTE }, sound: false },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });
  }
}

/** 予約済みの催促を全部消す */
async function cancelAllNudges(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(NUDGE_PREFIX))
      .map((n) => cancelById(n.identifier)),
  );
}

/** 未登録の識別子を消そうとすると例外になるので、握りつぶす */
async function cancelById(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/**
 * 動作確認用に、数秒後に月曜朝と同じ通知を1回出す。
 * 「どんな通知が届くのか」を設定画面で試せるようにするため。
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { ...MORNING_CONTENT, data: { route: WEEK_ROUTE }, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      repeats: false,
    },
  });
}

/** Android の通知チャンネル。iOS では何もしない */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "リマインド",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#BC5B37",
  });
}

/** 設定画面の説明文に使う値。定数を書き写さず、ここから引くこと */
export const REMINDER_TIMES = {
  morningHour: MORNING_HOUR,
  nudgeHour: NUDGE_HOUR,
  /** 催促する曜日の表示("月・火・水") */
  nudgeDaysLabel: NUDGE_WEEKDAYS.map((d) => "日月火水木金土"[d]).join("・"),
  /** 1週間に届く上限。朝の声かけ1回 + 催促の日数 */
  maxPerWeek: 1 + NUDGE_WEEKDAYS.length,
} as const;
