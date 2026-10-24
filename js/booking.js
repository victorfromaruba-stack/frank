/* Wellness by Frank: book a session with Frank, free and for everyone (no account, no membership, no payment): pick a
   time from his weekly hours, leave a first name and a phone or email, send. Frank sees the requests behind his PIN
   (Coach tools > Booking requests), confirms or declines, and sets his weekly hours there. #book.session opens it.
   The data is in Supabase, in frank_* tables nobody can read directly: supabase/migrations/20261024120000_frank_booking.sql.
   The app talks to Supabase only on these two screens. Nothing about a booking goes into wbf.v1 (a backup or a move
   link would carry it): what someone types stays in memory, so an error or no connection loses nothing until the tab
   closes. A module (.claude/skills/frank-module). */
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};
  // Our Supabase project (it also hosts the Circle and Pidi). The publishable key is made to be in a browser: with it
  // the app can only call the frank_* functions granted to anon; the tables themselves are closed
  var API = 'https://cdkopyphjvfxjqhasrae.supabase.co/rest/v1/rpc/';
  var PUB = 'sb_publishable_9th0PfSraqrnnD5cTcQqxA_oqH6bwqn';
  var TZ = 'Europe/Amsterdam';           // Frank's times, whatever the phone's own time zone
  var LEN = 2 * 3600e3;                  // a session: 2 hours, as in the migration

  (WBF.ext = WBF.ext || []).push(function booking(app) {
    var u = app.util, esc = u.esc, FR = WBF.FRANK;
    // the visitor: the times, the answers, the request sent. Frank: his session token (never saved) and what he sees
    var V = { slots: null, loading: false, err: '', pick: '', name: '', contact: '', goal: '', ok: false, sending: false, msg: '', sent: null };
    var F = { token: '', data: null, err: '', busy: false };

    var SAY = {
      pick: 'Pick a time first.',
      name: 'Add your first name.',
      contact: 'Add a phone number or an email address.',
      goal: 'Your goal is too long. Keep it to 500 characters.',
      privacy: 'Tick that you\'ve read how your details are kept.',
      slot: 'That time was just taken. Pick another one.',
      busy: 'Too many requests from this connection. Try again in an hour, or ask Frank on Instagram.',
      offline: 'You\'re offline. Your answers are still here. Send when you\'re back online.',
      net: 'Not sent: Frank\'s calendar didn\'t answer. Your answers are still here. Try again.'
    };

    // ---- talking to Supabase ----------------------------------------------------------------------------------------
    // One function call. Resolves with its JSON, rejects on no connection, a timeout or an HTTP error
    function call(fn, body) {
      var ctl = W.AbortController ? new W.AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : 0;
      return W.fetch(API + fn, { method: 'POST', cache: 'no-store', signal: ctl ? ctl.signal : undefined,
        headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
        .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); },
              function (e) { clearTimeout(timer); throw e; });
    }
    var offline = function () { return W.navigator.onLine === false; };
    // draws the screen again only when it is still showing
    function show(name) { if (app.cur().name === name) app.refresh(); }

    // ---- dates, always in The Hague's time ----------------------------------------------------------------------------
    var fDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
    var fTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    function day(t) { return fDay.format(new Date(t)); }                                     // Sat 31 Oct
    function time(t) { return fTime.format(new Date(t)); }                                   // 10:00
    function span(t) { return time(t) + ' to ' + time(new Date(t).getTime() + LEN); }        // 10:00 to 12:00
    function when(t) { return day(t) + ', ' + span(t); }

    // the same rules as frank_request in the migration, so most mistakes are caught before anything is sent
    function contactOk(c) {
      var digits = c.replace(/\D/g, '').length;
      return c.length <= 120 && (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(c) || (/^\+?[0-9 ().-]+$/.test(c) && digits >= 7 && digits <= 15));
    }
    function igButton(label) {
      return FR.dm ? '<a class="btn two block" href="' + esc(FR.dm) + '" target="_blank" rel="noopener">' + u.ic('msg') + esc(label) + '</a>' : '';
    }
    function focusOn(id) { var el = id && document.getElementById(id); if (el) try { el.focus(); } catch (e) { /* ignore */ } }
    function focusHeading() { var h = document.querySelector('#app h1'); if (h) { h.setAttribute('tabindex', '-1'); focusOn(h.id || (h.id = 'bk-h')); } }

    // ---- the Frank tab and Coach tools: the ways in -------------------------------------------------------------------
    // in the in-person card, in place of the Instagram button: booking first, Instagram second
    app.html('frank.book', function () {
      return '<button class="btn block" data-act="booking-open">' + u.ic('plan') + 'Book a session</button>' +
        '<p class="meta">Free to book. No account needed.</p>' + igButton('Ask on Instagram');
    });
    app.html('coach.top', function () {
      return '<section class="card"><p class="label">Booking requests</p><p class="small">See who asked for a session, confirm it, and set your weekly times.</p>' +
        '<button class="btn two block" data-act="booking-frank">Open booking requests</button></section>';
    });
    app.action('booking-open', function () { V.sent = null; V.msg = ''; V.slots = null; V.err = ''; app.go('booking', {}); });
    app.action('booking-frank', function () { F.err = ''; app.go('booking-frank', {}); });
    // #book.session: a link Frank can put in his Instagram bio. Over the screen that is showing; never during a workout
    function link(h) {
      if (h !== 'book.session' || app.cur().name === 'player') return false;
      V.sent = null; V.slots = null; V.err = '';
      app.go('booking', {});
      return true;
    }
    app.on('boot', link);
    app.on('hash', link);

    // ---- the visitor's screen ---------------------------------------------------------------------------------------
    function loadSlots() {
      V.err = ''; V.loading = true;
      call('frank_slots').then(function (r) {
        V.loading = false;
        if (!r || !r.ok || !Array.isArray(r.slots)) throw new Error('bad answer');
        V.slots = r.slots.filter(function (t) { return typeof t === 'string' && !isNaN(new Date(t)); });
        if (V.pick && V.slots.indexOf(V.pick) === -1) V.pick = '';
        show('booking');
      }).catch(function () {
        V.loading = false;
        V.err = 'Frank\'s times didn\'t load. Check your connection and try again.';
        show('booking');
      });
    }
    function slotsHtml() {
      if (V.err) return '<p class="warnbox" role="alert">' + esc(V.err) + '</p><button class="btn two block" data-act="booking-retry">Try again</button>';
      if (!V.slots) return '<p class="meta" role="status">Looking up Frank\'s times…</p>';
      if (!V.slots.length) return '<p class="small">No open times right now. Frank adds his times each week.</p>' + igButton('Ask Frank on Instagram');
      var days = [], by = {};
      V.slots.forEach(function (t) { var d = day(t); if (!by[d]) { by[d] = []; days.push(d); } by[d].push(t); });
      return days.map(function (d) {
        return '<div class="stack tight"><p class="label dim">' + esc(d) + '</p><div class="chips wrap" role="group" aria-label="' + esc(d) + '">' +
          by[d].map(function (t) {
            return '<button class="chip" data-act="booking-slot" data-v="' + esc(t) + '" aria-pressed="' + (V.pick === t) + '">' + esc(span(t)) + '</button>';
          }).join('') + '</div></div>';
      }).join('');
    }
    function privacyHtml() {
      return '<section class="card quiet bk-privacy" aria-labelledby="bk-priv"><p class="label" id="bk-priv">How your details are kept</p>' +
        '<p class="small">Frank (Wellness by Frank, The Hague) keeps your first name, your phone or email, the time you picked and your goal. He uses them only to answer your request and arrange the session.</p>' +
        '<p class="small">They\'re stored with Supabase, on servers in the United States, and deleted 30 days after the session date. To stop spam, a scrambled code made from your internet address is kept for one hour.</p>' +
        '<p class="small">To see, correct or delete your details, message Frank on Instagram (@' + esc(FR.handle) + '). You can also complain to the Dutch data protection authority, the Autoriteit Persoonsgegevens.</p>' +
        '<label class="bk-check"><input type="checkbox" id="bk-ok"' + (V.ok ? ' checked' : '') + '><span>I\'ve read how my details are kept.</span></label></section>';
    }
    function formHtml() {
      var se = FR.session;
      return '<div class="stack tight"><h1 class="h1">Book a session</h1>' +
        '<p class="lead">' + se.hours + ' hours with Frank in ' + esc(FR.city) + ': ' + esc(se.assess) + ' of assessment, then training at your level. ' + esc(se.price) + '.</p>' +
        '<p class="small">Booking is free: no account and no payment in the app.</p></div>' +
        '<section class="stack"><div class="stack tight"><p class="label">Pick a time</p><p class="meta">Times in The Hague. Each session is ' + se.hours + ' hours.</p></div>' + slotsHtml() + '</section>' +
        '<section class="stack"><p class="label">Your details</p>' +
        '<div class="field"><label for="bk-name">First name</label><input class="input" id="bk-name" maxlength="60" autocomplete="given-name" value="' + esc(V.name) + '"></div>' +
        '<div class="field"><label for="bk-contact">Phone or email</label><input class="input" id="bk-contact" maxlength="120" autocomplete="on" autocapitalize="off" spellcheck="false" placeholder="+31 6 12345678 or you@mail.com" value="' + esc(V.contact) + '">' +
        '<p class="meta">Frank uses it to confirm your time.</p></div>' +
        '<div class="field"><label for="bk-goal">Your goal (optional)</label><textarea class="input bk-goal" id="bk-goal" rows="3" maxlength="500" placeholder="What do you want to work on?">' + esc(V.goal) + '</textarea>' +
        '<p class="meta">No medical details here, please. Tell Frank in person.</p></div></section>' +
        privacyHtml() +
        (V.msg ? '<p class="warnbox" role="alert" id="bk-msg">' + esc(V.msg) + '</p>' : '') +
        '<button class="btn block" data-act="booking-send"' + (V.sending ? ' disabled' : '') + '>' + (V.sending ? 'Sending…' : 'Send my request') + '</button>' +
        '<p class="meta">Frank confirms by message. Until then, the time is held for you.</p>';
    }
    function sentHtml() {
      var s = V.sent, wa = FR.whatsapp ? 'https://wa.me/' + FR.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(s.tell) : '';
      return '<div class="stack tight"><h1 class="h1">Request sent</h1><p class="lead">' + esc(when(s.at)) + ', in ' + esc(FR.city) + '.</p></div>' +
        '<p class="small">Frank will message you on ' + esc(s.contact) + ' to confirm. It\'s not booked until he does.</p>' +
        (wa ? '<a class="btn block" href="' + esc(wa) + '" target="_blank" rel="noopener">' + u.ic('msg') + 'Tell Frank on WhatsApp</a>'
          : FR.dm ? '<a class="btn block" href="' + esc(FR.dm) + '" target="_blank" rel="noopener" data-act="booking-tell">' + u.ic('msg') + 'Tell Frank on Instagram</a>' +
            '<p class="meta">Copies a message for you to paste in the chat.</p>' : '') +
        '<button class="btn two block" data-act="back">Done</button>';
    }
    // keeps what was typed when the screen is drawn again, or left and opened again
    function keep() {
      var g = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
      if (g('bk-name') != null) { V.name = g('bk-name'); V.contact = g('bk-contact'); V.goal = g('bk-goal'); }
      var ok = document.getElementById('bk-ok'); if (ok) V.ok = ok.checked;
    }
    // typing or ticking after a message: the message has done its job
    function edited() { keep(); var m = document.getElementById('bk-msg'); if (m && !V.sending) { V.msg = ''; m.parentNode.removeChild(m); } }
    app.screen('booking', {
      title: function () { return V.sent ? 'Request sent' : 'Book a session'; },
      html: function () { return '<div class="screen bare">' + u.backBar(V.sent ? 'Request sent' : 'Book a session') + (V.sent ? sentHtml() : formHtml()) + '</div>'; },
      mount: function () {
        ['bk-name', 'bk-contact', 'bk-goal', 'bk-ok'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener(id === 'bk-ok' ? 'change' : 'input', edited); });
        if (!V.sent && !V.slots && !V.err && !V.loading) loadSlots();
      }
    });
    app.action('booking-retry', function () { keep(); V.err = ''; V.slots = null; app.refresh(); loadSlots(); });
    app.action('booking-slot', function (el) { keep(); V.pick = el.getAttribute('data-v'); V.msg = ''; app.refresh(); });
    app.action('booking-send', function () {
      keep();
      var name = V.name.trim(), contact = V.contact.trim(), goal = V.goal.trim();
      var miss = !V.pick ? ['pick', null] : !name ? ['name', 'bk-name'] : !contactOk(contact) ? ['contact', 'bk-contact'] : goal.length > 500 ? ['goal', 'bk-goal'] : !V.ok ? ['privacy', 'bk-ok'] : null;
      if (miss) { V.msg = SAY[miss[0]]; app.refresh(); focusOn(miss[1]); return; }
      V.sending = true; V.msg = ''; app.refresh();
      var at = V.pick;
      call('frank_request', { p_start: at, p_name: name, p_contact: contact, p_goal: goal, p_privacy: true }).then(function (r) {
        V.sending = false;
        if (r && r.ok) {
          V.sent = { at: at, contact: contact, tell: 'Hi Frank, I asked for a session in your app: ' + day(at) + ' at ' + time(at) + '. I\'m ' + name + '.' };
          // sent: nothing of it stays in the form
          V.pick = ''; V.name = ''; V.contact = ''; V.goal = ''; V.ok = false; V.slots = null;
          if (app.cur().name === 'booking') { app.refresh(); W.scrollTo(0, 0); focusHeading(); }
          return;
        }
        var err = r && SAY[r.error] ? r.error : 'net';
        if (err === 'slot') { V.pick = ''; V.slots = null; loadSlots(); }
        V.msg = SAY[err];
        show('booking');
      }).catch(function () {
        V.sending = false;
        V.msg = offline() ? SAY.offline : SAY.net;
        show('booking');
      });
    });
    // no prefilled text in an Instagram chat: the message goes on the clipboard, and the link itself opens the chat
    app.action('booking-tell', function () {
      var no = function () { app.toast('Tell Frank which time you asked for.'); };
      try { W.navigator.clipboard.writeText(V.sent.tell).then(function () { app.toast('Message copied. Paste it in the chat with Frank.'); }, no); } catch (e) { no(); }
    });

    // ---- Frank's screen ---------------------------------------------------------------------------------------------
    var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    function signedOut(msg) { F.token = ''; F.data = null; F.err = msg || ''; }
    // a call with Frank's session: signs him out when it has run out (12 hours)
    function frankCall(fn, body) {
      return call(fn, Object.assign({ p_token: F.token }, body || {})).then(function (r) {
        if (r && r.error === 'signin') { signedOut('You were signed out. Type your PIN again.'); show('booking-frank'); throw new Error('signin'); }
        return r;
      });
    }
    function netSay() { return offline() ? 'You\'re offline. Try again when you\'re back online.' : 'No answer from the calendar. Try again.'; }
    function loadAdmin() {
      F.busy = true;
      frankCall('frank_admin').then(function (r) {
        F.busy = false;
        if (!r || !r.ok) throw new Error('bad answer');
        F.data = { bookings: Array.isArray(r.bookings) ? r.bookings : [], hours: r.hours && typeof r.hours === 'object' ? r.hours : {} };
        F.err = '';
        show('booking-frank');
      }).catch(function (e) {
        F.busy = false;
        if (e && e.message === 'signin') return;
        F.err = netSay();
        show('booking-frank');
      });
    }
    // a message to the person who asked, ready in WhatsApp (a number with its country code, or a Dutch 06 mobile), their
    // mail app, or a phone call. Frank reads it before he sends it
    function reach(b) {
      var c = String(b.contact).trim(), at = day(b.starts_at) + ' at ' + time(b.starts_at);
      var text = b.status === 'confirmed' ? 'Hi ' + b.first_name + ', this is Frank. Your session on ' + at + ' is confirmed.'
        : b.status === 'declined' ? 'Hi ' + b.first_name + ', this is Frank. Sorry, I can\'t do ' + at + '.'
          : 'Hi ' + b.first_name + ', this is Frank, about your session request for ' + at + '.';
      if (c.indexOf('@') > 0) return 'mailto:' + encodeURI(c) + '?subject=' + encodeURIComponent('Your session with Frank') + '&body=' + encodeURIComponent(text);
      var d = c.replace(/\D/g, '');
      // ponytail: a number without its country code is taken as Dutch only in the 06 mobile form; others get a call link
      var intl = /^\s*(\+|00)/.test(c) ? d.replace(/^00/, '') : /^06\d{8}$/.test(d) ? '31' + d.slice(1) : '';
      return intl ? 'https://wa.me/' + intl + '?text=' + encodeURIComponent(text) : 'tel:' + c.replace(/[^\d+]/g, '');
    }
    function row(b) {
      var acts = b.status === 'pending'
        ? '<button class="btn small" data-act="booking-confirm" data-id="' + esc(b.id) + '">Confirm</button><button class="btn two small" data-act="booking-decline" data-id="' + esc(b.id) + '">Decline</button>'
        : b.status === 'confirmed' ? '<button class="btn two small" data-act="booking-decline" data-id="' + esc(b.id) + '">Cancel</button>'
          : '<button class="btn two small" data-act="booking-delete" data-id="' + esc(b.id) + '">Delete</button>';
      return '<div class="bk-req"><b>' + esc(when(b.starts_at)) + '</b>' +
        '<span class="small">' + esc(b.first_name) + '</span><a class="link bk-reach" href="' + esc(reach(b)) + '" target="_blank" rel="noopener">' + u.ic('msg') + esc(b.contact) + '</a>' +
        (b.goal ? '<p class="small bk-goaltext">' + esc(b.goal) + '</p>' : '') +
        '<span class="meta">Asked ' + esc(day(b.created_at) + ', ' + time(b.created_at)) + (new Date(b.ends_at) < new Date() ? ' · Past' : '') + '</span>' +
        '<div class="rowx wrap">' + acts + '</div></div>';
    }
    function group(title, list, none) {
      return '<section class="stack"><p class="label">' + esc(title) + (list.length ? ' (' + list.length + ')' : '') + '</p>' +
        (list.length ? '<div class="list">' + list.map(row).join('') + '</div>' : '<p class="empty">' + esc(none) + '</p>') + '</section>';
    }
    function hoursHtml(h) {
      return '<section class="card"><p class="label">Your weekly times</p>' +
        '<p class="small">People can ask for any 2-hour slot inside these times, from 12 hours to 4 weeks ahead. 09:00 to 15:00 gives 09:00, 11:00 and 13:00. Leave a day empty when you\'re not free.</p>' +
        DAYS.map(function (n, i) {
          var w = Array.isArray(h[i + 1]) ? h[i + 1] : ['', ''];
          return '<div class="bk-day"><span>' + n + '</span>' +
            '<button class="btn two small" data-act="booking-clearday" data-d="' + (i + 1) + '" aria-label="' + n + ': not free">Clear</button>' +
            '<input class="input" type="time" step="1800" id="bkf-from-' + (i + 1) + '" value="' + esc(w[0] || '') + '" aria-label="' + n + ', from">' +
            '<span aria-hidden="true">to</span>' +
            '<input class="input" type="time" step="1800" id="bkf-to-' + (i + 1) + '" value="' + esc(w[1] || '') + '" aria-label="' + n + ', to"></div>';
        }).join('') +
        '<button class="btn block" data-act="booking-hours">Save times</button></section>';
    }
    function adminHtml() {
      var d = F.data, head = '<div class="between"><h1 class="h1">Booking requests</h1><button class="btn two small" data-act="booking-reload">Refresh</button></div>';
      var err = F.err ? '<p class="warnbox" role="alert">' + esc(F.err) + '</p>' : '';
      if (!d) return head + (err ? err + '<button class="btn two block" data-act="booking-reload">Try again</button>' : '<p class="meta" role="status">Loading…</p>');
      var by = { pending: [], confirmed: [], declined: [] };
      d.bookings.forEach(function (b) { if (b && by[b.status]) by[b.status].push(b); });
      return head + err +
        group('Waiting for you', by.pending, 'No new requests.') +
        group('Confirmed', by.confirmed, 'None yet.') +
        (by.declined.length ? group('Declined', by.declined, '') : '') +
        '<p class="meta">Every request is deleted 30 days after its date. Someone asks you to delete theirs: decline it, then Delete.</p>' +
        hoursHtml(d.hours) +
        '<section class="card quiet"><p class="label">Change PIN</p><div class="field"><label for="bkf-new" class="sr">New PIN, 6 digits</label>' +
        '<input class="input" id="bkf-new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="New PIN, 6 digits"></div>' +
        '<button class="btn two block" data-act="booking-newpin">Change PIN</button></section>' +
        '<button class="link quiet" data-act="booking-lock">Lock this screen</button>';
    }
    function pinHtml() {
      return '<div class="stack tight"><h1 class="h1">Booking requests</h1><p class="lead">Type your PIN to see who asked for a session and to set your times.</p></div>' +
        '<div class="stack"><label for="bkf-pin" class="sr">PIN</label><input class="input" id="bkf-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="PIN">' +
        (F.err ? '<p class="warnbox" role="alert">' + esc(F.err) + '</p>' : '') +
        '<button class="btn block" data-act="booking-pin"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Opening…' : 'Open') + '</button></div>';
    }
    app.screen('booking-frank', {
      title: function () { return 'Booking requests'; },
      html: function () { return '<div class="screen bare">' + u.backBar('Booking requests') + (F.token ? adminHtml() : pinHtml()) + '</div>'; },
      mount: function () {
        var pin = document.getElementById('bkf-pin');
        if (pin) pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); signIn(); } });
        if (F.token && !F.data && !F.busy && !F.err) loadAdmin();
      }
    });
    function signIn() {
      var el = document.getElementById('bkf-pin'), pin = el ? el.value.trim() : '';
      if (!/^\d{6}$/.test(pin) || F.busy) { if (!F.busy) { F.err = 'Your PIN has 6 digits.'; app.refresh(); focusOn('bkf-pin'); } return; }
      F.busy = true; F.err = ''; app.refresh();
      call('frank_login', { p_pin: pin }).then(function (r) {
        F.busy = false;
        if (r && r.ok && typeof r.token === 'string') { F.token = r.token; F.data = null; show('booking-frank'); loadAdmin(); return; }
        F.err = r && r.error === 'locked' ? 'Too many wrong tries. Wait 15 minutes, then try again.' : r && r.error === 'nopin' ? 'No PIN is set yet. Ask Victor.' : 'That PIN didn\'t work.';
        show('booking-frank'); focusOn('bkf-pin');
        var again = document.getElementById('bkf-pin'); if (again) again.value = '';
      }).catch(function () { F.busy = false; F.err = netSay(); show('booking-frank'); });
    }
    app.action('booking-pin', signIn);
    app.action('booking-reload', function () { F.err = ''; if (!F.data) app.refresh(); loadAdmin(); });
    function byId(id) { return F.data && F.data.bookings.filter(function (b) { return b.id === id; })[0]; }
    function decide(id, status, said) {
      frankCall('frank_decide', { p_id: id, p_status: status }).then(function (r) {
        app.toast(r && r.ok ? said : 'That request changed meanwhile. Here it is as it is now.');
        loadAdmin();
      }).catch(function (e) { if (!e || e.message !== 'signin') app.toast(netSay()); });
    }
    app.action('booking-confirm', function (el) {
      var b = byId(el.getAttribute('data-id'));
      if (b) decide(b.id, 'confirmed', 'Confirmed. Message ' + b.first_name + ' to say so.');
    });
    app.action('booking-decline', function (el) {
      var b = byId(el.getAttribute('data-id'));
      if (!b) return;
      if (b.status === 'pending') { decide(b.id, 'declined', 'Declined. The time is open again.'); return; }
      app.confirmBox('Cancel this session?', 'Cancel it', function () { decide(b.id, 'declined', 'Cancelled. The time is open again.'); },
        { body: when(b.starts_at) + ' with ' + b.first_name + '. Message them too.', no: 'Keep it' });
    });
    app.action('booking-delete', function (el) {
      var b = byId(el.getAttribute('data-id'));
      if (!b) return;
      app.confirmBox('Delete ' + b.first_name + '\'s request?', 'Delete', function () {
        frankCall('frank_delete', { p_id: b.id }).then(function () { app.toast('Deleted'); loadAdmin(); })
          .catch(function (e) { if (!e || e.message !== 'signin') app.toast(netSay()); });
      }, { body: 'Their name, contact and goal are gone for good.', no: 'Keep it' });
    });
    // empties a day's two times on screen; Save times saves it (a phone's time picker may have no way to empty a field)
    app.action('booking-clearday', function (el) {
      var d = el.getAttribute('data-d');
      ['bkf-from-', 'bkf-to-'].forEach(function (k) { var inp = document.getElementById(k + d); if (inp) inp.value = ''; });
    });
    app.action('booking-hours', function () {
      var hours = {}, bad = '';
      DAYS.forEach(function (n, i) {
        var a = (document.getElementById('bkf-from-' + (i + 1)) || {}).value || '', b = (document.getElementById('bkf-to-' + (i + 1)) || {}).value || '';
        a = a.slice(0, 5); b = b.slice(0, 5);
        if (bad || (!a && !b)) return;
        if (!a || !b) bad = n + ' needs a start and an end, or neither.';
        else if (a >= b) bad = n + ': the end comes after the start.';
        else if ((+b.slice(0, 2) * 60 + +b.slice(3)) - (+a.slice(0, 2) * 60 + +a.slice(3)) < 120) bad = n + ': at least 2 hours, for one session.';
        else hours[i + 1] = [a, b];
      });
      if (bad) { app.toast(bad); return; }
      frankCall('frank_set_hours', { p_hours: hours }).then(function (r) {
        if (!r || !r.ok) { app.toast('Those times didn\'t save. Check them and try again.'); return; }
        F.data.hours = r.hours;
        app.toast('Times saved');
        app.refresh();
      }).catch(function (e) { if (!e || e.message !== 'signin') app.toast(netSay()); });
    });
    app.action('booking-newpin', function () {
      var el = document.getElementById('bkf-new'), pin = el ? el.value.trim() : '';
      if (!/^\d{6}$/.test(pin)) { app.toast('A PIN has 6 digits.'); return; }
      frankCall('frank_set_pin', { p_new: pin }).then(function (r) {
        if (r && r.ok) { el.value = ''; app.toast('PIN changed. Other phones are signed out.'); } else app.toast('That PIN didn\'t save.');
      }).catch(function (e) { if (!e || e.message !== 'signin') app.toast(netSay()); });
    });
    app.action('booking-lock', function () {
      var t = F.token;
      signedOut('');
      app.refresh();
      call('frank_logout', { p_token: t }).catch(function () { /* it runs out by itself after 12 hours */ });
    });
  });
})(window);
