import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Fonts, Palette, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { OnboardingStepExplain } from "@/src/components/onboarding/OnboardingStepExplain";
import { OnboardingStepGoalInput } from "@/src/components/onboarding/OnboardingStepGoalInput";
import { WeeklyListPreview } from "@/src/components/onboarding/WeeklyListPreview";
import { BodyText, HandText } from "@/src/components/ui";
import {
  REMINDER_TIMES,
  ensureNotificationPermission,
} from "@/src/lib/notifications";
import { useAppStore } from "@/src/store/useAppStore";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import { useOnboardingStore } from "@/src/store/useOnboardingStore";
import { FrequencyType } from "@/src/types";

/**
 * Part A: 初回起動オンボーディング(体験型ウィザード)。
 *
 * 説明を読ませるだけでなく、その場で大目標→中目標を実際に入力させ、
 * 入力という行動そのものでステップが完了する形式。
 * 入力内容はチュートリアル用のダミーではなく本物のレコードとして保存する。
 *
 * 書き込み先のマンダラは開始時ではなく Step2 の確定時に決める:
 *   - アクティブなマンダラが空 → それを使う(新規インストール。空マンダラが余らない)
 *   - 何か入っている        → 新しいマンダラを作る(サンプルや既存データを壊さない)
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const skipOnboarding = useOnboardingStore((s) => s.skipOnboarding);
  const saveOnboardingMainGoal = useAppStore((s) => s.saveOnboardingMainGoal);
  const saveOnboardingSubGoal = useAppStore((s) => s.saveOnboardingSubGoal);
  const saveOnboardingMicroGoal = useAppStore((s) => s.saveOnboardingMicroGoal);
  const addMicroToWeek = useAppStore((s) => s.addMicroToWeek);
  const notificationsOn = useNotificationStore((s) => s.weeklyEnabled);
  const setWeeklyEnabled = useNotificationStore((s) => s.setWeeklyEnabled);
  const markPermissionRequested = useNotificationStore(
    (s) => s.markPermissionRequested,
  );

  const [step, setStep] = useState(0);
  const [mainTitle, setMainTitle] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [microTitle, setMicroTitle] = useState("");
  const [freq, setFreq] = useState<FrequencyType>("毎日");
  // 一度作成したレコードは、戻って編集しても増やさず同じものを更新する
  const [mainGoalId, setMainGoalId] = useState<string | null>(null);
  const [subGoalId, setSubGoalId] = useState<string | null>(null);
  const [microGoalId, setMicroGoalId] = useState<string | null>(null);

  /** Step2: 大目標を確定して保存する */
  const commitMainGoal = () => {
    setMainGoalId(saveOnboardingMainGoal(mainTitle.trim(), mainGoalId));
  };

  /** Step3: 中目標を1つだけ保存する(残り7つは後から埋めればよい) */
  const commitSubGoal = () => {
    setSubGoalId(saveOnboardingSubGoal(subTitle.trim(), subGoalId));
  };

  /**
   * Step4: 小目標を保存し、そのまま今週の週次リストへとり込む。
   * Step5 で「もう追加されている」ことをその場で見せるため、
   * ここで連携まで済ませてしまう。
   */
  const commitMicroGoal = () => {
    if (!subGoalId) return;
    const id = saveOnboardingMicroGoal(
      subGoalId,
      microTitle.trim(),
      freq,
      microGoalId,
    );
    setMicroGoalId(id);
    if (id) addMicroToWeek(id, { frequencyType: freq });
  };

  /** オンボーディングを終えて「今週の目標」へ */
  const finish = () => {
    completeOnboarding();
    // 完了後は「今週の目標」へ。作った行動がもう並んでいる状態で始めてもらう
    router.replace("/(tabs)/week");
  };

  /**
   * 通知を許可してもらってから終わる。
   *
   * 設定画面に置いただけでは、わざわざ開いてオンにする人はほとんどいない。
   * 「自分で目標を1つ作って、週次リストに並んだ」直後のここが、
   * 通知の値打ちがいちばん伝わる場所なので、この位置で聞く。
   * 断られてもここでは引き止めない(設定からいつでもオンにできる)。
   */
  const enableNotificationsAndFinish = async () => {
    markPermissionRequested();
    const granted = await ensureNotificationPermission();
    if (granted) setWeeklyEnabled(true);
    finish();
  };

  const STEPS = [
    {
      /** Step 1: なぜマンダラチャートが効くのかを伝える */
      canProceed: true,
      commit: undefined as (() => void) | undefined,
      /** 最後のステップだけ、既定の「次へ」ではない動きをする */
      onPrimary: undefined as (() => void) | undefined,
      /** CTA の下に置く控えめな選択肢(任意) */
      secondary: undefined as { label: string; onPress: () => void } | undefined,
      cta: "次へ",
      render: () => (
        <OnboardingStepExplain
          icon="map-outline"
          heading={"なぜ、書くだけで\n終わる目標が多いのか?"}
          body="大きな目標を立てても、日々何をすればいいか分からず放置してしまう。マンダラチャートは、1年の目標を“今日の行動”まで分解するための地図です。"
          tip="読むだけでなく、この場で1つずつ書いていきます。"
        />
      ),
    },
    {
      /** Step 2: 大目標を実際に作る */
      canProceed: mainTitle.trim().length > 0,
      commit: commitMainGoal,
      cta: "次へ",
      render: () => (
        <OnboardingStepGoalInput
          heading={"まず、今年の大目標を\n1つ決めましょう"}
          note="中心のマスが、あなたの1年間の北極星になります。"
          placeholder="例: 健康的で充実した1年に"
          value={mainTitle}
          onChangeText={setMainTitle}
          example="うまい言葉でなくて大丈夫。あとから何度でも書き換えられます。"
          autoFocus
        />
      ),
    },
    {
      /** Step 3: 中目標を1つだけ作る */
      canProceed: subTitle.trim().length > 0,
      commit: commitSubGoal,
      cta: "次へ",
      render: () => (
        <OnboardingStepGoalInput
          heading={"大目標を、8つの\n“やるべきこと”に分解します"}
          note={`大きすぎる目標はそのままでは動けません。まずは1つだけ、「${mainTitle.trim()}」を実現するために今年やるべきことを書いてみましょう。残り7つは後でゆっくり埋めればOKです。`}
          placeholder="例: 体づくり"
          value={subTitle}
          onChangeText={setSubTitle}
          example="8つ埋める必要はありません。1つ書けば十分です。"
          autoFocus
        />
      ),
    },
    {
      /** Step 4: 小目標 + 頻度。紙のマンダラには無い「頻度」がここの主役 */
      canProceed: microTitle.trim().length > 0,
      commit: commitMicroGoal,
      cta: "次へ",
      render: () => (
        <OnboardingStepGoalInput
          heading={"“やるべきこと”を、今日から\nできる行動に変えましょう"}
          note={`ここが紙のマンダラチャートにはない機能です。行動には「頻度」をつけられます。「${subTitle.trim()}」のために、具体的に何をしますか?`}
          placeholder="例: ジムに行く"
          value={microTitle}
          onChangeText={setMicroTitle}
          example="「やる/やらない」が自分で判断できる大きさにするのがコツです。"
          autoFocus
          frequency={{
            value: freq,
            onChange: setFreq,
            label: "どのくらいの頻度でやりますか?",
          }}
        />
      ),
    },
    {
      /** Step 5: アハ体験。いま作った行動が週次リストに出ていることを見せる */
      canProceed: true,
      commit: undefined,
      cta: "次へ",
      render: () => (
        <View style={styles.previewStep}>
          <HandText style={styles.previewHeading}>
            たった今、週次リストに{"\n"}追加されました
          </HandText>
          <BodyText style={styles.previewBody}>
            頻度に応じて、自動的に週次リストに出現します。マンダラは“地図”、週次リストは“今日の行動”。この2つがつながることで、目標が絵に描いた餅で終わらなくなります。
          </BodyText>
          <WeeklyListPreview microGoalId={microGoalId} />
        </View>
      ),
    },
    {
      /**
       * Step 6: 完了 + 通知の許可。
       * 「残りは埋めなくていい」と安心させたうえで、
       * 週のはじめに戻ってくるきっかけ(通知)をここで受け取ってもらう。
       */
      canProceed: true,
      commit: undefined,
      cta: notificationsOn ? "はじめる" : "通知を受け取る",
      onPrimary: notificationsOn ? finish : enableNotificationsAndFinish,
      secondary: notificationsOn
        ? undefined
        : { label: "あとで", onPress: finish },
      render: () => (
        <OnboardingStepExplain
          icon="sparkles-outline"
          heading="準備完了です"
          body="残りのマスは、いつでも追加・編集できます。達成すると、マンダラのマスが緑に変わります。"
        >
          <ReminderOffer enabled={notificationsOn} />
        </OnboardingStepExplain>
      ),
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    // 独自の動きを持つステップ(最後の通知許可)はそちらに任せる
    if (current.onPrimary) {
      current.onPrimary();
      return;
    }
    current.commit?.();
    if (isLast) {
      finish();
      return;
    }
    setStep((i) => i + 1);
  };

  const confirmSkip = () => {
    Alert.alert(
      "チュートリアルをとばしますか?",
      "後から設定画面からいつでも再開できます。ここまでに入力した内容はそのまま保存されます。",
      [
        { text: "続ける", style: "cancel" },
        {
          text: "とばす",
          style: "destructive",
          onPress: () => {
            skipOnboarding();
            router.replace("/(tabs)");
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.top}>
          <BodyText style={styles.progress}>
            {step + 1} / {STEPS.length}
          </BodyText>
          <Pressable onPress={confirmSkip} hitSlop={10}>
            <BodyText style={styles.skip}>スキップ</BodyText>
          </Pressable>
        </View>

        {/* 進捗バー(ステップ数が増えても自動で分割される) */}
        <View style={styles.trackRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.trackSeg, i <= step && styles.trackSegOn]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {current.render()}
        </ScrollView>

        <View style={styles.bottom}>
          <Pressable
            onPress={goNext}
            disabled={!current.canProceed}
            style={({ pressed }) => [
              styles.cta,
              !current.canProceed && styles.ctaDisabled,
              pressed && current.canProceed && { opacity: 0.85 },
            ]}
          >
            <BodyText
              style={[
                styles.ctaText,
                !current.canProceed && styles.ctaTextDisabled,
              ]}
            >
              {current.cta}
            </BodyText>
          </Pressable>
          {current.secondary && (
            <Pressable
              onPress={current.secondary.onPress}
              hitSlop={8}
              style={styles.secondary}
              accessibilityRole="button"
            >
              <BodyText style={styles.secondaryText}>
                {current.secondary.label}
              </BodyText>
            </Pressable>
          )}
          {!current.canProceed && (
            <BodyText style={styles.ctaHint}>
              入力すると次に進めます
            </BodyText>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Step 6 の通知カード。
 * 何がいつ届くのかを実物の文面で見せる(許可を求める前に中身を示す)。
 * 文言は実際のスケジュール定数から組み立て、説明と挙動がずれないようにする。
 */
function ReminderOffer({ enabled }: { enabled: boolean }) {
  return (
    <View style={styles.offer}>
      <View style={styles.offerHead}>
        <Ionicons
          name="notifications-outline"
          size={17}
          color={Palette.accent}
        />
        <BodyText style={styles.offerTitle}>
          月曜の朝 {REMINDER_TIMES.morningHour}:00 にお知らせします
        </BodyText>
      </View>
      <BodyText style={styles.offerQuote}>「今週の目標は何ですか?」</BodyText>
      <BodyText style={styles.offerNote}>
        {enabled
          ? "通知はすでにオンになっています。設定からいつでも変更できます。"
          : `週のはじめに一度だけ声をかけます。目標が空のままなら${REMINDER_TIMES.nudgeDaysLabel}の夕方にもう一度。届くのは多くても週${REMINDER_TIMES.maxPerWeek}回までです。`}
      </BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },
  progress: { fontSize: 13, color: Palette.muted, letterSpacing: 1 },
  skip: { fontSize: 13, color: Palette.muted },
  trackRow: { flexDirection: "row", gap: 5, paddingHorizontal: 24 },
  trackSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
  },
  trackSegOn: { backgroundColor: Palette.accent },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, flexGrow: 1 },
  previewStep: { gap: 16 },
  previewHeading: { fontSize: 25, lineHeight: 38, textAlign: "center" },
  previewBody: {
    fontSize: 13.5,
    color: Palette.inkSoft,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 4,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 4 },
  cta: {
    backgroundColor: Palette.accent,
    borderRadius: Radii.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: Palette.border },
  ctaText: { color: Palette.white, fontFamily: Fonts.bodyBold, fontSize: 17 },
  ctaTextDisabled: { color: Palette.muted },
  ctaHint: {
    textAlign: "center",
    fontSize: 11.5,
    color: Palette.faint,
    marginTop: 8,
  },
  secondary: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  secondaryText: { fontSize: 14, color: Palette.muted },

  offer: {
    marginTop: 24,
    alignSelf: "stretch",
    backgroundColor: Palette.card,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  offerHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  offerTitle: {
    flex: 1,
    fontSize: 13,
    color: Palette.ink,
    fontFamily: Fonts.bodyBold,
  },
  offerQuote: {
    fontSize: 15,
    color: Palette.accent,
    fontFamily: Fonts.bodyBold,
    marginTop: 10,
  },
  offerNote: {
    fontSize: 12,
    color: Palette.muted,
    lineHeight: 19,
    marginTop: 10,
  },
});
