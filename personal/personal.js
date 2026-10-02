/* Personal prototype: the client's app and Frank's Coach mode on example data (data.js).
   Both views share one state, kept in this browser: a check-in sent as the client shows up in
   Coach mode, and Frank's reply shows up for the client. Nothing leaves the browser. */
(function (W) {
  'use strict';
  var D = W.WBF_PERSONAL;
  var EX = (W.WBF && W.WBF.EX) || {};
  var KEY = 'wbf.personal.v1';
  var GYM = D.gyms;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var todayIx = (new Date().getDay() + 6) % 7;
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- state -------------------------------------------------------------------------------
  function fresh() {
    return { v: 1, done: {}, feel: {}, checkin: null, reply: null, messages: D.messages.slice(), shopping: {},
             notes: { sanne: 'Left knee: keep split squats above parallel until the re-test.' }, nextWeek: null, foodDay: 'train', tab: {} };
  }
  var S = (function () {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { /* private mode */ }
    return fresh();
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }

  // ---- helpers -----------------------------------------------------------------------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function name(id) { return (EX[id] && EX[id].name) || id.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function pic(id, cls) { return '<div class="thumb' + (cls ? ' ' + cls : '') + '"><img src="' + (W.WBF_IMG && W.WBF_IMG[id] || 'img/' + id + '.webp') + '" alt="" loading="lazy"></div>'; }
  function date(i) { var d = D.day(i); return d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' }); }
  function dose(m) { var u = m[3]; return m[1] + ' × ' + m[2] + (u === 'reps' ? '' : u === 'each' ? ' each side' : u === 'sec' ? ' s' : ' s each side'); }
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  var toastT = 0;
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2600); }
  function go(path) { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; }

  var P = { // icons: one stroke style, 24 x 24
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chart: '<path d="M4 19V5M4 19h16"/><path d="M7.5 14.5l3.5-4 3 2.5 4.5-6"/>',
    leaf: '<path d="M5 19c0-8 5-13.5 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6.5 9.5-8.5"/>',
    chat: '<path d="M5 18.5l-1.5 3 4-1.5c1.4.6 2.9 1 4.5 1 5 0 8.5-3.4 8.5-8s-3.5-8-8.5-8-8.5 3.4-8.5 8c0 2.1.6 4 1.5 5.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 6M17.5 14.4c2 .7 3.2 2.4 3.5 5.1"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="M16.5 13.5v6M13.5 16.5h6"/>',
    case: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    cam: '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z"/><circle cx="12" cy="13" r="3.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    flag: '<path d="M6 20.5V4.5M6 5h10.5l-2 3.8 2 3.7H6"/>',
    send: '<path d="M4 11.5L20 4l-5 16-3.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
    walk: '<circle cx="13" cy="4.8" r="1.8"/><path d="M10 21l2.4-6.2L10.5 12l1-4.5 3 2.5 2.5 1M12.4 14.8l3 2.2 1 4M10.5 7.5l-3.2 2.4-.8 3.6"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5.5h4V20"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4.5v4h4"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'
  };
  function ic(n, cls) { return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>'; }
  // Frank's arrow, the way he draws them on his posts
  var ARROW = '<svg viewBox="0 0 30 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3c7 11 16 12 25 8"/><path d="M21.5 7.5l5.5 3.5-4.8 4"/></svg>';
  function fnote(t) { return '<p class="fnote">' + ARROW + '<span>' + esc(t) + '</span></p>'; }
  var MARK = W.WBF_MARK || '../img/brand/w-by-frank-dark.svg';

  // ---- the client's app --------------------------------------------------------------------
  var C = D.client;
  function weekItem(i) { return D.week.filter(function (w) { return w.d === i; })[0]; }
  function isDone(w) { return !!(w.done || S.done[w.d]); }
  function plannedCount() { return D.week.filter(function (w) { return w.kind === 'frank' || w.kind === 'home'; }).length; }
  function doneCount() { return D.week.filter(function (w) { return (w.kind === 'frank' || w.kind === 'home') && isDone(w); }).length; }
  function nextFrank() { return D.week.filter(function (w) { return w.kind === 'frank' && !isDone(w) && w.d >= todayIx; })[0] || D.week.filter(function (w) { return w.kind === 'frank'; })[0]; }
  function lastFromFrank() { var m = S.messages.filter(function (x) { return x.from === 'frank'; }); return m[m.length - 1]; }

  function header(sub) {
    return '<div class="top"><img class="mark" src="' + MARK + '" alt="W by Frank"><button class="avatar" data-go="client/frank" aria-label="Your coach">F</button></div>' +
      (sub ? '<p class="kick">' + sub + '</p>' : '');
  }

  var VIEWS = {};
  VIEWS['client/week'] = function () {
    var nf = nextFrank(), t = weekItem(todayIx), wk = C.week / C.weeks * 100;
    var h = header('Personal · with Frank') +
      '<div><h1 class="h1">' + greet() + ', ' + esc(C.name) + '</h1>' +
      '<div class="between" style="margin-top:10px"><p class="small">Week ' + C.week + ' of ' + C.weeks + ' · ' + esc(C.block.split(' · ')[0]) + '</p><p class="small num">' + doneCount() + ' of ' + plannedCount() + ' done</p></div>' +
      '<div class="bar" style="margin-top:8px"><i style="width:' + wk + '%"></i></div></div>';
    if (nf) {
      h += '<section class="hero stack"><p class="kick">Next with Frank</p><h2 class="h2">' + esc(nf.title) + '</h2>' +
        '<div class="meta"><span>' + ic('cal') + DAYS_LONG[nf.d] + ' ' + date(nf.d) + ' · ' + nf.time + '</span><span>' + ic('pin') + esc(GYM[nf.gym]) + '</span></div>' +
        fnote(nf.note) +
        '<div class="row" style="margin-top:4px"><button class="btn ghost small" data-toast="Adds the session to your phone\'s calendar">' + ic('cal') + 'Calendar</button>' +
        '<button class="btn ghost small" data-toast="Opens directions to ' + esc(GYM[nf.gym]) + '">' + ic('pin') + 'Directions</button></div></section>';
    }
    if (S.nextWeek) {
      h += '<section class="card stack"><div class="between"><p class="kick">Next week is ready</p><span class="tag solid">New</span></div>' +
        '<p class="lead">Frank planned week ' + (C.week + 1) + ':</p><div class="row" style="flex-wrap:wrap;gap:6px">' +
        S.nextWeek.changes.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div></section>';
    }
    h += '<section class="stack"><div class="between"><h2 class="h3">This week</h2><span class="small">' + date(0) + ' to ' + date(6) + '</span></div><div class="days">' +
      D.week.map(function (w) {
        var k = { frank: 'Frank', home: 'Home', walk: 'Walk', rest: 'Rest' }[w.kind];
        return '<button class="day k-' + w.kind + (w.d === todayIx ? ' today' : '') + (isDone(w) ? ' done' : '') + '" data-day="' + w.d + '" aria-label="' + DAYS_LONG[w.d] + ': ' + esc(w.title || D.sessions[w.session].title) + (isDone(w) ? ', done' : '') + '">' +
          '<b>' + DAYS[w.d].slice(0, 2) + '</b><i class="num">' + D.day(w.d).getDate() + '</i><span class="dot">' + (isDone(w) ? ic('check') : '') + '</span><span class="sr">' + k + '</span></button>';
      }).join('') + '</div>' +
      '<div class="row small" style="gap:14px;flex-wrap:wrap"><span><b style="color:var(--sky-hi)">◯</b> With Frank</span><span>◌ At home</span><span>⋯ Walk or rest</span></div></section>';
    h += dayCard(t, true);
    h += checkinCard();
    var m = S.reply ? { text: S.reply, at: 'Today' } : lastFromFrank();
    if (m) {
      h += '<section class="card stack"><p class="kick dim">From Frank</p><div class="from"><span class="avatar">F</span><div class="grow"><p class="quote">' + esc(m.text) + '</p>' +
        '<p class="small" style="margin-top:6px">' + esc(m.at) + '</p></div></div><button class="linkish" data-go="client/chat">Message Frank' + ic('chev') + '</button></section>';
    }
    return h;
  };

  function dayCard(w, isToday) {
    if (!w) return '';
    var head = '<p class="kick">' + (isToday ? 'Today' : DAYS_LONG[w.d]) + ' · ' + date(w.d) + '</p>';
    if (w.kind === 'home') {
      var s = D.sessions[w.session];
      return '<section class="card stack">' + head +
        '<div class="between"><div><h2 class="h2">' + esc(s.title) + '</h2><div class="meta" style="margin-top:6px"><span>' + ic('clock') + s.min + ' min</span><span>' + s.moves.length + ' moves</span><span>' + ic('home') + 'At home</span></div></div></div>' +
        '<div class="row" style="gap:8px">' + s.moves.slice(0, 4).map(function (m) { return pic(m[0]); }).join('') + '</div>' +
        fnote(s.intro) +
        (isDone(w) ? '<p class="lead">' + ic('check') + ' Done. Frank sees how it went.</p>'
                   : '<button class="btn block" data-go="client/session/' + w.session + '/' + w.d + '">' + ic('play') + 'See the session</button>') + '</section>';
    }
    if (w.kind === 'frank') {
      return '<section class="card stack">' + head + '<h2 class="h2">' + esc(w.title) + '</h2><div class="meta"><span>' + ic('clock') + w.time + '</span><span>' + ic('pin') + esc(GYM[w.gym]) + '</span></div>' + fnote(w.note) + '</section>';
    }
    if (w.kind === 'walk') {
      return '<section class="card stack">' + head + '<div class="row">' + ic('walk', 'ic') + '<h2 class="h3 grow">' + esc(w.title) + ' · ' + w.min + ' min</h2></div><p class="lead">An easy walk, the kind where you can still talk. It helps your legs recover.</p>' +
        (isDone(w) ? '<p class="small">' + ic('check') + ' Done</p>' : '<button class="btn ghost small" data-donewalk="' + w.d + '">' + ic('check') + 'I walked today</button>') + '</section>';
    }
    return '<section class="card stack">' + head + '<div class="row">' + ic('moon') + '<h2 class="h3">Rest day</h2></div><p class="lead">Recovery is part of the plan. Sleep well, eat well, walk if you like.</p></section>';
  }

  function checkinCard() {
    if (S.checkin && !S.reply) return '<section class="card stack"><p class="kick">Check-in sent</p><p class="lead">Frank reads it and replies within a day. He adjusts next week from it.</p></section>';
    if (S.checkin && S.reply) return '';
    return '<section class="card stack"><div class="between"><p class="kick">Sunday check-in</p><span class="small">2 minutes</span></div>' +
      '<p class="lead">How was your week? Weight, sleep, energy, a win and a struggle. Frank reads it and plans the next week from it.</p>' +
      '<button class="btn ghost" data-go="client/checkin">Check in now</button></section>';
  }

  VIEWS['client/session'] = function (arg) {
    var parts = arg.split('/'), s = D.sessions[parts[0]];
    if (!s) return VIEWS['client/week']();
    return '<div class="between"><button class="icon-btn" data-back aria-label="Back">' + ic('back') + '</button><span class="kick dim">Home session</span><span style="width:42px"></span></div>' +
      '<div><h1 class="h1">' + esc(s.title) + '</h1><div class="meta" style="margin-top:10px"><span>' + ic('clock') + s.min + ' min</span><span>' + s.moves.length + ' moves</span><span>' + esc(s.focus) + '</span></div></div>' +
      '<div class="card">' + fnote(s.intro) + '</div>' +
      '<section class="card" style="padding:4px 16px">' + s.moves.map(function (m) {
        return '<div class="move">' + pic(m[0]) + '<div class="grow"><div class="between"><b class="h3">' + esc(name(m[0])) + '</b></div>' +
          '<p class="dose num" style="margin:4px 0 0">' + dose(m) + (m[4] ? ' · <span class="load">' + esc(m[4]) + '</span>' : '') + '</p>' + fnote(m[5]) + '</div></div>';
      }).join('') + '</section>' +
      '<button class="btn block" data-go="client/play/' + arg + '">' + ic('play') + 'Start</button>' +
      '<p class="foot">Frank\'s own videos replace the 3D coach as he films them.</p>';
  };

  // the player: set by set, rest between, Frank's note on screen
  var PL = null;
  VIEWS['client/play'] = function (arg) {
    var parts = arg.split('/'), sid = parts[0], s = D.sessions[sid];
    if (!s) return VIEWS['client/week']();
    if (!PL || PL.sid !== sid) PL = { sid: sid, d: +parts[1], i: 0, set: 1, phase: 'work', t0: Date.now(), left: 0 };
    var m = s.moves[PL.i];
    var top = '<div class="between"><button class="icon-btn" data-quit aria-label="Stop">' + ic('close') + '</button><span class="small num">Move ' + (PL.i + 1) + ' of ' + s.moves.length + '</span><span style="width:42px"></span></div>';
    if (PL.phase === 'done') {
      var mins = Math.round((Date.now() - PL.t0) / 60000);
      if (mins < 10) mins = s.min;                   // clicked through in the prototype: show the session's length
      return top + '<div class="stack" style="text-align:center;align-items:center;margin-top:20px"><p class="kick">Session done</p><h1 class="h1">Well done, ' + esc(C.name) + '</h1>' +
        '<p class="lead">' + esc(s.title) + ' · ' + mins + ' min · ' + s.moves.length + ' moves</p></div>' +
        '<section class="card stack"><h2 class="h3">How did it feel?</h2><div class="scale" style="grid-template-columns:repeat(3,1fr)">' +
        ['Too easy', 'Just right', 'Too hard'].map(function (f) { return '<button data-feel="' + f + '" aria-pressed="' + (S.feel[sid] === f) + '">' + f + '</button>'; }).join('') + '</div>' +
        '<p class="small">Frank sees this with your session and adjusts the next one.</p></section>' +
        '<button class="btn block" data-finish="' + sid + '">' + ic('send') + 'Send to Frank</button>';
    }
    if (PL.phase === 'rest') {
      var nx = s.moves[PL.i];
      return top + '<div class="stack" style="align-items:center;text-align:center"><p class="kick">Rest</p>' +
        '<div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="68" fill="none" stroke="#0B4A27" stroke-width="7"/><circle id="rest-arc" cx="75" cy="75" r="68" fill="none" stroke="#7CC4EE" stroke-width="7" stroke-linecap="round" stroke-dasharray="427" stroke-dashoffset="0"/></svg><b class="num" id="rest-left">' + PL.left + '</b></div>' +
        '<div class="row"><button class="btn ghost small" data-more>+20 s</button><button class="btn small" data-skip>Skip</button></div></div>' +
        '<section class="card row"><span class="grow"><span class="kick dim">Next</span><b class="h3" style="display:block;margin-top:4px">' + esc(name(nx[0])) + '</b><span class="small">Set ' + PL.set + ' of ' + nx[1] + ' · ' + dose(nx) + '</span></span>' + pic(nx[0]) + '</section>';
    }
    var timed = /sec/.test(m[3]);
    return top + '<div class="player"><div class="stage"><img src="' + (W.WBF_IMG && W.WBF_IMG[m[0]] || 'img/' + m[0] + '.webp') + '" alt="' + esc(name(m[0])) + '"><div class="fnote-on">' + esc(m[5]) + '</div></div>' +
      '<div class="between"><h1 class="h2">' + esc(name(m[0])) + '</h1>' + (m[4] ? '<span class="tag">' + esc(m[4]) + '</span>' : '') + '</div>' +
      '<div class="sets">' + Array.apply(null, Array(m[1])).map(function (_, k) { return '<i class="' + (k < PL.set ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="between"><p class="big-num num" id="pl-num">' + (timed ? (PL.left || m[2]) + '<small>s</small>' : '× ' + m[2]) + '</p><span class="small">Set ' + PL.set + ' of ' + m[1] + (m[3].indexOf('each') >= 0 ? ' · each side' : '') + '</span></div>' +
      (timed ? '<button class="btn block" data-timer>' + ic('play') + (PL.running ? 'Running…' : 'Start the timer') + '</button>' : '<button class="btn block" data-setdone>' + ic('check') + 'Done</button>') + '</div>';
  };

  var timerT = 0;
  function nextSet() {
    var s = D.sessions[PL.sid], m = s.moves[PL.i];
    PL.running = false; clearInterval(timerT);
    if (PL.set < m[1]) { PL.set++; PL.phase = 'rest'; PL.left = 60; }
    else if (PL.i < s.moves.length - 1) { PL.i++; PL.set = 1; PL.phase = 'rest'; PL.left = 75; }
    else { PL.phase = 'done'; }
    render();
    if (PL.phase === 'rest') runRest();
  }
  function runRest() {
    var total = PL.left;
    clearInterval(timerT);
    timerT = setInterval(function () {
      if (!PL || PL.phase !== 'rest') { clearInterval(timerT); return; }
      PL.left--;
      var el = $('#rest-left'), arc = $('#rest-arc');
      if (el) el.textContent = Math.max(0, PL.left);
      if (arc) arc.setAttribute('stroke-dashoffset', String(427 * (1 - Math.max(0, PL.left) / total)));
      if (PL.left <= 0) { clearInterval(timerT); PL.phase = 'work'; PL.left = 0; render(); }
    }, 1000);
  }
  function runTimer() {
    var s = D.sessions[PL.sid], m = s.moves[PL.i];
    if (PL.running) return;
    PL.running = true; PL.left = PL.left || m[2];
    render();
    timerT = setInterval(function () {
      PL.left--;
      var el = $('#pl-num');
      if (el) el.innerHTML = Math.max(0, PL.left) + '<small>s</small>';
      if (PL.left <= 0) { PL.left = 0; nextSet(); }
    }, reduce ? 1000 : 1000);
  }

  VIEWS['client/checkin'] = function () {
    var c = S.draft || (S.draft = { weight: 70.8, waist: 81.0, sleep: 0, energy: 0, stress: 0, soreness: 0, win: '', struggle: '', photos: {} });
    function stepper(k, label, unit, step) {
      return '<label class="field"><span>' + label + '</span><div class="stepper"><button class="icon-btn" data-step="' + k + '" data-by="' + (-step) + '" aria-label="Less">−</button>' +
        '<output class="num" id="o-' + k + '">' + c[k].toFixed(1) + '<small>' + unit + '</small></output><button class="icon-btn" data-step="' + k + '" data-by="' + step + '" aria-label="More">+</button></div></label>';
    }
    function scale(k, label, lo, hi) {
      return '<div class="field"><span>' + label + '</span><div class="scale" role="group" aria-label="' + label + '">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<button data-scale="' + k + '" data-v="' + n + '" aria-pressed="' + (c[k] === n) + '">' + n + '</button>'; }).join('') +
        '</div><div class="scale-ends"><span>' + lo + '</span><span>' + hi + '</span></div></div>';
    }
    return '<div class="between"><button class="icon-btn" data-back aria-label="Back">' + ic('back') + '</button><span class="kick dim">Week ' + C.week + ' check-in</span><span style="width:42px"></span></div>' +
      '<div><h1 class="h1">How was your week?</h1><p class="lead" style="margin-top:8px">Frank reads every answer and plans next week from it.</p></div>' +
      '<section class="card stack">' + stepper('weight', 'Weight, this morning', 'kg', 0.1) + stepper('waist', 'Waist, at the navel', 'cm', 0.5) + '</section>' +
      '<section class="card stack">' + scale('sleep', 'Sleep', 'Poor', 'Great') + scale('energy', 'Energy', 'Flat', 'Full') + scale('stress', 'Stress', 'Calm', 'High') + scale('soreness', 'Soreness', 'None', 'A lot') + '</section>' +
      '<section class="card stack"><div class="between"><span class="kick dim">Sessions</span><b class="num">' + doneCount() + ' of ' + plannedCount() + '</b></div><p class="small">Counted from the app. Missed one? Say why below, it helps Frank plan.</p></section>' +
      '<section class="card stack"><label class="field"><span>A win this week</span><textarea data-text="win" placeholder="Anything: a heavier set, a good night\'s sleep, a walk you nearly skipped">' + esc(c.win) + '</textarea></label>' +
      '<label class="field"><span>A struggle</span><textarea data-text="struggle" placeholder="What got in the way?">' + esc(c.struggle) + '</textarea></label></section>' +
      '<section class="card stack"><div class="between"><span class="kick dim">Progress photos</span><span class="small">Optional</span></div><div class="photos">' +
      ['Front', 'Side', 'Back'].map(function (p) { return '<button data-photo="' + p + '" aria-pressed="' + !!c.photos[p] + '">' + ic(c.photos[p] ? 'check' : 'cam') + p + '</button>'; }).join('') +
      '</div><p class="small">' + ic('lock') + ' Only Frank sees your photos. You can delete them any time.</p></section>' +
      '<button class="btn block" data-sendcheckin>' + ic('send') + 'Send to Frank</button>';
  };

  VIEWS['client/progress'] = function () {
    var A = D.assess;
    return header() + '<div><p class="kick">Your progress</p><h1 class="h1">Week ' + C.week + ' of ' + C.weeks + '</h1></div>' +
      '<section class="card stack"><div class="between"><h2 class="h3">Assessment</h2><span class="small">' + A.start.date + ' → ' + A.latest.date + '</span></div>' +
      '<table class="cmp"><thead><tr><th>Test</th><th>' + A.start.label + '</th><th>' + A.latest.label + '</th></tr></thead><tbody>' +
      A.rows.map(function (r) {
        var better = r[4] === 'up' ? r[2] > r[1] : r[2] < r[1];
        return '<tr><td>' + esc(r[0]) + '</td><td class="num">' + r[1] + ' ' + r[3] + '</td><td class="num ' + (better ? 'up' : '') + '">' + r[2] + ' ' + r[3] + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<hr class="divider">' + A.notes.map(function (n) { return '<div><b class="h3" style="font-size:15px">' + esc(n[0]) + '</b><p class="small" style="margin-top:2px">' + esc(n[1]) + ' → <span style="color:var(--sky-hi)">' + esc(n[2]) + '</span></p></div>'; }).join('') +
      '<div class="from" style="margin-top:6px"><span class="avatar">F</span><p class="quote grow">' + esc(A.summary) + '</p></div>' +
      '<p class="small">Next re-test: Saturday with Frank.</p></section>' +
      '<section class="card stack"><div class="between"><h2 class="h3">Weight</h2><span class="small num">' + D.weights[0] + ' → ' + D.weights[D.weights.length - 1] + ' kg</span></div>' + chart(D.weights) + '</section>' +
      '<section class="card stack"><h2 class="h3">What you lift</h2>' + D.lifts.map(function (l) {
        return '<div class="between"><span class="lead">' + esc(l[0]) + '</span><span class="num"><span class="small">' + esc(l[1]) + ' → </span><b style="color:var(--sky-hi)">' + esc(l[2]) + '</b></span></div>'; }).join('') + '</section>' +
      '<section class="card stack"><div class="between"><h2 class="h3">Photos</h2><span class="small">' + ic('lock') + ' You and Frank</span></div><div class="photos">' +
      ['Week 1', 'Week 5', 'Week 9'].map(function (p, i) { return '<button disabled aria-label="' + p + '">' + ic(i < 2 ? 'lock' : 'cam') + p + '</button>'; }).join('') + '</div></section>';
  };

  function chart(v) {
    var w = 320, h = 120, lo = Math.min.apply(null, v) - 0.4, hi = Math.max.apply(null, v) + 0.4;
    var pts = v.map(function (x, i) { return [10 + i * (w - 20) / (v.length - 1), 10 + (hi - x) / (hi - lo) * (h - 34)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Weight from ' + v[0] + ' to ' + v[v.length - 1] + ' kg over ' + v.length + ' weeks">' +
      '<path class="ar" d="' + d + 'L' + pts[pts.length - 1][0] + ' ' + (h - 22) + 'L10 ' + (h - 22) + 'Z"/><path class="ln" d="' + d + '"/>' +
      '<circle class="dt" cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="4.5"/>' +
      '<text x="10" y="' + (h - 4) + '">Week 1</text><text x="' + (w - 10) + '" y="' + (h - 4) + '" text-anchor="end">Now</text></svg>';
  }

  VIEWS['client/food'] = function () {
    var F = D.food, dayk = S.foodDay || 'train';
    return header() + '<div><p class="kick">Food from Frank</p><h1 class="h1">Your plan</h1></div>' + '<div class="card">' + fnote(F.intro) + '</div>' +
      '<div class="pills" role="group" aria-label="Day"><button data-food="train" aria-pressed="' + (dayk === 'train') + '">Training day</button><button data-food="rest" aria-pressed="' + (dayk === 'rest') + '">Rest day</button></div>' +
      '<section class="card" style="padding:4px 16px">' + F.days[dayk].map(function (m) {
        return '<div class="item" style="cursor:default"><span class="when" style="width:92px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)">' + esc(m[0]) + '</span><span class="grow"><b style="font-weight:700">' + esc(m[1]) + '</b><span class="small" style="display:block;margin-top:2px">' + esc(m[2]) + '</span></span></div>';
      }).join('') + '</section>' +
      '<section class="stack"><h2 class="h3">Frank\'s guides</h2><div class="card" style="padding:4px 16px">' + F.guides.map(function (g) {
        return '<button class="item" data-toast="Frank writes these himself"><span class="grow"><b>' + esc(g[0]) + '</b><span class="small" style="display:block;margin-top:2px">' + esc(g[1]) + '</span></span><span class="small">' + esc(g[2]) + '</span></button>';
      }).join('') + '</div></section>' +
      '<section class="stack"><h2 class="h3">Cooking with Frank</h2><div class="row" style="align-items:stretch">' + F.videos.map(function (v) {
        return '<button class="card grow stack" style="text-align:left" data-toast="Frank\'s cooking videos go here once he films them"><span class="thumb big" style="background:linear-gradient(140deg,#0F5C33,#04341A);display:grid;place-items:center">' + ic('play', 'ic') + '</span><b>' + esc(v[0]) + '</b><span class="small">' + esc(v[1]) + '</span></button>';
      }).join('') + '</div></section>' +
      '<section class="card stack"><div class="between"><h2 class="h3">Shopping list</h2><span class="small num">' + Object.keys(S.shopping).filter(function (k) { return S.shopping[k]; }).length + ' of ' + F.shopping.length + '</span></div><div>' +
      F.shopping.map(function (s, i) { return '<label class="check' + (S.shopping[i] ? ' done' : '') + '"><input type="checkbox" data-shop="' + i + '"' + (S.shopping[i] ? ' checked' : '') + '><span>' + esc(s) + '</span></label>'; }).join('') + '</div></section>' +
      '<p class="foot">Nutrition stays within Frank\'s training. Anyone pregnant, under 18 or with a medical condition that affects food is referred to a dietitian or doctor.</p>';
  };

  VIEWS['client/frank'] = function () {
    var nf = nextFrank();
    return header() + '<section class="hero stack" style="align-items:flex-start"><span class="avatar big">F</span><div><p class="kick">Your coach</p><h1 class="h1">Frank</h1></div>' +
      '<p class="lead">Trains you in person at ' + esc(GYM[C.gym]) + ' and writes everything you do in between.</p>' +
      '<button class="btn" data-go="client/chat">' + ic('chat') + 'Message Frank</button></section>' +
      (nf ? '<section class="card stack"><p class="kick dim">Next session</p><h2 class="h3">' + esc(nf.title) + '</h2><div class="meta"><span>' + ic('cal') + DAYS_LONG[nf.d] + ' · ' + nf.time + '</span><span>' + ic('pin') + esc(GYM[nf.gym]) + '</span></div></section>' : '') +
      '<section class="card stack"><p class="kick dim">Frank\'s notes for you</p>' + fnote('Left knee: keep split squats above parallel until the re-test.') + fnote('Flat-soled shoes for squat days.') + fnote('Protein at every meal; see Food.') + '</section>' +
      '<section class="card stack"><p class="kick dim">Your block</p><div class="between"><span class="lead">Block 2 · Strength and shape</span><span class="small num">' + C.week + ' of ' + C.weeks + ' weeks</span></div>' +
      '<div class="bar"><i style="width:' + (C.week / C.weeks * 100) + '%"></i></div></section>' +
      '<section class="card stack"><p class="kick dim">Privacy</p><p class="small">Your check-ins, notes and photos are seen only by Frank. Export or delete everything from Settings.</p></section>';
  };

  VIEWS['client/chat'] = function () { return chatView('client'); };

  function chatView(me) {
    var back = me === 'client' ? '' : 'data-go="coach/client/sanne"';
    return '<div class="between"><button class="icon-btn" ' + (back || 'data-back') + ' aria-label="Back">' + ic('back') + '</button><span class="kick dim">' + (me === 'client' ? 'Frank' : 'Sanne') + '</span><span style="width:42px"></span></div>' +
      '<div class="chat" id="chat">' + S.messages.map(function (m) {
        return '<div class="msg ' + m.from + '">' + esc(m.text) + '<small>' + esc(m.at) + '</small></div>';
      }).join('') + '</div>' +
      '<div class="composer"><textarea id="compose" rows="1" placeholder="' + (me === 'client' ? 'Message Frank' : 'Reply to Sanne') + '" aria-label="Message"></textarea>' +
      '<button class="icon-btn" data-send="' + me + '" aria-label="Send" style="background:var(--sky);color:var(--on-sky);border:0;width:48px;height:48px">' + ic('send') + '</button></div>';
  }

  // ---- Frank's Coach mode ------------------------------------------------------------------
  function client(id) { return D.clients.filter(function (c) { return c.id === id; })[0]; }
  function needs() {
    var n = [];
    if (S.checkin && !S.reply) n.push({ id: 'sanne', text: 'Sanne sent her check-in', tag: 'New' });
    n.push({ id: 'mila', text: 'Mila sent her check-in this morning', tag: 'New' });
    n.push({ id: 'daan', text: 'Daan: knee pain 4/10 after Tuesday', tag: 'Flag', red: true });
    n.push({ id: 'daan', text: 'Daan\'s check-in is 3 days late', tag: 'Late', warn: true });
    return n;
  }
  function coachHeader(sub) {
    return '<div class="top"><img class="mark" src="' + MARK + '" alt="W by Frank"><span class="tag">Coach mode</span></div>' + (sub ? '<p class="kick">' + sub + '</p>' : '');
  }

  VIEWS['coach/today'] = function () {
    var d = new Date();
    return coachHeader() + '<div><p class="kick">' + DAYS_LONG[todayIx] + ' ' + d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'long' }) + '</p><h1 class="h1">Today</h1></div>' +
      '<section class="card agenda" style="padding:4px 16px">' + D.today.map(function (a) {
        var c = a.client && client(a.client);
        return '<button class="item" ' + (c ? 'data-go="coach/client/' + c.id + '"' : 'data-go="coach/clients"') + '><span class="when num">' + a.time + '</span><span class="grow"><b class="h3">' + esc(c ? c.name : a.block) + '</b>' +
          '<span class="small" style="display:block;margin-top:2px">' + esc(a.what) + (c ? ' · ' + esc(GYM[c.gym]) : '') + '</span>' + (a.prep ? fnote(a.prep) : '') + '</span>' + ic('chev', 'chev') + '</button>';
      }).join('') + '</section>' +
      '<section class="stack"><div class="between"><h2 class="h3">Needs you</h2><span class="tag red">' + needs().length + '</span></div><div class="card" style="padding:4px 16px">' + needs().map(function (n) {
        return '<button class="item" data-go="coach/client/' + n.id + '"><span class="grow">' + esc(n.text) + '</span><span class="tag' + (n.red ? ' red' : n.warn ? ' warn' : ' solid') + '">' + n.tag + '</span></button>';
      }).join('') + '</div></section>' +
      '<section class="card stack"><p class="kick dim">This week</p><div class="stats"><div class="stat"><b class="num">9</b><span class="small">sessions in person</span></div><div class="stat"><b class="num">7 of 11</b><span class="small">home sessions done</span></div></div></section>';
  };

  VIEWS['coach/clients'] = function () {
    return coachHeader() + '<div><p class="kick">Your clients</p><h1 class="h1">' + D.clients.length + ' clients</h1></div>' +
      D.clients.map(function (c) {
        var ci = c.id === 'sanne' && S.checkin && !S.reply ? { when: 'Just now', status: 'new' } : c.checkin;
        var tag = { ok: '<span class="tag">Check-in ' + esc(ci.when) + '</span>', late: '<span class="tag warn">Check-in ' + esc(ci.when) + '</span>', new: '<span class="tag solid">Check-in ' + esc(ci.when) + '</span>', none: '<span class="tag">No check-in yet</span>' }[ci.status];
        return '<button class="card client-card" data-go="coach/client/' + c.id + '"><div class="row"><span class="avatar">' + c.initial + '</span><span class="grow"><b class="h3">' + esc(c.name) + '</b>' +
          '<span class="small" style="display:block;margin-top:2px">' + esc(c.goal) + '</span></span>' + ic('chev', 'chev') + '</div>' +
          (c.week ? '<div class="between small"><span>Week ' + c.week + ' of ' + c.weeks + '</span><span class="num">' + c.done + ' of ' + c.planned + ' sessions this week</span></div><div class="bar"><i style="width:' + (c.week / c.weeks * 100) + '%"></i></div>'
                  : '<p class="small">' + esc(c.since) + '</p>') +
          '<div class="row" style="flex-wrap:wrap;gap:6px">' + tag + c.flags.map(function (f) { return '<span class="tag red">' + ic('flag') + esc(f) + '</span>'; }).join('') +
          '<span class="tag">' + ic('pin') + esc(GYM[c.gym]) + '</span></div><p class="small">Next: ' + esc(c.next) + '</p></button>';
      }).join('');
  };

  VIEWS['coach/client'] = function (id) {
    var c = client(id) || client('sanne'), tab = S.tab[c.id] || 'overview';
    var h = '<div class="between"><button class="icon-btn" data-go="coach/clients" aria-label="Clients">' + ic('back') + '</button><span class="kick dim">Client</span><span style="width:42px"></span></div>' +
      '<div class="row"><span class="avatar big">' + c.initial + '</span><div class="grow"><h1 class="h1" style="font-size:32px">' + esc(c.name) + '</h1><p class="small">' + esc(c.goal) + '</p></div></div>' +
      '<div class="meta"><span>' + ic('pin') + esc(GYM[c.gym]) + '</span><span>' + ic('cal') + 'Since ' + esc(c.since) + '</span>' + (c.week ? '<span>Week ' + c.week + ' of ' + c.weeks + '</span>' : '') + '</div>';
    if (c.id !== 'sanne') {
      return h + '<section class="card stack"><p class="lead">' + esc(c.next) + '</p>' + c.flags.map(function (f) { return '<span class="tag red" style="align-self:flex-start">' + ic('flag') + esc(f) + '</span>'; }).join('') +
        '<p class="small">In this prototype, Sanne\'s page is the full example: assessment, program, check-ins, notes and messages.</p><button class="btn ghost" data-go="coach/client/sanne">Open Sanne</button></section>';
    }
    var tabs = [['overview', 'Overview'], ['checkin', 'Check-in'], ['program', 'Program'], ['assess', 'Assessment'], ['notes', 'Notes'], ['messages', 'Messages']];
    h += '<div class="pills" role="group" aria-label="Client sections">' + tabs.map(function (t) { return '<button data-ctab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + (t[0] === 'checkin' && S.checkin && !S.reply ? ' •' : '') + '</button>'; }).join('') + '</div>';
    if (tab === 'overview') {
      h += '<section class="card stack"><div class="between"><h2 class="h3">This week</h2><span class="small num">' + doneCount() + ' of ' + plannedCount() + ' sessions</span></div>' +
        D.week.map(function (w) {
          var t = w.title || D.sessions[w.session].title;
          return '<div class="between"><span class="small" style="width:44px">' + DAYS[w.d] + '</span><span class="grow">' + esc(t) + (w.time ? ' · ' + w.time : '') + '</span>' + (isDone(w) ? '<span class="tag solid">' + ic('check') + 'Done</span>' : w.d < todayIx && w.kind !== 'rest' ? '<span class="tag warn">Missed</span>' : '') + '</div>';
        }).join('') + '</section>' +
        '<section class="card stack"><div class="between"><h2 class="h3">Weight</h2><span class="small num">' + D.weights[0] + ' → ' + D.weights[D.weights.length - 1] + ' kg</span></div>' + chart(D.weights) + '</section>' +
        '<section class="card stack"><h2 class="h3">How the last sessions felt</h2><p class="lead">' + (S.feel['upper-a'] ? 'Upper body A: ' + esc(S.feel['upper-a']) : 'Lower body B: Just right') + '</p></section>';
    } else if (tab === 'checkin') {
      var k = S.checkin || D.lastCheckin;
      h += '<section class="card stack"><div class="between"><h2 class="h3">' + (S.checkin ? 'This week\'s check-in' : 'Last check-in') + '</h2><span class="small">' + esc(S.checkin ? 'Just now' : k.when) + '</span></div>' +
        '<div class="stats"><div class="stat"><b class="num">' + k.weight.toFixed(1) + '</b><span class="small">kg</span></div><div class="stat"><b class="num">' + k.waist.toFixed(1) + '</b><span class="small">cm waist</span></div></div>' +
        '<table class="cmp"><tbody>' + [['Sleep', k.sleep], ['Energy', k.energy], ['Stress', k.stress], ['Soreness', k.soreness]].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + (r[1] || '–') + ' of 5</td></tr>'; }).join('') +
        '<tr><td>Sessions</td><td class="num">' + esc(k.sessions) + '</td></tr></tbody></table>' +
        (k.win ? '<div><span class="kick dim">Win</span><p class="lead" style="margin-top:4px">' + esc(k.win) + '</p></div>' : '') +
        (k.struggle ? '<div><span class="kick dim">Struggle</span><p class="lead" style="margin-top:4px">' + esc(k.struggle) + '</p></div>' : '') +
        (k.photos ? '<p class="small">' + ic('cam') + ' ' + (Object.keys(k.photos).length ? Object.keys(k.photos).join(', ') + ' photos' : 'No photos') + '</p>' : '') + '</section>';
      if (S.checkin && !S.reply) {
        h += '<section class="card stack"><label class="field"><span>Your reply</span><textarea id="reply" placeholder="She sees this on her home screen.">Strong week, Sanne. Next week we add a set to the split squats and go to 14 kg on the goblet squat.</textarea></label>' +
          '<button class="btn block" data-reply>' + ic('send') + 'Send reply</button></section>';
      } else {
        h += '<section class="card stack"><p class="kick dim">Your reply</p><p class="quote">' + esc(S.reply || k.reply) + '</p></section>';
        if (!S.checkin) h += '<p class="small">Tip: switch to Client at the top, send a check-in, then come back here to reply.</p>';
      }
    } else if (tab === 'program') {
      h += '<section class="card stack"><h2 class="h3">Home sessions</h2>' + Object.keys(D.sessions).map(function (k) {
        var s = D.sessions[k];
        return '<div class="stack" style="gap:6px"><div class="between"><b>' + esc(s.title) + '</b><span class="small">' + s.min + ' min</span></div>' +
          s.moves.map(function (m) { return '<div class="between small"><span>' + esc(name(m[0])) + '</span><span class="num">' + dose(m) + (m[4] ? ' · ' + esc(m[4]) : '') + '</span></div>'; }).join('') + '</div>';
      }).join('<hr class="divider">') + '</section><button class="btn block" data-go="coach/build">' + ic('grid') + 'Plan next week</button>';
    } else if (tab === 'assess') {
      var A = D.assess;
      h += '<section class="card stack"><div class="between"><h2 class="h3">Assessment</h2><span class="small">' + A.start.date + ' → ' + A.latest.date + '</span></div><table class="cmp"><thead><tr><th>Test</th><th>Start</th><th>Re-test</th></tr></thead><tbody>' +
        A.rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="num">' + r[1] + ' ' + r[3] + '</td><td class="num up">' + r[2] + ' ' + r[3] + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<label class="field"><span>Your summary (she sees it)</span><textarea>' + esc(A.summary) + '</textarea></label>' +
        '<button class="btn ghost" data-toast="Opens the same tests as last time, so the re-test compares cleanly">' + ic('plus') + 'Start a re-test</button></section>';
    } else if (tab === 'notes') {
      h += '<section class="card stack"><label class="field"><span>Private notes (only you)</span><textarea id="notes" rows="6">' + esc(S.notes.sanne || '') + '</textarea></label><button class="btn ghost" data-savenotes>Save notes</button></section>';
    } else {
      h += chatView('frank').replace(/^<div class="between">[\s\S]*?<\/div>/, '');
    }
    return h;
  };

  VIEWS['coach/build'] = function () {
    var nw = S.build || (S.build = { copied: false, raised: false, extra: null, added: [] });
    var mon = D.day(7);
    var rows = D.week.map(function (w) {
      var t = w.title || D.sessions[w.session].title;
      if (nw.raised && w.session === 'lower-b') t += ' · heavier';
      return { d: w.d, kind: w.kind, t: t, time: w.time, gym: w.gym };
    });
    nw.added.forEach(function (a) { rows.push({ d: +a.d, kind: 'frank', t: 'Extra session with Frank', time: a.time, gym: a.gym }); });
    rows.sort(function (a, b) { return a.d - b.d; });
    return coachHeader() + '<div><p class="kick">Plan next week</p><h1 class="h1">Sanne · week ' + (C.week + 1) + '</h1><p class="small" style="margin-top:6px">From Monday ' + mon.getDate() + ' ' + mon.toLocaleString('en-GB', { month: 'short' }) + '</p></div>' +
      (nw.copied ? '' : '<section class="card stack"><p class="lead">Start from this week and change what needs to change.</p><button class="btn" data-copyweek>' + ic('reset') + 'Copy this week</button></section>') +
      (nw.copied ? '<section class="card" style="padding:4px 16px">' + rows.map(function (r) {
        return '<div class="item" style="cursor:default"><span class="when">' + DAYS[r.d] + '</span><span class="grow"><b>' + esc(r.t) + '</b>' + (r.time ? '<span class="small" style="display:block">' + r.time + ' · ' + esc(GYM[r.gym]) + '</span>' : '') + '</span></div>';
      }).join('') + '</section>' +
      '<section class="card stack"><h2 class="h3">Raise the dose</h2><p class="small">Lower body B: split squats 3 → 4 sets, goblet squat 12 → 14 kg.</p>' +
      '<button class="btn ghost" data-raise aria-pressed="' + nw.raised + '">' + (nw.raised ? ic('check') + 'Raised' : ic('plus') + 'Raise it') + '</button></section>' +
      '<section class="card stack"><h2 class="h3">Add a session with you</h2><div class="row"><select id="add-day" aria-label="Day">' + DAYS_LONG.map(function (d, i) { return '<option value="' + i + '"' + (i === 2 ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>' +
      '<input type="time" id="add-time" value="18:00" aria-label="Time"></div><select id="add-gym" aria-label="Gym">' + Object.keys(GYM).map(function (g) { return '<option value="' + g + '"' + (g === C.gym ? ' selected' : '') + '>' + esc(GYM[g]) + '</option>'; }).join('') + '</select>' +
      '<button class="btn ghost" data-addsession>' + ic('plus') + 'Add</button></section>' +
      '<section class="card stack"><h2 class="h3">Add a move to Upper body A</h2><input type="text" id="move-q" placeholder="Search the ' + (Object.keys(EX).length || 80) + ' moves" aria-label="Search moves" value="' + esc(nw.q || '') + '">' +
      '<div id="move-list">' + moveList(nw.q || '') + '</div>' + (nw.extra ? '<p class="small">' + ic('check') + ' ' + esc(name(nw.extra)) + ' added</p>' : '') + '</section>' +
      '<button class="btn block" data-sendweek>' + ic('send') + 'Send to Sanne</button>' : '');
  };
  function moveList(q) {
    var ids = Object.keys(EX);
    if (!ids.length) return '<p class="small">The full library loads with the app.</p>';
    q = q.trim().toLowerCase();
    var hits = ids.filter(function (id) { return !q || EX[id].name.toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
    return hits.map(function (id) { return '<button class="item" data-addmove="' + id + '"><span class="grow">' + esc(EX[id].name) + '<span class="small" style="display:block">' + esc((EX[id].area || []).join(' · ')) + '</span></span>' + ic('plus', 'chev') + '</button>'; }).join('') || '<p class="small">No move by that name.</p>';
  }

  VIEWS['coach/business'] = function () {
    return coachHeader() + '<div><p class="kick">Business</p><h1 class="h1">October</h1><p class="small" style="margin-top:6px">Example numbers</p></div>' +
      '<div class="stats"><div class="card stat"><b class="num">4</b><span class="small">active clients</span></div><div class="card stat"><b class="num">1</b><span class="small">block ends this month</span></div>' +
      '<div class="card stat"><b class="num">11 of 12</b><span class="small">check-ins answered within a day</span></div><div class="card stat"><b class="num">26</b><span class="small">sessions in person</span></div></div>' +
      '<section class="card stack"><h2 class="h3">Renewals</h2><div class="between"><span class="grow"><b>Mila</b><span class="small" style="display:block">Block ends 23 Oct · week 9 of 12</span></span>' +
      '<button class="btn ghost small" data-toast="Sends Mila the offer for her next block">Offer next block</button></div></section>' +
      '<section class="card stack"><h2 class="h3">Through the app</h2><p class="small">Payments for Personal connect here once the payment provider is chosen (docs/ACCOUNTS-AND-PAYMENTS.md).</p></section>';
  };

  // ---- shell -------------------------------------------------------------------------------
  var TABS = {
    client: [['client/week', 'Week', 'cal'], ['client/progress', 'Progress', 'chart'], ['client/food', 'Food', 'leaf'], ['client/frank', 'Frank', 'chat']],
    coach: [['coach/today', 'Today', 'sun'], ['coach/clients', 'Clients', 'users'], ['coach/build', 'Plan', 'grid'], ['coach/business', 'Business', 'case']]
  };
  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/');
    var role = h[0] === 'coach' ? 'coach' : 'client';
    var page = role + '/' + (h[1] || (role === 'coach' ? 'today' : 'week'));
    return { role: role, page: page, arg: h.slice(2).join('/') };
  }
  function render() {
    var r = parse(), v = VIEWS[r.page] || VIEWS[r.role + '/' + (r.role === 'coach' ? 'today' : 'week')];
    if (r.page !== 'client/play') { PL = null; clearInterval(timerT); }
    $('#view').innerHTML = '<div class="view">' + v(r.arg) + '</div>';
    $('#seg-client').setAttribute('aria-pressed', r.role === 'client');
    $('#seg-coach').setAttribute('aria-pressed', r.role === 'coach');
    var tabRoot = r.page.split('/').slice(0, 2).join('/');
    var n = needs().length;
    $('#tabbar').innerHTML = TABS[r.role].map(function (t) {
      var on = tabRoot === t[0] || (t[0] === 'client/week' && /client\/(session|play|checkin)/.test(r.page)) || (t[0] === 'client/frank' && r.page === 'client/chat') || (t[0] === 'coach/clients' && r.page === 'coach/client');
      return '<button data-go="' + t[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + (t[0] === 'coach/today' && n ? '<span class="badge">' + n + '</span>' : '') + '</button>';
    }).join('');
    $('#tabbar').hidden = r.page === 'client/play';
    var ch = $('#chat'); if (ch) ch.scrollIntoView({ block: 'end' });
    if (!reduce) W.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button, [data-go]');
    if (!b) return;
    var a = function (k) { return b.getAttribute(k); };
    if (a('data-go')) { go(a('data-go')); return; }
    if (b.hasAttribute('data-back')) { history.length > 1 ? history.back() : go('client/week'); return; }
    if (a('data-toast')) { toast(a('data-toast')); return; }
    if (b.id === 'seg-client') { go('client/week'); return; }
    if (b.id === 'seg-coach') { go('coach/today'); return; }
    if (b.id === 'reset') { if (confirm('Start the prototype over? Check-ins, replies and plans you made here are cleared.')) { S = fresh(); save(); go('client/week'); toast('Started over'); } return; }
    if (a('data-day') != null) { var w = weekItem(+a('data-day')); if (w && w.kind === 'home') go('client/session/' + w.session + '/' + w.d); else toast(DAYS_LONG[w.d] + ': ' + (w.title || '') + (w.time ? ' at ' + w.time : '')); return; }
    if (a('data-donewalk') != null) { S.done[a('data-donewalk')] = true; save(); render(); toast('Walk logged. Frank sees it.'); return; }
    // player
    if (b.hasAttribute('data-quit')) { if (PL && PL.phase !== 'done' && !confirm('Stop the session? What you did so far is kept.')) return; var sid = PL ? PL.sid : ''; PL = null; clearInterval(timerT); go(sid ? 'client/session/' + sid : 'client/week'); return; }
    if (b.hasAttribute('data-setdone')) { nextSet(); return; }
    if (b.hasAttribute('data-timer')) { runTimer(); return; }
    if (b.hasAttribute('data-more')) { PL.left += 20; var l = $('#rest-left'); if (l) l.textContent = PL.left; return; }
    if (b.hasAttribute('data-skip')) { clearInterval(timerT); PL.phase = 'work'; PL.left = 0; render(); return; }
    if (a('data-feel')) { S.feel[PL.sid] = a('data-feel'); save(); render(); return; }
    if (a('data-finish')) { var d = PL ? PL.d : todayIx; S.done[d] = true; save(); PL = null; go('client/week'); toast('Sent to Frank'); return; }
    // check-in
    if (a('data-step')) { var k = a('data-step'); S.draft[k] = Math.round((S.draft[k] + +a('data-by')) * 10) / 10; var o = $('#o-' + k); if (o) o.innerHTML = S.draft[k].toFixed(1) + '<small>' + (k === 'weight' ? 'kg' : 'cm') + '</small>'; save(); return; }
    if (a('data-scale')) { S.draft[a('data-scale')] = +a('data-v'); save(); render(); return; }
    if (a('data-photo')) { var p = a('data-photo'); S.draft.photos[p] = !S.draft.photos[p]; if (!S.draft.photos[p]) delete S.draft.photos[p]; save(); render(); return; }
    if (b.hasAttribute('data-sendcheckin')) {
      var c = S.draft;
      S.checkin = { weight: c.weight, waist: c.waist, sleep: c.sleep, energy: c.energy, stress: c.stress, soreness: c.soreness, sessions: doneCount() + ' of ' + plannedCount(), win: c.win, struggle: c.struggle, photos: c.photos };
      S.reply = null; S.draft = null; save(); go('client/week'); toast('Sent to Frank'); return;
    }
    if (a('data-food')) { S.foodDay = a('data-food'); save(); render(); return; }
    if (a('data-send')) {
      var t = $('#compose').value.trim(); if (!t) return;
      S.messages.push({ from: a('data-send'), text: t, at: 'Now' }); save(); render(); return;
    }
    // coach
    if (a('data-ctab')) { S.tab.sanne = a('data-ctab'); save(); render(); return; }
    if (b.hasAttribute('data-reply')) { var rv = $('#reply').value.trim(); if (!rv) return; S.reply = rv; S.messages.push({ from: 'frank', text: rv, at: 'Now' }); save(); render(); toast('Sanne sees your reply on her home screen'); return; }
    if (b.hasAttribute('data-savenotes')) { S.notes.sanne = $('#notes').value; save(); toast('Saved'); return; }
    if (b.hasAttribute('data-copyweek')) { S.build.copied = true; save(); render(); return; }
    if (b.hasAttribute('data-raise')) { S.build.raised = !S.build.raised; save(); render(); return; }
    if (b.hasAttribute('data-addsession')) { S.build.added.push({ d: $('#add-day').value, time: $('#add-time').value, gym: $('#add-gym').value }); save(); render(); toast('Session added'); return; }
    if (a('data-addmove')) { S.build.extra = a('data-addmove'); save(); render(); return; }
    if (b.hasAttribute('data-sendweek')) {
      var ch = ['Same days as this week'];
      if (S.build.raised) ch.push('Split squats 4 sets', 'Goblet squat 14 kg');
      S.build.added.forEach(function (x) { ch.push('Extra session ' + DAYS[x.d] + ' ' + x.time); });
      if (S.build.extra) ch.push(name(S.build.extra) + ' added');
      S.nextWeek = { changes: ch }; save(); toast('Sent. Sanne sees next week on her home screen.'); go('coach/today'); return;
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.getAttribute('data-text') && S.draft) { S.draft[t.getAttribute('data-text')] = t.value; save(); }
    if (t.id === 'move-q') { S.build.q = t.value; $('#move-list').innerHTML = moveList(t.value); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-shop')) { S.shopping[t.getAttribute('data-shop')] = t.checked; save(); render(); }
  });
  W.addEventListener('hashchange', render);
  render();
})(window);
