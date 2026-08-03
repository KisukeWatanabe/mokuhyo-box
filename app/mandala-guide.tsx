/**
 * マンダラチャートの解説(設定 > ヘルプ から開く読み物)。
 *
 * 既存の /tutorial が「このアプリの操作方法」を教えるのに対し、
 * こちらは「マンダラチャートという手法そのもの」を扱う:
 *   なぜ効くのか(意義・メリット) → どう作るのか(手順) → 埋まらないときのコツ。
 *
 * 空きマスを前にして手が止まる人向けなので、抽象論で終わらせず
 * 各ステップに必ず「例」と「コツ」を添えている。
 */
import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { BodyText, HandText } from "@/src/components/ui";

/* ────────────────────────────────────────────
 * 図解パーツ
 * ──────────────────────────────────────────── */

type FillMode = "center" | "ring" | "micro" | "full";

/** 3×3 のミニマンダラ。手順のどこを説明中かを塗り分けで示す */
function MiniMandala({ mode }: { mode: FillMode }) {
  // 中央=注目させたい階層。周囲8マスは mode によって空/埋まりを切り替える
  const ringFilled = mode !== "center";
  const centerLabel = mode === "micro" ? "中" : "大";
  const centerColor = mode === "micro" ? Palette.tan : Palette.accent;

  return (
    <View style={fig.grid}>
      {Array.from({ length: 9 }).map((_, i) => {
        if (i === 4) {
          return (
            <View key={i} style={[fig.cell, { backgroundColor: centerColor }]}>
              <HandText
                style={[
                  fig.centerText,
                  mode === "micro" && { color: Palette.ink },
                ]}
              >
                {centerLabel}
              </HandText>
            </View>
          );
        }
        if (!ringFilled) {
          return <View key={i} style={[fig.cell, fig.cellEmpty]} />;
        }
        // 「達成で緑に育つ」ことを示したい最終図だけ、色に変化をつける
        const bg =
          mode === "full"
            ? [Palette.green, Palette.salmon, Palette.cream][i % 3]
            : mode === "micro"
              ? Palette.cream
              : Palette.tan;
        return <View key={i} style={[fig.cell, { backgroundColor: bg }]} />;
      })}
    </View>
  );
}

/** 「大目標と今日の間が空いている」ことを示す図 */
function GapDiagram() {
  return (
    <View style={fig.gapRow}>
      <View style={[fig.gapNode, { backgroundColor: Palette.accent }]}>
        <BodyText style={fig.gapNodeText}>大きな{"\n"}目標</BodyText>
      </View>
      <View style={fig.gapLine}>
        <BodyText style={fig.gapQuestion}>？</BodyText>
      </View>
      <View style={[fig.gapNode, fig.gapNodeEmpty]}>
        <BodyText style={[fig.gapNodeText, { color: Palette.muted }]}>
          今日{"\n"}やること
        </BodyText>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────
 * 本文パーツ
 * ──────────────────────────────────────────── */

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <BodyText style={styles.sectionLabel}>{label}</BodyText>
      <HandText style={styles.sectionTitle}>{title}</HandText>
      {children}
    </View>
  );
}

/** メリットの箇条書き(番号つき) */
function Merit({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.merit}>
      <View style={styles.meritNum}>
        <HandText style={styles.meritNumText}>{n}</HandText>
      </View>
      <View style={{ flex: 1 }}>
        <BodyText style={styles.meritTitle}>{title}</BodyText>
        <BodyText style={styles.meritBody}>{body}</BodyText>
      </View>
    </View>
  );
}

