// booking: book a session with Frank (js/booking.js), free and with no account, and Frank's requests screen behind his
// PIN. Supabase is played by a fake in the page (the same answers as supabase/migrations/20261024120000_frank_booking.sql),
// so the suite needs no network and touches no real data. The live end-to-end run is in the PR's notes.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

const SB = /^https:\/\/cdkopyphjvfxjqhasrae\.supabase\.co\/rest\/v1\/rpc\//;
const H = 3600e3;
// Saturday 17 and Sunday 18 October, 10:00 and 12:00 in The Hague (summer time: UTC+2)
const SLOTS = ['2026-10-17T08:00:00+00:00', '2026-10-17T10:00:00+00:00', '2026-10-18T08:00:00+00:00'];

// The fake backend: frank_* functions with the migration's rules (a pending or confirmed request holds its time, Frank's
// calls need the token his PIN gave). fail: an error frank_request answers once ('slot', 'busy'), or 'offline' for all
async function fake(p, o = {}) {
  const db = { pin: '135790', token: 'qa'.repeat(32), hours: o.hours || {}, slots: o.slots || SLOTS.slice(), bookings: [], calls: [], fail: o.fail || null };
  await p.route(SB, async (route) => {
    const fn = route.request().url().split('/rpc/')[1], b = JSON.parse(route.request().postData() || '{}');
    db.calls.push([fn, b]);
    if (db.fail === 'offline') return route.abort('internetdisconnected');
    const held = () => db.bookings.filter((x) => x.status !== 'declined').map((x) => x.starts_at);
    const open = () => db.slots.filter((s) => !held().includes(s));
    const mine = b.p_token === db.token, find = () => db.bookings.find((x) => x.id === b.p_id);
    let r;
    if (fn === 'frank_slots') r = { ok: true, minutes: 120, slots: open() };
    else if (fn === 'frank_request') {
      if (db.fail) { r = { ok: false, error: db.fail }; if (db.fail === 'slot') db.slots = db.slots.filter((s) => s !== b.p_start); db.fail = null; }
      else if (b.p_privacy !== true) r = { ok: false, error: 'privacy' };
      else if (!open().includes(b.p_start)) r = { ok: false, error: 'slot' };
      else {
        db.bookings.push({ id: 'b' + (db.bookings.length + 1), starts_at: b.p_start, ends_at: new Date(Date.parse(b.p_start) + 2 * H).toISOString(), first_name: b.p_name,
          contact: b.p_contact, goal: b.p_goal, status: 'pending', created_at: '2026-10-14T07:00:00+00:00' });
        r = { ok: true, starts_at: b.p_start };
      }
    } else if (fn === 'frank_login') r = b.p_pin === db.pin ? { ok: true, token: db.token } : { ok: false, error: 'pin' };
    else if (!mine) r = { ok: false, error: 'signin' };
    else if (fn === 'frank_admin') r = { ok: true, hours: db.hours, bookings: db.bookings };
    else if (fn === 'frank_decide') { const x = find(); r = x ? (x.status = b.p_status, { ok: true }) : { ok: false, error: 'gone' }; }
    else if (fn === 'frank_delete') { db.bookings = db.bookings.filter((x) => x.id !== b.p_id); r = { ok: true }; }
    else if (fn === 'frank_set_hours') { db.hours = b.p_hours; r = { ok: true, hours: b.p_hours }; }
    else r = { ok: true };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  });
  return db;
}
const offered = (p) => p.$$eval('[data-act="booking-slot"]', (a) => a.map((x) => x.getAttribute('data-v')));

