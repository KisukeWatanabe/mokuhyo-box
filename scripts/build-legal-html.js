/**
 * src/lib/legal.ts から、公開用のプライバシーポリシー/利用規約のHTMLを生成する。
 *
 *   npm run build:legal
 *
 * App Store Connect は「誰でも見られる Web 上のプライバシーポリシーURL」を要求する。
 * アプリ内の表示(app/privacy.tsx, app/terms.tsx)と同じ文面を手で書き写すと
 * 片方だけ古くなるので、どちらも legal.ts を唯一の出典にしている。
 * 文面を直したら、このスクリプトを流し直して公開先へ上げること。
 *
 * 出力先: legal-site/(index.html / privacy.html / terms.html)
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/lib/legal.ts");
const OUT_DIR = path.join(ROOT, "legal-site");

/** legal.ts を CommonJS に変換して読み込む(ビルド用の依存を増やさないため) */
function loadLegal() {
  const source = fs.readFileSync(SRC, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function("exports", "module", outputText)(module.exports, module);
  return module.exports;
}

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 段落内の改行は <br> に。メールアドレスはリンクにする */
function renderParagraph(text) {
  const html = escapeHtml(text)
    .replace(/([\w.+-]+@[\w.-]+\.\w+)/g, '<a href="mailto:$1">$1</a>')
    .replace(/\n/g, "<br>");
  return `      <p>${html}</p>`;
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const parts = [`      <h2>${escapeHtml(section.heading)}</h2>`];
      parts.push(...section.paragraphs.map(renderParagraph));
      if (section.bullets?.length) {
        parts.push("      <ul>");
        parts.push(...section.bullets.map((b) => `        <li>${escapeHtml(b)}</li>`));
        parts.push("      </ul>");
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

// アプリ本体と同じ配色(constants/theme.ts の Palette)に合わせている
const STYLE = `    :root {
      --bg: #F3ECDB;
      --card: #FFFDF5;
      --ink: #40372A;
      --ink-soft: #6E6250;
      --muted: #AC9F87;
      --accent: #BC5B37;
      --border: #E5DAC2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 64px;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans",
        "Noto Sans JP", "Yu Gothic", sans-serif;
      line-height: 1.9;
      font-size: 16px;
      -webkit-text-size-adjust: 100%;
    }
    main {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 32px 28px 40px;
    }
    h1 { font-size: 1.6rem; margin: 0 0 4px; }
    h2 { font-size: 1.05rem; margin: 32px 0 8px; color: var(--accent); }
    p { margin: 0 0 12px; }
    ul { margin: 4px 0 16px; padding-left: 1.3em; }
    li { margin-bottom: 4px; }
    a { color: var(--accent); }
    .lead { color: var(--ink-soft); margin-bottom: 8px; }
    .meta { color: var(--muted); font-size: 0.85rem; margin: 0 0 24px; }
    .back { display: inline-block; margin-top: 32px; font-size: 0.9rem; }
    @media (max-width: 480px) {
      body { padding: 16px 12px 48px; }
      main { padding: 24px 18px 32px; border-radius: 14px; }
    }`;

function renderPage({ title, lead, sections, updatedAt, withBackLink }) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | 目標BOX</title>
  <style>
${STYLE}
  </style>
</head>
<body>
  <main>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">最終更新日: ${escapeHtml(updatedAt)}</p>
      <p class="lead">${escapeHtml(lead)}</p>

${renderSections(sections)}
${withBackLink ? '\n      <a class="back" href="./">← 目標BOX のご案内へ戻る</a>' : ""}
  </main>
</body>
</html>
`;
}

function renderIndex({ updatedAt, operator }) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>目標BOX</title>
  <style>
${STYLE}
  </style>
</head>
<body>
  <main>
      <h1>目標BOX</h1>
      <p class="meta">最終更新日: ${escapeHtml(updatedAt)}</p>
      <p class="lead">大きな目標を日々の行動まで分解して管理する iPhone アプリです。</p>

      <h2>各種文書</h2>
      <ul>
        <li><a href="./privacy.html">プライバシーポリシー</a></li>
        <li><a href="./terms.html">利用規約</a></li>
      </ul>

      <h2>お問い合わせ</h2>
      <p>${escapeHtml(operator.name)}<br><a href="mailto:${escapeHtml(
        operator.email,
      )}">${escapeHtml(operator.email)}</a></p>
  </main>
</body>
</html>
`;
}

function main() {
  const legal = loadLegal();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = {
    "privacy.html": renderPage({
      title: "プライバシーポリシー",
      lead: legal.PRIVACY_LEAD,
      sections: legal.PRIVACY_SECTIONS,
      updatedAt: legal.LEGAL_UPDATED_AT,
      withBackLink: true,
    }),
    "terms.html": renderPage({
      title: "利用規約",
      lead: legal.TERMS_LEAD,
      sections: legal.TERMS_SECTIONS,
      updatedAt: legal.LEGAL_UPDATED_AT,
      withBackLink: true,
    }),
    "index.html": renderIndex({
      updatedAt: legal.LEGAL_UPDATED_AT,
      operator: legal.OPERATOR,
    }),
  };

  for (const [name, html] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), html);
    console.log("生成: legal-site/" + name);
  }
  console.log("\n完了。legal-site/ の中身をそのまま公開先へ上げてください。");
}

main();
