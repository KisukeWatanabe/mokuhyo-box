/**
 * アプリ本体ストアのテスト。
 *
 * ここが守る仕様は CLAUDE.md 7章「機能要件」と、useAppStore.ts 冒頭の
 * 「未決定事項に対する仮決定」。特に次の4点は壊れても画面上すぐには
 * 気づきにくいので、テストで固定しておく。
 *
 *  1. 進捗の自動集計(極小 → 中 → 大)
 *  2. マンダラ ⇄ 週次リストの双方向同期
 *  3. 頻度タイプごとの週次リストへの反映ルール
 *  4. カスケード削除(中目標を消したら配下と週次項目も消える)
 */
import { isItemCompleted, useAppStore } from "@/src/store/useAppStore";
import {
  app,
  freezeTo,
  makeMicroGoal,
  makeSubGoal,
  makeWeeklyItem,
  MONDAY,
  PREV_MONDAY,
  recalcNow,
  resetAppStore,
  seedOneMicro,
  WEDNESDAY,
} from "@/test/factories";

beforeEach(() => {
  freezeTo(WEDNESDAY);
  resetAppStore();
});

// ---------------------------------------------------------------------------
// 1. 完了判定(純関数)
// ---------------------------------------------------------------------------
describe("isItemCompleted", () => {
  describe("○×型", () => {
    it("毎日は週5日以上で達成(完璧主義で挫折しないための仮決定)", () => {
      const days = (n: number) =>
        Array.from({ length: n }, (_, i) => `2026-07-${String(6 + i).padStart(2, "0")}`);

      expect(
        isItemCompleted(makeWeeklyItem({ frequencyType: "毎日", doneDates: days(4) })),
      ).toBe(false);
      expect(
        isItemCompleted(makeWeeklyItem({ frequencyType: "毎日", doneDates: days(5) })),
      ).toBe(true);
      expect(
        isItemCompleted(makeWeeklyItem({ frequencyType: "毎日", doneDates: days(7) })),
      ).toBe(true);
    });

    it("毎日以外は1日でもチェックすれば達成", () => {
      for (const frequencyType of ["週1回", "単発"] as const) {
        expect(
          isItemCompleted(makeWeeklyItem({ frequencyType, doneDates: [] })),
        ).toBe(false);
        expect(
          isItemCompleted(makeWeeklyItem({ frequencyType, doneDates: [WEDNESDAY] })),
        ).toBe(true);
      }
    });
  });

  describe("回数型", () => {
    it("目標回数に達したら達成", () => {
      const item = (n: number) =>
        makeWeeklyItem({
          progressType: "回数型",
          frequencyType: "週数回",
          targetCount: 3,
          doneDates: Array.from({ length: n }, (_, i) => `2026-07-0${6 + i}`),
        });
      expect(isItemCompleted(item(2))).toBe(false);
      expect(isItemCompleted(item(3))).toBe(true);
      expect(isItemCompleted(item(4))).toBe(true);
    });

    it("targetCount 未設定なら1回で達成扱い", () => {
      expect(
        isItemCompleted(
          makeWeeklyItem({ progressType: "回数型", doneDates: [WEDNESDAY] }),
        ),
      ).toBe(true);
    });
  });

  describe("数値型", () => {
    it("目標値に到達したら達成", () => {
      const item = (value: number) =>
        makeWeeklyItem({
          progressType: "数値型",
          numericTarget: 60000,
          numericValue: value,
        });
      expect(isItemCompleted(item(42000))).toBe(false);
      expect(isItemCompleted(item(60000))).toBe(true);
      expect(isItemCompleted(item(80000))).toBe(true);
    });

    it("目標値が0や未設定なら達成にしない(0 >= 0 で誤達成しない)", () => {
      expect(
        isItemCompleted(
          makeWeeklyItem({ progressType: "数値型", numericTarget: 0, numericValue: 0 }),
        ),
      ).toBe(false);
      expect(
        isItemCompleted(makeWeeklyItem({ progressType: "数値型" })),
      ).toBe(false);
    });
  });

  describe("動的チェックリスト型", () => {
    const entry = (text: string, done: boolean) => ({ id: text, text, done });

    it("目標数ぶんチェックできたら達成", () => {
      expect(
        isItemCompleted(
          makeWeeklyItem({
            progressType: "動的チェックリスト型",
            checklistTarget: 3,
            checklist: [entry("a", true), entry("b", true), entry("c", false)],
          }),
        ),
      ).toBe(false);
      expect(
        isItemCompleted(
          makeWeeklyItem({
            progressType: "動的チェックリスト型",
            checklistTarget: 3,
            checklist: [entry("a", true), entry("b", true), entry("c", true)],
          }),
        ),
      ).toBe(true);
    });

    it("空のチェックリストで誤達成しない", () => {
      expect(
        isItemCompleted(
          makeWeeklyItem({ progressType: "動的チェックリスト型", checklist: [] }),
        ),
      ).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. 進捗の自動集計
// ---------------------------------------------------------------------------
describe("進捗の自動集計", () => {
  it("マスは常に8枠として数える(空きマスは未達成扱い)", () => {
    const sub = makeSubGoal("main0", { position: 1 });
    // 8枠のうち2つだけ埋まっていて、両方とも達成済み
    resetAppStore({
      subGoals: [sub],
      microGoals: [
        makeMicroGoal(sub.id, { position: 1, manualStatus: "達成済み" }),
        makeMicroGoal(sub.id, { position: 2, manualStatus: "達成済み" }),
      ],
    });
    // 再計算はアクション経由で走る
    app().setActiveMainGoal("main0");
    app().upsertSubGoal(2, "ダミー");

    const target = app().subGoals.find((g) => g.id === sub.id)!;
    // 2/8 = 0.25。埋まっている2マス中2つ達成でも 1.0 にはならない
    expect(target.progressRate).toBeCloseTo(0.25);
  });

  it("極小 → 中 → 大 の順に伝播する", () => {
    const sub = makeSubGoal("main0", { position: 1 });
    resetAppStore({
      subGoals: [sub],
      microGoals: [makeMicroGoal(sub.id, { manualStatus: "達成済み" })],
    });
    app().upsertSubGoal(1, "中目標A");

    const subRate = app().subGoals[0].progressRate;
    const mainRate = app().mainGoals[0].progressRate;
    expect(subRate).toBeCloseTo(1 / 8);
    // 大目標も常に8枠なので、中目標の達成率の合計 ÷ 8
    expect(mainRate).toBeCloseTo(1 / 8 / 8);
  });

  it("8中目標すべてが満点なら大目標は 1.0 になる", () => {
    const subGoals = Array.from({ length: 8 }, (_, i) =>
      makeSubGoal("main0", { position: i + 1 }),
    );
    const microGoals = subGoals.flatMap((sg) =>
      Array.from({ length: 8 }, (_, i) =>
        makeMicroGoal(sg.id, { position: i + 1, manualStatus: "達成済み" }),
      ),
    );
    resetAppStore({ subGoals, microGoals });
    // setActiveMainGoal は recalc を伴わないため、集計を明示的に走らせる
    recalcNow();

    expect(app().mainGoals[0].progressRate).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 3. マンダラ → 週次リスト(とり込み)
// ---------------------------------------------------------------------------
describe("addMicroToWeek", () => {
  it("今週の週次項目を作り、小目標を「追加済み」にする", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });

    expect(app().weeklyItems).toHaveLength(1);
    const item = app().weeklyItems[0];
    expect(item.weekStart).toBe(MONDAY);
    expect(item.microGoalId).toBe(microGoalId);
    expect(item.title).toBe("極小目標A");
    expect(item.subGoalTitle).toBe("中目標A");

    const micro = app().microGoals[0];
    expect(micro.status).toBe("週次リストに追加済み");
    expect(micro.linkedWeeklyItemIds).toContain(item.id);
  });

  it("週数回を選ぶと回数型になり、回数が引き継がれる", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "週数回", targetCount: 3 });

    const item = app().weeklyItems[0];
    expect(item.progressType).toBe("回数型");
    expect(item.targetCount).toBe(3);
  });

  it("回数未指定なら既定の3回になる", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "週数回" });
    expect(app().weeklyItems[0].targetCount).toBe(3);
  });

  it("数値型・動的チェックリスト型は頻度に関わらず型を保つ", () => {
    const { microGoalId } = seedOneMicro({
      progressType: "数値型",
      numericTarget: 60000,
    });
    app().addMicroToWeek(microGoalId, { frequencyType: "週数回" });

    const item = app().weeklyItems[0];
    expect(item.progressType).toBe("数値型");
    expect(item.numericTarget).toBe(60000);
    expect(item.numericValue).toBe(0);
  });

  it("単発のときだけ期限を持つ", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, {
      frequencyType: "単発",
      dueDate: "2026-07-12",
    });
    expect(app().weeklyItems[0].dueDate).toBe("2026-07-12");
  });

  it("毎日を選んだ場合は期限を持たない", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, {
      frequencyType: "毎日",
      dueDate: "2026-07-12",
    });
    expect(app().weeklyItems[0].dueDate).toBeUndefined();
  });

  it("同じ週に二重追加しても項目は増えず、設定だけ更新される", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "週数回", targetCount: 3 });
    const firstId = app().weeklyItems[0].id;

    app().addMicroToWeek(microGoalId, { frequencyType: "週数回", targetCount: 5 });

    expect(app().weeklyItems).toHaveLength(1);
    expect(app().weeklyItems[0].id).toBe(firstId);
    expect(app().weeklyItems[0].targetCount).toBe(5);
    // 紐づけIDも重複しない
    expect(app().microGoals[0].linkedWeeklyItemIds).toEqual([firstId]);
  });

  it("存在しない小目標IDなら何も起こらない", () => {
    app().addMicroToWeek("missing", { frequencyType: "毎日" });
    expect(app().weeklyItems).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. 週次リスト → マンダラ(双方向同期)
// ---------------------------------------------------------------------------
describe("週次リストの達成がマンダラへ反映される", () => {
  it("週1回を1日チェックすると小目標が達成済みになる", () => {
    const { microGoalId } = seedOneMicro({ frequencyType: "週1回" });
    app().addMicroToWeek(microGoalId, { frequencyType: "週1回" });

    const itemId = app().weeklyItems[0].id;
    app().toggleDoneDate(itemId, WEDNESDAY);

    expect(app().weeklyItems[0].completed).toBe(true);
    expect(app().microGoals[0].status).toBe("達成済み");
  });

  it("チェックを外すと「追加済み」に戻る", () => {
    const { microGoalId } = seedOneMicro({ frequencyType: "週1回" });
    app().addMicroToWeek(microGoalId, { frequencyType: "週1回" });
    const itemId = app().weeklyItems[0].id;

    app().toggleDoneDate(itemId, WEDNESDAY);
    expect(app().microGoals[0].status).toBe("達成済み");

    app().toggleDoneDate(itemId, WEDNESDAY);
    expect(app().weeklyItems[0].completed).toBe(false);
    expect(app().microGoals[0].status).toBe("週次リストに追加済み");
  });

  it("毎日は5日チェックして初めて達成済みになる", () => {
    const { microGoalId } = seedOneMicro({ frequencyType: "毎日" });
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });
    const itemId = app().weeklyItems[0].id;

    for (let i = 0; i < 4; i++) {
      app().toggleDoneDate(itemId, `2026-07-0${6 + i}`);
    }
    expect(app().microGoals[0].status).toBe("週次リストに追加済み");

    app().toggleDoneDate(itemId, "2026-07-10");
    expect(app().microGoals[0].status).toBe("達成済み");
  });

  it("toggleDoneDate は日付を昇順に保つ", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });
    const itemId = app().weeklyItems[0].id;

    app().toggleDoneDate(itemId, "2026-07-10");
    app().toggleDoneDate(itemId, "2026-07-07");
    app().toggleDoneDate(itemId, "2026-07-08");

    expect(app().weeklyItems[0].doneDates).toEqual([
      "2026-07-07",
      "2026-07-08",
      "2026-07-10",
    ]);
  });

  it("日付を省略すると今日が使われる", () => {
    const { microGoalId } = seedOneMicro({ frequencyType: "週1回" });
    app().addMicroToWeek(microGoalId, { frequencyType: "週1回" });
    app().toggleDoneDate(app().weeklyItems[0].id);
    expect(app().weeklyItems[0].doneDates).toEqual([WEDNESDAY]);
  });

  it("手動で指定した状態は週次リストの達成状況に上書きされない", () => {
    const { microGoalId } = seedOneMicro({ frequencyType: "週1回" });
    app().addMicroToWeek(microGoalId, { frequencyType: "週1回" });
    app().updateMicroGoal(microGoalId, { manualStatus: "未着手" });

    app().toggleDoneDate(app().weeklyItems[0].id, WEDNESDAY);

    expect(app().weeklyItems[0].completed).toBe(true);
    // 手動指定が勝つ
    expect(app().microGoals[0].status).toBe("未着手");
  });

  it("先週の達成は今週のマスの色に影響しない(習慣は毎週リセット)", () => {
    const sub = makeSubGoal("main0");
    const micro = makeMicroGoal(sub.id, {
      frequencyType: "週1回",
      status: "週次リストに追加済み",
    });
    resetAppStore({
      subGoals: [sub],
      microGoals: [micro],
      weeklyItems: [
        makeWeeklyItem({
          weekStart: PREV_MONDAY,
          microGoalId: micro.id,
          frequencyType: "週1回",
          doneDates: [PREV_MONDAY],
        }),
      ],
    });
    // 再計算を走らせる
    app().upsertSubGoal(1, "中目標A");

    // 先週の項目は completed になるが、今週の status は変わらない
    expect(app().weeklyItems[0].completed).toBe(true);
    expect(app().microGoals[0].status).toBe("週次リストに追加済み");
  });
});

