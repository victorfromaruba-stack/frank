// safety: the app's hard rules. No diet advice for anyone pregnant, under 18 or with a medical condition; plans
// leave out what pregnancy, a PAR-Q yes, age 60+ or a sore spot rule out; no made-up social proof.
'use strict';
const zlib = require('zlib');
const L = require('./lib.cjs');
const { app } = L;

// a move link's code as js/keep.js makes one ('z', the JSON packed with deflate-raw, base64url), for a backup's contents
const moveCode = (data) => 'z' + zlib.deflateRawSync(Buffer.from(JSON.stringify({ app: 'wellness-by-frank', v: 1, data }))).toString('base64url');

// every move of every plan day and every catalogue workout for the saved profile, checked against WBF.plan.safe
async function planAudit(p) {
  return p.evaluate(() => {
    const pr = WBF.app.state().profile, av = WBF.plan.avoidFor(pr), EX = WBF.EX;
    const out = { unsafe: [], days: 0, noBalance: [], vigorous: [], cardioDays: 0, level: WBF.plan.levelFor(pr), jumps: [], supine: [], kit: [], stress: [] };
    const scan = (where, s) => s.steps.forEach((st) => {
      const e = EX[st.ex];
      if (!WBF.plan.safe(e, av)) out.unsafe.push(where + ':' + st.ex);
      if (e.jump) out.jumps.push(where + ':' + st.ex);
      if (e.met >= 7) out.vigorous.push(where + ':' + st.ex);
      if (e.pos === 'supine' || e.pos === 'prone') out.supine.push(where + ':' + st.ex);
      (e.eq || []).forEach((k) => { if (k === 'pad' || k === 'rings') out.kit.push(where + ':' + st.ex); });
      (e.stress || []).forEach((j) => { if ((pr.injuries || []).includes(j)) out.stress.push(where + ':' + st.ex + '(' + j + ')'); });
    });
    WBF.plan.days(pr).forEach((d) => {
      if (!d.train) return;
      out.days++;
      if (/^cardio/.test(d.workoutId)) out.cardioDays++;
      const s = WBF.app.session(d.workoutId, d);
      scan('day' + d.day, s);
      if (!s.steps.some((st) => EX[st.ex].pattern === 'balance')) out.noBalance.push(d.day);
    });
    WBF.WORKOUTS.forEach((w) => scan(w.id, WBF.app.session(w.id)));
    return out;
  });
}

// the food card on Today: true when it only refers to a dietitian or doctor
async function foodRefers(p) {
  await app.tap(p, '.tab[data-tab="today"]');
  return p.evaluate(() => ({
    refers: /talk to a dietitian or your doctor/i.test(document.body.innerText),
    tracker: !!document.querySelector('#meal-in'),
    habits: /General habits, not a diet/i.test(document.body.innerText)
  }));
}
// a switch on the food card: "on" or "off", and ", locked" when the profile sets it (Today must be showing)
const flagSwitch = (p, k) => p.evaluate((x) => {
  const b = document.querySelector('[data-act="flag"][data-k="' + x + '"]');
  return b ? (b.getAttribute('aria-checked') === 'true' ? 'on' : 'off') + (b.disabled ? ', locked' : '') : 'missing';
}, k);
// Me's weight card, as text
async function weightCard(p) {
  await app.tap(p, '.tab[data-tab="me"]');
  return p.evaluate(() => { const c = document.querySelector('.wt-top'); return c ? c.closest('.card').innerText : ''; });
}
const Y = +L.TODAY.slice(0, 4);                                  // the tests' year
const question = (p) => p.evaluate(() => { const q = document.querySelector('.ob-q, .part'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; });
const next = (p) => app.tap(p, '.ob-cta [data-act="ob-next"]');
const weights = (kg) => [{ date: L.isoDay(-7), kg: kg + 1 }, { date: L.TODAY, kg }];
// the health questions on the health step with no answer (neither button pressed)
const openHealth = (p) => p.evaluate(() => WBF.PARQ.map((q) => q[0]).concat(['pregnant'])
  .filter((k) => !document.querySelector('[data-act="ob-health"][data-k="' + k + '"][aria-pressed="true"]')));
// Me > Edit, then the saved answer on every step to "Build my plan". A health question the profile never answered
// (older versions saved only the questions tapped) waits for an answer: it gets No. Returns the steps it showed, the
// questions it found open and the BMI box
async function editThrough(p) {
  await app.tap(p, '.tab[data-tab="me"]');
  await app.tap(p, '[data-act="ob-edit"]');
  const seen = [];
  let bmi = null, open = null;
  for (let i = 0; i < 30; i++) {
    const q = await question(p);
    seen.push(q);
    if (/current weight/i.test(q)) bmi = await p.locator('#bmi-box').innerText();
    if (/Before you/i.test(q)) {
      open = await openHealth(p);
      for (const k of open) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="0"]');
    }
    if (await p.locator('[data-act="ob-build"]').count()) { await app.tap(p, '[data-act="ob-build"]'); return { seen, bmi, open }; }
    if (await p.locator('.ob-cta [data-act="ob-next"]').count()) await next(p);
    else await app.tap(p, '[data-act="ob-pick"][aria-pressed="true"]');
  }
  throw new Error('Edit never reached "Build my plan": ' + seen.join(' › '));
}

