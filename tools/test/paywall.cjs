// paywall: the free trial, the price screen after it, members, and what stays open for Frank's clients.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

module.exports = {
  name: 'paywall',
  about: 'trial starts with the first workout, days left, the price screen after the trial (€15 a month), members, Frank\'s sessions stay open',
  async run(t) {
    await t.flow('new: the first workout starts the trial', async () => {
      const p = await t.page({ state: L.state({ profile: L.profile() }) });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), '7-day free trial starts with your first workout', 'Me before the first workout');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
      const s = await app.stored(p);
      t.equal(s.access && s.access.trialStart, L.TODAY, 'trial start after the first workout');
    });

    await t.flow('trial: days left', async () => {
      const p = await t.page({ state: L.state({ profile: L.profile(), access: { trialStart: L.isoDay(-4) } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Free trial: 3 days left', 'Me during the trial');
      await app.tap(p, '[data-act="paywall"]');
      await app.waitTitle(p, 'Membership');
      const txt = await app.text(p);
      await t.look(p, 'paywall during the trial');
      // the trial is already running: the screen should not offer to start it again
      t.lacks(txt, 'Start my 7-day free trial', 'paywall during the trial');
      await app.tap(p, '[data-act="pay-close"]');
      await app.waitTitle(p, 'Me');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
    });

    await t.flow('ended: the price screen', async () => {
      const st = L.state({ profile: L.profile({ start: L.isoDay(-10) }), access: { trialStart: L.isoDay(-10) }, inbox: [L.spec({ i: 'qa-pay', t: 'Frank session' })] });
      const p = await t.page({ state: st });
      t.step('a plan workout');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Membership');
      const txt = await app.text(p);
      t.has(txt, 'Keep training', 'heading');
      for (const want of ['€15 a month', '€119.99 a year', '€3.46', '€2.31', 'Yearly', 'Monthly', 'Best value']) t.has(txt, want, 'prices');
      t.lacks(txt, '14.99', 'old price');
      t.lacks(txt, 'free trial, then', 'plans after the trial');
      t.check(await p.locator('.btn.dark.block', { hasText: /become a member/i }).isDisabled(), 'with no payment link, "Become a member" should be disabled');
      t.has(txt, "Payments aren't switched on", 'note while payments are off');
      await t.look(p, 'paywall after the trial');
      t.equal(await p.locator('[data-act="pay-plan"][aria-pressed="true"]').getAttribute('data-v'), 'year', 'plan picked first');
      await app.tap(p, '[data-act="pay-plan"][data-v="month"]');
      t.equal(await p.locator('[data-act="pay-plan"][aria-pressed="true"]').getAttribute('data-v'), 'month', 'plan after tapping Monthly');
      t.step('Me');
      await app.tap(p, '[data-act="pay-close"]');
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Your free trial has ended', 'Me');
      t.step('sessions from Frank stay open');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-coach"][data-id="qa-pay"]');
      await app.waitTitle(p, 'Workout');
      t.step("I'm one of Frank's clients");
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Membership');
      await app.tap(p, '.pay [data-act="join"]');
      await app.waitTitle(p, "Frank's clients");
    });

    await t.flow('member', async () => {
      const p = await t.page({ state: L.member({ start: L.isoDay(-30) }, { access: { paid: true, trialStart: L.isoDay(-40) } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), "You're a member", 'Me');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');
    });
  }
};

if (require.main === module) L.main([module.exports]);
