// smoke: a quick walk through every tab and the main sheets. Fast enough to run after any change.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

module.exports = {
  name: 'smoke',
  about: 'every tab, the exercise sheet, a workout, the player starts, logging walks, water, meals and weight, delete my data, other options in the sheet, Back after a tab switch, the activity slider, the Personal prototype',
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
