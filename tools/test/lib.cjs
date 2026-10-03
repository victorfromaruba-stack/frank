// Shared helpers for the app's test suites (tools/test/*.cjs). How to use them: .claude/skills/frank-qa/SKILL.md.
// One Chromium for the whole run (software WebGL, so every machine draws the same), a small web server for the repo,
// a fixed clock, sped-up workout timers, seeded localStorage, and the checks every screen gets.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..', '..');
const KEY = 'wbf.v1';                                     // everything a person enters (js/app.js)
const TODAY = '2026-10-14';                               // the tests' date: a Wednesday, before the clocks change
const NOW = Date.parse(TODAY + 'T09:00:00+02:00');        // 09:00 in The Hague
const TZ = 'Europe/Amsterdam';

// ---- Playwright ---------------------------------------------------------------------------------------------
function playwright() {
  const tries = ['playwright', path.join(REPO, 'node_modules', 'playwright'), '/opt/node22/lib/node_modules/playwright',
    '/usr/local/lib/node_modules_global/playwright', '/usr/local/lib/node_modules/playwright', '/usr/lib/node_modules/playwright'];
  for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
  try {
    const g = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'],
      env: Object.assign({}, process.env, { npm_config_logs_max: '0', npm_config_loglevel: 'silent' }) }).toString().trim();
    return require(path.join(g, 'playwright'));
  } catch (e) { /* no npm */ }
  throw new Error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
}

// Software WebGL: slow, but the same picture everywhere and no GPU needed.
async function launch() {
  const { chromium } = playwright();
  return chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb',
      '--font-render-hinting=none', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
}

// ---- a web server for the repo ----------------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain'
};
// prefix '' serves the repo at /, '/frank/' serves it the way GitHub Pages does. cache: the Cache-Control header
// (Pages sends max-age=600). etag: an ETag on every file, and 304 when a browser's copy still matches (Pages does it).
// overlay: { 'path/in/repo': text } replaces files, to play a new deploy.
// Every request is listed in .hits ({ url, status }), every 404 in .missing. stop() takes the server off the network
// like a phone without signal (Playwright's setOffline doesn't reach the service worker; this does), start() puts it
// back at the same address.
function serve({ prefix = '', cache = 'no-store', etag = false } = {}) {
  const missing = [], overlay = {}, hits = [];
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const hit = { url: req.url, status: 0 };
      hits.push(hit);
      res.on('finish', () => { hit.status = res.statusCode; });
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (prefix) {
        if (p === prefix.replace(/\/$/, '')) { res.writeHead(301, { location: prefix }); res.end(); return; }
        if (!p.startsWith(prefix)) { missing.push(p); res.writeHead(404); res.end('not found'); return; }
        p = '/' + p.slice(prefix.length);
      }
      if (p.split('/').some((s) => s.startsWith('.') && s.length > 1)) { res.writeHead(404); res.end(); return; }   // .git and friends
      let file = path.normalize(path.join(REPO, p));
      if (file !== REPO && !file.startsWith(REPO + path.sep)) { res.writeHead(403); res.end(); return; }
      try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (e) { /* 404 below */ }
      const rel = path.relative(REPO, file).split(path.sep).join('/');
      const send = (data) => {
        const head = { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': cache };
        if (etag) {
          head.etag = '"' + require('crypto').createHash('sha1').update(data).digest('hex').slice(0, 20) + '"';
          if (req.headers['if-none-match'] === head.etag) { res.writeHead(304, head); res.end(); return; }
        }
        res.writeHead(200, head);
        res.end(data);
      };
      if (overlay[rel] != null) { send(overlay[rel]); return; }
      fs.readFile(file, (err, data) => {
        if (err) { missing.push(p); res.writeHead(404); res.end('not found'); return; }
        send(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port, url = 'http://127.0.0.1:' + port;
      resolve({ url, home: url + (prefix || '/'), missing, overlay, hits,
        stop: () => new Promise((r) => { srv.close(() => r()); if (srv.closeAllConnections) srv.closeAllConnections(); }),
        start: () => new Promise((r, j) => { srv.once('error', j); srv.listen(port, '127.0.0.1', () => { srv.off('error', j); r(); }); }),
        close: () => new Promise((r) => { if (srv.closeAllConnections) srv.closeAllConnections(); srv.close(() => r()); }) });
    });
  });
}

