// Shared helpers for the frank-showcase scripts: Playwright, a local web server for the repo,
// Frank's fonts served from the skill (no network needed), and the waits that make captures sharp.
const fs = require('fs');
const path = require('path');
const http = require('http');

const SKILL = path.resolve(__dirname, '..');
const REPO = path.resolve(SKILL, '..', '..', '..');          // .claude/skills/frank-showcase -> repo root

function playwright() {
  const tries = ['playwright', path.join(REPO, 'node_modules', 'playwright'), '/opt/node22/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright', '/usr/lib/node_modules/playwright'];
  for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
  try {                                          // last resort: ask npm (quietly: no log files)
    const g = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'], env: Object.assign({}, process.env, { npm_config_logs_max: '0', npm_config_loglevel: 'silent' }) }).toString().trim();
    return require(path.join(g, 'playwright'));
  } catch (e) { /* no npm */ }
  throw new Error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain'
};

// The repo at /, the skill's assets at /__showcase/, on a free port of 127.0.0.1 only.
function serve() {
  const assets = path.join(SKILL, 'assets');
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const base = p.startsWith('/__showcase/') ? assets : REPO;
      let file = path.normalize(path.join(base, p.startsWith('/__showcase/') ? p.slice(12) : p));
      if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
      try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (e) { /* 404 below */ }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + srv.address().port, close: () => srv.close() }));
  });
}

// Software WebGL (same picture on every machine), sRGB colours, smooth text.
async function launch() {
  const { chromium } = playwright();
  return chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb',
           '--font-render-hinting=none', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required']
  });
}

// A browser context that never touches the network: Google Fonts requests get the bundled fonts,
// everything else outside 127.0.0.1 is blocked. init: [[fn, arg], ...] run before the page's scripts.
async function context(browser, base, { width, height, scale = 1, init = [] }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, serviceWorkers: 'block',
                                         locale: 'en-US', colorScheme: 'dark' });
  const css = fs.readFileSync(path.join(SKILL, 'assets', 'fonts', 'fonts.css'), 'utf8')
    .replace(/url\(([^)]+\.woff2)\)/g, (m, f) => 'url(' + base + '/__showcase/fonts/' + f + ')');
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (r) => {
    if (r.request().url().startsWith('https://fonts.googleapis.com/')) {
      return r.fulfill({ contentType: 'text/css', body: css, headers: { 'access-control-allow-origin': '*' } });
    }
    return r.abort();
  });
  for (const [fn, arg] of init) await ctx.addInitScript(fn, arg);
  return ctx;
}

// Wait until a capture is worth taking: fonts in, 3D coach loaded and drawn, images decoded.
async function settle(page, { threeD = true, extra = 300 } = {}) {
  await page.evaluate(async () => {
    await Promise.all(['900 20px Nunito', '400 20px Nunito', '20px "Gilda Display"'].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  });
  const fonts = await page.evaluate(() => document.fonts.check('900 20px Nunito') && document.fonts.check('20px "Gilda Display"'));
  if (!fonts) throw new Error("Frank's fonts did not load, so the capture would use fallback fonts");
  if (threeD) {
    await page.waitForFunction(() => !window.WBF || !WBF.fig3d || WBF.fig3d.ready(), null, { timeout: 180000 });
  }
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter((i) => i.src && !i.hidden).map((i) => (i.decode ? i.decode().catch(() => null) : null)));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(extra);
}

// Every 3D canvas on screen must have drawn something; returns the ones that are blank.
async function blankFigures(page) {
  return page.evaluate(() => [...document.querySelectorAll('canvas.fig3d')].filter((c) => {
    const r = c.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || !c.width) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) return false;
    return true;
  }).map((c) => (c.closest('[data-fig],[data-thumb]') || c).getAttribute('data-fig') || 'figure'));
}

// PNG header: width, height, colour type (2 RGB, 6 RGBA), bit depth
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), depth: b[24], color: b[25], bytes: b.length };
}

function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v != null) out[k] = v;
      else if (argv[i + 1] != null && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

module.exports = { SKILL, REPO, playwright, serve, launch, context, settle, blankFigures, pngInfo, args };
