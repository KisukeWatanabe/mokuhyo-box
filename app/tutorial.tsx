import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { BodyText, HandText } from "@/src/components/ui";

/* ────────────────────────────────────────────
 * 画面プレビュー(アプリUIを模したミニ表示)
 *   将来、実スクリーンショットに差し替える場合は
 *   各 preview を <Image source={...} /> に置き換えるだけ。
 * ──────────────────────────────────────────── */

function Frame({ children }: { children: React.ReactNode }) {
  return <View style={mock.frame}>{children}</View>;
}

/** 3×3 のミニマンダラ */
function MiniMandala({ highlightEmpty }: { highlightEmpty?: boolean }) {
  // 中央=大目標、周囲=中目標(達成/週次/未着手を混ぜて表現)
  const cells: ("main" | "done" | "week" | "todo" | "empty")[] = [
    "done",
    "week",
    "todo",
    "todo",
    "main",
    "done",
    "week",
    highlightEmpty ? "empty" : "todo",
    "done",
  ];
  const bg = {
    main: Palette.accent,
    done: Palette.green,
    week: Palette.salmon,
    todo: Palette.tan,
    empty: "transparent",
  };
  return (
    <View style={mock.grid}>
      {cells.map((c, i) => (
        <View
          key={i}
          style={[
            mock.cell,
            { backgroundColor: bg[c] },
            c === "empty" && mock.cellEmpty,
            c === "empty" && highlightEmpty && mock.cellHighlight,
          ]}
        >
          {c === "main" && <HandText style={mock.cellMain}>大</HandText>}
          {c === "empty" && <BodyText style={mock.cellPlus}>＋</BodyText>}
        </View>
      ))}
    </View>
  );
}

/** 週次カードのミニ表示 */
function MiniCard({
  title,
  sub,
  tone = "todo",
}: {
  title: string;
  sub: string;
  tone?: "done" | "todo";
}) {
  return (
    <View style={mock.card}>
      <View
        style={[
          mock.check,
          tone === "done" && { backgroundColor: Palette.green, borderColor: Palette.greenDark },
        ]}
      >
        {tone === "done" && <BodyText style={mock.checkMark}>✓</BodyText>}
      </View>
      <View style={{ flex: 1 }}>
        <BodyText style={mock.cardTitle}>{title}</BodyText>
        <BodyText style={mock.cardSub}>{sub}</BodyText>
      </View>
    </View>
  );
}

