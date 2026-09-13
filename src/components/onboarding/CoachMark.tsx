import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { BodyText } from "@/src/components/ui";
import { Rect, resolveBubbleTop } from "@/src/lib/coachMarkLayout";

/** measureInWindow を持つ要素への ref(View など) */
export type MeasurableRef = React.RefObject<{
  measureInWindow?: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
} | null>;

type Props = {
  visible: boolean;
  /** 説明したい要素。省略/測定失敗時は画面下部に吹き出しだけ出す */
  targetRef?: MeasurableRef;
  title: string;
  body: string;
  onClose: () => void;
};

const HOLE_PAD = 8;
const GAP = 14; // 穴と吹き出しの間隔
const EDGE = 12; // 画面端(セーフエリア内側)からの最小余白

/**
 * Part B 用の汎用スポットライト/吹き出し。
 *
 * 対象要素を measureInWindow で測り、その周囲だけを暗くして穴を空ける
 * (SVGマスクを使わず、上下左右4枚の矩形で囲む方式)。
 *
 * 自動では閉じない。「わかりました」を押すまで出したままにする
 * (勝手に消えると読み切れないため)。
 */
export function CoachMark({ visible, targetRef, title, body, onClose }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbleH, setBubbleH] = useState(0);
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 対象の位置を測る。画面遷移直後はレイアウトが未確定なので少し待つ。
  useEffect(() => {
    if (!visible) {
      setRect(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      targetRef?.current?.measureInWindow?.((x, y, width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setRect({ x, y, width, height });
        }
      });
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, targetRef]);

  if (!visible) return null;

  // 穴。画面外にはみ出さないよう内側に収める。
  const hole = rect
    ? {
        x: Math.max(0, rect.x - HOLE_PAD),
        y: Math.max(0, rect.y - HOLE_PAD),
        width: Math.min(rect.width + HOLE_PAD * 2, winW),
        height: Math.min(rect.height + HOLE_PAD * 2, winH),
      }
    : null;

  const { top } = resolveBubbleTop({
    hole,
    bubbleHeight: bubbleH,
    windowHeight: winH,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    gap: GAP,
    edge: EDGE,
  });

  const onBubbleLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== bubbleH) setBubbleH(h);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fill}>
        {hole ? (
          <>
            {/* 対象の周囲だけを暗くして穴を空ける */}
            <View style={[styles.dim, { left: 0, right: 0, top: 0, height: hole.y }]} />
            <View
              style={[
                styles.dim,
                { left: 0, right: 0, top: hole.y + hole.height, bottom: 0 },
              ]}
            />
            <View
              style={[
                styles.dim,
                { left: 0, top: hole.y, width: hole.x, height: hole.height },
              ]}
            />
            <View
              style={[
                styles.dim,
                {
                  left: hole.x + hole.width,
                  right: 0,
                  top: hole.y,
                  height: hole.height,
                },
              ]}
            />
            {/* 穴のふち */}
            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  left: hole.x,
                  top: hole.y,
                  width: hole.width,
                  height: hole.height,
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}

        {/* 高さを測るまでは位置が決まらないので、チラつき防止で隠しておく */}
        <View
          style={[styles.bubble, { top, opacity: bubbleH > 0 ? 1 : 0 }]}
          onLayout={onBubbleLayout}
        >
          <View style={styles.tag}>
            <BodyText style={styles.tagText}>ヒント</BodyText>
          </View>
          <BodyText style={styles.title}>{title}</BodyText>
          <BodyText style={styles.body}>{body}</BodyText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="ヒントを閉じる"
          >
            <BodyText style={styles.closeText}>わかりました</BodyText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dim: { position: "absolute", backgroundColor: "rgba(38,30,18,0.66)" },
  ring: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: Palette.accent,
    borderRadius: Radii.lg,
  },
  bubble: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: Palette.card,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    borderColor: Palette.accent,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: Palette.accentSoft,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 11,
    color: Palette.accent,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Palette.ink,
    lineHeight: 27,
    marginBottom: 8,
  },
  body: {
    fontSize: 14.5,
    color: Palette.inkSoft,
    lineHeight: 25,
    marginBottom: 18,
  },
  close: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: "center",
  },
  closeText: {
    color: Palette.white,
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
});
