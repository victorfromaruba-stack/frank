// smoke: a quick walk through every tab and the main sheets. Fast enough to run after any change.
'use strict';
const path = require('path');
const L = require('./lib.cjs');
const { app } = L;

module.exports = {
  name: 'smoke',
  about: 'every tab, the exercise sheet, a workout, the player starts, logging walks, water, meals and weight, delete my data, a phone that can\'t save, other options in the sheet, muscle maps when the coach comes in late, Back after a tab switch, the scroll after Back and after a workout, the activity slider, the keyboard\'s focus (new screens, Back, choices, an open sheet, Space in the player), toasts clear of the main button, the BMI bar\'s colours, the iPhone status bar on light screens, feature modules (the template, slots, events, broken modules), links to a move or a workout, the Personal prototype',
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
      await app.tap(p, '[data-act="coach"]');                     // "Frank? Unlock coach tools"
      await app.waitTitle(p, 'Coach tools');
      await t.look(p, 'coach tools locked');
      await app.addCoachCode(p);                                  // the test-only coach code (L.QA_COACH)
      await p.fill('#coach-in', L.QA_COACH);
      await app.tap(p, 'form[data-form="coach-code"] button[type="submit"]');
      await p.waitForSelector('[data-act="coach-new"]', { timeout: 5000 });
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
      // a long toast uses the screen's width less 16 px a side, not half of it: two lines, not a tall blob
      const tb = await p.evaluate(() => { const r = document.getElementById('toast').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      t.check(tb[0] > 300 && tb[1] < 70, 'toast after a save that failed: ' + tb[0] + ' x ' + tb[1] + ' px, expected about 358 px wide and two lines');
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
      const quitBox = await app.overlay(p);
      t.has(quitBox, fail, 'quit box when nothing can be saved');
      t.lacks(quitBox, /is saved|end and save/i, 'quit box when nothing can be saved');
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

    await t.flow('keyboard: focus on a new screen, a choice and a sheet', async () => {
      // someone with a keyboard or a screen reader: a new screen puts the focus on its heading, Back puts it on the control
      // that opened the screen, a choice that redraws its step keeps it, and an open sheet holds it until it closes
      const p = await t.page({ state: L.member() });
      const at = () => p.evaluate(() => {
        const a = document.activeElement, o = document.getElementById('overlay');
        return { tag: a.tagName.toLowerCase(), act: a.getAttribute('data-act') || '', k: a.getAttribute('data-k') || '', v: a.getAttribute('data-v') || '', id: a.getAttribute('data-id') || '',
          text: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), sheet: !o.hidden && o.contains(a), pressed: a.getAttribute('aria-pressed') };
      });
      const enter = async (sel, nth = 0) => { await p.locator(sel).nth(nth).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200); };
      await enter('.tab[data-tab="workouts"]');
      let a = await at();
      t.equal([a.tag, a.text], ['h1', 'Workouts'], 'focus after the Workouts tab [element, text]');
      const card = await p.locator('#app [data-act="open-workout"]').first().getAttribute('data-id');
      await enter('#app [data-act="open-workout"]');
      await p.waitForSelector('.wd-title');
      a = await at();
      t.equal(a.tag, 'h1', 'focus on a workout opened with Enter: element');
      t.has(a.text, await p.locator('.wd-title').innerText(), 'focus on a workout opened with Enter');
      t.step('a sheet');
      await enter('#app [data-act="ex-wo"]');
      t.equal(await p.evaluate(() => [document.getElementById('app').inert, document.getElementById('tabs').inert]), [true, true], 'the screen and the tab bar under an open sheet [inert, inert]');
      // past the sheet's last control Tab may leave the page for the browser's own bar, never for the screen underneath
      let out = 0;
      for (let i = 0; i < 30; i++) {
        await p.keyboard.press('Tab');
        if (await p.evaluate(() => document.getElementById('app').contains(document.activeElement) || document.getElementById('tabs').contains(document.activeElement))) out++;
      }
      t.equal(out, 0, 'Tab presses that reached the screen under the open sheet (of 30)');
      t.check((await at()).sheet || (await at()).tag === 'body', 'the focus after 30 Tab presses is neither on the sheet nor outside the page');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(150);
      a = await at();
      t.equal([await p.locator('#overlay').isHidden(), a.act, await p.evaluate(() => document.getElementById('app').inert)], [true, 'ex-wo', false], 'after Escape [sheet closed, focus on, screen inert]');
      t.step('Back');
      await enter('#app [data-act="back"]');
      await app.waitTitle(p, 'Workouts');
      a = await at();
      t.equal([a.act, a.id], ['open-workout', card], 'focus after Back [control, workout]: the card that opened the workout');
      t.step('a choice on the onboarding');
      await p.evaluate(() => { WBF.app.tab('me'); });
      await enter('[data-act="ob-edit"]');
      await p.evaluate(() => WBF.app.go('onboard', { step: 'health' }));
      await p.waitForSelector('[data-act="ob-health"]');
      await enter('[data-act="ob-health"][data-k="heart"][data-v="0"]');
      a = await at();
      t.equal([a.act, a.k, a.v, a.pressed], ['ob-health', 'heart', '0', 'true'], 'focus after answering No with the keyboard [control, question, answer, pressed]');
      await enter('[data-act="ob-health"][data-k="chest"][data-v="1"]');
      a = await at();
      t.equal([a.act, a.k, a.v], ['ob-health', 'chest', '1'], 'focus after answering Yes with the keyboard [control, question, answer]');
      t.step('Space in the player');
      // the step's heading takes the focus; Space still starts and pauses, as when nothing has the focus
      const q = await t.page({ state: L.member() });
      await q.locator('[data-act="start-day"]').focus();
      await q.keyboard.press('Enter');
      await app.waitTitle(q, 'Workout');
      t.equal(await q.evaluate(() => document.activeElement.textContent.trim()), 'Ready to go', 'focus when the workout starts');
      await q.keyboard.press(' ');
      await q.waitForSelector('.pl-name h1', { timeout: 5000 }).catch(() => t.fail('Space on the get-ready screen did not start the first move'));
      t.equal(await q.evaluate(() => document.activeElement.tagName), 'H1', 'focus on the first move: element');
    });

    await t.flow('toasts stay clear of the main button', async () => {
      // without the tab bar (the onboarding, a workout, the welcome) a toast goes above the screen's main button
      const clear = async (p, what, sel) => {
        await p.waitForFunction(() => document.getElementById('toast').classList.contains('on'), null, { timeout: 5000 });
        // it slides up 20 px as it comes in: measure where it stops
        await p.waitForFunction(() => !document.getElementById('toast').getAnimations().length, null, { timeout: 5000 });
        const [tb, bb] = await p.evaluate((s) => [document.getElementById('toast'), document.querySelector(s)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }), sel);
        t.check(tb[1] <= bb[0], what + ': the toast (' + tb.join(' to ') + ' px) covers ' + sel + ' (' + bb.join(' to ') + ' px)');
      };
      t.step('a client code: the first onboarding screen');
      let p = await t.page();
      await app.tap(p, '[data-act="join"]');
      await app.addCode(p);
      await p.fill('#join-in', L.QA_CODE);
      await app.tap(p, 'form[data-form="join"] button[type="submit"]', { wait: 0 });
      await app.waitTitle(p, 'Your plan');
      await clear(p, 'Welcome. The whole app is open to you.', '.part .btn');
      t.step('a swap on a workout');
      p = await t.page({ state: L.member() });
      await app.tap(p, '[data-act="open-day"][data-day="1"]', { nth: 0 });
      await app.tap(p, '[data-act="swap"]');
      await app.tap(p, '#overlay [data-act="do-swap"]', { wait: 0 });
      await clear(p, 'a swap', '.dock .btn');
      t.step('a broken link on the welcome screen');
      // its toast comes 0.3 s after the page opens and is gone before the coach is in: watch for it from the start
      p = await t.page({ go: false });
      await p.goto(p.srv.home + 'index.html#frank.not-a-real-code');
      await clear(p, 'a broken link', '.ob-cta .btn');
      t.step('a tab: above the tab bar');
      p = await t.page({ state: L.member() });
      await app.tap(p, '.tab[data-tab="today"]');
      await app.tap(p, '[data-act="walk"][data-m="10"]', { wait: 0 });
      await clear(p, 'a walk on Today', '#tabs');
      t.step('a toast still showing when the next screen opens');
      await p.evaluate(() => { document.querySelector('[data-act="walk"][data-m="10"]').click(); WBF.app.go('workout', { day: 1 }); });
      await clear(p, 'a walk\'s toast on the workout opened next', '.dock .btn');
    });

    await t.flow('BMI bar: the marker sits in the colour of its word', async () => {
      // the bar runs from BMI 15 to 40 and changes colour at 18.5, 25 and 30; the numbers under it sit at those points
      const COLOUR = { Underweight: [110, 193, 228], Healthy: [61, 190, 122], Overweight: [242, 201, 107], Obesity: [224, 106, 90] };
      const bar = (p, sel) => p.evaluate((s) => {
        const b = document.querySelector(s), m = b.querySelector('i'), r = b.getBoundingClientRect(), mr = m.getBoundingClientRect();
        const f = (mr.left + mr.width / 2 - r.left) / r.width;
        // the colour band under the marker, from the bar's gradient: "rgb(..) 0%, rgb(..) 14%, ..."
        const stops = [...getComputedStyle(b).backgroundImage.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+)(%|px)?/g)]
          .map((x) => ({ c: x[1].split(/,\s*/).slice(0, 3).map(Number), p: x[3] === 'px' ? +x[2] / r.width : +x[2] / 100 }));
        let c = stops[stops.length - 1].c;
        for (let i = 1; i < stops.length; i++) if (f < stops[i].p) { c = stops[i - 1].c; break; }
        const sc = b.nextElementSibling && b.nextElementSibling.classList.contains('bmi-scale') ? [...b.nextElementSibling.children].map((x) => {
          const q = x.getBoundingClientRect(); return [x.textContent, Math.round((q.left + q.width / 2 - r.left) / r.width * 100)];
        }) : null;
        return { at: Math.round(f * 1000) / 10, c, scale: sc };
      }, sel);
      for (const [kg, word] of [[49.1, 'Underweight'], [63.6, 'Healthy'], [78.6, 'Overweight'], [95.4, 'Obesity']]) {
        t.step(word);
        const p = await t.page({ state: L.member({ cm: 170, kg, targetKg: kg }, { weights: [{ date: L.TODAY, kg }] }) });
        await app.tap(p, '.tab[data-tab="me"]');
        t.has(await app.text(p), word, 'Me');
        let b = await bar(p, '.dark-bmi');
        t.equal(b.c, COLOUR[word], 'Me: the colour under the marker at ' + b.at + '% (' + word + ')');
        await app.tap(p, '[data-act="ob-edit"]');
        await p.evaluate(() => WBF.app.go('onboard', { step: 'weight' }));
        await p.waitForSelector('#bmi-box .bmi-bar');
        t.has(await p.locator('#bmi-box').innerText(), word, 'the weight step');
        b = await bar(p, '#bmi-box .bmi-bar');
        t.equal(b.c, COLOUR[word], 'the weight step: the colour under the marker at ' + b.at + '% (' + word + ')');
        if (word === 'Overweight') {
          // 15 at the start, 18.5 at 14%, 25 at 40%, 30 at 60%, 40 at the end
          t.equal(b.scale.map((x) => x[0]), ['15', '18.5', '25', '30', '40'], 'the numbers under the bar');
          t.check(b.scale.slice(1, 4).every((x, i) => Math.abs(x[1] - [14, 40, 60][i]) <= 1), () => 'the numbers under the bar sit at ' + JSON.stringify(b.scale) + ' (% of the bar), expected 18.5 at 14, 25 at 40, 30 at 60');
          await p.evaluate(() => WBF.app.go('onboard', { step: 'ready' }));
          await p.waitForSelector('.summary .bmi-bar');
          b = await bar(p, '.summary .bmi-bar');
          t.equal(b.c, COLOUR[word], 'the summary: the colour under the marker at ' + b.at + '% (' + word + ')');
        }
      }
    });

    await t.flow('iPhone status bar on the light screens', async () => {
      // The app on an iPhone's home screen draws the clock and battery in white over the top of the page
      // (black-translucent): the light screens keep a dark band behind them. Chromium has no notch, so the page gets an
      // iPhone's 47 px here. The real thing: .claude/skills/frank-device-check
      const p = await t.page();
      const band = () => p.evaluate(() => {
        const s = getComputedStyle(document.body, '::before');
        return { content: s.content, pos: s.position, top: s.top, h: s.height, bg: s.backgroundColor, light: document.body.classList.contains('light') };
      });
      t.equal((await band()).h, '0px', 'the band on a phone without a notch: height');
      await p.evaluate(() => document.documentElement.style.setProperty('--safe-t', '47px'));
      for (const step of ['welcome', 'onboarding']) {
        if (step === 'onboarding') { await app.tap(p, '[data-act="ob-start"]'); await app.tap(p, '.part .btn'); }
        const b = await band();
        t.equal([b.light, b.pos, b.top, b.h], [true, 'fixed', '0px', '47px'], step + ': the band behind the status bar [light screen, position, top, height]');
        const c = (b.bg.match(/[\d.]+/g) || []).map(Number);
        const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const k = c.length >= 3 && (c[3] == null || c[3] === 1) ? 1.05 / (0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]) + 0.05) : 0;
        t.check(k >= 4.5, () => step + ': white status bar text on the band is ' + k.toFixed(2) + ':1 (' + b.bg + '), 4.5 needed');
        // what the screen shows first starts under the band, not behind it
        const top = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#app .wordmark, #app .ob-top, #app .ob-q, #app .part p')].map((e) => e.getBoundingClientRect().top)));
        t.check(top >= 47, () => step + ': the top of the screen starts at ' + Math.round(top) + ' px, under the 47 px band');
      }
      await p.evaluate(() => WBF.app.tab('workouts'));
      t.equal((await band()).content, 'none', 'a dark screen: the band');
    });

    await t.flow('modules: the template, slots, events and broken modules', async () => {
      // A feature in its own file plugs in through WBF.ext (js/app.js, .claude/skills/frank-module). The template module
      // runs its own test here; test modules next to it check the seam: one card per slot (the highest priority), a
      // module that throws as it starts is left out with all it added, a clash with the app's names is refused, a card,
      // an event, an action or a replaced screen that throws leaves the rest of the screen, a screen of its own that gives
      // no html shows its Back button, and the app carries on
      const p = await t.page({ state: L.member({}, { example: { v: 1, done: 1, hidden: null } }), speed: 50, go: false });
      await p.addInitScript({ path: path.join(L.REPO, '.claude/skills/frank-module/template.js') });
      await p.addInitScript(() => {
        const ext = (window.WBF = window.WBF || {}).ext = window.WBF.ext || [];
        const heard = window.__mods = { screens: [], saved: 0 };
        ext.push(function qaLow(app) {
          app.card('today.top', () => ({ id: 'qa-low', priority: 1, html: '<section class="card"><p class="small">QA low card</p>' +
            '<button class="btn two small" data-act="qa-throw">QA action</button></section>' }));
          app.action('qa-throw', () => { throw new Error('qa: action broken on purpose'); });
          app.on('screen', (name) => { heard.screens.push(name); });
          app.on('saved', () => { heard.saved++; app.save(); });              // saves while it hears: no loop
        });
        ext.push(function qaBroken(app) {
          app.card('me.top', () => ({ id: 'qa-broken', html: '<p class="small">QA broken card</p>' }));
          app.action('qa-broken', () => {});
          throw new Error('qa: broken on purpose');
        });
        ext.push(function qaClash(app) { app.action('tab', () => {}); });
        ext.push(function qaCardThrows(app) {
          app.card('frank.top', () => { throw new Error('qa: card broken on purpose'); });
          app.html('me.data', () => '<p class="small" id="qa-me-data">QA data</p>');
          app.on('screen', () => { throw new Error('qa: event broken on purpose'); });
        });
        ext.push(function qaOverride(app) { app.override('frank', { title: () => 'QA', html: () => { throw new Error('qa: screen broken on purpose'); } }); });
        ext.push(function qaNoHtml(app) { app.screen('qa-blank', { title: () => 'QA blank', html: () => {} }); });
      });
      // the broken modules say so in the console, once for each place: collected here instead of failing the flow, and
      // checked at the end (any other console error fails it there)
      const errors = [];
      for (const f of p.listeners('console')) p.off('console', f);
      p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(p.srv.home + 'index.html#example.open');
      await L.settle(p);
      // the template's own test (its file ends with it)
      await app.waitTitle(p, 'Example');
      t.equal(await p.evaluate(() => location.hash), '', 'the link left in the address bar');
      await t.look(p, 'the example screen');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Plan');
      await app.tap(p, '.tab[data-tab="today"]');
      t.has(await p.locator('[data-card="example"]').innerText(), '1 workout done', 'the card on Today');
      t.equal([await p.locator('[data-card="example"]').count(), await p.locator('[data-card="qa-low"]').count()], [1, 0],
        "Today's one-card slot [the template's card, priority 10; another, priority 1]");
      await t.look(p, 'today with the example card');
      await app.tap(p, '[data-act="example-open"]');
      await app.waitTitle(p, 'Example');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Today');
      await app.tap(p, '[data-act="example-hide"]');
      t.equal(await p.locator('[data-card="example"]').count(), 0, 'the card after Hide');
      t.equal((await app.stored(p)).example.hidden, L.TODAY, 'saved after Hide: hidden');
      t.has(await p.locator('[data-card="qa-low"]').innerText().catch(() => ''), 'QA low card', 'the slot after Hide: the next card');
      await app.tap(p, '[data-act="qa-throw"]');
      t.equal([await app.title(p), await p.locator('[data-card="qa-low"]').count()], ['Today', 1], 'after an action that throws [screen, its card]');
      t.step('a finished workout');
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
      t.step('broken modules');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal([await p.locator('[data-card="qa-broken"]').count(), await p.locator('.card #qa-me-data').count()], [0, 1],
        'Me [cards of the module that threw as it started, the data piece of another]');
      await p.evaluate(() => WBF.ext.push(function qaLate(app) { app.html('me.data', () => '<p class="small" id="qa-late">QA late</p>'); }));
      await app.tap(p, '.tab[data-tab="today"]');
      await app.tap(p, '.tab[data-tab="me"]');
      t.equal(await p.locator('#qa-late').count(), 1, 'a module that came after the app had started');
      t.step('a link opens one thing');
      await p.evaluate(() => WBF.ext.push(function qaLinks(app) {
        app.on('hash', (h) => { window.__mods.links = (window.__mods.links || []).concat(h); return true; });
      }));
      await p.evaluate(() => { location.hash = '#example.open'; });
      await app.waitTitle(p, 'Example');
      await p.evaluate(() => { location.hash = '#qa.other'; });
      await p.waitForTimeout(300);
      t.equal([await app.title(p), await p.evaluate(() => window.__mods.links)], ['Example', ['qa.other']],
        "links [the screen the template's link opened, the links a module that started later got]");
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Me');
      t.step('screens that fail, the events and the console');
      await app.tap(p, '.tab[data-tab="frank"]');
      t.equal(await app.title(p), 'Frank', 'the Frank tab, replaced by a screen that throws: the app\'s own');
      t.has(await app.text(p), 'Train with Frank in person', 'the Frank tab under a card that throws');
      await t.look(p, 'frank with broken modules');
      await p.evaluate(() => WBF.app.go('qa-blank'));
      t.equal([await app.title(p), await p.locator('#app [data-act="back"]').count()], ['Wellness by Frank', 1],
        "a module's own screen that gives no html [the title, its Back button]");
      await app.tap(p, '#app [data-act="back"]');
      await app.waitTitle(p, 'Frank');
      const seen = await p.evaluate(() => [[...new Set(window.__mods.screens)].sort(), window.__mods.saved > 0]);
      t.equal(seen, [['done', 'example', 'frank', 'me', 'plan', 'player', 'qa-blank', 'today'], true], 'events [screens drawn, saves heard]');
      const said = errors.map((e) => { const m = /Wellness by Frank: module (\w+) failed (\([^)]*\))/.exec(e); return m ? m[1] + ' ' + m[2] : e.slice(0, 160); });
      t.equal(said.sort(), ['qaBroken (start)', 'qaCardThrows (frank.top)', 'qaCardThrows (on:screen)', 'qaClash (start)', 'qaLow (action:qa-throw)',
        'qaNoHtml (screen:qa-blank)', 'qaOverride (screen:frank)'],
        'console errors [each broken module, once for each place it broke; nothing else]');
    });

    await t.flow('links to a move or a workout (js/links.js)', async () => {
      // Frank can send a link to one move or one workout. A move's link opens its sheet over the Plan; a workout's link
      // opens the workout over the screen that is showing, and Back goes back there. A link that comes to a tab that has
      // the app isn't Back: what was open closes, and a workout goes on (Frank's session from a link waits on the Plan)
      const p = await t.page({ hash: 'ex.goblet-squat' });
      const name = await p.evaluate(() => WBF.EX['goblet-squat'].name);
      t.equal([await app.title(p), await p.locator('#overlay h2').first().innerText().catch(() => ''), await p.evaluate(() => location.hash)],
        ['Plan', name, ''], "a move's link [screen, sheet, address bar]");
      await t.look(p, 'a move from a link');
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      t.has(await app.text(p), 'Your 28-day plan', 'the screen under the sheet');
      t.step('a workout');
      await p.evaluate(() => { location.hash = '#w.desk-reset'; });
      await app.waitTitle(p, 'Desk reset');
      t.equal(await p.evaluate(() => location.hash), '', "a workout's link left in the address bar");
      await t.look(p, 'a workout from a link');
      await p.goBack({ timeout: 5000 }).catch(() => null);
      await app.waitTitle(p, 'Plan', 5000);
      t.step('a move that does not exist');
      await p.evaluate(() => { location.hash = '#ex.no-such-move'; });
      await p.waitForTimeout(300);
      t.equal([await app.title(p), await app.overlay(p), await p.evaluate(() => location.hash)], ['Plan', '', ''], 'a link to a move that does not exist [screen, sheet, address bar]');
      t.step('a workout over a sheet, a screen deep');
      await p.evaluate(() => WBF.app.go('workout', { id: 'mobility' }));
      await app.waitTitle(p, 'Mobility flow');
      await app.tap(p, '[data-act="ex-wo"]');
      t.check(await app.overlay(p), "a move's sheet did not open on Mobility flow");
      await p.evaluate(() => { location.hash = '#w.desk-reset'; });
      await app.waitTitle(p, 'Desk reset');
      t.equal(await app.overlay(p), '', "the sheet after a workout's link");
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Mobility flow');
      t.step('links during a workout');
      await app.tap(p, '.dock [data-act="start"]');
      await app.waitTitle(p, 'Workout');
      // the player, not a workout's screen (Frank's session is called Workout too)
      const player = () => p.evaluate(() => document.title.split(' · ')[0] + (document.querySelector('#app .player') ? ', the player' : ''));
      await p.evaluate(() => { location.hash = '#ex.squat'; });
      await p.waitForTimeout(300);
      t.equal([await player(), await app.overlay(p), await p.evaluate(() => location.hash)], ['Workout, the player', '', ''],
        "a move's link during a workout [screen, box or sheet, address bar]");
      await p.evaluate((h) => { location.hash = h; }, 'frank.' + L.pack(L.spec({ i: 'qa-mid', t: 'After this workout' })));
      await p.waitForFunction(() => window.__qa.toasts.some((x) => /^New session from Frank/.test(x)), null, { timeout: 5000 }).catch(() => null);
      t.equal([await player(), await app.overlay(p), (await app.stored(p)).inbox.map((x) => x.i), await app.toast(p)],
        ['Workout, the player', '', ['qa-mid'], 'New session from Frank: After this workout'], "Frank's session link during a workout [screen, box or sheet, sessions from Frank, toast]");
      await app.tap(p, '[data-act="quit"]');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      t.has(await app.text(p), 'After this workout', "Frank's session on the Plan after the workout");
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
