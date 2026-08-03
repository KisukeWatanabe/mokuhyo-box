/**
 * 目標BOX アプリ全体ストア(Zustand + AsyncStorage 永続化)
 *
 * ── 未決定事項に対する仮決定(CLAUDE.md 8章)──────────────────
 * 1. 継続習慣の達成判定:
 *    週次リスト側の実績で判定する。週の目標(回数/日数)を満たすと
 *    その週はマンダラのマスが「達成済み(緑)」になる。
 *    翌週に再度とり込むと「週次リストに追加済み」に戻る(習慣は毎週リセット)。
 *    - ○×型×毎日 は「週5日以上」で達成扱い(完璧主義で挫折しないための緩め設定)
 * 2. PencilKit 手書き入力: 今回は未対応(テキスト入力のみ)。
 * 3. 保存先: AsyncStorage による端末ローカルのみ。クラウド同期は持たない。
 * ──────────────────────────────────────────────
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ChecklistEntry,
  FrequencyType,
  MainGoal,
  MicroGoal,
  ProgressType,
  SubGoal,
  WeeklyItem,
  WeeklyReview,
} from "../types";
import { addDays, currentWeekStart, todayKey } from "../lib/dates";
import { createMigratingStorage } from "./persistStorage";
import { buildEmptyState, buildSeedState } from "./seed";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

/** 週次項目の完了判定(タイプ別) */
export function isItemCompleted(item: WeeklyItem): boolean {
  switch (item.progressType) {
    case "○×型":
      if (item.frequencyType === "毎日") {
        // 仮決定: 週5日以上チェックで達成扱い
        return item.doneDates.length >= 5;
      }
      return item.doneDates.length >= 1;
    case "回数型":
      return item.doneDates.length >= (item.targetCount ?? 1);
    case "数値型":
      return (
        (item.numericTarget ?? 0) > 0 &&
        (item.numericValue ?? 0) >= (item.numericTarget ?? 0)
      );
    case "動的チェックリスト型": {
      const done = (item.checklist ?? []).filter((c) => c.done).length;
      const target = item.checklistTarget ?? Math.max(1, (item.checklist ?? []).length);
      return done >= target;
    }
  }
}

type State = {
  mainGoals: MainGoal[]; // 複数のマンダラ
  activeMainGoalId: string; // 表示中のマンダラ(ローカルのみ)
  subGoals: SubGoal[];
  microGoals: MicroGoal[];
  weeklyItems: WeeklyItem[];
  reviews: WeeklyReview[];
};

/** 小目標の新規作成・進捗タイプ設定の入力 */
export type MicroGoalInput = {
  title: string;
  frequencyType: FrequencyType;
  progressType: ProgressType;
  targetCount?: number;
  numericTarget?: number;
  numericUnit?: string;
  checklistTarget?: number;
};

/** マンダラ → 週次リストへとり込む際のオプション */
export type TakeInOptions = {
  frequencyType: FrequencyType;
  targetCount?: number;
  numericTarget?: number;
  numericUnit?: string;
  checklistTarget?: number;
  dueDate?: string;
};

/** フリー項目(週次リストのみ)の入力 */
export type FreeItemInput = {
  title: string;
  progressType: ProgressType;
  frequencyType: FrequencyType;
  targetCount?: number;
  numericTarget?: number;
  numericUnit?: string;
  dueDate?: string;
  /** 追加先の週(省略時は今週)。振り返りアーカイブから過去週へ追加する用 */
  weekStart?: string;
};

