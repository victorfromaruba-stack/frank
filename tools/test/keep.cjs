// keep: keep my progress (js/keep.js). A backup file saved and brought back, onto an empty phone and onto one with its
// own workouts; a move link made on one address and opened on another (two local servers are two addresses, each with
// its own storage, like two browsers); what is refused with nothing changed; Instagram's own browser; the Home Screen
// sheet once after the first workout; the browser asked to keep the data; a phone that can't save; and the banner once
// the app has moved to Frank's own address (FRANK.home).
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const L = require('./lib.cjs');
const { app } = L;

// a workout as the app records it
const rec = (id, daysAgo, extra) => Object.assign({ id, at: L.isoDay(-daysAgo) + 'T07:30:00.000Z', date: L.isoDay(-daysAgo), wid: 'full-i', title: 'Full body', level: 'i',
  day: null, sec: 900, moves: 12, total: 12, feel: 'right', adj: 0, loads: {}, kcal: 90 }, extra || {});
// a backup file's contents, as js/keep.js writes them
const backup = (data, over) => Object.assign({ app: 'wellness-by-frank', v: 1, made: L.TODAY + 'T09:00:00.000Z', origin: 'http://127.0.0.1', data }, over || {});
// a move code as js/keep.js makes one: 'z', then the JSON packed with deflate-raw, in base64url
const moveCode = (obj) => 'z' + zlib.deflateRawSync(Buffer.from(JSON.stringify(obj))).toString('base64url');
const NOT_OURS = "That isn't a backup from this app.";
const SAVE_FAIL = "This phone isn't saving your progress. Storage is full or blocked.";

// the phone's file picker: a file with these contents, picked after a tap on sel
async function pickFile(p, sel, name, contents) {
  const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), app.tap(p, sel)]);
  await chooser.setFiles({ name, mimeType: 'application/json', buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents) });
}
// the question box (Bring your plan here?) comes up
const box = (p) => p.waitForFunction(() => !!document.querySelector('#overlay:not([hidden]) .modal'), null, { timeout: 10000 })
  .catch(() => { throw new Error('the box "Bring your plan here?" did not come up'); });
// the toast after the n-th: the next one the app shows
async function nextToast(p, n) {
  await p.waitForFunction((k) => window.__qa.toasts.length > k, n, { timeout: 8000 }).catch(() => null);
  return app.toast(p);
}
// a short workout on the Plan's next day, ended after its first move: the finish screen
async function shortWorkout(p) {
  await app.tap(p, '.tab[data-tab="plan"]');
  await app.tap(p, '[data-act="start-day"]');
  await app.waitTitle(p, 'Workout');
  await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
  if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
  await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
  await app.tap(p, '[data-act="quit"]');
  await app.tap(p, '[data-act="modal-yes"]');
  await app.waitTitle(p, 'Workout complete');
}
// the sheet on screen, or '' (it comes a moment after the finish screen)
const sheetText = async (p, want) => {
  if (want) await p.waitForFunction((w) => ((document.querySelector('#overlay:not([hidden]) .sheet') || {}).innerText || '').includes(w), want, { timeout: 5000 }).catch(() => null);
  else await p.waitForTimeout(400);
  return app.overlay(p);
};

