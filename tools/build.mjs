// Packs the app into single files:
//   dist/wellness-by-frank.html  one self-contained page (host it anywhere, or send it)
//   dist/artifact.html           the same app as a page body, for publishing on claude.ai
// Run: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = (f, type) => `data:${type};base64,` + fs.readFileSync(path.join(root, f)).toString('base64');

const images = ['img/wellness-1.jpg', 'img/wellness-2.jpg', 'img/wellness-3.jpg', 'img/wellness-4.jpg'];
const imgMap = Object.fromEntries(images.map((f) => [f, dataUri(f, 'image/jpeg')]));
const scripts = ['js/figure.js', 'js/exercises.js', 'js/programs.js', 'js/science.js', 'js/sound.js', 'js/figure3d.js', 'js/app.js'].map(read).join('\n');
if (/<\/script/i.test(scripts)) throw new Error('a script contains </script>');
const css = read('app.css');
const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('<script')).trim();
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
const imgScript = `<script>window.WBF_IMG = ${JSON.stringify(imgMap)};</script>`;
const icon = dataUri('img/icon-192.png', 'image/png');
// the single-file builds load three.js from jsDelivr (the folder version ships its own copy in vendor/)
const threeVersion = read('vendor/three.module.min.js').match(/REVISION\s*=\s*"(\d+)"|const t="(\d+)"/);
const rev = threeVersion ? (threeVersion[1] || threeVersion[2]) : '170';
const threeLoader = `<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.${rev}.0/build/three.module.min.js';
window.THREE = THREE;
window.dispatchEvent(new Event('wbf-three'));
</script>`;

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Wellness by Frank</title>
<meta name="description" content="Home workouts on Frank's method: a 4-week plan, guided sessions with a moving coach, and the why behind every exercise.">
<meta name="theme-color" content="#012D12">
<meta name="color-scheme" content="dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Frank">
<link rel="icon" href="${icon}">
<link rel="apple-touch-icon" href="${icon}">
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
${imgScript}
<script>
${scripts}
</script>
${threeLoader}
</body>
</html>
`;

const artifact = `<title>Wellness by Frank</title>
${fonts}
<style>
${css}
</style>
${body}
${imgScript}
<script>
${scripts}
</script>
${threeLoader}
`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/wellness-by-frank.html'), standalone);
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('dist/wellness-by-frank.html', kb(standalone));
console.log('dist/artifact.html', kb(artifact));
