/**
 * 文字列の描画幅(pt)をざっくり見積もる。
 *
 * iOS は端末の「文字サイズ」設定によって、テキストの実測幅を実際の描画幅より
 * 小さく返すことがある。幅が内容ぴったりに決まる要素(ピル型のボタンやバッジ)は
 * その分だけ枠が足りず、最後の1文字が切れてしまう。
 * 自前で見積もった幅を minWidth に渡して、確実に収まるようにするためのもの。
 *
 * 全角=1em / 半角=0.5em の粗い近似。丸め誤差ぶんの余白を少し上乗せしている。
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // ASCII/ラテン1(0x20-0xFF)と半角カナ(0xFF61-0xFF9F)は半角、それ以外は全角とみなす
    const halfWidth =
      (code >= 0x20 && code <= 0xff) || (code >= 0xff61 && code <= 0xff9f);
    em += halfWidth ? 0.5 : 1;
  }
  return Math.ceil(em * fontSize) + 2;
}
