/** 週関連ユーティリティ。週の開始は月曜日とする。 */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** その日を含む週の月曜日を返す */
export function weekStartOf(d: Date): string {
  const copy = new Date(d);
  const dow = copy.getDay(); // 0=日
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  return toDateKey(copy);
}

export function currentWeekStart(): string {
  return weekStartOf(new Date());
}

/** 週開始日から "7/6 − 7/12" 形式のラベルを作る */
export function weekRangeLabel(weekStart: string): string {
  const start = parseKey(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} − ${end.getMonth() + 1}/${end.getDate()}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 週開始日の配列(過去n週、古い順) */
export function recentWeekStarts(n: number): string[] {
  const starts: string[] = [];
  const base = parseKey(currentWeekStart());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 7);
    starts.push(toDateKey(d));
  }
  return starts;
}

/** "7/9" のような短い日付ラベル */
export function shortLabel(key: string): string {
  const d = parseKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/**
 * 指定した年・月(month0: 0-11)に属する週開始日(月曜)の配列。
 * 「週の所属月」は、その週の月曜日が含まれる月とする。古い順。
 */
export function weekStartsInMonth(year: number, month0: number): string[] {
  const first = new Date(year, month0, 1);
  // 1日を含む週の月曜へ
  const d = new Date(first);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  const res: string[] = [];
  for (let i = 0; i < 6; i++) {
    if (d.getFullYear() === year && d.getMonth() === month0) {
      res.push(toDateKey(d));
    }
    d.setDate(d.getDate() + 7);
  }
  return res;
}
