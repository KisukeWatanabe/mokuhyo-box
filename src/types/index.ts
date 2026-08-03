/**
 * 目標BOX データモデル
 * CLAUDE.md 3章の型定義に準拠。週次リスト・振り返りの型を追加。
 */

export type FrequencyType = "毎日" | "週1回" | "週数回" | "単発";
export type ProgressType = "○×型" | "回数型" | "数値型" | "動的チェックリスト型";
export type MicroGoalStatus = "未着手" | "週次リストに追加済み" | "達成済み";

export type MainGoal = {
  id: string;
  title: string;
  year: number;
  progressRate: number; // 0-1 自動計算: 8つの中目標の達成率から算出
  /** 切り替えリストでの並び順(小さいほど上)。ユーザーが自由に入れ替えられる */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SubGoal = {
  id: string;
  mainGoalId: string;
  title: string;
  position: number; // 1-8
  progressRate: number; // 0-1 自動計算: 8つの小目標の達成率から算出
};

export type MicroGoal = {
  id: string;
  subGoalId: string;
  title: string;
  position: number; // 1-8
  frequencyType: FrequencyType;
  progressType: ProgressType;
  progressValue: Record<string, unknown>;
  /** 実際にマスの色に使われる状態。週次リストの達成状況から自動計算される */
  status: MicroGoalStatus;
  /**
   * ユーザーが編集画面で明示的に指定した状態。
   * 設定されている間は自動計算より優先され、週次リストの達成状況では変化しない。
   * undefined = 自動(週次リストに任せる)。
   */
  manualStatus?: MicroGoalStatus;
  linkedWeeklyItemIds: string[];
  /** 進捗タイプごとの既定設定(週次リストへとり込む際に引き継ぐ) */
  targetCount?: number; // 回数型: 週の目標回数
  numericTarget?: number; // 数値型: 目標値
  numericUnit?: string; // 数値型: 単位(例 "¥")
  checklistTarget?: number; // 動的チェックリスト型: 埋める項目数
};

/** 週次リストの1項目。microGoalId が undefined ならその週だけのフリー項目 */
export type ChecklistEntry = {
  id: string;
  text: string;
  done: boolean;
};

export type WeeklyItem = {
  id: string;
  weekStart: string; // 月曜日の YYYY-MM-DD
  title: string;
  progressType: ProgressType;
  frequencyType: FrequencyType;
  microGoalId?: string;
  subGoalTitle?: string; // 表示用(どの中目標由来か)
  /** ○×型・回数型: 達成した日付(YYYY-MM-DD)の配列 */
  doneDates: string[];
  /** 回数型: 週の目標回数 */
  targetCount?: number;
  /** 数値型 */
  numericTarget?: number;
  numericValue?: number;
  numericUnit?: string; // 例: "¥"
  numericComment?: string;
  /** 動的チェックリスト型 */
  checklist?: ChecklistEntry[];
  checklistTarget?: number; // 例: 3つ書く
  /** 単発: 期限(YYYY-MM-DD)。期限超過 & 未達成で「消化」される */
  dueDate?: string;
  completed: boolean;
  createdAt: string;
};

export type WeeklyReview = {
  weekStart: string;
  score: number; // 0-100
  note: string;
  updatedAt: string;
};
