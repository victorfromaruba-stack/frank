// screens: a screenshot of every screen and its main states at 390 x 844, for a person (or an agent) to look at.
// Every screen also gets the standard checks (errors, sideways scroll, blank 3D coach, calories without "est.").
// Pictures and an index.html contact sheet land in <out>/screens/. Use --scale 2 for sharp pictures.
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { app } = L;

// a member three weeks in: sessions, weights, walks, water and meals, two plan days done
function history() {
  const st = L.member({ goal: 'fat', days: 3, minutes: 20, kit: ['chair', 'table', 'db'], start: L.isoDay(-2) });
  const rec = (n, title, sec, extra) => Object.assign({ id: 'h' + n, at: L.isoDay(-n) + 'T07:30:00.000Z', date: L.isoDay(-n), wid: 'full-i', title, level: 'i', day: null,
    sec, moves: 14, total: 14, feel: 'right', adj: 0, loads: {}, kcal: Math.round(sec / 60 * 6) }, extra || {});
  st.sessions = [rec(40, 'Full body', 1180), rec(33, 'Abs', 900), rec(26, 'Full body', 1260), rec(19, 'Lower body', 1320, { loads: { 'goblet-squat': 12 } }),
    rec(12, 'Full body', 1200, { feel: 'easy', adj: 0.05 }), rec(5, 'Upper body', 1150), rec(2, 'Full body', 1240, { day: 1 }), rec(0, 'Cardio', 780, { day: 3, feel: 'hard', adj: -0.08 })];
  st.done = { 1: 'h2', 3: 'h0' };
  st.adjust = 0.97;
  st.weights = [[-42, 82.4], [-35, 82.0], [-28, 81.6], [-21, 81.5], [-14, 80.9], [-7, 80.6], [0, 80.2]].map(([d, kg]) => ({ date: L.isoDay(d), kg }));
  st.walks = { [L.isoDay(-1)]: 30, [L.TODAY]: 20 };
  st.food = { [L.TODAY]: { water: 5, meals: [{ t: '08:10', text: 'Oats with yoghurt and berries', protein: true, veg: false }, { t: '12:45', text: 'Chicken salad wrap', protein: true, veg: true }] } };
  st.coach = { templates: [L.spec({ i: 'tpl1', t: 'Lower body, week 2', c: 'Sam', r: 3, x: [['goblet-squat', 12], ['reverse-lunge', 10], ['side-plank', 25]] })] };
  st.inbox = [L.spec({ i: 'in1', t: 'Upper body, week 2', x: [['push-up', 10], ['row-table', 12], ['plank', 30]], r: 3 })];
  return st;
}

function contactSheet(t) {
  const items = t.shots.map((s) => '<figure><a href="' + path.basename(s.file) + '"><img loading="lazy" src="' + path.basename(s.file) + '" alt=""></a><figcaption>' +
    s.name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</figcaption></figure>').join('\n');
  const html = '<!doctype html><meta charset="utf-8"><title>Wellness by Frank · screens</title><style>body{margin:0;padding:16px;font:14px system-ui;background:#0b1f12;color:#e8f0ea}' +
    'h1{font-size:18px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}figure{margin:0}img{width:100%;border-radius:10px;display:block;background:#012D12}' +
    'figcaption{margin-top:6px;opacity:.8}</style><h1>Wellness by Frank · ' + t.shots.length + ' screens · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') +
    (t.problems.length ? ' · ' + t.problems.length + ' problems (see the test output)' : '') + '</h1><main>\n' + items + '\n</main>\n';
  fs.writeFileSync(path.join(t.out, 'index.html'), html);
}

