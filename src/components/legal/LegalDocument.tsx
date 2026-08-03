/**
 * 規約類の共通レイアウト。
 * プライバシーポリシーと利用規約は見た目が同じなので、
 * 本文(src/lib/legal.ts)だけ差し替えて使い回す。
 */
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Fonts, Palette, Radii, Shadow } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { BodyText, HandText } from "@/src/components/ui";
import { LEGAL_UPDATED_AT, LegalSection } from "@/src/lib/legal";

export function LegalDocument({
  title,
  lead,
  sections,
}: {
  title: string;
  lead: string;
  sections: LegalSection[];
}) {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <BodyText style={styles.back}>‹ 閉じる</BodyText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HandText style={styles.title}>{title}</HandText>
        <BodyText style={styles.updated}>
          最終更新日: {LEGAL_UPDATED_AT}
        </BodyText>
        <BodyText style={styles.lead}>{lead}</BodyText>

        {sections.map((s) => (
          <View key={s.heading} style={[styles.card, Shadow]}>
            <BodyText style={styles.heading}>{s.heading}</BodyText>
            {s.paragraphs.map((p, i) => (
              <BodyText key={i} style={[styles.body, i > 0 && styles.bodyGap]}>
                {p}
              </BodyText>
            ))}
            {s.bullets?.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <BodyText style={styles.bulletMark}>・</BodyText>
                <BodyText style={styles.bulletText}>{b}</BodyText>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 },
  back: { color: Palette.accent, fontSize: 15, fontFamily: Fonts.bodyMedium },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 30 },
  updated: { fontSize: 11, color: Palette.faint, marginTop: 6 },
  lead: {
    fontSize: 13,
    lineHeight: 22,
    color: Palette.inkSoft,
    marginTop: 14,
    marginBottom: 18,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Palette.ink,
    marginBottom: 10,
  },
  body: { fontSize: 13, lineHeight: 23, color: Palette.inkSoft },
  bodyGap: { marginTop: 10 },
  bulletRow: { flexDirection: "row", marginTop: 8 },
  bulletMark: { fontSize: 13, lineHeight: 23, color: Palette.muted },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 23,
    color: Palette.inkSoft,
  },
});
