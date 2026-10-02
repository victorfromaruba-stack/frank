// safety: the app's hard rules. No diet advice for anyone pregnant, under 18 or with a medical condition; plans
// leave out what pregnancy, a PAR-Q yes, age 60+ or a sore spot rule out; no made-up social proof.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

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

module.exports = {
  name: 'safety',
  about: 'no diet advice when pregnant, under 18 or with a medical condition; pregnancy, PAR-Q, 60+ and sore-spot rules in every plan; no fake social proof',
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
    });

    await t.flow('pregnancy', async () => {
      const p = await t.page({ state: L.member({ sex: 'f', goal: 'fat', days: 5, kit: ['chair', 'table', 'db', 'rings', 'pad'], health: { pregnant: true } }) });
      const a = await planAudit(p);
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