module.exports = {
  name: 'screens',
  about: 'a screenshot of every screen and main state at 390x844 (and an index.html contact sheet) for visual review, with an iPhone status bar, toasts, the BMI bar and long titles, keep my progress (Instagram\'s browser, a backup, the move sheet, the Home Screen sheet, the moved banner), and the fast start (its questions, Your first week, Make it yours, Your answers, a client with no plan)',
  timeout: 900,
  async run(t) {
    fs.rmSync(t.out, { recursive: true, force: true });
    const snap = (p, name, o = {}) => t.look(p, name, Object.assign({ shot: true, full: true }, o));
    const go = async (p, name, params) => { await p.evaluate(([n, a]) => WBF.app.go(n, a), [name, params || {}]); await p.waitForTimeout(150); };
    const tab = async (p, name) => { await p.evaluate((n) => WBF.app.tab(n), name); await p.waitForTimeout(150); };

    await t.flow('welcome and onboarding', async () => {
      // the fast start (js/onboard-flow.js): eight questions, the build, Your first week, Day 1; then Make it yours
      const p = await t.page({ speed: 50 });
      const next = () => app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'welcome', { full: false });
      await app.tap(p, '[data-act="ob-start"]');
      await snap(p, 'onboarding goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="fat"]');
      await snap(p, 'onboarding year of birth');
      // a year under 18 shows the note; then back to the year the wheel started on
      const born = await p.evaluate(() => document.querySelector('#wheel button.on').getAttribute('data-year'));
      await app.tap(p, '#wheel button[data-year="' + (+L.TODAY.slice(0, 4) - 14) + '"]');
      await snap(p, 'onboarding year of birth under 18');
      await app.tap(p, '#wheel button[data-year="' + born + '"]');
      await next();
      // the health questions: nothing picked yet, then two yes answers, then "None of these apply to me"
      await snap(p, 'onboarding health unanswered');
      await app.tap(p, '[data-act="ob-health"][data-k="joint"][data-v="1"]');
      await app.tap(p, '[data-act="ob-health"][data-k="pregnant"][data-v="1"]');
      await snap(p, 'onboarding health with yes answers');
      await app.tap(p, '[data-act="ob-health-none"]');
      await next();
      await app.tap(p, '[data-k="injuries"][data-v="knee"]'); await app.tap(p, '[data-k="injuries"][data-v="other"]');
      await snap(p, 'onboarding sore spots');
      await next();
      await app.tap(p, '[data-k="days"][data-v="4"]');
      await snap(p, 'onboarding days');
      await next();
      await snap(p, 'onboarding minutes');
      await next();
      await snap(p, 'onboarding kit');
      await next();
      await p.waitForFunction(() => document.querySelectorAll('img[data-portrait]:not([hidden])').length === 2, null, { timeout: 90000 }).catch(() => null);
      await snap(p, 'onboarding who demonstrates');
      await app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="f"]', { wait: 600 });
      await t.shot(p, 'onboarding building the plan');
      await p.waitForSelector('[data-act="ob-finish"][data-then="day"]', { timeout: 15000 });
      await snap(p, 'onboarding your first week');
      await app.tap(p, '[data-act="ob-finish"][data-then="day"]');
      await app.waitTitle(p, 'Workout');
      await app.runWorkout(p);
      await snap(p, 'finish screen of Day 1 with make it yours');
      // Make it yours: the fitness check, then height and weight (cm and ft, kg and lb), the target, focus, want, name
      const row = (id) => app.tap(p, '[data-card="flow-yours"] [data-row="' + id + '"]');
      await row('fitness');
      await snap(p, 'onboarding how active');
      await next();
      await app.tap(p, '[data-act="ob-push"][data-v="1"]');
      await snap(p, 'onboarding push-ups');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await row('body');
      await snap(p, 'onboarding height cm');
      await app.tap(p, '[data-act="hunits"][data-v="ft"]');
      await snap(p, 'onboarding height ft');
      await app.tap(p, '[data-act="hunits"][data-v="cm"]');
      await next();
      await snap(p, 'onboarding weight kg');
      await app.tap(p, '[data-act="units"][data-v="lb"]');
      await snap(p, 'onboarding weight lb');
      await app.tap(p, '[data-act="units"][data-v="kg"]');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await row('target');
      await snap(p, 'onboarding target weight');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await row('focus');
      await app.tap(p, '[data-k="focus"][data-v="abs"]'); await app.tap(p, '[data-k="focus"][data-v="legs"]');
      await snap(p, 'onboarding focus');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await row('want');
      await app.tap(p, '[data-k="want"][data-v="energy"]');
      await snap(p, 'onboarding want');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await row('name');
      await p.fill('#ob-name', 'Sanne');
      await snap(p, 'onboarding name');
      await next();
      await app.waitTitle(p, 'Workout complete');
      await tab(p, 'me');
      await app.tap(p, '[data-act="flow-answers"]');
      await snap(p, 'your answers');
    });

    await t.flow('member three weeks in', async () => {
      const p = await t.page({ state: history() });
      await snap(p, 'plan');
      await snap(p, 'plan from Frank card', { full: false });
      await go(p, 'workout', { day: 5 });
      await snap(p, 'workout plan day');
      await app.tap(p, '[data-act="swap"]');
      await snap(p, 'swap sheet', { full: false });
      await app.tap(p, '#overlay [data-act="close"]');
      await app.tap(p, '[data-act="settings"]');
      await snap(p, 'workout settings sheet', { full: false });
      await app.tap(p, '#overlay [data-act="close"]');
      await go(p, 'workout', { id: 'gravity' });
      await snap(p, 'workout program (Gravity)');
      await go(p, 'workout', { coach: 'in1' });
      await snap(p, 'workout from Frank');
      // one sheet, its three tabs tapped like a finger
      await p.evaluate(() => WBF.app.sheet('goblet-squat'));
      for (const tb of ['video', 'muscle', 'howto']) {
        await app.tap(p, '#overlay [data-act="xs-tab"][data-v="' + tb + '"]');
        t.equal(await p.locator('#overlay [data-act="xs-tab"][aria-pressed="true"]').getAttribute('data-v'), tb, 'exercise sheet tab');
        await snap(p, 'exercise sheet ' + tb, { full: false });
      }
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      await tab(p, 'workouts');
      await snap(p, 'workouts');
      await app.tap(p, '[data-act="body"][data-v="arms"]');
      await app.tap(p, '[data-act="wf"][data-k="lvl"][data-v="a"]');
      await snap(p, 'workouts arms advanced');
      await app.tap(p, '[data-act="wf"][data-k="dur"][data-v="l"]');
      await snap(p, 'workouts nothing matches');
      await p.fill('#wq', 'squat'); await p.waitForTimeout(250);
      await snap(p, 'workouts search');
      await go(p, 'moves', {});
      await snap(p, 'exercise library', { full: false });
      await app.tap(p, '[data-act="moves-area"][data-area="mobility"]');
      await snap(p, 'exercise library mobility', { full: false });
      await tab(p, 'today');
      await snap(p, 'today');
      await tab(p, 'me');
      await snap(p, 'me');
      await tab(p, 'frank');
      await snap(p, 'frank');
      await go(p, 'science', {});
      await snap(p, 'science', { kcal: false });
      await go(p, 'inbox', {});
      await snap(p, 'sessions from Frank');
      await go(p, 'join', {});
      await snap(p, 'join');
      await go(p, 'coach', {});
      await snap(p, 'coach tools locked');
      await app.addCoachCode(p);                       // Frank's phone: the test-only coach code opens Coach tools
      await p.fill('#coach-in', L.QA_COACH);
      await app.tap(p, 'form[data-form="coach-code"] button[type="submit"]');
      await p.waitForSelector('[data-act="coach-new"]', { timeout: 5000 });
      await snap(p, 'coach tools');
      await app.tap(p, '[data-act="coach-edit"]');
      await snap(p, 'coach session editor');
      await app.tap(p, '[data-act="c-add"]');
      await snap(p, 'coach move picker', { full: false });
      await app.tap(p, '#overlay [data-act="close"]');
      await app.tap(p, '[data-act="c-send"]');
      await snap(p, 'coach send sheet', { full: false });
      // Frank's phone: the For Frank card on his tab, and the box that locks Coach tools again
      await app.tap(p, '#overlay [data-act="close"]');
      await tab(p, 'frank');
      await snap(p, 'frank with coach tools open');
      await go(p, 'coach', {});
      await app.tap(p, '[data-act="coach-lock"]');
      await snap(p, 'coach tools lock question', { full: false });
    });

    await t.flow('player', async () => {
      const st = L.member({ kit: ['chair', 'table', 'db'] });
      st.inbox = [L.spec({ i: 'pl', t: 'Player states', x: [['goblet-squat', 10], ['side-plank', 20]], r: 1, rs: 30 })];
      const p = await t.page({ state: st, speed: 1 });
      await app.tap(p, '[data-act="start-coach"]');
      await snap(p, 'player get ready', { full: false });
      await app.tap(p, '[data-act="pl-skip"]');
      await snap(p, 'player reps move', { full: false });
      await app.tap(p, '[data-act="pl-how"]');
      await snap(p, 'player how-to', { full: false });
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      await app.tap(p, '[data-act="pl-done"]');
      await snap(p, 'player rest', { full: false });
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      await snap(p, 'player rest paused', { full: false });
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      await app.tap(p, '[data-act="pl-skip"]');
      await app.tap(p, '[data-act="pl-pause"]');
      await snap(p, 'player timed move paused', { full: false });
      await app.tap(p, '[data-act="pl-pause"]');
      await p.evaluate(() => window.__qa.speed(10));
      await p.waitForFunction(() => /Switch/.test((document.querySelector('.pl-rest .label') || {}).textContent || ''), null, { timeout: 20000 });
      await p.evaluate(() => window.__qa.speed(0.2));
      await snap(p, 'player switch sides', { full: false });
      await app.tap(p, '[data-act="quit"]');
      await snap(p, 'player quit box', { full: false });
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Workout complete');
      await snap(p, 'finish screen with dumbbell weights');
    });

    await t.flow('other states', async () => {
      const done = L.member({ days: 2 });
      done.done = {}; [1, 4, 8, 11, 15, 18, 22, 25].forEach((d) => { done.done[d] = 'x' + d; });
      let p = await t.page({ state: done });
      await snap(p, 'plan complete');
      p = await t.page({ state: L.state({ profile: L.profile(), access: { trialStart: L.isoDay(-4) } }) });
      await go(p, 'pay', {});
      await snap(p, 'paywall during the trial');
      p = await t.page({ state: L.state({ profile: L.profile({ start: L.isoDay(-10) }), access: { trialStart: L.isoDay(-10) } }) });
      await go(p, 'pay', {});
      await snap(p, 'paywall after the trial');
      await tab(p, 'me');
      await snap(p, 'me trial ended', { full: false });
      // a member, and one of Frank's clients: Frank sees these from Coach tools with his own phone's access
      p = await t.page({ state: L.member({}, { access: { paid: true, trialStart: L.isoDay(-40) } }) });
      await go(p, 'pay', {});
      await snap(p, 'paywall for a member');
      p = await t.page({ state: L.member({}, { access: { client: true } }) });
      await go(p, 'pay', {});
      await snap(p, 'paywall for a client');
      p = await t.page({ state: L.member({ sex: 'f', health: { pregnant: true, heart: true } }, { access: { client: true } }) });
      await tab(p, 'today');
      await snap(p, 'today pregnant (no diet advice)');
      await tab(p, 'me');
      await snap(p, 'me client, pregnant, PAR-Q yes');
      p = await t.page();
      await app.tap(p, '[data-act="browse"]');
      await tab(p, 'plan');
      await snap(p, 'plan without a profile');
      // one of Frank's clients with no plan: the plan for the days between his sessions (js/onboard-flow.js)
      p = await t.page({ state: L.state({ access: { client: true }, inbox: [L.spec({ i: 'cl', t: 'Glutes and core' })] }) });
      await app.tap(p, '[data-act="browse"]');
      await tab(p, 'plan');
      await snap(p, "plan of Frank's client with no plan");
      // a plan from before the fast start: Your answers lists what it has
      p = await t.page({ state: L.member() });
      await tab(p, 'me');
      await app.tap(p, '[data-act="flow-answers"]');
      await snap(p, 'your answers of an older plan');
      await tab(p, 'today');
      await snap(p, 'today without a profile');
      // a new version took over (the first takeover is the worker's first install, the second a deploy)
      p = await t.page({ state: L.member() });
      await p.evaluate(() => { for (let i = 0; i < 2; i++) navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); });
      t.equal(await p.locator('#update-bar').count(), 1, 'update bars on Plan after a new version');
      await snap(p, 'plan with a new version', { full: false });
    });

    await t.flow('status bar, toasts, BMI bar, long titles', async () => {
      // the light screens on an iPhone's home screen: a 47 px notch (Chromium has none), a dark band behind the clock
      let p = await t.page();
      await p.evaluate(() => document.documentElement.style.setProperty('--safe-t', '47px'));
      await snap(p, 'welcome with an iPhone status bar', { full: false });
      await app.tap(p, '[data-act="ob-start"]');
      await snap(p, 'onboarding with an iPhone status bar', { full: false });
      // toasts without the tab bar sit above the main button
      p = await t.page();
      await app.tap(p, '[data-act="join"]');
      await app.addCode(p);
      await p.fill('#join-in', L.QA_CODE);
      await app.tap(p, 'form[data-form="join"] button[type="submit"]', { wait: 300 });
      await snap(p, 'onboarding after a client code, with its toast', { full: false });
      p = await t.page({ state: L.member() });
      await go(p, 'workout', { day: 1 });
      await app.tap(p, '[data-act="swap"]');
      await app.tap(p, '#overlay [data-act="do-swap"]', { wait: 300 });
      await snap(p, 'workout after a swap, with its toast', { full: false });
      // BMI 27.2, Overweight: the marker in the yellow band, the numbers under the bar where the colours change
      p = await t.page({ state: L.member({ cm: 170, kg: 78.6, targetKg: 78.6 }, { weights: [{ date: L.TODAY, kg: 78.6 }] }) });
      await tab(p, 'me');
      await snap(p, 'me with an overweight BMI', { full: false });
      await app.tap(p, '[data-act="flow-answers"]');
      await app.tap(p, '[data-row="body"]');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding weight with an overweight BMI');
      // a title Frank writes as one long Dutch word
      const title = 'Bovenlichaamskrachttraining';
      p = await t.page({ hash: 'frank.' + L.pack(L.spec({ i: 'long', t: title, c: 'Maximiliaan' })), speed: 50 });
      await app.waitHeading(p, title);
      await snap(p, 'session with a long Dutch title');
      await app.tap(p, '[data-act="start-coach"]');
      await app.waitTitle(p, 'Workout');
      await app.runWorkout(p);
      await snap(p, 'finish screen with a long Dutch title');
    });

    await t.flow('Your answers and saving', async () => {
      // the question after a new goal (Me, Your answers), on the light screen; Me when the phone can't save
      let p = await t.page({ state: L.member({}, { done: { 1: 'x1' } }) });
      await tab(p, 'me');
      await app.tap(p, '[data-act="flow-answers"]');
      await app.tap(p, '[data-row="goal"]');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="strength"]');
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after a new goal');
      await snap(p, 'restart question after a new goal', { full: false });
      p = await t.page({ state: L.member() });
      await p.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }; });
      await tab(p, 'today');
      await app.tap(p, '[data-act="water"][data-n="2"]');
      await tab(p, 'me');
      await snap(p, 'me when the phone cannot save');
    });

    await t.flow('keep my progress', async () => {
      // Welcome in Instagram's browser, Bring your plan, the box before a plan comes, the Plan with Undo, Me's data card,
      // the move sheet, the Home Screen sheet after a first workout (iPhone, Android), the banner once the app moved
      let p = await t.page({ ua: L.UA.instagramIphone });
      await snap(p, "welcome in Instagram's browser (iPhone)", { full: false });
      p = await t.page({ ua: L.UA.instagramAndroid });
      await snap(p, "welcome in Instagram's browser (Android)", { full: false });
      p = await t.page();
      await app.tap(p, '[data-act="keep-have"]');
      await snap(p, 'bring your plan');
      const file = { app: 'wellness-by-frank', v: 1, made: L.TODAY + 'T09:00:00.000Z', origin: 'http://127.0.0.1', data: history() };
      const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), app.tap(p, '[data-act="keep-restore"]')]);
      await chooser.setFiles({ name: 'wellness-by-frank-2026-10-13.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
      await p.waitForFunction(() => !!document.querySelector('#overlay:not([hidden]) .modal'), null, { timeout: 10000 });
      await snap(p, 'bring your plan here? (a backup picked)', { full: false });
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      await snap(p, 'plan with Undo after a backup came', { full: false });
      await tab(p, 'me');
      await p.evaluate(() => document.querySelector('[data-act="keep-move"]').scrollIntoView({ block: 'center' }));
      await snap(p, 'me: your data, the backup and the move', { full: false });
      await app.tap(p, '[data-act="keep-move"]');
      await p.waitForSelector('#keep-link', { timeout: 10000 });
      await snap(p, 'move my plan sheet', { full: false });
      // the Home Screen sheet after a first workout: on an iPhone, then on Android (Chrome's own install prompt)
      for (const [ua, name] of [[L.UA.iphone, 'iPhone'], [L.UA.android, 'Android']]) {
        p = await t.page({ ua, state: L.member(), speed: 50 });
        if (name === 'Android') await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => Promise.resolve(); window.dispatchEvent(e); });
        await app.tap(p, '[data-act="start-day"]');
        await app.waitTitle(p, 'Workout');
        await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
        if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
        await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
        await app.tap(p, '[data-act="quit"]');
        await app.tap(p, '[data-act="modal-yes"]');
        await app.waitTitle(p, 'Workout complete');
        await p.waitForFunction(() => /Keep your progress/.test((document.querySelector('#overlay:not([hidden]) .sheet') || {}).innerText || ''), null, { timeout: 10000 });
        await snap(p, 'home screen sheet after the first workout (' + name + ')', { full: false });
      }
      await app.tap(p, '#overlay [data-act="close"]');
      await snap(p, 'finish screen with Keep your progress');
      // the app moved to Frank's own address (an example address: FRANK.home is empty until the move)
      p = await t.page({ state: L.member() });
      await p.evaluate(() => { WBF.FRANK.home = 'https://app.example.org/'; WBF.app.tab('plan'); });
      await snap(p, 'plan after the app moved to a new address', { full: false });
      // one of Frank's clients who came by his session link in Instagram's browser: the Plan under the session
      p = await t.page({ ua: L.UA.instagramIphone, hash: 'frank.' + L.pack(L.spec({ i: 'ig1', t: 'Glutes and core' })) });
      await app.waitHeading(p, 'Glutes and core');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      await snap(p, "plan of Frank's client in Instagram's browser", { full: false });
      // Me in Instagram's browser: Put it on your home screen says to move the plan first
      p = await t.page({ ua: L.UA.instagramIphone, state: L.member() });
      await tab(p, 'me');
      await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].find((x) => /Put it on your home screen/i.test(x.innerText)); if (c) c.scrollIntoView({ block: 'center' }); });
      await snap(p, "me in Instagram's browser: put it on your home screen", { full: false });
      // a plan that brings a pregnancy and a sore spot to a phone with its own plan: the box says so first
      p = await t.page({ state: L.member({ name: 'Own', sex: 'f' }) });
      await tab(p, 'me');
      const [pick] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), app.tap(p, '[data-act="keep-restore"]')]);
      await pick.setFiles({ name: 'backup.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ app: 'wellness-by-frank', v: 1, data: L.member({ sex: 'f', health: { pregnant: true }, injuries: ['knee'] }) })) });
      await p.waitForFunction(() => !!document.querySelector('#overlay:not([hidden]) .modal'), null, { timeout: 10000 });
      await snap(p, 'bring your plan here? (health answers onto a phone with its own plan)', { full: false });
    });

    await t.flow('personal prototype', async () => {
      const p = await t.page({ url: 'personal/index.html', threeD: false });
      const views = [['client/week', 'week'], ['client/session/upper-a', 'session'], ['client/play/upper-a', 'player'], ['client/progress', 'progress'],
        ['client/food', 'food'], ['client/frank', 'frank'], ['client/chat', 'chat'], ['client/checkin', 'check-in'], ['coach/today', 'coach today'],
        ['coach/clients', 'coach clients'], ['coach/client/sanne', 'coach client'], ['coach/build', 'coach plan'], ['coach/business', 'coach business']];
      for (const [hash, name] of views) {
        await p.evaluate((h) => { location.hash = '#/' + h; }, hash);
        await p.waitForTimeout(250);
        await snap(p, 'personal ' + name, { threeD: false, figures: false, full: !/player|chat/.test(name) });
      }
    });

    contactSheet(t);
    t.note('contact sheet: ' + path.join(t.out, 'index.html'));
  }
};

if (require.main === module) L.main([module.exports]);