type Actions = {
  // 大目標 / マンダラ
  updateMainGoalTitle: (title: string) => void;
  addMainGoal: (title: string, year: number) => void;
  setActiveMainGoal: (id: string) => void;
  /** 切り替えリスト上で1つ分だけ上(-1)/下(+1)へ動かす */
  moveMainGoal: (id: string, direction: -1 | 1) => void;
  updateMainGoal: (id: string, patch: Partial<Pick<MainGoal, "title" | "year">>) => void;
  deleteMainGoal: (id: string) => void;
  // 中目標
  upsertSubGoal: (position: number, title: string) => void;
  deleteSubGoal: (id: string) => void;
  swapSubGoals: (posA: number, posB: number) => void;
  // 小目標
  addMicroGoal: (subGoalId: string, position: number, input: MicroGoalInput) => void;
  updateMicroGoal: (
    id: string,
    patch: Partial<
      Pick<
        MicroGoal,
        | "title"
        | "frequencyType"
        | "progressType"
        | "targetCount"
        | "numericTarget"
        | "numericUnit"
        | "checklistTarget"
        | "manualStatus"
      >
    >,
  ) => void;
  deleteMicroGoal: (id: string) => void;
  swapMicroGoals: (subGoalId: string, posA: number, posB: number) => void;
  // マンダラ → 週次リスト
  addMicroToWeek: (microGoalId: string, opts: TakeInOptions) => void;
  // 週次リスト操作
  addFreeItem: (input: FreeItemInput) => void;
  deleteWeeklyItem: (id: string) => void;
  toggleDoneDate: (id: string, dateKey?: string) => void;
  setNumericValue: (id: string, value: number, comment?: string) => void;
  addChecklistEntry: (id: string, text: string) => void;
  toggleChecklistEntry: (id: string, entryId: string) => void;
  // 振り返り
  setReviewScore: (weekStart: string, score: number) => void;
  setReviewNote: (weekStart: string, note: string) => void;
  // メンテナンス
  ensureCurrentWeek: () => void;
  /** 単発項目のうち期限超過 & 未達成のものを「消化」(週次リストから除去)する */
  sweepExpiredSingles: () => void;
  // オンボーディング(入力しながら進むチュートリアル)からの書き込み
  /** 大目標を確定し、書き込んだマンダラの id を返す */
  saveOnboardingMainGoal: (title: string, existingId?: string | null) => string;
  /** 中目標を1つ確定し、その id を返す */
  saveOnboardingSubGoal: (title: string, existingId?: string | null) => string;
  /** 小目標を1つ確定し、その id を返す */
  saveOnboardingMicroGoal: (
    subGoalId: string,
    title: string,
    frequencyType: FrequencyType,
    existingId?: string | null,
  ) => string;
  /** 全データを消して空のマンダラ1つに戻す */
  resetAll: () => void;
  /** サンプル(81マス)を追加のマンダラとして投入し、表示を切り替える */
  loadSample: () => void;
};

/**
 * 変更のたびに呼ぶ再計算:
 * 週次項目の完了フラグ → 小目標status(双方向同期) → 中目標/大目標の達成率
 */