// ---- a real website, through Node ----------------------------------------------------------------------------------
// The published site (live suite). Chromium in a sandbox may not trust the sandbox's proxy certificate, and TLS checks
// stay on, so pages fetch through Node's fetch (which reads NODE_EXTRA_CA_CERTS). Same answers, any machine.
const SITE = (process.env.FRANK_QA_SITE || 'https://victorfromaruba-stack.github.io/frank/').replace(/\/?$/, '/');
const fetched = new Map();                                   // url -> { status, headers, body }: the 1 MB coaches once per run
async function fetchSite(url, { method = 'GET', headers = {}, fresh = false } = {}) {
  const key = method + ' ' + url;
  if (!fresh && fetched.has(key)) return fetched.get(key);
  const res = await fetch(url, { method, headers, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  const out = { status: res.status, headers: {}, body: Buffer.from(await res.arrayBuffer()) };
  res.headers.forEach((v, k) => { out.headers[k] = v; });
  if (method === 'GET' && res.status < 500) fetched.set(key, out);
  return out;
}
// a Playwright route handler: requests inside `base` go out through Node, the rest are blocked (and listed by t.page)
function viaNode(base) {
  return async (route) => {
    const req = route.request(), url = req.url();
    if (!url.startsWith(base) || !['GET', 'HEAD'].includes(req.method())) return route.abort('blockedbyclient');
    try {
      const keep = {};
      for (const [k, v] of Object.entries(req.headers())) if (/^(accept|accept-language|range)$/i.test(k)) keep[k] = v;
      const r = await fetchSite(url, { method: req.method(), headers: keep, fresh: !!keep.range });
      const headers = {};
      for (const [k, v] of Object.entries(r.headers)) if (!/^(content-encoding|content-length|transfer-encoding|connection|keep-alive)$/i.test(k)) headers[k] = v;
      await route.fulfill({ status: r.status, headers, body: r.body });
    } catch (e) { await route.abort('internetdisconnected').catch(() => null); }
  };
}

// ---- what runs in the page before the app ------------------------------------------------------------------------
// o.state: seeded into localStorage once per browser context (a reload keeps what the app saved since).
// o.now: the clock starts there and keeps ticking. o.speed: performance.now runs that many times faster and the app's
// 200 ms workout tick fires every 20 ms, so a 30 s timer takes 0.6 s at speed 50 (window.__qa.speed(n) changes it).
function pageInit(o) {
  window.__qa = { speed: function () {}, toasts: [] };
  // every toast the app shows (they fade after 2.4 s, often before a check can read them)
  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('toast');
    if (el) new MutationObserver(function () { if (el.textContent) window.__qa.toasts.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  if (o.seed) {
    try {
      if (!localStorage.getItem('wbf.qa.seeded')) {
        localStorage.setItem('wbf.qa.seeded', '1');
        if (o.state) localStorage.setItem(o.key, JSON.stringify(o.state));
      }
    } catch (e) { /* storage blocked */ }
  }
  if (o.now) {
    const Real = Date, off = o.now - Real.now();
    class QADate extends Real {
      constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); }
      static now() { return Real.now() + off; }
    }
    window.Date = QADate;
  }
  if (o.speed) {
    const pn = performance.now.bind(performance);
    let base = pn(), fake = base, k = o.speed;
    performance.now = function () { return fake + (pn() - base) * k; };
    const si = window.setInterval;
    window.setInterval = function (f, ms, ...r) { return si.call(window, f, ms >= 100 ? Math.max(10, ms / 10) : ms, ...r); };
    window.__qa.speed = function (n) { fake = performance.now(); base = pn(); k = n; };
  }
}

// ---- waits and checks -------------------------------------------------------------------------------------------
// Fonts in, the 3D coach loaded (or failed), images decoded, two frames drawn.
async function settle(page, { threeD = true, extra = 250 } = {}) {
  await page.evaluate(async () => {
    await Promise.all(['900 20px Nunito', '400 20px Nunito', '20px "Gilda Display"'].map((f) => document.fonts.load(f).catch(() => null)));
    await document.fonts.ready;
  });
  if (threeD) {
    await page.waitForFunction(() => !window.WBF || !WBF.fig3d || WBF.fig3d.ready(), null, { timeout: 90000 })
      .catch(() => { throw new Error('the 3D coach did not load within 90 s (WebGL or assets/coach-*.glb?)'); });
  }
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter((i) => i.src && !i.hidden).map((i) => (i.decode ? i.decode().catch(() => null) : null)));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  if (extra) await page.waitForTimeout(extra);
}

// 3D canvases on screen that drew nothing
async function blankFigures(page) {
  return page.evaluate(() => [...document.querySelectorAll('canvas.fig3d')].filter((c) => {
    const r = c.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || !c.width || c.closest('[hidden]')) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) return false;
    return true;
  }).map((c) => { const h = c.closest('[data-fig],[data-thumb]'); return h ? (h.getAttribute('data-fig') || h.getAttribute('data-thumb')) : 'figure'; }));
}

