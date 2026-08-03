import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BodyText, HandText } from "@/src/components/ui";
import { FrequencyType } from "@/src/types";

const FREQS: FrequencyType[] = ["毎日", "週1回", "週数回", "単発"];

type Props = {
  heading: string;
  /** 見出しの下の説明。なぜこれを書くのかを伝える */
  note: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  /** 入力欄の下に出す記入例 */
  example?: string;
  autoFocus?: boolean;
  /** 小目標(Step 4)のみ: 頻度の選択欄を出す */
  frequency?: {
    value: FrequencyType;
    onChange: (f: FrequencyType) => void;
    label: string;
  };
};

/**
 * 目標テキストを入力させるステップ(Step 2〜4)の共通UI。
 * レコードの作成は親(OnboardingFlowScreen)が「次へ」で行う。
 * ここは入力値を預かるだけに徹し、どの階層の目標かを知らない。
 */
export function OnboardingStepGoalInput({
  heading,
  note,
  placeholder,
  value,
  onChangeText,
  example,
  autoFocus,
  frequency,
}: Props) {
  return (
    <View style={styles.wrap}>
      <HandText style={styles.heading}>{heading}</HandText>
      <BodyText style={styles.note}>{note}</BodyText>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.faint}
        autoFocus={autoFocus}
        maxLength={40}
        returnKeyType="done"
        multiline
      />
      {example ? <BodyText style={styles.example}>{example}</BodyText> : null}

      {frequency ? (
        <View style={styles.freqBlock}>
          <BodyText style={styles.freqLabel}>{frequency.label}</BodyText>
          <View style={styles.freqRow}>
            {FREQS.map((f) => {
              const active = frequency.value === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => frequency.onChange(f)}
                  style={[styles.freq, active && styles.freqActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <BodyText
                    style={[styles.freqText, active && styles.freqTextActive]}
                  >
                    {f}
                  </BodyText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  heading: { fontSize: 25, lineHeight: 38, marginBottom: 12 },
  note: {
    fontSize: 13.5,
    color: Palette.inkSoft,
    lineHeight: 23,
    marginBottom: 26,
  },
  input: {
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 72,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    lineHeight: 26,
    color: Palette.ink,
    textAlignVertical: "top",
  },
  example: {
    fontSize: 12,
    color: Palette.muted,
    marginTop: 10,
    marginLeft: 4,
    lineHeight: 19,
  },
  freqBlock: { marginTop: 26 },
  freqLabel: { fontSize: 13.5, color: Palette.inkSoft, marginBottom: 10 },
  freqRow: { flexDirection: "row", gap: 8 },
  freq: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
    alignItems: "center",
  },
  freqActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  freqText: { fontSize: 13, color: Palette.inkSoft },
  freqTextActive: { color: Palette.white, fontFamily: Fonts.bodyBold },
});