function recalc(s: State): State {
  const week = currentWeekStart();
  const weeklyItems = s.weeklyItems.map((it) => ({
    ...it,
    completed: isItemCompleted(it),
  }));

  const microGoals = s.microGoals.map((mg) => {
    // 編集画面で色を明示指定していれば、それを最優先にする。
    // (週次リストの達成状況では上書きしない = 手動が勝つ)
    if (mg.manualStatus) {
      return mg.status === mg.manualStatus
        ? mg
        : { ...mg, status: mg.manualStatus };
    }
    const linked = weeklyItems.filter(
      (w) => w.microGoalId === mg.id && w.weekStart === week,
    );
    if (linked.length === 0) return mg;
    const done = linked.some((w) => w.completed);
    const status: MicroGoal["status"] = done
      ? "達成済み"
      : "週次リストに追加済み";
    return mg.status === status ? mg : { ...mg, status };
  });

  const subGoals = s.subGoals.map((sg) => {
    const children = microGoals.filter((m) => m.subGoalId === sg.id);
    const achieved = children.filter((m) => m.status === "達成済み").length;
    const rate = achieved / 8; // マスは常に8枠(空きマスは未達成扱い)
    return sg.progressRate === rate ? sg : { ...sg, progressRate: rate };
  });

  // 各マンダラ(大目標)の進捗をその配下の中目標から算出
  const mainGoals = s.mainGoals.map((mg) => {
    const subs = subGoals.filter((sg) => sg.mainGoalId === mg.id);
    const rate = subs.reduce((a, b) => a + b.progressRate, 0) / 8; // 常に8枠
    if (mg.progressRate === rate) return mg;
    return { ...mg, progressRate: rate, updatedAt: new Date().toISOString() };
  });

  return { ...s, weeklyItems, microGoals, subGoals, mainGoals };
}

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...buildEmptyState(),

      updateMainGoalTitle: (title) =>
        set((s) =>
          recalc({
            ...pickState(s),
            mainGoals: s.mainGoals.map((g) =>
              g.id === s.activeMainGoalId
                ? { ...g, title, updatedAt: new Date().toISOString() }
                : g,
            ),
          }),
        ),

      addMainGoal: (title, year) =>
        set((s) => {
          const now = new Date().toISOString();
          const mg: MainGoal = {
            id: uid(),
            title,
            year,
            progressRate: 0,
            sortOrder: nextSortOrder(s.mainGoals),
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...pickState(s),
            mainGoals: [...s.mainGoals, mg],
            activeMainGoalId: mg.id,
          };
        }),

      setActiveMainGoal: (id) => set(() => ({ activeMainGoalId: id })),

      /**
       * 切り替えリスト上で1つ分だけ上下に動かす。
       * 表示順(sortOrder 昇順)で隣り合う相手と sortOrder を入れ替える。
       */
      moveMainGoal: (id, direction) =>
        set((s) => {
          const ordered = orderMainGoals(s.mainGoals);
          const index = ordered.findIndex((g) => g.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= ordered.length) return s;

          const a = ordered[index];
          const b = ordered[target];
          return {
            ...pickState(s),
            mainGoals: s.mainGoals.map((g) => {
              if (g.id === a.id) return { ...g, sortOrder: b.sortOrder };
              if (g.id === b.id) return { ...g, sortOrder: a.sortOrder };
              return g;
            }),
          };
        }),

      updateMainGoal: (id, patch) =>
        set((s) => ({
          ...pickState(s),
          mainGoals: s.mainGoals.map((g) =>
            g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
          ),
        })),

      deleteMainGoal: (id) =>
        set((s) => {
          if (s.mainGoals.length <= 1) return s; // 最後の1つは残す
          const subIds = s.subGoals
            .filter((g) => g.mainGoalId === id)
            .map((g) => g.id);
          const microIds = s.microGoals
            .filter((m) => subIds.includes(m.subGoalId))
            .map((m) => m.id);
          const mainGoals = s.mainGoals.filter((g) => g.id !== id);
          const activeMainGoalId =
            s.activeMainGoalId === id ? mainGoals[0].id : s.activeMainGoalId;
          return recalc({
            ...pickState(s),
            mainGoals,
            activeMainGoalId,
            subGoals: s.subGoals.filter((g) => g.mainGoalId !== id),
            microGoals: s.microGoals.filter((m) => !microIds.includes(m.id)),
            weeklyItems: s.weeklyItems.filter(
              (w) => !w.microGoalId || !microIds.includes(w.microGoalId),
            ),
          });
        }),

      upsertSubGoal: (position, title) =>
        set((s) => {
          const activeId = s.activeMainGoalId;
          const existing = s.subGoals.find(
            (g) => g.position === position && g.mainGoalId === activeId,
          );
          const subGoals = existing
            ? s.subGoals.map((g) => (g.id === existing.id ? { ...g, title } : g))
            : [
                ...s.subGoals,
                {
                  id: uid(),
                  mainGoalId: activeId,
                  title,
                  position,
                  progressRate: 0,
                },
              ];
          return recalc({ ...pickState(s), subGoals });
        }),

      deleteSubGoal: (id) =>
        set((s) => {
          const microIds = s.microGoals
            .filter((m) => m.subGoalId === id)
            .map((m) => m.id);
          return recalc({
            ...pickState(s),
            subGoals: s.subGoals.filter((g) => g.id !== id),
            microGoals: s.microGoals.filter((m) => m.subGoalId !== id),
            weeklyItems: s.weeklyItems.filter(
              (w) => !w.microGoalId || !microIds.includes(w.microGoalId),
            ),
          });
        }),

      swapSubGoals: (posA, posB) =>
        set((s) => {
          const activeId = s.activeMainGoalId;
          return {
            subGoals: s.subGoals.map((g) => {
              if (g.mainGoalId !== activeId) return g;
              if (g.position === posA) return { ...g, position: posB };
              if (g.position === posB) return { ...g, position: posA };
              return g;
            }),
          };
        }),

      addMicroGoal: (subGoalId, position, input) =>
        set((s) =>
          recalc({
            ...pickState(s),
            microGoals: [
              ...s.microGoals,
              {
                id: uid(),
                subGoalId,
                title: input.title,
                position,
                frequencyType: input.frequencyType,
                progressType: input.progressType,
                progressValue: {},
                status: "未着手",
                linkedWeeklyItemIds: [],
                targetCount: input.targetCount,
                numericTarget: input.numericTarget,
                numericUnit: input.numericUnit,
                checklistTarget: input.checklistTarget,
              },
            ],
          }),
        ),

      updateMicroGoal: (id, patch) =>
        set((s) =>
          recalc({
            ...pickState(s),
            microGoals: s.microGoals.map((m) => {
              if (m.id !== id) return m;
              const next = { ...m, ...patch };
              // 手動指定を「自動」に戻したときは status を一度リセットする。
              // recalc は今週の週次項目が無い小目標の status を触らないため、
              // これが無いと手動で付けた色が残り続けてしまう。
              if ("manualStatus" in patch && !patch.manualStatus) {
                next.status = "未着手";
              }
              return next;
            }),
            // タイトル変更は今週の週次項目にも反映
            weeklyItems: patch.title
              ? s.weeklyItems.map((w) =>
                  w.microGoalId === id ? { ...w, title: patch.title! } : w,
                )
              : s.weeklyItems,
          }),
        ),

      deleteMicroGoal: (id) =>
        set((s) =>
          recalc({
            ...pickState(s),
            microGoals: s.microGoals.filter((m) => m.id !== id),
            weeklyItems: s.weeklyItems.filter((w) => w.microGoalId !== id),
          }),
        ),

      swapMicroGoals: (subGoalId, posA, posB) =>
        set((s) => ({
          microGoals: s.microGoals.map((m) =>
            m.subGoalId !== subGoalId
              ? m
              : m.position === posA
                ? { ...m, position: posB }
                : m.position === posB
                  ? { ...m, position: posA }
                  : m,
          ),
        })),

      addMicroToWeek: (microGoalId, opts) =>
        set((s) => {
          const mg = s.microGoals.find((m) => m.id === microGoalId);
          if (!mg) return s;
          const { frequencyType } = opts;
          const week = currentWeekStart();
          // 二重追加を防ぐ: 既に今週の項目があれば設定だけ更新
          const existing = s.weeklyItems.find(
            (w) => w.microGoalId === microGoalId && w.weekStart === week,
          );
          const sub = s.subGoals.find((g) => g.id === mg.subGoalId);

          // 進捗タイプは小目標のものを基本とし、週数回のみ回数型に寄せる
          const progressType: ProgressType =
            mg.progressType === "数値型" || mg.progressType === "動的チェックリスト型"
              ? mg.progressType
              : frequencyType === "週数回"
                ? "回数型"
                : "○×型";

          // 各タイプの目標値を「とり込みオプション → 小目標の既定値 → 妥当なデフォルト」の順で解決
          const targetCount =
            progressType === "回数型"
              ? opts.targetCount ?? mg.targetCount ?? 3
              : undefined;
          const numericTarget =
            progressType === "数値型"
              ? opts.numericTarget ?? mg.numericTarget ?? 0
              : undefined;
          const numericUnit =
            progressType === "数値型"
              ? opts.numericUnit ?? mg.numericUnit
              : undefined;
          const checklistTarget =
            progressType === "動的チェックリスト型"
              ? opts.checklistTarget ?? mg.checklistTarget ?? 3
              : undefined;
          const dueDate = frequencyType === "単発" ? opts.dueDate : undefined;

          let weeklyItems: WeeklyItem[];
          if (existing) {
            weeklyItems = s.weeklyItems.map((w) =>
              w.id === existing.id
                ? {
                    ...w,
                    frequencyType,
                    progressType,
                    targetCount,
                    numericTarget: numericTarget ?? w.numericTarget,
                    numericUnit: numericUnit ?? w.numericUnit,
                    checklistTarget: checklistTarget ?? w.checklistTarget,
                    dueDate,
                  }
                : w,
            );
          } else {
            const item: WeeklyItem = {
              id: uid(),
              weekStart: week,
              title: mg.title,
              progressType,
              frequencyType,
              microGoalId,
              subGoalTitle: sub?.title,
              doneDates: [],
              targetCount,
              numericTarget,
              numericValue: progressType === "数値型" ? 0 : undefined,
              numericUnit,
              checklist: progressType === "動的チェックリスト型" ? [] : undefined,
              checklistTarget,
              dueDate,
              completed: false,
              createdAt: new Date().toISOString(),
            };
            weeklyItems = [...s.weeklyItems, item];
          }

          return recalc({
            ...pickState(s),
            weeklyItems,
            microGoals: s.microGoals.map((m) =>
              m.id === microGoalId
                ? {
                    ...m,
                    frequencyType,
                    status:
                      m.status === "達成済み" ? m.status : "週次リストに追加済み",
                    linkedWeeklyItemIds: existing
                      ? m.linkedWeeklyItemIds
                      : [...m.linkedWeeklyItemIds, weeklyItems[weeklyItems.length - 1].id],
                  }
                : m,
            ),
          });
        }),

      addFreeItem: (input) =>
        set((s) => {
          const { title, progressType, frequencyType } = input;
          const item: WeeklyItem = {
            id: uid(),
            weekStart: input.weekStart ?? currentWeekStart(),
            title,
            progressType,
            frequencyType,
            doneDates: [],
            targetCount: progressType === "回数型" ? (input.targetCount ?? 3) : undefined,
            numericTarget: progressType === "数値型" ? (input.numericTarget ?? 0) : undefined,
            numericValue: progressType === "数値型" ? 0 : undefined,
            numericUnit: progressType === "数値型" ? input.numericUnit : undefined,
            checklist: progressType === "動的チェックリスト型" ? [] : undefined,
            checklistTarget: progressType === "動的チェックリスト型" ? 3 : undefined,
            dueDate: frequencyType === "単発" ? input.dueDate : undefined,
            completed: false,
            createdAt: new Date().toISOString(),
          };
          return recalc({ ...pickState(s), weeklyItems: [...s.weeklyItems, item] });
        }),

      deleteWeeklyItem: (id) =>
        set((s) => {
          const item = s.weeklyItems.find((w) => w.id === id);
          return recalc({
            ...pickState(s),
            weeklyItems: s.weeklyItems.filter((w) => w.id !== id),
            // マンダラ側は「追加前」の状態に戻す
            microGoals: item?.microGoalId
              ? s.microGoals.map((m) =>
                  m.id === item.microGoalId
                    ? {
                        ...m,
                        status: "未着手",
                        linkedWeeklyItemIds: m.linkedWeeklyItemIds.filter(
                          (x) => x !== id,
                        ),
                      }
                    : m,
                )
              : s.microGoals,
          });
        }),

      toggleDoneDate: (id, dateKey) =>
        set((s) => {
          const key = dateKey ?? todayKey();
          return recalc({
            ...pickState(s),
            weeklyItems: s.weeklyItems.map((w) => {
              if (w.id !== id) return w;
              const has = w.doneDates.includes(key);
              return {
                ...w,
                doneDates: has
                  ? w.doneDates.filter((d) => d !== key)
                  : [...w.doneDates, key].sort(),
              };
            }),
          });
        }),

      setNumericValue: (id, value, comment) =>
        set((s) =>
          recalc({
            ...pickState(s),
            weeklyItems: s.weeklyItems.map((w) =>
              w.id === id
                ? {
                    ...w,
                    numericValue: value,
                    numericComment: comment ?? w.numericComment,
                  }
                : w,
            ),
          }),
        ),

      addChecklistEntry: (id, text) =>
        set((s) =>
          recalc({
            ...pickState(s),
            weeklyItems: s.weeklyItems.map((w) => {
              if (w.id !== id) return w;
              const entry: ChecklistEntry = { id: uid(), text, done: true };
              return { ...w, checklist: [...(w.checklist ?? []), entry] };
            }),
          }),
        ),

      toggleChecklistEntry: (id, entryId) =>
        set((s) =>
          recalc({
            ...pickState(s),
            weeklyItems: s.weeklyItems.map((w) =>
              w.id === id
                ? {
                    ...w,
                    checklist: (w.checklist ?? []).map((c) =>
                      c.id === entryId ? { ...c, done: !c.done } : c,
                    ),
                  }
                : w,
            ),
          }),
        ),

      setReviewScore: (weekStart, score) =>
        set((s) => ({ reviews: upsertReview(s.reviews, weekStart, { score }) })),

      setReviewNote: (weekStart, note) =>
        set((s) => ({ reviews: upsertReview(s.reviews, weekStart, { note }) })),

      /**
       * 週跨ぎ処理: アプリ起動時に呼ぶ。
       * 「毎日」「週数回」「週1回」の小目標のうち、前週にとり込まれていたものを
       * 今週の週次リストに自動再生成する(単発は再生成しない)。
       */
      ensureCurrentWeek: () => {
        const s = get();
        const week = currentWeekStart();
        const prevWeek = addDays(week, -7);
        const additions: WeeklyItem[] = [];
        const microPatches = new Map<string, string[]>();

        for (const mg of s.microGoals) {
          if (mg.frequencyType === "単発") continue;
          const hasThisWeek = s.weeklyItems.some(
            (w) => w.microGoalId === mg.id && w.weekStart === week,
          );
          if (hasThisWeek) continue;
          const prevItem = s.weeklyItems.find(
            (w) => w.microGoalId === mg.id && w.weekStart === prevWeek,
          );
          if (!prevItem) continue;
          const sub = s.subGoals.find((g) => g.id === mg.subGoalId);
          const item: WeeklyItem = {
            ...prevItem,
            id: uid(),
            weekStart: week,
            doneDates: [],
            numericComment: undefined,
            checklist: prevItem.checklist ? [] : undefined,
            completed: false,
            subGoalTitle: sub?.title,
            createdAt: new Date().toISOString(),
          };
          additions.push(item);
          microPatches.set(mg.id, [...mg.linkedWeeklyItemIds, item.id]);
        }
        if (additions.length === 0) return;

        set((st) =>
          recalc({
            ...pickState(st),
            weeklyItems: [...st.weeklyItems, ...additions],
            microGoals: st.microGoals.map((m) =>
              microPatches.has(m.id)
                ? {
                    ...m,
                    status: "週次リストに追加済み",
                    linkedWeeklyItemIds: microPatches.get(m.id)!,
                  }
                : m,
            ),
          }),
        );
      },

      sweepExpiredSingles: () => {
        const s = get();
        const today = todayKey();
        // 単発 & 期限あり & 期限超過 & 未達成 → 消化(除去)対象
        const expired = s.weeklyItems.filter(
          (w) =>
            w.frequencyType === "単発" &&
            !!w.dueDate &&
            w.dueDate < today &&
            !w.completed,
        );
        if (expired.length === 0) return;

        const expiredIds = new Set(expired.map((w) => w.id));
        const expiredMicroIds = new Set(
          expired.map((w) => w.microGoalId).filter((x): x is string => !!x),
        );

        set((st) =>
          recalc({
            ...pickState(st),
            weeklyItems: st.weeklyItems.filter((w) => !expiredIds.has(w.id)),
            // 消化された小目標は「未着手」に戻し、再計画できるようにする
            microGoals: st.microGoals.map((m) =>
              expiredMicroIds.has(m.id) && m.status !== "達成済み"
                ? {
                    ...m,
                    status: "未着手",
                    linkedWeeklyItemIds: m.linkedWeeklyItemIds.filter(
                      (x) => !expiredIds.has(x),
                    ),
                  }
                : m,
            ),
          }),
        );
      },

      /**
       * オンボーディングで入力された大目標を保存する。
       * 書き込み先は「まだ何も入っていないマンダラがあればそれ、無ければ新規作成」。
       * これによりサンプル投入済み・既存ユーザーのデータを上書きしない。
       * 戻って編集した場合は existingId を渡し、マンダラを増やさず更新する。
       */
      saveOnboardingMainGoal: (title, existingId) => {
        if (existingId) {
          get().updateMainGoal(existingId, { title });
          return existingId;
        }
        const s = get();
        const active = selectActiveMainGoal(s);
        const untouched =
          active &&
          active.title.trim() === "" &&
          !s.subGoals.some((g) => g.mainGoalId === active.id);

        if (untouched) {
          get().updateMainGoal(active.id, { title });
          get().setActiveMainGoal(active.id);
          return active.id;
        }
        get().addMainGoal(title, new Date().getFullYear());
        return get().activeMainGoalId; // addMainGoal が新しいマンダラをアクティブにする
      },

      /** オンボーディングの中目標(1つだけ)。空いている最初のマスに入れる。 */
      saveOnboardingSubGoal: (title, existingId) => {
        const s = get();
        const mainId = s.activeMainGoalId;
        const mine = s.subGoals.filter((g) => g.mainGoalId === mainId);
        const existing = existingId
          ? mine.find((g) => g.id === existingId)
          : undefined;
        const position =
          existing?.position ??
          firstFreePosition(mine.map((g) => g.position));
        get().upsertSubGoal(position, title);
        const saved = get().subGoals.find(
          (g) => g.mainGoalId === mainId && g.position === position,
        );
        return saved ? saved.id : "";
      },

      /** オンボーディングの小目標(1つだけ)。頻度から進捗タイプを決める。 */
      saveOnboardingMicroGoal: (subGoalId, title, frequencyType, existingId) => {
        // 週数回だけ「回数型」、それ以外は素直に○×型にする(仕様8章の仮決定)
        const progressType: ProgressType =
          frequencyType === "週数回" ? "回数型" : "○×型";
        const targetCount = frequencyType === "週数回" ? 3 : undefined;

        if (existingId) {
          get().updateMicroGoal(existingId, {
            title,
            frequencyType,
            progressType,
            targetCount,
          });
          return existingId;
        }
        const mine = get().microGoals.filter((m) => m.subGoalId === subGoalId);
        const position = firstFreePosition(mine.map((m) => m.position));
        get().addMicroGoal(subGoalId, position, {
          title,
          frequencyType,
          progressType,
          targetCount,
        });
        const saved = get().microGoals.find(
          (m) => m.subGoalId === subGoalId && m.position === position,
        );
        return saved ? saved.id : "";
      },

      resetAll: () => set(() => buildEmptyState()),

      loadSample: () =>
        set((s) => {
          const sample = buildSeedState();
          // サンプルは「追加のマンダラ」として入れる(ユーザーの既存データは消さない)。
          // ただし未入力のまま残っている空マンダラは切替リストに
          // 「大目標を決める」として並んでしまうので、ここで置き換える。
          // (中目標が1つでも入っていれば触らない)
          const kept = s.mainGoals.filter(
            (g) =>
              g.title.trim() !== "" ||
              s.subGoals.some((x) => x.mainGoalId === g.id),
          );
          // 振り返りスコアだけは週(weekStart)が主キーで衝突しうるため、
          // ユーザーが未記入の週にのみサンプル値を入れる。
          const usedWeeks = new Set(s.reviews.map((r) => r.weekStart));
          return recalc({
            ...pickState(s),
            mainGoals: [
              ...kept,
              // サンプルは常に末尾へ(既存の並び順を崩さない)
              ...sample.mainGoals.map((g) => ({
                ...g,
                sortOrder: nextSortOrder(kept),
              })),
            ],
            activeMainGoalId: sample.activeMainGoalId,
            subGoals: [...s.subGoals, ...sample.subGoals],
            microGoals: [...s.microGoals, ...sample.microGoals],
            weeklyItems: [...s.weeklyItems, ...sample.weeklyItems],
            reviews: [
              ...s.reviews,
              ...sample.reviews.filter((r) => !usedWeeks.has(r.weekStart)),
            ],
          });
        }),
    }),
    {
      name: "mokuhyo-box-store-v1",
      version: 3,
      // 旧名(MANDALAWEEK)で保存されたデータを引き継ぐ
      storage: createMigratingStorage("mandalaweek-store-v1"),
      partialize: (s) => pickState(s),
      migrate: (persisted: any, version) => {
        // v1(単数 mainGoal)→ v2(複数 mainGoals + activeMainGoalId)
        if (version < 2 && persisted && persisted.mainGoal) {
          persisted.mainGoals = [persisted.mainGoal];
          persisted.activeMainGoalId = persisted.mainGoal.id;
          delete persisted.mainGoal;
        }
        // v2 → v3: 並び替え用の sortOrder を、それまでの配列順で埋める
        if (version < 3 && persisted && Array.isArray(persisted.mainGoals)) {
          persisted.mainGoals = persisted.mainGoals.map(
            (g: any, i: number) => ({
              ...g,
              sortOrder: typeof g.sortOrder === "number" ? g.sortOrder : i,
            }),
          );
        }
        return persisted;
      },
    },
  ),
);

