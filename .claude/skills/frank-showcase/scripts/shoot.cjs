// Capture screens of Frank's app at full phone resolution, as finished screenshots:
// status bar, safe areas, a lived-in demo account, the HD 3D coach, sharp still poses.
//
//   node shoot.cjs --screens plan,sheet,player --device iphone-6.9 --coach f --ex squat --out showcase/shots
//   node shoot.cjs --list                      (screens and devices)
//
// --rest-clock 80   the rest screen waits until the session clock passes this many seconds, so shown next
//                   to a player capture the clock moves forward; 0 skips the wait
//
// Writes <out>/<device>/<screen>.png and <out>/<device>/manifest.json. Exit code 1 if any screen failed.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

// CSS size x scale = the store's pixel size. top/bottom: the phone's safe areas.
const DEVICES = {
  'iphone-6.9': { width: 440, height: 956, scale: 3, top: 62, bottom: 34, os: 'ios' },      // 1320 x 2868, App Store 6.9"
  'iphone-6.5': { width: 414, height: 896, scale: 3, top: 47, bottom: 34, os: 'ios' },      // 1242 x 2688, App Store 6.5"
  'android': { width: 360, height: 640, scale: 3, top: 24, bottom: 16, os: 'android' },     // 1080 x 1920, Google Play 9:16
  'iphone': { width: 390, height: 844, scale: 3, top: 47, bottom: 34, os: 'ios' }           // 1170 x 2532, previews
};

// ---- inside the page, before the app's scripts ----------------------------------------------------
function shotInit(o) {
  window.WBF_SHOT = o.shot;
  if (o.coachUrls) window.WBF_COACH_URLS = o.coachUrls;
  try { localStorage.setItem('wbf.v1', JSON.stringify(o.state)); } catch (e) { /* no storage */ }
  document.addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = ':root{--safe-t:' + o.top + 'px!important;--safe-b:' + o.bottom + 'px!important}' +
      '#toast{display:none!important}*{caret-color:transparent!important}:focus,:focus-visible{outline:none!important}' +
      // emoji in colour, as on a phone (a test browser may fall back to a black-and-white emoji font)
      ':root{--f-body:Nunito,"Apple Color Emoji","Noto Color Emoji",ui-rounded,system-ui,sans-serif!important;--f-display:Nunito,"Apple Color Emoji","Noto Color Emoji",ui-rounded,system-ui,sans-serif!important}' +
      '#__sb{position:fixed;left:0;right:0;top:0;height:' + o.top + 'px;z-index:2147483647;pointer-events:none;color:#fff;' +
      'font:800 ' + (o.os === 'ios' ? 17 : 14) + 'px/1 Nunito,system-ui,sans-serif;letter-spacing:.01em}' +
      'body.light #__sb{color:#0E2A1A}#__sb svg{fill:currentColor;display:block}' +
      '#__sb .t{position:absolute;top:50%;transform:translate(-50%,-50%)}#__sb .i{position:absolute;top:50%;transform:translate(-50%,-50%);display:flex;gap:6px;align-items:center}' +
      '#__hi{position:fixed;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#fff;z-index:2147483647;pointer-events:none;opacity:.92}' +
      'body.light #__hi{background:#0E2A1A}';
    document.head.appendChild(css);
    const ear = o.os === 'ios' ? (o.width - 126) / 4 : 28;
    const sig = '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>';
    const wifi = '<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.2-1.2C14 1.6 11.4.5 8.5.5S3 1.6 1 3.6l1.2 1.2c1.7-1.6 3.9-2.5 6.3-2.5zm0 3.4c1.5 0 2.9.6 3.9 1.5l1.2-1.2C12.2 4.6 10.4 3.9 8.5 3.9S4.8 4.6 3.4 6l1.2 1.2c1-.9 2.4-1.5 3.9-1.5zm0 3.4c-.6 0-1.2.2-1.6.6l1.6 1.6 1.6-1.6c-.4-.4-1-.6-1.6-.6z"/></svg>';
    const batt = '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" opacity=".45"/></svg>';
    const sb = document.createElement('div');
    sb.id = '__sb';
    sb.innerHTML = '<span class="t" style="left:' + ear + 'px">9:41</span><span class="i" style="left:' + (o.width - ear) + 'px">' + sig + wifi + batt + '</span>';
    document.body.appendChild(sb);
    if (o.os === 'ios') { const hi = document.createElement('div'); hi.id = '__hi'; document.body.appendChild(hi); }
  });
}