/** 数値型カードのミニ表示(目標へのバー付き) */
function MiniNumericCard({
  title,
  value,
  rate,
}: {
  title: string;
  value: string;
  rate: number;
}) {
  return (
    <View style={[mock.card, { flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <BodyText style={mock.cardTitle}>{title}</BodyText>
        <BodyText style={mock.cardTitle}>{value}</BodyText>
      </View>
      <View style={mock.bar}>
        <View style={[mock.barFill, { width: `${Math.round(rate * 100)}%` }]} />
      </View>
    </View>
  );
}

/** マンダラ切り替えピル + 一覧 */
function MiniSwitcher() {
  return (
    <View style={{ width: "100%", gap: 8 }}>
      <View style={mock.pill}>
        <BodyText style={mock.pillText}>健康的で充実した1年に</BodyText>
        <BodyText style={mock.pillCaret}>▼</BodyText>
      </View>
      <View style={[mock.listRow, mock.listRowActive]}>
        <BodyText style={mock.listTitleActive}>2026年の目標</BodyText>
        <BodyText style={mock.listCheck}>✓</BodyText>
      </View>
      <View style={mock.listRow}>
        <BodyText style={mock.listTitle}>2027年の目標</BodyText>
      </View>
      <View style={mock.listAdd}>
        <BodyText style={mock.listAddText}>＋ 新しいマンダラを作る</BodyText>
      </View>
    </View>
  );
}

/** 年 → 月 → 週 アーカイブ */
function MiniArchive() {
  return (
    <View style={{ width: "100%", gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={[mock.year, mock.yearActive]}>
          <BodyText style={mock.yearTextActive}>2026年</BodyText>
        </View>
        <View style={mock.year}>
          <BodyText style={mock.yearText}>2025年</BodyText>
        </View>
      </View>
      <HandText style={mock.month}>7月</HandText>
      <View style={mock.weekRow}>
        <BodyText style={mock.weekLabel}>7/6 − 7/12</BodyText>
        <BodyText style={mock.weekMeta}>5/6 達成</BodyText>
      </View>
      <View style={mock.weekRow}>
        <BodyText style={mock.weekLabel}>6/29 − 7/5</BodyText>
        <BodyText style={mock.weekMeta}>4/6 達成</BodyText>
      </View>
    </View>
  );
}

/** 極小目標 → 長押し → 週次カード */
function MiniTakeIn() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={mock.microCell}>
        <BodyText style={mock.microText}>ジムに行く</BodyText>
        <View style={mock.longPressTag}>
          <BodyText style={mock.longPressText}>長押し</BodyText>
        </View>
      </View>
      <BodyText style={mock.arrow}>→</BodyText>
      <View style={{ flex: 1 }}>
        <MiniCard title="ジムに行く" sub="週3回・2/3回" tone="todo" />
      </View>
    </View>
  );
}

type Slide = {
  title: string;
  body: string;
  tip?: string; // 具体例やヒントの吹き出し
  preview: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    title: "目標を、毎日の一歩に",
    body: "「今年こそ」と決めた目標も、気づけば忘れてしまう。目標BOX は大きな目標を81マスに分解し、『今週やること』に変えることで、夢を続けられる行動にします。",
    tip: "3分で読めます。まずは仕組みだけつかみましょう。",
    preview: (
      <Frame>
        <MiniMandala />
      </Frame>
    ),
  },
  {
    title: "大 → 中 → 極小 に分解",
    body: "中央に一番叶えたい「大目標」。それを支える8つの「中目標」。さらに各中目標を、8つの具体的な「極小目標」へ。ぼんやりした願いが、明日できる行動まで一気に見えてきます。",
    tip: "例)『健康的な1年』→『体づくり』→『ジムに週3回』",
    preview: (
      <Frame>
        <MiniMandala />
      </Frame>
    ),
  },
  {
    title: "紙のマンダラとの違い",
    body: "マスはいつでも書き換え・入れ替え・削除が自由。しかも「毎日 / 週数回 / 週1 / 単発」という『頻度』を持てます。だから飾って終わりにならず、生活に合わせて育てていけます。",
    tip: "完璧じゃなくてOK。走りながら直せます。",
    preview: (
      <Frame>
        <MiniMandala highlightEmpty />
      </Frame>
    ),
  },
  {
    title: "極小目標を『今週やること』へ",
    body: "続けたい極小目標のマスを長押しして「今週にとり込む」。頻度と記録方法を選ぶだけで、今週の実行リストに並びます。ここが、目標と毎日をつなぐ一番大事な操作です。",
    tip: "迷ったら『毎日』か『週3回』から。あとで変えられます。",
    preview: (
      <Frame>
        <MiniTakeIn />
      </Frame>
    ),
  },
  {
    title: "続け方に合わせて記録",
    body: "○×(やった/やらない)、回数(週3回など)、数値(貯金や距離)、リスト(できたことを書き出す)。目標の性質に合った記録方法を選べるから、無理なく続きます。",
    preview: (
      <Frame>
        <View style={{ width: "100%", gap: 8 }}>
          <MiniCard title="早寝する" sub="毎日・5/7日達成" tone="done" />
          <MiniNumericCard title="貯金" value="42,000 / 60,000円" rate={0.7} />
        </View>
      </Frame>
    ),
  },
  {
    title: "達成が、マンダラを育てる",
    body: "今週の目標を達成すると、対応するマスが緑に。中目標・大目標の進捗バーも自動で伸びていきます。小さな達成が積み重なって前に進む——この手応えが、続ける力になります。",
    tip: "点数で「今週の手応え」も記録できます。",
    preview: (
      <Frame>
        <MiniMandala />
      </Frame>
    ),
  },
  {
    title: "毎週、ふりかえる",
    body: "「振り返り」タブで 年 → 月 → 週 とたどり、続いたこと・崩れたことを見返せます。過去の週もあとから編集できるので、記録が途切れても大丈夫。積み上げが自信になります。",
    preview: (
      <Frame>
        <MiniArchive />
      </Frame>
    ),
  },
  {
    title: "テーマごとに何個でも",
    body: "画面上部のタイトル(▼)から、マンダラを切り替え・新規作成。今年の目標・仕事・プライベートなど、分野や年ごとにいくつでも並行して持てます。",
    preview: (
      <Frame>
        <MiniSwitcher />
      </Frame>
    ),
  },
  {
    title: "さあ、始めよう",
    body: "まずは中央の大目標を1つ、言葉にしてみましょう。1マス埋めるだけで十分です。そこから中目標・極小目標へと、あなたの1年が形になっていきます。",
    tip: "内容はこの端末に自動保存。あとからいくらでも直せます。",
    preview: (
      <Frame>
        <MiniMandala />
      </Frame>
    ),
  },
];

/** 使い方ガイド(スライド形式) */
export default function TutorialScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index >= last) {
      router.back();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BodyText style={styles.skip}>{index >= last ? " " : "スキップ"}</BodyText>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.previewArea}>{s.preview}</View>
            <HandText style={styles.slideTitle}>{s.title}</HandText>
            <BodyText style={styles.slideBody}>{s.body}</BodyText>
            {s.tip ? (
              <View style={styles.tip}>
                <BodyText style={styles.tipText}>💡 {s.tip}</BodyText>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* ページドット */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* 次へ / 始める */}
      <View style={styles.bottom}>
        <Pressable style={styles.cta} onPress={goNext}>
          <BodyText style={styles.ctaText}>
            {index >= last ? "始める" : "次へ"}
          </BodyText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 32,
  },
  skip: { color: Palette.muted, fontSize: 14 },
  pager: { flex: 1 },
  slide: {
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  previewArea: {
    width: "100%",
    alignItems: "center",
    marginBottom: 28,
  },
  slideTitle: { fontSize: 26, textAlign: "center", marginBottom: 12 },
  slideBody: {
    fontSize: 14,
    color: Palette.inkSoft,
    lineHeight: 23,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  tip: {
    marginTop: 16,
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tipText: {
    fontSize: 12.5,
    color: Palette.salmonDark,
    lineHeight: 19,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginVertical: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.dashed,
  },
  dotActive: { backgroundColor: Palette.accent, width: 20 },
  bottom: { paddingHorizontal: 28, paddingBottom: 20 },
  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 16 },
});

/* ── ミニプレビュー用スタイル ── */
const mock = StyleSheet.create({
  frame: {
    width: 240,
    backgroundColor: Palette.cream,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  grid: {
    width: 190,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cell: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    backgroundColor: "rgba(252,248,236,0.6)",
  },
  cellHighlight: { borderColor: Palette.accent, borderStyle: "solid", borderWidth: 2 },
  cellMain: { color: Palette.white, fontSize: 20 },
  cellPlus: { color: Palette.muted, fontSize: 22 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Palette.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Palette.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: Palette.greenDark, fontSize: 14 },
  cardTitle: { fontSize: 13, color: Palette.ink, fontFamily: Fonts.bodyBold },
  cardSub: { fontSize: 11, color: Palette.muted, marginTop: 2 },
  bar: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.cardAlt,
    overflow: "hidden",
  },
  barFill: { height: 7, borderRadius: 4, backgroundColor: Palette.accent },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: { fontSize: 12, color: Palette.inkSoft, fontFamily: Fonts.bodyBold },
  pillCaret: { fontSize: 9, color: Palette.muted },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listRowActive: { borderColor: Palette.accent, backgroundColor: Palette.accentSoft },
  listTitle: { fontSize: 13, color: Palette.ink },
  listTitleActive: { fontSize: 13, color: Palette.accent, fontFamily: Fonts.bodyBold },
  listCheck: { color: Palette.accent, fontSize: 15 },
  listAdd: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  listAddText: { fontSize: 12, color: Palette.inkSoft },

  year: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  yearActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  yearText: { fontSize: 12, color: Palette.inkSoft },
  yearTextActive: { fontSize: 12, color: Palette.white, fontFamily: Fonts.bodyBold },
  month: { fontSize: 18, color: Palette.ink },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekLabel: { fontSize: 12, color: Palette.ink, fontFamily: Fonts.bodyBold },
  weekMeta: { fontSize: 11, color: Palette.muted },

  microCell: {
    width: 92,
    height: 72,
    borderRadius: 10,
    backgroundColor: Palette.tan,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  microText: { fontSize: 12, color: "#5C4322", fontFamily: Fonts.bodyBold, textAlign: "center" },
  longPressTag: {
    position: "absolute",
    bottom: -8,
    backgroundColor: Palette.accent,
    borderRadius: Radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  longPressText: { fontSize: 9, color: Palette.white },
  arrow: { fontSize: 20, color: Palette.muted },
});
