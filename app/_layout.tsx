import { Yomogi_400Regular, useFonts } from "@expo-google-fonts/yomogi";
import {
  ZenMaruGothic_400Regular,
  ZenMaruGothic_500Medium,
  ZenMaruGothic_700Bold,
} from "@expo-google-fonts/zen-maru-gothic";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Palette } from "@/constants/theme";
import { SplashOverlay } from "@/src/components/SplashOverlay";
import {
  useGoalReminderSync,
  useNotificationTapRouting,
} from "@/src/hooks/useNotifications";
import { useAppStore } from "@/src/store/useAppStore";
import { useStoresHydrated } from "@/src/store/useHydrated";

SplashScreen.preventAutoHideAsync();

/**
 * Expo Go はネイティブのスプラッシュを差し替えられないため、
 * setOptions を呼ぶと何も起きずに警告だけが出る。
 * 実機ビルド(development build / ストア配信)でのみ設定する。
 *
 * Expo Go ではクロスフェードが効かず、OS のスプラッシュが
 * ぱっと消えて SplashOverlay に切り替わる。動作確認には支障ないが、
 * 継ぎ目の見え方を確かめたいときは development build を使うこと。
 */
const canCustomizeSplash =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** フォントの読み込みを待つ上限。これを過ぎたら標準の書体で先に進む */
const FONT_WAIT_LIMIT_MS = 4000;

/**
 * 読み込む書体。**必ずここ(モジュール直下)に置くこと。**
 *
 * useFonts はこのオブジェクトを依存として見ているため、呼び出し時に
 * その場で書くと毎レンダー新しい参照になり、
 * 「読み込み開始(false) → 完了(true) → 再レンダー → また開始(false)」を
 * 延々と繰り返す。その間ずっと画面が描画されず白いままになる。
 */
const FONTS = {
  Yomogi_400Regular,
  ZenMaruGothic_400Regular,
  ZenMaruGothic_500Medium,
  ZenMaruGothic_700Bold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  /**
   * フォントの読み込みを待ちすぎないための保険。
   *
   * useFonts は読み込み中も「失敗」ではなく [false, null] を返すため、
   * 応答が返ってこない場合は成功も失敗もしないまま止まる。
   * 以前はその完了だけを待って null を返していたので、
   * 白画面のまま何のエラーも出ずに固まっていた。
   *
   * Expo Go は書体ファイルを開発サーバーから取りに行くので、
   * 回線の状態によってはここで止まりうる。一定時間で見切り、
   * 端末標準の書体で表示を続ける(崩れるほうが、何も出ないよりまし)。
   */
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  const fontsSettled = fontsLoaded || !!fontError || fontsTimedOut;

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setFontsTimedOut(true), FONT_WAIT_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);
  const hydrated = useStoresHydrated();
  const ensureCurrentWeek = useAppStore((s) => s.ensureCurrentWeek);
  const sweepExpiredSingles = useAppStore((s) => s.sweepExpiredSingles);
  const [splashDone, setSplashDone] = useState(false);

  // 通知の予約を、設定と週次リストの状況に合わせて貼り直す。
  // 復元前は空に見えて誤って催促を仕込むので hydrated を待つ。
  useGoalReminderSync(hydrated);

  // OS のスプラッシュは、自前のアニメーション(SplashOverlay)へ
  // クロスフェードで受け渡す。同じ絵・同じ位置なので継ぎ目が見えない。
  useEffect(() => {
    if (!canCustomizeSplash) return;
    SplashScreen.setOptions({ duration: 250, fade: true });
  }, []);

  // フォントが載った時点で下ろす。この時には SplashOverlay が
  // 同じマークを描いているため、下ろしても画面は途切れない。
  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync();
  }, [fontsSettled]);

  // 止めはしないが、原因が追えるよう必ず記録に残す
  useEffect(() => {
    if (fontError) {
      console.warn("[目標BOX] フォントの読み込みに失敗しました", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsTimedOut && !fontsLoaded) {
      console.warn(
        "[目標BOX] フォントの読み込みが時間内に終わりませんでした。標準の書体で表示します。",
      );
    }
  }, [fontsTimedOut, fontsLoaded]);

  // 起動時のメンテナンス。AsyncStorage の復元後に走らせること
  // (復元前は空状態に見えるため、週次リストの再生成が空振りする)。
  useEffect(() => {
    if (!hydrated) return;
    // 週跨ぎ時: 継続系の小目標を今週の週次リストへ自動再生成
    ensureCurrentWeek();
    // 期限切れの単発項目を消化
    sweepExpiredSingles();
  }, [hydrated, ensureCurrentWeek, sweepExpiredSingles]);

  // ここで null を返してはいけない。
  // ルートが null を返すとナビゲーター(Stack)ごと破棄され、
  // 起動時の画面遷移と噛み合うと「破棄 → 再構築 → 遷移 → 破棄」の
  // 無限ループになる(実際にそれで白画面のまま固まった)。
  // 準備中は SplashOverlay を上にかぶせて隠す。

  return (
    // 背景色を敷いておく。ここが素通しだと、下に何も描かれていないときに
    // 端末の白が見えてしまい、不具合なのか読み込み中なのか区別できない。
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.bg }}>
      <StatusBar style="dark" backgroundColor={Palette.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subgoal/[id]" />
        <Stack.Screen name="tutorial" options={{ presentation: "modal" }} />
        <Stack.Screen name="mandala-guide" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        <Stack.Screen name="privacy" options={{ presentation: "modal" }} />
        <Stack.Screen name="terms" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
      </Stack>

      {/* 遷移を行う部品は Stack より後ろに置く。
          兄弟の effect は記述順に走るため、前に置くと
          ナビゲーターの準備前に遷移を撃つ危険がある。 */}
      <NotificationRouting />

      {/* 保存データの復元が終わるまで出したままにする。
          復元前の画面(空のマンダラ)が一瞬見えるのを防ぐ役目も兼ねる。 */}
      {!splashDone && (
        <SplashOverlay
          ready={fontsSettled && hydrated}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </GestureHandlerRootView>
  );
}

/** 通知タップで開いたときに、その通知が指す画面へ移動する */
function NotificationRouting() {
  useNotificationTapRouting();
  return null;
}

