/**
 * 通知設定(設定 > 通知 から開く)。
 *
 * 通知を増やすときは、このページにカードを足していく。
 * 1画面にまとめておくことで「何が鳴るのか」を一望できるようにする。
 */
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Fonts, Palette } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { WeeklyReminderCard } from "@/src/components/settings/WeeklyReminderCard";
import { BodyText, HandText } from "@/src/components/ui";

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="設定へ戻る"
        >
          <BodyText style={styles.back}>‹ 設定</BodyText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HandText style={styles.title}>通知</HandText>
        <BodyText style={styles.sectionLabel}>目標のリマインド</BodyText>
        <WeeklyReminderCard />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 },
  back: { color: Palette.accent, fontSize: 15, fontFamily: Fonts.bodyMedium },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 30 },
  lead: {
    fontSize: 13,
    lineHeight: 22,
    color: Palette.inkSoft,
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    color: Palette.muted,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
});
