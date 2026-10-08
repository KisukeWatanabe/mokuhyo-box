/**
 * テスト用の共通ヘルパー。
 *
 * ここで扱う難所は2つある。
 *
 * 1. 時刻依存
 *    ストアと dates.ts は currentWeekStart() / todayKey() 経由で「今」を見る。
 *    テストごとに freezeTo() で時刻を固定しないと、実行した週によって
 *    結果が変わる(月曜の午前0時をまたぐと落ちる)テストになってしまう。
 *
 *    固定する時刻は「ローカル時刻の正午」で作る(new Date(y, m-1, d, 12))。
 *    UTC で作るとタイムゾーンによって前日/翌日に転ぶが、ローカル正午なら
 *    どのタイムゾーンでもその日のままなので、TZ を固定せずに済む。
 *
 * 2. ストアがモジュールシングルトン
 *    Zustand ストアはテスト間で共有される。各テストの前に resetAppStore() を
 *    呼んで状態を作り直すこと。
 */
import { useAppStore } from "@/src/store/useAppStore";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";
import type {
  FrequencyType,
  MainGoal,
  MicroGoal,
  ProgressType,
  SubGoal,
  WeeklyItem,
} from "@/src/types";

/** 2026-07-06(月)。CLAUDE.md 4.5 の例「7/6-7/12」と同じ週 */
export const MONDAY = "2026-07-06";
/** MONDAY の週の水曜 */
export const WEDNESDAY = "2026-07-08";
/** MONDAY の前の週の月曜 */
export const PREV_MONDAY = "2026-06-29";

/**
 * 「今」を指定日のローカル正午に固定する。
 *
 * Date だけを止めたいので、非同期処理の土台(microtask / setImmediate)は
 * 実物のまま残す。persist の AsyncStorage 書き込みが止まらないようにするため。
 */
export function freezeTo(dateKey: string, hour = 12): void {
  const [y, m, d] = dateKey.split("-").map(Number);
  jest.useFakeTimers({
    now: new Date(y, m - 1, d, hour),
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
}

let seq = 0;
/** テスト内で読みやすい連番 ID */
function tid(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function makeMainGoal(over: Partial<MainGoal> = {}): MainGoal {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: tid("main"),
    title: "大目標",
    year: 2026,
    progressRate: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

export function makeSubGoal(
  mainGoalId: string,
  over: Partial<SubGoal> = {},
): SubGoal {
  return {
    id: tid("sub"),
    mainGoalId,
    title: "中目標",
    position: 1,
    progressRate: 0,
    ...over,
  };
}

export function makeMicroGoal(
  subGoalId: string,
  over: Partial<MicroGoal> = {},
): MicroGoal {
  return {
    id: tid("micro"),
    subGoalId,
    title: "極小目標",
    position: 1,
    frequencyType: "毎日",
    progressType: "○×型",
    progressValue: {},
    status: "未着手",
    linkedWeeklyItemIds: [],
    ...over,
  };
}

export function makeWeeklyItem(over: Partial<WeeklyItem> = {}): WeeklyItem {
  return {
    id: tid("week"),
    weekStart: MONDAY,
    title: "週次項目",
    progressType: "○×型",
    frequencyType: "毎日",
    doneDates: [],
    completed: false,
    createdAt: "2026-07-06T00:00:00.000Z",
    ...over,
  };
}

type SeedInput = {
  mainGoals?: MainGoal[];
  activeMainGoalId?: string;
  subGoals?: SubGoal[];
  microGoals?: MicroGoal[];
  weeklyItems?: WeeklyItem[];
};

/**
 * ストアを指定の状態に置き換える。
 *
 * 注意: ここは生データを流し込むだけなので progressRate / status は
 * 再計算されない。集計結果を見たいテストは、何かアクションを1つ呼んでから
 * 読むこと(再計算はアクション経由で走る)。
 */
export function resetAppStore(seed: SeedInput = {}): void {
  seq = 0;
  const main = seed.mainGoals ?? [makeMainGoal({ id: "main0" })];
  useAppStore.setState({
    mainGoals: main,
    activeMainGoalId: seed.activeMainGoalId ?? main[0].id,
    subGoals: seed.subGoals ?? [],
    microGoals: seed.microGoals ?? [],
    weeklyItems: seed.weeklyItems ?? [],
    reviews: [],
  });
}

export function resetOnboardingStore(): void {
  useOnboardingStore.getState().resetOnboarding();
}

/** 現在のストア状態(アクションを除いたデータ部)を読む近道 */
export const app = () => useAppStore.getState();

/**
 * 再計算だけを走らせる。
 *
 * resetAppStore() は生データを流し込むだけなので、派生値
 * (weeklyItems.completed / microGoals.status / progressRate)は未計算のまま。
 * これらを見るテストは先にこれを呼んで、アプリと同じ再計算を通しておく。
 *
 * updateMainGoalTitle は recalc を伴うアクションの中で最も副作用が小さい。
 * 現在と同じタイトルを渡すので、データ上の変化は updatedAt だけ。
 */
export function recalcNow(): void {
  const active = app().mainGoals.find((g) => g.id === app().activeMainGoalId);
  app().updateMainGoalTitle(active?.title ?? "");
}

/**
 * 中目標1つ + 極小目標1つを、実際のアクション経由で作る。
 * 生成された ID を返す。
 */
export function seedOneMicro(
  input: {
    frequencyType?: FrequencyType;
    progressType?: ProgressType;
    title?: string;
    targetCount?: number;
    numericTarget?: number;
    checklistTarget?: number;
  } = {},
): { subGoalId: string; microGoalId: string } {
  app().upsertSubGoal(1, "中目標A");
  const subGoalId = app().subGoals[0].id;
  app().addMicroGoal(subGoalId, 1, {
    title: input.title ?? "極小目標A",
    frequencyType: input.frequencyType ?? "毎日",
    progressType: input.progressType ?? "○×型",
    targetCount: input.targetCount,
    numericTarget: input.numericTarget,
    checklistTarget: input.checklistTarget,
  });
  const microGoalId = app().microGoals[0].id;
  return { subGoalId, microGoalId };
}
