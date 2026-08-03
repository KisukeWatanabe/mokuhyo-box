import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Palette, Radii } from "@/constants/theme";
import { BodyText, HandText } from "@/src/components/ui";

type Props = {
  /** プレースホルダーのアイコン(将来イラストに差し替える想定) */
  icon: React.ComponentProps<typeof Ionicons>["name"];
  heading: string;
  body: string;
  /** 補足の吹き出し(任意) */
  tip?: string;
  /** 本文の下に差し込む要素(任意)。Step 6 の通知カードなど */
  children?: React.ReactNode;
};

/** 説明のみのステップ(Step 1, 5, 6)の共通レイアウト */
export function OnboardingStepExplain({
  icon,
  heading,
  body,
  tip,
  children,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={44} color={Palette.accent} />
      </View>
      <HandText style={styles.heading}>{heading}</HandText>
      <BodyText style={styles.body}>{body}</BodyText>
      {tip ? (
        <View style={styles.tip}>
          <BodyText style={styles.tipText}>💡 {tip}</BodyText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 12 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  heading: { fontSize: 26, textAlign: "center", lineHeight: 38, marginBottom: 14 },
  body: {
    fontSize: 14.5,
    color: Palette.inkSoft,
    lineHeight: 25,
    textAlign: "center",
  },
  tip: {
    marginTop: 20,
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipText: {
    fontSize: 12.5,
    color: Palette.salmonDark,
    lineHeight: 20,
    textAlign: "center",
  },
});
