import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { Palette } from "@/constants/theme";

/**
 * 全画面共通ラッパー: 生成り背景 + うっすらドットパターン + セーフエリア
 */
export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="dots" width={26} height={26} patternUnits="userSpaceOnUse">
            <Circle cx={3} cy={3} r={1.4} fill={Palette.bgDot} opacity={0.55} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
      <View style={{ flex: 1, paddingTop: insets.top }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
});