// ---------------------------------------------------------------------------
// 5. 週の繰り越し
// ---------------------------------------------------------------------------
describe("ensureCurrentWeek", () => {
  const seedPrevWeek = (over = {}) => {
    const sub = makeSubGoal("main0");
    const micro = makeMicroGoal(sub.id, { frequencyType: "毎日", ...over });
    resetAppStore({
      subGoals: [sub],
      microGoals: [micro],
      weeklyItems: [
        makeWeeklyItem({
          weekStart: PREV_MONDAY,
          microGoalId: micro.id,
          frequencyType: micro.frequencyType,
          doneDates: [PREV_MONDAY, "2026-06-30"],
          numericComment: "先週のメモ",
        }),
      ],
    });
    return micro;
  };

  it("先週あった項目を今週へ引き継ぎ、進捗はリセットする", () => {
    const micro = seedPrevWeek();
    app().ensureCurrentWeek();

    const thisWeek = app().weeklyItems.filter((w) => w.weekStart === MONDAY);
    expect(thisWeek).toHaveLength(1);
    expect(thisWeek[0].microGoalId).toBe(micro.id);
    expect(thisWeek[0].doneDates).toEqual([]);
    expect(thisWeek[0].completed).toBe(false);
    expect(thisWeek[0].numericComment).toBeUndefined();
    // 先週の記録は残したまま
    expect(app().weeklyItems.filter((w) => w.weekStart === PREV_MONDAY)).toHaveLength(1);
  });

  it("引き継いだ小目標は「追加済み」になる", () => {
    seedPrevWeek();
    app().ensureCurrentWeek();
    expect(app().microGoals[0].status).toBe("週次リストに追加済み");
  });

  it("単発は引き継がない(一度だけ出現するもの)", () => {
    seedPrevWeek({ frequencyType: "単発" });
    app().ensureCurrentWeek();
    expect(app().weeklyItems.filter((w) => w.weekStart === MONDAY)).toHaveLength(0);
  });

  it("すでに今週の項目があれば二重に作らない", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });
    app().ensureCurrentWeek();
    expect(app().weeklyItems).toHaveLength(1);
  });

  it("何度呼んでも増えない(冪等)", () => {
    seedPrevWeek();
    app().ensureCurrentWeek();
    app().ensureCurrentWeek();
    app().ensureCurrentWeek();
    expect(app().weeklyItems.filter((w) => w.weekStart === MONDAY)).toHaveLength(1);
  });

  it("2週以上空いていたら引き継がない(先週ぶんだけを見る)", () => {
    const sub = makeSubGoal("main0");
    const micro = makeMicroGoal(sub.id, { frequencyType: "毎日" });
    resetAppStore({
      subGoals: [sub],
      microGoals: [micro],
      weeklyItems: [
        makeWeeklyItem({ weekStart: "2026-06-22", microGoalId: micro.id }),
      ],
    });
    app().ensureCurrentWeek();
    expect(app().weeklyItems.filter((w) => w.weekStart === MONDAY)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. 単発の期限切れ消化
// ---------------------------------------------------------------------------
describe("sweepExpiredSingles", () => {
  const seedSingle = (over: Partial<ReturnType<typeof makeWeeklyItem>> = {}) => {
    const sub = makeSubGoal("main0");
    const micro = makeMicroGoal(sub.id, {
      frequencyType: "単発",
      status: "週次リストに追加済み",
    });
    const item = makeWeeklyItem({
      microGoalId: micro.id,
      frequencyType: "単発",
      dueDate: "2026-07-07", // 今日(7/8)より前 = 期限切れ
      ...over,
    });
    resetAppStore({ subGoals: [sub], microGoals: [micro], weeklyItems: [item] });
    return { micro, item };
  };

  it("期限切れで未達成の単発は消え、小目標は未着手に戻る", () => {
    const { micro } = seedSingle();
    app().sweepExpiredSingles();

    expect(app().weeklyItems).toHaveLength(0);
    expect(app().microGoals.find((m) => m.id === micro.id)!.status).toBe("未着手");
    expect(app().microGoals[0].linkedWeeklyItemIds).toEqual([]);
  });

  it("達成済みの単発は消さない", () => {
    seedSingle({ doneDates: ["2026-07-07"] });
    // completed は recalc が導出する値。生 seed のままだと false なので、
    // 「達成済み」の状態を作るために再計算を通す。
    recalcNow();
    expect(app().weeklyItems[0].completed).toBe(true);

    app().sweepExpiredSingles();
    expect(app().weeklyItems).toHaveLength(1);
  });

  it("期限が今日ならまだ消さない(当日中は有効)", () => {
    seedSingle({ dueDate: WEDNESDAY });
    app().sweepExpiredSingles();
    expect(app().weeklyItems).toHaveLength(1);
  });

  it("期限が未来なら消さない", () => {
    seedSingle({ dueDate: "2026-07-31" });
    app().sweepExpiredSingles();
    expect(app().weeklyItems).toHaveLength(1);
  });

  it("期限なしの単発は消さない", () => {
    seedSingle({ dueDate: undefined });
    app().sweepExpiredSingles();
    expect(app().weeklyItems).toHaveLength(1);
  });

  it("単発以外は期限切れでも消さない", () => {
    seedSingle({ frequencyType: "毎日" });
    app().sweepExpiredSingles();
    expect(app().weeklyItems).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 7. フリー項目(マンダラに存在しない、その週だけの用事)
// ---------------------------------------------------------------------------
describe("addFreeItem", () => {
  it("小目標に紐づかない項目を今週に作れる", () => {
    app().addFreeItem({
      title: "郵便局へ行く",
      progressType: "○×型",
      frequencyType: "単発",
    });

    const item = app().weeklyItems[0];
    expect(item.title).toBe("郵便局へ行く");
    expect(item.microGoalId).toBeUndefined();
    expect(item.weekStart).toBe(MONDAY);
  });

  it("週を指定すれば過去週へも追加できる(振り返りアーカイブ用)", () => {
    app().addFreeItem({
      title: "先週の用事",
      progressType: "○×型",
      frequencyType: "単発",
      weekStart: PREV_MONDAY,
    });
    expect(app().weeklyItems[0].weekStart).toBe(PREV_MONDAY);
  });

  it("フリー項目の達成は小目標の集計に影響しない", () => {
    const sub = makeSubGoal("main0");
    resetAppStore({
      subGoals: [sub],
      microGoals: [makeMicroGoal(sub.id)],
    });
    app().addFreeItem({
      title: "用事",
      progressType: "○×型",
      frequencyType: "単発",
    });
    app().toggleDoneDate(app().weeklyItems[0].id, WEDNESDAY);

    expect(app().microGoals[0].status).toBe("未着手");
    expect(app().subGoals[0].progressRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. カスケード削除
// ---------------------------------------------------------------------------
describe("カスケード削除", () => {
  it("中目標を削除すると配下の小目標と週次項目も消える", () => {
    const { subGoalId, microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });
    expect(app().weeklyItems).toHaveLength(1);

    app().deleteSubGoal(subGoalId);

    expect(app().subGoals).toHaveLength(0);
    expect(app().microGoals).toHaveLength(0);
    expect(app().weeklyItems).toHaveLength(0);
  });

  it("中目標を削除してもフリー項目は残る", () => {
    const { subGoalId } = seedOneMicro();
    app().addFreeItem({
      title: "用事",
      progressType: "○×型",
      frequencyType: "単発",
    });

    app().deleteSubGoal(subGoalId);

    expect(app().weeklyItems).toHaveLength(1);
    expect(app().weeklyItems[0].title).toBe("用事");
  });

  it("小目標を削除するとその週次項目も消える", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });

    app().deleteMicroGoal(microGoalId);

    expect(app().microGoals).toHaveLength(0);
    expect(app().weeklyItems).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. マス単位の入れ替え
// ---------------------------------------------------------------------------
describe("入れ替え", () => {
  it("swapSubGoals で位置が入れ替わる", () => {
    app().upsertSubGoal(1, "A");
    app().upsertSubGoal(2, "B");

    app().swapSubGoals(1, 2);

    const byPos = (p: number) =>
      app().subGoals.find((g) => g.position === p)!.title;
    expect(byPos(1)).toBe("B");
    expect(byPos(2)).toBe("A");
  });

  it("空きマスへの移動もできる", () => {
    app().upsertSubGoal(1, "A");

    app().swapSubGoals(1, 5);

    expect(app().subGoals.find((g) => g.position === 1)).toBeUndefined();
    expect(app().subGoals.find((g) => g.position === 5)!.title).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// 10. 全消去
// ---------------------------------------------------------------------------
describe("resetAll", () => {
  it("空のマンダラ1つに戻る", () => {
    const { microGoalId } = seedOneMicro();
    app().addMicroToWeek(microGoalId, { frequencyType: "毎日" });

    app().resetAll();

    const s = useAppStore.getState();
    expect(s.mainGoals).toHaveLength(1);
    expect(s.mainGoals[0].title).toBe("");
    expect(s.activeMainGoalId).toBe(s.mainGoals[0].id);
    expect(s.subGoals).toEqual([]);
    expect(s.microGoals).toEqual([]);
    expect(s.weeklyItems).toEqual([]);
    expect(s.reviews).toEqual([]);
  });
});