/** 作り方の1ステップ */
function Step({
  n,
  title,
  body,
  figure,
  example,
  tip,
}: {
  n: number;
  title: string;
  body: string;
  figure?: React.ReactNode;
  example?: string;
  tip?: string;
}) {
  return (
    <View style={[styles.card, Shadow, styles.step]}>
      <View style={styles.stepHead}>
        <View style={styles.stepBadge}>
          <BodyText style={styles.stepBadgeText}>STEP {n}</BodyText>
        </View>
      </View>
      <HandText style={styles.stepTitle}>{title}</HandText>
      {figure ? <View style={styles.stepFigure}>{figure}</View> : null}
      <BodyText style={styles.stepBody}>{body}</BodyText>
      {example ? (
        <View style={styles.example}>
          <BodyText style={styles.exampleLabel}>例</BodyText>
          <BodyText style={styles.exampleText}>{example}</BodyText>
        </View>
      ) : null}
      {tip ? (
        <View style={styles.tip}>
          <BodyText style={styles.tipText}>💡 {tip}</BodyText>
        </View>
      ) : null}
    </View>
  );
}

/** 「〜する」の形に直す前後の対比 */
function Rewrite({ before, after }: { before: string; after: string }) {
  return (
    <View style={styles.rewriteRow}>
      <View style={styles.rewriteSide}>
        <BodyText style={styles.rewriteBad}>✗ {before}</BodyText>
      </View>
      <BodyText style={styles.rewriteArrow}>→</BodyText>
      <View style={styles.rewriteSide}>
        <BodyText style={styles.rewriteGood}>○ {after}</BodyText>
      </View>
    </View>
  );
}

/* 中目標を考えるときの観点。8方向に広げるとき、分野で切ると偏りに気づける */
const VIEWPOINTS = [
  "体",
  "心",
  "学び",
  "仕事",
  "お金",
  "人間関係",
  "住まい",
  "遊び",
];

/* ────────────────────────────────────────────
 * 画面
 * ──────────────────────────────────────────── */

