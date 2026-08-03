import React, { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { BodyText, HandText, ProgressBar } from "@/src/components/ui";
import { addDays, currentWeekStart, shortLabel, todayKey } from "@/src/lib/dates";
import { useAppStore } from "@/src/store/useAppStore";
import { WeeklyItem } from "@/src/types";

/** 週次リストのカード。progressType に応じて4種類の見た目に分岐する */
export function WeeklyCard({ item }: { item: WeeklyItem }) {
  const deleteWeeklyItem = useAppStore((s) => s.deleteWeeklyItem);
  const swipeRef = useRef<Swipeable>(null);

  const confirmDelete = () => {
    Alert.alert(
      item.title,
      item.microGoalId
        ? "この項目を削除すると、マンダラのマスは「未着手」に戻ります。"
        : "この項目を削除しますか?",
      [
        { text: "キャンセル", style: "cancel", onPress: () => swipeRef.current?.close() },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => deleteWeeklyItem(item.id),
        },
      ],
    );
  };

  const overdue =
    !!item.dueDate && item.dueDate < todayKey() && !item.completed;

  // 右スワイプで左側に「削除」ボタンを表示
  const renderDeleteAction = () => (
    <Pressable style={styles.swipeDelete} onPress={confirmDelete}>
      <HandText style={styles.swipeDeleteText}>削除</HandText>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderDeleteAction}
      overshootLeft={false}
      leftThreshold={40}
      containerStyle={styles.swipeContainer}
    >
    <Pressable onLongPress={confirmDelete} delayLongPress={400} style={[styles.card, Shadow]}>
      <View style={styles.topRow}>
        {item.subGoalTitle ? (
          <BodyText style={styles.origin}>{item.subGoalTitle} より</BodyText>
        ) : (
          <View />
        )}
        {item.dueDate ? (
          <View style={[styles.dueBadge, overdue && styles.dueBadgeOver]}>
            <BodyText style={[styles.dueText, overdue && styles.dueTextOver]}>
              {overdue ? "期限切れ" : `〜${shortLabel(item.dueDate)}`}
            </BodyText>
          </View>
        ) : null}
      </View>
      {item.progressType === "○×型" && <CheckBody item={item} />}
      {item.progressType === "回数型" && <CountBody item={item} />}
      {item.progressType === "数値型" && (
        <NumericBody item={item} onRequestDelete={confirmDelete} />
      )}
      {item.progressType === "動的チェックリスト型" && <ChecklistBody item={item} />}
    </Pressable>
    </Swipeable>
  );
}

/* ── ○×型 ─────────────────────────── */
function CheckBody({ item }: { item: WeeklyItem }) {
  const toggleDoneDate = useAppStore((s) => s.toggleDoneDate);
  // 過去週の編集で「今日」を足すと週外の日付が混ざるため、
  // 今週はその日(=今日)、それ以外の週はその週の月曜を記録先にする。
  const isCurrentWeek = item.weekStart === currentWeekStart();
  const recordDate = isCurrentWeek ? todayKey() : item.weekStart;
  const daily = item.frequencyType === "毎日";

  // 毎日型は「今日やったか」、週1回/単発は「今週1回でもやったか」を見る。
  // 非毎日型で解除するときは記録済みの日付そのものを外す。
  // (今日と違う日に達成していると、今日を足して二重記録になってしまうため)
  const on = daily ? item.doneDates.includes(recordDate) : item.doneDates.length > 0;
  const toggleDate = !daily && on ? item.doneDates[0] : recordDate;

  const subLabel = daily
    ? `毎日 ・ ${item.doneDates.length}/7日${item.completed ? " ・ 達成!" : "(5日で達成)"}`
    : on
      ? `${item.frequencyType} ・ ${shortLabel(item.doneDates[0])}に達成`
      : item.frequencyType;

  // ボタンは「押すと何が起きるか」ではなく現在の状態を示す。
  // ON = 塗りつぶし + ✓、もう一度押すと取り消せる。
  const label = on ? (daily ? "✓ 今日" : "✓ 達成") : daily ? "今日やった" : "できた";
  const toggle = () => toggleDoneDate(item.id, toggleDate);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={item.title}
        style={[styles.circle, on && styles.circleOn]}
      >
        {on ? <HandText style={styles.circleCheck}>✓</HandText> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <BodyText style={styles.title}>{item.title}</BodyText>
        <BodyText style={styles.sub}>{subLabel}</BodyText>
      </View>
      <Pressable
        onPress={toggle}
        style={[styles.oxBtn, on && styles.oxBtnOn]}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={on ? "達成を取り消す" : "達成にする"}
      >
        <BodyText style={[styles.oxText, on && styles.oxTextOn]}>
          {label}
        </BodyText>
      </Pressable>
    </View>
  );
}

