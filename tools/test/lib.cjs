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
// (Pages sends max-age=600). overlay: { 'path/in/repo': text } replaces files, to play a new deploy.
// Every 404 is recorded in .missing.
function serve({ prefix = '', cache = 'no-store' } = {}) {
  const missing = [], overlay = {};
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
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
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': cache });
        res.end(data);
      };
      if (overlay[rel] != null) { send(overlay[rel]); return; }
      fs.readFile(file, (err, data) => {
        if (err) { missing.push(p); res.writeHead(404); res.end('not found'); return; }
        send(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => {
      const url = 'http://127.0.0.1:' + srv.address().port;
      resolve({ url, home: url + (prefix || '/'), missing, overlay,
        close: () => new Promise((r) => { if (srv.closeAllConnections) srv.closeAllConnections(); srv.close(() => r()); }) });
    });
  });
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

// What every screen must get right. Returns the list of problems (empty when fine).
async function screenProblems(page, { kcal = true, figures = true } = {}) {
  const out = [];
  const r = await page.evaluate((checkKcal) => {
    const res = { overflow: document.documentElement.scrollWidth - innerWidth, shot: !!window.WBF_SHOT, kcal: [], broken: [], fonts: true };
    res.fonts = document.fonts.check('900 20px Nunito') && document.fonts.check('20px "Gilda Display"');
    res.broken = [...document.images].filter((i) => !i.hidden && i.complete && i.getAttribute('src') && !i.naturalWidth).map((i) => i.getAttribute('src').slice(0, 60));
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
  if (r.kcal.length) out.push('calories without "est.": ' + r.kcal.join(' | '));
  if (figures) {
    const blank = await blankFigures(page);
    if (blank.length) out.push('blank 3D coach: ' + blank.join(', '));
  }
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
  // index.html), width, height, scale, now (false: real clock), speed, prefix ('/frank/'), sw (allow the
  // service worker; then other sites are watched, not blocked), server (one from serve(), e.g. with Pages' caching),
  // href (open this URL), go (false: don't open the page yet).
  async page(o = {}) {
    const env = this.env;
    const srv = o.server || await env.server(o.prefix || '');
    const browser = await env.browser();
    const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 844 }, deviceScaleFactor: o.scale || this.opts.scale || 1,
      serviceWorkers: o.sw ? 'allow' : 'block', locale: 'en-GB', timezoneId: TZ, colorScheme: 'dark' });
    this.contexts.push(ctx);
    const local = srv.url;
    const outside = new Set();
    ctx.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(local) && !/^(data|blob|about):/.test(u)) outside.add(u.slice(0, 120));
    });
    if (!o.sw) await ctx.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (r) => r.abort());
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
      else if (argv[i + 1] != null && !argv[i + 1].startsWith('--') && ['out', 'scale', 'timeout'].includes(k)) o[k] = argv[++i];
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
    strict: !!args.strict
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
  REPO, KEY, TODAY, NOW, TZ, playwright, launch, serve, settle, blankFigures, screenProblems,
  isoDay, profile, state, member, spec, pack, unpack, app, Env, Test, short, parseArgs, options, runSuites, main, loadKnown
};
