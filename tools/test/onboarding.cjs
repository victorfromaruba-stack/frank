// onboarding: the whole onboarding tapped through like a person, once in cm/kg and once in ft/lb, to a built plan.
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
const cont = (p) => app.tap(p, '.part .btn');
// popstate events in the next ms: Back may not keep going back by itself (the old Back loop fired about 1,100 a second)
const popsIn = (p, ms = 600) => p.evaluate((w) => new Promise((r) => {
  let n = 0; const f = () => n++;
  addEventListener('popstate', f);
  setTimeout(() => { removeEventListener('popstate', f); r(n); }, w);
}), ms);
const bookkeeping = (pr) => Object.keys(pr || {}).filter((k) => ['only', 'edit', 'soreDone'].includes(k));
// the eight health questions (PAR-Q+ and pregnancy)
const healthKeys = (p) => p.evaluate(() => WBF.PARQ.map((q) => q[0]).concat(['pregnant']));
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
// Me > Edit tapped through like a person: the saved answer on every step, then "Build my plan". on(question) may change
// something first; it returns true when its tap already moved on to the next step.
async function editAll(p, on) {
  await app.tap(p, '.tab[data-tab="me"]');
  await app.tap(p, '[data-act="ob-edit"]');
  await expectStep(null, p, 'main goal');
  const seen = [];
  for (let i = 0; i < 30; i++) {
    const q = await question(p);
    seen.push(q);
    if (on && await on(q)) continue;
    if (await p.locator('[data-act="ob-build"]').count()) { await app.tap(p, '[data-act="ob-build"]'); return seen; }
    if (await p.locator('.ob-cta [data-act="ob-next"]').count()) await next(p);
    else await app.tap(p, '[data-act="ob-pick"][aria-pressed="true"]');
  }
  throw new Error('Edit never reached "Build my plan": ' + seen.join(' › '));
}
const pickGoal = (p, g) => async (q) => {
  if (!/main goal/i.test(q)) return false;
  await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="' + g + '"]');
  return true;
};