/* ── 回数型 ─────────────────────────── */
const WD = ["月", "火", "水", "木", "金", "土", "日"];

function CountBody({ item }: { item: WeeklyItem }) {
  const toggleDoneDate = useAppStore((s) => s.toggleDoneDate);
  const target = item.targetCount ?? 1;
  const [pickerOpen, setPickerOpen] = useState(false);

  // この項目の週(月曜〜日曜)の7日
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(item.weekStart, i));
  const doneSet = new Set(item.doneDates);
  const today = todayKey();

  return (
    <View>
      <View style={styles.rowBetween}>
        <BodyText style={styles.title}>{item.title}</BodyText>
        <HandText style={styles.countLabel}>
          {item.doneDates.length} / {target} 回{item.completed ? " ✓" : ""}
        </HandText>
      </View>

      <View style={styles.chipRow}>
        {item.doneDates.map((d) => (
          <Pressable
            key={d}
            onPress={() => toggleDoneDate(item.id, d)}
            style={styles.dateChip}
          >
            <BodyText style={styles.dateChipText}>{shortLabel(d)}</BodyText>
          </Pressable>
        ))}
        {/* ＋は常に表示。押すと日付ピッカーを開閉(何回でも追加・選び直し可) */}
        <Pressable
          onPress={() => setPickerOpen((o) => !o)}
          style={[styles.addChip, pickerOpen && styles.addChipOpen]}
          hitSlop={6}
        >
          <BodyText style={[styles.addChipText, pickerOpen && styles.addChipTextOpen]}>
            {pickerOpen ? "閉じる" : "＋ 日付を選ぶ"}
          </BodyText>
        </Pressable>
      </View>

      {pickerOpen && (
        <View style={styles.dayPicker}>
          {weekDays.map((d, i) => {
            const done = doneSet.has(d);
            const isToday = d === today;
            return (
              <Pressable
                key={d}
                onPress={() => toggleDoneDate(item.id, d)}
                style={[styles.dayCell, done && styles.dayCellOn, isToday && !done && styles.dayCellToday]}
              >
                <BodyText style={[styles.dayWd, done && styles.dayTextOn]}>{WD[i]}</BodyText>
                <BodyText style={[styles.dayNum, done && styles.dayTextOn]}>
                  {parseInt(d.split("-")[2], 10)}
                </BodyText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ── 数値型 ─────────────────────────── */
function NumericBody({
  item,
  onRequestDelete,
}: {
  item: WeeklyItem;
  onRequestDelete: () => void;
}) {
  const setNumericValue = useAppStore((s) => s.setNumericValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.numericValue ?? 0));
  const [comment, setComment] = useState(item.numericComment ?? "");
  const unit = item.numericUnit ?? "";
  const target = item.numericTarget ?? 0;
  const value = item.numericValue ?? 0;

  const commit = () => {
    const v = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    setNumericValue(item.id, isNaN(v) ? value : v, comment);
    setEditing(false);
  };

  return (
    // カードのどこをタップしても編集モードに入る(長押しは削除)
    <Pressable
      onPress={() => {
        if (!editing) {
          setDraft(String(item.numericValue ?? 0));
          setComment(item.numericComment ?? "");
          setEditing(true);
        }
      }}
      onLongPress={onRequestDelete}
      delayLongPress={400}
    >
      <View style={styles.rowBetween}>
        <BodyText style={styles.title}>{item.title}</BodyText>
        <BodyText style={styles.numeric}>
          {value.toLocaleString()}
          {unit}
          <BodyText style={styles.numericTarget}>
            {" "}
            / {target.toLocaleString()}
            {unit}
          </BodyText>
        </BodyText>
      </View>
      <ProgressBar rate={target > 0 ? value / target : 0} height={8} />
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.numInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType="number-pad"
            autoFocus
            onSubmitEditing={commit}
          />
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="ひとことメモ"
            placeholderTextColor={Palette.faint}
            onSubmitEditing={commit}
          />
          <Pressable onPress={commit} style={styles.saveBtn}>
            <BodyText style={{ color: Palette.white, fontSize: 12 }}>保存</BodyText>
          </Pressable>
        </View>
      ) : item.numericComment ? (
        <View style={styles.commentRow}>
          <View style={styles.commentBar} />
          <BodyText style={styles.commentText}>↳ {item.numericComment}</BodyText>
        </View>
      ) : (
        <BodyText style={styles.tapHint}>カードをタップして記録</BodyText>
      )}
    </Pressable>
  );
}

/* ── 動的チェックリスト型 ─────────────────────────── */
function ChecklistBody({ item }: { item: WeeklyItem }) {
  const addChecklistEntry = useAppStore((s) => s.addChecklistEntry);
  const toggleChecklistEntry = useAppStore((s) => s.toggleChecklistEntry);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const entries = item.checklist ?? [];
  const target = item.checklistTarget ?? 3;

  const commit = () => {
    if (draft.trim()) addChecklistEntry(item.id, draft.trim());
    setDraft("");
    setAdding(false);
  };

  return (
    <View>
      <View style={styles.rowBetween}>
        <BodyText style={styles.title}>{item.title}</BodyText>
        <Pressable onPress={() => setAdding(true)} style={styles.fillBtn}>
          <BodyText style={styles.fillBtnText}>埋めていく</BodyText>
        </Pressable>
      </View>
      {entries.map((e) => (
        <Pressable
          key={e.id}
          onPress={() => toggleChecklistEntry(item.id, e.id)}
          style={styles.clRow}
        >
          <HandText style={[styles.clCheck, !e.done && { color: Palette.faint }]}>
            {e.done ? "✓" : "○"}
          </HandText>
          <BodyText style={[styles.clText, !e.done && { color: Palette.muted }]}>
            {e.text}
          </BodyText>
        </Pressable>
      ))}
      {adding ? (
        <View style={styles.clRow}>
          <HandText style={[styles.clCheck, { color: Palette.faint }]}>○</HandText>
          <TextInput
            style={styles.clInput}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            placeholder="できたことを書く"
            placeholderTextColor={Palette.faint}
            onSubmitEditing={commit}
            onBlur={commit}
          />
        </View>
      ) : entries.length < target ? (
        <View style={styles.clRow}>
          <HandText style={[styles.clCheck, { color: Palette.faint }]}>○</HandText>
          <View style={styles.clPlaceholder} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: 12 },
  swipeDelete: {
    backgroundColor: Palette.accent,
    justifyContent: "center",
    alignItems: "center",
    width: 88,
    borderTopLeftRadius: Radii.lg,
    borderBottomLeftRadius: Radii.lg,
  },
  swipeDeleteText: { color: Palette.white, fontSize: 18 },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  origin: { fontSize: 10, color: Palette.muted },
  dueBadge: {
    backgroundColor: Palette.cardAlt,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  dueBadgeOver: { backgroundColor: Palette.salmon, borderColor: Palette.salmon },
  dueText: { fontSize: 10, color: Palette.muted },
  dueTextOver: { color: Palette.salmonDark, fontFamily: Fonts.bodyBold },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Palette.ink },
  sub: { fontSize: 12, color: Palette.muted, marginTop: 2 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: Palette.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  circleOn: { backgroundColor: Palette.green, borderColor: Palette.greenDark },
  circleCheck: { color: Palette.greenDark, fontSize: 18 },
  oxBtn: {
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Palette.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: "center",
  },
  oxBtnOn: { backgroundColor: Palette.accent },
  oxText: { color: Palette.accent, fontSize: 13 },
  oxTextOn: { color: Palette.white, fontFamily: Fonts.bodyBold },
  countLabel: { fontSize: 16, color: Palette.inkSoft },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  dateChip: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dateChipText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 12 },
  addChip: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addChipOpen: {
    backgroundColor: Palette.accentSoft,
    borderStyle: "solid",
    borderColor: Palette.accent,
  },
  addChipText: { color: Palette.muted, fontSize: 12 },
  addChipTextOpen: { color: Palette.accent, fontFamily: Fonts.bodyBold },
  dayPicker: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    justifyContent: "space-between",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.cardAlt,
  },
  dayCellOn: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  dayCellToday: { borderColor: Palette.accent, borderStyle: "dashed" },
  dayWd: { fontSize: 10, color: Palette.muted, marginBottom: 2 },
  dayNum: { fontSize: 14, color: Palette.ink, fontFamily: Fonts.bodyBold },
  dayTextOn: { color: Palette.white },
  numeric: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Palette.ink },
  numericTarget: { fontFamily: Fonts.body, color: Palette.muted, fontSize: 14 },
  commentRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  commentBar: { width: 3, borderRadius: 2, backgroundColor: Palette.border },
  commentText: { flex: 1, fontSize: 12, color: Palette.inkSoft, lineHeight: 18 },
  tapHint: { fontSize: 11, color: Palette.faint, marginTop: 8 },
  editRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  numInput: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 90,
    fontFamily: Fonts.bodyMedium,
    color: Palette.ink,
    backgroundColor: Palette.cardAlt,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Palette.ink,
    backgroundColor: Palette.cardAlt,
  },
  saveBtn: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fillBtn: {
    backgroundColor: "#DCE8F0",
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fillBtnText: { fontSize: 12, color: "#4A7A9B" },
  clRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  clCheck: { fontSize: 16, color: Palette.greenDark, width: 18, textAlign: "center" },
  clText: { fontSize: 14, color: Palette.ink, flex: 1 },
  clInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: Palette.dashed,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Palette.ink,
    paddingVertical: 4,
  },
  clPlaceholder: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    height: 18,
  },
});
