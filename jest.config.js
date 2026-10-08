/**
 * jest 設定(ロジック層のテスト)。
 *
 * jest-expo のプリセットを使う理由:
 *  - ストアは AsyncStorage(ネイティブモジュール)に依存しているため、
 *    素の jest では import した時点で落ちる。
 *  - React Native のモジュール解決(.ios.ts などの platform extension)が必要。
 *
 * "jest-expo/ios" を指定しているのは、素の "jest-expo" が ios/android/web の
 * マルチプロジェクト構成で、同じテストが3回走り、かつこのファイルの設定
 * (setupFilesAfterEnv 等)が効かなくなるため。このアプリは iOS 単体が対象
 * (CLAUDE.md 2章)なので ios だけでよい。
 */
const path = require("path");

/**
 * expo-modules-core の実体を探す。
 *
 * npm の構成次第でこのパッケージはトップレベルに上がらず
 * node_modules/expo/node_modules/ の下にネストされる。すると
 * jest-expo の preset(node_modules/jest-expo/src/preset/setup.js)から
 * require できず "Cannot find module 'expo-modules-core'" で全スイートが落ちる。
 * jest-expo 自身のコードにも "invalid dependency chain" と注記がある既知の弱点。
 *
 * expo の位置を起点に解決することで、ネストでもホイスト後でも同じように当たる。
 */
const expoModulesCore = path
  .dirname(
    require.resolve("expo-modules-core/package.json", {
      paths: [path.dirname(require.resolve("expo/package.json"))],
    }),
  )
  // moduleNameMapper の置換文字列に Windows の "\" が入ると壊れるため
  .replace(/\\/g, "/");

module.exports = {
  preset: "jest-expo/ios",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],

  // ロジック層のみを対象にする。画面描画(app/ と components/)は現時点では対象外。
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],

  moduleNameMapper: {
    // tsconfig の paths と揃える
    "^@/(.*)$": "<rootDir>/$1",
    "^expo-modules-core$": expoModulesCore,
    "^expo-modules-core/(.*)$": `${expoModulesCore}/$1`,
  },

  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/store/**/*.ts",
    "!src/**/__tests__/**",
  ],
};
