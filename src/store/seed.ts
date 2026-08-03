/**
 * 初期状態の組み立て。
 *
 *  - buildEmptyState(): 新規インストール時の状態。空のマンダラ1つだけを持つ。
 *    オンボーディング(Part A)でユーザーが入力した内容がそのまま最初の実データになる。
 *  - buildSeedState(): デザインカンプを再現したサンプル(81マス)。設定画面から
 *    いつでも「追加のマンダラ」として投入できる。初期状態としては使わない。
 */
import { addDays, currentWeekStart, recentWeekStarts } from "../lib/dates";
import {
  FrequencyType,
  MainGoal,
  MicroGoal,
  MicroGoalStatus,
  SubGoal,
  WeeklyItem,
  WeeklyReview,
} from "../types";

export type SeededState = {
  mainGoals: MainGoal[];
  activeMainGoalId: string;
  subGoals: SubGoal[];
  microGoals: MicroGoal[];
  weeklyItems: WeeklyItem[];
  reviews: WeeklyReview[];
};

let seq = 0;
// サンプルは何度でも投入できるため、呼び出しごとに異なる接頭辞を振って
// 既存レコードと ID が衝突しないようにする。
let token = "";
function sid(prefix: string): string {
  seq += 1;
  return `${prefix}-${token}${seq.toString(36)}`;
}
function newBuild(): void {
  seq = 0;
  token = `${Math.random().toString(36).slice(2, 7)}-`;
}