// ---- accessibility: what someone with low vision, a screen reader or big fingers needs (WCAG 2.2 AA) -----------------
// Runs in the page. While a sheet or a box is open (#overlay), only what is on it counts: the rest is behind its scrim.
//  contrast: every piece of text at least 4.5:1 against what is behind it, 3:1 when large (24 px, or 18.66 px bold).
//    The background is worked out from the element and its parents: colours, see-through layers, opacity, and a
//    gradient's colour at the text's own spot. Disabled controls and text without a letter or a digit don't count.
//  targets: every control at least 24 x 24 px (links inside running text excepted, WCAG 2.5.8 without its spacing
//    exception); a choice (aria-pressed, aria-checked, a switch, a checkbox) at least 44 px tall, like the onboarding's
//    Yes and No.
//  markup: no control inside another control, and aria-pressed, aria-checked or aria-selected only on roles that take them.
function a11yScan() {
  const CONTROL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="slider"], [role="tab"], [role="option"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
  const open = document.querySelector('#overlay:not([hidden])');
  const counts = (el) => !el.closest('[inert]') && (!open || open.contains(el));
  const seen = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true });
  const say = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim();
    return t ? '"' + t.slice(0, 32) + '"' : '<' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? ' class="' + el.className + '"' : '') + '>';
  };
  // ---- colours
  const rgba = (s) => {
    const m = /rgba?\(([^)]*)\)/.exec(s || '');
    if (!m) return null;
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const mix = (x, y, k) => ({ r: x.r * k + y.r * (1 - k), g: x.g * k + y.g * (1 - k), b: x.b * k + y.b * (1 - k), a: 1 });
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  // commas outside brackets
  const split = (s) => {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  // A gradient's colour at the point (x, y), from its computed value. null: not a gradient (a picture: can't tell)
  function gradientAt(layer, box, x, y) {
    const m = /^(?:repeating-)?(linear|radial)-gradient\((.*)\)$/.exec(layer);
    if (!m) return null;
    const args = split(m[2]);
    let t, len;
    if (m[1] === 'linear') {
      let ang = 180;
      const a = /^(-?[\d.]+)(deg|turn|rad)$/.exec(args[0]);
      const TO = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 };     // a corner: as 'to bottom'
      if (a) { ang = +a[1] * (a[2] === 'turn' ? 360 : a[2] === 'rad' ? 180 / Math.PI : 1); args.shift(); } else if (/^to /.test(args[0])) {
        const w = args.shift();
        if (TO[w] != null) ang = TO[w];
      }
      const th = ang * Math.PI / 180, dx = Math.sin(th), dy = -Math.cos(th);
      len = Math.abs(box.width * dx) + Math.abs(box.height * dy) || 1;
      t = ((x - box.left - box.width / 2) * dx + (y - box.top - box.height / 2) * dy) / len + 0.5;
    } else {
      // "<rx> <ry> at <x> <y>" (the studio light behind the coach); other shapes: as far as the farthest corner
      let cx = box.left + box.width / 2, cy = box.top + box.height / 2, rx = 0, ry = 0;
      if (!rgba(args[0])) {
        const shape = args.shift(), at = shape.split(' at ');
        const size = (at[0] || '').trim().split(/\s+/), pos = (at[1] || '').trim().split(/\s+/);
        const px = (v, full) => (/%$/.test(v) ? parseFloat(v) / 100 * full : parseFloat(v));
        if (pos.length === 2) { cx = box.left + px(pos[0], box.width); cy = box.top + px(pos[1], box.height); }
        if (size.length === 2 && !isNaN(parseFloat(size[0]))) { rx = px(size[0], box.width); ry = px(size[1], box.height); }
      }
      if (!rx || !ry) {
        rx = Math.max(cx - box.left, box.right - cx) * Math.SQRT2;
        ry = Math.max(cy - box.top, box.bottom - cy) * Math.SQRT2;
      }
      len = rx;
      t = Math.hypot((x - cx) / rx, (y - cy) / ry);
    }
    // colour stops: "rgb(..) 40%", "rgba(..) 22px", "rgb(..)" or "rgb(..) 0px 18%"
    const stops = [];
    for (const s of args) {
      const c = rgba(s);
      if (!c) continue;
      const at = s.slice(s.lastIndexOf(')') + 1).trim().split(/\s+/).filter(Boolean)
        .map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : parseFloat(v) / len));
      if (!at.length) stops.push({ c, p: null });
      for (const p of at) stops.push({ c, p });
    }
    if (!stops.length) return null;
    if (stops[0].p == null) stops[0].p = 0;
    if (stops[stops.length - 1].p == null) stops[stops.length - 1].p = 1;
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].p == null) {
        let j = i; while (stops[j].p == null) j++;
        for (let k = i; k < j; k++) stops[k].p = stops[i - 1].p + (stops[j].p - stops[i - 1].p) * (k - i + 1) / (j - i + 1);
      }
      stops[i].p = Math.max(stops[i].p, stops[i - 1].p);
    }
    if (t <= stops[0].p) return stops[0].c;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].p) {
        const a = stops[i - 1], b = stops[i], f = b.p > a.p ? (t - a.p) / (b.p - a.p) : 1, al = a.c.a * (1 - f) + b.c.a * f;
        if (!al) return { r: 0, g: 0, b: 0, a: 0 };
        const ch = (k) => (a.c[k] * a.c.a * (1 - f) + b.c[k] * b.c.a * f) / al;
        return { r: ch('r'), g: ch('g'), b: ch('b'), a: al };
      }
    }
    return stops[stops.length - 1].c;
  }
  // The text's colour and the colour behind it at (x, y): every background from the page down to the element, and the
  // opacity of each group it sits in. null: a picture behind it
  const style = new Map();
  const cs = (el) => { if (!style.has(el)) style.set(el, getComputedStyle(el)); return style.get(el); };
  function colours(el, fg, x, y) {
    const chain = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) chain.unshift(e);
    let c = { r: 255, g: 255, b: 255, a: 1 };
    const fades = [];
    for (const e of chain) {
      const s = cs(e), o = parseFloat(s.opacity);
      if (o < 1) fades.push([o, c]);
      const bg = rgba(s.backgroundColor);
      if (bg && bg.a) c = over(bg, c);
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        const box = e.getBoundingClientRect(), layers = split(s.backgroundImage).reverse();
        for (const l of layers) {
          const g = gradientAt(l, box, x, y);
          if (!g) return null;
          c = over(g, c);
        }
      }
    }
    let text = over(fg, c), back = c;
    for (let k = fades.length - 1; k >= 0; k--) { text = mix(text, fades[k][1], fades[k][0]); back = mix(back, fades[k][1], fades[k][0]); }
    return { text, back };
  }
  // text that is fading or sliding in or out (a toast leaving, a sheet coming up) counts once it has settled
  const moving = new Set(document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target).map((a) => a.effect.target));
  const settled = (el) => { for (let e = el; e; e = e.parentElement) if (moving.has(e)) return false; return true; };
  const contrast = new Map();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || !/[\p{L}\p{N}]/u.test(n.nodeValue) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
    if (!counts(el) || !seen(el) || !settled(el) || el.closest('button:disabled, input:disabled, select:disabled, fieldset:disabled, [aria-disabled="true"]')) continue;
    let clipped = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = cs(e), r = e.getBoundingClientRect();
      if ((s.clip && s.clip !== 'auto') || (s.overflow !== 'visible' && (r.width <= 1 || r.height <= 1))) { clipped = true; break; }
    }
    if (clipped) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (!rects.length) continue;
    const s = cs(el), svg = el instanceof SVGElement;
    const fg = rgba(svg ? s.fill : s.color);
    if (!fg) continue;
    if (svg) fg.a *= parseFloat(s.fillOpacity || '1');
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && (parseInt(s.fontWeight, 10) || 400) >= 700);
    const need = large ? 3 : 4.5;
    let worst = null;
    for (const r of rects) {
      const y = r.top + r.height / 2;
      for (const x of [r.left + 2, r.left + r.width / 2, r.right - 2]) {
        const c = colours(el, fg, x, y);
        if (!c) { worst = null; break; }
        const k = ratio(c.text, c.back);
        if (!worst || k < worst.k) worst = { k, c };
      }
      if (!worst) break;
    }
    if (!worst || worst.k >= need) continue;
    const key = hex(worst.c.text) + ' on ' + hex(worst.c.back) + ', ' + need + ' needed';
    if (!contrast.has(key)) contrast.set(key, { k: worst.k, texts: [] });
    const g = contrast.get(key);
    g.k = Math.min(g.k, worst.k);
    const words = n.nodeValue.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (g.texts.length < 2 && !g.texts.includes(words)) g.texts.push(words);
  }
  // ---- controls
  const small = [], low = [], nested = [], states = [];
  const ROLES = { 'aria-pressed': /^button$/, 'aria-checked': /^(checkbox|switch|radio|menuitemcheckbox|menuitemradio|option|treeitem)$/, 'aria-selected': /^(tab|option|row|gridcell|treeitem|columnheader|rowheader)$/ };
  const roleOf = (el) => el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : el.tagName === 'A' && el.hasAttribute('href') ? 'link' : el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase());
  for (const el of document.querySelectorAll(CONTROL)) {
    if (!counts(el) || !seen(el)) continue;
    const inner = el.querySelector(CONTROL);
    if (inner && seen(inner)) nested.push(say(el) + ' holds ' + say(inner));
    for (const a in ROLES) if (el.hasAttribute(a) && !ROLES[a].test(roleOf(el))) states.push(a + ' on a ' + roleOf(el) + ' ' + say(el));
    if (el.disabled) continue;
    let r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // an input's label is part of its target: tapping the label ticks the box
    for (const lb of el.labels || []) {
      const q = lb.getBoundingClientRect();
      if (q.width <= 1 || q.height <= 1) continue;               // a label only screen readers get
      const left = Math.min(r.left, q.left), top = Math.min(r.top, q.top), right = Math.max(r.right, q.right), bottom = Math.max(r.bottom, q.bottom);
      r = { left, top, right, bottom, width: right - left, height: bottom - top };
    }
    // a link in running text: its size follows the lines of text around it
    if (el.tagName === 'A' && (cs(el).display === 'inline' || [...el.parentElement.childNodes].some((x) => x.nodeType === 3 && x.nodeValue.trim()))) continue;
    if (r.width < 24 || r.height < 24) small.push(say(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    const choice = el.hasAttribute('aria-pressed') || el.hasAttribute('aria-checked') || /^(switch|checkbox|radio)$/.test(el.getAttribute('role') || '') ||
      (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type));
    if (choice && r.height < 44) low.push(say(el) + ' ' + Math.round(r.height) + ' px');
  }
  const list = (a, n = 4) => [...new Set(a)].slice(0, n).join(', ') + (new Set(a).size > n ? ' (+' + (new Set(a).size - n) + ' more)' : '');
  const out = [];
  if (contrast.size) out.push('low contrast: ' + [...contrast].slice(0, 5).map(([k, g]) => g.texts.map((x) => '"' + x + '"').join(', ') + ' ' + g.k.toFixed(2) + ':1 (' + k + ')').join('; ') + (contrast.size > 5 ? ' (+' + (contrast.size - 5) + ' more)' : ''));
  if (small.length) out.push('tap targets under 24 x 24 px: ' + list(small));
  if (low.length) out.push('choice buttons under 44 px tall: ' + list(low));
  if (nested.length) out.push('a control inside a control: ' + list(nested, 3));
  if (states.length) out.push('ARIA states on roles that do not take them: ' + list(states, 3));
  return out;
}
// Controls, dialogs and pictures without a name a screen reader can say, from Chromium's own accessibility tree
async function nameProblems(page) {
  let cdp;
  try { cdp = await page.context().newCDPSession(page); } catch (e) { return []; }      // not Chromium
  try {
    const NEED = new Set(['button', 'link', 'checkbox', 'switch', 'radio', 'slider', 'spinbutton', 'textbox', 'searchbox', 'combobox', 'listbox',
      'tab', 'menuitem', 'option', 'dialog', 'alertdialog', 'image', 'img', 'progressbar', 'meter']);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const bad = [];
    for (const n of nodes) {
      const role = n.role && n.role.value;
      if (n.ignored || !NEED.has(role) || (n.name && String(n.name.value || '').trim())) continue;
      let what = role;
      if (n.backendDOMNodeId) {
        const d = await cdp.send('DOM.describeNode', { backendNodeId: n.backendDOMNodeId, depth: 0 }).catch(() => null);
        if (d && d.node) {
          const at = {};
          for (let i = 0; i < (d.node.attributes || []).length; i += 2) at[d.node.attributes[i]] = d.node.attributes[i + 1];
          what = role + ' <' + d.node.localName + Object.keys(at).filter((k) => /^(class|data-act|data-k|data-v|id|role)$/.test(k)).map((k) => ' ' + k + '="' + at[k] + '"').join('') + '>';
        }
      }
      bad.push(what);
    }
    const u = [...new Set(bad)];
    return u.length ? ['without an accessible name: ' + u.slice(0, 4).join(', ') + (u.length > 4 ? ' (+' + (u.length - 4) + ' more)' : '')] : [];
  } catch (e) {
    return ['accessible names could not be read: ' + short(e)];
  } finally {
    await cdp.detach().catch(() => null);
  }
}