/** 表示順(sortOrder 昇順)。同値なら作成順で安定させる。 */
export function orderMainGoals(goals: MainGoal[]): MainGoal[] {
  return [...goals].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );
}

/** 末尾に追加するための sortOrder */
function nextSortOrder(goals: MainGoal[]): number {
  return goals.length === 0
    ? 0
    : Math.max(...goals.map((g) => g.sortOrder)) + 1;
}

/** 1-8 のうち埋まっていない最初のマス。全て埋まっていれば 1(上書き)。 */
function firstFreePosition(used: number[]): number {
  return [1, 2, 3, 4, 5, 6, 7, 8].find((p) => !used.includes(p)) ?? 1;
}

function pickState(s: State & Partial<Actions>): State {
  return {
    mainGoals: s.mainGoals,
    activeMainGoalId: s.activeMainGoalId,
    subGoals: s.subGoals,
    microGoals: s.microGoals,
    weeklyItems: s.weeklyItems,
    reviews: s.reviews,
  };
}

/** 表示中のマンダラ(大目標)。無ければ先頭。 */
export function selectActiveMainGoal(s: State): MainGoal {
  return s.mainGoals.find((g) => g.id === s.activeMainGoalId) ?? s.mainGoals[0];
}

/**
 * まだ何も入力されていない状態か(= buildEmptyState 直後)。
 * オンボーディングを自動表示してよいかの判定に使う。
 * サンプル投入済み・既存ユーザーはここで false になり、勝手に立ち上がらない。
 */
export function selectIsFreshStart(s: State): boolean {
  return (
    s.mainGoals.length === 1 &&
    s.mainGoals[0].title.trim() === "" &&
    s.subGoals.length === 0 &&
    s.microGoals.length === 0 &&
    s.weeklyItems.length === 0
  );
}

function upsertReview(
  reviews: WeeklyReview[],
  weekStart: string,
  patch: Partial<WeeklyReview>,
): WeeklyReview[] {
  const existing = reviews.find((r) => r.weekStart === weekStart);
  const now = new Date().toISOString();
  if (existing) {
    return reviews.map((r) =>
      r.weekStart === weekStart ? { ...r, ...patch, updatedAt: now } : r,
    );
  }
  return [
    ...reviews,
    { weekStart, score: 50, note: "", ...patch, updatedAt: now },
  ];
}

/** 今週の週次項目セレクタ */
export function selectThisWeekItems(s: State): WeeklyItem[] {
  const week = currentWeekStart();
  return s.weeklyItems.filter((w) => w.weekStart === week);
}