module.exports = {
  name: 'safety',
  about: 'no diet advice, food or drink lesson, water goal or weight target when pregnant, maybe under 18 or with a medical condition (onboarding, Edit, Me, Today, Plan, older saved data); every health question answered on purpose, in Edit too; pregnancy, PAR-Q, 60+ and sore-spot rules in every plan and in the sheet\'s other options; no fake social proof',
  async run(t) {
    await t.flow('food card', async () => {
      const adult = await t.page({ state: L.member() });
      let f = await foodRefers(adult);
      t.check(f.tracker && !f.refers, 'an adult with no flags should get the food journal');
      await t.look(adult, 'today food journal');
      // ticking "A medical condition" in the card switches the journal off
      await adult.locator('details.card summary').click();
      await app.tap(adult, '[data-act="flag"][data-k="medical"]');
      f = await foodRefers(adult);
      t.check(f.refers && !f.tracker, 'medical condition: the food card still gives the journal');
      await t.look(adult, 'today food medical');

      const preg = await t.page({ state: L.member({ sex: 'f', health: { pregnant: true } }) });
      f = await foodRefers(preg);
      t.check(f.refers && !f.tracker && !f.habits, 'pregnant: the food card still gives the journal or diet habits');
      const teen = await t.page({ state: L.member({ birthYear: 2010 }) });
      f = await foodRefers(teen);
      t.check(f.refers && !f.tracker && !f.habits, 'under 18: the food card still gives the journal or diet habits');
      t.equal(await flagSwitch(teen, 'child'), 'on, locked', 'under 18: the "Under 18" switch');
    });

    await t.flow('food card: the switches stay', async () => {
      // a switch set by hand survives Me > Pregnancy mode on and off, and an Edit
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="today"]');
      await p.locator('details.card summary').click();
      await app.tap(p, '[data-act="flag"][data-k="medical"]');
      t.check((await foodRefers(p)).refers, 'medical switch: the food card gives the journal');
      t.step('Me > Pregnancy mode on, then off');
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="health"][data-k="pregnant"]');
      await app.tap(p, '[data-act="health"][data-k="pregnant"]');
      let f = await foodRefers(p);
      t.check(f.refers && !f.tracker, 'the medical switch was dropped by Pregnancy mode on, then off');
      t.equal(await flagSwitch(p, 'medical'), 'on', 'medical switch after Pregnancy mode on, then off');
      t.step('Me > Edit');
      await editThrough(p);
      await app.waitTitle(p, 'Plan');
      f = await foodRefers(p);
      t.check(f.refers && !f.tracker, 'the medical switch was dropped by an Edit');
      t.equal((await app.stored(p)).flags, { manual: { medical: true } }, 'saved switches');
      // an older phone kept the switches mixed with the profile's answers: every one that was on stays on
      const old = await t.page({ state: L.member({}, { flags: { pregnant: false, child: false, medical: true } }) });
      f = await foodRefers(old);
      t.check(f.refers && !f.tracker, 'a medical switch saved by an older version: the food card gives the journal');
      t.equal(await flagSwitch(old, 'medical'), 'on', 'a medical switch saved by an older version');
    });

    await t.flow('look around first: no food journal', async () => {
      // no profile: age and health unknown
      const p = await t.page();
      await app.tap(p, '[data-act="browse"]');
      const f = await foodRefers(p);
      t.check(f.refers && !f.tracker && !f.habits, 'no profile (Look around first): the food card gives the journal or diet habits');
      t.has(await app.text(p), 'The food journal comes with your plan', 'food card without a profile');
      await t.look(p, 'today without a profile');
    });

    await t.flow('food and drink: no lesson or water goal when at risk', async () => {
      // on the 22nd the lesson of the day is "Start the day with a full glass of water." for anyone it may go to
      const day = L.isoDay(8), at = { now: L.NOW + 8 * 864e5, threeD: false };
      const foodLesson = /full glass of water|protein in every meal/i;
      const c = await t.page(Object.assign({ state: L.member() }, at));
      await app.tap(c, '.tab[data-tab="today"]');
      t.has(await c.locator('.lesson .note').innerText(), 'full glass of water', 'control: an adult with no health yes, ' + day + ': the lesson of the day');
      t.equal(await c.locator('[data-act="water"]').count(), 8, 'control: an adult with no health yes: glasses on the water card');
      await c.context().close();
      const who = [['pregnant', L.member({ sex: 'f', health: { pregnant: true } })], ['under 18', L.member({ birthYear: Y - 15 })],
        ['PAR-Q chronic yes', L.member({ health: { chronic: true } })], ['the medical switch', L.member({}, { flags: { manual: { medical: true } } })], ['no profile', null]];
      for (const [label, st] of who) {
        const p = await t.page(Object.assign(st ? { state: st } : {}, at));
        if (!st) await app.tap(p, '[data-act="browse"]');
        for (const tb of ['today', 'plan']) {
          await app.tap(p, '.tab[data-tab="' + tb + '"]');
          const lesson = await p.locator('.lesson .note').innerText().catch(() => '');
          t.lacks(lesson, foodLesson, label + ', ' + day + ': ' + tb + ': the lesson of the day');
          t.check(/\w/.test(lesson), label + ', ' + day + ': ' + tb + ': no lesson of the day at all');
          if (tb === 'today') t.equal(await p.locator('[data-act="water"]').count(), 0, label + ': glasses on the water card (8 is a drinking goal)');
        }
        await p.context().close();
      }
    });

    await t.flow('under 18: onboarding gives no weight target or food advice', async () => {
      // a 14-year-old who picks "Lose fat", tapped through from the welcome screen
      const p = await t.page();
      await app.tap(p, '[data-act="ob-start"]');
      await app.tap(p, '.part .btn');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="fat"]');
      await app.tap(p, '[data-act="ob-multi"][data-k="focus"][data-v="full"]');
      await next(p);
      await next(p);                                                        // what you want most
      await app.tap(p, '.part .btn');
      await app.tap(p, '[data-act="ob-pick"][data-k="sex"][data-v="f"]');
      t.step('year of birth');
      t.check(await p.locator('#born-warn').isHidden(), 'the under-18 note shows for the year the wheel starts on');
      await app.tap(p, '#wheel button[data-year="' + (Y - 14) + '"]');
      t.check(await p.locator('#born-warn').isVisible(), 'born ' + (Y - 14) + ': no under-18 note on the way forward');
      t.has(await p.locator('#born-warn').innerText(), "If you're under 18", 'under-18 note');
      await t.look(p, 'year of birth, under 18');
      await next(p);
      t.step('health');
      t.has(await question(p), 'Before you', 'step after the year of birth');
      await app.tap(p, '[data-act="ob-health-none"]');
      await next(p);
      t.step('height and weight');
      t.has(await question(p), 'tall', 'step after the health questions');
      t.lacks(await app.text(p), 'BMI', 'height step under 18');
      await next(p);
      t.has(await question(p), 'current', 'step after height');
      t.equal((await p.locator('#bmi-box').innerText()).trim(), '', 'BMI box under 18');
      await next(p);
      t.step('no target weight');
      t.has(await question(p), 'sore spots', 'step after weight under 18 (the target weight is skipped)');
      await app.tap(p, '[data-act="ob-back"]');
      t.has(await question(p), 'current', 'Back from sore spots under 18 (the target weight is skipped)');
      await next(p);
      await app.tap(p, '[data-act="ob-none"]');
      await next(p);
      await app.tap(p, '.part .btn');
      for (let i = 0; i < 12 && !(await p.locator('[data-act="ob-build"]').count()); i++) {
        if (await p.locator('[data-act="ob-push"]').count() && await p.locator('.ob-cta [data-act="ob-next"]').isDisabled()) await app.tap(p, '[data-act="ob-push"][data-v="0"]');
        await next(p);
      }
      await app.tap(p, '[data-act="ob-build"]');
      await app.waitText(p, 'Your plan is ready', 15000);
      t.step('summary');
      const sum = await app.text(p);
      t.lacks(sum, 'Target weight', 'summary under 18');
      t.lacks(sum, 'BMI', 'summary under 18');
      await t.look(p, 'summary under 18');
      await app.tap(p, '[data-act="ob-finish"]');
      await app.waitTitle(p, 'Membership');
      await app.tap(p, '[data-act="pay-close"]');
      await app.waitTitle(p, 'Plan');
      t.step('saved, Today and Me');
      const pr = (await app.stored(p)).profile;
      t.equal([pr.birthYear, pr.goal, pr.targetKg], [Y - 14, 'fat', null], 'saved [year of birth, goal, target weight]');
      const f = await foodRefers(p);
      t.check(f.refers && !f.tracker && !f.habits, 'under 18 after the onboarding: the food card gives the journal or diet habits');
      t.equal(await flagSwitch(p, 'child'), 'on, locked', 'the "Under 18" switch');
      t.lacks(await app.text(p), 'For fat loss', 'Today: moving minutes under 18');
      const wc = await weightCard(p);
      t.lacks(wc, 'Goal', 'Me weight card under 18');
      t.lacks(wc, 'BMI', 'Me weight card under 18');
      await t.look(p, 'me under 18');
    });

    await t.flow('born 18 years ago: maybe 17', async () => {
      // the age counts the year only: born 18 years ago can still be 17, so it counts as under 18
      const p = await t.page({ state: L.member({ birthYear: Y - 18, goal: 'fat', targetKg: 70 }, { weights: weights(80) }) });
      const f = await foodRefers(p);
      t.check(f.refers && !f.tracker && !f.habits, 'born ' + (Y - 18) + ': the food card gives the journal or diet habits');
      t.equal(await flagSwitch(p, 'child'), 'on, locked', 'born ' + (Y - 18) + ': the "Under 18" switch');
      const wc = await weightCard(p);
      t.lacks(wc, 'Goal', 'Me weight card, born ' + (Y - 18) + ', with a target saved by an older version');
      t.lacks(wc, 'BMI', 'Me weight card, born ' + (Y - 18));
      t.step('Me > Edit: the year wheel');
      await app.tap(p, '[data-act="ob-edit"]');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'born' }));
      await p.waitForSelector('#wheel');
      t.check(await p.locator('#born-warn').isVisible(), 'Edit: no under-18 note for ' + (Y - 18));
      await app.tap(p, '#wheel button[data-year="' + (Y - 19) + '"]');
      t.check(await p.locator('#born-warn').isHidden(), 'Edit: the under-18 note stays for ' + (Y - 19));
      // the wheel glides to the tapped year: let it stop (still for 300 ms, at most 4 s)
      await p.evaluate(() => new Promise((r) => {
        const wh = document.getElementById('wheel');
        let last = -1, still = 0;
        const tick = () => { if (wh.scrollTop === last) { if (++still >= 3) return r(); } else { still = 0; last = wh.scrollTop; } setTimeout(tick, 100); };
        tick(); setTimeout(r, 4000);
      }));
      // a year set by scrolling, with Next tapped before the wheel settles: the note comes up and Next waits
      await p.evaluate((y) => {
        const wh = document.getElementById('wheel'), b = wh.querySelector('[data-year="' + y + '"]');
        wh.dispatchEvent(new Event('pointerdown'));
        wh.scrollTop = b.offsetTop - wh.clientHeight / 2 + b.offsetHeight / 2;
        document.querySelector('.ob-cta [data-act="ob-next"]').click();
      }, Y - 16);
      await p.waitForTimeout(150);
      t.has(await question(p), 'born', 'Next tapped as the wheel reached ' + (Y - 16) + ': the step');
      t.check(await p.locator('#born-warn').isVisible(), 'Next tapped as the wheel reached ' + (Y - 16) + ': no under-18 note');
      await next(p);
      t.has(await question(p), 'Before you', 'Next again, with the note read');
    });

    await t.flow('pregnant: no weight target or BMI verdict', async () => {
      const p = await t.page({ state: L.member({ sex: 'f', goal: 'fat', kg: 80, targetKg: 72, health: { pregnant: true } }, { weights: weights(80) }) });
      const wc = await weightCard(p);
      t.lacks(wc, 'Goal', 'Me weight card, pregnant');
      t.lacks(wc, 'BMI', 'Me weight card, pregnant');
      t.step('Me > Edit');
      const e = await editThrough(p);
      t.check(!e.seen.some((q) => /target/i.test(q)), () => 'Edit shows the target weight to a pregnant member: ' + e.seen.join(' › '));
      t.equal((e.bmi || '').trim(), '', 'weight step BMI box, pregnant');
      // saved by an older version, which kept only the yes: Edit leaves the other seven open, never answered for her
      t.equal([(e.open || []).length, (e.open || []).includes('pregnant')], [7, false], 'Edit: health questions open [how many, pregnancy among them]');
      await app.waitTitle(p, 'Plan');
      const pr = (await app.stored(p)).profile;
      t.equal([pr.targetKg, pr.health.pregnant], [null, true], 'saved after an Edit, pregnant [target weight, pregnancy answer]');
      const f = await foodRefers(p);
      t.check(f.refers && !f.tracker && !f.habits, 'pregnant after an Edit: the food card gives the journal or diet habits');
      t.equal(await flagSwitch(p, 'pregnant'), 'on, locked', 'the "Pregnant or breastfeeding" switch');
    });

    await t.flow('PAR-Q chronic yes: no diet advice or weight target', async () => {
      // BMI 29.3: overweight, where the advice for adults talks about food
      const p = await t.page({ state: L.member({ goal: 'fat', kg: 95, targetKg: 85, health: { chronic: true } }, { weights: weights(95) }) });
      const f = await foodRefers(p);
      t.check(f.refers && !f.tracker && !f.habits, 'PAR-Q chronic yes: the food card gives the journal or diet habits');
      t.equal(await flagSwitch(p, 'medical'), 'on, locked', 'PAR-Q chronic yes: the medical switch');
      t.lacks(await app.text(p), 'For fat loss', 'Today: moving minutes with a PAR-Q chronic yes');
      const wc = await weightCard(p);
      t.lacks(wc, 'Goal', 'Me weight card, PAR-Q chronic yes');
      t.has(wc, 'BMI', 'Me weight card, PAR-Q chronic yes (an adult, not pregnant: BMI stays)');
      t.step('Me > Edit');
      const e = await editThrough(p);
      t.check(!e.seen.some((q) => /target/i.test(q)), () => 'Edit shows the target weight with a PAR-Q chronic yes: ' + e.seen.join(' › '));
      t.has(e.bmi || '', 'Ask your doctor', 'weight step BMI box, PAR-Q chronic yes');
      t.lacks(e.bmi || '', 'your food', 'weight step BMI box, PAR-Q chronic yes');
      t.equal([(e.open || []).length, (e.open || []).includes('chronic')], [7, false], 'Edit: health questions open [how many, chronic among them]');
      await app.waitTitle(p, 'Plan');
      const pr = (await app.stored(p)).profile;
      t.equal([pr.targetKg, pr.health.chronic], [null, true], 'saved after an Edit, PAR-Q chronic yes [target weight, chronic answer]');
      // control: the same person without the yes gets the journal, the target and the food advice back
      const c = await t.page({ state: L.member({ goal: 'fat', kg: 95, targetKg: 85 }, { weights: weights(95) }) });
      t.check((await foodRefers(c)).tracker, 'control: an adult with no health yes should get the food journal');
      t.has(await weightCard(c), 'Goal', 'control: Me weight card with a target');
    });

    await t.flow('health questions: every one answered', async () => {
      const p = await t.page();
      await app.tap(p, '[data-act="ob-start"]');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'health' }));
      await p.waitForSelector('[data-act="ob-health"]');
      t.equal(await p.locator('[data-act="ob-health"][aria-pressed="true"]').count(), 0, 'answers picked before any tap');
      const keys = await p.evaluate(() => WBF.PARQ.map((q) => q[0]).concat(['pregnant']));
      t.equal(keys.length, 8, 'health questions');
      for (const k of keys.slice(0, -1)) await app.tap(p, '[data-act="ob-health"][data-k="' + k + '"][data-v="0"]');
      t.check(await p.locator('.ob-cta [data-act="ob-next"]').isDisabled(), 'Next works with one question (' + keys[keys.length - 1] + ') unanswered');
      await app.tap(p, '[data-act="ob-health"][data-k="' + keys[keys.length - 1] + '"][data-v="1"]');
      t.check(await p.locator('.ob-cta [data-act="ob-next"]').isEnabled(), 'Next is off with every question answered');
      await app.tap(p, '[data-act="ob-health-none"]');
      t.equal(await p.locator('[data-act="ob-health"][data-v="0"][aria-pressed="true"]').count(), 8, '"None of these apply to me": No answers');
      t.equal(await p.locator('[data-act="ob-health-none"]').getAttribute('aria-pressed'), 'true', '"None of these apply to me" marked');
      await t.look(p, 'health questions, none apply');
    });

    await t.flow('other options in the exercise sheet', async () => {
      // the sheet's other options leave out what the person's answers rule out: every sheet whose list holds such a move
      for (const [label, over, id, out] of [['pregnant', { sex: 'f', health: { pregnant: true } }, 'bird-dog', 'dead-bug'], ['sore knee', { injuries: ['knee'] }, 'box-squat', 'squat']]) {
        const p = await t.page({ state: L.member(over) });
        const ids = await p.evaluate(() => { const av = WBF.plan.avoidFor(WBF.app.state().profile); return Object.keys(WBF.EX).filter((x) => (WBF.EX[x].alts || []).some((a) => WBF.EX[a] && !WBF.plan.safe(WBF.EX[a], av))); });
        t.check(ids.includes(id), label + ': control: ' + id + ' should list a ruled-out option in the data');
        const bad = [];
        for (const x of ids) {
          await p.evaluate((e) => WBF.app.sheet(e), x);
          const r = await p.evaluate(() => {
            const pr = WBF.app.state().profile, av = WBF.plan.avoidFor(pr);
            const shown = [...document.querySelectorAll('#overlay [data-act="ex"]')].map((b) => b.getAttribute('data-id'));
            return { shown, unsafe: shown.filter((a) => !WBF.plan.safe(WBF.EX[a], av) || !WBF.plan.canDo(WBF.EX[a], pr.kit)), heading: /Other options/i.test(document.getElementById('overlay').innerText) };
          });
          if (r.unsafe.length) bad.push(x + ' offers ' + r.unsafe.join(', '));
          if (!r.shown.length && r.heading) bad.push(x + ': "Other options" with nothing under it');
        }
        t.equal(bad, [], label + ': sheets offering a move the answers rule out');
        await p.evaluate((e) => WBF.app.sheet(e), id);
        t.equal(await p.locator('#overlay [data-act="ex"][data-id="' + out + '"]').count(), 0, label + ': ' + id + ' offers ' + out);
        await t.look(p, 'sheet options, ' + label);
        await p.context().close();                     // every sheet drew a coach: let the next phone load on its own
      }
      // control: with nothing ruled out, Squat to a target offers Squat
      const c = await t.page({ state: L.member() });
      await c.evaluate(() => WBF.app.sheet('box-squat'));
      t.equal(await c.locator('#overlay [data-act="ex"][data-id="squat"]').count(), 1, 'control: Squat to a target offers Squat with no sore spot');
    });

    await t.flow('pregnancy', async () => {
      const p = await t.page({ state: L.member({ sex: 'f', goal: 'fat', days: 5, kit: ['chair', 'table', 'db', 'rings', 'pad'], health: { pregnant: true } }) });
      const a = await planAudit(p);
      t.equal(a.days, 20, 'plan days in pregnancy');
      t.equal(a.unsafe, [], 'moves pregnancy rules out');
      t.equal(a.jumps, [], 'jumps in pregnancy');
      t.equal(a.supine, [], 'lying on the back or front in pregnancy');
      t.equal(a.kit, [], 'balance pad or rings in pregnancy');
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('[data-act="health"][data-k="pregnant"]').getAttribute('aria-checked'), 'true', 'Me: pregnancy mode switch');
    });

    await t.flow('PAR-Q yes: gentle until cleared', async () => {
      const p = await t.page({ state: L.member({ goal: 'fat', level: 'a', days: 5, health: { heart: true } }) });
      let a = await planAudit(p);
      t.equal(a.level, 'b', 'plan level with a PAR-Q yes');
      t.equal(a.vigorous, [], 'vigorous moves with a PAR-Q yes');
      t.equal(a.jumps, [], 'jumps with a PAR-Q yes');
      t.equal(a.cardioDays, 0, 'interval cardio days with a PAR-Q yes');
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '[data-act="health"][data-k="cleared"]');
      t.has(await app.toast(p), 'vigorous work now', 'toast after "Cleared by a doctor"');
      a = await planAudit(p);
      t.equal(a.level, 'a', 'plan level once cleared');
      t.check(a.cardioDays > 0, 'once cleared, the fat-loss plan should get its cardio days back');
      // control: the audit does see jumps when nothing rules them out, so the empty lists above mean something
      t.check(a.jumps.length > 0 && a.days === 20, 'control: an advanced fat-loss plan should have 20 days and some jumps (' + a.days + ' days, ' + a.jumps.length + ' jumps)');
    });

    await t.flow('60 and over', async () => {
      const p = await t.page({ state: L.member({ birthYear: 1960, goal: 'fit', days: 4 }) });
      const a = await planAudit(p);
      t.equal(a.jumps, [], 'jumps from 60');
      t.equal(a.noBalance, [], 'plan days without balance work from 60');
    });

    await t.flow('sore spots', async () => {
      for (const spot of ['shoulder', 'wrist', 'knee', 'ankle', 'back', 'other']) {
        const p = await t.page({ state: L.member({ goal: 'fit', days: 6, injuries: [spot], kit: ['chair', 'table', 'db', 'rings', 'wedge', 'pad'] }), threeD: false });
        const a = await planAudit(p);
        t.equal(a.stress, [], 'moves that load a sore ' + spot);
        if (spot === 'other') t.equal(a.jumps, [], 'jumps with an "Other" sore spot');
        await p.context().close();
      }
    });

    await t.flow('keep my progress: a plan that comes brings its health answers to a phone with a plan of its own', async () => {
      // a move link or a backup (js/keep.js) onto a phone with its own plan: the phone keeps that plan, but a yes to a
      // health question, pregnancy and the sore spots that came count here too, as Me's switches would set them
      const phone = L.member({ name: 'Own', sex: 'f', goal: 'fat', days: 5, level: 'a', kit: ['chair', 'table', 'db', 'rings', 'pad'], start: L.isoDay(-3) });
      const bring = async (fileProfile) => {
        const p = await t.page({ state: phone });
        await p.evaluate((h) => { location.hash = h; }, 'move.' + moveCode(L.member(Object.assign({ name: 'Inc', sex: 'f', start: L.isoDay(-20) }, fileProfile))));
        await p.waitForFunction(() => !!document.querySelector('#overlay:not([hidden]) .modal'), null, { timeout: 10000 });
        const asked = await app.overlay(p);
        await app.tap(p, '[data-act="modal-yes"]');
        await app.waitTitle(p, 'Plan');
        return [p, asked];
      };
      const [p, asked] = await bring({ health: { pregnant: true, heart: true }, injuries: ['knee'] });
      t.has(asked, 'this phone keeps its own plan, with the health answers and sore spots from both', 'the box before the plan comes');
      const s = (await app.stored(p)).profile;
      t.equal([s.name, s.goal, !!s.health.pregnant, !!s.health.heart, !!s.health.cleared, s.injuries], ['Own', 'fat', true, true, false, ['knee']],
        'saved [name and goal: this phone\'s plan, pregnant, heart, cleared, sore spots]');
      const av = await p.evaluate(() => WBF.plan.avoidFor(WBF.app.state().profile));
      t.equal([!!av.supine, !!av.prone, !!av.jump, !!av.gentle, av.stress], [true, true, true, true, ['knee']], 'what the plan leaves out [lying on the back, on the front, jumps, gentle, sore spots]');
      const a = await planAudit(p);
      t.equal([a.unsafe, a.supine, a.jumps, a.kit, a.stress, a.vigorous, a.level], [[], [], [], [], [], [], 'b'], 'the plan after [unsafe, lying, jumps, pad or rings, the knee, vigorous, level]');
      t.equal(await p.evaluate(() => WBF.app.atRisk()), true, 'atRisk() after');
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('[data-act="health"][data-k="pregnant"]').getAttribute('aria-checked'), 'true', "Me's Pregnancy mode after");
      await t.look(p, 'me after a plan with health answers came');
      // control: a plan with no yes and no sore spot changes none of it, so the empty lists above mean something
      const [c, said] = await bring({});
      t.lacks(said, 'health answers', 'control: the box when no health answer comes');
      const ca = await planAudit(c);
      t.check(ca.supine.length > 0 && ca.jumps.length > 0 && ca.level === 'a', () => 'control: this phone\'s own plan should have lying moves and jumps at its level (' + ca.supine.length + ' lying, ' + ca.jumps.length + ' jumps, level ' + ca.level + ')');
      // the rules, one by one: what a file holds once checked (WBF.keep.check), merged into this phone's (WBF.keep.merge)
      const rules = await c.evaluate(([base, Y]) => {
        const run = (mine, theirs) => {
          const now = JSON.parse(JSON.stringify(base)), there = JSON.parse(JSON.stringify(base));
          Object.assign(now.profile, mine); Object.assign(there.profile, theirs);
          const p = WBF.keep.merge(now, WBF.keep.check({ app: 'wellness-by-frank', v: 1, data: there }, 'file').data).profile;
          return [p.health.cleared === true, p.birthYear, p.injuries];
        };
        return [
          run({ health: { heart: true, cleared: true } }, { health: {} })[0],
          run({ health: { heart: true, cleared: true } }, { health: { heart: true } })[0],
          run({ health: {} }, { health: { joint: true, cleared: true } })[0],
          run({ health: { joint: true } }, { health: { heart: true, cleared: true } })[0],
          run({ birthYear: 1990 }, { birthYear: 1960 })[1],
          run({ birthYear: 1990 }, { birthYear: Y - 16 })[1],
          run({ birthYear: 1990 }, { birthYear: 1985 })[1],
          run({ birthYear: 1960 }, { birthYear: 1990 })[1],
          run({ birthYear: 1990 }, { birthYear: undefined, age: 'u30', health: { under18: true } })[1],
          run({ health: { heart: true, cleared: true } }, { health: { injury: true } })[0],
          run({ injuries: ['wrist'] }, { injuries: ['knee', 'wrist'] })[2]
        ];
      }, [L.member(), Y]);
      t.equal(rules, [true, false, true, false, 1960, Y - 16, 1990, 1960, Y - 16, false, ['wrist', 'knee']],
        'merged [cleared stays with no new yes, off for a yes not cleared, comes with a cleared yes, off when this phone\'s yes wasn\'t; year: 60 and over, maybe under 18, no rule crossed, 60 and over kept, the first version\'s under 18; its injury question a yes not cleared; sore spots join]');
    });

    await t.flow('no made-up social proof', async () => {
      const bad = /\b\d[\d,.]*\s*(k\+?\s*)?(people|members|users|clients|downloads)\b|\breviews?\b|★|\brated\s+\d|\bjoined today\b|#1\b|\bbest[- ]selling\b/i;
      const p = await t.page();
      t.lacks(await app.text(p), bad, 'welcome');
      const q = await t.page({ state: L.state({ profile: L.profile(), access: { trialStart: L.isoDay(-10) } }) });
      for (const [label, go] of [['plan', null], ['paywall', () => q.evaluate(() => WBF.app.go('pay'))], ['frank', () => q.evaluate(() => WBF.app.tab('frank'))]]) {
        if (go) { await go(); await q.waitForTimeout(200); }
        t.lacks(await app.text(q), bad, label);
      }
    });
  }
};

if (require.main === module) L.main([module.exports]);
