// onboarding: the whole onboarding tapped through like a person, once in cm/kg and once in ft/lb: the eight questions of
// the fast start (js/onboard-flow.js), the plan built and its first week, then the rest from Make it yours (after Day 1)
// and Me's Your answers, to every answer saved. Then Me's Your answers again: one answer at a time, each saved on its own.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

// the step that is showing: its question, or the intro part
async function question(p) {
  return p.evaluate(() => { const q = document.querySelector('.ob-q, .part'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; });
}
async function expectStep(t, p, want) {
  await p.waitForFunction((w) => { const q = document.querySelector('.ob-q, .part'); return q && q.innerText.toLowerCase().includes(w.toLowerCase()); }, want, { timeout: 15000 })
    .catch(async () => { throw new Error('expected the step "' + want + '", got "' + (await question(p)) + '"'); });
}
const next = (p) => app.tap(p, '.ob-cta [data-act="ob-next"]');
// an onboarding ruler as a screen reader says it: [its name, its value with the unit]
const said = (p, id) => p.evaluate((i) => { const r = document.getElementById('rl-' + i); return [r.getAttribute('aria-label'), r.getAttribute('aria-valuetext')]; }, id);
// popstate events in the next ms: Back may not keep going back by itself (the old Back loop fired about 1,100 a second)
const popsIn = (p, ms = 600) => p.evaluate((w) => new Promise((r) => {
  let n = 0; const f = () => n++;
  addEventListener('popstate', f);
  setTimeout(() => { removeEventListener('popstate', f); r(n); }, w);
}), ms);
const bookkeeping = (pr) => Object.keys(pr || {}).filter((k) => ['only', 'edit', 'soreDone'].includes(k));
// the eight health questions (PAR-Q+ and pregnancy)
const healthKeys = (p) => p.evaluate(() => WBF.PARQ.map((q) => q[0]).concat(['pregnant']));
const HQ = ['heart', 'chest', 'dizzy', 'chronic', 'meds', 'joint', 'supervised', 'pregnant'];
// health as this version saves it: every question answered (yes: the Yes ones), confirmed a month ago. Older versions
// saved only the questions tapped (No looked picked already), so their profiles hold some of the questions or none
const confirmedHealth = (yes) => Object.assign(Object.fromEntries(HQ.map((k) => [k, (yes || []).includes(k)])), { confirmed: L.isoDay(-30) });
// on the health step: each question's answer as shown ('Yes', 'No', or '-' for none), and the ones with none
const shownHealth = (p) => p.evaluate((ks) => ks.map((k) => { const b = document.querySelector('[data-act="ob-health"][data-k="' + k + '"][aria-pressed="true"]'); return b ? b.textContent : '-'; }), HQ);
const openHealth = async (p) => (await shownHealth(p)).map((a, i) => (a === '-' ? HQ[i] : null)).filter(Boolean);
const healthNextOff = (p) => p.locator('.ob-cta [data-act="ob-next"]').isDisabled();
// an object with its keys in order, to compare saved objects whatever order the answers came in
const sorted = (o) => Object.fromEntries(Object.entries(o || {}).sort(([a], [b]) => (a < b ? -1 : 1)));
// the real length of the saved plan's sessions, in seconds: every training day, or one week
const realSecs = (p, week) => p.evaluate((wk) => {
  const pr = WBF.app.state().profile;
  return WBF.plan.days(pr).filter((d) => d.train && (!wk || d.week === wk)).map((d) => WBF.app.session(d.workoutId, d).estSec);
}, week || 0);
const minutesOf = (secs) => secs.map((s) => Math.max(1, Math.round(s / 60)));
// a member two days into the plan with day 1 ticked off; over: the state, pOver: the profile
function ticked(over, pOver) {
  const rec = { id: 'h1', at: L.isoDay(-2) + 'T07:30:00.000Z', date: L.isoDay(-2), wid: 'full-i', title: 'Full body', level: 'i', day: 1, sec: 900,
    moves: 12, total: 12, feel: 'right', adj: 0, loads: {}, kcal: 90 };
  return L.member(Object.assign({ start: L.isoDay(-2), kit: ['chair', 'table', 'db'] }, pOver || {}), Object.assign({ sessions: [rec], done: { 1: 'h1' } }, over || {}));
}

// ---- Me > Your answers (js/onboard-flow.js): every answer, each opened on its own ---------------------------------------
async function toAnswers(p) {
  if ((await app.title(p)) !== 'Me') await app.tap(p, '.tab[data-tab="me"]');
  await app.tap(p, '[data-act="flow-answers"]');
  await app.waitTitle(p, 'Your answers');
}
// after a tap on a step: the next step, back where the row was opened (home), or a question box
async function settled(p, before, home) {
  await p.waitForFunction(([q, h]) => {
    const o = document.getElementById('overlay'), e = document.querySelector('.ob-q');
    return document.title.split(' · ')[0] === h || (o && !o.hidden) || (!!e && e.innerText.replace(/\s+/g, ' ').trim() !== q);
  }, [before, home], { timeout: 10000 });
}
// One row of Your answers tapped through like a person: the saved answer on every step. on(question) may change something
// first; it returns true when its tap already moved on. A health question an older profile never answered waits for an
// answer: it gets No, as from someone with nothing new to report. Ends back on Your answers, or at a question box
async function answerRow(p, id, on, seen) {
  await app.tap(p, '#app [data-row="' + id + '"]');
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => !!document.querySelector('.ob-q'), null, { timeout: 10000 });
    const q = await question(p);
    seen.push(q);
    if (!(on && await on(q))) {
      if (/Before you/i.test(q)) for (const k of await openHealth(p)) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="0"]');
      if (await p.locator('.ob-cta [data-act="ob-next"]').count()) await next(p);
      else await app.tap(p, '[data-act="ob-pick"][aria-pressed="true"]');
    }
    await settled(p, q, 'Your answers');
    if ((await app.title(p)) === 'Your answers' || await app.overlay(p)) return seen;
  }
  throw new Error('the row ' + id + ' never came back to Your answers: ' + seen.join(' › '));
}
// Me > Your answers, every row tapped through: every question again, as Edit used to ask them. Stops at a question box
async function editAll(p, on) {
  await toAnswers(p);
  const rows = await p.$$eval('#app [data-row]', (bs) => bs.map((b) => b.getAttribute('data-row')));
  const seen = [];
  for (const id of rows) {
    await answerRow(p, id, on, seen);
    if (await app.overlay(p)) break;
  }
  return seen;
}

