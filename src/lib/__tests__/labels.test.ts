/**
 * 表示ラベルのテスト。
 * 新規インストール直後はタイトルが空なので、空白のまま画面に出さないことが要件。
 */
import { isMainGoalEmpty, mainGoalLabel } from "@/src/lib/labels";

describe("mainGoalLabel", () => {
  it("入力があればそのまま返す", () => {
    expect(mainGoalLabel({ title: "簿記2級に合格する" })).toBe(
      "簿記2級に合格する",
    );
  });

  it("空なら促し文に差し替える", () => {
    expect(mainGoalLabel({ title: "" })).toBe("大目標を決める");
  });

  it("空白のみも未入力として扱う", () => {
    expect(mainGoalLabel({ title: "   " })).toBe("大目標を決める");
    expect(mainGoalLabel({ title: "\n\t" })).toBe("大目標を決める");
  });

  it("前後の空白は落として返す", () => {
    // 実装は title.trim() || 促し文 なので、返るのはトリム後の文字列
    expect(mainGoalLabel({ title: " 目標 " })).toBe("目標");
  });
});

describe("isMainGoalEmpty", () => {
  it("空・空白のみを未入力と判定する", () => {
    expect(isMainGoalEmpty({ title: "" })).toBe(true);
    expect(isMainGoalEmpty({ title: "  " })).toBe(true);
  });

  it("中身があれば false", () => {
    expect(isMainGoalEmpty({ title: "目標" })).toBe(false);
  });
});
