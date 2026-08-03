import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BodyText } from "@/src/components/ui";
import { mainGoalLabel } from "@/src/lib/labels";
import { MainGoal, MicroGoal, SubGoal } from "@/src/types";

type Props = {
  mainGoal: MainGoal;
  subGoals: SubGoal[];
  microGoals: MicroGoal[];
  onPressBlock: (sub: SubGoal) => void;
};

/**
 * 全体マップ: 伝統的マンダラチャートの 9×9 = 81マス。
 *
 * flexWrap で折り返すと幅計算が僅かにずれた時に崩れて縦長に潰れるため、
 * ここでは明示的な行(row)構造で 3×3 のブロックを組む。
 * セルサイズは画面幅から逆算して必ず収まるようにし、横スクロールは使わない
 * (CLAUDE.md: 横スクロール不可・iPhone画面幅に必ず収める)。
 */
export function OverviewGrid({ mainGoal, subGoals, microGoals, onPressBlock }: Props) {
  const { width } = useWindowDimensions();

  const outerPad = 16; // 画面左右余白
  const framePad = 8; // 枠内余白
  const blockGap = 6; // ブロック間の隙間
  const cellGap = 2; // セル間の隙間

  // 画面幅にちょうど収まるセル幅を逆算する。
  // available = cellW*9 + cellGap*6 + blockGap*2
  const available = width - outerPad * 2 - framePad * 2;
  const cellW = Math.floor((available - cellGap * 6 - blockGap * 2) / 9);
  const cellH = Math.round(cellW * 1.12);
  const fontSize = Math.max(7, Math.round(cellW / 4.6));
  const lineHeight = fontSize + 2;

  const blockW = cellW * 3 + cellGap * 2;
  const frameW = blockW * 3 + blockGap * 2 + framePad * 2;

  // 各ブロックのセル配置(3×3)。数字は position(1-8)、"c" は中央。
  // [1,2,3] / [4,c,5] / [6,7,8]
  const cellSlots: (number | "c")[][] = [
    [1, 2, 3],
    [4, "c", 5],
    [6, 7, 8],
  ];
  // ブロック配置(3×3)。同じく数字は position、"center" は大目標ブロック。
  const blockSlots: (number | "center")[][] = [
    [1, 2, 3],
    [4, "center", 5],
    [6, 7, 8],
  ];

  const cellDeco = (status?: MicroGoal["status"]) => {
    switch (status) {
      case "達成済み":
        return { backgroundColor: Palette.green };
      case "週次リストに追加済み":
        return { backgroundColor: Palette.salmon };
      default:
        return {
          backgroundColor: "rgba(252,248,236,0.7)",
          borderWidth: 1,
          borderStyle: "dashed" as const,
          borderColor: Palette.dashed,
        };
    }
  };

  const cellBox = { width: cellW, height: cellH };
  const cellFont = { fontSize, lineHeight };

  // 単一セルを描画
  const renderCell = (
    key: React.Key,
    deco: object,
    text: string,
    textColor: string,
    bold?: boolean,
    fontDelta = 0
  ) => (
    <View key={key} style={[styles.cell, deco, cellBox]}>
      <Text
        style={[
          styles.cellText,
          cellFont,
          fontDelta ? { fontSize: fontSize + fontDelta } : null,
          { color: textColor },
          bold && { fontFamily: Fonts.bodyBold },
        ]}
        numberOfLines={3}
      >
        {text}
      </Text>
    </View>
  );

  // 1ブロック(3×3セル)を描画
  const renderBlock = (blockSlot: number | "center", key: React.Key) => {
    const isCenterBlock = blockSlot === "center";
    const sub = isCenterBlock ? null : subGoals.find((g) => g.position === blockSlot) ?? null;
    const micros = sub ? microGoals.filter((m) => m.subGoalId === sub.id) : [];

    const inner = (
      <View style={[styles.block, { width: blockW }]}>
        {cellSlots.map((row, r) => (
          <View key={r} style={[styles.row, { gap: cellGap, marginBottom: r < 2 ? cellGap : 0 }]}>
            {row.map((slot, c) => {
              const key2 = `${r}-${c}`;

              if (slot === "c") {
                if (isCenterBlock) {
                  // 大目標(中央ブロックの中央)
                  return renderCell(
                    key2,
                    { backgroundColor: Palette.accent },
                    mainGoalLabel(mainGoal),
                    Palette.white,
                    true,
                    -0.5
                  );
                }
                // 中目標(各ブロックの中央)
                return renderCell(
                  key2,
                  { backgroundColor: Palette.tan },
                  sub?.title ?? "",
                  "#5C4322",
                  true
                );
              }

              if (isCenterBlock) {
                // 中央ブロックの周囲8マス = 中目標
                const centerSub = subGoals.find((g) => g.position === slot) ?? null;
                return (
                  <Pressable
                    key={key2}
                    onPress={() => centerSub && onPressBlock(centerSub)}
                    style={[styles.cell, { backgroundColor: Palette.tan }, cellBox]}
                  >
                    <Text
                      style={[styles.cellText, cellFont, { color: "#5C4322", fontFamily: Fonts.bodyBold }]}
                      numberOfLines={3}
                    >
                      {centerSub?.title ?? ""}
                    </Text>
                  </Pressable>
                );
              }

              // 通常ブロックの周囲8マス = 小目標
              const micro = micros.find((m) => m.position === slot);
              const done = micro?.status === "達成済み";
              const added = micro?.status === "週次リストに追加済み";
              const textColor = done ? "#4C6635" : added ? Palette.salmonDark : Palette.inkSoft;
              return renderCell(
                key2,
                cellDeco(micro?.status),
                micro ? micro.title + (done ? " ✓" : "") : "",
                textColor
              );
            })}
          </View>
        ))}
      </View>
    );

    if (isCenterBlock) return <View key={key}>{inner}</View>;

    return (
      <Pressable key={key} onPress={() => sub && onPressBlock(sub)}>
        {inner}
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.center}>
        <View style={[styles.frame, { width: frameW, padding: framePad }]}>
          {blockSlots.map((blockRow, r) => (
            <View
              key={r}
              style={[styles.row, { gap: blockGap, marginBottom: r < 2 ? blockGap : 0 }]}
            >
              {blockRow.map((slot, c) => renderBlock(slot, `${r}-${c}`))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <LegendDot color="transparent" dashed label="未着手" />
        <LegendDot color={Palette.salmon} label="週次に追加済" />
        <LegendDot color={Palette.green} label="達成済" />
      </View>
    </View>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.dot,
          { backgroundColor: color },
          dashed && { borderWidth: 1, borderStyle: "dashed", borderColor: Palette.dashed },
        ]}
      />
      <BodyText style={styles.legendText}>{label}</BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  frame: {
    backgroundColor: "rgba(251,246,232,0.75)",
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  row: { flexDirection: "row" },
  block: {},
  cell: {
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
    paddingVertical: 1,
  },
  cellText: {
    fontFamily: Fonts.bodyMedium,
    color: Palette.inkSoft,
    textAlign: "center",
    // 親が alignItems:center なので、これが無いと幅が iOS の実測値ぴったりになり、
    // 実測が描画幅より小さく出る端末で末尾が「…」になる
    alignSelf: "stretch",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: Palette.inkSoft },
});
