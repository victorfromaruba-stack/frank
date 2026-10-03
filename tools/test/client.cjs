// client: Frank's clients get in with a code or a session link; Frank builds a session in Coach tools, sends the
// link, and it opens on a fresh phone.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

const submit = (p) => app.tap(p, 'form[data-form="join"] button[type="submit"]', { wait: 500 });

module.exports = {
  name: 'client',
  about: 'client codes, session links (opened and pasted, broken and hostile ones), Coach tools: build, send, open the link on a fresh phone, Back',
  async run(t) {
    await t.flow('client codes', async () => {
      const p = await t.page();
      await app.tap(p, '[data-act="join"]');
      await app.waitTitle(p, "Frank's clients");
      await t.look(p, 'join screen');
      // a test-only code (L.QA_CODE, added to FRANK.codes in this page): real clients' codes stay out of the repo
      await app.addCode(p);
      await p.fill('#join-in', 'Bob');
      await submit(p);
      t.has(await app.toast(p), "didn't work", 'wrong code');
      t.check(!((await app.stored(p)) || {}).access, 'a wrong code gave access');
      await p.fill('#join-in', ' ' + L.QA_CODE.toUpperCase().replace(/^(.{3})/, '$1 ') + ' ');
      await submit(p);
      t.check((((await app.stored(p)) || {}).access || {}).client, 'a client code typed with capitals and spaces gave no access');
      t.has(await app.toast(p), 'The whole app is open to you', 'code accepted');
      await app.waitTitle(p, 'Your plan');                    // no profile yet: onboarding starts
    });

    await t.flow('code after the trial ended', async () => {
      const p = await t.page({ state: L.state({ profile: L.profile({ start: L.isoDay(-10) }), access: { trialStart: L.isoDay(-10) } }) });
      await app.tap(p, '.tab[data-tab="me"]');
      await app.tap(p, '.card [data-act="join"]');
      await app.addCode(p);
      await p.fill('#join-in', L.QA_CODE);
      await submit(p);
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');                      // not the price screen
      await app.tap(p, '[data-act="quit"]'); await app.tap(p, '[data-act="modal-yes"]');
      await app.tap(p, '.tab[data-tab="me"]');
      const me = await app.text(p);
      t.has(me, 'You train with Frank', 'Me for a client');
      t.lacks(me, "I'm one of Frank's clients", 'Me for a client');
    });

    await t.flow('session link opened', async () => {
      const sp = L.spec({ i: 'qa-link', t: 'Lower body, week 2', n: 'Slow on the way down.' });
      const p = await t.page({ hash: 'frank.' + L.pack(sp) });
      await app.waitHeading(p, 'Lower body, week 2');
      t.has(await app.toast(p), 'New session from Frank: Lower body, week 2', 'toast');
      t.equal(await p.evaluate(() => location.hash), '', 'the link code left in the address bar');
      const txt = await app.text(p);
      t.has(txt, 'From Frank', 'session screen');
      t.has(txt, 'Slow on the way down.', 'note from Frank');
      await t.look(p, 'session from a link');
      t.check(((await app.stored(p)).access || {}).client, 'opening a link did not open the app');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      t.has(await app.text(p), 'Lower body, week 2', 'plan card from Frank');
      // a second link: both are kept
      await p.evaluate((h) => { location.hash = h; }, 'frank.' + L.pack(L.spec({ i: 'qa-link2', t: 'Upper body, week 2' })));
      await app.waitHeading(p, 'Upper body, week 2');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '[data-act="inbox"]');
      await app.waitTitle(p, 'From Frank');
      const inbox = await app.text(p);
      t.has(inbox, 'Lower body, week 2', 'inbox');
      t.has(inbox, 'Upper body, week 2', 'inbox');
      await t.look(p, 'sessions from Frank');
    });

    await t.flow('session link pasted', async () => {
      const p = await t.page();
      await app.tap(p, '[data-act="join"]');
      await p.fill('#join-in', 'Hi Sam, your next session: Test. Open it here: https://example.org/frank/#frank.' + L.pack(L.spec()));
      await submit(p);
      await app.waitHeading(p, 'Test session');
      t.has(await app.toast(p), 'Added: Test session', 'toast');
      await app.tap(p, '[data-act="start-coach"]');
      await app.waitTitle(p, 'Workout');
    });

    await t.flow('broken and hostile links', async () => {
      const p = await t.page({ hash: 'frank.not-a-real-code' });
      await p.waitForTimeout(400);
      t.has(await app.toast(p), "That session link didn't work", 'broken link');
      t.equal(await app.title(p), 'Wellness by Frank', 'screen after a broken link');
      const evil = { i: 'x"><img src=x onerror="window.__pwned=1">', t: '<img src=x onerror=a=2> Hi', n: '<script>window.__pwned=3</script>',
        c: '<b>Sam</b>', r: 99, rs: 1, f: 'zzz', x: [['squat', 9999], ['no-such-move', 10], ['plank', -5], ['plank', 'abc'], 'junk'] };
      const q = await t.page({ hash: 'frank.' + L.pack(evil) });
      await q.waitForTimeout(400);
      t.check(!(await q.evaluate(() => window.__pwned)), 'a session link ran its own script');
      t.equal(await q.locator('#app img[src="x"]').count(), 0, 'HTML from a link was drawn');
      const s = (await app.stored(q)).inbox[0] || {};
      t.check(/^[A-Za-z0-9_-]+$/.test(s.i || ''), 'the session id kept unsafe characters: ' + s.i);
      t.equal([s.r, s.rs, s.f, s.x], [8, 5, 'c', [['squat', 9999], ['plank', -5]]], 'cleaned session [rounds, rest, format, moves]');
      const txt = await app.text(q);
      t.has(txt, '× 200', 'reps are capped at 200');
      t.has(txt, '0:05', 'seconds are at least 5');
      t.has(txt, '<img src=x', 'the title is shown as text');
    });

    await t.flow('long titles fit the screen', async () => {
      // Frank may write in Dutch: one long word must wrap, not push the page sideways
      const title = 'Bovenlichaamskrachttraining';
      const p = await t.page({ hash: 'frank.' + L.pack(L.spec({ i: 'qa-long', t: title, c: 'Maximiliaan' })), speed: 50 });
      await app.waitHeading(p, title);
      await t.look(p, 'session screen with a long title');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      await t.look(p, 'plan card with a long title');
      await app.tap(p, '[data-act="start-coach"]');
      await app.waitTitle(p, 'Workout');
      await app.runWorkout(p);
      await t.look(p, 'finish screen with a long title');
    });

    await t.flow('coach tools round trip', async () => {
      const p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="frank"]');
      await app.tap(p, '[data-act="coach"]');
      await app.waitTitle(p, 'Coach tools');
      await app.tap(p, '[data-act="coach-new"]');
      await app.waitTitle(p, 'Session');
      await app.tap(p, '[data-act="c-send"]');
      t.has(await app.toast(p), 'Add at least one move', 'sending an empty session');
      t.step('build');
      await p.fill('#c-t', 'Legs and core, week 2');
      await p.fill('#c-c', 'Sam');
      await p.fill('#c-n', 'Knees out on the squats.');
      await app.tap(p, '[data-act="c-add"]');
      await p.fill('#pick-q', 'squat');
      await app.tap(p, '#pick-list [data-act="c-pick"][data-id="squat"]');
      t.has(await app.toast(p), 'Added Squat', 'picking a move');
      await p.fill('#pick-q', 'side plank');
      await app.tap(p, '#pick-list [data-act="c-pick"][data-id="side-plank"]');
      await t.look(p, 'move picker');
      await app.tap(p, '#overlay [data-act="close"]');
      t.equal(await p.locator('.coach-move').count(), 2, 'moves in the session');
      const dose0 = await p.evaluate(() => [WBF.EX.squat.dose.i, WBF.EX['side-plank'].dose.i]);
      await app.tap(p, '[data-act="c-dose"][data-i="0"][data-d="1"]');
      await app.tap(p, '[data-act="c-dose"][data-i="1"][data-d="-1"]');
      await app.tap(p, '[data-act="c-set"][data-k="f"][data-v="s"]');
      await app.tap(p, '[data-act="c-rounds"][data-d="1"]');
      await app.tap(p, '[data-act="c-set"][data-k="rs"][data-v="45"]');
      await app.tap(p, '[data-act="c-toggle"][data-k="w"]');
      await t.look(p, 'session editor');
      await app.tap(p, '[data-act="c-save"]');
      t.has(await app.toast(p), 'Saved', 'save');
      t.step('send');
      await app.tap(p, '[data-act="c-send"]');
      const link = await p.locator('#send-link').inputValue();
      t.check(/#frank\.[A-Za-z0-9_-]+$/.test(link), 'the link is not plain-anchor safe: ' + link.slice(-40));
      const wa = await p.locator('#overlay a[href^="https://wa.me/"]').getAttribute('href');
      t.check(decodeURIComponent(wa.split('text=')[1] || '').includes(link), 'the WhatsApp message does not carry the link');
      await t.look(p, 'send sheet');
      const code = L.unpack(link.split('#frank.')[1]);
      t.equal([code.t, code.c, code.n, code.r, code.f, code.rs, code.w, code.k, code.x],
        ['Legs and core, week 2', 'Sam', 'Knees out on the squats.', 4, 's', 45, 0, 1, [['squat', dose0[0] + 1], ['side-plank', dose0[1] - 5]]], 'the session in the link');
      t.step('saved on Frank\'s phone');
      await app.tap(p, '#overlay [data-act="close"]');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Coach tools');
      t.has(await app.text(p), 'For Sam', 'saved sessions');
      await app.tap(p, '[data-act="coach-edit"]');
      await app.waitTitle(p, 'Session');
      t.equal(await p.locator('#c-t').inputValue(), 'Legs and core, week 2', 'editing a saved session');

      t.step('the client opens the link on a fresh phone');
      const q = await t.page({ href: link });
      await app.waitHeading(q, 'Legs and core, week 2');
      const txt = await app.text(q);
      for (const want of ['From Frank', 'Knees out on the squats.', '× ' + (dose0[0] + 1), '4 sets', 'Cool-down']) t.has(txt, want, 'the session on the client\'s phone');
      t.lacks(txt, 'Warm-up', 'the session on the client\'s phone (warm-up was switched off)');
      await t.look(q, 'session on the client phone');
      await app.tap(q, '[data-act="back"]');
      await app.waitTitle(q, 'Plan');
      t.has(await app.text(q), 'Legs and core, week 2', 'plan card on the client\'s phone');
      await app.tap(q, '[data-act="start-coach"]');
      await app.waitTitle(q, 'Workout');
      await app.tap(q, '[data-act="pl-skip"]');
      t.has(await app.text(q), 'Set 1 of 4', 'the player counts sets');
    });
  }
};

if (require.main === module) L.main([module.exports]);
