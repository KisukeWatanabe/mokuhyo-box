/**
 * コーチマークの吹き出し配置のテスト。
 *
 * 守りたい不変条件は1つ:「どんな入力でも必ずセーフエリア内に収まる」。
 * 9×9グリッドのように対象が画面の大半を占めると、素朴な上/下配置では
 * ノッチやホームバーの外へはみ出して文字が切れる(coachMarkLayout.ts 冒頭)。
 */
import { resolveBubbleTop, type Rect } from "@/src/lib/coachMarkLayout";

// iPhone 相当のセーフエリア
const SCREEN = { windowHeight: 844, insetTop: 59, insetBottom: 34 };
const GAP = 14;
const EDGE = 12;

const MIN_TOP = SCREEN.insetTop + EDGE; // 71
const maxTopFor = (bubbleHeight: number) =>
  SCREEN.windowHeight - SCREEN.insetBottom - EDGE - bubbleHeight;

const hole = (over: Partial<Rect> = {}): Rect => ({
  x: 0,
  y: 100,
  width: 300,
  height: 200,
  ...over,
});

describe("resolveBubbleTop", () => {
  it("下に収まるなら穴の下に置く", () => {
    const r = resolveBubbleTop({ ...SCREEN, hole: hole(), bubbleHeight: 200 });
    expect(r.placement).toBe("below");
    expect(r.top).toBe(100 + 200 + GAP); // 314
  });

  it("下に入らず上に余裕があれば穴の上に置く", () => {
    const r = resolveBubbleTop({
      ...SCREEN,
      hole: hole({ y: 600 }),
      bubbleHeight: 200,
    });
    expect(r.placement).toBe("above");
    expect(r.top).toBe(600 - GAP - 200); // 386
  });

  it("対象が画面の大半を占めるときは画面下部へ固定する", () => {
    // 高さ700の穴 → 下は 814 で入らず、上は -114 で入らない
    const r = resolveBubbleTop({
      ...SCREEN,
      hole: hole({ height: 700 }),
      bubbleHeight: 200,
    });
    expect(r.placement).toBe("bottom");
    expect(r.top).toBe(maxTopFor(200)); // 598
  });

  it("穴が測定できていなければ画面下部に置く", () => {
    const r = resolveBubbleTop({ ...SCREEN, hole: null, bubbleHeight: 200 });
    expect(r.placement).toBe("bottom");
    expect(r.top).toBe(maxTopFor(200));
  });

  it("吹き出しの高さが未測定(0)でも画面下部扱いにする", () => {
    // 高さが分かるまで位置を確定できないので bottom に寄せる
    const r = resolveBubbleTop({ ...SCREEN, hole: hole(), bubbleHeight: 0 });
    expect(r.placement).toBe("bottom");
  });

  it("gap と edge を指定すると計算に反映される", () => {
    const r = resolveBubbleTop({
      ...SCREEN,
      hole: hole(),
      bubbleHeight: 200,
      gap: 40,
    });
    expect(r.top).toBe(100 + 200 + 40);
  });

  describe("セーフエリアからはみ出さない(不変条件)", () => {
    const bubbleHeights = [0, 40, 200, 400, 820, 1200];
    const holes: (Rect | null)[] = [
      null,
      hole(),
      hole({ y: 0, height: 10 }),
      hole({ y: 600 }),
      hole({ y: 0, height: 844 }), // 画面全体
      hole({ y: 800, height: 200 }), // 画面外へはみ出した穴
      hole({ y: -50, height: 100 }), // 上にはみ出した穴
    ];

    for (const bubbleHeight of bubbleHeights) {
      for (const [i, h] of holes.entries()) {
        it(`高さ${bubbleHeight} × 穴パターン${i} でも上端を割らない`, () => {
          const { top } = resolveBubbleTop({ ...SCREEN, hole: h, bubbleHeight });
          // 下端は、吹き出しが画面より高い場合は物理的に守れないため上端のみ保証。
          // (clamp が minTop を優先する実装になっている)
          expect(top).toBeGreaterThanOrEqual(MIN_TOP);
          expect(Number.isFinite(top)).toBe(true);
        });
      }
    }

    it("吹き出しがセーフエリアに収まる高さなら、下端もはみ出さない", () => {
      const bubbleHeight = 300; // 844-59-34 = 751 に収まる
      for (const h of holes) {
        const { top } = resolveBubbleTop({ ...SCREEN, hole: h, bubbleHeight });
        expect(top + bubbleHeight).toBeLessThanOrEqual(
          SCREEN.windowHeight - SCREEN.insetBottom - EDGE,
        );
      }
    });
  });
});
