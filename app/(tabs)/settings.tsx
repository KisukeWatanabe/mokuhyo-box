import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { HINTS, HINT_ORDER } from "@/src/components/onboarding/hintContent";
import { BodyText, HandText } from "@/src/components/ui";
import { HintKey, useOnboardingStore } from "@/src/store/useOnboardingStore";

/** 設定(ヘルプ・ヒント・保存先の確認) */
export default function SettingsScreen() {
  const router = useRouter();
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const requestHint = useOnboardingStore((s) => s.requestHint);

  /**
   * ヒントを、それが本来出る画面へ移動して表示する。
   * 遷移先の画面が requestedHint を見て、既読でもスポットライトを出す。
   */
  const showHintOnItsScreen = (key: HintKey) => {
    requestHint(key);
    router.navigate(HINTS[key].route as Href);
  };

  // チュートリアルを開き直す。目標データには一切触れない(フラグのみリセット)。
  const restartTutorial = () => {
    resetOnboarding();
    router.push("/onboarding");
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HandText style={styles.title}>設定</HandText>

        {/* 通知。ヘルプより先に置くのは、これだけが「アプリの挙動を変える」設定で、
            他が読み物への導線だから。中身は専用ページに分けてある
            (通知を増やしたときに設定画面が縦に伸びていかないように)。 */}
        <BodyText style={styles.sectionLabel}>通知</BodyText>
        <Pressable
          style={[styles.card, Shadow, styles.linkRow]}
          onPress={() => router.push("/notifications")}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>通知の設定</BodyText>
            <BodyText style={styles.note}>
              週のはじめに「今週の目標は何ですか?」とお知らせします。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>

        {/* ヘルプ */}
        <BodyText style={styles.sectionLabel}>ヘルプ</BodyText>
        {/* 操作方法より前に「そもそもマンダラチャートとは何か」を置く。
            マスに何を書けばいいか分からない状態は、操作説明では解けないため。 */}
        <Pressable
          style={[styles.card, Shadow, styles.linkRow, { marginBottom: 10 }]}
          onPress={() => router.push("/mandala-guide")}
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>マンダラチャートとは</BodyText>
            <BodyText style={styles.note}>
              なぜ効くのか、どう作るのか。マスの埋め方に迷ったら。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>
        <Pressable
          style={[styles.card, Shadow, styles.linkRow, { marginBottom: 10 }]}
          onPress={restartTutorial}
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>
              チュートリアルをもう一度見る
            </BodyText>
            <BodyText style={styles.note}>
              大目標から順に、書きながら進めるガイドです。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>
        <Pressable
          style={[styles.card, Shadow, styles.linkRow]}
          onPress={() => router.push("/tutorial")}
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>使い方を見る</BodyText>
            <BodyText style={styles.note}>
              アプリの画面と操作を、スライドで紹介します。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>

        {/* 各画面に一度だけ出るヒントを、実際の画面へ飛んで見直せるようにする */}
        <BodyText style={styles.sectionLabel}>使い方のヒント</BodyText>
        {HINT_ORDER.map((key, i) => (
          <Pressable
            key={key}
            style={[
              styles.card,
              Shadow,
              styles.linkRow,
              i < HINT_ORDER.length - 1 && { marginBottom: 10 },
            ]}
            onPress={() => showHintOnItsScreen(key)}
          >
            <View style={{ flex: 1 }}>
              <BodyText style={styles.linkText}>{HINTS[key].label}</BodyText>
              <BodyText style={styles.note}>
                {HINTS[key].where} へ移動して表示します
              </BodyText>
            </View>
            <BodyText style={styles.linkCaret}>›</BodyText>
          </Pressable>
        ))}

        {/* クラウド保存は持たないので、状態表示ではなく消失リスクの注意書きを出す */}
        <BodyText style={styles.sectionLabel}>データの保存先</BodyText>
        <View style={[styles.card, Shadow]}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: Palette.muted }]} />
            <BodyText style={styles.rowText}>この端末に保存</BodyText>
          </View>
          <BodyText style={styles.note}>
            データはこの端末の中だけに保存されています。アプリを削除したり機種変更をすると、目標・週次リスト・振り返りはすべて元に戻せません。大切な内容は他のメモにも残しておくことをおすすめします。
          </BodyText>
        </View>

        {/* 規約類。保存先の説明のすぐ下に置くのは、
            「データはどう扱われるのか」という同じ関心の続きだから。 */}
        <BodyText style={styles.sectionLabel}>規約とプライバシー</BodyText>
        <Pressable
          style={[styles.card, Shadow, styles.linkRow, { marginBottom: 10 }]}
          onPress={() => router.push("/privacy")}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>プライバシーポリシー</BodyText>
            <BodyText style={styles.note}>
              入力したデータをどう扱うか。外部への送信は行いません。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>
        <Pressable
          style={[styles.card, Shadow, styles.linkRow]}
          onPress={() => router.push("/terms")}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <BodyText style={styles.linkText}>利用規約</BodyText>
            <BodyText style={styles.note}>
              本アプリを使ううえでの条件と免責事項。
            </BodyText>
          </View>
          <BodyText style={styles.linkCaret}>›</BodyText>
        </Pressable>

        <BodyText style={styles.version}>目標BOX v1.0.0</BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  title: { fontSize: 32, marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    color: Palette.muted,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    padding: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { fontSize: 15, color: Palette.ink, fontFamily: Fonts.bodyBold },
  note: { fontSize: 12, color: Palette.muted, lineHeight: 18, marginTop: 10 },
  warningNote: { color: Palette.salmonDark, marginTop: 8 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkText: { color: Palette.ink, fontFamily: Fonts.bodyBold, fontSize: 15 },
  linkCaret: { color: Palette.muted, fontSize: 20 },
  version: {
    textAlign: "center",
    color: Palette.faint,
    fontSize: 11,
    marginTop: 28,
  },
});
