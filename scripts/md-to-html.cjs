// scripts/md-to-html.cjs
// Usage : node scripts/md-to-html.cjs README.md StudHub-brief-backend.html
// Convertit MD minimal en HTML autonome + CSS GitHub-like.
const fs = require('fs');
const path = require('path');

const [,, inputFile = 'README.md', outputFile = 'README.html'] = process.argv;

const mdPath = path.resolve(process.cwd(), inputFile);
const outPath = path.resolve(process.cwd(), outputFile);

const md = fs.readFileSync(mdPath, 'utf8');

let html = md
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Fenced code blocks
html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
  const lang = (code.split('\n')[0] || '').trim();
  const body = code.slice(lang.length).replace(/^\n+/, '').replace(/\n+$/, '');
  return `<pre class="code-block"><code class="lang-${lang}">${body}</code></pre>`;
});

// Inline code
html = html.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');

// Headings (lines only)
const lines = html.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const m = l.match(/^(#{1,6})\s+(.+)$/);
  if (m) {
    const lvl = m[1].length;
    const id = m[2].toLowerCase()
      .replace(/&[a-z]+;/g, '')
      .replace(/[^a-z0-9\s-_]/g, '')
      .trim().replace(/\s+/g, '-');
    lines[i] = `<h${lvl} id="${id}">${m[2]}</h${lvl}>`;
  }
}
html = lines.join('\n');

// Blockquotes
html = html.replace(/(^|\n)&gt;\s?([^\n]*)/g, (_m, start, txt) => `${start}<blockquote>${txt}</blockquote>`);
// Merge consecutive blockquotes
html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

// Horizontal rule
html = html.replace(/(^|\n)\s*---\s*(\n|$)/g, '$1<hr>$2');

// Unordered lists (- )
html = html.replace(/(^|\n)((\s*-[^\n]+\n?)+)/g, (_m, start, list) => {
  const items = list.trim().split(/\n/).map(s => s.replace(/^\s*-\s*/, ''));
  return `${start}<ul>${items.map(i => `<li>${inlinePass(i)}</li>`).join('')}</ul>`;
});
// Ordered lists (1. )
html = html.replace(/(^|\n)((\s*\d+\.\s+[^\n]+\n?)+)/g, (_m, start, list) => {
  const items = list.trim().split(/\n/).map(s => s.replace(/^\s*\d+\.\s*/, ''));
  return `${start}<ol>${items.map(i => `<li>${inlinePass(i)}</li>`).join('')}</ol>`;
});

// Tables
html = html.replace(/(^|\n)((\|[^\n]+\|\n)+)/g, (_m, start, table) => {
  const rows = table.trim().split(/\n/).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  if (!rows.length) return start + table;
  if (rows[1] && rows[1].every(c => /^:?-{3,}:?$/.test(c))) {
    const head = rows.shift();
    rows.shift(); // separator
    const ths = head.map(c => `<th>${inlinePass(c)}</th>`).join('');
    const trows = rows.map(r => `<tr>${r.map(c => `<td>${inlinePass(c)}</td>`).join('')}</tr>`).join('');
    return `${start}<table><thead><tr>${ths}</tr></thead><tbody>${trows}</tbody></table>`;
  }
  return start + table;
});

// Paragraphs (lines that don't start with an html block tag or are blank)
const blocks = html.split(/\n{2,}/);
html = blocks.map(b => {
  const t = b.trim();
  if (!t) return '';
  if (/^<(h[1-6]|ul|ol|pre|blockquote|table|hr|p)\b/i.test(t)) return b;
  return `<p>${inlinePass(t.replace(/\n/g, '<br>\n'))}</p>`;
}).join('\n\n');

// Links clickables
function inlinePass(s) {
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[^\("])(https?:\/\/[^\s<)]+)/g, (_m, p, url) => `${p}<a href="${url}" target="_blank" rel="noopener">${url}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
html = inlinePass(html);

const titleMatch = md.match(/^#\s+(.+)$/m);
const title = titleMatch ? titleMatch[1].trim() : 'StudHub - Brief Backend';

const css = `
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  color: #1f2328; background: #ffffff; margin: 0 auto; padding: 48px 56px; max-width: 960px; line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, h5, h6 { color: #1f2328; margin: 1.8em 0 0.7em; line-height: 1.3; border: 0; }
h1 { font-size: 2.1em; margin-top: 0.2em; padding-bottom: 0.4em; border-bottom: 1px solid #d0d7de; }
h2 { font-size: 1.55em; padding-bottom: 0.3em; border-bottom: 1px solid #eaeef2; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.05em; }
p { margin: 0.9em 0; }
a { color: #0969da; text-decoration: none; }
a:hover { text-decoration: underline; }
strong { color: #1f2328; }
em { color: #444; }
blockquote {
  margin: 1.1em 0; padding: 0.6em 1em; border-left: 4px solid #0969da;
  background: #f6f8fa; color: #424a53;
}
code.inline {
  padding: 0.15em 0.4em; margin: 0 2px; border-radius: 6px;
  background: #f6f8fa; color: #cf222e; font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace;
}
pre.code-block {
  background: #0d1117; color: #e6edf3; padding: 16px 18px; border-radius: 10px;
  overflow-x: auto; font-size: 88%; line-height: 1.55;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace;
}
pre.code-block code { background: transparent; color: inherit; padding: 0; }
hr { border: 0; border-top: 1px solid #d0d7de; margin: 2em 0; }
ul, ol { margin: 0.8em 0; padding-left: 1.6em; }
ul ul, ol ul, ul ol, ol ol { margin: 0.3em 0; }
li { margin: 0.3em 0; }
table {
  border-collapse: collapse; width: 100%; margin: 1.2em 0;
  font-size: 95%;
}
th, td { border: 1px solid #d0d7de; padding: 10px 14px; text-align: left; }
thead th { background: #f6f8fa; font-weight: 600; }
tbody tr:nth-child(even) { background: #fcfcfd; }
@media print {
  body { padding: 0 18px; max-width: 100%; font-size: 11pt; color: #000; }
  a { color: #000; text-decoration: none; }
  pre.code-block { background: #f6f8fa !important; color: #1f2328 !important; }
  h1, h2 { break-after: avoid; }
  pre, table, blockquote { break-inside: avoid; }
}
`;

const wrap = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, wrap, 'utf8');
console.log(`✓ HTML généré : ${path.relative(process.cwd(), outPath)} (${(Buffer.byteLength(wrap, 'utf8')/1024).toFixed(1)} KB)`);
