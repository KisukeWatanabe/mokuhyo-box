/**
 * 目標BOX デザイントークン
 * 紙のような生成り背景 × テラコッタのアクセント(デザインカンプ準拠)
 */
import { Platform } from "react-native";

export const Palette = {
  // 背景
  bg: "#F3ECDB", // 生成り(画面背景)
  bgDot: "#E0D5BC", // 背景ドット
  card: "#FFFDF5", // カード面
  cardAlt: "#FBF6E8",

  // アクセント(テラコッタ)
  accent: "#BC5B37",
  accentDark: "#A54D2D",
  accentSoft: "#F4DDD0", // 薄い赤背景
  accentBar: "#D08052",

  // ステータス
  green: "#D7E4C0", // 達成済み背景
  greenDark: "#6D8B4E",
  salmon: "#F3D3C4", // 週次に追加済み背景
  salmonDark: "#C97B5D",
  tan: "#E5C285", // 中央セル(中目標)
  tanDark: "#B98F4A",
  cream: "#FCF8EC", // 未着手セル

  // テキスト
  ink: "#40372A",
  inkSoft: "#6E6250",
  muted: "#AC9F87",
  faint: "#C9BCA2",

  // 枠線
  border: "#E5DAC2",
  dashed: "#D3C6A8",

  white: "#FFFFFF",
} as const;

export const Fonts = {
  /** 見出し・数字: 手書き風 */
  hand: "Yomogi_400Regular",
  /** 本文: 丸ゴシック(可読性確保) */
  body: "ZenMaruGothic_400Regular",
  bodyMedium: "ZenMaruGothic_500Medium",
  bodyBold: "ZenMaruGothic_700Bold",
} as const;

export const Radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Shadow = Platform.select({
  ios: {
    shadowColor: "#8A7350",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  default: { elevation: 2 },
});

// 旧テンプレート互換(既存hooksが参照)
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.bg,
    tint: Palette.accent,
    icon: Palette.muted,
    tabIconDefault: Palette.muted,
    tabIconSelected: Palette.accent,
  },
  dark: {
    text: Palette.ink,
    background: Palette.bg,
    tint: Palette.accent,
    icon: Palette.muted,
    tabIconDefault: Palette.muted,
    tabIconSelected: Palette.accent,
  },
};