// What every screen must get right. Returns the list of problems (empty when fine).
async function screenProblems(page, { kcal = true, figures = true } = {}) {
  const out = [];
  const r = await page.evaluate((checkKcal) => {
    const res = { overflow: document.documentElement.scrollWidth - innerWidth, shot: !!window.WBF_SHOT, kcal: [], broken: [], fonts: true, maps: 0 };
    res.fonts = document.fonts.check('900 20px Nunito') && document.fonts.check('20px "Gilda Display"');
    res.broken = [...document.images].filter((i) => !i.hidden && i.complete && i.getAttribute('src') && !i.naturalWidth).map((i) => i.getAttribute('src').slice(0, 60));
    // the coach draws the muscle maps: once it is in, a map still hidden or empty is one that never showed
    if (window.WBF && WBF.fig3d && WBF.fig3d.ready()) res.maps = [...document.querySelectorAll('img[data-map]')].filter((i) => i.hidden || !i.getAttribute('src')).length;
    if (checkKcal) {
      // calories are estimates: every kcal on screen needs "est." in the same line or the box around it
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const t = n.nodeValue;
        if (!/kcal/i.test(t) || !(/\d\s*kcal/i.test(t) || /^\s*kcal/i.test(t))) continue;
        let el = n.parentElement, ok = false;
        for (let k = 0; k < 4 && el && !ok; k++, el = el.parentElement) ok = /\best\b/i.test(el.textContent);
        if (!ok && n.parentElement && n.parentElement.offsetParent !== null) res.kcal.push(t.trim().slice(0, 60));
      }
    }
    return res;
  }, kcal);
  if (r.overflow > 1) out.push('sideways scroll: the page is ' + r.overflow + ' px wider than the screen');
  if (r.shot) out.push('screenshot mode (WBF_SHOT) is on in normal use');
  if (!r.fonts) out.push("Frank's fonts (Nunito, Gilda Display) did not load");
  if (r.broken.length) out.push('broken images: ' + r.broken.join(', '));
  if (r.maps) out.push('muscle maps not shown though the 3D coach is in: ' + r.maps);
  if (r.kcal.length) out.push('calories without "est.": ' + r.kcal.join(' | '));
  if (figures) {
    const blank = await blankFigures(page);
    if (blank.length) out.push('blank 3D coach: ' + blank.join(', '));
  }
  out.push(...await page.evaluate(a11yScan), ...await nameProblems(page));
  return out;
}

