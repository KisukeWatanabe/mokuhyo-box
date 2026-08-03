/** 表示用のラベル整形。未入力のレコードを空白のまま出さないための共通処理。 */
import { MainGoal } from "../types";

/** 大目標の表示名。新規インストール直後はタイトルが空なので促し文を出す。 */
export function mainGoalLabel(g: Pick<MainGoal, "title">): string {
  return g.title.trim() || "大目標を決める";
}

/** 大目標が未入力か(オンボーディング未完了の判定などに使う) */
export function isMainGoalEmpty(g: Pick<MainGoal, "title">): boolean {
  return g.title.trim() === "";
}
