// smoke: a quick walk through every tab and the main sheets. Fast enough to run after any change.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

module.exports = {
  name: 'smoke',
  about: 'every tab, the exercise sheet, a workout, the player starts, logging walks, water, meals and weight, delete my data, a phone that can\'t save, other options in the sheet, muscle maps when the coach comes in late, Back after a tab switch, the scroll after Back and after a workout, the activity slider, the Personal prototype',
  async run(t) {
    await t.flow('first visit', async () => {
      const p = await t.page();
      await t.look(p, 'welcome');
      t.has(await app.text(p), 'Your personal plan', 'welcome');
      t.equal(await app.title(p), 'Wellness by Frank', 'welcome title');
      await app.tap(p, '[data-act="ob-start"]');
      await app.tap(p, '.part .btn');
      await t.look(p, 'onboarding goal');
      t.has(await app.text(p), "What's your main goal?", 'onboarding');
      // "Look around first" opens the catalogue without a plan
      const q = await t.page();
      await app.tap(q, '[data-act="browse"]');
      await app.waitTitle(q, 'Workouts');
      await t.look(q, 'browse without a plan');
      await app.tap(q, '.tab[data-tab="plan"]');
      await t.look(q, 'plan without a profile');
      t.has(await app.text(q), 'Your 28-day plan', 'plan without a profile');
    });

    await t.flow('member', async () => {
      const p = await t.page({ state: L.member() });
      await app.waitTitle(p, 'Plan');
      await t.look(p, 'plan');
      const txt = await app.text(p);
      t.has(txt, 'Start day 1', 'plan');
      t.has(txt, 'Your 28 days', 'plan');
      for (const tab of ['workouts', 'today', 'me', 'frank']) {
        await app.tap(p, '.tab[data-tab="' + tab + '"]');
        await t.look(p, tab);
        t.check((await p.locator('.tab[aria-current="page"]').getAttribute('data-tab')) === tab, tab + ': the tab bar does not mark ' + tab);
      }
      // Workouts: body part, search, library
      await app.tap(p, '.tab[data-tab="workouts"]');
      await app.tap(p, '[data-act="body"][data-v="legs"]');
      t.has(await app.text(p), 'Legs & glutes', 'workouts › legs');
      await p.fill('#wq', 'plank');
      await p.waitForTimeout(200);
      t.has(await p.locator('#wq-results').innerText(), 'Plank', 'search "plank"');
      await p.fill('#wq', '');
      await app.tap(p, '[data-act="moves"]');
      await app.waitTitle(p, 'Exercise library');
      t.check((await p.locator('#move-list [data-act="ex-list"]').count()) >= 60, 'exercise library lists fewer than 60 moves');
      await t.look(p, 'exercise library');
      // the exercise sheet: three tabs and the pager
      await app.tap(p, '#move-list [data-act="ex-list"]', { nth: 3 });
      for (const tab of ['video', 'muscle', 'howto']) {
        await app.tap(p, '#overlay [data-act="xs-tab"][data-v="' + tab + '"]');
        await t.look(p, 'exercise sheet ' + tab);
        t.check((await p.locator('#overlay [data-act="xs-tab"][data-v="' + tab + '"]').getAttribute('aria-pressed')) === 'true', 'sheet tab ' + tab + ' is not marked');
      }
      const first = await p.locator('#overlay h2').first().innerText();
      await app.tap(p, '#overlay [data-act="xs-go"][data-d="1"]');
      t.check((await p.locator('#overlay h2').first().innerText()) !== first, 'the sheet pager did not move to the next exercise');
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      t.check(await p.locator('#overlay').isHidden(), 'the exercise sheet did not close');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Workouts');
      // a plan day, its detail and the player
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="open-day"][data-day="1"]', { nth: 0 });
      await t.look(p, 'workout detail');
      t.has(await app.text(p), 'Day 1 · Week 1', 'workout detail');
      await app.tap(p, '[data-act="start"]');
      await app.waitTitle(p, 'Workout');
      await t.look(p, 'player ready');
      await app.tap(p, '[data-act="pl-skip"]');
      await t.look(p, 'player move');
      const moving = await p.evaluate(async () => {
        const c = document.querySelector('.pl-fig canvas'); if (!c) return false;
        const a = c.toDataURL(); await new Promise((r) => setTimeout(r, 700)); return a !== c.toDataURL();
      });
      t.check(moving, 'player: the 3D coach is not moving');
      // other screens reachable from the tabs
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.tap(p, '.tab[data-tab="frank"]');
      await app.tap(p, '[data-act="science"]', { nth: 0 });
      await app.waitTitle(p, 'The science');
      await t.look(p, 'science', { kcal: false });
      await app.tap(p, '[data-act="back"]');
      await app.tap(p, '[data-act="coach"]');
      await app.waitTitle(p, 'Coach tools');
      await t.look(p, 'coach tools');
    });

    await t.flow('what people log: walks, water, meals, weight, delete my data', async () => {
      const p = await t.page({ state: L.member() });
      const saved = () => app.stored(p);
      await app.tap(p, '.tab[data-tab="today"]');
      t.step('walks');
      await app.tap(p, '[data-act="walk"][data-m="10"]');
      t.has(await app.toast(p), 'Activity logged: 10 min', 'toast');
      await app.tap(p, '[data-act="walk"][data-m="20"]');
      t.has(await app.text(p), '30 min today', 'Today after +10 and +20');
      t.has(await app.text(p), '30 of 150', 'moving minutes this week');
      t.equal((await saved()).walks, { [L.TODAY]: 30 }, 'saved walks');
      await app.tap(p, '[data-act="walk"][data-m="0"]');
      t.lacks(await app.text(p), 'min today', 'Today after Clear');
      t.step('water');
      await app.tap(p, '[data-act="water"][data-n="3"]');
      t.has(await app.text(p), '3 of 8 glasses', 'water');
      await app.tap(p, '[data-act="water"][data-n="3"]');
      t.has(await app.text(p), '2 of 8 glasses', 'water after tapping the last glass again');
      t.step('meals');
      await p.fill('#meal-in', 'Oats with berries');
      await p.press('#meal-in', 'Enter');
      await p.waitForTimeout(150);
      await app.tap(p, '[data-act="meal-tag"][data-i="0"][data-k="protein"]');
      t.has(await app.text(p), '1 meal: 1 with protein, 0 with vegetables', 'meals today');
      const food = (await saved()).food[L.TODAY] || {};
      t.equal([food.water, (food.meals || []).map((m) => [m.text, m.protein, m.veg])], [2, [['Oats with berries', true, false]]], 'saved food [water, meals]');
      await t.look(p, 'today with a walk, water and a meal');
      await app.tap(p, '[data-act="meal-del"][data-i="0"]');
      t.has(await app.text(p), 'Write down what you eat', 'meals after removing the only one');
      t.step('weight');
      await app.tap(p, '.tab[data-tab="me"]');
      await p.fill('#w-in', 'heavy');
      await p.press('#w-in', 'Enter');
      t.has(await app.toast(p), 'Enter your weight as a number', 'a weight that is not a number');
      await p.fill('#w-in', '79,5');
      await p.press('#w-in', 'Enter');
      await p.waitForTimeout(150);
      t.equal((await saved()).weights, [{ date: L.TODAY, kg: 79.5 }], 'saved weight (typed with a decimal comma)');
      await t.look(p, 'me with a weight');
      t.step('delete my data');
      await app.tap(p, '[data-act="reset"]');
      t.has(await app.overlay(p), 'Delete everything?', 'confirm box');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Wellness by Frank');
      const left = await p.evaluate((k) => localStorage.getItem(k), L.KEY);
      t.check(!left || !JSON.parse(left).profile, 'a profile is still stored after "Delete everything"');
    });

    await t.flow('storage full: the phone says so', async () => {
      // every save refused (a full phone, or storage blocked in private browsing): the app says so once, Me keeps
      // saying it, and nothing claims "Saved"
      const fail = "This phone isn't saving your progress. Storage is full or blocked.";
      const p = await t.page({ state: L.member(), speed: 50 });
      await p.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }; });
      await app.tap(p, '.tab[data-tab="today"]');
      await app.tap(p, '[data-act="water"][data-n="2"]');
      t.equal(await app.toast(p), fail, 'toast after a save that failed');
      await app.tap(p, '[data-act="walk"][data-m="10"]');
      t.equal((await app.toasts(p)).filter((x) => x === fail).length, 1, 'warnings after two saves that failed (the first one only)');
      await app.tap(p, '[data-act="walk"][data-m="20"]');
      t.equal((await app.toasts(p)).filter((x) => /^Activity logged/.test(x)), [], '"Activity logged" toasts after walks that could not be saved');
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('#save-fail').innerText().catch(() => 'nothing'), fail, 'Me after a save that failed');
      await p.fill('#w-in', '79');
      await p.press('#w-in', 'Enter');
      await p.waitForTimeout(150);
      t.equal((await app.toasts(p)).filter((x) => x === 'Logged').length, 0, '"Logged" toasts after a weight that could not be saved');
      await t.look(p, 'me when nothing can be saved');
      t.step('a workout ended early');
      await app.tap(p, '.tab[data-tab="plan"]');
      await app.tap(p, '[data-act="start-day"]');
      await app.waitTitle(p, 'Workout');
      // the countdowns run 50 times faster: a move with reps waits for Done, a timed one ends by itself
      await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
      if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
      await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Workout complete');
      const label = await p.locator('#app .label').first().innerText();
      t.check(/^\d+ of \d+ moves$/i.test(label.trim()), 'finish screen when nothing could be saved: "' + label + '" (expected "N of M moves", no "Saved")');
    });

    await t.flow('other options in the sheet', async () => {
      // "Other options" in a sheet open that move's sheet; its tabs must work like the first sheet's
      const p = await t.page({ state: L.member() });
      await p.evaluate(() => WBF.app.sheet('push-up'));
      t.has(await app.overlay(p), 'Other options', 'push-up sheet');
      const first = await p.evaluate(() => WBF.EX['push-up'].name);
      await app.tap(p, '#overlay [data-act="ex"]', { nth: 0 });
      const name = await p.locator('#overlay h2').first().innerText();
      t.check(name !== first, 'Other options did not open another move');
      for (const tab of ['muscle', 'howto']) {
        await app.tap(p, '#overlay [data-act="xs-tab"][data-v="' + tab + '"]');
        t.equal(await p.locator('#overlay [data-act="xs-tab"][aria-pressed="true"]').getAttribute('data-v'), tab, 'tab in the sheet of another option (' + name + ')');
      }
      await t.look(p, 'sheet of another option');
      // the showcase's hook opens a sheet on a tab, also while another sheet is open
      await p.evaluate(() => WBF.app.sheet('squat', 'muscle'));
      t.equal(await p.locator('#overlay [data-act="xs-tab"][aria-pressed="true"]').getAttribute('data-v'), 'muscle', 'WBF.app.sheet(id, "muscle") over an open sheet');
    });

    await t.flow('a late coach: the muscle maps show', async () => {
      // a slow phone: a workout and an exercise sheet opened before the coach is in get its muscle maps when it comes
      const p = await t.page({ state: L.member(), go: false });
      const coachIn = await app.holdCoach(p);
      await p.goto(p.srv.home + 'index.html');
      await L.settle(p, { threeD: false });
      await app.tap(p, '[data-act="open-day"][data-day="1"]', { nth: 0 });
      await p.waitForSelector('.wd-title');
      await app.tap(p, '[data-act="ex-wo"]', { nth: 0 });
      const all = (maps) => maps.length > 0 && maps.every(Boolean);
      const shown = async () => [await p.evaluate(() => WBF.fig3d.ready()), all(await app.maps(p)), all(await app.maps(p, '#overlay'))];
      t.equal(await shown(), [false, false, false], 'before the coach is let in [coach in, workout maps showing, sheet maps showing]');
      await coachIn();
      t.equal(await shown(), [true, true, true], 'once the coach is in [coach in, workout maps showing, sheet maps showing]');
      await t.look(p, 'workout and sheet after a late coach');
    });

    await t.flow('Back after a tab switch', async () => {
      // a tab starts afresh: the phone's Back goes back through what was opened since, then leaves the app, with no dead presses
      const p = await t.page({ state: L.member() });
      const inApp = () => p.url().startsWith(p.srv.url);
      await app.tap(p, '[data-act="open-day"][data-day="1"]', { nth: 0 });
      await app.tap(p, '[data-act="start"]');
      await app.waitTitle(p, 'Workout');
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');                      // nothing done yet: straight back to the Plan tab
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '[data-act="body-go"][data-v="legs"]');           // Quick start: the Workouts tab, legs
      await app.waitTitle(p, 'Workouts');
      t.has(await app.text(p), 'Legs & glutes', 'Quick start legs');
      await app.tap(p, '[data-act="open-workout"]', { nth: 0 });
      await p.waitForSelector('.wd-title');
      await p.goBack({ timeout: 5000 }).catch(() => null);
      t.check(inApp(), "the phone's Back on a workout opened from Workouts left the app");
      if (inApp()) await app.waitTitle(p, 'Workouts', 5000);
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await p.waitForURL((u) => !u.href.startsWith(p.srv.url), { timeout: 5000 }).catch(() => null);
      t.check(!inApp(), () => "the phone's Back on the Workouts tab did not leave the app (still on " + p.url() + ')');
    });

    await t.flow('scroll: Back keeps it, the Plan after a workout starts at the top', async () => {
      // the app puts a screen's scroll back itself (the browser's own restore is off): Back returns to where the list
      // was, a sheet closed by Back leaves the screen under it where it was, and after a workout the Plan opens at its
      // top, not as far down as the Workouts list it was started from
      const p = await t.page({ state: L.member(), speed: 1 });
      const y = () => p.evaluate(() => Math.round(scrollY));
      const openLow = async () => {                  // the Workouts list scrolled to the bottom, a workout opened from there
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await p.waitForTimeout(200);
        const nth = await p.evaluate(() => [...document.querySelectorAll('[data-act="open-workout"]')]
          .findIndex((e) => { const r = e.getBoundingClientRect(); return r.top > 100 && r.bottom < innerHeight - 120; }));
        const at = await y();
        await app.tap(p, '[data-act="open-workout"]', { nth: Math.max(0, nth) });
        await p.waitForSelector('.wd-title');
        return at;
      };
      await app.tap(p, '.tab[data-tab="workouts"]');
      const y0 = await openLow();
      t.check(y0 > 200, 'control: the Workouts list should scroll (scrollY ' + y0 + ')');
      await app.tap(p, '#app [data-act="back"]');
      await app.waitTitle(p, 'Workouts');
      t.near(await y(), y0, 2, 'Workouts after the back arrow: scrollY');
      t.step("a move's sheet closed by the phone's Back");
      await openLow();
      const name = await app.title(p);
      await p.evaluate(() => window.scrollTo(0, 250));
      await p.waitForTimeout(200);
      const y1 = await y();
      t.check(y1 > 100, 'control: the workout screen should scroll (scrollY ' + y1 + ')');
      const ex = await p.evaluate(() => [...document.querySelectorAll('#app [data-act="ex-wo"]')]
        .findIndex((e) => { const r = e.getBoundingClientRect(); return r.top > 80 && r.bottom < innerHeight - 120; }));
      await app.tap(p, '#app [data-act="ex-wo"]', { nth: Math.max(0, ex) });
      t.check(!!(await app.overlay(p)), "the move's sheet did not open");
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await p.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 5000 }).catch(() => null);
      await p.waitForTimeout(300);
      t.equal([await app.overlay(p), await app.title(p)], ['', name], "after the phone's Back on the sheet [sheet, screen]");
      t.near(await y(), y1, 2, "the workout screen after the phone's Back closed the sheet: scrollY");
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await app.waitTitle(p, 'Workouts', 5000);
      t.near(await y(), y0, 2, "Workouts after the phone's Back: scrollY");
      t.step('End with nothing done');
      await openLow();
      await app.tap(p, '[data-act="start"]');
      await app.waitTitle(p, 'Workout');
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      await p.waitForFunction(() => history.state && history.state.wbf === 1, null, { timeout: 5000 }).catch(() => null);
      t.equal(await y(), 0, 'Plan after End: scrollY');
      t.step('Done on the finish screen');
      await app.tap(p, '.tab[data-tab="workouts"]');
      await openLow();
      await app.tap(p, '[data-act="start"]');
      await app.waitTitle(p, 'Workout');
      // the countdowns run 50 times faster: a move with reps waits for Done, a timed one ends by itself
      await p.evaluate(() => window.__qa.speed(50));
      await p.waitForFunction(() => document.querySelector('[data-act="pl-done"]') || document.querySelectorAll('.pl-segs i.on').length > 0);
      if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
      await p.waitForFunction(() => document.querySelectorAll('.pl-segs i.on').length > 0);
      await p.evaluate(() => window.__qa.speed(1));
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Workout complete');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      await p.waitForFunction(() => history.state && history.state.wbf === 1, null, { timeout: 5000 }).catch(() => null);
      t.equal(await y(), 0, 'Plan after Done on the finish screen: scrollY');
    });

    await t.flow('how active: one drag', async () => {
      // "How active are you?" follows one drag from Sitting to Very active and back, the words and the coach with it
      const p = await t.page();
      await app.tap(p, '[data-act="ob-start"]');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'active' }));
      await p.waitForSelector('#act-in');
      const drag = async (from, to) => {
        const r = await p.locator('#act-in').boundingBox(), y = r.y + r.height / 2, x = (f) => r.x + 6 + (r.width - 12) * f;
        await p.mouse.move(x(from), y);
        await p.mouse.down();
        for (let k = 1; k <= 24; k++) { await p.mouse.move(x(from + (to - from) * k / 24), y); await p.waitForTimeout(16); }
        await p.mouse.up();
        await p.waitForTimeout(150);
        return [await p.locator('#act-in').inputValue(), (await p.locator('.illus-cap').textContent()).trim()];
      };
      t.equal(await drag(0, 1), ['3', 'I train most days'], 'one drag to Very active [value, words]');
      t.equal(await p.locator('.illus [data-fig]').getAttribute('data-fig'), 'jump-squat', 'the coach after the drag');
      await t.look(p, 'how active after a drag');
      await app.tap(p, '.ob-cta [data-act="ob-next"]');
      await p.waitForSelector('[data-act="ob-push"]');
      await app.tap(p, '[data-act="ob-back"]');
      t.equal(await p.locator('#act-in').inputValue(), '3', 'the answer after Next and Back');
      t.equal(await drag(1, 0), ['0', 'I sit most of the day'], 'one drag back to Sitting [value, words]');
    });

    await t.flow('personal prototype', async () => {
      const p = await t.page({ url: 'personal/index.html', threeD: false });
      await t.look(p, 'personal client week', { threeD: false, figures: false });
      await p.evaluate(() => { location.hash = '#/client/session/upper-a'; });
      await p.waitForTimeout(300);
      t.has(await app.text(p), 'Home session', 'personal session');
      await t.look(p, 'personal session', { threeD: false, figures: false });
      await app.tap(p, '[data-go^="client/play/"]');
      t.check(await p.locator('[data-setdone], [data-timer]').count() > 0, 'personal player: no set or timer button');
      await t.look(p, 'personal player', { threeD: false, figures: false });
      await app.tap(p, '#seg-coach');
      await t.look(p, 'personal coach today', { threeD: false, figures: false });
      await app.tap(p, '[data-go="coach/clients"]', { nth: 0 });
      await t.look(p, 'personal coach clients', { threeD: false, figures: false });
    });
  }
};

if (require.main === module) L.main([module.exports]);