// ---- data the tests seed --------------------------------------------------------------------------------------------
function isoDay(offsetDays = 0, from = TODAY) {
  const d = new Date(from + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function profile(over) {
  return Object.assign({ goal: 'fit', focus: ['abs'], want: [], sex: 'm', birthYear: 1990, cm: 180, kg: 80, targetKg: 78, health: {}, injuries: [],
    active: 1, push: 2, level: 'i', days: 3, minutes: 20, kit: ['chair', 'table'], name: 'Sam', start: TODAY, round: 1 }, over || {});
}
// a whole saved state: { profile, access, ... } merged over an empty one
function state(over) {
  return Object.assign({ v: 2, profile: null, access: null, settings: { sound: false, voice: false, vibrate: false, rest: 0, ready: 15, units: 'kg', hunits: 'cm' },
    adjust: 1, swaps: {}, done: {}, sessions: [], weights: [], food: {}, flags: null, inbox: [], inboxDone: {}, coach: { templates: [] }, walks: {} }, over || {});
}
const member = (pOver, over) => state(Object.assign({ profile: profile(pOver), access: { paid: true } }, over || {}));
// a session Frank writes in Coach tools (see cleanSpec in js/app.js)
function spec(over) {
  return Object.assign({ i: 'qa1', t: 'Test session', n: 'Slow on the way down.', c: 'Sam', r: 1, f: 'c', rs: 15, w: 0, k: 0,
    x: [['squat', 3], ['plank', 10]], d: TODAY }, over || {});
}
// A client code that exists only in tests: its hash goes into FRANK.codes in the page (app.addCode), so no real
// client's code is ever written in this public repo. Typed with capitals and spaces, it must still work.
const QA_CODE = 'qatest7';
// The same for Frank's coach code, which opens Coach tools: its hash goes into FRANK.coachCodes in the page
// (app.addCoachCode), so Frank's real coach code is never written here either.
const QA_COACH = 'qa-coach-only-7';
const codeHash = (code, prefix = 'wbf:') => require('crypto').createHash('sha256').update(prefix + String(code).trim().toLowerCase().replace(/\s+/g, '')).digest('hex');
const coachHash = (code) => codeHash(code, 'wbf-coach:');
const pack = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const unpack = (code) => JSON.parse(Buffer.from(code, 'base64url').toString('utf8'));

// ---- the run: one browser, servers, output folders, problems -----------------------------------------------------------
class Env {
  constructor(opts) {
    this.opts = opts;
    this.out = opts.out;
    this._servers = {};
  }
  async browser() {
    if (this._browser && !this._browser.isConnected()) this._browser = null;    // crashed (out of memory?): start again
    if (!this._browser) this._browser = await launch();
    return this._browser;
  }
  async server(prefix = '') {
    if (!this._servers[prefix]) this._servers[prefix] = await serve({ prefix });
    return this._servers[prefix];
  }
  async close() {
    for (const s of Object.values(this._servers)) await s.close();
    this._servers = {};
    if (this._browser) { await this._browser.close().catch(() => null); this._browser = null; }
  }
}

function short(e) {
  const m = String((e && e.message) || e).split('\n').filter((l) => l.trim() && !/^\s*(at |=====|Call log)/.test(l));
  return m.slice(0, 2).join(' ').replace(/\s+/g, ' ').slice(0, 300);
}

// What a suite gets as `t`.
class Test {
  constructor(suite, env) {
    this.suite = suite;
    this.env = env;
    this.problems = [];
    this.notes = [];
    this.where = '';
    this.out = path.join(env.out, suite.name);
    this.contexts = [];
    this.lastPage = null;
    this.shots = [];
  }
  get opts() { return this.env.opts; }
  fail(msg) { this.problems.push((this.where ? this.where + ': ' : '') + msg); return false; }
  check(ok, msg) { if (!ok) this.fail(typeof msg === 'function' ? msg() : msg); return !!ok; }
  equal(got, want, what) {
    return this.check(JSON.stringify(got) === JSON.stringify(want), () => what + ': got ' + JSON.stringify(got) + ', expected ' + JSON.stringify(want));
  }
  near(got, want, tol, what) { return this.check(typeof got === 'number' && Math.abs(got - want) <= tol, () => what + ': got ' + got + ', expected ' + want + ' ± ' + tol); }
  // text checks ignore case: innerText follows the CSS, and many labels are set in capitals
  has(text, want, what) {
    const ok = want instanceof RegExp ? want.test(text) : String(text).toLowerCase().includes(String(want).toLowerCase());
    return this.check(ok, () => (what || 'text') + ' is missing ' + want + ' (found: "' + String(text).replace(/\s+/g, ' ').slice(0, 160) + '")');
  }
  lacks(text, bad, what) {
    const hit = bad instanceof RegExp ? bad.test(text) : String(text).toLowerCase().includes(String(bad).toLowerCase());
    return this.check(!hit, () => (what || 'text') + ' should not show ' + bad);
  }
  note(msg) { this.notes.push(msg); }
  log(msg) { if (this.opts.verbose) console.log('      ' + msg); }

  // A part of the suite that can fail on its own: an error stops this flow, records it with a screenshot,
  // and the suite goes on with the next flow. Pages opened inside are closed at the end.
  async flow(label, fn) {
    const before = this.contexts.length;
    this.where = label;
    this.log('» ' + label);
    try { await fn(); } catch (e) {
      let pic = '';
      if (this.lastPage && !this.lastPage.isClosed()) {
        try { fs.mkdirSync(this.out, { recursive: true }); pic = path.join(this.out, 'FAILED-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'); await this.lastPage.screenshot({ path: pic }); } catch (er) { pic = ''; }
      }
      this.fail('stopped: ' + short(e) + (pic ? ' (screen: ' + pic + ')' : ''));
    } finally {
      const opened = this.contexts.splice(before);
      for (const c of opened) await c.close().catch(() => null);
      this.where = '';
    }
  }
  step(label) { this.where = this.where.split(' › ')[0] + ' › ' + label; this.log(label); }

  // A fresh phone-sized browser context with one page. Records page errors, console errors, 404s and anything
  // the app tries to load from another site. Options: state (seeded once), url (path under the server, default
  // index.html), hash, width, height, scale, now (false: real clock), speed, prefix ('/frank/'), sw (allow the
  // service worker; then other sites are watched, not blocked), server (one from serve(), e.g. with Pages' caching),
  // site (a published copy such as L.SITE instead of the local server: fetched through Node, see viaNode),
  // href (open this URL), threeD (false: don't wait for the coach), go (false: don't open the page yet).
  async page(o = {}) {
    const env = this.env;
    const srv = o.site ? { url: o.site, home: o.site } : (o.server || await env.server(o.prefix || ''));
    const browser = await env.browser();
    const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 844 }, deviceScaleFactor: o.scale || this.opts.scale || 1,
      serviceWorkers: o.sw && !o.site ? 'allow' : 'block', locale: 'en-GB', timezoneId: TZ, colorScheme: 'dark' });
    this.contexts.push(ctx);
    const local = srv.url;
    const outside = new Set();
    ctx.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(local) && !/^(data|blob|about):/.test(u)) outside.add(u.slice(0, 120));
    });
    if (o.site) await ctx.route('**/*', viaNode(o.site));
    else if (!o.sw) await ctx.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (r) => r.abort());
    ctx.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(local)) this.fail('HTTP ' + r.status() + ' for ' + r.url().slice(local.length)); });
    const where = this.where;
    ctx.on('close', () => { if (outside.size) this.problems.push((where ? where + ': ' : '') + 'loaded from other sites (the app must not): ' + [...outside].join(', ')); });
    await ctx.addInitScript(pageInit, { seed: o.state !== undefined, state: o.state, key: KEY, now: o.now === false ? 0 : (o.now || NOW), speed: o.speed || 0 });
    const page = await ctx.newPage();
    this.watch(page);
    page.srv = srv;
    if (o.go !== false) {
      await page.goto(o.href || (srv.home + (o.url != null ? o.url : 'index.html') + (o.hash ? '#' + o.hash : '')));
      await settle(page, { threeD: o.threeD !== false });
    }
    return page;
  }
  watch(page) {
    page.setDefaultTimeout(this.opts.timeout || 20000);
    page.on('pageerror', (e) => this.fail('page error: ' + short(e)));
    page.on('console', (m) => { if (m.type() === 'error') this.fail('console error: ' + m.text().slice(0, 200)); });
    page.on('dialog', (d) => d.accept().catch(() => null));
    this.lastPage = page;
    return page;
  }

  // the standard checks for the screen that is showing; label names it in failures. o: threeD (false: don't wait for
  // the coach), kcal / figures (false: skip that check), shot (also save a screenshot), full (full-page screenshot)
  async look(page, label, o = {}) {
    await settle(page, { threeD: o.threeD !== false, extra: o.extra != null ? o.extra : 300 });
    const probs = await screenProblems(page, o);
    for (const p of probs) this.fail(label + ': ' + p);
    if (o.shot || this.opts.shots) await this.shot(page, label, o);
    return probs.length === 0;
  }
  async shot(page, name, o = {}) {
    fs.mkdirSync(this.out, { recursive: true });
    const file = path.join(this.out, String(this.shots.length + 1).padStart(2, '0') + '-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') + '.png');
    await page.screenshot({ path: file, fullPage: !!o.full });
    this.shots.push({ file, name });
    return file;
  }
}

