// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // dist はビルド成果物、.expo は expo が自動生成する型定義。
    // どちらも手で書かないので lint の対象外。
    ignores: ['dist/**', '.expo/**'],
  },
  {
    // scripts/ 配下はアプリのバンドルには入らない Node の CommonJS スクリプト。
    // Node のグローバルを認識させる。globals パッケージは間接依存でしか
    // 入っていないため、依存を増やさないよう必要なものだけ直接並べている。
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    // テストは jest のグローバル(describe/it/expect/jest)を使う。
    // eslint-config-expo はこれらを宣言しないため、ここで補う。
    files: ['**/__tests__/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      // jest.mock の差し替えは require() で書くのが定石(ホイストの都合)
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