export default function MandalaGuideScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <BodyText style={styles.back}>‹ 閉じる</BodyText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HandText style={styles.title}>マンダラチャートとは</HandText>
        <BodyText style={styles.lead}>
          1つの大きな目標を、9×9＝81マスに分解していく考え方の型です。中心に「一番叶えたいこと」を置き、そこから外へ向かって「そのために何をするか」を広げていきます。
        </BodyText>

        {/* ── なぜ効くのか ── */}
        <Section label="WHY" title="なぜ、書くだけで終わるのか">
          <View style={[styles.card, Shadow]}>
            <View style={styles.figureArea}>
              <GapDiagram />
            </View>
            <BodyText style={styles.body}>
              目標が続かないのは、意志が弱いからではありません。「大きな目標」と「今日やること」の間が空いているからです。
              {"\n\n"}
              たとえば「健康になる」と書いても、明日の朝に何をするかは決まりません。決まっていないことは、実行されません。
              {"\n\n"}
              マンダラチャートは、この空白を
              <BodyText style={styles.strong}>
                大目標 → 中目標 → 極小目標
              </BodyText>
              の3段階で埋めて、目標を「今日できる行動」まで下ろすための地図です。
            </BodyText>
          </View>
        </Section>

        {/* ── メリット ── */}
        <Section label="MERIT" title="使うと、何がいいのか">
          <View style={[styles.card, Shadow]}>
            <Merit
              n={1}
              title="迷う時間がなくなる"
              body="「健康になる」が「22時に寝る」まで分解されていれば、毎朝なにをするか考え直さずに済みます。判断を減らすほど、行動は続きます。"
            />
            <View style={styles.divider} />
            <Merit
              n={2}
              title="全体を一望できる"
              body="81マスが1枚に収まるので、いま何が進んでいて、どこが手つかずかがひと目で分かります。忘れていた目標を思い出せるのは、見えているからです。"
            />
            <View style={styles.divider} />
            <Merit
              n={3}
              title="偏りに気づける"
              body="8方向に広げる形なので、仕事だけ・体だけ、と偏っていることが目に見えます。埋まらないマスは「まだ考えていなかった分野」のサインです。"
            />
            <View style={styles.divider} />
            <Merit
              n={4}
              title="書く作業そのものが整理になる"
              body="8つひねり出そうとすると、頭の中の漠然とした願いを言葉にせざるを得ません。この過程で、本当に大事なことが浮かび上がってきます。"
            />
          </View>
        </Section>

        {/* ── 作り方 ── */}
        <Section label="HOW" title="作り方は、4ステップ">
          <Step
            n={1}
            title="中央に、一番叶えたいことを1つ"
            figure={<MiniMandala mode="center" />}
            body="まずは中心のマスだけ。1年後、どうなっていたら最高かを言葉にします。立派である必要はなく、自分が読んでうれしくなる言葉で構いません。"
            example="健康で機嫌のいい1年にする"
            tip="ここは何度でも書き換えられます。悩むより、仮でも置いてしまうほうが先に進みます。"
          />
          <Step
            n={2}
            title="それを支える「柱」を、8つ"
            figure={<MiniMandala mode="ring" />}
            body="中央の目標が叶ったとき、何が変わっているかを考えます。その「変わっているもの」が中目標です。分野で切ると出しやすくなります。"
            example="体づくり / 睡眠 / 食事 / 学び / 仕事 / お金 / 人間関係 / 遊び"
            tip="8つ全部埋めなくて大丈夫。3つでも地図は動き出します。"
          />
          <View style={[styles.card, Shadow, styles.viewpointCard]}>
            <BodyText style={styles.viewpointLabel}>
              思いつかないときの観点
            </BodyText>
            <View style={styles.chipWrap}>
              {VIEWPOINTS.map((v) => (
                <View key={v} style={styles.chip}>
                  <BodyText style={styles.chipText}>{v}</BodyText>
                </View>
              ))}
            </View>
            <BodyText style={styles.viewpointNote}>
              この8分野を順に眺めて「自分の大目標に関係あるのはどれか」を選ぶと、空白が埋まりやすくなります。
            </BodyText>
          </View>
          <Step
            n={3}
            title="柱ごとに、行動を8つ"
            figure={<MiniMandala mode="micro" />}
            body={
              "中目標を1つ選び、それを実現する具体的な行動に分けます。ここが一番大事なところで、コツは「〜する」の形で、読んだだけで体が動く大きさまで小さくすること。"
            }
          />
          <View style={[styles.card, Shadow, styles.rewriteCard]}>
            <BodyText style={styles.viewpointLabel}>目標を小さくする</BodyText>
            <Rewrite before="健康に気をつける" after="22時に布団に入る" />
            <Rewrite before="英語を頑張る" after="単語を10個おぼえる" />
            <Rewrite before="貯金する" after="毎月3万円を別口座に移す" />
            <BodyText style={styles.viewpointNote}>
              左は「気持ち」、右は「数値化」です。数値化していれば、やったかどうかを自分で判定できます。
            </BodyText>
          </View>
          <Step
            n={4}
            title="頻度をつけて、今週へ"
            figure={<MiniMandala mode="full" />}
            body={
              "ここからが紙のマンダラチャートにはない部分です。行動のマスに「毎日 / 週数回 / 週1回 / 単発」の頻度をつけて今週にとり込むと、「今週」タブに自動で並びます。そこで達成にすると、マンダラのマスが緑に変わり、進捗バーが伸びます。"
            }
            tip="迷ったら「毎日」か「週3回」から。頻度はあとから変えられます。"
          />
        </Section>

        {/* ── 埋まらないときは ── */}
        <Section label="TIPS" title="手が止まったときは">
          <View style={[styles.card, Shadow]}>
            <BodyText style={styles.body}>
              <BodyText style={styles.strong}>全部埋めようとしない。</BodyText>
              81マスは完成させるためのノルマではなく、思考を広げるための枠です。1マス書けば、そこから今週の行動が1つ生まれます。
              {"\n\n"}
              <BodyText style={styles.strong}>
                続かないのは、意志ではなく大きさの問題。
              </BodyText>
              3日で崩れた行動は、単に一段大きすぎただけです。「30分走る」を「靴を履いて外に出る」まで小さくしてみてください。
              {"\n\n"}
              <BodyText style={styles.strong}>
                あとから何度でも直せる。
              </BodyText>
              マスは長押しで書き換え・入れ替え・削除ができます。生活が変われば目標も変わるのが自然です。
            </BodyText>
          </View>
        </Section>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={() => router.navigate("/(tabs)" as Href)}
        >
          <BodyText style={styles.ctaText}>マンダラを開く</BodyText>
        </Pressable>
        <BodyText style={styles.ctaNote}>
          まずは中央の1マスから。空いているマスをタップすると書き始められます。
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