module.exports = {
  name: 'keep',
  about: 'keep my progress: a backup file saved and brought back (an empty phone, a phone with its own workouts: merged, no doubles, the earliest trial, never a membership), Undo, a move link from one address to another (and pasted), broken, hostile, too big and newer files and links refused with nothing changed, a link during a workout, Instagram\'s browser, the Home Screen sheet once after the first workout (never when installed), the browser asked to keep the data, a phone that can\'t save, the banner once the app moved to Frank\'s own address',
  async run(t) {
    await t.flow('backup: Save a backup downloads the plan, the history and the weights', async () => {
      const st = L.member({ name: 'Sanne', goal: 'fat' }, { sessions: [rec('h1', 3), rec('h2', 1)], weights: [{ date: L.isoDay(-3), kg: 70.5 }, { date: L.isoDay(-1), kg: 70.1 }],
        coachMode: 'f'.repeat(64), stamp: Date.parse(L.isoDay(-9) + 'T10:00:00Z') });
      const p = await t.page({ state: st });
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Everything you enter stays in this browser on this phone.', "Me's data card");
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), app.tap(p, '[data-act="keep-save"]')]);
      t.equal(dl.suggestedFilename(), 'wellness-by-frank-' + L.TODAY + '.json', 'the file name');
      const file = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
      t.equal([file.app, file.v, file.data.v, typeof file.made, file.origin], ['wellness-by-frank', 1, 2, 'string', p.srv.url], 'the file [app, v, data.v, made, origin]');
      t.equal([file.data.sessions.map((r) => r.id), file.data.weights.map((w) => w.kg), file.data.profile.name, file.data.profile.goal, file.data.access],
        [['h1', 'h2'], [70.5, 70.1], 'Sanne', 'fat', { paid: true }], 'the file holds [workouts, weights, name, goal, access]');
      t.equal([file.data.coachMode, file.data.keep, file.data.stamp], [undefined, undefined, undefined], "the file leaves out [Coach tools, this phone's own notes, the stamp of its last restore]");
      t.has(await app.toast(p), 'Your backup file is ready. Keep it somewhere safe.', 'toast');
      t.equal((await app.stored(p)).keep.backupAt, L.TODAY, 'saved: the day of the backup');
      const me = await app.text(p);
      t.has(me, 'Last backup: 14 Oct.', 'Me after the backup');
      t.has(me, 'Anyone with your backup file or move link can see your answers. Keep them to yourself.', 'the privacy line');
      await t.look(p, 'me after a backup');
    });

    await t.flow('restore: a backup on a phone with nothing on it brings the plan and the numbers back', async () => {
      const data = L.member({ name: 'Lee', goal: 'strength', start: L.isoDay(-5) }, { sessions: [rec('a1', 5, { day: 1 }), rec('a2', 3, { day: 3 })], done: { 1: 'a1', 3: 'a2' },
        weights: [{ date: L.isoDay(-5), kg: 82 }], access: { trialStart: L.isoDay(-5) } });
      const p = await t.page();
      await app.tap(p, '[data-act="keep-have"]');
      await app.waitTitle(p, 'Bring your plan');
      await t.look(p, 'bring your plan');
      await pickFile(p, '[data-act="keep-restore"]', 'wellness-by-frank-2026-10-13.json', JSON.stringify(backup(data)));
      await box(p);
      const asked = await app.overlay(p);
      t.has(asked, 'Bring your plan here?', 'the box');
      t.has(asked, '28-day strength builder · 2 workouts · last on 11 Oct', 'the preview');
      t.lacks(asked, "added to what's on this phone", 'the box on a phone with nothing on it');
      t.equal(await app.stored(p), null, 'saved before the yes');
      await t.look(p, 'the box before a plan comes');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      const plan = await app.text(p);
      t.has(plan, '28-day strength builder', 'the Plan');
      t.has(plan, 'Round 1 · 2/12 done', "the Plan's ticks");
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await p.locator('.stats').first().innerText(), /^2\s*workouts/i, "Me's numbers");
      t.has(await app.text(p), 'Lee', "Me's name");
      const s = await app.stored(p);
      t.equal([s.sessions.map((r) => r.id), s.weights.map((w) => w.kg), s.profile.name, s.access], [['a1', 'a2'], [82], 'Lee', { trialStart: L.isoDay(-5) }],
        'saved [workouts, weights, name, access]');
    });

    await t.flow('restore: onto a phone with its own workouts, merged with no doubles, the earliest trial, never a membership; then Undo', async () => {
      const phone = L.state({ profile: L.profile({ name: 'Sam', start: L.isoDay(-2) }), access: { trialStart: L.isoDay(-2) },
        sessions: [rec('p1', 2), rec('both', 1)], weights: [{ date: L.isoDay(-2), kg: 80.4 }, { date: L.isoDay(-1), kg: 80 }],
        walks: { [L.isoDay(-1)]: 20 }, food: { [L.isoDay(-1)]: { water: 2, meals: [] } }, inbox: [L.spec({ i: 'f1', t: 'Lower body' })] });
      const file = L.state({ profile: L.profile({ name: 'Other', goal: 'fat', start: L.isoDay(-9) }), access: { trialStart: L.isoDay(-9), paid: true },
        sessions: [rec('both', 1), rec('f2', 6, { coach: 'f2' })], weights: [{ date: L.isoDay(-6), kg: 81 }, { date: L.isoDay(-1), kg: 79.6 }],
        walks: { [L.isoDay(-1)]: 10, [L.isoDay(-6)]: 30 }, food: { [L.isoDay(-1)]: { water: 1, meals: [{ t: '08:00', text: 'Oats', protein: true, veg: false }] } },
        inbox: [L.spec({ i: 'f1', t: 'Lower body' }), L.spec({ i: 'f2', t: 'Upper body' })], inboxDone: { f2: 'f2' }, done: { 1: 'f2' } });
      const p = await t.page({ state: phone });
      await app.tap(p, '.tab[data-tab="me"]');
      await pickFile(p, '[data-act="keep-restore"]', 'backup.json', JSON.stringify(backup(file)));
      await box(p);
      t.has(await app.overlay(p), "It's added to what's on this phone, and this phone keeps its own plan.", 'the box on a phone with a plan');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      const s = await app.stored(p);
      t.equal(s.sessions.map((r) => r.id), ['f2', 'p1', 'both'], 'workouts: each once, in time order');
      t.equal(s.weights.map((w) => [w.date, w.kg]), [[L.isoDay(-6), 81], [L.isoDay(-2), 80.4], [L.isoDay(-1), 79.6]], "weights by date: the file's on the same date");
      t.equal([s.walks[L.isoDay(-1)], s.walks[L.isoDay(-6)]], [20, 30], 'walks by date: the longer one');
      t.equal(s.food[L.isoDay(-1)].meals.map((m) => m.text), ['Oats'], 'food by date: the fuller day');
      t.equal([s.profile.name, s.profile.goal, s.profile.start, s.done], ['Sam', 'fit', L.isoDay(-2), {}], "this phone's plan, without another plan's ticks");
      t.equal([s.inbox.map((x) => x.i).sort(), s.inboxDone], [['f1', 'f2'], { f2: 'f2' }], "Frank's sessions, each once, with the tick that came along");
      t.equal(s.access, { trialStart: L.isoDay(-9) }, 'access: the earlier free trial, and no membership from a file');
      t.equal(await p.evaluate(() => WBF.app.status()), 'ended', 'the trial after: the earlier one has ended');
      t.has(await p.locator('[data-card="keep-undo"]').innerText().catch(() => ''), 'Not what you wanted?', 'the Undo card');
      t.has(await app.toast(p), 'Your plan is on this phone now.', 'toast');
      await t.look(p, 'plan with Undo');
      const n = (await app.toasts(p)).length;
      await app.tap(p, '[data-act="keep-undo"]');
      t.equal(await nextToast(p, n), 'Undone. This phone is as it was.', 'toast after Undo');
      const back = await app.stored(p);
      t.equal([back.sessions.map((r) => r.id), back.access, back.weights.length, back.inbox.length, back.profile.name], [['p1', 'both'], { trialStart: L.isoDay(-2) }, 2, 1, 'Sam'],
        'after Undo, the phone as it was [workouts, access, weights, sessions from Frank, name]');
      t.equal(await p.locator('[data-card="keep-undo"]').count(), 0, 'the Undo card after Undo');
    });

    await t.flow('two windows of one browser: a backup and its Undo hold in the other window, also after it saves', async () => {
      // the installed app next to the browser tab a link opened in: one storage, two windows that take in each other's
      // saves. A plan brought in shows in the other window; its Undo is taken there as it is, not merged back in
      const phone = L.member({ name: 'Two', start: L.isoDay(-3) }, { access: { trialStart: L.isoDay(-3) }, sessions: [rec('p1', 2)] });
      const file = L.state({ access: { client: true }, sessions: [rec('x1', 6), rec('x2', 5)], inbox: [L.spec({ i: 'fx', t: 'From the file' })] });
      const a = await t.page({ state: phone });
      const b = t.watch(await a.context().newPage());
      await b.goto(a.url());
      await L.settle(b);
      t.lastPage = a;
      await app.tap(b, '.tab[data-tab="today"]');
      await app.tap(a, '.tab[data-tab="me"]');
      await pickFile(a, '[data-act="keep-restore"]', 'backup.json', JSON.stringify(backup(file)));
      await box(a);
      await app.tap(a, '[data-act="modal-yes"]');
      await app.waitTitle(a, 'Plan');
      const other = () => b.evaluate(() => [WBF.app.state().sessions.map((r) => r.id), WBF.app.state().inbox.map((x) => x.i), WBF.app.status()]);
      await b.waitForFunction(() => WBF.app.state().sessions.length === 3, null, { timeout: 5000 }).catch(() => null);   // the storage event
      t.equal(await other(), [['x1', 'x2', 'p1'], ['fx'], 'client'], 'the other window after the plan came [workouts, sessions from Frank, status]');
      await app.tap(a, '[data-act="keep-undo"]');
      await b.waitForFunction(() => WBF.app.state().sessions.length === 1, null, { timeout: 5000 }).catch(() => null);
      t.equal(await other(), [['p1'], [], 'trial'], 'the other window after Undo [workouts, sessions from Frank, status]');
      await app.tap(b, '[data-act="water"][data-n="2"]');                // the other window saves
      await a.waitForFunction((d) => ((WBF.app.state().food || {})[d] || {}).water === 2, L.TODAY, { timeout: 5000 }).catch(() => null);
      const s = await app.stored(a);
      t.equal([s.sessions.map((r) => r.id), s.inbox.map((x) => x.i), s.access, (s.food[L.TODAY] || {}).water], [['p1'], [], { trialStart: L.isoDay(-3) }, 2],
        'saved after a water tap in the other window [workouts, sessions from Frank, access, water]');
      t.equal(await a.evaluate(() => [WBF.app.state().sessions.length, WBF.app.status()]), [1, 'trial'], 'the first window after that [workouts, status]');
      // a window that hadn't taken the Undo in yet saves its older copy over it: the first window saves its own again
      const stamp = (await app.stored(a)).stamp;
      await b.evaluate(([k, r]) => { const d = JSON.parse(localStorage.getItem(k)); d.stamp = 1; d.sessions.push(r); localStorage.setItem(k, JSON.stringify(d)); }, [L.KEY, rec('old1', 7)]);
      await a.waitForFunction(([k, n]) => JSON.parse(localStorage.getItem(k)).stamp === n, [L.KEY, stamp], { timeout: 5000 }).catch(() => null);
      const again = await app.stored(a);
      t.equal([again.stamp === stamp, again.sessions.map((r) => r.id)], [true, ['p1']], 'saved after an older copy came over it [the Undo\'s stamp, workouts]');
      await t.look(a, 'plan after Undo, with another window open');
    });

    await t.flow('move: a link made on one address brings the plan to another, opened and pasted', async () => {
      const a = await L.serve(), b = await L.serve();
      const pages = [];
      try {
        const st = L.member({ name: 'Ana', start: L.isoDay(-3) }, { sessions: [rec('m1', 3, { day: 1 })], done: { 1: 'm1' },
          coach: { templates: [L.spec({ i: 'tp1', t: 'Lower body, week 2' })] }, access: { client: true } });
        const p = await t.page({ server: a, state: st });
        pages.push(p);
        await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await app.tap(p, '.tab[data-tab="me"]');
        await app.tap(p, '[data-act="keep-move"]');
        await p.waitForSelector('#keep-link', { timeout: 10000 });
        const sheet = await app.overlay(p);
        t.has(sheet, 'Anyone with this link can see your answers. Keep it to yourself.', 'the move sheet: the privacy line');
        t.has(sheet, 'The app sends it nowhere', 'the move sheet: where the plan is');
        await t.look(p, 'the move sheet');
        const link = await p.inputValue('#keep-link');
        t.check(link.startsWith(a.home + 'index.html#move.z'), () => 'the link: ' + link.slice(0, 70));
        await app.tap(p, '[data-act="keep-copy"]');
        t.equal(await p.evaluate(() => navigator.clipboard.readText()), link, 'Copy puts the link on the clipboard');
        t.has(await app.toast(p), 'Link copied. Open it in the other browser.', 'toast after Copy');
        // the other address has its own storage, like another browser: the link, then a yes
        const q = await t.page({ server: b, href: link.replace(a.url, b.url) });
        pages.push(q);
        await box(q);
        t.equal(await q.evaluate(() => location.hash), '', 'the link left in the address bar');
        t.has(await app.overlay(q), '28-day fit for life · 1 workout · last on 11 Oct · 1 saved session', 'the preview on the other address');
        t.equal(await app.stored(q), null, 'saved on the other address before the yes');
        await app.tap(q, '[data-act="modal-yes"]');
        await app.waitTitle(q, 'Plan');
        const s = await app.stored(q);
        t.equal([s.profile.name, s.sessions.map((r) => r.id), s.done, s.coach.templates.map((x) => x.i), s.access, s.coachMode],
          ['Ana', ['m1'], { 1: 'm1' }, ['tp1'], { client: true }, null], "on the other address [name, workouts, ticks, Frank's saved sessions, client access, Coach tools]");
        t.has(await app.text(q), '28-day fit for life', 'the Plan on the other address');
        // pasted in a message, wrapped by a chat app (%23 for the #), on a third fresh browser
        const r = await t.page({ server: b });
        pages.push(r);
        await app.tap(r, '[data-act="keep-have"]');
        await app.waitTitle(r, 'Bring your plan');
        await r.fill('#keep-in', 'My plan: https://l.instagram.com/?u=' + link.replace('#', '%23') + ' (from my phone)');
        await app.tap(r, '[data-act="keep-in"]');
        await box(r);
        await app.tap(r, '[data-act="modal-yes"]');
        await app.waitTitle(r, 'Plan');
        t.equal((await app.stored(r)).profile.name, 'Ana', 'a pasted link');
        // the Paste button reads the clipboard
        const v = await t.page({ server: b });
        pages.push(v);
        await v.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await v.evaluate((x) => navigator.clipboard.writeText(x), link);
        await app.tap(v, '[data-act="keep-have"]');
        await app.tap(v, '[data-act="keep-paste"]');
        await box(v);
        t.has(await app.overlay(v), 'Bring your plan here?', 'the box after Paste');
      } finally {
        for (const pg of pages) await pg.context().close().catch(() => null);
        await a.close(); await b.close();
      }
    });

    await t.flow('refused: a broken file, a script in a title, a 5 MB file, a code from a newer app; nothing changes', async () => {
      const p = await t.page({ state: L.member({ name: 'Kim' }, { sessions: [rec('k1', 1)] }) });
      const before = JSON.stringify(await app.stored(p));
      await app.tap(p, '.tab[data-tab="me"]');
      const refused = async (what, want, act) => {
        const n = (await app.toasts(p)).length;
        await act();
        t.equal(await nextToast(p, n), want, what + ': the toast');
        t.equal(await app.overlay(p), '', what + ': no box');
        t.equal(JSON.stringify(await app.stored(p)), before, what + ': saved data');
      };
      await refused('broken JSON', NOT_OURS, () => pickFile(p, '[data-act="keep-restore"]', 'backup.json', '{"app":"wellness-by-frank","v":1,"data":{"v":2,'));
      const evil = backup(L.member({ name: 'Eve' }, { sessions: [rec('e1', 1, { title: 'Full body<script>window.__pwned = 1</script>' })],
        inbox: [L.spec({ i: 'ev', t: '<img src=x onerror="window.__pwned = 2">' })] }));
      await refused('a script tag in a title', NOT_OURS, () => pickFile(p, '[data-act="keep-restore"]', 'backup.json', JSON.stringify(evil)));
      await refused('a 5 MB file', 'That file is too big to be a backup from this app.', () => pickFile(p, '[data-act="keep-restore"]', 'big.json', Buffer.alloc(5 * 1024 * 1024, 32)));
      await refused('another app\'s file', NOT_OURS, () => pickFile(p, '[data-act="keep-restore"]', 'other.json', JSON.stringify({ app: 'other', v: 1, data: L.member() })));
      await refused('a code from a newer app (v 99)', 'This plan is from a newer version of the app. Update the app first: close it and open it again.',
        () => p.evaluate((h) => { location.hash = h; }, 'move.' + moveCode({ app: 'wellness-by-frank', v: 99, data: L.member() })));
      await refused('a broken code', "That link didn't work. Make a new one on your other phone.", () => p.evaluate(() => { location.hash = '#move.zNotAMoveCodeAtAll'; }));
      t.equal(await p.evaluate(() => window.__pwned), undefined, 'a script from a file ran');
      await t.look(p, 'me after refused files and links');
    });

    await t.flow('a move link during a workout waits for its end', async () => {
      const p = await t.page({ state: L.member(), speed: 50 });
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');
      const other = L.member({ name: 'Zed', start: L.isoDay(-8) }, { sessions: [rec('w1', 8)] });
      await p.evaluate((h) => { location.hash = h; }, 'move.' + moveCode(backup(other)));
      await p.waitForTimeout(600);
      t.equal([await p.evaluate(() => !!document.querySelector('#app .player')), await app.overlay(p), await p.evaluate(() => location.hash)], [true, '', ''],
        'during the workout [the player, a box, the address bar]');
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await box(p);
      t.has(await app.overlay(p), '1 workout · last on 6 Oct', 'the box after the workout');
    });

    await t.flow("Instagram's browser: a warning on Welcome under a smaller coach, the move first on the Plan; none in Safari", async () => {
      const card = (pg) => pg.locator('[data-card="keep-inapp"]').innerText().catch(() => '');
      const done = (pg) => pg.context().close().catch(() => null);
      // Welcome keeps its heading, and on a phone this size its whole text, above the buttons: the coach makes room
      const fits = (pg) => pg.evaluate(() => {
        const cta = document.querySelector('.ob-cta').getBoundingClientRect().top, r = (s) => document.querySelector(s).getBoundingClientRect().bottom;
        return [r('.welcome-text h1') <= cta, r('.welcome-text p') <= cta];
      });
      const ig = await t.page({ ua: L.UA.instagramIphone });
      t.has(await card(ig), "You're in Instagram's browser. To keep your plan, tap", 'Welcome in Instagram on an iPhone');
      t.has(await card(ig), 'Open in external browser', 'the steps on an iPhone');
      t.equal(await fits(ig), [true, true], 'Welcome in Instagram at 390x844, above the buttons [the heading, its text]');
      await t.look(ig, 'welcome in Instagram on an iPhone');
      await done(ig);
      const se = await t.page({ ua: L.UA.instagramIphone, width: 375, height: 667 });
      t.equal((await fits(se))[0], true, 'Welcome in Instagram at 375x667: the heading above the buttons');
      await done(se);
      const and = await t.page({ ua: L.UA.instagramAndroid });
      t.has(await card(and), "You're in Instagram's browser. To keep your plan, open the app in Chrome.", 'Welcome in Instagram on Android');
      const href = await and.locator('[data-card="keep-inapp"] a').getAttribute('href').catch(() => '') || '';
      t.check(href.startsWith('intent://127.0.0.1:') && /#Intent;scheme=http;package=com\.android\.chrome;.*;end$/.test(href), () => 'the Chrome link on Android: ' + href);
      t.equal(await fits(and), [true, true], 'Welcome in Instagram on Android at 390x844, above the buttons [the heading, its text]');
      await t.look(and, 'welcome in Instagram on Android');
      await done(and);
      const safari = await t.page({ ua: L.UA.iphone });
      t.equal(await safari.locator('[data-card="keep-inapp"]').count(), 0, 'Welcome in Safari: warnings');
      await done(safari);
      // a plan made in Instagram's browser anyway: the Plan's first card moves it
      const made = await t.page({ ua: L.UA.instagramIphone, state: L.member() });
      t.has(await card(made), 'Move my plan', "the Plan in Instagram's browser");
      t.check(await made.evaluate(() => { const c = document.querySelector('[data-card="keep-inapp"]'), h = document.querySelector('.plan-card'); return !!c && !!h && !!(c.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }),
        "the move card is not above the plan card on the Plan in Instagram's browser");
      await app.tap(made, '[data-card="keep-inapp"] [data-act="keep-move"]');
      await made.waitForSelector('#keep-link', { timeout: 10000 });
      await done(made);
      const plain = await t.page({ ua: L.UA.iphone, state: L.member() });
      t.equal(await plain.locator('[data-card="keep-inapp"]').count(), 0, 'the Plan in Safari: move cards');
    });

    await t.flow("Instagram's browser: Frank's client who came by his session link gets the move card on the Plan", async () => {
      // the session opens first, never Welcome, and a client has no plan of their own: the Plan under the session says
      // that the session and the access stay in that browser, and its move link carries them
      const card = (pg) => pg.locator('[data-card="keep-inapp"]').innerText().catch(() => '');
      const client = await t.page({ ua: L.UA.instagramIphone, hash: 'frank.' + L.pack(L.spec({ i: 'ig1', t: 'Glutes and core' })) });
      await app.waitHeading(client, 'Glutes and core');
      await app.tap(client, '[data-act="back"]');
      await app.waitTitle(client, 'Plan');
      t.has(await card(client), "You're in Instagram's browser, and your sessions from Frank stay in it. Move them to Safari or Chrome.", "the Plan of Frank's client in Instagram's browser");
      await t.look(client, "plan of Frank's client in Instagram's browser");
      await app.tap(client, '[data-card="keep-inapp"] [data-act="keep-move"]');
      await client.waitForSelector('#keep-link', { timeout: 10000 });
      const sent = await client.evaluate(async (v) => WBF.keep.check(await WBF.keep.decode(v.split('#move.')[1]), 'link').data, await client.inputValue('#keep-link'));
      t.equal([sent.access, sent.inbox.map((x) => x.i)], [{ client: true }, ['ig1']], "the client's move link carries [access, sessions from Frank]");
      await client.context().close().catch(() => null);
      const none = await t.page({ ua: L.UA.instagramIphone });
      await app.tap(none, '[data-act="browse"]');                     // Look around first: nothing saved yet
      await app.tap(none, '.tab[data-tab="plan"]');
      await app.waitTitle(none, 'Plan');
      t.equal(await none.locator('[data-card="keep-inapp"]').count(), 0, "the Plan in Instagram's browser with nothing to keep yet: move cards");
    });

    await t.flow('the Home Screen sheet: once after the first workout on a phone, never in the installed app', async () => {
      const p = await t.page({ ua: L.UA.iphone, state: L.member(), speed: 50 });
      await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await shortWorkout(p);
      const sheet = await sheetText(p, 'Keep your progress');
      t.has(sheet, 'Keep your progress', 'the sheet after the first workout');
      t.has(sheet, 'Add to Home Screen', 'the iPhone steps');
      t.has(sheet, 'Share in Safari', 'the iPhone steps: the browser');
      t.has(sheet, 'Anyone with this link can see your answers. Keep it to yourself.', 'the iPhone steps: who can see the plan it copies');
      await t.look(p, 'the Home Screen sheet on an iPhone');
      await p.waitForTimeout(200);                           // the move link is made as the sheet opens
      await app.tap(p, '[data-act="keep-copy-home"]');
      const copied = await p.evaluate(() => navigator.clipboard.readText());
      t.check(copied.startsWith(p.srv.home + 'index.html#move.z'), () => 'Copy my plan: ' + copied.slice(0, 60));
      t.has(await app.toast(p), 'Your plan is copied. In the new app, tap I already have a plan.', 'toast after Copy my plan');
      await app.tap(p, '#overlay [data-act="close"]');
      t.has(await p.locator('[data-card="keep-home"]').innerText().catch(() => ''), 'Show me how', 'the finish screen keeps the way back to the sheet');
      t.equal((await app.stored(p)).keep.installAsked, L.TODAY, 'saved: the day the sheet came up');
      await app.tap(p, '[data-act="feel"][data-v="right"]');
      t.equal(await sheetText(p), '', 'after a tap on the finish screen: the sheet again');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await shortWorkout(p);
      t.equal(await sheetText(p), '', 'after a second workout: the sheet again');
      t.step('Android');
      const and = await t.page({ ua: L.UA.android, state: L.member(), speed: 50 });
      // Chrome offers its own install prompt
      await and.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted = (window.__prompted || 0) + 1; return Promise.resolve(); }; window.dispatchEvent(e); });
      await shortWorkout(and);
      t.has(await sheetText(and, 'Install the app'), 'Install the app', 'the sheet on Android, with the browser\'s prompt');
      await t.look(and, 'the Home Screen sheet on Android');
      await app.tap(and, '[data-act="keep-install-now"]');
      t.equal([await and.evaluate(() => window.__prompted), await app.overlay(and)], [1, ''], "Install the app [the browser's prompt shown, the sheet]");
      t.step("Instagram's browser, which can't put the app on the Home Screen");
      const ig = await t.page({ ua: L.UA.instagramIphone, state: L.member(), speed: 50 });
      await shortWorkout(ig);
      t.equal(await sheetText(ig), '', "Instagram's browser after the first workout: the sheet");
      t.equal(((await app.stored(ig)).keep || {}).installAsked || null, null, "Instagram's browser: saved as asked");
      await ig.context().close().catch(() => null);
      t.step('the installed app');
      const inst = await t.page({ ua: L.UA.iphone, state: L.member(), speed: 50, go: false });
      await inst.addInitScript(() => {
        const mm = window.matchMedia.bind(window);
        window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q));
      });
      await inst.goto(inst.srv.home + 'index.html');
      await L.settle(inst);
      await shortWorkout(inst);
      t.equal(await sheetText(inst), '', 'the installed app (display-mode standalone): the sheet');
      t.equal(await inst.locator('[data-card="keep-home"]').count(), 0, 'the installed app: the card');
      t.equal(((await app.stored(inst)).keep || {}).installAsked || null, null, 'the installed app: saved as asked');
    });

    await t.flow("Me's Put it on your home screen: on an iPhone the steps that copy the plan first, in Instagram's browser the move", async () => {
      const homeCard = (pg) => pg.evaluate(() => { const c = [...document.querySelectorAll('.card')].find((x) => /Put it on your home screen/i.test(x.innerText)); return c ? c.innerText : ''; });
      const crios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1';
      for (const [ua, name, browser] of [[L.UA.iphone, 'Safari on an iPhone', 'Safari'], [crios, 'Chrome on an iPhone', 'Chrome']]) {
        const p = await t.page({ ua, state: L.member() });
        await app.tap(p, '.tab[data-tab="me"]');
        t.lacks(await homeCard(p), 'Add to Home Screen', name + ": Me's card, steps without the copy");
        await app.tap(p, '[data-act="keep-install"]');
        const sheet = await sheetText(p, 'Copy my plan');
        t.has(sheet, 'Copy my plan', name + ': the sheet from Me');
        t.has(sheet, 'Share in ' + browser + '.', name + ': the sheet names the browser');
        t.has(sheet, 'Anyone with this link can see your answers. Keep it to yourself.', name + ': who can see the plan it copies');
        if (browser === 'Safari') await t.look(p, 'the Home Screen sheet from Me on an iPhone');
        await p.context().close().catch(() => null);
      }
      const ig = await t.page({ ua: L.UA.instagramIphone, state: L.member() });
      await app.tap(ig, '.tab[data-tab="me"]');
      t.has(await homeCard(ig), "You're in Instagram's browser, and your plan stays in it. Move it to Safari or Chrome.", "Instagram's browser: Me's card");
      t.equal(await ig.locator('.card [data-act="keep-move"]').count(), 2, "Instagram's browser: Move my plan [in the Home Screen card, in Your data]");
      await t.look(ig, "me in Instagram's browser");
      await ig.context().close().catch(() => null);
      const and = await t.page({ ua: L.UA.android, state: L.member() });
      await app.tap(and, '.tab[data-tab="me"]');
      t.has(await homeCard(and), 'open the browser menu and tap Install app', "Android without Chrome's own prompt: Me's card, the app's own steps (an installed app keeps the browser's data there)");
    });

    await t.flow("what comes along: all of Frank's sessions, data the first version saved, never a trial that starts later", async () => {
      // a long-time client: every session from Frank, newest first as the app keeps them
      const inbox = Array.from({ length: 150 }, (_, k) => L.spec({ i: 'f' + (150 - k), t: 'Session ' + (150 - k), d: L.isoDay(-(k + 1)) }));
      const p = await t.page({ state: L.state({ access: { client: true }, inbox }) });
      t.equal(await p.evaluate(async () => {
        const got = WBF.keep.check(await WBF.keep.decode(await WBF.keep.encode(WBF.keep.payload(false))), 'link').data;
        return [got.inbox.length, got.inbox[0].i, got.inbox[got.inbox.length - 1].i];
      }), [150, 'f150', 'f1'], "a move link of a client with 150 sessions from Frank [sessions, the newest, the oldest]");
      await p.context().close().catch(() => null);
      // a phone whose data the app's first version saved (v 1, an age band in place of the year of birth): its backup
      const first = L.member({ name: 'Ada', age: '45', birthYear: undefined }, { v: 1, sessions: [rec('v1a', 4)] });
      const q = await t.page();
      await app.tap(q, '[data-act="keep-have"]');
      await pickFile(q, '[data-act="keep-restore"]', 'wellness-by-frank-2026-10-13.json', JSON.stringify(backup(first)));
      await box(q);
      t.has(await app.overlay(q), '1 workout · last on 10 Oct', 'the box for data the first version saved');
      await app.tap(q, '[data-act="modal-yes"]');
      await app.waitTitle(q, 'Plan');
      const s = await app.stored(q);
      t.equal([s.profile.name, s.profile.birthYear, s.sessions.map((x) => x.id), s.v], ['Ada', +L.TODAY.slice(0, 4) - 52, ['v1a'], 2],
        'saved from it [name, year of birth from its age band, workouts, v]');
      await q.context().close().catch(() => null);
      // a free trial can't have started after today: a file that says so gives a trial from today at the latest
      const z = await t.page();
      await app.tap(z, '[data-act="keep-have"]');
      await pickFile(z, '[data-act="keep-restore"]', 'backup.json', JSON.stringify(backup(L.member({ name: 'Fut' }, { access: { trialStart: '2099-01-01' }, sessions: [rec('z1', 1)] }))));
      await box(z);
      await app.tap(z, '[data-act="modal-yes"]');
      await app.waitTitle(z, 'Plan');
      t.equal([(await app.stored(z)).access, await z.evaluate(() => [WBF.app.status(), WBF.app.daysLeft()])], [{ trialStart: L.TODAY }, ['trial', 7]],
        'a trial start in 2099 [saved, status, days left]');
    });

    await t.flow('storage the browser keeps: asked after the first workout', async () => {
      const p = await t.page({ state: L.member(), speed: 50, go: false });
      await p.addInitScript(() => {
        const qa = window.__persist = { asked: 0, granted: false };
        navigator.storage.persist = () => { qa.asked++; qa.granted = true; return Promise.resolve(true); };
        navigator.storage.persisted = () => Promise.resolve(qa.granted);
      });
      await p.goto(p.srv.home + 'index.html');
      await L.settle(p);
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Not protected yet: save a backup.', 'Me before the first workout');
      t.equal(await p.evaluate(() => window.__persist.asked), 0, 'asked before the first workout');
      await shortWorkout(p);
      t.equal(await p.evaluate(() => window.__persist.asked), 1, 'asked after the first workout');
      t.equal((await app.stored(p)).keep.persisted, L.TODAY, 'saved: the day the browser said yes');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), 'Protected from automatic clearing.', 'Me after');
    });

    await t.flow("a phone that can't save: the warning, then a backup from what's on screen", async () => {
      const p = await t.page({ state: L.member() });
      await p.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }; });
      await app.tap(p, '.tab[data-tab="today"]');
      await app.tap(p, '[data-act="water"][data-n="2"]');
      t.equal(await app.toast(p), SAVE_FAIL, 'the warning after a water tap');
      await app.tap(p, '.tab[data-tab="me"]');
      t.has(await app.text(p), "Save a backup now. It holds everything on screen, also what this phone couldn't save.", "Me's data card");
      t.equal([await p.locator('[data-act="keep-save"]').count(), await p.locator('[data-act="keep-move"]').count(), await p.locator('[data-act="keep-restore"]').count()], [1, 0, 0],
        'Me offers [Save a backup, Move my plan, Restore from a backup]');
      await t.look(p, 'me when the phone cannot save');
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), app.tap(p, '[data-act="keep-save"]')]);
      const file = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
      t.equal(file.data.food[L.TODAY].water, 2, 'the backup holds the water the phone could not save');
      // nothing is brought to a phone that can't keep it
      const n = (await app.toasts(p)).length;
      await p.evaluate((h) => { location.hash = h; }, 'move.' + moveCode(backup(L.member({ name: 'Ola' }))));
      t.equal(await nextToast(p, n), "This browser can't keep your plan: it's in private mode or blocks storage. Open the app in a normal window.", 'a move link');
      t.equal(await app.overlay(p), '', 'a move link: the box');
    });

    await t.flow('the app moved: every tab says so, and Bring my progress takes it to the new address', async () => {
      const a = await L.serve(), b = await L.serve();
      const pages = [];
      try {
        const p = await t.page({ server: a, state: L.member({ name: 'Mo' }, { sessions: [rec('mv1', 2)] }) });
        pages.push(p);
        t.equal(await p.locator('[data-card="keep-moved"]').count(), 0, 'before the move (FRANK.home empty): banners');
        await p.evaluate((h) => { WBF.FRANK.home = h; WBF.app.tab('plan'); }, b.home);
        for (const tab of ['plan', 'workouts', 'today', 'me', 'frank']) {
          await app.tap(p, '.tab[data-tab="' + tab + '"]');
          t.has(await p.locator('[data-card="keep-moved"]').innerText().catch(() => ''), "Frank's app has moved", tab + ': the banner');
        }
        await app.tap(p, '.tab[data-tab="plan"]');
        t.has(await p.locator('[data-card="keep-moved"]').innerText(), "It's at " + b.url.replace('http://', '') + ' now.', 'the banner names the new address');
        await t.look(p, 'plan after the app moved');
        await p.evaluate(() => { WBF.keep.leave = (u) => { window.__left = u; }; });
        await app.tap(p, '[data-card="keep-moved"] [data-act="keep-moved"]');
        await p.waitForFunction(() => window.__left, null, { timeout: 5000 }).catch(() => null);
        const to = await p.evaluate(() => window.__left || '');
        t.check(to.startsWith(b.home + '#move.z'), () => 'Bring my progress goes to the new address with a move link: ' + to.slice(0, 70));
        t.equal((await app.stored(p)).keep.movedTo, b.home, 'saved: where the progress went');
        // the new address: the same plan after a yes, and no banner there
        const q = await t.page({ server: b, href: to });
        pages.push(q);
        await box(q);
        await app.tap(q, '[data-act="modal-yes"]');
        await app.waitTitle(q, 'Plan');
        const s = await app.stored(q);
        t.equal([s.profile.name, s.sessions.map((r) => r.id)], ['Mo', ['mv1']], 'at the new address [name, workouts]');
        await q.evaluate((h) => { WBF.FRANK.home = h; WBF.app.tab('plan'); }, b.home);
        t.equal(await q.locator('[data-card="keep-moved"]').count(), 0, 'at the new address: banners');
      } finally {
        for (const pg of pages) await pg.context().close().catch(() => null);
        await a.close(); await b.close();
      }
    });
  }
};

if (require.main === module) L.main([module.exports]);