module.exports = {
  name: 'booking',
  about: 'book a session with Frank, free and with no account: Book a session on the Frank tab, his times by day in The Hague\'s time, the form and its checks, the privacy notice and its tick, Request sent and one tap to tell Frank, nothing kept on the phone; a time just taken, too many requests, no connection (a clear message, nothing lost); no times yet; Frank\'s screen behind his PIN from Coach tools: confirm, decline, delete, his weekly times, lock; a confirmed time no longer offered; #book.session; the Instagram button when the module is out',
  async run(t) {
    await t.flow('booking: a visitor books, free and with no account', async () => {
      const p = await t.page({ state: L.state(), allow: SB });
      const db = await fake(p);
      await app.tap(p, '[data-act="browse"]');
      await app.tap(p, '.tab[data-tab="frank"]');
      const card = await p.locator('section.card', { hasText: 'Train with Frank in person' }).innerText();
      t.has(card, 'Free to book. No account needed.', 'the in-person card');
      t.equal(await p.locator('[data-act="booking-open"]').count(), 1, 'Book a session in the in-person card');
      t.equal(db.calls.length, 0, 'calls to Supabase before Book a session');
      await t.look(p, 'frank tab with Book a session');
      await app.tap(p, '[data-act="booking-open"]');
      await app.waitTitle(p, 'Book a session');
      await p.waitForSelector('[data-act="booking-slot"]');
      const txt = await app.text(p);
      for (const want of ['€39.99', 'Booking is free', 'Times in The Hague', 'SAT 17 OCT', 'SUN 18 OCT', '10:00 to 12:00', '12:00 to 14:00', 'How your details are kept',
        'Supabase, on servers in the United States', 'deleted 30 days after the session date', 'kept for one hour', 'Autoriteit Persoonsgegevens', '@wellnessbyfrank']) t.has(txt, want, 'the booking screen');
      t.equal(await offered(p), SLOTS, 'the times offered');
      // the checks, in order, before anything is sent
      await app.tap(p, '[data-act="booking-send"]');
      t.has(await app.text(p), 'Pick a time first.', 'sent with nothing');
      await app.tap(p, '[data-act="booking-slot"][data-v="' + SLOTS[1] + '"]');
      t.equal(await p.locator('[data-act="booking-slot"][data-v="' + SLOTS[1] + '"]').getAttribute('aria-pressed'), 'true', 'the picked time');
      t.lacks(await app.text(p), 'Pick a time first.', 'the message after a time is picked');
      await app.tap(p, '[data-act="booking-send"]');
      t.has(await app.text(p), 'Add your first name.', 'sent without a name');
      await p.fill('#bk-name', 'Sam');
      await p.fill('#bk-contact', 'not a contact');
      await app.tap(p, '[data-act="booking-send"]');
      t.has(await app.text(p), 'Add a phone number or an email address.', 'sent with a wrong contact');
      await p.fill('#bk-contact', 'sam@example.com');
      await p.fill('#bk-goal', 'Stronger back');
      await app.tap(p, '[data-act="booking-send"]');
      t.has(await app.text(p), 'Tick that you\'ve read how your details are kept.', 'sent without the privacy tick');
      t.equal(db.calls.filter((c) => c[0] === 'frank_request').length, 0, 'requests sent before every check passed');
      await p.check('#bk-ok');
      t.equal(await p.locator('#bk-msg').count(), 0, 'the message after the tick');
      await t.look(p, 'booking form filled in', { shot: true, full: true });
      await app.tap(p, '[data-act="booking-send"]');
      await app.waitTitle(p, 'Request sent');
      const req = db.calls.filter((c) => c[0] === 'frank_request').map((c) => c[1]);
      t.equal(req, [{ p_start: SLOTS[1], p_name: 'Sam', p_contact: 'sam@example.com', p_goal: 'Stronger back', p_privacy: true }], 'the request sent');
      const sent = await app.text(p);
      for (const want of ['Request sent', 'Sat 17 Oct, 12:00 to 14:00, in The Hague', 'Frank will message you on sam@example.com', 'It\'s not booked until he does']) t.has(sent, want, 'Request sent');
      t.equal(await p.locator('a[data-act="booking-tell"]').getAttribute('href'), 'https://ig.me/m/wellnessbyfrank', 'Tell Frank on Instagram opens his chat');
      await t.look(p, 'request sent', { shot: true });
      // nothing about the booking on the phone: no key of its own, not the name, not the contact
      const st = JSON.stringify(await app.stored(p));
      t.check(!/sam@example\.com|Stronger back/.test(st), 'the booking was saved on the phone (wbf.v1): it must stay in memory only');
      await app.tap(p, '[data-act="back"]');
      await app.waitTitle(p, 'Frank');
      // opened again: a new form, and the time just asked for is held
      await app.tap(p, '[data-act="booking-open"]');
      await p.waitForSelector('[data-act="booking-slot"]');
      t.equal([await offered(p), await p.inputValue('#bk-name')], [[SLOTS[0], SLOTS[2]], ''], 'opened again [times, the name field]');
    });

    await t.flow('booking: a time just taken, too many requests, no connection', async () => {
      const p = await t.page({ state: L.member(), allow: SB });
      const db = await fake(p, { fail: 'slot' });
      await p.evaluate(() => WBF.app.go('booking', {}));
      await p.waitForSelector('[data-act="booking-slot"]');
      await app.tap(p, '[data-act="booking-slot"]');
      await p.fill('#bk-name', 'Ana');
      await p.fill('#bk-contact', '06 1234 5678');
      await p.check('#bk-ok');
      await app.tap(p, '[data-act="booking-send"]');
      await app.waitText(p, 'That time was just taken. Pick another one.');
      await p.waitForSelector('[data-act="booking-slot"]');
      t.equal([await offered(p), await p.inputValue('#bk-name'), await p.inputValue('#bk-contact'), await p.isChecked('#bk-ok')], [[SLOTS[1], SLOTS[2]], 'Ana', '06 1234 5678', true],
        'after a time was taken [times, name, contact, tick]');
      db.fail = 'busy';
      await app.tap(p, '[data-act="booking-slot"]');
      await app.tap(p, '[data-act="booking-send"]');
      await app.waitText(p, 'Too many requests from this connection');
      db.fail = 'offline';
      await p.context().setOffline(true);
      await app.tap(p, '[data-act="booking-send"]');
      await app.waitText(p, 'You\'re offline. Your answers are still here.');
      t.equal([await p.inputValue('#bk-name'), await p.inputValue('#bk-contact')], ['Ana', '06 1234 5678'], 'offline [name, contact]');
      await t.look(p, 'booking offline', { shot: true });
      // the times themselves offline: a message and Try again (the Frank tab drawn online: its photos need the network here)
      await app.tap(p, '[data-act="back"]');
      await p.context().setOffline(false);
      await p.evaluate(() => WBF.app.tab('frank'));
      await p.context().setOffline(true);
      await app.tap(p, '[data-act="booking-open"]');
      await app.waitText(p, 'Frank\'s times didn\'t load. Check your connection and try again.');
      await p.context().setOffline(false);
      db.fail = null;
      await app.tap(p, '[data-act="booking-retry"]');
      await p.waitForSelector('[data-act="booking-slot"]');
      t.equal(await p.inputValue('#bk-name'), 'Ana', 'the name after Try again');
    });

    await t.flow('booking: no times yet', async () => {
      const p = await t.page({ state: L.state(), allow: SB });
      await fake(p, { slots: [] });
      await p.evaluate(() => WBF.app.go('booking', {}));
      await app.waitText(p, 'No open times right now. Frank adds his times each week.');
      t.equal(await p.locator('.screen a[href="https://ig.me/m/wellnessbyfrank"]').count(), 1, 'Ask Frank on Instagram with no times');
      await t.look(p, 'booking with no times');
    });

    await t.flow("booking: Frank's screen behind his PIN", async () => {
      const p = await t.page({ state: L.member(), allow: SB });
      const db = await fake(p);
      db.bookings.push({ id: 'b1', starts_at: SLOTS[0], ends_at: '2026-10-17T10:00:00.000Z', first_name: 'Lena', contact: '+31 6 1111 2222', goal: 'Run a 10k', status: 'pending', created_at: '2026-10-13T18:30:00+00:00' },
        { id: 'b2', starts_at: SLOTS[2], ends_at: '2026-10-18T10:00:00.000Z', first_name: 'Tom', contact: 'tom@example.com', goal: '', status: 'pending', created_at: '2026-10-13T19:00:00+00:00' });
      await app.openCoach(p);
      t.has(await p.locator('section.card', { hasText: 'Booking requests' }).innerText(), 'Open booking requests', 'the card in Coach tools');
      await app.tap(p, '[data-act="booking-frank"]');
      await app.waitTitle(p, 'Booking requests');
      t.equal(db.calls.length, 0, 'calls before the PIN');
      await p.fill('#bkf-pin', '000000');
      await app.tap(p, '[data-act="booking-pin"]');
      await app.waitText(p, 'That PIN didn\'t work.');
      await t.look(p, 'booking requests: the PIN');
      await p.fill('#bkf-pin', db.pin);
      await p.press('#bkf-pin', 'Enter');
      await p.waitForSelector('[data-act="booking-confirm"]');
      const txt = await app.text(p);
      for (const want of ['WAITING FOR YOU (2)', 'Sat 17 Oct, 10:00 to 12:00', 'Lena', '+31 6 1111 2222', 'Run a 10k', 'Asked Tue 13 Oct, 20:30', 'Tom', 'YOUR WEEKLY TIMES']) t.has(txt, want, "Frank's screen");
      t.equal(await p.locator('.bk-req', { hasText: 'Lena' }).locator('.bk-reach').getAttribute('href'),
        'https://wa.me/31611112222?text=' + encodeURIComponent('Hi Lena, this is Frank, about your session request for Sat 17 Oct at 10:00.'), "Lena's number opens WhatsApp with a message");
      t.has(await p.locator('.bk-req', { hasText: 'Tom' }).locator('.bk-reach').getAttribute('href'), 'mailto:tom@example.com?subject=', "Tom's email opens a mail");
      await t.look(p, 'booking requests', { shot: true, full: true });
      await p.locator('.bk-req', { hasText: 'Lena' }).locator('[data-act="booking-confirm"]').click();
      await p.waitForFunction(() => { const s = [...document.querySelectorAll('section')].find((x) => /^Confirmed/i.test(x.innerText)); return s && /Lena/.test(s.innerText); });
      t.equal(db.bookings.find((x) => x.id === 'b1').status, 'confirmed', 'Lena after Confirm');
      t.has(await app.toast(p), 'Confirmed. Message Lena to say so.', 'the toast after Confirm');
      await p.locator('.bk-req', { hasText: 'Tom' }).locator('[data-act="booking-decline"]').click();
      await p.waitForFunction(() => { const s = [...document.querySelectorAll('section')].find((x) => /^Declined/i.test(x.innerText)); return s && /Tom/.test(s.innerText); });
      await p.locator('.bk-req', { hasText: 'Tom' }).locator('[data-act="booking-delete"]').click();
      await app.tap(p, '[data-act="modal-yes"]');
      await p.waitForFunction(() => !/Tom/.test(document.querySelector('#app').innerText));
      t.equal(db.bookings.map((x) => x.id), ['b1'], 'requests after Tom was declined and deleted');
      // his weekly times: Saturday 10:00 to 14:00; a day with one time only, or under 2 hours, is refused
      await p.fill('#bkf-from-6', '10:00');
      await app.tap(p, '[data-act="booking-hours"]');
      t.has(await app.toast(p), 'Saturday needs a start and an end, or neither.', 'one time only');
      await p.fill('#bkf-to-6', '11:00');
      await app.tap(p, '[data-act="booking-hours"]');
      t.has(await app.toast(p), 'Saturday: at least 2 hours, for one session.', 'under 2 hours');
      await p.fill('#bkf-to-6', '14:00');
      await app.tap(p, '[data-act="booking-hours"]');
      await app.waitText(p, 'Times saved');
      t.equal(db.hours, { 6: ['10:00', '14:00'] }, 'the weekly times saved');
      // a confirmed time is not offered to anyone else
      await app.tap(p, '[data-act="booking-lock"]');
      await p.waitForSelector('#bkf-pin');
      t.equal(db.calls[db.calls.length - 1][0], 'frank_logout', 'Lock signs out');
      await p.evaluate(() => WBF.app.tab('frank'));
      await app.tap(p, '[data-act="booking-open"]');
      await p.waitForSelector('[data-act="booking-slot"]');
      t.equal(await offered(p), [SLOTS[1], SLOTS[2]], 'the times offered after Lena was confirmed and Tom declined');
    });

    await t.flow('booking: #book.session, and the Instagram button without the module', async () => {
      const p = await t.page({ state: L.state(), allow: SB, go: false });
      await fake(p);
      await p.goto(p.srv.home + 'index.html#book.session');
      await L.settle(p);
      await app.waitTitle(p, 'Book a session');
      t.equal(await p.evaluate(() => location.hash), '', 'the link left in the address bar');
      // js/booking.js doesn't load: the in-person card keeps Frank's Instagram button
      const q = await t.page({ state: L.member(), go: false });
      await q.route('**/js/booking.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      await q.goto(q.srv.home + 'index.html');
      await L.settle(q);
      await app.tap(q, '.tab[data-tab="frank"]');
      t.equal([await q.locator('[data-act="booking-open"]').count(), await q.locator('a', { hasText: 'Ask for a session' }).count()], [0, 1], 'without the module [Book a session, Ask for a session]');
    });
  }
};

if (require.main === module) L.main([module.exports]);
