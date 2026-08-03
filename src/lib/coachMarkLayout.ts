/**
 * コーチマークの吹き出しをどこに置くかの計算(表示に依存しない純粋関数)。
 *
 * 対象が画面の大部分を占める(9×9グリッド等)と、素朴に「対象の上/下」に
 * 置くだけではノッチやホームバーの外にはみ出して文字が切れる。
 * ここで必ずセーフエリア内に収まる位置まで丸める。
 */

export type Rect = { x: number; y: number; width: number; height: number };

export type BubbleLayoutInput = {
  /** 穴(強調表示する対象)。測定できていなければ null */
  hole: Rect | null;
  /** 吹き出しの実測高さ。0 なら未測定 */
  bubbleHeight: number;
  windowHeight: number;
  insetTop: number;
  insetBottom: number;
  /** 穴と吹き出しの間隔 */
  gap?: number;
  /** セーフエリア内側からの最小余白 */
  edge?: number;
};

export type BubblePlacement = {
  top: number;
  /** どこに置いたか(デバッグ・テスト用) */
  placement: "below" | "above" | "bottom";
};

/**
 * 「穴の下 → 穴の上 → 画面下部」の順に収まる場所を探し、
 * 最後に必ずセーフエリア内へクランプする。
 */
export function resolveBubbleTop({
  hole,
  bubbleHeight,
  windowHeight,
  insetTop,
  insetBottom,
  gap = 14,
  edge = 12,
}: BubbleLayoutInput): BubblePlacement {
  const minTop = insetTop + edge;
  const maxTop = windowHeight - insetBottom - edge - bubbleHeight;
  const clamp = (v: number) => Math.min(Math.max(v, minTop), Math.max(minTop, maxTop));

  if (!hole || bubbleHeight <= 0) {
    return { top: clamp(maxTop), placement: "bottom" };
  }

  const below = hole.y + hole.height + gap;
  if (below <= maxTop) return { top: clamp(below), placement: "below" };

  const above = hole.y - gap - bubbleHeight;
  if (above >= minTop) return { top: clamp(above), placement: "above" };

  // どちらにも収まらない(対象が画面の大半を占める) → 画面下部に固定して重ねる
  return { top: clamp(maxTop), placement: "bottom" };
}
