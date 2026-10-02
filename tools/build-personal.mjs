// Packs the Personal prototype (personal/) into one file you can send: dist/personal.html.
// Pictures, the W by Frank mark and both fonts go inside it, so it opens offline in any browser.
// Run: node tools/build-personal.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = (f, type) => `data:${type};base64,` + fs.readFileSync(path.join(root, f)).toString('base64');

const html = read('personal/index.html');
const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('<script')).trim();
const head = html.slice(html.indexOf('<head>') + '<head>'.length, html.indexOf('</head>'))
  .replace(/<link rel="(preconnect|stylesheet)"[^>]*>\n?/g, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${dataUri('img/icon-192.png', 'image/png')}" type="image/png">`);

// Frank's two fonts (SIL Open Font License), from the showcase skill
const F = '.claude/skills/frank-showcase/assets/fonts/';
const face = (family, file, weight) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(${dataUri(F + file, 'font/woff2')}) format('woff2')}`;
const fonts = [face('Nunito', 'Nunito-latin.woff2', '200 1000'), face('Gilda Display', 'GildaDisplay-latin.woff2', 400)].join('\n');

const pics = Object.fromEntries(fs.readdirSync(path.join(root, 'personal/img')).filter((f) => f.endsWith('.webp'))
  .map((f) => [f.replace(/\.webp$/, ''), dataUri('personal/img/' + f, 'image/webp')]));
const scripts = ['js/figure.js', 'js/exercises.js', 'personal/data.js', 'personal/personal.js'].map(read).join('\n');
if (/<\/script/i.test(scripts)) throw new Error('a script contains </script>');

const out = `<!doctype html>
<html lang="en">
<head>
${head.trim()}
<style>
${fonts}
${read('personal/personal.css')}
</style>
</head>
<body>
${body}
<script>window.WBF_IMG = ${JSON.stringify(pics)}; window.WBF_MARK = ${JSON.stringify(dataUri('img/brand/w-by-frank-dark.svg', 'image/svg+xml'))};</script>
<script>
${scripts}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/personal.html'), out);
console.log('dist/personal.html', Math.round(out.length / 1024), 'KB');