/* ────────────────────────────────────────────
 * スタイル
 * ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 32,
    justifyContent: "center",
  },
  back: { color: Palette.inkSoft, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 30, marginBottom: 12 },
  lead: {
    fontSize: 14,
    color: Palette.inkSoft,
    lineHeight: 24,
  },

  section: { marginTop: 32 },
  sectionLabel: {
    fontSize: 11,
    color: Palette.accent,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  sectionTitle: { fontSize: 24, marginTop: 2, marginBottom: 14 },

  card: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    padding: 18,
  },
  body: { fontSize: 14, color: Palette.inkSoft, lineHeight: 25 },
  strong: { color: Palette.ink, fontFamily: Fonts.bodyBold },
  figureArea: { alignItems: "center", marginBottom: 18 },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 16,
  },

  merit: { flexDirection: "row", gap: 12 },
  meritNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  meritNumText: { fontSize: 15, color: Palette.accent },
  meritTitle: {
    fontSize: 15,
    color: Palette.ink,
    fontFamily: Fonts.bodyBold,
    marginBottom: 5,
  },
  meritBody: { fontSize: 13, color: Palette.inkSoft, lineHeight: 22 },

  step: { marginBottom: 12 },
  stepHead: { flexDirection: "row" },
  stepBadge: {
    backgroundColor: Palette.accent,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  stepBadgeText: {
    color: Palette.white,
    fontSize: 10.5,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.8,
  },
  stepTitle: { fontSize: 20, marginTop: 10, marginBottom: 4 },
  stepFigure: { alignItems: "center", marginVertical: 14 },
  stepBody: { fontSize: 13.5, color: Palette.inkSoft, lineHeight: 24 },
  example: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Palette.cardAlt,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    alignItems: "flex-start",
  },
  exampleLabel: {
    fontSize: 11,
    color: Palette.muted,
    fontFamily: Fonts.bodyBold,
    marginTop: 2,
  },
  exampleText: {
    flex: 1,
    fontSize: 13,
    color: Palette.ink,
    lineHeight: 21,
  },
  tip: {
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  tipText: { fontSize: 12.5, color: Palette.salmonDark, lineHeight: 20 },

  viewpointCard: { marginBottom: 12 },
  viewpointLabel: {
    fontSize: 13,
    color: Palette.ink,
    fontFamily: Fonts.bodyBold,
    marginBottom: 12,
  },
  viewpointNote: {
    fontSize: 12,
    color: Palette.muted,
    lineHeight: 20,
    marginTop: 12,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: Palette.cardAlt,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radii.md,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, color: Palette.inkSoft },

  rewriteCard: { marginBottom: 12 },
  rewriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  rewriteSide: { flex: 1 },
  rewriteArrow: { fontSize: 13, color: Palette.muted },
  rewriteBad: { fontSize: 12.5, color: Palette.muted, lineHeight: 20 },
  rewriteGood: {
    fontSize: 12.5,
    color: Palette.greenDark,
    fontFamily: Fonts.bodyBold,
    lineHeight: 20,
  },

  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 16 },
  ctaNote: {
    fontSize: 12,
    color: Palette.muted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 12,
  },
});

/* ── 図解用スタイル ── */
const fig = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    width: 34 * 3 + 5 * 2,
  },
  cell: {
    width: 34,
    height: 34,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: {
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
    backgroundColor: "transparent",
  },
  centerText: { fontSize: 15, color: Palette.white },

  gapRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  gapNode: {
    width: 78,
    height: 60,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  gapNodeEmpty: {
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: Palette.dashed,
  },
  gapNodeText: {
    fontSize: 12,
    color: Palette.white,
    textAlign: "center",
    lineHeight: 18,
  },
  gapLine: {
    flex: 1,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1.2,
    borderTopColor: Palette.dashed,
    borderStyle: "dashed",
    marginTop: 0,
  },
  gapQuestion: { fontSize: 20, color: Palette.muted },
});