// One person from the welcome screen to their first week: the eight questions of the fast start. Nothing is saved yet.
// o: the answers and the checks that depend on them
async function walk(t, o) {
  const p = await t.page({ speed: 50 });
  p.qa = {};
  t.step('welcome');
  await app.tap(p, '[data-act="ob-start"]');
  await expectStep(t, p, 'main goal');
  t.equal(await p.locator('.part').count(), 0, 'Part screens');
  await t.look(p, 'goal');
  await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="' + o.goal + '"]');

  t.step('year of birth');
  await expectStep(t, p, 'born');
  await t.look(p, 'year of birth');
  await app.tap(p, '#wheel button[data-year="' + o.born + '"]');
  await p.waitForFunction((y) => { const b = document.querySelector('#wheel button.on'); return b && b.getAttribute('data-year') === String(y); }, o.born, { timeout: 5000 })
    .catch(() => t.fail('year wheel: tapping ' + o.born + ' did not select it'));
  t.equal(await p.locator('#born-warn').isVisible(), o.born >= 2008, 'under-18 note showing (born ' + o.born + ')');
  await next(p);

  // the health questions come before anything else about the body (a yes changes what those steps may say)
  t.step('health');
  await expectStep(t, p, 'Before you');
  t.equal(await p.locator('[data-act="ob-health"][aria-pressed="true"]').count(), 0, 'health questions answered (Yes or No) before any tap');
  t.check(await p.locator('.ob-cta [data-act="ob-next"]').isDisabled(), 'health: Next works before the questions are answered');
  if (o.healthNone) await app.tap(p, '[data-act="ob-health-none"]');
  else for (const k of await healthKeys(p)) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="' + (o.healthYes.includes(k) ? 1 : 0) + '"]');
  t.equal(await p.locator('[data-act="ob-health"][aria-pressed="true"]').count(), 8, 'health questions answered after the taps');
  t.equal(await p.locator('[data-act="ob-health-none"]').getAttribute('aria-pressed'), String(!o.healthYes.length), '"None of these apply to me" marked');
  if (o.healthYes.length) t.has(await app.text(p), 'Check with your doctor', 'PAR-Q warning');
  else t.lacks(await app.text(p), 'Check with your doctor', 'health step with all No');
  t.check(await p.locator('.ob-cta [data-act="ob-next"]').isEnabled(), 'health: Next is off with every question answered');
  await t.look(p, 'health questions');
  await next(p);

  t.step('sore spots');
  await expectStep(t, p, 'sore spots');
  if (!o.sore.length) await app.tap(p, '[data-act="ob-none"]');
  for (const s of o.sore) await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="' + s + '"]');
  if (o.soreSays) t.has(await app.text(p), o.soreSays, 'sore spot line');
  await t.look(p, 'sore spots');
  await next(p);

  t.step('days, minutes, kit');
  await expectStep(t, p, 'days a week');
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="' + o.days + '"]');
  t.equal(await p.locator('[data-k="days"][aria-pressed="true"]').getAttribute('data-v'), String(o.days), 'days picked');
  await next(p);
  await expectStep(t, p, 'How long');
  // 45 minutes is more than either person's first week fills: the step says how long their sessions really are
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="45"]');
  t.has(await p.locator('#min-real').innerText().catch(() => 'nothing'), /Your first sessions take \d+( to \d+)? minutes/, 'minutes step at 45');
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="' + o.minutes + '"]');
  // a beginner's first week (everyone starts at Beginner) fills 10 minutes, not 30
  if (o.minutesLine) t.has(await p.locator('#min-real').innerText().catch(() => 'nothing'), /Your first sessions take \d+( to \d+)? minutes/, 'minutes step at ' + o.minutes + ', which a beginner\'s sessions don\'t fill');
  else t.equal(await p.locator('#min-real').count(), 0, 'real-length line at ' + o.minutes + ' minutes, which the sessions fill');
  await next(p);
  await expectStep(t, p, 'home');
  for (const k of o.kitTaps) await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="' + k + '"]');
  await t.look(p, 'kit');
  await next(p);

  t.step('who demonstrates');
  await expectStep(t, p, 'demonstrate');
  await t.look(p, 'who demonstrates');
  await app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="' + o.sex + '"]');

  t.step('build and first week');
  await app.waitText(p, 'Building your plan', 5000);
  const build = await p.locator('#b-steps').innerText();
  for (const line of o.buildSays) t.has(build, line, 'build steps');
  // the doses line names the level the plan really uses (before the fitness check: Beginner), in plain English
  t.has(build, /Setting doses for beginners$/im, 'build steps');
  t.lacks(build, /advanceds/i, 'build steps');
  t.lacks(build, /moves for (lose|build|move|stay)/i, 'build steps');
  const sched = /Scheduling (\d) days a week, (\d+)(?: to (\d+))? minutes each/.exec(build);
  t.check(sched, () => 'build steps: no "Scheduling N days a week, M minutes each" line in "' + build.replace(/\s+/g, ' ') + '"');
  await expectStep(t, p, 'Your first week');
  const sum = await app.text(p);
  for (const line of o.weekSays) t.has(sum, line, 'Your first week');
  for (const line of o.weekLacks) t.lacks(sum, line, 'Your first week');
  p.qa.shown = await p.$$eval('.wk1-day', (ds) => ds.map((d) => [+d.getAttribute('data-day'), parseInt(d.querySelector('.mins').textContent, 10)]));
  p.qa.sched = sched ? [+sched[1], +sched[2], +(sched[3] || sched[2])] : null;
  t.equal(((await app.stored(p)) || {}).profile || null, null, 'a profile saved before Your first week is left');
  await t.look(p, 'your first week');
  // before any scroll: what keeps them safe above the buttons, and the free trial's line with them, above Start Day 1
  const fold = await p.evaluate(() => {
    window.scrollTo(0, 0);
    const cta = document.querySelector('.reveal .ob-cta'), top = cta.getBoundingClientRect().top;
    const note = cta.querySelector('.ob-note'), start = cta.querySelector('[data-then="day"]');
    return { safety: [...document.querySelectorAll('.reveal .sum-row')].map((e) => e.getBoundingClientRect().bottom <= top),
      note: !!note && note.getBoundingClientRect().bottom <= start.getBoundingClientRect().top && start.getBoundingClientRect().bottom <= innerHeight };
  });
  t.equal(fold, { safety: o.weekRows.map(() => true), note: true }, 'Your first week before any scroll [the safety rows above the buttons, the free trial line above Start Day 1]');
  return p;
}
// once saved: week 1 as the plan builds it then, before the fitness check changes the level
async function weekOne(p) {
  const real = await p.evaluate(() => {
    const pr = WBF.app.state().profile;
    return WBF.plan.days(pr).filter((d) => d.train && d.week === 1).map((d) => [d.day, Math.max(1, Math.round(WBF.app.session(d.workoutId, d).estSec / 60))]);
  });
  p.qa.real = real;
}

