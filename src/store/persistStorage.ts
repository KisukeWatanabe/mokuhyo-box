/**
 * 永続化ストレージ(AsyncStorage)。
 *
 * アプリ名を MANDALAWEEK → 目標BOX に変えた際、保存キーも付け替えた。
 * そのままだと旧キーに入っている端末内のデータが読めなくなるので、
 * 新キーが空のときだけ旧キーから一度引き継ぐ。
 *
 * 引き継ぎ後は旧キーを消すため、この処理が走るのは端末につき一度きり。
 * 旧キーを持つ端末が世の中から無くなったら、このファイルごと消してよい。
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

export function createMigratingStorage<T>(legacyKey: string) {
  return createJSONStorage<T>(() => ({
    getItem: async (name) => {
      const current = await AsyncStorage.getItem(name);
      if (current !== null) return current;

      const legacy = await AsyncStorage.getItem(legacyKey);
      if (legacy === null) return null;

      // 旧キーの中身をそのまま新キーへ写す。
      // persist の version も含めて写るので、既存の migrate はそのまま効く。
      await AsyncStorage.setItem(name, legacy);
      await AsyncStorage.removeItem(legacyKey);
      return legacy;
    },
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  }));
}
