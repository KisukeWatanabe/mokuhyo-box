/**
 * 週境界・日付計算のテスト。
 *
 * このアプリは「週」が全ての単位(週次リスト・振り返り・頻度ルール)なので、
 * ここがずれると全機能が静かに壊れる。週の開始は月曜(dates.ts 冒頭の規約)。
 *
 * アサーションはローカル時刻前提で書いている。dates.ts が getFullYear /
 * getMonth / getDate とローカル時刻のコンストラクタしか使っていないため、
 * parseKey → toDateKey は任意のタイムゾーンで往復する。
 */
import {
  addDays,
  currentWeekStart,
  parseKey,
  recentWeekStarts,
  shortLabel,
  toDateKey,
  todayKey,
  weekRangeLabel,
  weekStartOf,
  weekStartsInMonth,
} from "@/src/lib/dates";
import { freezeTo, MONDAY, WEDNESDAY } from "@/test/factories";

describe("toDateKey / parseKey", () => {
  it("YYYY-MM-DD へ変換し、月日を0埋めする", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("parseKey → toDateKey で元のキーに戻る", () => {
    for (const key of ["2026-01-01", "2026-07-06", "2026-12-31"]) {
      expect(toDateKey(parseKey(key))).toBe(key);
    }
  });

  it("parseKey はローカル時刻の0時を返す(日付がずれない)", () => {
    const d = parseKey("2026-07-06");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(6);
    expect(d.getHours()).toBe(0);
  });
});

describe("weekStartOf", () => {
  it("月曜はその日自身を返す", () => {
    expect(weekStartOf(parseKey("2026-07-06"))).toBe("2026-07-06");
  });

  it("週の途中はその週の月曜まで戻る", () => {
    expect(weekStartOf(parseKey("2026-07-08"))).toBe("2026-07-06");
  });

  it("日曜は「前へ6日」戻る(翌週の月曜にしない)", () => {
    // 2026-07-12 は日曜。素朴に 1-dow で計算すると翌日になってしまう箇所。
    expect(weekStartOf(parseKey("2026-07-12"))).toBe("2026-07-06");
  });

  it("次の月曜は次の週として扱う", () => {
    expect(weekStartOf(parseKey("2026-07-13"))).toBe("2026-07-13");
  });

  it("年をまたぐ週でも前年の月曜を返す", () => {
    // 2026-01-01 は木曜なので、その週の月曜は前年の 12/29
    expect(weekStartOf(parseKey("2026-01-01"))).toBe("2025-12-29");
  });
});

describe("currentWeekStart / todayKey", () => {
  it("週の途中の日でもその週の月曜を返す", () => {
    freezeTo(WEDNESDAY);
    expect(todayKey()).toBe(WEDNESDAY);
    expect(currentWeekStart()).toBe(MONDAY);
  });

  it("日曜でも同じ週の月曜のまま(週が切り替わらない)", () => {
    freezeTo("2026-07-12");
    expect(currentWeekStart()).toBe(MONDAY);
  });

  it("月曜0時を越えたら次の週になる", () => {
    freezeTo("2026-07-13", 0);
    expect(currentWeekStart()).toBe("2026-07-13");
  });
});

describe("addDays", () => {
  it("前後に動かせる", () => {
    expect(addDays("2026-07-06", 6)).toBe("2026-07-12");
    expect(addDays("2026-07-06", -7)).toBe("2026-06-29");
  });

  it("月末・年末をまたげる", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("うるう年の2月末を正しく扱う", () => {
    // 2028 はうるう年
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("weekRangeLabel / shortLabel", () => {
  it("週開始日から6日後までの範囲を出す", () => {
    expect(weekRangeLabel("2026-07-06")).toBe("7/6 − 7/12");
  });

  it("月をまたぐ週も繋げて表示する", () => {
    expect(weekRangeLabel("2026-06-29")).toBe("6/29 − 7/5");
  });

  it("shortLabel は0埋めしない短い表記", () => {
    expect(shortLabel("2026-07-09")).toBe("7/9");
  });
});

describe("recentWeekStarts", () => {
  it("今週を最後に、古い順でn週分返す", () => {
    freezeTo(WEDNESDAY);
    expect(recentWeekStarts(3)).toEqual([
      "2026-06-22",
      "2026-06-29",
      "2026-07-06",
    ]);
  });

  it("振り返り画面が使う8週分でも連続している", () => {
    freezeTo(WEDNESDAY);
    const weeks = recentWeekStarts(8);
    expect(weeks).toHaveLength(8);
    expect(weeks[weeks.length - 1]).toBe(MONDAY);
    for (let i = 1; i < weeks.length; i++) {
      expect(addDays(weeks[i - 1], 7)).toBe(weeks[i]);
    }
  });
});

describe("weekStartsInMonth", () => {
  it("月曜がその月に含まれる週だけを返す", () => {
    // 2026年7月: 6, 13, 20, 27 の4週。
    // 7/1(水)を含む週の月曜は 6/29 で、6月所属なので含まれない。
    expect(weekStartsInMonth(2026, 6)).toEqual([
      "2026-07-06",
      "2026-07-13",
      "2026-07-20",
      "2026-07-27",
    ]);
  });

  it("月曜が5回ある月は5件返す", () => {
    expect(weekStartsInMonth(2026, 2)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
  });

  it("返した週開始日はすべて月曜で、その月に属する", () => {
    for (let month0 = 0; month0 < 12; month0++) {
      for (const key of weekStartsInMonth(2026, month0)) {
        const d = parseKey(key);
        expect(d.getDay()).toBe(1); // 月曜
        expect(d.getMonth()).toBe(month0);
      }
    }
  });
});
