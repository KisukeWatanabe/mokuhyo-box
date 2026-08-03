/**
 * 起動アニメーション。
 *
 * ネイティブのスプラッシュ(app.json / splash-icon.png)と同じマークを、
 * 同じ大きさ・同じ位置に描くところから始める。そのため OS のスプラッシュが
 * 消える瞬間に絵が入れ替わらず、そのまま動き出したように見える。
 *
 * 動き: 空いているマス(クリーム色)が1つずつ緑に埋まっていく → ロゴが浮かび上がる → 溶暗。
 * 「マスを埋めていく」というアプリの中身そのものを、起動の1秒で見せる意図。
 *
 * 寸法・色は assets/images/mokuhyo-box-icon.png の実測値。
 * 原画を描き直したら scripts/build-icons.js を再実行し、ここの定数も見直すこと。
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Fonts, Palette } from "@/constants/theme";

/** ネイティブスプラッシュの imageWidth と必ず一致させる(app.json) */
export const MARK_SIZE = 180;

/* 原画から実測した比率(マーク全体を1とする) */
const BORDER = 0.0273; // 外枠の太さ = マス間の隙間
const COL = 0.2969; // 列幅(3列とも同じ)
const ROWS = [0.2617, 0.3682, 0.2607]; // 行高(中央の行だけ高い)

/* 原画から採取した色 */
const C = {
  frame: "#DCCBA1",
  empty: "#F7F0DF", // 未着手のマス
  filled: "#D7E2B7", // 埋まったマス(達成済み)
  salmon: "#E9CEB3", // 週次リストに追加済み
  accent: "#C15F3B", // 中央 = 大目標
  accentInner: "#F7EEDD",
} as const;

type CellKind = "empty" | "filled" | "salmon" | "accent";

/** 原画の配色。empty の5マスが順に埋まっていく */
const LAYOUT: CellKind[][] = [
  ["empty", "empty", "empty"],
  ["salmon", "accent", "salmon"],
  ["empty", "filled", "empty"],
];

/** 埋まる順番(左上から時計回り)。row,col */
const FILL_ORDER: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [2, 2],
  [2, 0],
];

/* 尺の調整はここだけを触ればよい。合計は約 4.8 秒。
   内訳: マスが埋まり終わる 2.64s → 静止 1.04s → 溶暗 1.12s */
const STAGGER = 280; // 次のマスが埋まり始めるまでの間
const FILL_DELAY = 480; // 最初のマスが動き出すまでの間
const CELL_FILL = 1040; // 1マスが埋まりきるまで
const LOGO_DELAY = 1200; // ロゴが出はじめるまで
const LOGO_FADE = 1360; // ロゴが出きるまで
const HOLD_AFTER_FILL = 1040; // 出そろってから溶暗を始めるまで
const FADE_OUT = 1120; // 溶暗

/** タップで飛ばしたときは待たせない(通常の尺のままだと2秒以上待たされる) */
const SKIP_FADE = 160;