// The questions after Day 1, from the card (Make it yours) or Me > Your answers. where: the screen they come back to
async function fitness(t, p, o, open, where) {
  t.step('the fitness check');
  await open('fitness');
  await expectStep(t, p, 'active');
  await p.locator('#act-in').focus();
  for (let i = 0; i < Math.abs(o.activeRight); i++) { await p.keyboard.press(o.activeRight > 0 ? 'ArrowRight' : 'ArrowLeft'); await p.waitForTimeout(150); }
  t.has(await p.locator('.illus-cap').innerText(), o.activeSays, 'how active');
  await t.look(p, 'how active');
  await next(p);
  await expectStep(t, p, 'push-ups');
  t.check(await p.locator('.ob-cta [data-act="ob-next"]').isDisabled(), 'push-ups: Next works before an answer');
  await app.tap(p, '[data-act="ob-push"][data-v="' + o.push + '"]');
  t.equal(await p.locator('[data-act="ob-level"][aria-pressed="true"]').innerText().then((s) => s.toLowerCase()), o.testLevel.toLowerCase(), 'level from the push-up test');
  await t.look(p, 'push-ups');
  await next(p);
  await app.waitTitle(p, where);
}
async function body(t, p, o, open, where) {
  t.step('height');
  await open('body');
  await expectStep(t, p, 'tall');
  if (o.imperial) {
    await app.tap(p, '[data-act="hunits"][data-v="ft"]');
    const shown = await p.evaluate(() => document.getElementById('rv-h').innerText.replace(/\s+/g, ' ').trim());
    t.check(/^\d ?ft \d{1,2} ?in$/.test(shown), 'height in ft shows "' + shown + '"');
  }
  const h = await app.slideRuler(p, 'h', o.heightSteps);
  t.equal(h.text.replace(/\s/g, ''), o.heightShows.replace(/\s/g, ''), 'height after sliding the ruler');
  t.equal(await said(p, 'h'), ['Height', o.rulerSays.h], 'the height ruler for a screen reader [name, value]');
  await t.look(p, 'height ' + (o.imperial ? 'ft' : 'cm'));
  await next(p);
  t.step('weight');
  await expectStep(t, p, 'current');
  if (o.imperial) await app.tap(p, '[data-act="units"][data-v="lb"]');
  const w = await app.slideRuler(p, 'w', o.weightSteps);
  t.equal(w.text.replace(/\s/g, ''), o.weightShows.replace(/\s/g, ''), 'weight after sliding the ruler');
  t.equal(await said(p, 'w'), ['Weight', o.rulerSays.w], 'the weight ruler for a screen reader [name, value]');
  t.has(await p.locator('#bmi-box').innerText(), o.bmiWord, 'BMI box');
  await t.look(p, 'weight ' + (o.imperial ? 'lb' : 'kg'));
  await next(p);
  await app.waitTitle(p, where);
}
async function rest(t, p, o, open, where) {
  if (o.targetSays) {
    t.step('target');
    await open('target');
    await expectStep(t, p, 'target');
    if (o.targetSteps) await app.slideRuler(p, 't', o.targetSteps);
    t.equal(await said(p, 't'), ['Target weight', o.rulerSays.t], 'the target weight ruler for a screen reader [name, value]');
    t.has(await p.locator('#tg-box').innerText(), o.targetSays, 'target box');
    await t.look(p, 'target weight');
    await next(p);
    await app.waitTitle(p, where);
  }
  t.step('focus');
  await open('focus');
  await expectStep(t, p, 'focus');
  const tap = (f) => app.tap(p, '[data-act="ob-multi"][data-k="focus"][data-v="' + f + '"]');
  if (!o.focus.includes('full')) {
    // a part picked, then taken off again: nothing picked, and Next waits
    await tap(o.focus[0]); await tap(o.focus[0]);
    t.check(await p.locator('.ob-cta [data-act="ob-next"]').isDisabled(), 'focus: Next works with nothing picked');
  }
  for (const f of o.focus) if (f !== 'full') await tap(f);
  for (const f of o.focus) t.equal(await p.locator('[data-k="focus"][data-v="' + f + '"]').getAttribute('aria-checked'), 'true', 'focus ' + f + ' ticked');
  await t.look(p, 'focus');
  await next(p);
  await app.waitTitle(p, where);
  t.step('what you want most');
  await open('want');
  await expectStep(t, p, 'most');
  for (const w of o.want) await app.tap(p, '[data-act="ob-multi"][data-k="want"][data-v="' + w + '"]');
  // Back leaves without saving; then the answers again, and Next
  await app.tap(p, '[data-act="ob-back"]');
  await app.waitTitle(p, where);
  t.equal((await app.stored(p)).profile.want, [], 'what you want most, after Back');
  await open('want');
  await expectStep(t, p, 'most');
  for (const w of o.want) await app.tap(p, '[data-act="ob-multi"][data-k="want"][data-v="' + w + '"]');
  for (const w of o.want) t.equal(await p.locator('[data-k="want"][data-v="' + w + '"]').getAttribute('aria-checked'), 'true', 'want ' + w + ' ticked');
  await next(p);
  await app.waitTitle(p, where);
  t.step('name');
  await open('name');
  await expectStep(t, p, 'call');
  t.equal(await p.locator('[data-act="ob-build"]').count(), 0, 'the name on its own: Build my plan');
  if (o.name) await p.fill('#ob-name', o.name);
  await next(p);
  await app.waitTitle(p, where);
}