// One person from the welcome screen to a plan. o: the answers and the checks that depend on them.
async function walk(t, o) {
  const p = await t.page();
  t.step('welcome');
  await app.tap(p, '[data-act="ob-start"]');
  await expectStep(t, p, 'Part 1');

  t.step('part 1');
  await cont(p);
  await expectStep(t, p, 'main goal');
  await t.look(p, 'goal');
  await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="' + o.goal + '"]');
  await expectStep(t, p, 'focus');
  t.check(await p.locator('.ob-cta [data-act="ob-next"]').isDisabled(), 'focus: Next works before anything is picked');
  for (const f of o.focus) await app.tap(p, '[data-act="ob-multi"][data-k="focus"][data-v="' + f + '"]');
  for (const f of o.focus) t.equal(await p.locator('[data-k="focus"][data-v="' + f + '"]').getAttribute('aria-checked'), 'true', 'focus ' + f + ' ticked');
  await t.look(p, 'focus');
  await next(p);
  await expectStep(t, p, 'most');
  for (const w of o.want) await app.tap(p, '[data-act="ob-multi"][data-k="want"][data-v="' + w + '"]');
  // back keeps the answers
  await app.tap(p, '[data-act="ob-back"]');
  await expectStep(t, p, 'focus');
  for (const f of o.focus) t.equal(await p.locator('[data-k="focus"][data-v="' + f + '"]').getAttribute('aria-checked'), 'true', 'focus ' + f + ' kept after Back');
  await next(p);
  await expectStep(t, p, 'most');
  for (const w of o.want) t.equal(await p.locator('[data-k="want"][data-v="' + w + '"]').getAttribute('aria-checked'), 'true', 'want ' + w + ' kept after Back');
  await next(p);

  t.step('part 2');
  await expectStep(t, p, 'Part 2');
  await cont(p);
  await expectStep(t, p, 'demonstrate');
  await t.look(p, 'who demonstrates');
  await app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="' + o.sex + '"]');
  await expectStep(t, p, 'born');
  await t.look(p, 'year of birth');
  await app.tap(p, '#wheel button[data-year="' + o.born + '"]');
  await p.waitForFunction((y) => { const b = document.querySelector('#wheel button.on'); return b && b.getAttribute('data-year') === String(y); }, o.born, { timeout: 5000 })
    .catch(() => t.fail('year wheel: tapping ' + o.born + ' did not select it'));
  t.equal(await p.locator('#born-warn').isVisible(), o.born >= 2008, 'under-18 note showing (born ' + o.born + ')');
  await next(p);

  // the health questions come before height and weight (a yes changes what those steps may say)
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

  t.step('height');
  await expectStep(t, p, 'tall');
  if (o.imperial) {
    await app.tap(p, '[data-act="hunits"][data-v="ft"]');
    const shown = await p.evaluate(() => document.getElementById('rv-h').innerText.replace(/\s+/g, ' ').trim());
    t.check(/^\d ?ft \d{1,2} ?in$/.test(shown), 'height in ft shows "' + shown + '"');
  }
  const h = await app.slideRuler(p, 'h', o.heightSteps);
  t.equal(h.text.replace(/\s/g, ''), o.heightShows.replace(/\s/g, ''), 'height after sliding the ruler');
  await t.look(p, 'height ' + (o.imperial ? 'ft' : 'cm'));
  await next(p);

  t.step('weight');
  await expectStep(t, p, 'current');
  if (o.imperial) await app.tap(p, '[data-act="units"][data-v="lb"]');
  const w = await app.slideRuler(p, 'w', o.weightSteps);
  t.equal(w.text.replace(/\s/g, ''), o.weightShows.replace(/\s/g, ''), 'weight after sliding the ruler');
  t.has(await p.locator('#bmi-box').innerText(), o.bmiWord, 'BMI box');
  await t.look(p, 'weight ' + (o.imperial ? 'lb' : 'kg'));
  await next(p);

  t.step('target');
  await expectStep(t, p, 'target');
  if (o.targetSteps) await app.slideRuler(p, 't', o.targetSteps);
  t.has(await p.locator('#tg-box').innerText(), o.targetSays, 'target box');
  await t.look(p, 'target weight');
  await next(p);

  t.step('sore spots');
  await expectStep(t, p, 'sore spots');
  if (!o.sore.length) await app.tap(p, '[data-act="ob-none"]');
  for (const s of o.sore) await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="' + s + '"]');
  if (o.soreSays) t.has(await app.text(p), o.soreSays, 'sore spot line');
  await t.look(p, 'sore spots');
  await next(p);

  t.step('part 3');
  await expectStep(t, p, 'Part 3');
  await cont(p);
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
  await expectStep(t, p, 'days a week');
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="' + o.days + '"]');
  t.equal(await p.locator('[data-k="days"][aria-pressed="true"]').getAttribute('data-v'), String(o.days), 'days picked');
  await next(p);
  await expectStep(t, p, 'How long');
  // 45 minutes is more than either person's first week fills: the step says how long their sessions really are
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="45"]');
  t.has(await p.locator('#min-real').innerText().catch(() => 'nothing'), /Your first sessions take \d+( to \d+)? minutes/, 'minutes step at 45');
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="' + o.minutes + '"]');
  t.equal(await p.locator('#min-real').count(), 0, 'real-length line at ' + o.minutes + ' minutes, which the sessions fill');
  await next(p);
  await expectStep(t, p, 'home');
  for (const k of o.kitTaps) await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="' + k + '"]');
  await t.look(p, 'kit');
  await next(p);
  await expectStep(t, p, 'coach');
  await t.look(p, 'meet your coach');
  await next(p);
  await expectStep(t, p, 'call');
  if (o.name) await p.fill('#ob-name', o.name);
  await app.tap(p, '[data-act="ob-build"]');

  t.step('build and summary');
  await app.waitText(p, 'Building your plan', 5000);
  const build = await p.locator('#b-steps').innerText();
  for (const line of o.buildSays) t.has(build, line, 'build steps');
  // the doses line names the level the plan really uses (a PAR-Q yes keeps it at beginner), in plain English
  t.has(build, new RegExp('Setting doses for ' + { b: 'beginners', i: 'intermediates', a: 'advanced' }[o.planLevel] + '$', 'im'), 'build steps');
  t.lacks(build, /advanceds/i, 'build steps');
  t.lacks(build, /moves for (lose|build|move|stay)/i, 'build steps');
  const sched = /Scheduling (\d) days a week, (\d+)(?: to (\d+))? minutes each/.exec(build);
  t.check(sched, () => 'build steps: no "Scheduling N days a week, M minutes each" line in "' + build.replace(/\s+/g, ' ') + '"');
  await expectStep(t, p, 'Your plan is ready');
  const sum = await app.text(p);
  for (const line of o.summarySays) t.has(sum, line, 'summary');
  const sumMin = await p.evaluate(() => { const s = [...document.querySelectorAll('.summary .trio span')].find((x) => x.textContent === 'Minutes'); return s ? +s.previousElementSibling.textContent : null; });
  await t.look(p, 'summary');
  await app.tap(p, '[data-act="ob-finish"]');
  p.qa = { sched: sched ? [+sched[1], +sched[2], +(sched[3] || sched[2])] : null, sumMin };
  return p;
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
  t.equal(pr.days, o.days, 'saved days');
  t.equal(pr.minutes, o.minutes, 'saved minutes');
  t.equal(pr.kit.slice().sort(), o.kit.slice().sort(), 'saved kit');
  t.equal(pr.name || '', o.name || '', 'saved name');
  t.equal(pr.start, L.TODAY, 'plan start');
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
  if (o.healthYes.length) t.equal(plan.cardio, 0, 'cardio days in gentle mode');
  // real lengths: the summary's minutes are the 28 days' sessions added up; the build step names week 1's shortest and longest
  const all = await realSecs(p), wk1 = minutesOf(await realSecs(p, 1));
  t.near(p.qa.sumMin, all.reduce((a, b) => a + b, 0) / 60, 1, 'summary minutes against the sessions the plan builds');
  t.equal(p.qa.sched, [o.days, Math.min(...wk1), Math.max(...wk1)], 'build step "Scheduling N days a week, M to M minutes" against week 1 [days, shortest, longest]');
}

