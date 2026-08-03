import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Fonts, Palette } from "@/constants/theme";

/**
 * タブのラベルを自前で描く。
 *
 * 「目標マップ」が「目標マ…」と切れていたのは幅が足りないからではなく、
 * iOS がテキストの実測幅を実際の描画幅より小さく返すため。
 * 親(タブ項目)が alignItems:center なので、そのままだとラベルの幅は
 * 「実測幅ぴったり」になり、描画に必要な幅に届かず1文字ぶん省略される。
 * alignSelf:"stretch" でタブ項目の幅いっぱいを与えて、実測幅に依存させない。
 */
function tabLabel(text: string) {
  const Label = ({ color }: { color: string }) => (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[styles.label, { color }]}
    >
      {text}
    </Text>
  );
  return Label;
}

/** 下部タブ: マンダラ / 今週 / 振り返り */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Palette.accent,
        tabBarInactiveTintColor: Palette.muted,
        tabBarStyle: {
          backgroundColor: Palette.card,
          borderTopColor: Palette.border,
        },
        // 端末幅で自動判定させると、条件によってはアイコンの横に置かれ、
        // ラベルの幅が半分になって「振り…」のように切れる。iPhone では常に下。
        tabBarLabelPosition: "below-icon",
        // ラベルは tabLabel() で自前に描くので、拡大の抑止もそちらで行う
        tabBarAllowFontScaling: false,
        // 左右の余白を詰めて、ラベルに使える幅を確保する
        tabBarItemStyle: { paddingHorizontal: 2 },
        sceneStyle: { backgroundColor: Palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "目標マップ",
          tabBarLabel: tabLabel("目標マップ"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "今週の目標",
          tabBarLabel: tabLabel("今週の目標"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "記録",
          tabBarLabel: tabLabel("記録"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="disc-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarLabel: tabLabel("設定"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size - 1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    textAlign: "center",
    // 親の alignItems:center による「内容ぴったり幅」を打ち消す
    alignSelf: "stretch",
  },
});