// what was saved, and the plan it makes
async function checkSaved(t, p, o) {
  const s = await app.stored(p);
  t.check(s && s.profile, 'no profile was saved');
  if (!s || !s.profile) return;
  const pr = s.profile;
  t.equal(pr.goal, o.goal, 'saved goal');
  t.equal(pr.focus, o.focus, 'saved focus');
  t.equal(pr.want, o.want, 'saved wants');
  t.equal(pr.sex, o.sex, 'saved coach');
  t.equal(pr.birthYear, o.born, 'saved year of birth');
  t.near(pr.cm, o.cm, 0.6, 'saved height (cm)');
  t.near(pr.kg, o.kg, 0.3, 'saved weight (kg)');
  t.equal(pr.injuries, o.sore, 'saved sore spots');
  const hk = await healthKeys(p);
  t.equal(hk.filter((k) => pr.health[k] === true), o.healthYes, 'saved health answers (yes)');
  t.equal(hk.filter((k) => typeof pr.health[k] !== 'boolean'), [], 'health questions saved without an answer');
  t.equal(pr.health.confirmed, L.TODAY, 'date the health answers were confirmed');
  t.equal(!!pr.health.cleared, !!o.cleared, 'saved: cleared by a doctor');
  t.equal(pr.days, o.days, 'saved days');
  t.equal(pr.minutes, o.minutes, 'saved minutes');
  t.equal(pr.kit.slice().sort(), o.kit.slice().sort(), 'saved kit');
  t.equal(pr.name || '', o.name || '', 'saved name');
  t.equal(pr.start, L.TODAY, 'plan start');
  t.equal(Object.keys(pr.asked || {}).sort(), o.asked.slice().sort(), 'the questions answered after the plan was built (asked)');
  t.equal(s.settings.units, o.imperial ? 'lb' : 'kg', 'weight units');
  t.equal(s.settings.hunits, o.imperial ? 'ft' : 'cm', 'height units');
  t.check((s.weights || []).some((x) => x.date === L.TODAY && Math.abs(x.kg - o.kg) < 0.3), 'the weight was not logged for today');
  const plan = await p.evaluate(() => {
    const pr = WBF.app.state().profile, days = WBF.plan.days(pr);
    const av = WBF.plan.avoidFor(pr), out = { train: 0, unsafe: [], level: WBF.plan.levelFor(pr), cardio: 0 };
    days.forEach((d) => {
      if (!d.train) return;
      out.train++;
      if (/^cardio/.test(d.workoutId)) out.cardio++;
      const s = WBF.app.session(d.workoutId, d);
      s.steps.forEach((st) => { if (!WBF.plan.safe(WBF.EX[st.ex], av)) out.unsafe.push(d.day + ':' + st.ex); });
    });
    return out;
  });
  t.equal(plan.train, o.days * 4, 'training days in 28 days');
  t.equal(plan.level, o.planLevel, 'plan level');
  t.equal(plan.unsafe, [], 'moves the answers rule out, still in the plan');
  if (o.healthYes.length && !o.cleared) t.equal(plan.cardio, 0, 'cardio days in gentle mode');
  // real lengths: Your first week shows the sessions the plan built (before the fitness check), and the build step names
  // week 1's shortest and longest
  t.equal(p.qa.shown, p.qa.real, "Your first week's sessions [day, minutes] against the sessions the plan built");
  const wk1 = (p.qa.real || []).map((x) => x[1]);
  t.equal(p.qa.sched, [o.days, Math.min(...wk1), Math.max(...wk1)], 'build step "Scheduling N days a week, M to M minutes" against week 1 [days, shortest, longest]');
}

const METRIC = {
  imperial: false, goal: 'fat', focus: ['abs', 'legs'], want: ['energy', 'sleep'], sex: 'm', born: 1990,
  heightSteps: 2, heightShows: '180cm', cm: 180,
  weightSteps: -2, weightShows: '79kg', kg: 79, bmiWord: 'Healthy',
  targetSteps: -1, targetSays: 'lose 7.6%',                  // 79 kg: the ruler starts at 73.5 (7% less), one mark down is 73
  rulerSays: { h: '180 centimetres', w: '79 kilograms', t: '73 kilograms' },
  healthYes: [], healthNone: true, sore: [], soreSays: null,
  activeRight: -1, activeSays: 'I sit most of the day',
  push: 2, testLevel: 'Intermediate', planLevel: 'i',
  days: 4, minutes: 30, minutesLine: true, kitTaps: ['db'], kit: ['chair', 'table', 'db'], name: 'Sam',
  buildSays: ['Choosing moves to lose fat', 'Scheduling 4 days a week'],
  weekSays: ['28-day fat burner', 'Week 1: Foundation', '4 workouts', 'You start at Beginner. The fitness check after Day 1 sets your level.', 'Your 7-day free trial starts with your first workout.'],
  weekLacks: ['Target weight', 'BMI', 'Gentle mode'], weekRows: [],
  asked: ['body', 'target', 'focus', 'want', 'fitness', 'name']
};
const IMPERIAL = {
  imperial: true, goal: 'strength', focus: ['full'], want: [], sex: 'f', born: 1958,
  heightSteps: 2, heightShows: '5ft7in', cm: 67 * 2.54,             // 165 cm is 65 in (5 ft 5 in); two marks up: 5 ft 7 in
  weightSteps: 4, weightShows: '147lb', kg: 147 / 2.20462, bmiWord: 'Healthy',      // 65 kg is 143 lb
  targetSays: null,                                                 // a PAR-Q yes: no target weight (js/onboard-flow.js)
  rulerSays: { h: '5 feet 7 inches', w: '147 pounds' },
  healthYes: ['joint'], sore: ['knee', 'other'], soreSays: 'Moves that load your knee are left out or swapped, and jumps are left out. For the other spot',
  // gentle mode: no fitness check until Cleared by a doctor (Me), then the level from the push-up test
  cleared: true,
  activeRight: 1, activeSays: "I'm on my feet and moving a lot",
  push: 3, testLevel: 'Advanced', planLevel: 'a',
  days: 2, minutes: 10, minutesLine: false, kitTaps: ['table'], kit: ['chair'], name: '',
  buildSays: ['Choosing moves to build strength', 'Leaving out moves that load your knee', 'Leaving out jumps for your other sore spot', 'Scheduling 2 days a week'],
  weekSays: ['28-day strength builder', 'Week 1: Foundation', '2 workouts', 'Gentle mode', 'Until your doctor clears you', 'Knee, Other', 'Moves that load them, and jumps, are left out'],
  weekLacks: ['Target weight', 'BMI', 'The fitness check after Day 1'], weekRows: ['Sore spots', 'Health'],
  asked: ['body', 'focus', 'want', 'fitness', 'name']
};

