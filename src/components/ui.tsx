import React from "react";
import { StyleSheet, Text, TextProps, View } from "react-native";

import { Fonts, Palette } from "@/constants/theme";
import { estimateTextWidth } from "@/src/lib/textWidth";

/** 手書き風の見出しテキスト */
export function HandText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.hand, style]} />;
}

/** 本文テキスト */
export function BodyText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

/** 進捗バー(親幅に追従) */
export function ProgressBar({
  rate,
  height = 6,
  color = Palette.accentBar,
  track = Palette.border,
}: {
  rate: number; // 0-1
  height?: number;
  color?: string;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(1, rate)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <View
        style={{
          width: `${pct}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** 頻度バッジ(毎日/週1/週3/単発) */
export function FreqBadge({ label, tone = "light" }: { label: string; tone?: "light" | "green" | "salmon" }) {
  const bg =
    tone === "green" ? "#EDF3E2" : tone === "salmon" ? "#FAE9E1" : Palette.cardAlt;
  const fg =
    tone === "green" ? Palette.greenDark : tone === "salmon" ? Palette.salmonDark : Palette.muted;
  return (
    // minWidth は文字切れ対策。バッジは幅が中身ぴったりに決まるため、
    // iOS の実測幅が描画幅より小さく出る端末では末尾が欠ける
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, minWidth: estimateTextWidth(label, 10) + 7 * 2 },
      ]}
    >
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hand: { fontFamily: Fonts.hand, color: Palette.ink },
  body: { fontFamily: Fonts.body, color: Palette.ink },
  track: { width: "100%", overflow: "hidden" },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontFamily: Fonts.bodyMedium, fontSize: 10, textAlign: "center" },
});