// ---- the demo account: a member nine days into a fat-loss plan ------------------------------------
function demoState(kind, o) {
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const at = (n, h, m) => { const d = new Date(); d.setHours(h || 12, m || 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const f = o.coach === 'f';
  const settings = { sound: false, voice: false, vibrate: false, rest: 0, ready: 15, units: 'kg', hunits: 'cm', coach: o.coach };
  if (kind === 'new') return { v: 2, settings };
  const kg = f ? 68.4 : 86.2, name = o.name || (f ? 'Ana' : 'Marco');
  // a 4-day plan: days 1 2 4 5 train in week 1, today is day 9
  const done = [[1, 'lower-i', 'Lower body', 1215], [2, 'cardio-i', 'Cardio', 790], [4, 'upper-i', 'Upper body', 1140],
                [5, 'cardio-i', 'Cardio', 815], [8, 'lower-i', 'Lower body', 1238]];
  const met = { 'lower-i': 4.6, 'cardio-i': 6.2, 'upper-i': 4.3 };
  const sessions = done.map(([day, wid, title, sec]) => ({
    id: 's' + day, at: at(day - 9, 7, 30).toISOString(), date: iso(at(day - 9)), wid, title, level: 'i', day, sec,
    moves: 24, total: 24, feel: 'right', adj: 0, loads: {}, kcal: Math.round(met[wid] * 3.5 * kg / 200 * sec / 60 * 0.82)
  }));
  const state = {
    v: 2, settings, adjust: 1, swaps: {}, flags: null, inboxDone: {}, coach: { templates: [] },
    profile: { goal: 'fat', focus: ['abs', 'legs'], want: ['energy', 'looks'], sex: o.coach, birthYear: new Date().getFullYear() - 34,
               cm: f ? 168 : 180, kg, targetKg: f ? 62 : 80, health: {}, injuries: [], active: 1, push: 1, level: 'i',
               days: 4, minutes: 20, kit: ['chair', 'table'], name, start: iso(at(-8)), round: 1 },
    done: Object.fromEntries(done.map(([day]) => [day, 's' + day])),
    sessions,
    weights: [{ date: iso(at(-8)), kg }, { date: iso(at(-4)), kg: Math.round((kg - 0.4) * 10) / 10 }, { date: iso(at(0)), kg: Math.round((kg - 0.8) * 10) / 10 }],
    walks: { [iso(at(-3))]: 25, [iso(at(-1))]: 30, [iso(at(0))]: 20 },
    food: { [iso(at(0))]: { water: 5, meals: [{ t: '08:10', text: 'Eggs, toast and avocado', protein: true, veg: true },
                                            { t: '12:45', text: 'Chicken rice bowl with salad', protein: true, veg: true }] } },
    access: { trialStart: iso(at(-12)), paid: true },
    inbox: []
  };
  if (kind === 'client') {
    state.inbox = [{ i: 'demo1', t: 'Lower body, week 2', n: 'Slow on the way down. Hips back, chest proud.', c: name, r: 3, f: 'c', rs: 30, w: 1, k: 1,
                     x: [['goblet-squat', 12], ['single-leg-rdl', 8], ['split-squat', 10], ['glute-bridge', 15], ['side-plank', 30]], d: iso(at(0)) }];
    state.access.client = true;
  }
  if (kind === 'coach') {
    state.coach.templates = [
      { i: 'c1', t: 'Lower body, week 2', c: 'Maria', n: 'Slow on the way down.', r: 3, f: 'c', rs: 30, w: 1, k: 1, x: [['goblet-squat', 12], ['single-leg-rdl', 8], ['glute-bridge', 15]], d: iso(at(0)) },
      { i: 'c2', t: 'Shoulders and core', c: 'Luis', n: '', r: 2, f: 's', rs: 45, w: 1, k: 0, x: [['wall-slide', 10], ['table-row', 12], ['side-plank', 30]], d: iso(at(-2)) }
    ];
  }
  return state;
}

// ---- how to reach each screen ---------------------------------------------------------------------
async function click(p, sel) {
  const el = p.locator(sel).first();
  try { await el.waitFor({ state: 'visible', timeout: 20000 }); } catch (e) {
    const where = await p.evaluate(() => (document.querySelector('.ob-q, h1, .h1') || {}).textContent || document.title).catch(() => '?');
    throw new Error('could not find ' + sel + ' on "' + String(where).trim().slice(0, 60) + '"');
  }
  await el.click();
  await p.waitForTimeout(200);
}
async function ruler(p, id, v) {
  await p.evaluate(([id, v]) => {
    const r = document.getElementById('rl-' + id);
    const px = +r.getAttribute('data-step') < 1 ? 7 : 9;
    r.scrollLeft = (v - +r.getAttribute('data-min')) / +r.getAttribute('data-step') * px;
    r.dispatchEvent(new Event('scroll'));
  }, [id, v]);
  await p.waitForTimeout(500);
}
async function scrollTo(p, sel, offset) {
  await p.evaluate(([s, o]) => { const el = document.querySelector(s); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o); }, [sel, offset]);
  await p.waitForTimeout(400);
}
// the exercise page as a member reaches it: from today's workout when the move is in it (so the dose and
// the pager match the player), otherwise from the library
async function openSheet(p, o, tab) {
  await SCREENS.workout.run(p, o);
  await L.settle(p, { extra: 300 });
  const i = await p.evaluate((ex) => {
    const name = window.WBF.EX[ex] && window.WBF.EX[ex].name;
    const row = [...document.querySelectorAll('[data-act="ex-wo"]')].find((b) => (b.querySelector('b') || {}).textContent === name);
    return row ? row.getAttribute('data-i') : null;
  }, o.ex);
  if (i == null) { await app(p, (x) => WBF.app.sheet(x[0], x[1]), [o.ex, tab]); return; }
  // tap the row from inside the page: Playwright's click would scroll the workout behind the sheet,
  // and its move list would then show through under the status bar
  await p.evaluate((n) => { window.scrollTo(0, 0); document.querySelector('[data-act="ex-wo"][data-i="' + n + '"]').click(); }, i);
  await p.waitForSelector('.sheet .xs', { timeout: 20000 });
  if (tab) await click(p, '[data-act="xs-tab"][data-v="' + tab + '"]');
}
async function toCoaches(p, o) {
  await SCREENS.focus.run(p, o); await click(p, '.ob-cta .btn');
  await click(p, '[data-act="ob-multi"][data-v="energy"]'); await click(p, '.ob-cta .btn'); await click(p, '.part .btn');
  await p.waitForFunction(() => document.querySelectorAll('img[data-portrait]:not([hidden])').length === 2, null, { timeout: 180000 });
}
async function toPlayer(p, o) {
  await click(p, '[data-act="start-day"]');
  await click(p, '[data-act="pl-skip"]');
  // on to the first main move, or the requested exercise if this session has it
  for (let k = 0; k < 40; k++) {
    const st = await p.evaluate((ex) => {
      const name = (document.querySelector('.pl-name h1') || {}).textContent || '';
      const lab = (document.querySelector('.pl-body .label.dim') || {}).textContent || '';
      const want = ex && window.WBF.EX[ex] ? window.WBF.EX[ex].name.toUpperCase() : null;
      return { name: name.toUpperCase(), main: !/warm-up/i.test(lab), want };
    }, o.ex);
    if (st.want ? st.name === st.want : st.main) break;
    await click(p, '[data-act="pl-next"]');
    await p.waitForTimeout(150);
  }
}
const app = (p, fn, arg) => p.evaluate(fn, arg);

const SCREENS = {
  welcome: { state: 'new', what: 'first screen: the coach and "Get my plan"', run: async () => {} },
  goal: { state: 'new', what: 'onboarding: main goal with 3D pictures', run: async (p) => { await click(p, '[data-act="ob-start"]'); await click(p, '.part .btn'); } },
  focus: { state: 'new', what: 'onboarding: focus areas on the muscle map', run: async (p, o) => {
    await SCREENS.goal.run(p, o); await click(p, '[data-act="ob-pick"][data-v="fat"]');
    await click(p, '[data-act="ob-multi"][data-v="abs"]'); await click(p, '[data-act="ob-multi"][data-v="legs"]');
  } },
  coaches: { state: 'new', what: 'onboarding: choose the male or female coach (--coach shown picked)', run: async (p, o) => {
    await toCoaches(p, o);
    // pick, then come back: the tile shows as chosen, as when someone returns to this step
    await click(p, '[data-act="ob-pick"][data-v="' + o.coach + '"]'); await click(p, '[data-act="ob-back"]');
    await p.waitForFunction(() => document.querySelectorAll('img[data-portrait]:not([hidden])').length === 2, null, { timeout: 180000 });
  } },
  weight: { state: 'new', what: 'onboarding: weight ruler and BMI', run: async (p, o) => {
    await toCoaches(p, o); await click(p, '[data-act="ob-pick"][data-v="' + o.coach + '"]');
    await click(p, '.ob-cta .btn');                                                         // year of birth
    await click(p, '[data-act="ob-health-none"]'); await click(p, '.ob-cta .btn');          // health questions: none apply
    await ruler(p, 'h', o.coach === 'f' ? 168 : 180); await click(p, '.ob-cta .btn');
    await ruler(p, 'w', o.coach === 'f' ? 68.5 : 86);
  } },
  target: { state: 'new', what: 'onboarding: target weight, healthy pace and dates', run: async (p, o) => {
    await SCREENS.weight.run(p, o); await click(p, '.ob-cta .btn'); await ruler(p, 't', o.coach === 'f' ? 63 : 80);
  } },
  ready: { state: 'new', what: 'onboarding: "Your plan is ready" summary', run: async (p, o) => {
    await SCREENS.target.run(p, o);
    for (let k = 0; k < 2; k++) await click(p, '.ob-cta .btn');                        // target, sore spots
    await click(p, '.part .btn');                                                           // part 3
    for (const s of ['.ob-cta .btn', '[data-act="ob-push"][data-v="1"]', '.ob-cta .btn', '.ob-cta .btn', '.ob-cta .btn', '.ob-cta .btn', '.ob-cta .btn']) await click(p, s);
    await p.fill('#ob-name', o.coach === 'f' ? 'Ana' : 'Marco');
    await click(p, '[data-act="ob-build"]');
    await p.waitForSelector('[data-act="ob-finish"]', { timeout: 30000 });
  } },
  pay: { state: 'new', what: 'membership screen after onboarding', run: async (p, o) => { await SCREENS.ready.run(p, o); await click(p, '[data-act="ob-finish"]'); } },
  plan: { state: 'member', what: 'Plan tab: the plan card and next workout', run: async () => {} },
  grid: { state: 'member', what: 'Plan tab scrolled to the 28-day grid and this week', run: async (p) => { await scrollTo(p, '.month', 120); } },
  workout: { state: 'member', what: "today's workout: focus maps and moves", run: async (p) => {
    await app(p, () => { const d = WBF.app.state(); const n = WBF.plan.days(d.profile).filter((x) => x.train && !d.done[x.day])[0]; WBF.app.go('workout', { day: n.day }); });
  } },
  sheet: { state: 'member', what: 'exercise page, Video tab (3D coach or Frank\'s clip)', run: async (p, o) => { await openSheet(p, o, null); } },
  muscle: { state: 'member', what: 'exercise page, Muscle tab', run: async (p, o) => { await openSheet(p, o, 'muscle'); } },
  howto: { state: 'member', what: 'exercise page, How-to tab', run: async (p, o) => { await openSheet(p, o, 'howto'); } },
  player: { state: 'member', what: 'workout player, a main move', run: async (p, o) => { await toPlayer(p, o); } },
  rest: { state: 'member', what: 'workout player, rest with the next move', run: async (p, o) => {
    await toPlayer(p, o);
    for (let k = 0; k < 30 && !(await p.locator('[data-act="pl-done"]').count()); k++) await click(p, '[data-act="pl-next"]');
    if (o.restClock > 0) {
      await p.waitForFunction((min) => {
        const c = document.querySelector('#pl-clock'); if (!c) return true;
        const [m, s] = c.textContent.split(':').map(Number); return m * 60 + s >= min;
      }, o.restClock, { timeout: 240000, polling: 250 });
    }
    await click(p, '[data-act="pl-done"]');
  } },
  // today's workout, finished: the record finish() in js/app.js writes, at the session's own time estimate
  // (the same time and kcal as the workout screen), rated "Just right", and the day ticked off
  done: { state: 'member', what: "workout complete for today's workout", run: async (p) => {
    await app(p, () => {
      const S = WBF.app.state(), day = WBF.app.nextDay();
      if (!day) { WBF.app.go('done', { id: S.sessions[S.sessions.length - 1].id }); return; }
      const s = WBF.app.session(day.workoutId, day), d = new Date(), pad = (n) => (n < 10 ? '0' : '') + n;
      const rec = { id: 's' + day.day, at: d.toISOString(), date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
                    wid: s.wid, title: s.title, level: s.level, day: day.day, sec: s.estSec, moves: s.steps.length, total: s.steps.length,
                    feel: 'right', adj: 0, loads: {}, kcal: WBF.app.kcal(s, s.estSec) };
      S.sessions.push(rec);
      S.done[day.day] = rec.id;
      WBF.app.go('done', { id: rec.id });
    });
  } },
  workouts: { state: 'member', what: 'Workouts tab: body parts and filters', run: async (p) => { await app(p, () => WBF.app.tab('workouts')); } },
  library: { state: 'member', what: 'exercise library', run: async (p) => { await app(p, () => WBF.app.go('moves', {})); } },
  today: { state: 'member', what: 'Today tab: activity, water, food', run: async (p) => { await app(p, () => WBF.app.tab('today')); } },
  me: { state: 'member', what: 'Me tab: progress and weight', run: async (p) => { await app(p, () => WBF.app.tab('me')); } },
  frank: { state: 'member', what: 'Frank tab', run: async (p) => { await app(p, () => WBF.app.tab('frank')); } },
  science: { state: 'member', what: 'the science screen', run: async (p) => { await app(p, () => WBF.app.go('science', {})); } },
  tools: { state: 'coach', what: "Frank's coach tools with saved sessions", run: async (p) => { await app(p, () => WBF.app.go('coach', {})); } },
  client: { state: 'client', what: "a client's plan with Frank's session on top", run: async () => {} }
};

async function main() {
  const a = L.args();
  if (a.list) {
    console.log('Screens:'); for (const [k, v] of Object.entries(SCREENS)) console.log('  ' + k.padEnd(10) + v.what);
    console.log('Devices:'); for (const [k, d] of Object.entries(DEVICES)) console.log('  ' + k.padEnd(11) + d.width * d.scale + ' x ' + d.height * d.scale);
    return;
  }
  const dev = DEVICES[a.device || 'iphone-6.9'];
  if (!dev) throw new Error('unknown device ' + a.device + ' (try --list)');
  const screens = String(a.screens || 'plan').split(',').map((s) => s.trim()).filter(Boolean);
  for (const s of screens) if (!SCREENS[s]) throw new Error('unknown screen "' + s + '" (try --list)');
  const o = { coach: a.coach === 'f' ? 'f' : 'm', ex: a.ex || 'squat', name: a.name, restClock: a['rest-clock'] != null ? +a['rest-clock'] : 80 };
  const outDir = path.resolve(a.out || 'showcase/shots', a.device || 'iphone-6.9');
  fs.mkdirSync(outDir, { recursive: true });
  const hd = !a['no-hd'] && fs.existsSync(path.join(L.REPO, 'assets/hd/coach-m.glb')) && fs.existsSync(path.join(L.REPO, 'assets/hd/coach-f.glb'));
  if (!hd) console.log('note: using the app\'s standard coach models (build the HD ones: see SKILL.md)');
  const shot = { dpr: dev.scale, ss: +(a.ss || 2), shadow: 4096, still: true };

  const server = await L.serve();
  const browser = await L.launch();
  const manifest = [], failed = [];
  for (const name of screens) {
    const S = SCREENS[name], t0 = Date.now();
    const file = path.join(outDir, name + '.png');
    const init = { shot, coachUrls: hd ? { m: '/assets/hd/coach-m.glb', f: '/assets/hd/coach-f.glb' } : null, state: demoState(S.state, o),
                   top: dev.top, bottom: dev.bottom, os: dev.os, width: dev.width };
    const ctx = await L.context(browser, server.url, { width: dev.width, height: dev.height, scale: dev.scale, init: [[shotInit, init]] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(server.url + '/index.html');
      await L.settle(page);
      await S.run(page, o);
      await L.settle(page, { extra: 700 });
      let blank = await L.blankFigures(page);
      if (blank.length) { await page.waitForTimeout(2500); blank = await L.blankFigures(page); }
      if (blank.length) throw new Error('3D figure did not draw: ' + blank.join(', '));
      if (errors.length) throw new Error('page error: ' + errors[0]);
      await page.screenshot({ path: file });
      const info = L.pngInfo(file);
      manifest.push({ screen: name, file: path.relative(process.cwd(), file), width: info.width, height: info.height, device: a.device || 'iphone-6.9', coach: o.coach, ex: o.ex, what: S.what });
      console.log('ok   ' + name.padEnd(10) + info.width + 'x' + info.height + '  ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
    } catch (e) {
      failed.push(name);
      console.log('FAIL ' + name.padEnd(10) + e.message.split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  const mf = path.join(outDir, 'manifest.json');
  const old = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).filter((m) => !screens.includes(m.screen)) : [];
  fs.writeFileSync(mf, JSON.stringify(old.concat(manifest), null, 1));
  if (failed.length) { console.log('failed: ' + failed.join(', ')); process.exit(1); }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