module.exports = {
  name: 'onboarding',
  about: 'the whole onboarding by tapping, in cm/kg and in ft/lb: the eight questions of the fast start, the plan built and its first week with real session lengths, Start Day 1 or See my plan, then Make it yours and Your answers to every answer, the rulers as a screen reader says them; Me\'s Your answers: change sore spots, Back, an old Change\'s bookkeeping, the health answers kept and an older profile\'s unanswered ones open, every answer again, weights and ticks kept, a new goal or new days ask first; the name across a coach load, the map on the focus step when the coach comes in late',
  async run(t) {
    await t.flow('metric (cm, kg)', async () => {
      const o = METRIC;
      const p = await walk(t, o);
      t.step('Start Day 1');
      await app.tap(p, '[data-act="ob-finish"][data-then="day"]');
      await app.waitTitle(p, 'Workout');
      await weekOne(p);
      t.equal(((await app.stored(p)).access || {}).trialStart, L.TODAY, 'trial start after Start Day 1');
      await app.runWorkout(p);
      t.step('make it yours, on the finish screen');
      const from = (id) => app.tap(p, '[data-card="flow-yours"] [data-row="' + id + '"]');
      t.has(await p.locator('[data-card="flow-yours"]').innerText().catch(() => ''), 'Make it yours', 'the finish screen of Day 1');
      await fitness(t, p, o, from, 'Workout complete');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after the fitness check');
      await body(t, p, o, from, 'Workout complete');
      await rest(t, p, o, from, 'Workout complete');
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the finish screen once every question is answered: Make it yours');
      t.step('the plan');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      const txt = await app.text(p);
      t.has(txt, 'Start day 2', 'plan after Day 1');
      t.has(txt, '28-day fat burner', 'plan');
      // the plan card gives the next session's real length, not the minutes picked
      const day2 = await p.evaluate(() => { const d = WBF.app.nextDay(); return Math.max(1, Math.round(WBF.app.session(d.workoutId, d).estSec / 60)); });
      t.has(await p.locator('.pc-grid').innerText(), new RegExp('\\b' + day2 + ' min\\s+Next session', 'i'), 'plan card');
      t.equal(await p.locator('.wk-days button.dd').count(), o.days * 4, 'training days on the 28-day grid');
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the Plan once every question is answered: Make it yours');
      await t.look(p, 'plan after onboarding');
      await checkSaved(t, p, o);
    });

    await t.flow('imperial (ft, lb)', async () => {
      const o = IMPERIAL;
      const p = await walk(t, o);
      t.step('See my plan');
      await app.tap(p, '[data-act="ob-finish"][data-then="plan"]');
      await app.waitTitle(p, 'Plan');
      await weekOne(p);
      t.has(await app.text(p), 'Beginner', 'plan level in gentle mode');
      t.equal(await p.locator('.wk-days button.dd').count(), o.days * 4, 'training days on the 28-day grid');
      t.equal(await p.locator('[data-card="flow-yours"]').count(), 0, 'the Plan before a workout: Make it yours');
      const s = await app.stored(p);
      t.check(!s.access || !s.access.trialStart, 'See my plan started the trial');
      await app.tap(p, '.tab[data-tab="me"]');
      const me = await app.text(p);
      t.has(me, 'trial starts with your first workout', 'Me membership');
      t.has(me, 'Cleared by a doctor', 'Me health switch');
      t.has(me, 'Sore spots: Knee, Other', 'Me');
      await t.look(p, 'me after onboarding');
      t.step('your answers');
      await toAnswers(p);
      t.equal(await p.locator('[data-row="target"]').count(), 0, 'Your answers with a PAR-Q yes: Your target');
      t.equal(await p.locator('[data-row="fitness"]').count(), 0, 'Your answers in gentle mode: the fitness check');
      const from = (id) => app.tap(p, '#app [data-row="' + id + '"]');
      await body(t, p, o, from, 'Your answers');
      // the fitness check comes once a doctor has cleared the yes (Me, Cleared by a doctor)
      t.step('cleared by a doctor');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Me');
      await app.tap(p, '[data-act="health"][data-k="cleared"]');
      await toAnswers(p);
      t.equal(await p.locator('[data-row="fitness"]').count(), 1, 'Your answers once cleared by a doctor: the fitness check');
      await fitness(t, p, o, from, 'Your answers');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after the fitness check, cleared by a doctor');
      await rest(t, p, o, from, 'Your answers');
      await checkSaved(t, p, o);
    });

    // Me's Your answers opens one answer at a time; Me's Sore spots, Change, opens that step too
    await t.flow('Me: change sore spots', async () => {
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Sore spots: none', 'Me');
      await app.tap(p, '[data-act="ob-edit-step"][data-step="sore"]');
      await expectStep(t, p, 'sore spots');
      await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="shoulder"]');
      await next(p);
      const pr = (await app.stored(p)).profile;
      t.equal(pr.injuries, ['shoulder'], 'saved sore spots after the change');
      t.equal(Object.keys(pr).filter((k) => ['only', 'edit', 'soreDone'].includes(k)), [], 'onboarding bookkeeping saved in the profile');
      await app.waitTitle(p, 'Me');
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after the change');
      t.has(await app.text(p), 'Sore spots: Shoulder', 'Me after the change');
      t.step("Change, then the phone's Back");
      await app.tap(p, '[data-act="ob-edit-step"][data-step="sore"]');
      await expectStep(t, p, 'sore spots');
      await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="knee"]');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.equal((await app.stored(p)).profile.injuries, ['shoulder'], 'sore spots after Back (nothing saved)');
    });

    await t.flow('Me: Your answers, then Back', async () => {
      // the back arrow and the phone's Back step back through an answer to Your answers, then Me, once: no Back loop
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('[data-act="ob-edit"]').count(), 0, 'Me: Edit (every question again)');
      await toAnswers(p);
      await app.tap(p, '[data-row="goal"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-back"]');
      await app.waitTitle(p, 'Your answers', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Your answers');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.step("the phone's Back");
      await toAnswers(p);
      await app.tap(p, '[data-row="body"]');
      await expectStep(t, p, 'tall');
      await next(p);
      await expectStep(t, p, 'current');
      await p.evaluate(() => history.back());
      await expectStep(t, p, 'tall');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Your answers', 5000);
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.equal(bookkeeping((await app.stored(p)).profile), [], 'onboarding bookkeeping saved in the profile');
    });

    await t.flow("Me: an old Change's bookkeeping goes with the next answer", async () => {
      // phones that used Change before the fix saved only:"sore" in the profile. An answer must not act on it: the goal is
      // saved on its own and comes back to Your answers, and that save drops it
      const p = await t.page({ state: L.member({ only: 'sore', soreDone: true }) });
      await toAnswers(p);
      await app.tap(p, '[data-row="goal"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][aria-pressed="true"]');
      await app.waitTitle(p, 'Your answers', 5000);
      t.equal(bookkeeping((await app.stored(p)).profile), [], 'onboarding bookkeeping left in the profile');
      await app.tap(p, '[data-row="sore"]');
      await expectStep(t, p, 'sore spots');
      await next(p);
      await app.waitTitle(p, 'Your answers', 5000);
      t.equal(bookkeeping((await app.stored(p)).profile), [], 'onboarding bookkeeping left in the profile after the sore spots');
    });

    await t.flow('Me: Your answers keeps the health answers; the minutes step gives real lengths', async () => {
      // a beginner who picked 45 minutes; one PAR-Q yes (cleared by a doctor), saved by an older version: it stored only
      // the questions tapped, so the other seven were never answered, and the health step must not answer them No itself
      const p = await t.page({ state: L.member({ level: 'b', push: 0, goal: 'fat', days: 4, minutes: 45, focus: ['full'], health: { joint: true, cleared: true } }) });
      await toAnswers(p);
      t.has(await p.locator('[data-row="health"]').innerText(), 'Cleared by a doctor', 'Your answers: Health of an older profile');
      await app.tap(p, '[data-row="health"]');
      await expectStep(t, p, 'Before you');
      t.equal(await healthKeys(p), HQ, 'the health questions (HQ in this file)');
      t.equal(await shownHealth(p), HQ.map((k) => (k === 'joint' ? 'Yes' : '-')), 'older profile: answers on the health step (' + HQ.join(', ') + '; - is none)');
      t.check(await healthNextOff(p), 'older profile: Next works with seven questions never answered');
      t.equal(await p.locator('[data-act="ob-health-none"]').getAttribute('aria-pressed'), 'false', 'older profile: "None of these apply to me" marked');
      for (const k of HQ.filter((x) => x !== 'joint').slice(0, -1)) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="0"]');
      t.check(await healthNextOff(p), 'older profile: Next works with one question (pregnant) still open');
      await app.tap(p, '[data-act="ob-health"][data-k="pregnant"][data-v="0"]');
      t.check(!(await healthNextOff(p)), 'older profile: Next is off once every question is answered');
      await t.look(p, 'Your answers: health step of an older profile, answered');
      t.step('minutes');
      await app.tap(p, '[data-act="ob-back"]');
      await app.waitTitle(p, 'Your answers');
      await app.tap(p, '[data-row="minutes"]');
      await expectStep(t, p, 'How long');
      const wk1 = minutesOf(await realSecs(p, 1));
      const range = Math.min(...wk1) === Math.max(...wk1) ? Math.min(...wk1) + ' minutes' : Math.min(...wk1) + ' to ' + Math.max(...wk1) + ' minutes';
      t.has(await p.locator('#min-real').innerText().catch(() => 'nothing'), 'Your first sessions take ' + range + '.', 'minutes step for a beginner at 45 minutes');
      t.check(Math.max(...wk1) <= 42, 'control: a beginner\'s first week should run well under 45 minutes (got ' + wk1.join(', ') + ')');
      await t.look(p, 'minutes step with real lengths');
      await p.context().close();
      t.step('confirmed answers');
      // saved by this version: every answer stored, so the health step shows them all, No included, and Next is on
      const c = await t.page({ state: L.member({ health: Object.assign(confirmedHealth(['joint']), { cleared: true }) }) });
      await toAnswers(c);
      await app.tap(c, '[data-row="health"]');
      await expectStep(t, c, 'Before you');
      t.equal(await shownHealth(c), HQ.map((k) => (k === 'joint' ? 'Yes' : 'No')), 'confirmed: answers on the health step (' + HQ.join(', ') + ')');
      t.check(!(await healthNextOff(c)), 'confirmed: Next is off although every answer is saved');
    });

    await t.flow('Me: every answer again, new days', async () => {
      // every step shows the saved answer (health too: a profile this version saved); Next through all of them, change
      // the days: the plan follows, and nothing else changes
      const before = L.profile({ health: confirmedHealth() });
      const p = await t.page({ state: L.member({ health: before.health }) });
      const seen = await editAll(p, async (q) => {
        if (/days a week/i.test(q)) await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="5"]');
        const nx = p.locator('.ob-cta [data-act="ob-next"]');
        if (await nx.count()) t.check(await nx.isEnabled(), 'Next is off on "' + q.slice(0, 40) + '" although the answer is saved');
        else t.check(await p.locator('[data-act="ob-pick"][aria-pressed="true"]').count(), 'no saved answer marked on "' + q.slice(0, 40) + '"');
        return false;
      });
      t.log(seen.join(' › '));
      t.equal(seen.length, 16, 'questions through Your answers (two each for Your body and the fitness check): ' + seen.map((q) => q.split(' ').slice(0, 3).join(' ')).join(' › '));
      t.check(!seen.some((s) => /^part \d/i.test(s)), () => 'a Part intro among the answers: ' + seen.join(' › '));
      await app.waitTitle(p, 'Your answers');
      t.has((await app.toasts(p)).join(' | '), 'Your plan was updated', 'toasts after new days');
      const pr = (await app.stored(p)).profile;
      t.equal(pr.days, 5, 'days after every answer again');
      t.equal([pr.goal, pr.sex, pr.birthYear, pr.cm, pr.kg, pr.focus, pr.kit, pr.name], [before.goal, before.sex, before.birthYear, before.cm, before.kg, before.focus, before.kit, before.name],
        'answers kept [goal, sex, born, cm, kg, focus, kit, name]');
      t.equal(Object.keys(pr).filter((k) => ['only', 'edit', 'soreDone', 'asked'].includes(k)), [], 'onboarding bookkeeping (or asked, on an older profile) saved in the profile');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd').count(), 20, 'training days on the 28-day grid after new days');
    });

    await t.flow('Me: a year of birth of 60 or more changes the plan, and says so', async () => {
      // from 60 the plan leaves out jumps and adds balance work (avoidFor in js/programs.js): the sessions change, so the
      // toast says the plan was updated (and the modules hear it), and the plan keeps its start and its ticks
      const st = ticked({}, { goal: 'fat', level: 'i', birthYear: 1990 });
      const p = await t.page({ state: st });
      const jumps = () => p.evaluate(() => WBF.app.planDays().filter((d) => d.train).reduce((n, d) => n + WBF.app.session(d.workoutId, d).steps.filter((s) => WBF.EX[s.ex].jump).length, 0));
      t.check(await jumps() > 0, 'control: a fat-loss plan for someone born in 1990 should have jumps');
      await toAnswers(p);
      await app.tap(p, '#app [data-row="born"]');
      await expectStep(t, p, 'born');
      await app.tap(p, '#wheel button[data-year="1960"]');
      await p.waitForFunction(() => { const b = document.querySelector('#wheel button.on'); return b && b.getAttribute('data-year') === '1960'; }, null, { timeout: 5000 });
      await next(p);
      await app.waitTitle(p, 'Your answers');
      const s = await app.stored(p);
      t.equal([s.profile.birthYear, await jumps(), await app.toast(p)], [1960, 0, 'Your plan was updated'], 'after 1960 [year of birth, jumps in the plan, toast]');
      t.equal([s.profile.start, s.done], [st.profile.start, st.done], 'after 1960 [plan start, ticks]');
    });

    await t.flow('Me: every answer again with no changes keeps the weights and the ticks', async () => {
      // 76.4 kg logged by hand today; the onboarding said 80. Every answer saved again changes nothing but the date the
      // health answers were confirmed, which doesn't count as a change (healthSig)
      const st = ticked({ weights: [{ date: L.isoDay(-7), kg: 80 }, { date: L.TODAY, kg: 76.4 }] }, { health: confirmedHealth() });
      const p = await t.page({ state: st });
      let ruler = null;
      await editAll(p, async (q) => { if (/current weight/i.test(q)) ruler = await p.locator('#rv-w').innerText(); });
      t.equal((ruler || '').replace(/\s/g, ''), '76.5kg', 'weight step after 76.4 kg was logged today (the ruler\'s nearest mark)');
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.toast(p), 'Saved', 'toast after an answer with no changes');
      t.lacks((await app.toasts(p)).join(' | '), 'Your plan was updated', 'toasts after answers with no changes');
      const s = await app.stored(p);
      t.equal([s.weights, s.profile.start, s.done], [st.weights, st.profile.start, st.done], 'after every answer with no changes [weights, plan start, ticks]');
      t.equal(sorted(s.profile.health), sorted(Object.assign({}, st.profile.health, { confirmed: L.TODAY })), 'saved health answers after every answer with no changes');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after answers with no changes');
    });

    await t.flow('Me: an older profile: its open health questions answered No keep the plan', async () => {
      // saved by an older version: a PAR-Q yes, cleared by a doctor, and no No stored. The health step asks the seven open
      // questions; answered No, the plan is the same one, so the ticks and the plan start stay and the toast says "Saved"
      // (finishProfile compares the answers with healthSig: a missing one is a No)
      const st = ticked({}, { health: { joint: true, cleared: true } });
      const p = await t.page({ state: st });
      let open = null, off = null;
      await editAll(p, async (q) => {
        if (/Before you/i.test(q)) { open = await openHealth(p); off = await healthNextOff(p); }
        return false;
      });
      t.equal(open, HQ.filter((k) => k !== 'joint'), 'open questions on the health step');
      t.equal(off, true, 'Next disabled on the health step with open questions');
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.overlay(p), '', 'a question after answers that change nothing');
      t.equal(await app.toast(p), 'Saved', 'toast after answers that change nothing');
      const s = await app.stored(p);
      t.equal([s.done, s.profile.start, s.profile.round], [st.done, st.profile.start, st.profile.round], 'after the answers [ticks, plan start, round]');
      t.equal(sorted(s.profile.health), sorted(Object.assign(confirmedHealth(['joint']), { cleared: true, confirmed: L.TODAY })), 'saved health answers');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after the answers');
    });

    await t.flow('Me: the kit reordered, the open health questions answered and new minutes keep the ticks', async () => {
      // an older profile that never stored its No answers (editAll answers them); the last weight is from yesterday
      const st = ticked({ weights: [{ date: L.isoDay(-1), kg: 79 }] }, { health: {} });
      const p = await t.page({ state: st });
      await editAll(p, async (q) => {
        if (/at home/i.test(q)) { await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="chair"]'); await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="chair"]'); }
        if (/How long/i.test(q)) await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="30"]');
        return false;
      });
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.overlay(p), '', 'a question after answers that keep the goal and the days');
      t.has((await app.toasts(p)).join(' | '), 'Your plan was updated', 'toasts after new minutes');
      const s = await app.stored(p);
      t.equal([s.done, s.profile.start, s.profile.minutes, s.profile.kit.slice().sort(), s.weights], [st.done, st.profile.start, 30, ['chair', 'db', 'table'], st.weights],
        'after the answers [ticks, plan start, minutes, kit, weights]');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after the answers');
    });

    await t.flow('Me: a new goal or new days ask first', async () => {
      const st = ticked();
      const p = await t.page({ state: st });
      t.step('a new goal: Keep my progress');
      await toAnswers(p);
      await app.tap(p, '[data-row="goal"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="strength"]');
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after a new goal');
      t.equal(await p.$$eval('#overlay button', (bs) => bs.map((b) => b.textContent)), ['Keep my progress', 'Restart'], 'the question\'s buttons');
      await t.look(p, 'restart question');
      await app.tap(p, '[data-act="modal-no"]');
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.toast(p), 'Your plan was updated', 'toast after Keep my progress');
      let s = await app.stored(p);
      t.equal([s.profile.goal, s.done, s.profile.start], ['strength', st.done, st.profile.start], 'Keep my progress [goal, ticks, plan start]');
      t.has(await p.locator('[data-row="goal"]').innerText(), 'Build strength', 'Your answers after a new goal');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after Keep my progress');
      t.step('new days: Restart');
      await toAnswers(p);
      await app.tap(p, '[data-row="days"]');
      await expectStep(t, p, 'days a week');
      await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="5"]');
      await next(p);
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after new days');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.toast(p), 'Your plan was updated', 'toast after Restart');
      s = await app.stored(p);
      t.equal([s.profile.days, s.done, s.profile.start, s.sessions.length], [5, {}, L.TODAY, 1], 'Restart [days, ticks, plan start, workouts kept]');
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '.tab[data-tab="plan"]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 0, 'days ticked on the 28-day grid after Restart');
    });

    await t.flow('Me: new days, Keep my progress goes on from the same week', async () => {
      // two full weeks on 3 days a week (days 1, 3, 5, 8, 10 and 12 ticked off), so day 15 in week 3 is next. With
      // fewer or more days, the new plan's days before day 15 count as done: the plan goes on from day 15
      const ticks = [1, 3, 5, 8, 10, 12];
      const sessions = ticks.map((d) => ({ id: 'h' + d, at: L.isoDay(d - 15) + 'T07:30:00.000Z', date: L.isoDay(d - 15), wid: 'full-i', title: 'Full body',
        level: 'i', day: d, sec: 900, moves: 12, total: 12, feel: 'right', adj: 0, loads: {}, kcal: 90 }));
      const st = L.member({ start: L.isoDay(-14), health: confirmedHealth() }, { sessions, done: Object.fromEntries(ticks.map((d) => [d, 'h' + d])) });
      // the days each plan trains before day 15 (WEEK in js/programs.js)
      for (const [days, before] of [[2, [1, 4, 8, 11]], [4, [1, 2, 4, 5, 8, 9, 11, 12]]]) {
        t.step(days + ' days a week');
        const p = await t.page({ state: st });
        t.has(await app.text(p), 'Round 1 · 6/12 done', 'control: the plan before the change');
        await toAnswers(p);
        await app.tap(p, '[data-row="days"]');
        await expectStep(t, p, 'days a week');
        await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="' + days + '"]');
        await next(p);
        t.has(await app.overlay(p), 'Restart your 28 days?', 'question after new days');
        await app.tap(p, '[data-act="modal-no"]');
        await app.waitTitle(p, 'Your answers');
        await app.tap(p, '[data-act="back"]');
        await app.tap(p, '.tab[data-tab="plan"]');
        await app.waitTitle(p, 'Plan');
        const txt = await app.text(p);
        t.has(txt, 'Round 1 · ' + before.length + '/' + days * 4 + ' done', 'plan after Keep my progress');
        t.has(txt, 'Start day 15', 'plan after Keep my progress');
        t.has(txt, 'Week 3: Push', 'this week after Keep my progress');
        t.equal(await p.$$eval('.wk-days button.dd.done', (bs) => bs.map((b) => +b.getAttribute('data-day'))), before, 'days ticked on the 28-day grid after Keep my progress');
        const s = await app.stored(p);
        t.equal([s.profile.days, s.profile.start, s.sessions.length], [days, st.profile.start, 6], 'Keep my progress [days, plan start, workouts]');
        t.equal(ticks.filter((d) => s.done[d] !== st.done[d]), [], 'days whose tick Keep my progress changed');
        await t.look(p, 'plan after Keep my progress with ' + days + ' days');
        await p.context().close();
      }
    });

    await t.flow('Me: no changes in ft and lb keep the height and the target', async () => {
      // the rulers show 5 ft 11 in, 168 lb and 172 lb: passing them by keeps 180 cm, 76.4 kg and 78 kg exactly
      const st = L.member({ cm: 180, kg: 80, targetKg: 78, health: confirmedHealth() }, { weights: [{ date: L.isoDay(-7), kg: 80 }, { date: L.TODAY, kg: 76.4 }] });
      st.settings = Object.assign({}, st.settings, { units: 'lb', hunits: 'ft' });
      const p = await t.page({ state: st });
      const shown = {};
      const look = async (q) => {
        if (/tall/i.test(q)) shown.h = await p.locator('#rv-h').innerText();
        if (/current weight/i.test(q)) shown.w = await p.locator('#rv-w').innerText();
        if (/target/i.test(q)) shown.t = await p.locator('#rv-t').innerText();
        return false;
      };
      await toAnswers(p);
      t.has(await p.locator('[data-row="body"]').innerText(), '5′11″ · 168 lb', 'Your answers: Your body in ft and lb (the summary\'s 5′11″)');
      for (const id of ['body', 'target']) await answerRow(p, id, look, []);
      t.equal([shown.h, shown.w, shown.t].map((x) => (x || '').replace(/\s/g, '')), ['5ft11in', '168lb', '172lb'], 'rulers [height, weight, target]');
      await app.waitTitle(p, 'Your answers');
      t.equal(await app.toast(p), 'Saved', 'toast after answers with no changes');
      const s = await app.stored(p);
      t.equal([s.profile.cm, s.profile.kg, s.profile.targetKg, s.weights], [180, 76.4, 78, st.weights], 'after answers with no changes [cm, kg, target kg, weights]');
    });

    await t.flow("Me: the phone's Back on the restart question", async () => {
      // Back closes the question as "Keep my progress", once: Back again goes to Me, and the next Back leaves the app
      const st = ticked();
      const p = await t.page({ state: st });
      const inApp = () => p.url().startsWith(p.srv.url);
      await toAnswers(p);
      await app.tap(p, '[data-row="goal"]');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="move"]');
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after a new goal');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Your answers', 5000);
      t.equal(await app.overlay(p), '', 'the question after the phone\'s Back');
      const s = await app.stored(p);
      t.equal([s.profile.goal, s.done, s.profile.start], ['move', st.done, st.profile.start], "the phone's Back on the question [goal, ticks, plan start]");
      t.equal(await popsIn(p), 0, 'popstate events once back on Your answers');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Me', 5000);
      await p.waitForFunction(() => history.state && history.state.wbf === 1, null, { timeout: 5000 }).catch(() => null);
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await p.waitForURL((u) => !u.href.startsWith(p.srv.url), { timeout: 5000 }).catch(() => null);
      t.check(!inApp(), () => "the phone's Back on Me did not leave the app (still on " + p.url() + ')');
    });

    await t.flow('name step: a coach loading keeps the name', async () => {
      // 'wbf-three' fires each time a coach finishes loading (the female one a few questions before "Who should
      // demonstrate"), on whichever step is showing then: the figures change, what the person typed stays
      const p = await t.page({ state: L.member({ name: '' }) });
      await p.evaluate(() => window.dispatchEvent(new Event('wbf-three')));
      await toAnswers(p);
      await app.tap(p, '[data-row="name"]');
      await expectStep(t, p, 'call');
      await p.locator('#ob-name').click();
      await p.keyboard.type('Mari', { delay: 40 });
      await p.evaluate(() => window.dispatchEvent(new Event('wbf-three')));
      await p.keyboard.type('ana', { delay: 40 });
      t.equal(await p.locator('#ob-name').inputValue(), 'Mariana', 'name typed across a coach load');
      t.equal(await p.evaluate(() => document.activeElement && document.activeElement.id), 'ob-name', 'keyboard focus after a coach load');
      await next(p);
      await app.waitTitle(p, 'Your answers');
      t.equal((await app.stored(p)).profile.name, 'Mariana', 'name saved after Next');
      t.has(await p.locator('[data-row="name"]').innerText(), 'Mariana', 'Your answers after the name');
    });

    await t.flow('focus step: the muscle map shows when the coach comes in late', async () => {
      // a slow phone: the coach comes in after the person reaches the focus step, so the map waits for it
      const p = await t.page({ state: L.member({ focus: ['full'] }), go: false });
      const coachIn = await app.holdCoach(p);
      await p.goto(p.srv.home + 'index.html');
      await L.settle(p, { threeD: false });
      await toAnswers(p);
      await app.tap(p, '[data-row="focus"]');
      await expectStep(t, p, 'focus');
      await app.tap(p, '[data-act="ob-multi"][data-k="focus"][data-v="legs"]');
      t.equal([await p.evaluate(() => WBF.fig3d.ready()), await app.maps(p)], [false, [false]], 'before the coach is let in [coach in, map showing]');
      await coachIn();
      t.equal(await app.maps(p), [true], 'the map once the coach is in (true: showing)');
      await t.look(p, 'focus step after a late coach');
    });
  }
};

if (require.main === module) L.main([module.exports]);
