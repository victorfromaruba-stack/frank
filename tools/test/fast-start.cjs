// fast-start: someone new answers eight questions, sees their first week and trains Day 1 (js/onboard-flow.js). The rest
// comes after it ("Make it yours", on the finish screen and the Plan), one answer at a time, and Me's "Your answers"
// changes any answer on its own. Plans from before the fast start keep their answers and get no card.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const L = require('./lib.cjs');
const { app } = L;

const question = (p) => p.evaluate(() => { const q = document.querySelector('.ob-q, .part'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; });
async function expectStep(p, want) {
  await p.waitForFunction((w) => { const q = document.querySelector('.ob-q, .part'); return q && q.innerText.toLowerCase().includes(w.toLowerCase()); }, want, { timeout: 15000 })
    .catch(async () => { throw new Error('expected the step "' + want + '", got "' + (await question(p)) + '" on "' + (await app.title(p)) + '"'); });
}
const next = (p) => app.tap(p, '.ob-cta [data-act="ob-next"]');
// popstate events in the next ms: Back may not keep going back by itself
const popsIn = (p, ms = 600) => p.evaluate((w) => new Promise((r) => {
  let n = 0; const f = () => n++;
  addEventListener('popstate', f);
  setTimeout(() => { removeEventListener('popstate', f); r(n); }, w);
}), ms);
const HQ = ['heart', 'chest', 'dizzy', 'chronic', 'meds', 'joint', 'supervised', 'pregnant'];
const noneApply = () => Object.assign(Object.fromEntries(HQ.map((k) => [k, false])), { confirmed: L.TODAY });
// the eight questions in their order (FIRST in js/onboard-flow.js): the step's id, words of its question, an answer
const EIGHT = [
  ['goal', 'main goal', (p) => app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="fat"]')],
  ['born', 'born', (p) => next(p)],
  ['health', 'Before you', async (p) => { await app.tap(p, '[data-act="ob-health-none"]'); await next(p); }],
  ['sore', 'sore spots', async (p) => { await app.tap(p, '[data-act="ob-none"]'); await next(p); }],
  ['days', 'days a week', (p) => next(p)],
  ['minutes', 'How long', (p) => next(p)],
  ['kit', 'at home', (p) => next(p)],
  ['sex', 'demonstrate', (p) => app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="f"]')]
];
// Your answers: each row and words of the first question it opens (and the second, for two)
const ROWS = {
  goal: ['main goal'], days: ['days a week'], minutes: ['How long'], kit: ['at home'], born: ['born'], health: ['Before you'], sore: ['sore spots'],
  coach: ['demonstrate'], body: ['tall', 'current'], target: ['target'], focus: ['focus'], want: ['most'], fitness: ['active', 'push-ups'], name: ['call']
};
// a fast-start member the day of Day 1: the eight answers, the plan built, Day 1 done, and Make it yours to go (asked)
function fresh(pOver, over) {
  const rec = { id: 'd1', at: L.TODAY + 'T07:30:00.000Z', date: L.TODAY, wid: 'full-b', title: 'Full body', level: 'b', day: 1, sec: 640, moves: 18, total: 18,
    feel: null, adj: 0, loads: {}, kcal: null };
  return L.state(Object.assign({
    profile: L.profile(Object.assign({ goal: 'fat', cm: null, kg: null, targetKg: null, level: 'b', push: null, active: 1, focus: ['full'], want: [], name: '',
      sex: 'f', health: noneApply(), asked: {} }, pOver || {})),
    access: { trialStart: L.TODAY }, sessions: [rec], done: { 1: 'd1' }
  }, over || {}));
}
// the fields a save changed (asked aside, which says when)
const changed = (a, b) => Object.keys(Object.assign({}, a, b)).filter((k) => k !== 'asked' && JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort();
const answers = async (p) => { await app.tap(p, '.tab[data-tab="me"]'); await app.tap(p, '[data-act="flow-answers"]'); await app.waitTitle(p, 'Your answers'); };
const rowsOn = (p, root) => p.$$eval((root || '#app') + ' [data-row]', (bs) => bs.map((b) => b.getAttribute('data-row')));
// waits until a save from a row came back to where it was opened
const backOn = (p, title) => app.waitTitle(p, title, 10000);
// a workout ended after its first move: the finish screen. From the Plan, or (plan false) the player that is showing
async function shortWorkout(p, plan = true) {
  if (plan) {
    await app.tap(p, '.tab[data-tab="plan"]');
    await app.tap(p, '[data-act="start-day"]');
  }
  await app.waitTitle(p, 'Workout');
  await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
  if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
  await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
  await app.tap(p, '[data-act="quit"]');
  await app.tap(p, '[data-act="modal-yes"]');
  await app.waitTitle(p, 'Workout complete');
}
// Your first week before any scroll: the line about the free trial (its words, and whether it shows above Start Day 1),
// and for the safety rows and the days whether each ends above the buttons; the days' pictures
const fold = (p) => p.evaluate(() => {
  window.scrollTo(0, 0);
  const cta = document.querySelector('.reveal .ob-cta'), start = cta.querySelector('[data-act="ob-finish"]'), note = cta.querySelector('.ob-note');
  const top = cta.getBoundingClientRect().top, box = (e) => e.getBoundingClientRect();
  const above = (sel) => [...document.querySelectorAll(sel)].map((e) => box(e).bottom <= top);
  return {
    note: note ? [note.innerText.trim(), box(note).top >= 0 && box(note).bottom <= box(start).top && box(start).bottom <= innerHeight] : null,
    safety: above('.reveal .sum-row'), days: above('.wk1-day'), level: above('.reveal-level'),
    pictures: [...document.querySelectorAll('.wk1-day [data-thumb]')].map((e) => e.getAttribute('data-thumb'))
  };
});
// the app with FITNESS_FIRST turned on in js/onboard-flow.js (Frank's decision), on a fresh phone
async function fitnessFirst(t) {
  const src = fs.readFileSync(path.join(L.REPO, 'js', 'onboard-flow.js'), 'utf8');
  t.check(src.includes('var FITNESS_FIRST = false;'), 'js/onboard-flow.js: the FITNESS_FIRST switch this flow turns on');
  const p = await t.page({ go: false, speed: 50 });
  await p.route('**/js/onboard-flow.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: src.replace('var FITNESS_FIRST = false;', 'var FITNESS_FIRST = true;') }));
  await p.goto(p.srv.home + 'index.html');
  await L.settle(p);
  return p;
}

module.exports = {
  name: 'fast-start',
  about: 'the fast start (js/onboard-flow.js): eight questions with one progress bar and no Part screens, the plan built, Your first week with its real session lengths (before any scroll, also at 375x667: the safety rows and the days above the buttons, the free trial line above Start Day 1), Start Day 1 starting the free trial, Today after it with no weight; Make it yours after Day 1 (the fitness check first, each answer saved on its own with its toast, Not now; not after a session from Frank); Me\'s Your answers (every row opens its question, Back comes back, no Back loop); the phone\'s Back through the questions; older plans keep their answers and get no card; Frank\'s client with no plan; a move link keeps what is still to ask; two windows of one browser; FITNESS_FIRST on (Frank\'s decision) asks the fitness check up front, not in gentle mode',
  async run(t) {
    await t.flow('Welcome to Day 1: eight questions, the plan built, its first week', async () => {
      const p = await t.page({ speed: 50 });
      t.has(await app.text(p), 'I already have a plan', 'Welcome: keep my progress next to the fast start');
      await app.tap(p, '[data-act="ob-start"]');
      const seen = [];
      for (const [id, words, answer] of EIGHT) {
        await expectStep(p, words);
        seen.push(id);
        const bar = await p.evaluate(() => ({ bars: document.querySelectorAll('.ob-prog i').length, w: (document.querySelector('.ob-prog i b') || {}).style ? document.querySelector('.ob-prog i b').style.width : '' }));
        t.equal([await p.locator('.part').count(), bar.bars, bar.w], [0, 1, Math.round(seen.length / EIGHT.length * 100) + '%'], id + ' [Part screens, progress bars, how far]');
        if (id === 'goal' || id === 'sex') await t.look(p, 'fast start: ' + id);
        await answer(p);
      }
      t.equal(seen, EIGHT.map((x) => x[0]), 'the questions before the plan is built');
      t.equal(await p.evaluate(() => WBF.flow && WBF.flow.first), seen, 'the order js/onboard-flow.js gives (FIRST)');
      t.step('build');
      await app.waitText(p, 'Building your plan', 5000);
      const build = await p.locator('#b-steps').innerText();
      t.has(build, 'Choosing moves to lose fat', 'build steps');
      t.has(build, /Setting doses for beginners$/im, 'build steps');
      const sched = /Scheduling (\d) days a week, (\d+)(?: to (\d+))? minutes each/.exec(build);
      t.step('your first week');
      await p.waitForSelector('[data-act="ob-finish"][data-then="day"]', { timeout: 15000 });
      t.has(await question(p), 'Your first week', 'after the build');
      const shown = await p.$$eval('.wk1-day', (ds) => ds.map((d) => [+d.getAttribute('data-day'), d.querySelector('.mins').textContent.trim()]));
      const before = await app.stored(p);
      t.equal([(before || {}).profile || null, (before || {}).access || null], [null, null], 'saved before Start Day 1 [profile, access]');
      const txt = await app.text(p);
      for (const want of ['28-day fat burner', 'Week 1: Foundation', '3 workouts', 'You start at Beginner. The fitness check after Day 1 sets your level.',
        'Your 7-day free trial starts with your first workout.', 'Your week mixes strength and cardio.']) t.has(txt, want, 'Your first week');
      t.lacks(txt, /Target weight|BMI|Gentle mode|Pregnancy mode/, 'Your first week for an adult with no health yes');
      t.equal(await p.locator('.reveal-fig [data-fig]').count(), 1, "Your first week: Day 1's first move, moving");
      await t.look(p, 'fast start: your first week');
      // before any scroll (390x844): the free trial's line with the buttons, above Start Day 1, and the week above them;
      // a picture for each day that the others don't show
      const f = await fold(p);
      t.equal([f.note, f.days, f.level], [['Your 7-day free trial starts with your first workout.', true], [true, true, true], [true]],
        'Your first week before any scroll [the free trial line above Start Day 1, the days above the buttons, the level line]');
      t.equal(new Set(f.pictures).size, 3, "Your first week: the days' pictures (" + f.pictures.join(', ') + ')');
      t.step('Start Day 1');
      await app.tap(p, '[data-act="ob-finish"][data-then="day"]');
      await app.waitTitle(p, 'Workout');
      t.equal(await p.locator('#app .player').count(), 1, 'Start Day 1: the player');
      const s = await app.stored(p);
      t.equal(s.access && s.access.trialStart, L.TODAY, 'the free trial after Start Day 1');
      t.equal([s.profile.level, s.profile.asked, s.profile.targetKg, s.profile.start, s.profile.focus, s.profile.push, s.done], ['b', {}, null, L.TODAY, ['full'], null, {}],
        'saved [level, asked, target, plan start, focus, push-ups, ticks]');
      const real = await p.evaluate(() => {
        const pr = WBF.app.state().profile;
        return WBF.plan.days(pr).filter((d) => d.train && d.week === 1).map((d) => [d.day, Math.max(1, Math.round(WBF.app.session(d.workoutId, d).estSec / 60)) + ' min']);
      });
      t.equal(shown, real, "Your first week's sessions [day, length] against the sessions the plan builds");
      const mins = real.map((x) => parseInt(x[1], 10));
      t.equal(sched ? [+sched[1], +sched[2], +(sched[3] || sched[2])] : null, [3, Math.min(...mins), Math.max(...mins)], 'build step "Scheduling N days a week, M to M minutes" against week 1');
      t.step('the finish screen');
      await app.runWorkout(p);
      const done = await app.text(p);
      t.has(done, 'Day 1 is ticked off your plan', 'the finish screen after Start Day 1');
      const card = p.locator('[data-card="flow-yours"]');
      t.has(await card.innerText().catch(() => ''), 'Make it yours', 'the finish screen after Day 1');
      t.equal(await p.$$eval('[data-card="flow-yours"] [data-step]', (bs) => bs.map((b) => b.getAttribute('data-row'))), ['fitness', 'body', 'focus', 'want', 'name'],
        'Make it yours after Day 1 (the fitness check first; no target before a weight)');
      t.equal(await p.locator('[data-card="flow-yours"] .btn[data-row="fitness"]').textContent().catch(() => ''), 'Set my level', 'the fitness check: the main button');
      await t.look(p, 'fast start: the finish screen of Day 1');
      t.step('Today after Day 1, no weight yet');
      // as on the finish screen: no calorie number without a weight, and not 0 either
      t.has(await p.locator('.stats').innerText(), /–\s*Add weight/i, 'the finish screen of Day 1 with no weight: the calories');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '.tab[data-tab="today"]');
      await app.waitTitle(p, 'Today');
      const act = await p.locator('.act-card').innerText();
      t.has(act, /–\s*Add weight/i, 'Today after Day 1 with no weight: the calories');
      t.lacks(act, /kcal/i, 'Today after Day 1 with no weight: the calories');
      await t.look(p, 'fast start: Today after Day 1');
    });

    await t.flow('Your first week on a short phone: the sore spot, Day 1 and the free trial above the buttons', async () => {
      // 375x667 (an iPhone SE): the picture is lower and the rows tighter, so before any scroll the sore spot's row, Day 1
      // and the line about the free trial (with the buttons, above Start Day 1) show
      const p = await t.page({ width: 375, height: 667, speed: 50 });
      await app.tap(p, '[data-act="ob-start"]');
      for (const [id, words, answer] of EIGHT) {
        await expectStep(p, words);
        if (id !== 'sore') await answer(p);
        else { await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="knee"]'); await next(p); }
      }
      await p.waitForSelector('[data-act="ob-finish"][data-then="day"]', { timeout: 15000 });
      const f = await fold(p);
      t.equal([f.note, f.safety, f.days[0]], [['Your 7-day free trial starts with your first workout.', true], [true], true],
        'Your first week before any scroll at 375x667 [the free trial line above Start Day 1, the sore spot row, Day 1]');
      await t.look(p, 'fast start: your first week at 375x667, a sore knee');
    });

    await t.flow('Make it yours: each answer saved on its own, back where it was opened', async () => {
      const p = await t.page({ state: fresh(), speed: 50 });
      t.step('from the finish screen: the fitness check');
      await shortWorkout(p);
      let s0 = (await app.stored(p)).profile, st0 = await app.stored(p);
      await app.tap(p, '[data-card="flow-yours"] [data-row="fitness"]');
      await expectStep(p, 'active');
      await p.locator('#act-in').focus();
      await p.keyboard.press('ArrowRight');
      await next(p);
      await expectStep(p, 'push-ups');
      await app.tap(p, '[data-act="ob-push"][data-v="2"]');
      await next(p);
      await backOn(p, 'Workout complete');
      t.equal(await popsIn(p), 0, 'popstate events once back on the finish screen');
      let st = await app.stored(p);
      t.equal(changed(s0, st.profile), ['active', 'level', 'push'], 'the fitness check: what it saved');
      t.equal([st.profile.level, st.profile.asked.fitness, st.profile.start, st.done], ['i', L.TODAY, s0.start, st0.done], 'the fitness check [level, asked, plan start, ticks]');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after the fitness check');
      t.equal(await p.locator('[data-card="flow-yours"] [data-row="fitness"]').count(), 0, 'the card after the fitness check: its row');
      t.step('from the Plan: the rest, one at a time');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      t.check(await p.locator('[data-card="flow-yours"]').count(), 'the Plan after Day 1: no Make it yours card');
      await t.look(p, 'fast start: the Plan with Make it yours');
      // each row: [id, how to answer it, the fields it may save, the toast: the sessions change only with focus areas]
      const steps = [
        ['body', async () => { await app.slideRuler(p, 'h', 2); await next(p); await expectStep(p, 'current'); await app.slideRuler(p, 'w', -2); t.has(await p.locator('#bmi-box').innerText(), 'Healthy', 'BMI box'); await next(p); }, ['cm', 'kg'], 'Saved'],
        ['target', async () => { t.has(await p.locator('#tg-box').innerText(), 'lose', 'target box'); await next(p); }, ['targetKg'], 'Saved'],
        ['focus', async () => { await app.tap(p, '[data-act="ob-multi"][data-k="focus"][data-v="abs"]'); await next(p); }, ['focus'], 'Your plan was updated'],
        ['want', async () => { await app.tap(p, '[data-act="ob-multi"][data-k="want"][data-v="energy"]'); await next(p); }, ['want'], 'Saved'],
        ['name', async () => { await p.fill('#ob-name', 'Noor'); await next(p); }, ['name'], 'Saved']
      ];
      for (const [id, answer, fields, toast] of steps) {
        s0 = (await app.stored(p)).profile; st0 = await app.stored(p);
        const n = (await app.toasts(p)).length;
        await app.tap(p, '[data-card="flow-yours"] [data-row="' + id + '"]');
        await expectStep(p, ROWS[id][0]);
        await answer();
        await backOn(p, 'Plan');
        st = await app.stored(p);
        t.equal(changed(s0, st.profile), fields, id + ': what it saved');
        t.equal([st.profile.asked[id], st.profile.start, st.done, st.profile.round], [L.TODAY, s0.start, st0.done, s0.round], id + ' [asked, plan start, ticks, round]');
        t.equal(await p.locator('[data-card="flow-yours"] [data-row="' + id + '"]').count(), 0, id + ': its row on the card after');
        t.equal((await app.toasts(p)).slice(n), [toast], id + ': the toast');
      }
      st = await app.stored(p);
      t.equal([st.profile.cm, st.profile.kg, st.profile.targetKg, st.profile.focus, st.profile.want, st.profile.name], [167, 64, 59.5, ['abs'], ['energy'], 'Noor'],
        'saved [cm, kg, target kg, focus, want, name]');
      t.equal(st.weights, [{ date: L.TODAY, kg: 64, from: 'plan' }], 'the weight logged for today by Your body');
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the Plan once every question is answered: the card');
      t.equal(await p.evaluate(() => WBF.flow.pending()), [], 'what Make it yours still asks');
      await t.look(p, 'fast start: the Plan with every answer given');
    });

    await t.flow('Make it yours: Not now', async () => {
      const p = await t.page({ state: fresh(), speed: 50 });
      await app.tap(p, '[data-card="flow-yours"] [data-act="flow-later"]');
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the Plan after Not now: the card');
      t.equal((await app.stored(p)).profile.later, L.TODAY, 'saved after Not now');
      t.has(await app.toast(p), 'You can answer them any time in Me, Your answers.', 'toast after Not now');
      await shortWorkout(p);
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the finish screen after Not now: the card');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await answers(p);
      t.equal((await rowsOn(p)).filter((r) => ['body', 'focus', 'want', 'fitness', 'name'].includes(r)), ['body', 'focus', 'want', 'fitness', 'name'], 'Your answers after Not now');
      t.has(await p.locator('[data-row="body"]').innerText(), 'Not yet', 'Your answers: Your body after Not now');
    });

    await t.flow('Your answers: every row opens its question, Back comes back, no Back loop', async () => {
      const p = await t.page({ state: fresh({ kg: 70, cm: 170, asked: { body: L.TODAY } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('#app [data-act="ob-edit"]').count(), 0, 'Me: Edit (every question again)');
      await answers(p);
      const rows = await rowsOn(p);
      t.equal(rows, ['goal', 'days', 'minutes', 'kit', 'born', 'health', 'sore', 'coach', 'body', 'target', 'focus', 'want', 'fitness', 'name'], 'the rows of Your answers');
      const txt = await app.text(p);
      for (const want of ['Lose fat', 'None apply', '170 cm · 70 kg', 'Not yet']) t.has(txt, want, 'Your answers');
      await t.look(p, 'fast start: your answers');
      for (const id of rows) {
        await app.tap(p, '#app [data-row="' + id + '"]');
        await expectStep(p, ROWS[id][0]);
        if (ROWS[id][1]) {
          // two questions: the second, then the phone's Back to the first and out
          await next(p);
          await expectStep(p, ROWS[id][1]);
          await p.evaluate(() => history.back());
          await expectStep(p, ROWS[id][0]);
          await p.evaluate(() => history.back());
        } else await app.tap(p, '[data-act="ob-back"]');
        await app.waitTitle(p, 'Your answers', 5000);
        t.equal(await popsIn(p, 400), 0, id + ': popstate events once back on Your answers');
      }
      t.equal(changed(fresh({ kg: 70, cm: 170, asked: { body: L.TODAY } }).profile, (await app.stored(p) || {}).profile || {}), [], 'the profile after opening every row and going Back');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
    });

    await t.flow("the phone's Back through the questions, then out of the app", async () => {
      const p = await t.page();
      const inApp = () => p.url().startsWith(p.srv.url);
      await app.tap(p, '[data-act="ob-start"]');
      for (const [, words, answer] of EIGHT.slice(0, 3)) { await expectStep(p, words); await answer(p); }
      await expectStep(p, 'sore spots');
      for (const words of ['Before you', 'born', 'main goal']) {
        await p.evaluate(() => history.back());
        await expectStep(p, words);
        t.equal(await popsIn(p, 400), 0, "the phone's Back to " + words + ': popstate events after');
      }
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Wellness by Frank', 5000);
      t.has(await app.text(p), 'Your personal plan', "the phone's Back on the first question: Welcome");
      await p.waitForFunction(() => history.state && history.state.wbf === 1, null, { timeout: 5000 }).catch(() => null);
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await p.waitForURL((u) => !u.href.startsWith(p.srv.url), { timeout: 5000 }).catch(() => null);
      t.check(!inApp(), () => "the phone's Back on Welcome did not leave the app (still on " + p.url() + ')');
      t.step('Look around first, then Get my plan');
      const q = await t.page();
      await app.tap(q, '[data-act="browse"]');
      await app.tap(q, '.tab[data-tab="plan"]');
      await app.tap(q, '[data-act="ob-start"]');
      await expectStep(q, 'main goal');
      t.equal(await q.locator('.part').count(), 0, 'Get my plan on the Plan: Part screens');
      await app.tap(q, '[data-act="ob-back"]');
      await app.waitTitle(q, 'Plan', 5000);
      t.has(await app.text(q), 'Your 28-day plan', 'Back on the first question: the Plan it started from');
    });

    await t.flow('an older plan: its answers as they were, no card', async () => {
      // saved before the fast start: no profile.asked. Every answer counts as given: no Make it yours, and opening the app
      // or saving an answer adds nothing to it
      const rec = { id: 'o1', at: L.isoDay(-1) + 'T07:30:00.000Z', date: L.isoDay(-1), wid: 'full-i', title: 'Full body', level: 'i', day: 1, sec: 900, moves: 12, total: 12, feel: 'right', adj: 0, loads: {}, kcal: 90 };
      const st = L.member({ start: L.isoDay(-1) }, { sessions: [rec], done: { 1: 'o1' } });
      const p = await t.page({ state: st, speed: 50 });
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'an older plan: the card on the Plan');
      await shortWorkout(p);
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'an older plan: the card on the finish screen');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      const s = await app.stored(p);
      t.equal(s.profile, st.profile, 'an older plan after a workout: the profile as it was saved');
      await answers(p);
      t.lacks(await app.text(p), 'Not yet', 'Your answers of an older plan');
      await app.tap(p, '[data-row="name"]');
      await p.fill('#ob-name', 'Sammy');
      await next(p);
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.toast(p), 'Saved', 'toast after a name');
      const pr = (await app.stored(p)).profile;
      t.equal([pr.name, 'asked' in pr, 'later' in pr], ['Sammy', false, false], 'an older plan after a new name [name, asked, later]');
    });

    await t.flow("Frank's client with no plan: a plan for the days between his sessions", async () => {
      // came by Frank's session link: client access, his session, no plan of their own. Back from the session: the Plan
      const p = await t.page({ hash: 'frank.' + L.pack(L.spec({ i: 'c1', t: 'Glutes and core' })), speed: 50 });
      await app.waitHeading(p, 'Glutes and core');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      const plan = await app.text(p);
      t.has(plan, "A plan for the days between Frank's sessions", 'the Plan of a client with no plan');
      t.has(plan, '8 quick questions. Then your first week is ready.', 'the Plan of a client with no plan');
      t.lacks(plan, /Free for \d+ days/i, 'the Plan of a client with no plan');
      await t.look(p, "fast start: the Plan of Frank's client");
      await app.tap(p, '.plan-card [data-act="ob-start"]');
      for (const [, words, answer] of EIGHT) { await expectStep(p, words); await answer(p); }
      await p.waitForSelector('[data-act="ob-finish"][data-then="day"]', { timeout: 15000 });
      t.lacks(await app.text(p), 'free trial', 'Your first week for a client');
      await app.tap(p, '[data-act="ob-finish"][data-then="day"]');
      await app.waitTitle(p, 'Workout');
      t.equal(await p.locator('#app .player').count(), 1, 'Start Day 1 for a client: the player, not the price screen');
      t.equal(((await app.stored(p)).access || {}).trialStart || null, null, 'a client after Start Day 1: a free trial');
      t.step('See my plan');
      // trained Frank's session before asking for a plan: Make it yours waits for a workout of the plan
      const frankRec = { id: 'c1x', at: L.isoDay(-2) + 'T07:30:00.000Z', date: L.isoDay(-2), wid: 'coach:cl', title: 'Glutes and core', level: 'f', day: null, sec: 600,
        moves: 6, total: 6, feel: null, adj: 0, loads: {}, kcal: null, coach: 'cl' };
      const q = await t.page({ state: L.state({ access: { client: true }, inbox: [L.spec({ i: 'cl', t: 'Glutes and core' })], sessions: [frankRec], inboxDone: { cl: 'c1x' } }) });
      await app.tap(q, '[data-act="browse"]');
      await app.tap(q, '.tab[data-tab="plan"]');
      await app.tap(q, '.plan-card [data-act="ob-start"]');
      for (const [, words, answer] of EIGHT) { await expectStep(q, words); await answer(q); }
      await app.tap(q, '[data-act="ob-finish"][data-then="plan"]');
      await app.waitTitle(q, 'Plan');
      t.has(await app.text(q), 'Start day 1', 'See my plan: the Plan');
      t.equal(await q.locator('[data-card="flow-yours"]').count(), 0, "See my plan, after Frank's session but before a workout of the plan: the card");
      await shortWorkout(q);
      t.has(await q.locator('[data-card="flow-yours"]').innerText().catch(() => ''), 'Make it yours', 'the finish screen of the plan\'s first workout');
      // control: a member with no plan gets the app's own card
      const c = await t.page({ state: L.state({ access: { paid: true } }) });
      await app.tap(c, '[data-act="browse"]');
      await app.tap(c, '.tab[data-tab="plan"]');
      t.has(await app.text(c), 'Your 28-day plan', 'control: a member with no plan');
    });

    await t.flow('keep my progress: a plan that moves keeps what Make it yours still asks', async () => {
      // a move link (js/keep.js) carries profile.asked: on the new phone the card asks what the old one hadn't asked yet
      const from = fresh({ cm: 170, kg: 70, asked: { body: L.TODAY } });
      const code = 'z' + zlib.deflateRawSync(Buffer.from(JSON.stringify({ app: 'wellness-by-frank', v: 1, data: from }))).toString('base64url');
      const p = await t.page({ hash: 'move.' + code });
      await p.waitForFunction(() => !!document.querySelector('#overlay:not([hidden]) .modal'), null, { timeout: 10000 });
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      t.equal((await app.stored(p)).profile.asked, { body: L.TODAY }, 'asked after the plan came');
      // the Plan's first card is Undo for a few seconds (js/keep.js): Make it yours is there under it, and in Your answers
      t.equal(await p.evaluate(() => WBF.flow.pending()), ['target', 'focus', 'want', 'fitness', 'name'], 'Make it yours on the new phone: what it asks');
      await answers(p);
      t.equal([await p.locator('[data-row="body"] .meta').textContent(), await p.locator('[data-row="focus"] .meta').textContent()], ['170 cm · 70 kg', 'Not yet'],
        'Your answers on the new phone [Your body, Focus areas]');
    });

    await t.flow('two windows: the fast start finished in one while the other was on the questions', async () => {
      // two windows of one browser share the saved data. B makes a plan and starts Day 1 while A is half way through the
      // questions; A's answers, saved after that, are still a new plan from the fast start: Make it yours asks the rest,
      // and the plan keeps B's start
      const a = await t.page({ speed: 50 });
      const b = await a.context().newPage();
      t.watch(b);
      await b.goto(a.srv.home + 'index.html');
      await L.settle(b);
      await app.tap(a, '[data-act="ob-start"]');
      for (const [, words, answer] of EIGHT.slice(0, 4)) { await expectStep(a, words); await answer(a); }
      await app.tap(b, '[data-act="ob-start"]');
      for (const [, words, answer] of EIGHT) { await expectStep(b, words); await answer(b); }
      await app.tap(b, '[data-act="ob-finish"][data-then="day"]');
      await shortWorkout(b, false);
      t.equal((await app.stored(b)).profile.asked, {}, 'saved by the window that finished first: asked');
      await a.bringToFront();
      for (const [, words, answer] of EIGHT.slice(4)) { await expectStep(a, words); await answer(a); }
      await app.tap(a, '[data-act="ob-finish"][data-then="plan"]');
      await app.waitTitle(a, 'Plan');
      const pr = (await app.stored(a)).profile;
      t.equal([pr.asked, pr.start], [{}, L.TODAY], 'saved by the window that finished second [asked, plan start]');
      t.equal(await a.evaluate(() => WBF.flow.pending()), ['body', 'focus', 'want', 'fitness', 'name'], 'what Make it yours asks after that');
      t.equal(await a.locator('[data-card="flow-yours"]').count(), 1, 'the Plan of the window that finished second, Day 1 begun in the other: Make it yours');
    });

    await t.flow('FITNESS_FIRST on: the fitness check before the plan, if Frank wants it', async () => {
      // Frank's decision (docs/TEXT-FOR-FRANK.md), one switch in js/onboard-flow.js: how active and the push-ups straight
      // after the sore spots. The plan then starts at the level they set, Your first week says it, and Make it yours
      // doesn't ask them again. A health yes (gentle mode) skips them: no fitness check until a doctor clears it
      const p = await fitnessFirst(t);
      const ten = EIGHT.slice(0, 4).concat([
        ['active', 'active', (q) => next(q)],
        ['pushups', 'push-ups', async (q) => { await app.tap(q, '[data-act="ob-push"][data-v="2"]'); await next(q); }]
      ], EIGHT.slice(4));
      t.equal(await p.evaluate(() => [WBF.flow.fitnessFirst, WBF.flow.first]), [true, ten.map((x) => x[0])], 'the order with the fitness check up front [switch, order]');
      await app.tap(p, '[data-act="ob-start"]');
      for (const [id, words, answer] of ten) {
        await expectStep(p, words);
        t.equal(await p.locator('.ob-prog i').count(), 1, id + ': one progress bar');
        await answer(p);
      }
      await p.waitForSelector('[data-act="ob-finish"][data-then="day"]', { timeout: 15000 });
      const txt = await app.text(p);
      t.has(txt, 'You start at Intermediate.', 'Your first week after 15 to 29 push-ups');
      t.lacks(txt, 'The fitness check after Day 1', 'Your first week with the fitness check asked');
      await app.tap(p, '[data-act="ob-finish"][data-then="day"]');
      await app.waitTitle(p, 'Workout');
      const pr = (await app.stored(p)).profile;
      t.equal([pr.level, pr.push, pr.asked], ['i', 2, {}], 'saved [level, push-ups, asked]');
      await app.runWorkout(p);
      t.equal(await p.$$eval('[data-card="flow-yours"] [data-row]', (bs) => bs.map((b) => b.getAttribute('data-row'))), ['body', 'focus', 'want', 'name'],
        'Make it yours after Day 1, the fitness check asked already');
      t.has(await p.locator('[data-card="flow-yours"]').innerText(), 'A few more answers make the plan fit you.', 'Make it yours with the fitness check asked');
      t.step('a health yes: no fitness check');
      const g = await fitnessFirst(t);
      await app.tap(g, '[data-act="ob-start"]');
      for (const [id, words, answer] of EIGHT) {
        await expectStep(g, words);              // after the sore spots: the days, not How active are you?
        if (id !== 'health') await answer(g);
        else { await app.tap(g, '[data-act="ob-health-none"]'); await app.tap(g, '[data-act="ob-health"][data-k="heart"][data-v="1"]'); await next(g); }
      }
      await g.waitForSelector('[data-act="ob-finish"][data-then="plan"]', { timeout: 15000 });
      const week = await app.text(g);
      t.has(week, 'Gentle mode', 'Your first week with a health yes');
      t.lacks(week, 'You start at', 'Your first week with a health yes');
      await app.tap(g, '[data-act="ob-finish"][data-then="plan"]');
      await app.waitTitle(g, 'Plan');
      const gp = (await app.stored(g)).profile;
      t.equal([gp.push, gp.level, gp.health.heart], [null, 'b', true], 'saved with a health yes [push-ups, level, the yes]');
    });
  }
};

if (require.main === module) L.main([module.exports]);
