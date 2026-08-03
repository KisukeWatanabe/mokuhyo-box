import React, { useEffect, useRef } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Palette, Radii } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/** 下からせり上がるボトムシート(ドラッグハンドル付き) */
export function BottomSheet({ visible, onClose, children }: Props) {
  const slide = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
            {
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView
            style={{ maxHeight: height * 0.8 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(64,55,42,0.35)",
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: Radii.xl + 8,
    borderTopRightRadius: Radii.xl + 8,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  scrollContent: { paddingBottom: 4 },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.dashed,
    marginBottom: 14,
  },
});