// ---- driving the app -------------------------------------------------------------------------------------------------
const app = {
  // localStorage as the app saved it
  stored: (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY),
  text: (page) => page.evaluate(() => document.body.innerText),
  // the screen's title (document.title before " · Wellness by Frank")
  title: (page) => page.evaluate(() => document.title.split(' · ')[0]),
  // the latest toast, even if it has faded; toasts() lists them all
  toast: (page) => page.evaluate(() => { const l = (window.__qa && window.__qa.toasts) || []; return l[l.length - 1] || ''; }),
  toasts: (page) => page.evaluate(() => (window.__qa && window.__qa.toasts) || []),
  overlay: (page) => page.evaluate(() => { const o = document.getElementById('overlay'); return o && !o.hidden ? o.innerText : ''; }),
  // the muscle maps (Focus area, the onboarding's focus step) inside root: true for each one drawn and showing
  maps: (page, root = '#app') => page.evaluate((r) => [...document.querySelectorAll(r + ' img[data-map]')]
    .map((i) => !i.hidden && !!i.getAttribute('src') && i.getBoundingClientRect().width > 0), root),
  // a slow phone: the 3D coach stays out until the returned function lets it in (and waits for it). Call it on a page
  // opened with go: false, before it goes anywhere; then the screens draw first without the coach
  async holdCoach(page) {
    let open;
    const gate = new Promise((r) => { open = r; });
    await page.route('**/assets/coach-*.glb', async (route) => { await gate; await route.continue().catch(() => null); });
    return async () => {
      open();
      await page.waitForFunction(() => window.WBF && WBF.fig3d && WBF.fig3d.ready(), null, { timeout: 90000 })
        .catch(() => { throw new Error('the 3D coach did not load within 90 s after it was let in'); });
    };
  },
  // make a client code valid on this page (default: QA_CODE); call again after a reload
  addCode: (page, code = QA_CODE) => page.evaluate((h) => { if (WBF.FRANK.codes.indexOf(h) === -1) WBF.FRANK.codes.push(h); }, codeHash(code)),
  // make a coach code valid on this page (default: QA_COACH), as Frank's; call again after a reload
  addCoachCode: (page, code = QA_COACH) => page.evaluate((h) => {
    const list = WBF.FRANK.coachCodes = WBF.FRANK.coachCodes || [];
    if (list.indexOf(h) === -1) list.push(h);
  }, coachHash(code)),
  // Frank's phone: Coach tools opened the way Frank does it, Frank tab > "Frank? Open coach tools", with the
  // test-only coach code. Start on a screen with the tab bar; it ends on Coach tools
  async openCoach(page, code = QA_COACH) {
    await app.addCoachCode(page, code);
    await app.tap(page, '.tab[data-tab="frank"]');
    await app.tap(page, '[data-act="coach"]');
    await page.fill('#coach-in', code);
    await app.tap(page, 'form[data-form="coach-code"] button[type="submit"]');
    await page.waitForSelector('[data-act="coach-new"]', { timeout: 5000 }).catch(() => { throw new Error('the coach code did not open Coach tools'); });
  },
  // tap like a finger: the element must be visible and enabled; then let the screen redraw
  async tap(page, selector, { wait = 120, nth = 0 } = {}) {
    const loc = page.locator(selector).nth(nth);
    await loc.click();
    if (wait) await page.waitForTimeout(wait);
  },
  async tapText(page, text, { wait = 120, within = 'body' } = {}) {
    await page.locator(within).getByText(text, { exact: false }).first().click();
    if (wait) await page.waitForTimeout(wait);
  },
  // wait for a screen by its title
  async waitTitle(page, want, timeout = 15000) {
    await page.waitForFunction((w) => document.title.split(' · ')[0] === w, want, { timeout })
      .catch(async () => { throw new Error('expected the "' + want + '" screen, got "' + (await app.title(page)) + '"'); });
  },
  // wait for a heading (h1) that contains this text: a workout or a session from Frank shows its title there
  async waitHeading(page, want, timeout = 15000) {
    await page.waitForFunction((w) => [...document.querySelectorAll('#app h1')].some((h) => h.textContent.toLowerCase().includes(w.toLowerCase())), want, { timeout })
      .catch(async () => { throw new Error('expected a screen headed "' + want + '", got "' + (await app.title(page)) + '"'); });
  },
  async waitText(page, want, timeout = 15000) {
    await page.waitForFunction((w) => document.body.innerText.toLowerCase().includes(w.toLowerCase()), want, { timeout })
      .catch(() => { throw new Error('"' + want + '" never showed up'); });
  },
  // run the workout that is on screen to the finish screen like a person: Done after each set of reps, timers and
  // rests run out by themselves (open the page with speed: 50 so that takes seconds). Returns the Done taps.
  async runWorkout(page, { limit = 180000 } = {}) {
    const t0 = Date.now();
    let taps = 0;
    while (Date.now() - t0 < limit) {
      if ((await app.title(page)) === 'Workout complete') return taps;
      const done = page.locator('[data-act="pl-done"]');
      if (await done.count()) { await done.click().catch(() => null); taps++; }
      await page.waitForTimeout(80);
    }
    throw new Error('the workout did not reach the finish screen in ' + limit / 1000 + ' s');
  },
  // drag one of the onboarding rulers by n marks (positive = more), like a finger would; returns the shown value
  async slideRuler(page, id, n) {
    const el = page.locator('#rl-' + id);
    const step = +(await el.getAttribute('data-step')), px = step < 1 ? 7 : 9;
    const box = await el.boundingBox();
    const y = box.y + box.height / 2, x0 = box.x + box.width / 2, dx = -n * px;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    const k = Math.max(4, Math.abs(n));
    for (let i = 1; i <= k; i++) await page.mouse.move(x0 + dx * i / k, y);
    await page.mouse.up();
    await page.waitForTimeout(450);                         // the ruler snaps to the nearest mark
    return page.evaluate((i) => ({ text: document.getElementById('rv-' + i).innerText.replace(/\s+/g, ' ').trim(),
      value: +document.getElementById('rl-' + i).getAttribute('aria-valuenow') }), id);
  }
};

