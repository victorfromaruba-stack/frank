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
  if (o.born > 2008) t.has(await app.text(p), 'made for adults', 'under-18 note');
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

  t.step('health');
  await expectStep(t, p, 'Before you');
  t.equal(await p.locator('[data-act="ob-health"][data-v="1"][aria-pressed="true"]').count(), 0, 'health questions answered yes before any tap');
  for (const k of o.healthYes) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="1"]');
  if (o.healthYes.length) t.has(await app.text(p), 'Check with your doctor', 'PAR-Q warning');
  else t.lacks(await app.text(p), 'Check with your doctor', 'health step with all No');
  await t.look(p, 'health questions');
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
  await app.tap(p, '[data-act="ob-pick-stay"][data-k="minutes"][data-v="' + o.minutes + '"]');
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
  t.has(build, new RegExp('Setting doses for ' + { b: 'beginner', i: 'intermediate', a: 'advanced' }[o.planLevel], 'i'), 'build steps');
  t.lacks(build, /advanceds/i, 'build steps');
  await expectStep(t, p, 'Your plan is ready');
  const sum = await app.text(p);
  for (const line of o.summarySays) t.has(sum, line, 'summary');
  await t.look(p, 'summary');
  await app.tap(p, '[data-act="ob-finish"]');
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
  t.equal(Object.keys(pr.health).filter((k) => pr.health[k]), o.healthYes, 'saved health answers');
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
}

const METRIC = {
  imperial: false, goal: 'fat', focus: ['abs', 'legs'], want: ['energy', 'sleep'], sex: 'm', born: 1990,
  heightSteps: 2, heightShows: '180cm', cm: 180,
  weightSteps: -2, weightShows: '79kg', kg: 79, bmiWord: 'Healthy',
  targetSteps: -1, targetSays: 'lose 7.6%',                  // 79 kg: the ruler starts at 73.5 (7% less), one mark down is 73
  healthYes: [], sore: [], soreSays: null,
  activeRight: -1, activeSays: 'I sit most of the day',
  push: 2, testLevel: 'Intermediate', planLevel: 'i',
  days: 4, minutes: 30, kitTaps: ['db'], kit: ['chair', 'table', 'db'], name: 'Sam',
  buildSays: ['lose fat', 'intermediates', '4 days a week, 30 minutes each', 'abs and legs & glutes'],
  summarySays: ['Done, Sam', '180', '79', 'Age', '36', 'BMI 24.4', 'Lose fat', '−6 kg', 'Intermediate', 'Abs, Legs & glutes', '28-day fat burner', '480']
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
  buildSays: ['build strength', 'Leaving out moves that load your knee', 'Leaving out jumps for your other sore spot', '2 days a week, 10 minutes each'],
  summarySays: ['Your plan is ready', '5′7″', '147', '68', 'Build strength', 'Keep', 'Beginner', 'Full body', 'Knee, Other', 'Gentle mode', '28-day strength builder']
};

module.exports = {
  name: 'onboarding',
  about: 'the whole onboarding by tapping, in cm/kg and in ft/lb, to a built plan; then editing a step from Me',
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
      t.equal(await p.locator('.wk-days button.dd').count(), o.days * 4, 'training days on the 28-day grid');
      await t.look(p, 'plan after onboarding');
      await checkSaved(t, p, o);
      const s = await app.stored(p);
      t.equal(s.access && s.access.trialStart, L.TODAY, 'trial start');

      t.step('edit sore spots from Me');
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Sore spots: none', 'Me');
      await app.tap(p, '[data-act="ob-edit-step"][data-step="sore"]');
      await expectStep(t, p, 'sore spots');
      await app.tap(p, '[data-act="ob-multi"][data-k="injuries"][data-v="shoulder"]');
      await next(p);
      await app.waitTitle(p, 'Me');
      t.has(await app.toast(p), 'Your plan was updated', 'toast after the edit');
      t.has(await app.text(p), 'Sore spots: Shoulder', 'Me after the edit');
      t.equal((await app.stored(p)).profile.injuries, ['shoulder'], 'saved sore spots after the edit');
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
  }
};

if (require.main === module) L.main([module.exports]);
