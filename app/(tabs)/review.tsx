import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Palette } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { WeekArchive } from "@/src/components/review/WeekArchive";
import { BodyText, HandText } from "@/src/components/ui";

/** 週次リストのアーカイブ(年 → 月 → 週) */
export default function ReviewScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HandText style={styles.title}>これまでの記録</HandText>

        <BodyText style={styles.subtitle}>
          年 → 月 → 週 でたどって、「今週の目標」を振り返り・編集できます
        </BodyText>

        <WeekArchive />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  title: { fontSize: 32 },
  subtitle: {
    color: Palette.inkSoft,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 18,
  },
});
