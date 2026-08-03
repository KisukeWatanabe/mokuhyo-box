/**
 * アプリアイコン / スプラッシュ素材を、1枚の原画から書き出す。
 *
 *   node scripts/build-icons.js      (npm run build:icons)
 *
 * 原画: assets/images/mokuhyo-box-icon.png(2048px, 角丸+透過)
 *
 * 原画をそのまま icon.png にできない理由が2つある:
 *   1. iOS はアイコンに独自の角丸マスクをかけるため、角丸+透過の画像を渡すと
 *      ホーム画面で角に黒い縁が出る。iOS 用は「不透明な正方形」でなければならない。
 *   2. 原画の角には暗い縁のノイズ(α≦11 の半透明ピクセル)が残っている。
 *
 * そこで: 縁のノイズを消す → グリッドを画像の中心に揃える → 用途ごとに書き出す。
 * 原画は変更しないので、絵を描き直したら再実行すればよい。
 *
 * 依存の jimp-compact は Expo が間接的に入れているものを使っている。
 * npm ci の構成次第で消える可能性があるため、無ければ
 * `npm i -D jimp-compact` で入れ直すこと(ビルド時には不要)。
 */
const path = require("path");
const Jimp = require("jimp-compact");

const ROOT = path.join(__dirname, "..");
const IMAGES = path.join(ROOT, "assets", "images");
const SRC = path.join(IMAGES, "mokuhyo-box-icon.png");

/** プレート地色。app.json のスプラッシュ背景色と必ず揃えること */
const PLATE = { r: 247, g: 240, b: 223 };
/** グリッド枠(タン)の色。グリッドの位置検出に使う */
const FRAME = { r: 220, g: 203, b: 161 };

/**
 * 角丸の外側を透明にする(アンチエイリアス付き)。
 * スプラッシュはグリッドだけを背景色の上に浮かせたいので、
 * プレート(台紙)ごと切り落として輪郭を作る。
 */
function roundCorners(img, radius) {
  const { width: w, height: h } = img.bitmap;
  img.scan(0, 0, w, h, function (x, y, idx) {
    // 角の円中心からの距離で、外側だけを削る
    const cx = x < radius ? radius : x > w - 1 - radius ? w - 1 - radius : x;
    const cy = y < radius ? radius : y > h - 1 - radius ? h - 1 - radius : y;
    if (cx === x && cy === y) return; // 角以外は触らない
    const d = Math.hypot(x - cx, y - cy);
    const cover = Math.max(0, Math.min(1, radius - d + 0.5));
    this.bitmap.data[idx + 3] = Math.round(this.bitmap.data[idx + 3] * cover);
  });
  return img;
}

/** 角の暗い縁を落とす。半透明ピクセルは絵ではなくノイズとみなす */
function stripFringe(img, minAlpha = 24) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] < minAlpha) this.bitmap.data[idx + 3] = 0;
  });
  return img;
}

/**
 * グリッド(タン色の枠)の外接矩形。
 * 背景のドット模様を拾わないよう、色の許容差は狭くとる。
 */
function findGridBounds(img) {
  const { width, height } = img.bitmap;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  img.scan(0, 0, width, height, function (x, y, idx) {
    const d = this.bitmap.data;
    if (d[idx + 3] < 250) return;
    if (
      Math.abs(d[idx] - FRAME.r) > 25 ||
      Math.abs(d[idx + 1] - FRAME.g) > 25 ||
      Math.abs(d[idx + 2] - FRAME.b) > 25
    )
      return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

(async () => {
  const src = stripFringe(await Jimp.read(SRC));
  const size = src.bitmap.width;

  const g = findGridBounds(src);
  console.log(
    `グリッド検出: x ${g.minX}–${g.maxX} / y ${g.minY}–${g.maxY} (${g.w}×${g.h})`,
  );

  // グリッドの中心が画像の中心に来るよう平行移動する。
  // 原画はグリッドがわずかに上寄りで、そのままだと丸くマスクされたとき偏って見える。
  const dx = Math.round(size / 2 - (g.minX + g.maxX) / 2);
  const dy = Math.round(size / 2 - (g.minY + g.maxY) / 2);
  console.log(`中心合わせ: dx=${dx} dy=${dy}`);

  const centered = new Jimp(size, size, 0x00000000);
  centered.composite(src, dx, dy);

  // ── 1. iOS/共通アイコン: 不透明な正方形 ────────────────────
  const plate = Jimp.rgbaToInt(PLATE.r, PLATE.g, PLATE.b, 255);
  const icon = new Jimp(size, size, plate).composite(centered, 0, 0);
  await icon.clone().resize(1024, 1024).writeAsync(path.join(IMAGES, "icon.png"));
  console.log("→ icon.png (1024, 不透明)");

  // ── 2. スプラッシュ: グリッドだけを切り抜いて背景を透過にする ──
  // 台紙ごと出すと、フラットな背景色の上に台紙の陰影が四角く浮いて見える。
  // グリッドの輪郭で抜いておけば、マークが背景に直接置かれた見た目になる。
  const grid = centered.clone().crop(g.minX + dx, g.minY + dy, g.w, g.h);
  roundCorners(grid, Math.round(g.w * 0.06)); // 角丸はグリッド枠の見た目に合わせる
  await grid
    .clone()
    .resize(1024, 1024)
    .writeAsync(path.join(IMAGES, "splash-icon.png"));
  console.log("→ splash-icon.png (1024, グリッドのみ・透過)");

  // ── 3. Android アダプティブアイコンの前景 ────────────────
  // 外周はシステムに切り取られるため、グリッドを安全領域(中央62%)に収める。
  const SAFE = 0.62;
  const scaled = grid.clone();
  scaled.resize(Math.round(size * SAFE), Math.round(size * SAFE));
  const fg = new Jimp(size, size, 0x00000000);
  fg.composite(
    scaled,
    Math.round((size - scaled.bitmap.width) / 2),
    Math.round((size - scaled.bitmap.height) / 2),
  );
  await fg
    .resize(1024, 1024)
    .writeAsync(path.join(IMAGES, "android-icon-foreground.png"));
  console.log("→ android-icon-foreground.png (1024, 透過)");

  // ── 4. web favicon ────────────────────────────────
  await icon
    .clone()
    .resize(64, 64)
    .writeAsync(path.join(IMAGES, "favicon.png"));
  console.log("→ favicon.png (64)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