// ---- known app bugs --------------------------------------------------------------------------------------------------
// tools/test/known.cjs lists problems a suite is expected to report until the app is fixed.
function loadKnown() {
  try { delete require.cache[require.resolve('./known.cjs')]; return require('./known.cjs'); } catch (e) { return []; }
}

// ---- running suites -----------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = a.slice(2, eq === -1 ? undefined : eq);
      if (eq !== -1) o[k] = a.slice(eq + 1);
      else if (argv[i + 1] != null && !argv[i + 1].startsWith('--') && ['out', 'scale', 'timeout', 'site'].includes(k)) o[k] = argv[++i];
      else if (k === 'wait' && /^\d+(\.\d+)?$/.test(argv[i + 1] || '')) o[k] = argv[++i];
      else o[k] = true;
    } else if (/^-[a-z]$/i.test(a)) o[a.slice(1)] = true;
    else o._.push(a);
  }
  return o;
}
function options(args) {
  return {
    out: path.resolve(args.out || process.env.FRANK_QA_OUT || path.join(os.tmpdir(), 'frank-qa')),
    scale: args.scale ? +args.scale : 1,
    timeout: args.timeout ? +args.timeout : 20000,
    verbose: !!(args.verbose || args.v),
    shots: !!args.shots,
    strict: !!args.strict,
    site: args.site ? String(args.site).replace(/\/?$/, '/') : SITE,            // live: the published copy to check
    wait: args.wait === true ? 5 : args.wait ? +args.wait : 0                     // live: minutes to wait for a deploy
  };
}