/** 新規インストール時の状態: 空のマンダラ1つ(タイトル未設定)。 */
export function buildEmptyState(): SeededState {
  newBuild();
  const now = new Date().toISOString();
  const mainGoal: MainGoal = {
    id: sid("main"),
    title: "",
    year: new Date().getFullYear(),
    progressRate: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
  return {
    mainGoals: [mainGoal],
    activeMainGoalId: mainGoal.id,
    subGoals: [],
    microGoals: [],
    weeklyItems: [],
    reviews: [],
  };
}

type MicroSeed = [title: string, freq: FrequencyType, status: MicroGoalStatus];

const A: MicroGoalStatus = "達成済み";
const W: MicroGoalStatus = "週次リストに追加済み";
const N: MicroGoalStatus = "未着手";

const SUBS: { title: string; micros: MicroSeed[] }[] = [
  {
    title: "体づくり",
    micros: [
      ["ジムに行く", "週数回", W],
      ["朝ストレッチ", "毎日", A],
      ["1日8千歩", "毎日", W],
      ["週末ラン", "週1回", N],
      ["体重を記録", "毎日", A],
      ["プロテイン", "毎日", W],
      ["姿勢を意識", "毎日", N],
      ["月1体組成", "単発", N],
    ],
  },
  {
    title: "食事",
    micros: [
      ["自炊を週4", "週数回", W],
      ["野菜を毎食", "毎日", A],
      ["間食減らす", "毎日", N],
      ["水を2L", "毎日", W],
      ["揚げ物週1", "週1回", N],
      ["朝食を摂る", "毎日", A],
      ["食事を記録", "毎日", N],
      ["外食は選ぶ", "毎日", N],
    ],
  },
  {
    title: "睡眠",
    micros: [
      ["24時就寝", "毎日", W],
      ["7時間確保", "毎日", N],
      ["寝る前断ち", "毎日", N],
      ["朝日を浴びる", "毎日", A],
      ["昼寝20分", "毎日", N],
      ["週末も一定", "週1回", W],
      ["寝室を暗く", "単発", A],
      ["カフェ15時", "毎日", W],
    ],
  },
  {
    title: "学び",
    micros: [
      ["読書30分", "毎日", A],
      ["英語アプリ", "毎日", A],
      ["資格勉強", "週数回", W],
      ["月2冊読む", "単発", N],
      ["Podcast", "毎日", N],
      ["週1で発信", "週1回", W],
      ["セミナー", "単発", N],
      ["ノート整理", "週1回", N],
    ],
  },
  {
    title: "仕事",
    micros: [
      ["朝一で優先", "毎日", A],
      ["集中90分", "毎日", W],
      ["週次振返り", "週1回", A],
      ["新スキル1つ", "単発", N],
      ["即返信", "毎日", N],
      ["定時退社", "週数回", W],
      ["1on1準備", "週1回", N],
      ["月次見直し", "単発", N],
    ],
  },
  {
    title: "人間関係",
    micros: [
      ["家族に連絡", "週1回", A],
      ["友人と月1", "単発", W],
      ["感謝を伝える", "毎日", N],
      ["誕生日祝う", "単発", N],
      ["新しい出会い", "単発", N],
      ["傾聴を意識", "毎日", W],
      ["丁寧に返信", "毎日", N],
      ["年賀状", "単発", N],
    ],
  },
  {
    title: "お金",
    micros: [
      ["家計簿毎日", "毎日", A],
      ["貯金6万", "単発", W],
      ["投資積立", "単発", A],
      ["固定費見直", "単発", W],
      ["無駄遣記録", "毎日", N],
      ["副業月1万", "単発", N],
      ["ふるさと", "単発", N],
      ["資産確認", "週1回", N],
    ],
  },
  {
    title: "趣味",
    micros: [
      ["ギター週2", "週数回", W],
      ["写真を撮る", "週1回", N],
      ["映画を月4", "週数回", A],
      ["旅行の計画", "単発", N],
      ["新レシピ", "週1回", N],
      ["展示会", "単発", N],
      ["植物の世話", "毎日", A],
      ["スケッチ", "週1回", N],
    ],
  },
];

export function buildSeedState(): SeededState {
  newBuild();
  const now = new Date().toISOString();
  const week = currentWeekStart();

  const mainGoal: MainGoal = {
    id: sid("main"),
    title: "健康的で充実した1年に",
    year: 2026,
    progressRate: 0,
    sortOrder: 0, // 投入時に既存の最後尾へ振り直す(loadSample を参照)
    createdAt: now,
    updatedAt: now,
  };

  const subGoals: SubGoal[] = [];
  const microGoals: MicroGoal[] = [];

  SUBS.forEach((sub, i) => {
    const sg: SubGoal = {
      id: sid("sub"),
      mainGoalId: mainGoal.id,
      title: sub.title,
      position: i + 1,
      progressRate: 0,
    };
    subGoals.push(sg);
    sub.micros.forEach(([title, freq, status], j) => {
      microGoals.push({
        id: sid("micro"),
        subGoalId: sg.id,
        title,
        position: j + 1,
        frequencyType: freq,
        progressType:
          title === "貯金6万"
            ? "数値型"
            : freq === "週数回"
              ? "回数型"
              : "○×型",
        progressValue: {},
        status,
        linkedWeeklyItemIds: [],
        // 数値型・回数型の既定設定(週次リストへとり込む際に引き継ぐ)
        numericTarget: title === "貯金6万" ? 60000 : undefined,
        numericUnit: title === "貯金6万" ? "¥" : undefined,
        targetCount: freq === "週数回" ? 3 : undefined,
      });
    });
  });

  const findMicro = (title: string) =>
    microGoals.find((m) => m.title === title)!;
  const findSub = (id: string) => subGoals.find((g) => g.id === id)!;

  const weeklyItems: WeeklyItem[] = [];
  const linkItem = (item: WeeklyItem) => {
    weeklyItems.push(item);
    if (item.microGoalId) {
      const mg = microGoals.find((m) => m.id === item.microGoalId)!;
      mg.linkedWeeklyItemIds = [...mg.linkedWeeklyItemIds, item.id];
    }
  };

  const nezasu = findMicro("24時就寝");
  linkItem({
    id: sid("wk"),
    weekStart: week,
    title: "早寝する(24時前)",
    progressType: "○×型",
    frequencyType: "毎日",
    microGoalId: nezasu.id,
    subGoalTitle: findSub(nezasu.subGoalId).title,
    doneDates: [0, 1, 2, 3].map((d) => addDays(week, d)),
    completed: false,
    createdAt: now,
  });

  const gym = findMicro("ジムに行く");
  linkItem({
    id: sid("wk"),
    weekStart: week,
    title: "ジムに行く",
    progressType: "回数型",
    frequencyType: "週数回",
    microGoalId: gym.id,
    subGoalTitle: findSub(gym.subGoalId).title,
    targetCount: 3,
    doneDates: [addDays(week, 1), addDays(week, 3)],
    completed: false,
    createdAt: now,
  });

  const savings = findMicro("貯金6万");
  linkItem({
    id: sid("wk"),
    weekStart: week,
    title: "貯金残高",
    progressType: "数値型",
    frequencyType: "単発",
    microGoalId: savings.id,
    subGoalTitle: findSub(savings.subGoalId).title,
    numericTarget: 60000,
    numericValue: 42000,
    numericUnit: "円",
    numericComment: "先月より +1.2万。良い調子。ボーナスで一気に埋める。",
    doneDates: [],
    completed: false,
    createdAt: now,
  });

  // マンダラ由来でないフリー項目の例(動的チェックリスト型)
  linkItem({
    id: sid("wk"),
    weekStart: week,
    title: "成功体験を3つ書く",
    progressType: "動的チェックリスト型",
    frequencyType: "週1回",
    doneDates: [],
    checklist: [
      { id: sid("cl"), text: "プレゼンで質問に的確に答えられた", done: true },
      { id: sid("cl"), text: "10km 完走できた", done: true },
    ],
    checklistTarget: 3,
    completed: false,
    createdAt: now,
  });

  // 直近8週分の振り返りスコア(今週=78、先週=72)
  const scores = [58, 64, 55, 68, 63, 70, 72, 78];
  const starts = recentWeekStarts(8);
  const reviews: WeeklyReview[] = starts.map((ws, i) => ({
    weekStart: ws,
    score: scores[i],
    note:
      i === scores.length - 1
        ? "ジムと読書は続いた。夜更かしが週後半で崩れたので来週は寝る前スマホを断つ。貯金は順調。"
        : "",
    updatedAt: now,
  }));

  return {
    mainGoals: [mainGoal],
    activeMainGoalId: mainGoal.id,
    subGoals,
    microGoals,
    weeklyItems,
    reviews,
  };
}
