// player: workouts run to the finish screen with the timers sped up (lib.cjs pageInit: speed).
'use strict';
const L = require('./lib.cjs');
const { app } = L;

// Records every screen the player shows, so a fast run can still be checked in order:
// "ready:Ready to go", "move:Squat|Workout", "rest:Switch sides", ..., then "screen:Workout complete".
async function recordPhases(p) {
  await p.evaluate(() => {
    const log = window.__phases = [];
    const sig = () => {
      const rest = document.querySelector('.pl-rest .label');
      if (rest) return 'rest:' + rest.textContent.trim();
      const name = document.querySelector('.pl-name h1');
      if (name) return 'move:' + name.textContent.trim() + '|' + (document.querySelector('.pl-body .label.dim') || {}).textContent;
      return 'screen:' + document.title.split(' · ')[0];
    };
    new MutationObserver(() => { const s = sig(); if (log[log.length - 1] !== s) log.push(s); }).observe(document.getElementById('app'), { childList: true });
    log.push(sig());
  });
}
const phases = (p) => p.evaluate(() => window.__phases || []);
const speed = (p, n) => p.evaluate((k) => window.__qa.speed(k), n);
const count = (p) => p.evaluate(() => { const c = document.getElementById('pl-count'); return c ? c.textContent.trim() : ''; });
const clock = (p) => p.evaluate(() => { const c = document.getElementById('pl-clock'); return c ? c.textContent.trim() : ''; });
const restLabel = (p) => p.evaluate(() => { const c = document.querySelector('.pl-rest .label'); return c ? c.textContent.trim() : ''; });
const moveName = (p) => p.evaluate(() => { const c = document.querySelector('.pl-name h1'); return c ? c.textContent.trim() : ''; });
const secs = (s) => { const m = /^(\d+):(\d\d)$/.exec(s); return m ? +m[1] * 60 + +m[2] : +s; };
// the Pause / Resume button that is showing: its word on the get-ready and rest screens, its label on a timed move
const pauseSays = (p) => p.evaluate(() => { const b = document.querySelector('[data-act="pl-pause"]'); return b ? b.textContent.trim() || b.getAttribute('aria-label') : ''; });
const movesDone = (p) => p.evaluate(() => document.querySelectorAll('.pl-segs i.on').length);
// the phone locked (true) or unlocked (false): what the page sees when the screen goes off or another app opens
const locked = (p, on) => p.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, on);
// what the voice coach says from now on (a stand-in for the phone's speech, which the test browser doesn't have)
const listen = (p) => p.evaluate(() => {
  window.__said = [];
  const fake = { speaking: false, pending: false, paused: false, speak: (u) => { window.__said.push(u.text); }, cancel() {}, pause() {}, resume() {},
    getVoices: () => [], addEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
});
const heard = (p) => p.evaluate(() => window.__said || []);
// the phone's Back button, and the app's answer to it
const phoneBack = (p) => p.evaluate(() => new Promise((r) => {
  addEventListener('popstate', () => setTimeout(r, 50), { once: true });
  setTimeout(r, 2000);
  history.back();
}));

module.exports = {
  name: 'player',
  about: 'every player control on a session from Frank, a full plan day to the finish screen, quitting with and without saving, the phone\'s Back twice and a locked phone during a rest',
  async run(t) {
    await t.flow('every control', async () => {
      // squat (reps) · side plank (timed, each side: switch sides) · plank (timed)
      const sp = L.spec({ i: 'qa-player', t: 'Player test', x: [['squat', 3], ['side-plank', 10], ['plank', 10]], rs: 15, r: 1 });
      const st = L.state({ profile: L.profile(), access: { client: true }, inbox: [sp] });
      st.settings = Object.assign({}, st.settings, { voice: true, sound: true, vibrate: true });
      const p = await t.page({ state: st, speed: 1 });
      t.has(await app.text(p), 'Player test', 'plan: the session from Frank');
      await app.tap(p, '[data-act="start-coach"][data-id="qa-player"]');
      await app.waitTitle(p, 'Workout');
      await recordPhases(p);
      t.step('ready');
      t.equal(await restLabel(p), 'Ready to go', 'first screen');
      t.near(+(await count(p)), 15, 1, 'get-ready countdown');
      t.has(await app.text(p), 'Squat', 'ready: first move');
      await t.look(p, 'player ready');
      await app.tap(p, '[data-act="pl-skip"]');

      t.step('reps move');
      t.equal(await moveName(p), 'Squat', 'move after Start');
      t.has(await p.locator('.pl-body').innerText(), '×3', 'reps shown');
      t.has(await p.locator('.pl-body').innerText(), '1/4', 'move counter');
      await t.look(p, 'player reps move');
      t.step('how-to mid-workout');
      await app.tap(p, '[data-act="pl-how"]');
      t.has(await app.overlay(p), 'Back to the workout', 'How-to sheet');
      const c1 = await clock(p);
      await speed(p, 20); await p.waitForTimeout(400); await speed(p, 1);
      t.equal(await clock(p), c1, 'the workout clock while How-to is open');
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      t.check(await p.locator('#overlay').isHidden(), 'How-to did not close');
      t.equal(await moveName(p), 'Squat', 'back from How-to');

      t.step('rest');
      await app.tap(p, '[data-act="pl-done"]');
      t.equal(await restLabel(p), 'Rest', 'after Done');
      const r0 = +(await count(p));
      t.near(r0, 15, 1, 'rest seconds');
      await app.tap(p, '[data-act="pl-more"]');
      const r1 = +(await count(p));
      t.check(r1 >= r0 + 18, '+20 s: the rest went from ' + r0 + ' to ' + r1);
      t.has(await p.locator('.pl-next').innerText(), 'Side plank', 'next up during rest');
      await t.look(p, 'player rest');
      await app.tap(p, '[data-act="pl-skip"]');

      t.step('timed move, pause, previous');
      t.equal(await moveName(p), 'Side plank', 'after skipping the rest');
      t.has(await p.locator('.pl-body .label.dim').innerText(), 'First side', 'side label');
      t.equal(await count(p), '0:10', 'timer at the start');
      await app.tap(p, '[data-act="pl-pause"]');
      t.equal(await p.locator('[data-act="pl-pause"]').getAttribute('aria-label'), 'Resume', 'pause button');
      const left = await count(p);
      await speed(p, 20); await p.waitForTimeout(500); await speed(p, 1);
      t.equal(await count(p), left, 'timer while paused');
      await t.look(p, 'player paused');
      await app.tap(p, '[data-act="pl-pause"]');
      t.equal(await p.locator('[data-act="pl-pause"]').getAttribute('aria-label'), 'Pause', 'resume button');
      await app.tap(p, '[data-act="pl-prev"]');
      t.equal(await moveName(p), 'Squat', 'previous move');
      await app.tap(p, '[data-act="pl-done"]');
      await app.tap(p, '[data-act="pl-skip"]');

      t.step('timers run out');
      await speed(p, 8);
      await app.waitTitle(p, 'Workout complete', 60000);
      const seen = await phases(p);
      const N = await p.evaluate(() => ({ sq: WBF.EX.squat.name, sp: WBF.EX['side-plank'].name, pl: WBF.EX.plank.name }));
      const want = ['rest:Ready to go', 'move:' + N.sq + '|Workout', 'rest:Rest', 'move:' + N.sp + '|Workout · First side', 'move:' + N.sq + '|Workout', 'rest:Rest',
        'move:' + N.sp + '|Workout · First side', 'rest:Switch sides', 'move:' + N.sp + '|Workout · Second side', 'rest:Rest', 'move:' + N.pl + '|Workout', 'screen:Workout complete'];
      t.equal(seen.filter((s, i) => s !== seen[i - 1]), want, 'the player screens in order');

      t.step('finish screen');
      const done = await app.text(p);
      t.has(done, 'Workout complete', 'finish screen');
      t.has(done, 'Player test', 'finish screen');
      t.has(done, 'kcal, est.', 'finish screen calories');
      t.has(done, 'Ticked off', 'finish screen for a session from Frank');
      await t.look(p, 'finish screen');
      await app.tap(p, '[data-act="feel"][data-v="right"]');
      t.equal(await p.locator('[data-act="feel"][data-v="right"]').getAttribute('aria-pressed'), 'true', 'Just right picked');
      t.has(await app.text(p), 'keeps building at this pace', 'feedback line');
      const s = await app.stored(p);
      const rec = s.sessions[s.sessions.length - 1] || {};
      t.equal([s.sessions.length, rec.moves, rec.total, rec.coach, rec.feel], [1, 4, 4, 'qa-player', 'right'], 'saved session [count, moves, total, coach, feel]');
      t.check(s.inboxDone['qa-player'] === rec.id, 'the session from Frank is not ticked off');
      t.check(rec.sec > 0 && rec.kcal > 0, 'saved time and calories');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      t.has(await app.text(p), 'From Frank · done', 'plan card after the session');
    });

    await t.flow('a plan day to the end', async () => {
      const p = await t.page({ state: L.member({ minutes: 10, level: 'b', focus: ['full'], kit: ['chair', 'table', 'db'] }), speed: 50 });
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
      await recordPhases(p);
      const taps = await app.runWorkout(p);
      t.check(taps > 0, 'no reps moves were done by tapping Done');
      const seen = await phases(p);
      t.check(seen.filter((s) => s.startsWith('move:')).length >= 4, 'fewer than 4 moves were shown: ' + seen.join(' > '));
      const txt = await app.text(p);
      t.has(txt, 'Day 1 is ticked off your plan', 'finish screen');
      t.has(txt, 'kcal, est.', 'finish screen');
      await t.look(p, 'finish screen plan day');
      const s = await app.stored(p);
      t.check(s.done && s.done['1'], 'day 1 is not marked done');
      t.equal(s.sessions.length, 1, 'saved sessions');
      // feedback tunes the next sessions
      await app.tap(p, '[data-act="feel"][data-v="hard"]');
      t.near((await app.stored(p)).adjust, 0.92, 0.001, 'plan adjustment after "Too hard"');
      await app.tap(p, '[data-act="feel"][data-v="easy"]');
      t.near((await app.stored(p)).adjust, 1.05, 0.001, 'plan adjustment after changing to "Too easy"');
      await app.tap(p, '.dock [data-act="tab"][data-tab="plan"]');
      await app.waitTitle(p, 'Plan');
      t.check(await p.locator('.wk-days button.dd.done[data-day="1"]').count() === 1, 'the 28-day grid does not tick day 1');
      t.has(await app.text(p), 'Start day 3', 'next day on the plan');
      await app.tap(p, '.tab[data-tab="today"]');
      const today = await app.text(p);
      t.lacks(today, /\b0\s*\/\s*10 min/, 'Today: active minutes still 0');
      t.has(today, 'Burned in workouts, est.', 'Today');
      await app.tap(p, '.tab[data-tab="me"]');
      const me = await app.text(p);
      t.has(me, 'Full body', 'Me history');
      t.has(me, 'kcal est.', 'Me history');
      t.has(me, 'Too easy', 'Me history feeling');
      t.has(me, '1 day in a row', 'Me streak');
      await t.look(p, 'me after a workout');
    });

    await t.flow('quit', async () => {
      const p = await t.page({ state: L.member(), speed: 50 });
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
      await speed(p, 1);
      t.step('nothing done yet');
      await app.tap(p, '[data-act="quit"]');
      t.has(await app.overlay(p), 'Nothing is saved yet', 'quit box');
      await t.look(p, 'quit box');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Plan');
      t.equal((await app.stored(p)).sessions.length, 0, 'sessions saved after quitting at once');
      t.step('back button mid-workout');
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
      await app.tap(p, '[data-act="pl-skip"]');
      await speed(p, 50);
      await p.waitForFunction(() => /Rest|Switch/.test((document.querySelector('.pl-rest .label') || {}).textContent || '') ||
        document.querySelector('[data-act="pl-done"]'), null, { timeout: 30000 });
      if (await p.locator('[data-act="pl-done"]').count()) await app.tap(p, '[data-act="pl-done"]');
      await speed(p, 1);
      await p.evaluate(() => history.back());
      await p.waitForTimeout(300);
      t.has(await app.overlay(p), 'End this workout?', 'phone Back during a workout');
      await app.tap(p, '[data-act="modal-no"]');
      t.equal(await app.title(p), 'Workout', 'after Keep going');
      t.step('end and save');
      await app.tap(p, '[data-act="quit"]');
      t.has(await app.overlay(p), 'What you have done so far is saved', 'quit box after one move');
      await app.tap(p, '[data-act="modal-yes"]');
      await app.waitTitle(p, 'Workout complete');
      t.has(await app.text(p), /Saved: 1 of \d+ moves/i, 'finish screen after quitting');
      t.has(await app.text(p), 'stays open', 'day not ticked after one move');
      const s = await app.stored(p);
      t.equal([s.sessions.length, (s.sessions[0] || {}).moves, !!(s.done || {})['1']], [1, 1, false], 'saved [sessions, moves, day 1 done]');
    });

    await t.flow('phone Back twice during a rest', async () => {
      // Back asks "End this workout?"; Back again closes the box like Keep going, and the rest counts on
      const sp = L.spec({ i: 'qa-back', t: 'Back test', x: [['squat', 3], ['plank', 10]], rs: 30, r: 1 });
      const p = await t.page({ state: L.state({ profile: L.profile(), access: { client: true }, inbox: [sp] }), speed: 1 });
      await app.tap(p, '[data-act="start-coach"][data-id="qa-back"]');
      await app.waitTitle(p, 'Workout');
      await app.tap(p, '[data-act="pl-skip"]');
      await app.tap(p, '[data-act="pl-done"]');
      t.equal(await restLabel(p), 'Rest', 'after Done');
      await phoneBack(p);
      t.has(await app.overlay(p), 'End this workout?', 'the first Back');
      await phoneBack(p);
      t.equal(await app.overlay(p), '', 'the quit box after the second Back');
      t.equal([await app.title(p), await restLabel(p), await pauseSays(p)], ['Workout', 'Rest', 'Pause'], 'after Back, Back [screen, step, pause button]');
      const c0 = +(await count(p));
      await speed(p, 20); await p.waitForTimeout(400); await speed(p, 1);
      const c1 = +(await count(p));
      t.check(c1 < c0, 'the rest stopped after Back, Back: ' + c0 + ' s, then ' + c1 + ' s');
      await t.look(p, 'player rest after Back, Back');
      await phoneBack(p);
      t.has(await app.overlay(p), 'End this workout?', 'a third Back');
      await app.tap(p, '[data-act="modal-no"]');
      t.equal([await restLabel(p), await pauseSays(p)], ['Rest', 'Pause'], 'after Keep going [step, pause button]');
    });

    await t.flow('phone locked during a rest', async () => {
      // nothing moves on while nobody looks: the rest waits, no move is ticked off, the voice stays quiet
      const sp = L.spec({ i: 'qa-lock', t: 'Lock test', x: [['plank', 10], ['wall-sit', 10], ['squat', 5], ['plank', 10]], rs: 20, r: 1 });
      const st = L.state({ profile: L.profile(), access: { client: true }, inbox: [sp] });
      st.settings = Object.assign({}, st.settings, { voice: true });
      const p = await t.page({ state: st, speed: 1 });
      await listen(p);
      await app.tap(p, '[data-act="start-coach"][data-id="qa-lock"]');
      await app.waitTitle(p, 'Workout');
      const N = await p.evaluate(() => ({ ws: WBF.EX['wall-sit'].name, sq: WBF.EX.squat.name }));

      t.step('get ready: Pause, Resume, Start');
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      t.equal(await pauseSays(p), 'Resume', 'the get-ready button after Pause');
      const g0 = await count(p);
      await speed(p, 20); await p.waitForTimeout(400); await speed(p, 1);
      t.equal(await count(p), g0, 'the get-ready count while paused');
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      t.equal(await pauseSays(p), 'Pause', 'the get-ready button after Resume');
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      await app.tap(p, '[data-act="pl-skip"]');
      t.equal(await pauseSays(p), 'Pause', 'the first move after Start on a paused get-ready (Start starts it)');

      t.step('locked during a rest');
      await speed(p, 20);
      await p.waitForFunction(() => /Rest/.test((document.querySelector('.pl-rest .label') || {}).textContent || ''), null, { timeout: 20000 });
      await speed(p, 1);
      t.equal([await restLabel(p), await movesDone(p)], ['Rest', 1], 'before locking [step, moves done]');
      await locked(p, true);
      const before = [await restLabel(p), await count(p), await movesDone(p), await clock(p)];     // from here on, nothing may change
      const said0 = (await heard(p)).length;
      await speed(p, 50); await p.waitForTimeout(1000); await speed(p, 1);          // about 50 s of workout time
      t.equal([await restLabel(p), await count(p), await movesDone(p), await clock(p)], before, 'while locked [step, rest left, moves done, clock]');
      t.equal((await heard(p)).slice(said0), [], 'what the voice said while the phone was locked');
      await locked(p, false);
      t.equal([await restLabel(p), await pauseSays(p)], ['Rest', 'Resume'], 'after unlocking [step, pause button]');
      await t.look(p, 'player rest paused after the phone was locked');
      await app.tap(p, '.pl-rest [data-act="pl-pause"]');
      await speed(p, 20);
      await p.waitForFunction((n) => (document.querySelector('.pl-name h1') || {}).textContent === n, N.ws, { timeout: 20000 })
        .catch(() => t.fail('the rest did not go on to ' + N.ws + ' after Resume'));
      await speed(p, 1);

      t.step('locked during a reps move, then Done');
      await speed(p, 20);
      await p.waitForFunction(() => /Rest/.test((document.querySelector('.pl-rest .label') || {}).textContent || ''), null, { timeout: 20000 });
      await speed(p, 1);
      await app.tap(p, '[data-act="pl-skip"]');
      t.equal(await moveName(p), N.sq, 'the reps move');
      await locked(p, true);
      const c0 = await clock(p);
      await speed(p, 50); await p.waitForTimeout(600); await speed(p, 1);
      t.equal(await clock(p), c0, 'the workout clock while locked on a reps move');
      await locked(p, false);
      await app.tap(p, '[data-act="pl-done"]');
      t.equal([await restLabel(p), await pauseSays(p)], ['Rest', 'Pause'], 'the rest after Done (Done goes on) [step, pause button]');
      const r0 = +(await count(p));
      await speed(p, 20); await p.waitForTimeout(400); await speed(p, 1);
      t.check(+(await count(p)) < r0, 'the rest after Done does not count down');
      t.equal(await movesDone(p), 3, 'moves done');
    });
  }
};

if (require.main === module) L.main([module.exports]);
