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
  about: 'a screenshot of every screen and main state at 390x844 (and an index.html contact sheet) for visual review',
  timeout: 900,
  async run(t) {
    fs.rmSync(t.out, { recursive: true, force: true });
    const snap = (p, name, o = {}) => t.look(p, name, Object.assign({ shot: true, full: true }, o));
    const go = async (p, name, params) => { await p.evaluate(([n, a]) => WBF.app.go(n, a), [name, params || {}]); await p.waitForTimeout(150); };
    const tab = async (p, name) => { await p.evaluate((n) => WBF.app.tab(n), name); await p.waitForTimeout(150); };

    await t.flow('welcome and onboarding', async () => {
      const p = await t.page();
      await snap(p, 'welcome', { full: false });
      await app.tap(p, '[data-act="ob-start"]');
      await snap(p, 'onboarding part 1', { full: false });
      await app.tap(p, '.part .btn');
      await snap(p, 'onboarding goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="fat"]');
      await app.tap(p, '[data-k="focus"][data-v="abs"]'); await app.tap(p, '[data-k="focus"][data-v="legs"]');
      await snap(p, 'onboarding focus');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await app.tap(p, '[data-k="want"][data-v="energy"]');
      await snap(p, 'onboarding want');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding part 2', { full: false });
      await app.tap(p, '.part .btn');
      await snap(p, 'onboarding who demonstrates');
      await app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="f"]');
      await snap(p, 'onboarding year of birth');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding height cm');
      await app.tap(p, '[data-act="hunits"][data-v="ft"]');
      await snap(p, 'onboarding height ft');
      await app.tap(p, '[data-act="hunits"][data-v="cm"]');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding weight kg');
      await app.tap(p, '[data-act="units"][data-v="lb"]');
      await snap(p, 'onboarding weight lb');
      await app.tap(p, '[data-act="units"][data-v="kg"]');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding target weight');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await app.tap(p, '[data-act="ob-health"][data-k="joint"][data-v="1"]');
      await app.tap(p, '[data-act="ob-health"][data-k="pregnant"][data-v="1"]');
      await snap(p, 'onboarding health with yes answers');
      await app.tap(p, '[data-act="ob-health"][data-k="joint"][data-v="0"]');
      await app.tap(p, '[data-act="ob-health"][data-k="pregnant"][data-v="0"]');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await app.tap(p, '[data-k="injuries"][data-v="knee"]'); await app.tap(p, '[data-k="injuries"][data-v="other"]');
      await snap(p, 'onboarding sore spots');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding part 3', { full: false });
      await app.tap(p, '.part .btn');
      await snap(p, 'onboarding how active');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await app.tap(p, '[data-act="ob-push"][data-v="1"]');
      await snap(p, 'onboarding push-ups');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await app.tap(p, '[data-k="days"][data-v="4"]');
      await snap(p, 'onboarding days');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding minutes');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding kit');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await snap(p, 'onboarding meet your coach');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await p.fill('#ob-name', 'Sanne');
      await snap(p, 'onboarding name');
      await app.tap(p, '[data-act="ob-build"]', { wait: 1500 });
      await t.shot(p, 'onboarding building the plan');
      await p.waitForFunction(() => /ready/i.test((document.querySelector('.ob-q') || {}).textContent || ''), null, { timeout: 15000 });
      await snap(p, 'onboarding summary');
      await app.tap(p, '[data-act="ob-finish"]');
      await snap(p, 'paywall after onboarding');
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
      // one sheet, its three tabs tapped like a finger (WBF.app.sheet again on an open sheet loses the tab: see known.cjs)
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
      await snap(p, 'coach tools');
      await app.tap(p, '[data-act="coach-edit"]');
      await snap(p, 'coach session editor');
      await app.tap(p, '[data-act="c-add"]');
      await snap(p, 'coach move picker', { full: false });
      await app.tap(p, '#overlay [data-act="close"]');
      await app.tap(p, '[data-act="c-send"]');
      await snap(p, 'coach send sheet', { full: false });
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
      p = await t.page({ state: L.state({ profile: L.profile({ start: L.isoDay(-10) }), access: { trialStart: L.isoDay(-10) } }) });
      await go(p, 'pay', {});
      await snap(p, 'paywall after the trial');
      await tab(p, 'me');
      await snap(p, 'me trial ended', { full: false });
      p = await t.page({ state: L.member({ sex: 'f', health: { pregnant: true, heart: true } }, { access: { client: true } }) });
      await tab(p, 'today');
      await snap(p, 'today pregnant (no diet advice)');
      await tab(p, 'me');
      await snap(p, 'me client, pregnant, PAR-Q yes');
      p = await t.page();
      await app.tap(p, '[data-act="browse"]');
      await tab(p, 'plan');
      await snap(p, 'plan without a profile');
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
