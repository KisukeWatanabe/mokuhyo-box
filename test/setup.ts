/**
 * 全テスト共通の前処理。
 */

// AsyncStorage はネイティブモジュールなので、パッケージ同梱の公式モックへ差し替える。
// これが無いと persist を使うストアを import した時点で落ちる。
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// 各テストが仕込んだ偽時刻・モックを次のテストへ持ち越さない
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});