export function SplashOverlay({
  ready,
  onFinish,
}: {
  /** アプリ側(フォント・保存データの復元)の準備ができたか */
  ready: boolean;
  onFinish: () => void;
}) {
  // 5マス分の進捗値。色と拡大に使うので JS ドライバで動かす
  const fills = useRef(FILL_ORDER.map(() => new Animated.Value(0))).current;
  const logo = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  // アニメーションが終わったか。準備完了と両方そろってから閉じる
  const [animDone, setAnimDone] = useState(false);
  const closing = useRef(false);
  const skipped = useRef(false);
  /** 走行中のアニメーション。タップで飛ばすときに止める */
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;

      // 視差効果を減らす設定のときは、動きを出さず静かに表示するだけにする
      if (reduce) {
        fills.forEach((v) => v.setValue(1));
        logo.setValue(1);
        setAnimDone(true);
        return;
      }

      running.current = Animated.parallel([
        Animated.stagger(
          STAGGER,
          fills.map((v) =>
            Animated.timing(v, {
              toValue: 1,
              duration: CELL_FILL,
              delay: FILL_DELAY,
              easing: Easing.out(Easing.back(2)),
              useNativeDriver: false, // 背景色を補間するため
            }),
          ),
        ),
        Animated.timing(logo, {
          toValue: 1,
          duration: LOGO_FADE,
          delay: LOGO_DELAY,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      running.current.start(({ finished }) => {
        if (!cancelled && finished) setAnimDone(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fills, logo]);

  // 溶暗して閉じる。アニメーション完了とアプリ側の準備がそろった時点で走る
  useEffect(() => {
    if (!animDone || !ready || closing.current) return;
    closing.current = true;
    Animated.timing(fade, {
      toValue: 0,
      // 飛ばされたときは、静止をはさまずすぐ消える
      duration: skipped.current ? SKIP_FADE : FADE_OUT,
      delay: skipped.current ? 0 : HOLD_AFTER_FILL,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [animDone, ready, fade, onFinish]);

  /** 待たされたくない人のために、タップで残りを飛ばせるようにする */
  const skip = () => {
    if (closing.current) return;
    skipped.current = true;
    // 走行中のまま値を書き換えても上書きされ続けるので、先に止める
    running.current?.stop();
    fills.forEach((v) => v.setValue(1));
    logo.setValue(1);
    setAnimDone(true);
  };

  const cells = useMemo(() => buildCells(MARK_SIZE), []);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Pressable style={styles.center} onPress={skip}>
        <View style={[styles.mark, { width: MARK_SIZE, height: MARK_SIZE }]}>
          {cells.map((cell) => {
            const fillIndex = FILL_ORDER.findIndex(
              ([r, c]) => r === cell.row && c === cell.col,
            );
            const base = LAYOUT[cell.row][cell.col];

            if (fillIndex < 0) {
              return (
                <View
                  key={cell.key}
                  style={[
                    styles.cell,
                    cell.box,
                    { backgroundColor: C[base], borderRadius: cell.radius },
                    base === "accent" && styles.accentCell,
                  ]}
                >
                  {base === "accent" && (
                    <View
                      style={[
                        styles.accentInner,
                        {
                          width: cell.box.width * 0.29,
                          height: cell.box.width * 0.29,
                          borderRadius: cell.box.width * 0.09,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            }

            const v = fills[fillIndex];
            return (
              <Animated.View
                key={cell.key}
                style={[
                  styles.cell,
                  cell.box,
                  {
                    borderRadius: cell.radius,
                    backgroundColor: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [C.empty, C.filled],
                      // back イージングは 1 を越えるので、色は行き過ぎないよう止める
                      extrapolate: "clamp",
                    }),
                    // ぷくっと膨らんでから元の大きさに戻る(隙間を侵さないため)
                    transform: [
                      {
                        scale: v.interpolate({
                          inputRange: [0, 0.6, 1],
                          outputRange: [1, 1.06, 1],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.logoBox,
            {
              opacity: logo,
              transform: [
                {
                  translateY: logo.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.Text style={styles.wordmark}>目標BOX</Animated.Text>
          <Animated.Text style={styles.tagline}>
            一年の目標を、今週の行動に。
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** 実測比率から9マスの位置とサイズを組み立てる */
function buildCells(size: number) {
  const gap = size * BORDER;
  const colW = size * COL;
  const out: {
    key: string;
    row: number;
    col: number;
    radius: number;
    box: { position: "absolute"; left: number; top: number; width: number; height: number };
  }[] = [];

  let top = gap;
  for (let row = 0; row < 3; row++) {
    const rowH = size * ROWS[row];
    let left = gap;
    for (let col = 0; col < 3; col++) {
      out.push({
        key: `${row}-${col}`,
        row,
        col,
        radius: colW * 0.125,
        box: { position: "absolute", left, top, width: colW, height: rowH },
      });
      left += colW + gap;
    }
    top += rowH + gap;
  }
  return out;
}

const styles = StyleSheet.create({
  root: { backgroundColor: Palette.bg, zIndex: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: {
    backgroundColor: C.frame,
    borderRadius: MARK_SIZE * 0.06,
  },
  cell: { alignItems: "center", justifyContent: "center" },
  // 原画では中央のマスだけ一段手前にあり、影が落ちている
  accentCell: {
    shadowColor: "#8A4A2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 3,
  },
  accentInner: { backgroundColor: C.accentInner },
  logoBox: { alignItems: "center", marginTop: 28 },
  wordmark: {
    fontFamily: Fonts.hand,
    fontSize: 26,
    color: Palette.ink,
    letterSpacing: 1.5,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Palette.muted,
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
