/**
 * Babel 設定。
 *
 * Metro(expo start / expo export)は SDK 50 以降、このファイルが無くても
 * 内蔵の既定設定(babel-preset-expo 相当)で動くため、これまで不要だった。
 *
 * 一方 babel-jest は「実在する設定ファイル」を読まないとプリセットを適用しない。
 * そのため jest を動かすにはこのファイルが必須になる。無いと
 *   - RN 同梱の jest セットアップ(Flow 型付き)を解析できず
 *     "Unexpected token, expected ," で全スイートが落ちる
 *   - テストの TypeScript も変換されない
 *
 * 内容は Metro の既定と同じ babel-preset-expo なので、アプリのバンドル結果は変わらない。
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