async function runSuites(suites, opts) {
  fs.mkdirSync(opts.out, { recursive: true });
  const known = loadKnown();
  const env = new Env(opts);
  const results = [];
  const width = Math.max(...suites.map((s) => s.name.length));
  for (const suite of suites) {
    const t = new Test(suite, env);
    const t0 = Date.now();
    try { for (const f of fs.readdirSync(t.out)) if (/^FAILED-.*\.png$/.test(f)) fs.rmSync(path.join(t.out, f)); } catch (e) { /* no folder yet */ }
    process.stdout.write('  ' + suite.name.padEnd(width) + '  ');
    if (opts.verbose) process.stdout.write('\n');
    let timer = null;
    try {
      await Promise.race([suite.run(t), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timed out after ' + (suite.timeout || 600) + ' s')), (suite.timeout || 600) * 1000); })]);
    } catch (e) { t.where = ''; t.fail('suite stopped: ' + short(e)); }
    clearTimeout(timer);
    for (const c of t.contexts.splice(0)) await c.close().catch(() => null);
    if (suite.fresh) await env.close();                           // suites that need a clean browser (service workers)
    const mine = known.filter((k) => k.suite === suite.name);
    const isKnown = (p) => mine.find((k) => k.match.test(p));
    const fresh = t.problems.filter((p) => !isKnown(p) || opts.strict);
    const old = opts.strict ? [] : t.problems.filter((p) => isKnown(p));
    const gone = mine.filter((k) => !t.problems.some((p) => k.match.test(p)));
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const ok = fresh.length === 0;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + secs + ' s' + (old.length ? '  (' + old.length + ' known)' : ''));
    for (const p of fresh) console.log('      ✗ ' + p);
    for (const p of old) console.log('      ~ known: ' + p + '\n          why: ' + isKnown(p).why);
    for (const k of gone) console.log('      ! known issue not seen any more, remove it from tools/test/known.cjs if it is fixed: ' + k.why);
    for (const n of t.notes) console.log('      · ' + n);
    if (t.shots.length && !opts.verbose) console.log('      ' + t.shots.length + ' screenshots in ' + t.out);
    results.push({ suite: suite.name, ok, seconds: +secs, problems: fresh, known: old, notes: t.notes, shots: t.shots.map((s) => s.file) });
  }
  await env.close();
  fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
  return results;
}

// node tools/test/<suite>.cjs runs that one suite
async function main(suites) {
  const args = parseArgs(process.argv.slice(2));
  const opts = options(args);
  const res = await runSuites(suites, opts);
  process.exit(res.every((r) => r.ok) ? 0 : 1);
}

module.exports = {
  REPO, KEY, TODAY, NOW, TZ, SITE, playwright, launch, serve, fetchSite, viaNode, settle, blankFigures, screenProblems, a11yScan, nameProblems,
  isoDay, profile, state, member, spec, pack, unpack, QA_CODE, QA_COACH, codeHash, coachHash, app, Env, Test, short, parseArgs, options, runSuites, main, loadKnown
};