const METRIC = {
  imperial: false, goal: 'fat', focus: ['abs', 'legs'], want: ['energy', 'sleep'], sex: 'm', born: 1990,
  heightSteps: 2, heightShows: '180cm', cm: 180,
  weightSteps: -2, weightShows: '79kg', kg: 79, bmiWord: 'Healthy',
  targetSteps: -1, targetSays: 'lose 7.6%',                  // 79 kg: the ruler starts at 73.5 (7% less), one mark down is 73
  healthYes: [], healthNone: true, sore: [], soreSays: null,
  activeRight: -1, activeSays: 'I sit most of the day',
  push: 2, testLevel: 'Intermediate', planLevel: 'i',
  days: 4, minutes: 30, kitTaps: ['db'], kit: ['chair', 'table', 'db'], name: 'Sam',
  buildSays: ['Choosing moves to lose fat', 'Setting doses for intermediates', 'Scheduling 4 days a week', 'abs and legs & glutes'],
  // the minutes are the real total, checked against the plan in checkSaved (not 16 workouts x 30 = 480)
  summarySays: ['Done, Sam', '180', '79', 'Age', '36', 'BMI 24.4', 'Lose fat', 'Target weight', '−6 kg', 'Intermediate', 'Abs, Legs & glutes', '28-day fat burner']
};
const IMPERIAL = {
  imperial: true, goal: 'strength', focus: ['full'], want: [], sex: 'f', born: 1958,
  heightSteps: 2, heightShows: '5ft7in', cm: 67 * 2.54,             // 165 cm is 65 in (5 ft 5 in); two marks up: 5 ft 7 in
  weightSteps: 4, weightShows: '147lb', kg: 147 / 2.20462, bmiWord: 'Healthy',      // 65 kg is 143 lb
  targetSteps: 0, targetSays: 'Keep your weight',
  healthYes: ['joint'], sore: ['knee', 'other'], soreSays: 'Moves that load your knee are left out or swapped, and jumps are left out. For the other spot',
  activeRight: 1, activeSays: "I'm on my feet and moving a lot",
  push: 3, testLevel: 'Advanced', planLevel: 'b',
  days: 2, minutes: 10, kitTaps: ['table'], kit: ['chair'], name: '',
  buildSays: ['Choosing moves to build strength', 'Leaving out moves that load your knee', 'Leaving out jumps for your other sore spot', 'Setting doses for beginners', 'Scheduling 2 days a week'],
  summarySays: ['Your plan is ready', '5′7″', '147', '68', 'Build strength', 'Keep', 'Beginner', 'Full body', 'Knee, Other', 'Gentle mode', '28-day strength builder']
};

