/* Wellness by Frank: TEMPLATE for a feature in its own file. Copy it to js/<feature>.js, rename every "example" (the
   function, KEY, the action names, the screen, the link), and replace these lines with what the module adds, in one
   line. How modules plug in: .claude/skills/frank-module/SKILL.md.

   This example puts a card on Today once a workout is done, with Open (a screen of its own) and Hide (it stays hidden).
   It counts finished workouts in its own data, and a link, #example.open, opens its screen. Its test is at the end.
   The words are placeholders: every line a person reads goes to docs/TEXT-FOR-FRANK.md (.claude/skills/frank-words). */
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};
  var KEY = 'example';                        // the module's data: S.example in wbf.v1, and nothing anywhere else

  // queued now, started by js/app.js before it draws the first screen. The function's name names the module in errors
  (WBF.ext = WBF.ext || []).push(function example(app) {
    var u = app.util;
    app.data(KEY);                            // claims the key at the start, so a clash stops the module here and now

    // The data, made the first time it is needed. Ask for it each time, never keep it: another window's save or Delete
    // my data puts a new object there. v is its version, for a migration later
    function mine() { return app.data(KEY, function () { return { v: 1, done: 0, hidden: null }; }); }

    // An event: a workout was saved. rec is its record in the history, s the session that ran
    app.on('finish', function (rec, s) {
      mine().done++;
      app.save();
    });

    // A card on Today, under the heading. A one-card slot shows the card with the highest priority; null shows none.
    // It reads the data without making it: no card, no data
    app.card('today.top', function () {
      var d = app.state()[KEY];
      if (!d || !d.done || d.hidden) return null;
      return { id: 'example', priority: 10, html: '<section class="card"><p class="label">Example</p>' +
        '<p class="small">' + u.esc(u.plural(d.done, 'workout')) + ' done since this card came.</p>' +
        '<div class="rowx"><button class="btn two small" data-act="example-open">Open</button>' +
        '<button class="btn two small" data-act="example-hide">Hide</button></div></section>' };
    });

    // Actions: data-act="example-open" and "example-hide". Start each name with the module's: a clash stops the module
    app.action('example-open', function () { app.go('example', {}); });
    app.action('example-hide', function () {
      mine().hidden = u.iso();
      var ok = app.save();                    // false: the phone didn't save, so no toast says it worked
      app.refresh();                          // the screen again, where it was
      if (ok) app.toast('Hidden');
    });

    // A screen of its own. Its title is the screen's name: document.title before " · ", app.waitTitle() in tests
    app.screen('example', {
      title: function () { return 'Example'; },
      html: function () {
        return '<div class="screen bare">' + u.backBar('Example') + '<h1 class="h1">Example</h1>' +
          '<p class="lead">' + u.esc(u.plural(mine().done, 'workout')) + ' done since this card came.</p></div>';
      }
    });

    // A link: #example.open opens the screen when the app opens with it ('boot') or in a tab that has the app already
    // ('hash'). The app has taken it out of the address bar and closed what was open. true: this module opened it.
    // One app.go(), over the screen that is showing: Back goes back there. Never app.tab() and then app.go() (the
    // phone's Back goes wrong), and never during a workout
    function link(h) {
      if (h !== 'example.open' || app.cur().name === 'player') return false;
      app.go('example', {});
      return true;
    }
    app.on('boot', link);
    app.on('hash', link);
  });
})(window);

/* The test it needs: a flow in the suite for the area the module touches (tools/test/<suite>.cjs), and its screens in
   tools/test/screens.cjs. tools/test/smoke.cjs runs this same flow on this file ("modules: ..."), so it stays true.

    await t.flow('example: the card, Open, Hide, a finished workout, the link', async () => {
      // a member who finished a workout since the module came: the card is on Today
      const p = await t.page({ state: L.member({}, { example: { v: 1, done: 1, hidden: null } }), speed: 50 });
      await app.tap(p, '.tab[data-tab="today"]');
      t.has(await p.locator('[data-card="example"]').innerText(), '1 workout done', 'the card on Today');
      await t.look(p, 'today with the example card');
      await app.tap(p, '[data-act="example-open"]');
      await app.waitTitle(p, 'Example');
      await t.look(p, 'the example screen');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Today');
      await app.tap(p, '[data-act="example-hide"]');
      t.equal(await p.locator('[data-card="example"]').count(), 0, 'the card after Hide');
      t.equal((await app.stored(p)).example.hidden, L.TODAY, 'saved after Hide: hidden');
      // the event: a workout ended after its first move counts too
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');
      await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
      if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
      await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Workout complete');
      t.equal((await app.stored(p)).example.done, 2, 'workouts counted after one more');
      // the link, on a phone that never had the app
      const q = await t.page({ hash: 'example.open' });
      await app.waitTitle(q, 'Example');
      t.equal(await q.evaluate(() => location.hash), '', 'the link left in the address bar');
    });
*/
