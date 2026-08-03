import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BodyText, HandText } from "@/src/components/ui";
import { AddFreeItemSheet } from "@/src/components/weekly/AddFreeItemSheet";
import { WeeklyCard } from "@/src/components/weekly/WeeklyCard";
import {
  currentWeekStart,
  parseKey,
  weekRangeLabel,
  weekStartsInMonth,
} from "@/src/lib/dates";
import { useAppStore } from "@/src/store/useAppStore";

/**
 * 週次リストのアーカイブ。年 → 月 → 週 の順にたどり、
 * 各週の週次リスト(項目と達成状況)を確認・編集できる。
 */
export function WeekArchive() {
  const weeklyItems = useAppStore((s) => s.weeklyItems);

  const currentWeek = currentWeekStart();
  const now = parseKey(currentWeek);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // データのある年 + 今年。降順。
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const w of weeklyItems) set.add(parseKey(w.weekStart).getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [weeklyItems, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [openMonth, setOpenMonth] = useState<number | null>(currentMonth);
  const [openWeek, setOpenWeek] = useState<string | null>(currentWeek);
  const [addWeek, setAddWeek] = useState<string | null>(null);

  // 表示する月(今年は今月まで、過去年は12月まで)。降順。
  const months = useMemo(() => {
    const last = year === currentYear ? currentMonth : 11;
    return Array.from({ length: last + 1 }, (_, i) => i).reverse();
  }, [year, currentYear, currentMonth]);

  const itemsOf = (ws: string) => weeklyItems.filter((w) => w.weekStart === ws);

  return (
    <View>
      {/* 年セレクタ */}
      <View style={styles.yearRow}>
        {years.map((y) => {
          const active = y === year;
          return (
            <Pressable
              key={y}
              onPress={() => {
                setYear(y);
                setOpenMonth(y === currentYear ? currentMonth : null);
                setOpenWeek(null);
              }}
              style={[styles.yearChip, active && styles.yearChipActive]}
            >
              <BodyText style={[styles.yearText, active && styles.yearTextActive]}>
                {y}年
              </BodyText>
            </Pressable>
          );
        })}
      </View>

      {/* 月 → 週 */}
      {months.map((m) => {
        const weeks = weekStartsInMonth(year, m)
          .filter((w) => w <= currentWeek)
          .sort((a, b) => b.localeCompare(a));
        if (weeks.length === 0) return null;
        const monthOpen = openMonth === m;

        return (
          <View key={m} style={styles.monthBlock}>
            <Pressable
              style={styles.monthHeader}
              onPress={() => setOpenMonth(monthOpen ? null : m)}
            >
              <HandText style={styles.monthTitle}>{m + 1}月</HandText>
              <BodyText style={styles.monthMeta}>{weeks.length}週</BodyText>
              <BodyText style={styles.chevron}>{monthOpen ? "▲" : "▼"}</BodyText>
            </Pressable>

            {monthOpen &&
              weeks.map((ws) => {
                const items = itemsOf(ws);
                const done = items.filter((i) => i.completed).length;
                const weekOpen = openWeek === ws;
                const isThisWeek = ws === currentWeek;

                return (
                  <View key={ws} style={styles.weekCard}>
                    <Pressable
                      style={styles.weekHeader}
                      onPress={() => setOpenWeek(weekOpen ? null : ws)}
                    >
                      <View style={styles.weekTitleRow}>
                        <BodyText style={styles.weekRange}>{weekRangeLabel(ws)}</BodyText>
                        {isThisWeek && (
                          <View style={styles.nowTag}>
                            <BodyText style={styles.nowTagText}>今週</BodyText>
                          </View>
                        )}
                      </View>
                      <BodyText style={styles.weekMeta}>
                        {items.length > 0 ? `${done}/${items.length} 達成` : "項目なし"}
                      </BodyText>
                      <BodyText style={styles.chevron}>{weekOpen ? "▲" : "▼"}</BodyText>
                    </Pressable>

                    {weekOpen && (
                      <View style={styles.weekBody}>
                        {items.map((item) => (
                          <WeeklyCard key={item.id} item={item} />
                        ))}
                        <Pressable
                          style={styles.addBtn}
                          onPress={() => setAddWeek(ws)}
                        >
                          <BodyText style={styles.addBtnText}>＋ 項目を追加</BodyText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        );
      })}

      <AddFreeItemSheet
        visible={addWeek !== null}
        weekStart={addWeek ?? undefined}
        weekLabel={addWeek ? weekRangeLabel(addWeek) : undefined}
        onClose={() => setAddWeek(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  yearChipActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  yearText: { fontSize: 14, color: Palette.inkSoft },
  yearTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },

  monthBlock: { marginBottom: 10 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  monthTitle: { fontSize: 22, color: Palette.ink },
  monthMeta: { flex: 1, fontSize: 12, color: Palette.muted },
  chevron: { fontSize: 11, color: Palette.faint },

  weekCard: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  weekTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  weekRange: { fontSize: 15, color: Palette.ink, fontFamily: Fonts.bodyBold, letterSpacing: 0.5 },
  nowTag: {
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nowTagText: { fontSize: 10, color: Palette.accent, fontFamily: Fonts.bodyBold },
  weekMeta: { fontSize: 12, color: Palette.muted },
  weekBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    backgroundColor: Palette.cardAlt,
  },
  addBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  addBtnText: { color: Palette.inkSoft, fontSize: 13, fontFamily: Fonts.bodyMedium },
});