module.exports = {
  name: 'onboarding',
  about: 'the whole onboarding by tapping, in cm/kg and in ft/lb, to a built plan, with real session lengths; Me: change sore spots, Edit and Back, Edit after an old Change, Edit keeps the health answers, Edit all the way, Edit keeps weights and ticks, a new goal or new days ask first; the name step across a coach load',
  async run(t) {
    await t.flow('metric (cm, kg)', async () => {
      const o = METRIC;
      const p = await walk(t, o);
      t.step('paywall and plan');
      await app.waitTitle(p, 'Membership');
      t.has(await app.text(p), 'Get your personal plan', 'paywall after onboarding');
      await app.tap(p, '[data-act="pay-trial"]');
      await app.waitTitle(p, 'Plan');
      t.has(await app.toast(p), '7-day free trial has started', 'toast');
      const txt = await app.text(p);
      t.has(txt, 'Start day 1', 'plan');
      t.has(txt, '28-day fat burner', 'plan');
      // the plan card gives the next session's real length, not the minutes picked
      const day1 = minutesOf((await realSecs(p, 1)).slice(0, 1))[0];
      t.has(await p.locator('.pc-grid').innerText(), new RegExp('\\b' + day1 + ' min\\s+Next session', 'i'), 'plan card');
      t.equal(await p.locator('.wk-days button.dd').count(), o.days * 4, 'training days on the 28-day grid');
      await t.look(p, 'plan after onboarding');
      await checkSaved(t, p, o);
      const s = await app.stored(p);
      t.equal(s.access && s.access.trialStart, L.TODAY, 'trial start');
    });

    await t.flow('imperial (ft, lb)', async () => {
      const o = IMPERIAL;
      const p = await walk(t, o);
      t.step('paywall closed, plan');
      await app.waitTitle(p, 'Membership');
      await app.tap(p, '[data-act="pay-close"]');
      await app.waitTitle(p, 'Plan');
      t.has(await app.text(p), 'Beginner', 'plan level in gentle mode');
      t.equal(await p.locator('.wk-days button.dd').count(), o.days * 4, 'training days on the 28-day grid');
      await checkSaved(t, p, o);
      const s = await app.stored(p);
      t.check(!s.access || !s.access.trialStart, 'closing the paywall started the trial');
      await app.tap(p, '.tab[data-tab="me"]');
      const me = await app.text(p);
      t.has(me, 'trial starts with your first workout', 'Me membership');
      t.has(me, 'Cleared by a doctor', 'Me health switch');
      t.has(me, 'Sore spots: Knee, Other', 'Me');
      await t.look(p, 'me after onboarding');
    });

    // Me can reopen the onboarding: one step (sore spots) or the whole profile (Edit)
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

    await t.flow('Me: Edit, then back', async () => {
      // the back arrow and the phone's Back step back through Edit to Me, once: no Back loop
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="ob-edit"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-back"]');
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.step("the phone's Back");
      await app.tap(p, '[data-act="ob-edit"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][aria-pressed="true"]');
      await expectStep(t, p, 'focus');
      await p.evaluate(() => history.back());
      await expectStep(t, p, 'main goal');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Me', 5000);
      t.equal(await popsIn(p), 0, 'popstate events once back on Me');
      t.equal(bookkeeping((await app.stored(p)).profile), [], 'onboarding bookkeeping saved in the profile');
    });

    await t.flow('Me: Edit after an old Change', async () => {
      // phones that used Change before the fix saved only:"sore" in the profile. Edit must not act as a one-step edit:
      // the goal goes on to the next step (the old code saved there and looped), Back twice returns to Me, and the next save drops it
      const p = await t.page({ state: L.member({ only: 'sore', soreDone: true }) });
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="ob-edit"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][aria-pressed="true"]');
      await expectStep(t, p, 'focus');
      await app.tap(p, '[data-act="ob-back"]');
      await expectStep(t, p, 'main goal');
      await app.tap(p, '[data-act="ob-back"]');
      await app.waitTitle(p, 'Me', 5000);
      await app.tap(p, '[data-act="ob-edit-step"][data-step="sore"]');
      await expectStep(t, p, 'sore spots');
      await next(p);
      await app.waitTitle(p, 'Me', 5000);
      t.equal(bookkeeping((await app.stored(p)).profile), [], 'onboarding bookkeeping left in the profile');
    });

    await t.flow('Me: Edit keeps the health answers; the minutes step gives real lengths', async () => {
      // a beginner who picked 45 minutes; one PAR-Q yes (cleared by a doctor) and an older profile that never stored a No
      const p = await t.page({ state: L.member({ level: 'b', push: 0, goal: 'fat', days: 4, minutes: 45, focus: ['full'], health: { joint: true, cleared: true } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="ob-edit"]');
      await expectStep(t, p, 'main goal');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'health' }));
      await expectStep(t, p, 'Before you');
      const keys = await healthKeys(p);
      const shown = await p.evaluate((ks) => ks.map((k) => { const b = document.querySelector('[data-act="ob-health"][data-k="' + k + '"][aria-pressed="true"]'); return b ? b.textContent : '-'; }), keys);
      t.equal(shown, keys.map((k) => (k === 'joint' ? 'Yes' : 'No')), 'saved answers on the health step (' + keys.join(', ') + ')');
      t.check(await p.locator('.ob-cta [data-act="ob-next"]').isEnabled(), 'health: Next is off although every answer is saved');
      t.step('minutes');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'minutes' }));
      await expectStep(t, p, 'How long');
      const wk1 = minutesOf(await realSecs(p, 1));
      const range = Math.min(...wk1) === Math.max(...wk1) ? Math.min(...wk1) + ' minutes' : Math.min(...wk1) + ' to ' + Math.max(...wk1) + ' minutes';
      t.has(await p.locator('#min-real').innerText().catch(() => 'nothing'), 'Your first sessions take ' + range + '.', 'minutes step for a beginner at 45 minutes');
      t.check(Math.max(...wk1) <= 42, 'control: a beginner\'s first week should run well under 45 minutes (got ' + wk1.join(', ') + ')');
      await t.look(p, 'minutes step with real lengths');
    });

    await t.flow('Me: Edit, all the way', async () => {
      // every step shows the saved answer; Next through all of them, change the days, build: the plan follows
      const before = L.profile();
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="ob-edit"]');
      await expectStep(t, p, 'main goal');
      const steps = [];
      for (let i = 0; i < 30; i++) {
        const q = await question(p);
        steps.push(q.split(' ').slice(0, 5).join(' '));
        if (await p.locator('[data-act="ob-build"]').count()) { await app.tap(p, '[data-act="ob-build"]'); break; }
        if (await p.locator('.part').count()) { await cont(p); continue; }
        if (/days a week/i.test(q)) await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="5"]');
        const nx = p.locator('.ob-cta [data-act="ob-next"]');
        if (await nx.count()) {
          t.check(await nx.isEnabled(), 'Next is off on "' + q.slice(0, 40) + '" although the answer is saved');
          await next(p);
        } else {                                              // goal, who demonstrates: tap the saved answer again
          const on = p.locator('[data-act="ob-pick"][aria-pressed="true"]');
          t.check(await on.count(), 'no saved answer marked on "' + q.slice(0, 40) + '"');
          await (await on.count() ? on.first() : p.locator('[data-act="ob-pick"]').first()).click();
          await p.waitForTimeout(150);
        }
      }
      t.log(steps.join(' › '));
      t.check(!steps.some((s) => /^part \d/i.test(s)), () => 'Edit shows a Part intro going forward (going back it skips them): ' + steps.join(' › '));
      await app.waitTitle(p, 'Plan');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after Edit');
      const pr = (await app.stored(p)).profile;
      t.equal(pr.days, 5, 'days after Edit');
      t.equal([pr.goal, pr.sex, pr.birthYear, pr.cm, pr.kg, pr.focus, pr.kit, pr.name], [before.goal, before.sex, before.birthYear, before.cm, before.kg, before.focus, before.kit, before.name],
        'answers kept by Edit [goal, sex, born, cm, kg, focus, kit, name]');
      t.equal(Object.keys(pr).filter((k) => ['only', 'edit', 'soreDone'].includes(k)), [], 'onboarding bookkeeping saved in the profile');
      t.equal(await p.locator('.wk-days button.dd').count(), 20, 'training days on the 28-day grid after Edit');
    });

    await t.flow('Me: Edit with no changes keeps the weights and the ticks', async () => {
      // 76.4 kg logged by hand today; the onboarding said 80. Tapping through Edit changes nothing at all
      const st = ticked({ weights: [{ date: L.isoDay(-7), kg: 80 }, { date: L.TODAY, kg: 76.4 }] });
      const p = await t.page({ state: st });
      let ruler = null;
      await editAll(p, async (q) => { if (/current weight/i.test(q)) ruler = await p.locator('#rv-w').innerText(); });
      t.equal((ruler || '').replace(/\s/g, ''), '76.5kg', 'weight step after 76.4 kg was logged today (the ruler\'s nearest mark)');
      await app.waitTitle(p, 'Plan');
      t.equal(await app.toast(p), 'Saved', 'toast after an Edit with no changes');
      const s = await app.stored(p);
      t.equal([s.weights, s.profile.start, s.done], [st.weights, st.profile.start, st.done], 'after an Edit with no changes [weights, plan start, ticks]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after an Edit with no changes');
    });

    await t.flow('Me: Edit with the kit reordered, a No tapped again and new minutes keeps the ticks', async () => {
      // an older profile that never stored its No answers; the last weight is from yesterday
      const st = ticked({ weights: [{ date: L.isoDay(-1), kg: 79 }] }, { health: {} });
      const p = await t.page({ state: st });
      await editAll(p, async (q) => {
        if (/Before you/i.test(q)) await app.tap(p, '[data-act="ob-health"][data-k="heart"][data-v="0"]');
        if (/at home/i.test(q)) { await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="chair"]'); await app.tap(p, '[data-act="ob-multi"][data-k="kit"][data-v="chair"]'); }
        if (/How long/i.test(q)) await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="30"]');
        return false;
      });
      await app.waitTitle(p, 'Plan');
      t.equal(await app.overlay(p), '', 'a question after an Edit that keeps the goal and the days');
      t.equal(await app.toast(p), 'Your plan was updated', 'toast after new minutes');
      const s = await app.stored(p);
      t.equal([s.done, s.profile.start, s.profile.minutes, s.profile.kit.slice().sort(), s.weights], [st.done, st.profile.start, 30, ['chair', 'db', 'table'], st.weights],
        'after the Edit [ticks, plan start, minutes, kit, weights]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after the Edit');
    });

    await t.flow('Me: Edit with a new goal or new days asks first', async () => {
      const st = ticked();
      const p = await t.page({ state: st });
      t.step('a new goal: Keep my progress');
      await editAll(p, pickGoal(p, 'strength'));
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after a new goal');
      t.equal(await p.$$eval('#overlay button', (bs) => bs.map((b) => b.textContent)), ['Keep my progress', 'Restart'], 'the question\'s buttons');
      await t.look(p, 'restart question');
      await app.tap(p, '[data-act="modal-no"]');
      await app.waitTitle(p, 'Plan');
      t.equal(await app.toast(p), 'Your plan was updated', 'toast after Keep my progress');
      let s = await app.stored(p);
      t.equal([s.profile.goal, s.done, s.profile.start], ['strength', st.done, st.profile.start], 'Keep my progress [goal, ticks, plan start]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 1, 'days ticked on the 28-day grid after Keep my progress');
      t.step('new days: Restart');
      await editAll(p, async (q) => { if (/days a week/i.test(q)) await app.tap(p, '[data-act="ob-pick-stay"][data-k="days"][data-v="5"]'); return false; });
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after new days');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      t.equal(await app.toast(p), 'Your plan was updated', 'toast after Restart');
      s = await app.stored(p);
      t.equal([s.profile.days, s.done, s.profile.start, s.sessions.length], [5, {}, L.TODAY, 1], 'Restart [days, ticks, plan start, workouts kept]');
      t.equal(await p.locator('.wk-days button.dd.done').count(), 0, 'days ticked on the 28-day grid after Restart');
    });

    await t.flow("Me: Edit, the phone's Back on the restart question", async () => {
      // Back closes the question as "Keep my progress", once: the next Back leaves the app from the plan
      const st = ticked();
      const p = await t.page({ state: st });
      const inApp = () => p.url().startsWith(p.srv.url);
      await editAll(p, pickGoal(p, 'move'));
      t.has(await app.overlay(p), 'Restart your 28 days?', 'question after a new goal');
      await p.evaluate(() => history.back());
      await app.waitTitle(p, 'Plan', 5000);
      t.equal(await app.overlay(p), '', 'the question after the phone\'s Back');
      const s = await app.stored(p);
      t.equal([s.profile.goal, s.done, s.profile.start], ['move', st.done, st.profile.start], "the phone's Back on the question [goal, ticks, plan start]");
      await p.waitForFunction(() => history.state && history.state.wbf === 1, null, { timeout: 5000 }).catch(() => null);
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await p.waitForURL((u) => !u.href.startsWith(p.srv.url), { timeout: 5000 }).catch(() => null);
      t.check(!inApp(), () => "the phone's Back on the plan did not leave the app (still on " + p.url() + ')');
    });

    await t.flow('name step: a coach loading keeps the name', async () => {
      // 'wbf-three' fires each time a coach finishes loading (the female one a few seconds after "Who should demonstrate"),
      // on whichever step is showing then: the figures change, what the person typed stays
      const p = await t.page();
      await p.evaluate(() => window.dispatchEvent(new Event('wbf-three')));
      await t.look(p, 'welcome after a coach load');
      await app.tap(p, '[data-act="ob-start"]');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'name' }));
      await expectStep(t, p, 'call');
      await p.locator('#ob-name').click();
      await p.keyboard.type('Mari', { delay: 40 });
      await p.evaluate(() => window.dispatchEvent(new Event('wbf-three')));
      await p.keyboard.type('ana', { delay: 40 });
      t.equal(await p.locator('#ob-name').inputValue(), 'Mariana', 'name typed across a coach load');
      t.equal(await p.evaluate(() => document.activeElement && document.activeElement.id), 'ob-name', 'keyboard focus after a coach load');
      await app.tap(p, '[data-act="ob-back"]');
      await expectStep(t, p, 'coach');
      await next(p);
      await expectStep(t, p, 'call');
      t.equal(await p.locator('#ob-name').inputValue(), 'Mariana', 'name after Back and Next');
    });
  }
};

if (require.main === module) L.main([module.exports]);
