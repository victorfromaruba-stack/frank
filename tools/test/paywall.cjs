// paywall: the free trial, the price screen after it, members, and what stays open for Frank's clients.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

module.exports = {
  name: 'paywall',
  about: 'trial starts with the first workout, days left, the price screen: the trial offered only before it starts, only prices Frank approved (€15 a month), "Tell me when it opens" while payments are off, the checkout once they are on; members, and the price screen for a member or a client (their line, no way to join); Frank\'s sessions stay open',
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

    await t.flow('new: the price screen offers the trial', async () => {
      // what the onboarding ends on (the onboarding suite taps its way there)
      const p = await t.page({ state: L.state({ profile: L.profile() }) });
      await p.evaluate(() => WBF.app.go('pay'));
      await app.waitTitle(p, 'Membership');
      const txt = await app.text(p);
      t.has(txt, 'Get your personal plan', 'heading');
      for (const want of ['7-day free trial, then monthly', '€15 a month', 'Start my 7-day free trial', 'No payment needed for the trial']) t.has(txt, want, 'price screen before the trial');
      // only prices Frank approved (the yearly one is a placeholder), and nothing that reads like a test version
      for (const bad of ['Yearly', '€119.99', 'Best value', 'placeholder', 'preview']) t.lacks(txt, bad, 'price screen before the trial');
      await t.look(p, 'paywall before the trial');
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
      t.has(txt, '3 days left of your free trial', 'paywall during the trial');
      t.has(txt, 'Monthly', 'plans during the trial');
      t.lacks(txt, 'free trial, then', 'plans during the trial');
      // no payment link yet: no "Become a member" that can't be done, no button that does nothing
      t.lacks(txt, 'Become a member', 'paywall during the trial while payments are off');
      t.has(txt, 'Tell me when it opens', 'paywall during the trial while payments are off');
      t.equal(await p.locator('.pay [disabled]').count(), 0, 'switched-off buttons on the paywall during the trial');
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
      for (const want of ['Monthly', '€15 a month', '€3.46']) t.has(txt, want, 'prices');
      // only prices Frank approved: the yearly one is a placeholder
      for (const bad of ['Yearly', '€119.99', '€2.31', 'Best value', '14.99']) t.lacks(txt, bad, 'prices');
      t.lacks(txt, 'free trial, then', 'plans after the trial');
      for (const bad of ['placeholder', 'preview', "Payments aren't switched on"]) t.lacks(txt, bad, 'price screen after the trial');
      // no payment link yet: a way on instead of a switched-off "Become a member"
      t.lacks(txt, 'Become a member', 'price screen while payments are off');
      t.equal(await p.locator('.pay [disabled]').count(), 0, 'switched-off buttons on the price screen');
      t.has(txt, "Membership isn't open yet", 'note while payments are off');
      await t.look(p, 'paywall after the trial');
      t.equal(await p.locator('[data-act="pay-plan"][aria-pressed="true"]').getAttribute('data-v'), 'month', 'plan picked first');
      t.step('Tell me when it opens');
      const ask = p.locator('.pay [data-act="pay-ask"]');
      const dm = await p.evaluate(() => WBF.FRANK.dm);
      t.equal([await ask.getAttribute('href'), await ask.getAttribute('target')], [dm, '_blank'], "Tell me when it opens [link, target]: Frank's Instagram chat");
      // tapped like a finger. The chat itself is on another site, which tests don't open (nothing from other sites)
      await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a[target="_blank"]')) e.preventDefault(); }, true));
      await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await app.tap(p, '.pay [data-act="pay-ask"]', { wait: 300 });
      t.has(await p.evaluate(() => navigator.clipboard.readText().catch((e) => 'could not read: ' + e.message)), 'Please tell me when the membership opens', 'the message copied for Frank');
      t.has(await app.toast(p), 'Message copied. Paste it in the chat with Frank.', 'toast');
      t.step('Me');
      await app.tap(p, '[data-act="pay-close"]');
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '.tab[data-tab="me"]');
      const me = await app.text(p);
      t.has(me, 'Your free trial has ended', 'Me');
      t.has(me, 'See membership', 'Me while payments are off');
      t.lacks(me, 'Become a member', 'Me while payments are off');
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

    await t.flow('payments on: the checkout', async () => {
      // once BILLING.paymentLink is set, "Become a member" goes to the checkout; someone new starts the trial there
      const link = 'https://pay.example.org/wellness-by-frank';
      for (const [label, access, want] of [['new', null, 'Start my free trial'], ['trial', { trialStart: L.isoDay(-4) }, 'Become a member'], ['ended', { trialStart: L.isoDay(-10) }, 'Become a member']]) {
        t.step(label);
        const p = await t.page({ state: L.state({ profile: L.profile({ start: L.isoDay(-10) }), access }), threeD: false });
        await p.evaluate((l) => { WBF.BILLING.paymentLink = l; WBF.app.go('pay'); }, link);
        await app.waitTitle(p, 'Membership');
        const cta = p.locator('.pay a.btn.dark');
        t.equal([(await cta.innerText()).trim().toLowerCase(), await cta.getAttribute('href')], [want.toLowerCase(), link], label + ': the button [text, link]');
        const txt = await app.text(p);
        t.lacks(txt, 'Tell me when it opens', label + ' with payments on');
        t.has(txt, 'Cancel any time', label + ' with payments on');
        if (label === 'ended') {
          await app.tap(p, '[data-act="pay-close"]');
          await app.tap(p, '.tab[data-tab="me"]');
          t.has(await p.locator('.card [data-act="paywall"]').innerText(), 'Become a member', 'Me after the trial with payments on');
        }
        await p.context().close();
      }
    });

    await t.flow('member', async () => {
      const p = await t.page({ state: L.member({ start: L.isoDay(-30) }, { access: { paid: true, trialStart: L.isoDay(-40) } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), "You're a member", 'Me');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');
    });

    await t.flow('member and client: the price screen says they have it', async () => {
      // Frank opens the price screen from Coach tools ("See what members see") with his own phone's access. A member or
      // one of his clients already has the app: their line, never a way to join or "Membership isn't open yet"
      const who = [
        ['member', L.member({ start: L.isoDay(-30) }, { access: { paid: true, trialStart: L.isoDay(-40) } }), "You're a member. Thank you."],
        ['client', L.member({}, { access: { client: true, trialStart: L.isoDay(-10) } }), 'You train with Frank. His sessions show up on your plan, and the whole app is open to you.']
      ];
      for (const [label, st, line] of who) {
        for (const pay of [false, true]) {
          t.step(label + (pay ? ', payments on' : ''));
          const p = await t.page({ state: st, threeD: false });
          await p.evaluate((on) => { if (on) WBF.BILLING.paymentLink = 'https://pay.example.org/wellness-by-frank'; WBF.app.go('pay'); }, pay);
          await app.waitTitle(p, 'Membership');
          const txt = await app.text(p);
          t.has(txt, line, label + ' on the price screen');
          for (const bad of ['Tell me when it opens', "isn't open yet", 'Start my', 'Become a member', 'Cancel any time']) t.lacks(txt, bad, label + ' on the price screen' + (pay ? ' with payments on' : ''));
          t.equal(await p.locator('.pay a.btn, .pay [data-act="pay-trial"], .pay [data-act="pay-ask"]').count(), 0, label + ': ways to join on the price screen');
          // a client already is one of Frank's clients; a member may still become one
          t.equal(await p.locator('.pay [data-act="join"]').count(), label === 'client' ? 0 : 1, label + ': "I\'m one of Frank\'s clients" on the price screen');
          if (!pay) await t.look(p, 'price screen for a ' + label);
          await p.context().close();
        }
      }
    });
  }
};

if (require.main === module) L.main([module.exports]);
