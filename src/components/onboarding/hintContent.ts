/**
 * Part B(コーチマーク)の文言。
 *
 * 各画面の初回訪問時と、設定画面の「使い方のヒント」から同じものを表示するため、
 * 文言はここに一本化する(2箇所に書くと片方だけ直して食い違うため)。
 */
import { HintKey } from "@/src/store/useOnboardingStore";

export type HintContent = {
  /** 設定画面のボタンに出す見出し */
  label: string;
  /** どの画面のヒントかの補足 */
  where: string;
  title: string;
  body: string;
  /** 設定から開いたときの遷移先(実際にヒントが出る画面) */
  route: string;
  /** マンダラタブのヒントのみ: どちらのビューで出すか */
  mandalaView?: "sub" | "all";
};

export const HINTS: Record<HintKey, HintContent> = {
  progressSummary: {
    label: "進み具合の見方",
    where: "マンダラ ・ 中目標",
    title: "進み具合の見方",
    body: "バーと「x / 8」は、その中目標の8マスのうち\n何個を達成したかを表します。\n\nマスをタップすると、中の8つの極小目標が開きます。",
    route: "/(tabs)",
    mandalaView: "sub",
  },
  mandalaGrid: {
    label: "マスの色の意味",
    where: "マンダラ ・ 全体(81マス)",
    title: "マスの色の意味",
    body: "破線 … まだ手つかず\nオレンジ … 今週やることに追加済み\n緑 … 達成ずみ\n\nブロックをタップすると、その中目標が開きます。",
    route: "/(tabs)",
    mandalaView: "all",
  },
  weeklyList: {
    label: "「今週やること」の仕組み",
    where: "今週",
    title: "ここが「今週やること」",
    body: "マンダラのマスを今週にとり込むと、\n頻度に合わせてここに並びます。\n\nここで達成にすると、マンダラのマスも緑に変わります。",
    route: "/(tabs)/week",
  },
};

/**
 * 設定画面に並べる順。上の HINTS の宣言順そのままなので、
 * ヒントを増やしても並び順への追加漏れが起きない。
 */
export const HINT_ORDER = Object.keys(HINTS) as HintKey[];
