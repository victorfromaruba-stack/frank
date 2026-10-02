/* Wellness by Frank: screens, the plan, the workout player and the person's data.
   Everything is stored on the phone (localStorage); nothing is sent anywhere. */
(function (W) {
  'use strict';
  var WBF = W.WBF, EX = WBF.EX, F = WBF.fig, SND = WBF.sound, FR = WBF.FRANK;
  var app = document.getElementById('app');
  var tabsEl = document.getElementById('tabs');
  var overlay = document.getElementById('overlay');
  var toastEl = document.getElementById('toast');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var framed = (function () { try { return W.self !== W.top; } catch (e) { return true; } })();

  // ---- helpers ----------------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function monday(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  var fmtLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  var fmtShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  var fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  var fmtTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function mins(sec) { return Math.max(1, Math.round(sec / 60)) + ' min'; }
  function secText(n) { return n < 60 ? n + ' s' : (n % 60 ? mmss(n) : n / 60 + ' min'); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function img(p) { return (W.WBF_IMG && W.WBF_IMG[p]) || p; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var I = {
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
    work: '<path d="M8 12h8"/><path d="M5.2 7.5 8 9.1v5.8l-2.8 1.6-2.8-1.6V9.1z"/><path d="M18.8 7.5l2.8 1.6v5.8l-2.8 1.6-2.8-1.6V9.1z"/>',
    today: '<path d="M3 12h4l2.2-5.5 4.6 11 2.2-5.5H21"/>',
    me: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
    frank: '<circle cx="12" cy="12" r="8.5"/><path d="M10 16.5V8h4.6M10 12.2h3.6"/>',
    food: '<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z"/><path d="M12 12c0-4 2.5-6.5 6-7-.3 3.6-2.6 6-6 7z"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3.4"/>',
    prev: '<path d="M6 5.5v13"/><path d="M18 6.5 9.5 12l8.5 5.5z" fill="currentColor"/>',
    next: '<path d="M18 5.5v13"/><path d="M6 6.5l8.5 5.5L6 17.5z" fill="currentColor"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    swap: '<path d="M7 7.5h11l-3-3M17 16.5H6l3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M6 14l6-6 6 6"/>',
    down: '<path d="M6 10l6 6 6-6"/>',
    glass: '<path d="M6 4h12l-1.6 16H7.6z"/><path d="M6.8 10h10.4"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    msg: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h-1A1.5 1.5 0 0 1 4 14.5z"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-3.3 2.2-5.3 3.7-7.6.4 1.6 1.2 2.7 2.3 3.2C11.6 7 13 4.6 15.2 3c-.2 3 1.2 4.9 2.3 6.6 1 1.5 1 2.8 1 4.3C18.5 18 15.9 21 12 21z"/>',
    walk: '<circle cx="13.5" cy="4.5" r="1.8"/><path d="M13 7.6l-1.6 6.2 3 3 1.1 4.7M11.4 13.8 8.2 20.5M8.5 10.6l3.1-2.6 3.6 2.2 2.6-1"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    egg: '<path d="M12 3.5c3.4 0 6 5.2 6 9.3a6 6 0 0 1-12 0c0-4.1 2.6-9.3 6-9.3z"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="M11 13l9-9"/>',
    turn: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M18 3.5v4h-4"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M6 20.5v-4h4"/>',
    bars: '<path d="M6 19v-5M12 19V9M18 19V5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    db: '<path d="M7 12h10"/><rect x="3" y="8.5" width="4" height="7" rx="1.2"/><rect x="17" y="8.5" width="4" height="7" rx="1.2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.4 2.1 2 3.5 2s2.5-.6 3.5-2M9 9.5h.01M15 9.5h.01"/>',
    chair: '<path d="M7 3.5v17M7 12h10v8.5M17 12V8.5M7 8.5h10"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>'
  };
  function ic(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (I[name] || '') + '</svg>';
  }

  // ---- data ---------------------------------------------------------------------
  var KEY = 'wbf.v1';
  function defaults() {
    return { v: 2, profile: null, settings: { sound: true, voice: true, vibrate: true, rest: 0, ready: 15, units: 'kg', hunits: 'cm' },
             adjust: 1, swaps: {}, done: {}, sessions: [], weights: [], food: {}, flags: null,
             access: null, inbox: [], inboxDone: {}, coach: { templates: [] }, walks: {} };
  }
  // profiles from the first version: age bands and the six health questions
  function migrate(p) {
    if (!p) return p;
    if (!p.birthYear && p.age) p.birthYear = new Date().getFullYear() - ({ u30: 25, 30: 37, 45: 52, 60: 65 }[p.age] || 35);
    if (p.health) {
      var h = p.health;
      if (h.injury && h.joint == null) h.joint = true;
      if (h.under18 && !p.birthYear) p.birthYear = new Date().getFullYear() - 16;
    }
    if (!p.minutes) p.minutes = 20;
    if (!p.injuries) p.injuries = [];
    if (!p.focus) p.focus = ['full'];
    return p;
  }
  function load() {
    var d = defaults();
    try {
      var raw = W.localStorage.getItem(KEY);
      if (raw) {
        var got = JSON.parse(raw);
        for (var k in got) if (got[k] != null) d[k] = got[k];
        d.settings = Object.assign(defaults().settings, got.settings || {});
        d.profile = migrate(d.profile);
      }
    } catch (e) { /* private mode: start fresh */ }
    return d;
  }
  var S = load();
  function save() { try { W.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }

  // units
  function kgShow(kg) {
    if (kg == null) return '';
    return S.settings.units === 'lb' ? Math.round(kg * 2.20462) : Math.round(kg * 10) / 10;
  }
  function wUnit() { return S.settings.units === 'lb' ? 'lb' : 'kg'; }
  function toKg(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return null;
    return S.settings.units === 'lb' ? n / 2.20462 : n;
  }
  function heightShow(cm) {
    if (!cm) return '';
    if (S.settings.hunits === 'ft') { var inch = Math.round(cm / 2.54); return Math.floor(inch / 12) + '′' + (inch % 12) + '″'; }
    return Math.round(cm) + ' cm';
  }
  function lastWeight() { return S.weights.length ? S.weights[S.weights.length - 1].kg : (S.profile && S.profile.kg) || null; }
  function bmiOf(kg, cm) { return kg && cm ? kg / Math.pow(cm / 100, 2) : null; }
  function bmiWord(b) { return b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : 'Obesity'; }
  function ageNow(p) { return WBF.plan.age(p || S.profile); }
  function older(p) { var a = ageNow(p); return a != null && a >= 60; }

  // ---- plan -------------------------------------------------------------------------
  function planDays() { return S.profile ? WBF.plan.days(S.profile) : []; }
  function nextDay() {
    var days = planDays();
    for (var i = 0; i < days.length; i++) if (days[i].train && !S.done[days[i].day]) return days[i];
    return null;
  }
  function todayDay() {
    var p = S.profile;
    if (!p || !p.start) return 1;
    return clamp(Math.floor((new Date() - fromIso(p.start)) / 864e5) + 1, 1, 28);
  }
  function ctx(day, level) {
    var p = S.profile || {};
    var wm = day ? WBF.WEEK_MULT[day.week - 1] : 1;
    var av = WBF.plan.avoidFor(p);
    return { level: level || (S.profile ? WBF.plan.levelFor(p) : 'b'), kit: p.kit || WBF.DEFAULT_KIT, swaps: S.swaps, goal: p.goal, avoid: av, older: av.older,
             mult: wm * (S.adjust || 1) * (1 + 0.15 * ((p.round || 1) - 1)), restOverride: +S.settings.rest || 0, minutes: day ? p.minutes : null,
             focus: day ? p.focus : null, day: day ? day.day : 0 };
  }
  function session(wid, day, level) {
    var w = WBF.WORKOUT[wid];
    var lvl = level || (w && w.kind === 'area' ? w.level : null);
    var s = WBF.plan.build(wid, ctx(day, lvl));
    if (s) { s.day = day ? day.day : null; s.week = day ? day.week : null; }
    return s;
  }
  function mainMoves(s) {
    var seen = {}, out = [];
    s.steps.forEach(function (st) { if (st.block === 'main' && !seen[st.ex + st.side]) { seen[st.ex + st.side] = 1; if (st.side !== 2) out.push(st); } });
    return out;
  }
  function firstMove(s) { var m = mainMoves(s)[0]; return m ? m.ex : (s.steps[0] && s.steps[0].ex); }
  function kcalOf(s, seconds) { return WBF.plan.kcal(s, lastWeight(), seconds, older()); }
  function metaLine(s) {
    var n = mainMoves(s).length;
    var unit = s.coach && s.coach.f === 's' ? ' sets' : ' rounds';
    return plural(n, 'move') + (s.rounds > 1 ? ' · ' + s.rounds + unit : '') + ' · ' + mins(s.estSec);
  }
  function doseText(st) {
    var ex = EX[st.ex];
    if (ex.type === 'time') return mmss(st.dose) + (st.side === 1 || st.side === 2 ? ' each side' : '');
    return '× ' + st.dose + (st.side === 3 ? ' each side' : '');
  }
  function sessionsOn(date) { return S.sessions.filter(function (r) { return r.date === date; }); }
  function thumbKey(ex) {
    var o = { 'jumping-jacks': 1, 'arm-circles': 1, burpee: 2, inchworm: 3, 'reverse-lunge': 1, 'lateral-lunge': 1, 'shoulder-taps': 1, 'farmer-carry': 0, 'box-squat': 1, squat: 1 };
    if (o[ex.id] != null) return o[ex.id];
    return ex.type === 'time' ? 0 : 1;
  }
  function planName(p) { return '28-day ' + (WBF.GOALS[(p || S.profile || {}).goal] || WBF.GOALS.fit).plan.toLowerCase(); }
  function kitWords(p) {
    var k = (p.kit || []).filter(function (x) { return x !== 'chair' && x !== 'table'; });
    return k.length ? k.map(function (id) { var m = WBF.KIT.filter(function (x) { return x.id === id; })[0]; return m ? m.name : id; }).join(', ') : 'No equipment';
  }
  function focusWords(p) {
    var f = (p.focus || ['full']).filter(function (x) { return WBF.BODY_BY_ID[x]; });
    if (!f.length || f.indexOf('full') !== -1) return 'Full body';
    return f.map(function (x) { return WBF.BODY_BY_ID[x].name; }).slice(0, 2).join(', ') + (f.length > 2 ? ' +' + (f.length - 2) : '');
  }

  // ---- access: members (free trial, then a membership) and Frank's clients -------------
  var BILL = WBF.BILLING;
  function daysLeft() {
    var a = S.access;
    if (!a || !a.trialStart) return BILL.trialDays;
    var end = addDays(fromIso(a.trialStart), BILL.trialDays);
    return Math.max(0, Math.ceil((end - new Date()) / 864e5));
  }
  function status() {
    var a = S.access || {};
    if (a.client) return 'client';
    if (a.paid) return 'member';
    if (!a.trialStart) return 'new';
    return daysLeft() > 0 ? 'trial' : 'ended';
  }
  function startTrial() { if (status() === 'new') { S.access = Object.assign(S.access || {}, { trialStart: iso() }); save(); } }
  // the free trial starts with the first workout (or on the paywall); Frank's sessions are always open
  function mayTrain(s) {
    if (s && s.coach) return true;
    var st = status();
    if (st === 'new') { startTrial(); return true; }
    return st !== 'ended';
  }

  // Frank's sessions travel as a code in a link: #frank.<base64url of the session>
  function pack(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj)), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unpack(code) {
    try {
      var b = code.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var bin = atob(b), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }
  function cleanSpec(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.x)) return null;
    var x = o.x.filter(function (m) { return Array.isArray(m) && typeof m[0] === 'string' && EX[m[0]] && isFinite(+m[1]); })
      .slice(0, 30).map(function (m) { return [m[0], Math.round(+m[1])]; });
    if (!x.length) return null;
    return { i: String(o.i || Date.now().toString(36)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || Date.now().toString(36),
             t: String(o.t || 'Session from Frank').slice(0, 60), n: String(o.n || '').slice(0, 400), c: String(o.c || '').slice(0, 40),
             r: Math.max(1, Math.min(8, Math.round(+o.r || 1))), f: o.f === 's' ? 's' : 'c', rs: Math.max(5, Math.min(180, Math.round(+o.rs || 30))),
             w: o.w ? 1 : 0, k: o.k ? 1 : 0, x: x, d: /^\d{4}-\d{2}-\d{2}$/.test(o.d) ? o.d : iso() };
  }
  var LINK = 'frank.';
  function codeIn(text) {
    text = String(text || '').trim();
    var m = text.match(/frank\.([A-Za-z0-9_-]+)/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{24,}$/.test(text) ? text : null);
  }
  function importSession(text) {
    var code = codeIn(text), spec = code ? cleanSpec(unpack(code)) : null;
    if (!spec) return null;
    S.inbox = S.inbox.filter(function (x) { return x.i !== spec.i; });
    S.inbox.unshift(spec);
    S.access = Object.assign(S.access || {}, { client: true });
    save();
    return spec;
  }
  function specById(id) {
    return S.inbox.filter(function (x) { return x.i === id; })[0] || S.coach.templates.filter(function (x) { return x.i === id; })[0] || null;
  }
  function frankSession(id) { var sp = specById(id); return sp ? WBF.plan.custom(sp) : null; }
  function shareLink(spec) { return location.href.split('#')[0] + '#' + LINK + pack(spec); }

  // ---- figures ------------------------------------------------------------------------
  // data-fig: a moving demo. Frank's own video when there is one (js/media.js), else the 3D coach,
  // else the 2D skeleton. data-mode="muscle" shows the muscles; data-note="0" hides the label.
  function figHtml(id, opts) {
    opts = opts || {};
    return '<div class="fig-box' + (opts.cls ? ' ' + opts.cls : '') + '" data-fig="' + esc(id) + '"' + (opts.deco ? ' data-deco="1"' : '') + (opts.flip ? ' data-flip="1"' : '') +
      (opts.drag ? ' data-drag="1"' : '') + (opts.mode ? ' data-mode="' + opts.mode + '"' : '') + (opts.note === false ? ' data-note="0"' : '') +
      (opts.speed ? ' data-speed="' + opts.speed + '"' : '') + (opts.still != null ? ' data-still="' + opts.still + '"' : '') + (opts.video === false ? ' data-video="0"' : '') + '></div>';
  }
  function thumbHtml(id, cls) { return '<div class="thumb' + (cls ? ' ' + cls : '') + '" data-thumb="' + esc(id) + '"></div>'; }
  function media(id) { return (WBF.MEDIA || {})[id] || null; }
  // 3D when WebGL, three.js and the model are there; the 2D skeleton otherwise
  function use3d() { return !!(WBF.fig3d && WBF.fig3d.ready()); }
  var thumbWatch = ('IntersectionObserver' in W) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { thumbWatch.unobserve(en.target); drawThumb(en.target); } });
  }, { rootMargin: '300px' }) : null;
  function drawThumb(el) {
    var ex = EX[el.getAttribute('data-thumb')];
    if (!ex || !el.isConnected) return;
    var m = media(ex.id);
    if (m && m.poster) { el.classList.add('is3d'); el.innerHTML = '<img src="' + esc(m.poster) + '" alt="">'; return; }
    if (use3d()) new WBF.fig3d.Figure(ex.anim, {}).mount(el).still(thumbKey(ex));
    else new F.Figure(ex.anim, { aspect: 1, minW: 60, minH: 60, pad: 6, bare: true }).mount(el).still(thumbKey(ex));
  }
  function mountFigures(root) {
    $$('[data-thumb]', root).forEach(function (el) {
      if (thumbWatch) thumbWatch.observe(el); else drawThumb(el);
    });
    $$('[data-fig]', root).forEach(function (el) {
      var ex = EX[el.getAttribute('data-fig')];
      if (!ex) return;
      var f, flip = el.hasAttribute('data-flip'), mode = el.getAttribute('data-mode') || 'demo';
      var m = media(ex.id), still = el.getAttribute('data-still');
      if (m && m.video && mode === 'demo' && el.getAttribute('data-video') !== '0') {
        el.classList.add('is3d');
        el.innerHTML = '<video src="' + esc(m.video) + '"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : '') + ' autoplay muted loop playsinline' + (flip ? ' style="transform:scaleX(-1)"' : '') + '></video>';
        el._fig = { video: el.firstChild, pause: function () { this.video.pause(); }, play: function () { this.video.play(); }, still: function () {} };
        return;
      }
      if (use3d()) {
        f = new WBF.fig3d.Figure(ex.anim, { note: el.getAttribute('data-note') !== '0', flip: flip, drag: el.hasAttribute('data-drag'), mode: mode,
                                            speed: +(el.getAttribute('data-speed') || 1) }).mount(el);
      } else {
        var box = el.getBoundingClientRect();
        var aspect = box.width && box.height ? box.width / box.height : 4 / 3;
        f = new F.Figure(ex.anim, { aspect: aspect, note: el.getAttribute('data-note') !== '0', minW: 90, minH: 66, flip: flip }).mount(el);
      }
      el._fig = f;
      if (still != null) f.still(+still);
      else if (reduce && el.hasAttribute('data-deco')) f.still(thumbKey(ex));
      else f.play();
    });
    $$('[data-turn]', root).forEach(function (b) {
      b.hidden = !use3d() || !!b.parentNode.querySelector('video');
    });
    $$('img[data-map]', root).forEach(function (im) {
      var src = mapSrc(JSON.parse(im.getAttribute('data-map')), im.getAttribute('data-view'), +im.getAttribute('width') * 2, +im.getAttribute('height') * 2);
      if (src) im.src = src; else im.hidden = true;
    });
    $$('img[data-portrait]', root).forEach(function (im) {
      var src = use3d() && WBF.fig3d.portrait ? WBF.fig3d.portrait(im.getAttribute('data-portrait'), +im.getAttribute('width') * 2, +im.getAttribute('height') * 2) : null;
      if (src) { im.src = src; im.hidden = false; } else im.hidden = true;
    });
  }
  // the front/back muscle maps, drawn by the 3D coach
  function mapSrc(mus, view, w, h) { return use3d() && WBF.fig3d.mapImage ? WBF.fig3d.mapImage(mus, view, w, h) : null; }
  function mapImg(mus, view, w, h) {
    return '<img data-map="' + esc(JSON.stringify(mus)) + '" data-view="' + view + '" width="' + w + '" height="' + h + '" alt="">';
  }
  function setCoachFigure() {
    var p = cur().name === 'onboard' && draft ? draft : S.profile;
    var want = S.settings.coach || (p && p.sex === 'f' ? 'f' : 'm');
    if (WBF.fig3d && WBF.fig3d.setCoach) WBF.fig3d.setCoach(want);
  }

  // ---- navigation ---------------------------------------------------------------------
  var TABS = ['plan', 'workouts', 'today', 'me', 'frank'];
  var LIGHT = { welcome: 1, onboard: 1, pay: 1 };
  var stack = [{ name: S.profile ? 'plan' : 'welcome', params: {} }];
  var useHistory = !framed;           // inside a frame, history.back() could leave the host page
  var depth = 0;                      // history entries this page pushed: back never goes further
  function cur() { return stack[stack.length - 1]; }
  function pushState() { if (!useHistory) return; try { W.history.pushState({ wbf: stack.length }, ''); depth++; } catch (e) { useHistory = false; } }
  function go(name, params) {
    cur().scroll = W.scrollY;
    stack.push({ name: name, params: params || {} });
    pushState();
    render(true);
  }
  function pop() { if (stack.length > 1) { stack.pop(); render(false); } }
  function back() {
    if (useHistory && depth > 0) { try { W.history.back(); return; } catch (e) { useHistory = false; } }
    pop();
  }
  function tab(name) { stack = [{ name: name, params: {} }]; render(true); }
  W.addEventListener('popstate', function () {
    if (!useHistory) return;
    depth = Math.max(0, depth - 1);
    if (closeOverlay()) { pushState(); return; }
    if (cur().name === 'player') { pushState(); askQuit(); return; }
    if (cur().name === 'onboard') { pushState(); A['ob-back'](); return; }
    pop();
  });

  function render(top) {
    var c = cur(), scr = SCREENS[c.name];
    document.body.classList.toggle('light', !!LIGHT[c.name]);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', LIGHT[c.name] ? '#F2F6F3' : '#012D12');
    app.innerHTML = scr.html(c.params || {});
    var isTab = TABS.indexOf(c.name) !== -1;
    tabsEl.hidden = !isTab;
    $$('.tab', tabsEl).forEach(function (t) {
      if (t.getAttribute('data-tab') === c.name) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    document.title = scr.title ? scr.title(c.params || {}) + ' · ' + FR.brand : FR.brand;
    if (scr.mount) scr.mount(c.params || {});
    mountFigures(app);
    W.scrollTo(0, top ? 0 : (c.scroll || 0));
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }

  // ---- overlays: sheets and confirm boxes -------------------------------------------------
  var onOverlayClose = null;
  function openSheet(html, onClose, full) {
    closeOverlay();
    overlay.innerHTML = '<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet' + (full ? ' full' : '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
    overlay.hidden = false;
    onOverlayClose = onClose || null;
    document.body.style.overflow = 'hidden';
    mountFigures(overlay);
    var first = $('.sheet button, .sheet a', overlay);
    if (first) try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function confirmBox(text, yes, onYes, opts) {
    opts = opts || {};
    closeOverlay();
    overlay.innerHTML = '<div class="modal-wrap"><div class="modal" role="alertdialog" aria-modal="true">' +
      '<p class="h2">' + esc(text) + '</p>' + (opts.body ? '<p class="lead">' + esc(opts.body) + '</p>' : '') +
      '<div class="rowx wrap">' + (opts.extra ? '<button class="btn two small" data-act="modal-extra">' + esc(opts.extra) + '</button>' : '') +
      '<button class="btn two small" data-act="modal-no">' + esc(opts.no || 'Cancel') + '</button>' +
      '<button class="btn small" data-act="modal-yes">' + esc(yes) + '</button></div></div></div>';
    overlay.hidden = false;
    overlay._yes = onYes; overlay._extra = opts.onExtra || null; overlay._no = opts.onNo || null;
    try { $('[data-act="modal-yes"]', overlay).focus(); } catch (e) { /* ignore */ }
  }
  function closeOverlay() {
    if (overlay.hidden) return false;
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.body.style.overflow = '';
    var cb = onOverlayClose; onOverlayClose = null;
    if (cb) cb();
    return true;
  }

  // ---- muscles ---------------------------------------------------------------------------
  var MUS_NAME = { chest: 'Chest', abs: 'Abs', obliques: 'Obliques', 'front-deltoids': 'Front shoulders', 'back-deltoids': 'Rear shoulders',
                   biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearms', trapezius: 'Traps', 'upper-back': 'Upper back', 'lower-back': 'Lower back',
                   gluteal: 'Glutes', abductors: 'Outer hips', adductor: 'Inner thighs', quadriceps: 'Quads', hamstring: 'Hamstrings', calves: 'Calves' };
  var BACK_SIDE = { 'back-deltoids': 1, trapezius: 1, 'upper-back': 1, 'lower-back': 1, gluteal: 1, hamstring: 1, calves: 1, triceps: 1 };
  function musChips(mus, max) {
    var out = (mus.p || []).slice(0, max || 6).map(function (m) { return '<span>' + esc(MUS_NAME[m] || m) + '</span>'; });
    (mus.s || []).slice(0, Math.max(0, (max || 6) - out.length)).forEach(function (m) { out.push('<span class="s">' + esc(MUS_NAME[m] || m) + '</span>'); });
    return '<div class="mus-chips">' + out.join('') + '</div>';
  }
  function focusMaps(mus, w, h) {
    var all = (mus.p || []).concat(mus.s || []);
    var back = all.some(function (m) { return BACK_SIDE[m]; }), front = all.some(function (m) { return !BACK_SIDE[m]; });
    if (!front && !back) front = true;
    return '<div class="focus-maps">' + (front ? mapImg(mus, 'front', w, h) : '') + (back ? mapImg(mus, 'back', w, h) : '') + '</div>';
  }

  // ---- exercise sheet: Video, Muscle, How-to --------------------------------------------------
  // list: the moves of the workout it was opened from (for the pager); i: which one
  var XS = null;
  function exerciseSheet(id, opts) {
    opts = opts || {};
    XS = { list: opts.list || [{ ex: id }], i: opts.i || 0, tab: 'video', player: !!opts.player, onClose: opts.onClose };
    paintExSheet(true);
  }
  function paintExSheet(first) {
    var item = XS.list[XS.i], id = item.ex, ex = EX[id];
    if (!ex) return;
    var lvl = (S.profile && WBF.plan.levelFor(S.profile)) || 'b';
    var dose = item.dose != null ? item.dose : ex.dose[lvl];
    var kit = (ex.eq || []).filter(function (k) { return k !== 'load'; }).map(function (k) {
      var m = WBF.KIT.filter(function (x) { return x.id === k; })[0];
      return m ? m.name : k;
    });
    var alts = (ex.alts || []).filter(function (a) { return EX[a]; });
    var m = media(id), tabFig;
    if (XS.tab === 'muscle') tabFig = figHtml(id, { mode: 'muscle', drag: true, note: false, video: false });
    else if (XS.tab === 'howto') tabFig = m && m.howto && !/youtu/.test(m.howto) ? '<div class="fig-box is3d"><video src="' + esc(m.howto) + '"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : '') + ' controls playsinline></video></div>'
      : figHtml(id, { drag: true, speed: 0.55, video: false });
    else tabFig = figHtml(id, { drag: true, note: false });
    var mus = ex.mus || { p: [], s: [] };
    var n = XS.list.length;
    var html = '<div class="xs">' +
      '<div class="between"><h2 class="h2">' + esc(ex.name) + '</h2><button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<div class="media" id="xs-media">' + tabFig +
      '<div class="tags-on">' + (m && m.video && XS.tab === 'video' ? '<span class="tag">Frank</span>' : '') + (XS.tab === 'howto' && !(m && m.howto) ? '<span class="tag">Slow motion</span>' : '') + '</div>' +
      '<button class="icon-btn glass turn" data-act="turn" data-turn="1" aria-label="Turn the figure" hidden>' + ic('turn') + '</button></div>' +
      '<div class="tabs3" role="tablist">' + [['video', 'Video'], ['muscle', 'Muscle'], ['howto', 'How-to']].map(function (t) {
        return '<button role="tab" data-act="xs-tab" data-v="' + t[0] + '" aria-pressed="' + (XS.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (m && m.howto && /youtu/.test(m.howto) && XS.tab === 'howto' ? '<a class="btn two block" href="' + esc(m.howto) + '" target="_blank" rel="noopener">Watch Frank explain it</a>' : '') +
      '<div class="xs-dose"><span class="label">' + (ex.type === 'time' ? 'Duration' : 'Reps') + (ex.each ? ' · each side' : '') + '</span><b>' + (ex.type === 'time' ? mmss(dose) : '× ' + dose) + '</b></div>' +
      (kit.length ? '<div class="kit-line">' + kit.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>' : '') +
      '<section class="stack"><p class="label">Instructions</p><p>' + esc(ex.setup) + '</p><ol class="steps">' + ex.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></section>' +
      '<section class="stack"><p class="label">Focus area</p><div class="focus-row">' + focusMaps(mus, 64, 128) + musChips(mus, 8) + '</div></section>' +
      '<section class="stack"><p class="label">Frank\'s cues</p><ul class="bul">' + ex.cue.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="stack"><p class="label">Watch out for</p><ul class="bul x">' + ex.mistakes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></section>' +
      '<div class="card"><p class="label">Why it works</p><p class="note s">' + esc(ex.why) + '</p></div>' +
      (alts.length && !XS.player ? '<section class="stack"><p class="label">Easier options</p><div class="list">' + alts.map(function (a) {
        return '<button class="item" data-act="ex" data-id="' + a + '">' + thumbHtml(a) + '<span class="grow"><b>' + esc(EX[a].name) + '</b><span class="meta">' + esc(EX[a].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + '</span></span>' + ic('chev', 'chev') + '</button>';
      }).join('') + '</div></section>' : '') +
      '<div class="xs-foot">' + (n > 1 ? '<div class="pager"><button class="icon-btn" data-act="xs-go" data-d="-1" aria-label="Previous move"' + (XS.i === 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('back') + '</button><span>' + (XS.i + 1) + '/' + n + '</span>' +
        '<button class="icon-btn" data-act="xs-go" data-d="1" aria-label="Next move"' + (XS.i === n - 1 ? ' disabled style="opacity:.3"' : '') + '>' + ic('chev') + '</button></div>' : '') +
      '<button class="btn grow" data-act="close">' + (XS.player ? 'Back to the workout' : 'Close') + '</button></div></div>';
    if (first || overlay.hidden) openSheet(html, function () { var cb = XS && XS.onClose; XS = null; if (cb) cb(); }, true);
    else {
      var sheet = $('.sheet', overlay);
      sheet.innerHTML = '<div class="grab"></div>' + html;
      mountFigures(sheet);
      sheet.scrollTop = 0;
    }
  }
  // swap only the demo when the tab changes
  function paintExMedia() {
    var keep = XS.tab;
    paintExSheet(false);
    XS.tab = keep;
  }

  function swapSheet(origId, curId) {
    var orig = EX[origId], kit = (S.profile && S.profile.kit) || WBF.DEFAULT_KIT, av = WBF.plan.avoidFor(S.profile);
    var opts = Object.keys(EX).filter(function (k) {
      var e = EX[k];
      return k !== curId && e.pattern === orig.pattern && WBF.plan.canDo(e, kit) && WBF.plan.safe(e, av) && (e.area.indexOf('mobility') === -1 || orig.area.indexOf('mobility') !== -1);
    });
    var html = '<div class="sheet-body"><div class="between"><h2 class="h2">Swap ' + esc(EX[curId].name) + '</h2>' +
      '<button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<p class="lead">Pick a move that trains the same pattern. Your choice is used in every workout from now on.</p>' +
      '<div class="list">' + opts.map(function (k) {
        return '<button class="item" data-act="do-swap" data-from="' + origId + '" data-to="' + k + '">' + thumbHtml(k) + '<span class="grow"><b>' + esc(EX[k].name) + '</b><span class="meta">' + esc(EX[k].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + '</span></span>' + ic('swap', 'chev') + '</button>';
      }).join('') + '</div>' +
      (S.swaps[origId] ? '<button class="btn two block" data-act="do-swap" data-from="' + origId + '" data-to="">Go back to ' + esc(orig.name) + '</button>' : '') +
      '</div>';
    openSheet(html);
  }

  // workout settings, from a workout or the player
  function settingsSheet() {
    var st = S.settings;
    var sw = function (k, label, sub) {
      return '<div class="set-row"><div><b>' + label + '</b><span class="meta">' + sub + '</span></div><button class="switch" role="switch" data-act="setting" data-k="' + k + '" aria-checked="' + !!st[k] + '" aria-label="' + label + '"></button></div>';
    };
    openSheet('<div class="sheet-body"><div class="between"><h2 class="h2">Workout settings</h2><button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<div class="list">' + sw('voice', 'Voice guidance', 'Calls out each move, the rest and halfway') + sw('sound', 'Sound effects', 'Countdown beeps for the last three seconds') +
      sw('vibrate', 'Vibration', 'A buzz when a move or rest starts (Android)') +
      segRow('rest', 'Rest time', [0, 15, 30, 45, 60], function (v) { return v ? v + 's' : 'Auto'; }, 'Between moves. Auto follows your level') +
      segRow('ready', 'Get ready', [5, 10, 15], function (v) { return v + 's'; }, 'Before the first move') +
      segRow('coach', 'Coach figure', ['', 'm', 'f'], function (v) { return v === 'm' ? 'Male' : v === 'f' ? 'Female' : 'Auto'; }, 'Who demonstrates the moves') + '</div></div>');
  }
  function segRow(k, label, vals, fmt, sub) {
    var st = S.settings;
    return '<div class="set-row"><div><b>' + label + '</b>' + (sub ? '<span class="meta">' + sub + '</span>' : '') + '</div><span class="seg" role="group" aria-label="' + label + '">' + vals.map(function (v) {
      return '<button data-act="setting-v" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (String(st[k] == null ? '' : st[k]) === String(v)) + '">' + fmt(v) + '</button>';
    }).join('') + '</span></div>';
  }

  // ---- screens -----------------------------------------------------------------------------------
  var SCREENS = {};
  var draft = null;

  SCREENS.welcome = {
    html: function () {
      return '<div class="ob">' +
        '<div class="welcome-hero">' + figHtml('jumping-jacks', { deco: true, note: false }) + '<span class="wordmark wm">Wellness by Frank</span></div>' +
        '<div class="welcome-text"><h1>Your personal plan</h1><p>Built on Frank\'s method and the research. Every move shown by a moving coach, with the why behind it.</p></div>' +
        '<div class="ob-cta"><button class="btn dark block" data-act="ob-start">Get my plan</button>' +
        '<button class="btn white block" data-act="join">I train with Frank</button>' +
        '<button class="ob-skip" data-act="browse" style="align-self:center">Look around first</button>' +
        '<p class="ob-note">Your answers and progress stay on this phone.</p></div></div>';
    }
  };

  // ---- onboarding: three parts, then the plan --------------------------------------------------
  var OB = [
    { id: 'p1', part: 1, intro: true },
    { id: 'goal', part: 1 }, { id: 'focus', part: 1 }, { id: 'want', part: 1 },
    { id: 'p2', part: 2, intro: true },
    { id: 'sex', part: 2 }, { id: 'born', part: 2 }, { id: 'height', part: 2 }, { id: 'weight', part: 2 }, { id: 'target', part: 2 },
    { id: 'health', part: 2 }, { id: 'sore', part: 2 },
    { id: 'p3', part: 3, intro: true },
    { id: 'active', part: 3 }, { id: 'pushups', part: 3 }, { id: 'days', part: 3 }, { id: 'minutes', part: 3 }, { id: 'kit', part: 3 },
    { id: 'coach', part: 3 }, { id: 'name', part: 3 },
    { id: 'build' }, { id: 'ready' }
  ];
  var OB_I = {};
  OB.forEach(function (s, i) { OB_I[s.id] = i; });
  var PARTS = {
    1: ['Part 1', 'Goal & <i>focus</i>', 'What you want from training.'],
    2: ['Part 2', 'Know your <i>body</i>', 'So the plan fits you, and stays safe.'],
    3: ['Part 3', 'Fitness <i>check</i>', 'Where you start, and the time you have.']
  };
  function newDraft() {
    var p = S.profile;
    if (p) return JSON.parse(JSON.stringify(p));
    return { goal: null, focus: [], want: [], sex: null, birthYear: null, cm: null, kg: null, targetKg: null, health: {}, injuries: [],
             active: 1, push: null, level: null, days: 3, minutes: 20, kit: WBF.DEFAULT_KIT.slice(), name: '' };
  }
  function obNext(from) {
    var i = OB_I[from] + 1;
    if (OB[i] && OB[i].id === 'p2' && draft.edit) i++;
    return OB[i] ? OB[i].id : 'ready';
  }
  function obGo(id) { replaceTop('onboard', { step: id }); }
  function replaceTop(name, params) { stack[stack.length - 1] = { name: name, params: params }; render(true); }
  function obTop(stepId) {
    var st = OB[OB_I[stepId]], part = st.part || 3;
    var inPart = OB.filter(function (s) { return s.part === part && !s.intro; });
    var k = inPart.map(function (s) { return s.id; }).indexOf(stepId) + 1;
    var bars = [1, 2, 3].map(function (p) {
      var w = p < part ? 100 : p > part ? 0 : Math.round(k / inPart.length * 100);
      return '<i><b style="width:' + w + '%"></b></i>';
    }).join('');
    return '<div class="ob-top"><button class="icon-btn" data-act="ob-back" aria-label="Back">' + ic('back') + '</button><div class="ob-prog" aria-hidden="true">' + bars + '</div><span style="width:44px"></span></div>';
  }
  function coachLine(text) { return '<div class="coachline"><span class="av">F</span><p>' + text + '</p></div>'; }
  function opt(act, k, v, label, small, on, iconName) {
    return '<button class="opt" data-act="' + act + '" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + !!on + '">' +
      (iconName ? '<span class="oi">' + ic(iconName) + '</span>' : '') + '<span class="grow">' + label + (small ? '<small>' + small + '</small>' : '') + '</span><span class="tickc">' + ic('check') + '</span></button>';
  }
  function cta(label, act, disabled) { return '<div class="ob-cta"><button class="btn dark block" data-act="' + (act || 'ob-next') + '"' + (disabled ? ' disabled' : '') + '>' + (label || 'Next') + '</button></div>'; }
  function ruler(id, val, min, max, step, unit) {
    return '<div class="ruler-wrap"><div class="big-val num" id="rv-' + id + '">' + val + '<small>' + unit + '</small></div>' +
      '<div class="ruler" id="rl-' + id + '" data-min="' + min + '" data-max="' + max + '" data-step="' + step + '" data-val="' + val + '" aria-label="Slide to set" role="slider" aria-valuemin="' + min + '" aria-valuemax="' + max + '" aria-valuenow="' + val + '" tabindex="0"><canvas></canvas></div><div class="ruler-needle"></div></div>';
  }
  function bmiBox(kg, cm) {
    var b = bmiOf(kg, cm);
    if (!b) return '';
    var pct = clamp((b - 15) / 25 * 100, 0, 100), word = bmiWord(b);
    var say = word === 'Healthy' ? 'A healthy range. Training keeps it there and builds strength.' : word === 'Underweight' ? 'Below the healthy range. Strength training and enough food matter more than burning calories.'
      : 'A little training most days, plus your food, will move this. Small losses already lower blood pressure and diabetes risk.';
    return '<div class="infobox"><p class="label" style="color:var(--sky-lo)">Your BMI</p><div class="between"><b class="big num">' + b.toFixed(1) + '</b><b>' + word + '</b></div>' +
      '<div class="bmi-bar"><i style="left:' + pct + '%"></i></div><div class="bmi-scale"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div><p>' + say + ' BMI is a rough guide: it can\'t tell muscle from fat.</p></div>';
  }
  function targetBox(d) {
    var cur = d.kg, tgt = d.targetKg;
    if (!cur || !tgt) return '';
    var diff = tgt - cur, pct = Math.abs(diff) / cur * 100;
    if (Math.abs(diff) < 0.5) return '<div class="infobox"><b>Keep your weight</b><p>The plan will focus on strength and fitness. Weigh yourself once a week to keep an eye on it.</p></div>';
    if (diff > 0) return '<div class="infobox"><b>Gain ' + kgShow(diff) + ' ' + wUnit() + '</b><p>Muscle comes from strength training plus enough protein, about 1.6 g per kg of body weight a day. Expect it to come slowly.</p></div>';
    var minW = Math.ceil(-diff / (cur * 0.01)), maxW = Math.ceil(-diff / (cur * 0.005));
    var a = addDays(new Date(), minW * 7), b = addDays(new Date(), maxW * 7);
    var lowBmi = d.cm && bmiOf(tgt, d.cm) < 18.5;
    return '<div class="infobox"><b>' + (pct > 20 ? 'A big goal' : 'A reasonable goal') + ': lose ' + pct.toFixed(1) + '% of your weight</b>' +
      '<p>A healthy pace is 0.5 to 1% of body weight a week, about ' + kgShow(cur * 0.005) + ' to ' + kgShow(cur * 0.01) + ' ' + wUnit() + ' for you. That puts ' + kgShow(tgt) + ' ' + wUnit() + ' between <b>' + fmtShort.format(a) + '</b> and <b>' + fmtShort.format(b) + '</b>, with training and a calorie deficit together.</p>' +
      (pct > 20 ? '<p>Set a first stop at 5 to 10%: it already lowers blood pressure and diabetes risk.</p>' : '') +
      (lowBmi ? '<p class="warnbox">That would put you below a healthy weight for your height. Talk to a doctor or dietitian first.</p>' : '') + '</div>';
  }
  function weightChart(d) {
    var cur = d.kg, tgt = d.targetKg;
    if (!cur || !tgt || tgt >= cur - 0.5) return '';
    var weeks = Math.ceil((cur - tgt) / (cur * 0.0075)), Wd = 320, Hh = 130;
    var pts = [];
    for (var i = 0; i <= 20; i++) { var t = i / 20; pts.push([24 + t * (Wd - 48), 18 + (Hh - 46) * (1 - Math.pow(1 - t, 1.6))]); }
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
    return '<div class="chart-card"><svg viewBox="0 0 ' + Wd + ' ' + Hh + '" role="img" aria-label="Expected weight from now to your goal">' +
      '<defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stop-color="#E06A5A"/><stop offset="1" stop-color="#4C9FD8"/></linearGradient></defs>' +
      '<path d="' + line + '" fill="none" stroke="url(#wg)" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="6" fill="#fff" stroke="#E06A5A" stroke-width="3"/><circle cx="' + pts[20][0] + '" cy="' + pts[20][1] + '" r="6" fill="#fff" stroke="#4C9FD8" stroke-width="3"/>' +
      '<text x="' + (pts[0][0] + 12) + '" y="9">Today · ' + kgShow(cur) + ' ' + wUnit() + '</text><text x="' + (pts[20][0]) + '" y="' + (pts[20][1] + 22) + '" text-anchor="end">' + fmtShort.format(addDays(new Date(), weeks * 7)) + ' · ' + kgShow(tgt) + ' ' + wUnit() + '</text></svg>' +
      '<p class="ob-note" style="text-align:left;margin-top:6px">At 0.75% a week, the middle of the healthy range. An estimate, not a promise.</p></div>';
  }
  function levelFromTest(d) {
    var push = d.push, act = +d.active || 0;
    if (push == null) return d.level || 'b';
    if (push === 0) return 'b';
    if (push === 1) return act >= 2 ? 'i' : 'b';
    if (push === 2) return 'i';
    return act >= 2 ? 'a' : 'i';
  }
  var GOAL_FIG = { fat: 'jumping-jacks', strength: 'goblet-squat', move: 'cat-cow', fit: 'reverse-lunge' };
  var WANTS = [['looks', 'Look and feel fitter', 'smile'], ['energy', 'More energy', 'bolt'], ['aches', 'Fewer aches from sitting', 'chair'], ['sleep', 'Sleep better', 'moon'], ['age', 'Stay strong as I age', 'shield'], ['stress', 'Less stress', 'leaf']];
  var ACTIVE = [['box-squat', 'I sit most of the day', 1], ['march', 'I walk a little most days', null], ['high-knees', 'I\'m on my feet and moving a lot', null], ['jump-squat', 'I train most days', null]];

  SCREENS.onboard = {
    title: function () { return 'Your plan'; },
    html: function (p) {
      var id = p.step || 'p1', d = draft, st = OB[OB_I[id]] || OB[0];
      if (st.intro) {
        var P = PARTS[st.part];
        return '<div class="part" data-act="ob-next" role="button" tabindex="0" aria-label="Continue"><p>' + P[0] + '</p><h1>' + P[1] + '</h1><p class="sub">' + P[2] + '</p>' +
          '<div style="margin-top:22px"><button class="btn block" data-act="ob-next">Continue</button></div></div>';
      }
      var body = '', foot = cta(), q = '', sub = '';
      if (id === 'goal') {
        q = 'What\'s your main goal?';
        body = coachLine('Your goal sets the mix of strength and cardio in your plan.') + '<div class="opt-list">' + ['fat', 'strength', 'move', 'fit'].map(function (g) {
          var G = WBF.GOALS[g];
          return '<button class="opt pic" data-act="ob-pick" data-k="goal" data-v="' + g + '" aria-pressed="' + (d.goal === g) + '"><span class="grow">' + G.name + '<small>' + G.line + '</small></span>' +
            '<span class="pi is3d">' + figHtml(GOAL_FIG[g], { still: 1, note: false, video: false }) + '</span></button>';
        }).join('') + '</div>';
        foot = '';
      } else if (id === 'focus') {
        q = 'What do you want to <em>focus</em> on?';
        var sel = d.focus || [];
        var mus = { p: [], s: [] };
        sel.forEach(function (b) { var B = WBF.BODY_BY_ID[b]; if (B) mus.p = mus.p.concat(B.mus); });
        body = '<div class="focus-pick"><div class="opt-list">' + ['full', 'arms', 'chest', 'abs', 'legs', 'back'].map(function (b) {
          return '<button class="opt" role="checkbox" data-act="ob-multi" data-k="focus" data-v="' + b + '" aria-checked="' + (sel.indexOf(b) !== -1) + '"><span class="grow">' + WBF.BODY_BY_ID[b].name + '</span><span class="tickc">' + ic('check') + '</span></button>';
        }).join('') + '</div><div class="focus-fig">' + mapImg(mus, 'front', 148, 296) + '</div></div>';
        foot = cta('Next', 'ob-next', !sel.length);
      } else if (id === 'want') {
        q = 'What do you want <em>most</em>?';
        sub = 'Pick any. Frank uses it to keep you going.';
        body = '<div class="opt-grid">' + WANTS.map(function (w) {
          var on = (d.want || []).indexOf(w[0]) !== -1;
          return '<button class="tile" role="checkbox" data-act="ob-multi" data-k="want" data-v="' + w[0] + '" aria-checked="' + on + '"><span class="ti icon"><span class="big">' + ic(w[2]) + '</span></span>' + w[1] + '</button>';
        }).join('') + '</div>';
      } else if (id === 'sex') {
        q = 'Who should <em>demonstrate</em> your moves?';
        sub = 'Also used for the calorie estimate.';
        body = '<div class="opt-grid">' + [['m', 'Male'], ['f', 'Female']].map(function (s) {
          return '<button class="tile" data-act="ob-pick" data-k="sex" data-v="' + s[0] + '" aria-pressed="' + (d.sex === s[0]) + '"><span class="ti tall"><img data-portrait="' + s[0] + '" width="170" height="226" alt="" hidden>' +
            '<span class="big" style="font-size:20px;color:var(--ink-d2)">' + (s[0] === 'm' ? 'He' : 'She') + '</span></span>' + s[1] + '</button>';
        }).join('') + '</div><button class="ob-skip" data-act="ob-pick" data-k="sex" data-v="x" style="align-self:center">Other / I\'d rather not say</button>';
        foot = '';
      } else if (id === 'born') {
        q = 'What year were you <em>born</em>?';
        body = coachLine('Age changes the plan: from 60 every session adds balance work and stays low impact.') +
          '<div class="wheel-wrap"><div class="wheel" id="wheel">' + (function () {
            var y = new Date().getFullYear(), out = '<div style="height:92px"></div>';
            for (var k = y - 90; k <= y - 12; k++) out += '<button data-year="' + k + '" class="' + (k === (d.birthYear || y - 35) ? 'on' : '') + '">' + k + '</button>';
            return out + '<div style="height:92px"></div>';
          })() + '</div></div>';
        if (d.birthYear && new Date().getFullYear() - d.birthYear < 18) body += '<p class="warnbox">This app is made for adults. Train with a parent\'s OK; the food tracking stays off.</p>';
      } else if (id === 'height') {
        q = 'How <em>tall</em> are you?';
        var ft = S.settings.hunits === 'ft';
        var cm = d.cm || (d.sex === 'f' ? 165 : 178);
        body = coachLine('With your weight, this gives your BMI and a safe weekly pace.') +
          '<div class="ruler-wrap"><span class="unit-seg" role="group" aria-label="Units"><button data-act="hunits" data-v="cm" aria-pressed="' + !ft + '">cm</button><button data-act="hunits" data-v="ft" aria-pressed="' + ft + '">ft</button></span></div>' +
          (ft ? ruler('h', Math.round(cm / 2.54), 48, 90, 1, 'in') : ruler('h', Math.round(cm), 120, 220, 1, 'cm'));
      } else if (id === 'weight') {
        q = 'What\'s your <em>current</em> weight?';
        var lb = S.settings.units === 'lb';
        var kg = d.kg || (d.sex === 'f' ? 65 : 80);
        body = '<div class="ruler-wrap"><span class="unit-seg" role="group" aria-label="Units"><button data-act="units" data-v="kg" aria-pressed="' + !lb + '">kg</button><button data-act="units" data-v="lb" aria-pressed="' + lb + '">lb</button></span></div>' +
          (lb ? ruler('w', Math.round(kg * 2.20462), 70, 440, 1, 'lb') : ruler('w', Math.round(kg * 2) / 2, 30, 200, 0.5, 'kg')) + '<div id="bmi-box">' + bmiBox(kg, d.cm) + '</div>';
      } else if (id === 'target') {
        q = 'What\'s your <em>target</em> weight?';
        var lb2 = S.settings.units === 'lb', cur = d.kg || 80;
        var tg = d.targetKg || (d.goal === 'fat' ? Math.round(cur * 0.93 * 2) / 2 : cur);
        d.targetKg = tg;
        body = (lb2 ? ruler('t', Math.round(tg * 2.20462), 70, 440, 1, 'lb') : ruler('t', Math.round(tg * 2) / 2, 30, 200, 0.5, 'kg')) + '<div id="tg-box">' + targetBox(d) + weightChart(d) + '</div>';
      } else if (id === 'health') {
        q = 'Before you <em>start</em>';
        sub = 'The PAR-Q+ questions trainers use. Answer for how you are now.';
        var any = WBF.PARQ.some(function (x) { return d.health[x[0]]; });
        body = '<div class="yn-list">' + WBF.PARQ.concat([['pregnant', 'Are you pregnant, or did you give birth in the last six months?']]).map(function (x) {
          var v = !!d.health[x[0]];
          return '<div class="yn-q"><p>' + x[1] + '</p><span class="unit-seg" role="group" aria-label="' + esc(x[1]) + '">' +
            '<button data-act="ob-health" data-k="' + x[0] + '" data-v="0" aria-pressed="' + !v + '">No</button><button data-act="ob-health" data-k="' + x[0] + '" data-v="1" aria-pressed="' + v + '">Yes</button></span></div>';
        }).join('') + '</div>' +
          (any ? '<p class="warnbox">Check with your doctor or a qualified exercise professional before you train hard, and tell Frank. Until then your plan stays gentle: no jumping, nothing vigorous. When you\'re cleared, switch it off in Me.</p>' : '') +
          (d.health.pregnant ? '<p class="warnbox">Pregnancy mode: no lying on your back or front, no jumping, no balance pad or rings. Talk to your midwife or doctor first, and stop if you feel dizzy, short of breath before effort, or any pain.</p>' : '');
      } else if (id === 'sore') {
        q = 'Any <em>sore spots</em> or recent injuries?';
        sub = 'Your coach swaps out the moves that load them.';
        var inj = d.injuries || [];
        body = '<div class="opt-list">' + opt('ob-none', 'injuries', 'none', 'None', '', !inj.length && d.soreDone) +
          WBF.SORE.map(function (s) { return '<button class="opt" role="checkbox" data-act="ob-multi" data-k="injuries" data-v="' + s[0] + '" aria-checked="' + (inj.indexOf(s[0]) !== -1) + '"><span class="grow">' + s[1] + '</span><span class="tickc">' + ic('check') + '</span></button>'; }).join('') + '</div>';
        if (inj.length) body += coachLine('Got it. Moves that load your ' + inj.map(function (x) { return WBF.SORE.filter(function (s) { return s[0] === x; })[0][1].toLowerCase(); }).join(' and ') + ' are left out or swapped. Stop any move that hurts.');
      } else if (id === 'active') {
        q = 'How <em>active</em> are you?';
        var a = +d.active || 0, A_ = ACTIVE[a];
        body = '<div class="illus">' + figHtml(A_[0], A_[2] != null ? { still: A_[2], note: false, video: false } : { note: false, video: false }) + '</div>' +
          '<div class="illus-cap"><b>' + A_[1] + '</b></div>' +
          '<div class="slider-pick"><input type="range" min="0" max="3" step="1" value="' + a + '" id="act-in" aria-label="How active are you?"><div class="slider-ends"><span>Sitting</span><span>Very active</span></div></div>';
      } else if (id === 'pushups') {
        q = 'How many <em>push-ups</em> can you do in a row?';
        sub = 'Full push-ups, chest near the floor. A guess is fine.';
        body = '<div class="opt-grid">' + [['0', '0–4'], ['1', '5–14'], ['2', '15–29'], ['3', '30+']].map(function (x) {
          return '<button class="tile" data-act="ob-push" data-v="' + x[0] + '" aria-pressed="' + (String(d.push) === x[0]) + '"><span class="ti icon wide"><span class="big">' + x[1] + '</span></span>push-ups</button>';
        }).join('') + '</div>';
        if (d.push != null) {
          var L = d.level || levelFromTest(d);
          body += '<div class="infobox"><p class="label" style="color:var(--sky-lo)">Your starting level</p><span class="unit-seg" role="group" aria-label="Level">' + ['b', 'i', 'a'].map(function (l) {
            return '<button data-act="ob-level" data-v="' + l + '" aria-pressed="' + (L === l) + '">' + WBF.LEVELS[l] + '</button>';
          }).join('') + '</span><p>' + (L === 'b' ? 'Two rounds, 8 to 15 reps, easier versions of each move.' : L === 'i' ? 'Two to three rounds and the standard versions.' : 'Three to four rounds and the hardest versions.') + ' Every set stops with two or three reps left.</p></div>';
        }
        foot = cta('Next', 'ob-next', d.push == null);
      } else if (id === 'days') {
        q = 'How many days a week can you <em>train</em>?';
        body = '<div class="opt-grid" style="grid-template-columns:repeat(5,1fr)">' + [2, 3, 4, 5, 6].map(function (n) {
          return '<button class="tile" data-act="ob-pick-stay" data-k="days" data-v="' + n + '" aria-pressed="' + (+d.days === n) + '" style="padding:14px 0"><b style="font:900 30px/1 var(--f-display)">' + n + '</b></button>';
        }).join('') + '</div>' + coachLine(+d.days <= 2 ? 'Two days covers the minimum: every muscle twice a week. Walks on the other days count too.' : +d.days >= 5 ? 'Plenty. Plans alternate body parts so muscles get 48 hours before working hard again.' : 'A good rhythm: a rest day between most sessions.');
      } else if (id === 'minutes') {
        q = 'How long can each <em>workout</em> be?';
        body = '<div class="opt-list">' + [[10, 'Short and sharp', '10 minutes'], [20, 'The sweet spot', '20 minutes'], [30, 'Room to build', '30 minutes'], [45, 'Full sessions', '45 minutes']].map(function (x) {
          return opt('ob-pick-stay', 'minutes', x[0], x[2], x[1], +d.minutes === x[0], 'clock');
        }).join('') + '</div>' + coachLine('Short sessions work. Even a few minutes of hard effort a day adds up.');
      } else if (id === 'kit') {
        q = 'What do you have at <em>home</em>?';
        sub = 'Moves that need kit you don\'t have are swapped for ones that don\'t.';
        body = '<div class="opt-list">' + WBF.KIT.map(function (k) {
          return '<button class="opt" role="checkbox" data-act="ob-multi" data-k="kit" data-v="' + k.id + '" aria-checked="' + ((d.kit || []).indexOf(k.id) !== -1) + '"><span class="grow">' + esc(k.name) + '</span><span class="tickc">' + ic('check') + '</span></button>';
        }).join('') + '</div>';
      } else if (id === 'coach') {
        q = 'Meet your <em>coach</em>';
        body = '<div class="coach-card"><img src="' + img('img/wellness-4.jpg') + '" alt="Frank\'s graphic: Not only a trainer, but purposely an educator"><div class="cc"><b>Frank</b><p>' + esc(FR.bio) + '</p>' +
          '<p>Your plan follows his method: scapula and hips first, then strength, balance and load. Every move tells you why.</p></div></div>';
        foot = cta('Next');
      } else if (id === 'name') {
        q = 'What should Frank <em>call</em> you?';
        body = '<div class="field"><label for="ob-name" class="sr">First name</label><input class="input" id="ob-name" autocomplete="given-name" maxlength="40" value="' + esc(d.name || '') + '" placeholder="First name (optional)"></div>';
        foot = cta('Build my plan', 'ob-build');
      } else if (id === 'build') {
        return '<div class="ob"><div class="building"><div class="build-ring"><svg viewBox="0 0 200 200"><circle class="tr" cx="100" cy="100" r="88"/><circle class="fl" id="b-ring" cx="100" cy="100" r="88" stroke-dasharray="553" stroke-dashoffset="553"/></svg><b id="b-pct">0%</b></div>' +
          '<p class="ob-q" style="text-align:center;font-size:24px">Building your plan</p><ul class="build-steps" id="b-steps">' + buildSteps(d).map(function (t) { return '<li>' + ic('check') + esc(t) + '</li>'; }).join('') + '</ul></div></div>';
      } else if (id === 'ready') {
        return readyHtml();
      }
      return '<div class="ob">' + obTop(id) + '<h1 class="ob-q">' + q + '</h1>' + (sub ? '<p class="ob-sub">' + sub + '</p>' : '') + body + foot + '</div>';
    },
    mount: function (p) {
      var id = p.step || 'p1', d = draft;
      $$('.ruler').forEach(function (r) { setupRuler(r); });
      if ((id === 'p2' || id === 'sex') && WBF.fig3d && WBF.fig3d.load) { WBF.fig3d.load('m'); WBF.fig3d.load('f'); }
      if (id === 'born') {
        var wh = $('#wheel');
        var on = $('button.on', wh) || $('button[data-year="' + (new Date().getFullYear() - 35) + '"]', wh);
        if (on) wh.scrollTop = on.offsetTop - wh.clientHeight / 2 + on.offsetHeight / 2;
        if (!d.birthYear) d.birthYear = new Date().getFullYear() - 35;
        var t = null;
        wh.addEventListener('scroll', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            var mid = wh.scrollTop + wh.clientHeight / 2, best = null, bd = 1e9;
            $$('button', wh).forEach(function (b) { var c = b.offsetTop + b.offsetHeight / 2, dd = Math.abs(c - mid); if (dd < bd) { bd = dd; best = b; } });
            if (best) { $$('button', wh).forEach(function (b) { b.classList.toggle('on', b === best); }); d.birthYear = +best.getAttribute('data-year'); }
          }, 90);
        });
        wh.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          wh.scrollTo({ top: b.offsetTop - wh.clientHeight / 2 + b.offsetHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
        });
      }
      if (id === 'active') {
        var inp = $('#act-in');
        inp.addEventListener('input', function () { d.active = +inp.value; var y = W.scrollY; obGo('active'); W.scrollTo(0, y); var again = $('#act-in'); if (again) again.focus(); });
      }
      if (id === 'build') runBuild();
    }
  };
  function buildSteps(d) {
    var out = ['Choosing moves for ' + (WBF.GOALS[d.goal] || WBF.GOALS.fit).name.toLowerCase()];
    if ((d.injuries || []).length) out.push('Leaving out moves that load your ' + d.injuries.map(function (x) { return WBF.SORE.filter(function (s) { return s[0] === x; })[0][1].toLowerCase(); }).join(' and '));
    out.push('Setting doses for ' + (WBF.LEVELS[d.level || 'b'] || 'Beginner').toLowerCase() + 's');
    out.push('Scheduling ' + d.days + ' days a week, ' + d.minutes + ' minutes each');
    var fw = (d.focus || []).filter(function (f) { return f !== 'full' && WBF.BODY_BY_ID[f]; });
    if (fw.length) out.push('Adding extra work for your ' + fw.map(function (f) { return WBF.BODY_BY_ID[f].name.toLowerCase(); }).join(' and '));
    out.push('Checking every muscle gets two sessions a week');
    return out;
  }
  function runBuild() {
    var ring = $('#b-ring'), pct = $('#b-pct'), steps = $$('#b-steps li'), t0 = Date.now(), dur = reduce ? 600 : 3600;
    (function step() {
      if (cur().name !== 'onboard' || cur().params.step !== 'build') return;
      var k = Math.min(1, (Date.now() - t0) / dur);
      ring.style.strokeDashoffset = String(553 * (1 - k));
      pct.textContent = Math.round(k * 100) + '%';
      steps.forEach(function (li, i) { li.classList.toggle('on', k >= (i + 1) / (steps.length + 0.5)); });
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(function () { if (cur().params.step === 'build') obGo('ready'); }, 350);
    })();
  }
  function readyHtml() {
    var d = S.profile || draft, days = WBF.plan.days(d), train = days.filter(function (x) { return x.train; });
    var a = ageNow(d), b = bmiOf(d.kg, d.cm), av = WBF.plan.avoidFor(d);
    var minutes = train.length * (d.minutes || 20);
    var target = d.kg && d.targetKg && Math.abs(d.targetKg - d.kg) >= 0.5 ? (d.targetKg < d.kg ? '−' : '+') + kgShow(Math.abs(d.targetKg - d.kg)) + ' ' + wUnit() : 'Keep';
    return '<div class="ob"><div class="between"><div><p class="label" style="color:var(--sky-lo)">Done' + (d.name ? ', ' + esc(d.name) : '') + '</p><h1 class="ob-q">Your plan is ready</h1></div></div>' +
      '<div class="summary"><p class="label" style="color:var(--ink-d2)">About you</p><div class="trio"><div><b>' + (d.cm ? heightShow(d.cm).replace(' cm', '') : '–') + '</b><span>' + (S.settings.hunits === 'ft' ? 'Height' : 'Height, cm') + '</span></div>' +
      '<div><b>' + (d.kg ? kgShow(d.kg) : '–') + '</b><span>Weight, ' + wUnit() + '</span></div><div><b>' + (a || '–') + '</b><span>Age</span></div></div>' +
      (b ? '<div><div class="between"><span style="font-weight:800">BMI ' + b.toFixed(1) + '</span><span class="tag" style="color:var(--ink-d2);border-color:var(--paper-3)">' + bmiWord(b) + '</span></div><div class="bmi-bar"><i style="left:' + clamp((b - 15) / 25 * 100, 0, 100) + '%"></i></div></div>' : '') +
      '<div class="sum-row"><span>Goal</span><b>' + esc(WBF.GOALS[d.goal].name) + '</b></div>' +
      '<div class="sum-row"><span>Target weight</span><b>' + target + '</b></div>' +
      '<div class="sum-row"><span>Level</span><b>' + WBF.LEVELS[WBF.plan.levelFor(d)] + '</b></div>' +
      '<div class="sum-row"><span>Focus</span><b>' + esc(focusWords(d)) + '</b></div>' +
      ((d.injuries || []).length ? '<div class="sum-row"><span>Sore spots</span><b>' + d.injuries.map(function (x) { return WBF.SORE.filter(function (s) { return s[0] === x; })[0][1]; }).join(', ') + '<small>Moves that load them are left out</small></b></div>' : '') +
      (av.gentle ? '<div class="sum-row"><span>Health</span><b>Gentle mode<small>Until your doctor clears you</small></b></div>' : '') +
      (d.health && d.health.pregnant ? '<div class="sum-row"><span>Pregnancy</span><b>Pregnancy mode</b></div>' : '') + '</div>' +
      '<div class="summary"><p class="label" style="color:var(--ink-d2)">Plan overview</p><p class="h2" style="text-transform:uppercase">' + esc(planName(d)) + '</p>' +
      '<div class="trio"><div><b>' + train.length + '</b><span>Workouts</span></div><div><b>' + d.days + '</b><span>Days a week</span></div><div><b>' + minutes + '</b><span>Minutes</span></div></div>' +
      '<p style="margin:0;color:var(--ink-d2);font-size:14px">Four weeks: Foundation, Build, Push, Peak. Each week asks about 10% more, and your feedback after every session tunes it.</p></div>' +
      '<div class="ob-cta"><button class="btn dark block" data-act="ob-finish">Get my plan</button></div></div>';
  }

  // the ruler: a scrolling scale with a fixed needle
  function setupRuler(el) {
    var min = +el.getAttribute('data-min'), max = +el.getAttribute('data-max'), step = +el.getAttribute('data-step'), val = +el.getAttribute('data-val');
    var px = step < 1 ? 7 : 9, n = Math.round((max - min) / step), w = el.clientWidth || 340, dpr = Math.min(2, W.devicePixelRatio || 1);
    var cv = el.querySelector('canvas'), full = n * px + w;
    cv.width = Math.min(16000, full * dpr); cv.height = 86 * dpr; cv.style.width = full + 'px';
    var c = cv.getContext('2d');
    c.scale(dpr, dpr);
    c.font = '700 12px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#7A9183';
    var per = step < 1 ? 10 : step === 1 && max > 300 ? 10 : 10;
    for (var i = 0; i <= n; i++) {
      var x = w / 2 + i * px, v = min + i * step, major = i % per === 0, half = i % (per / 2) === 0;
      c.strokeStyle = major ? '#4A6455' : '#B9C7BF'; c.lineWidth = major ? 2 : 1.2;
      c.beginPath(); c.moveTo(x, 6); c.lineTo(x, major ? 40 : half ? 30 : 20); c.stroke();
      if (major) c.fillText(String(Math.round(v)), x, 60);
    }
    el.scrollLeft = (val - min) / step * px;
    var id = el.id.slice(3), out = $('#rv-' + id), t = null;
    function read() {
      var v = clamp(min + Math.round(el.scrollLeft / px) * step, min, max);
      v = Math.round(v * 10) / 10;
      if (out) out.innerHTML = v + '<small>' + out.querySelector('small').textContent + '</small>';
      el.setAttribute('aria-valuenow', v);
      rulerSet(id, v);
    }
    el.addEventListener('scroll', function () { read(); clearTimeout(t); t = setTimeout(function () { el.scrollTo({ left: Math.round(el.scrollLeft / px) * px, behavior: 'smooth' }); }, 140); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { el.scrollLeft += px; e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { el.scrollLeft -= px; e.preventDefault(); }
    });
    // drag with a mouse
    var x0 = null, s0 = 0;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = el.scrollLeft; try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    el.addEventListener('pointermove', function (e) { if (x0 != null) el.scrollLeft = s0 - (e.clientX - x0); });
    el.addEventListener('pointerup', function () { x0 = null; });
    read();
  }
  function rulerSet(id, v) {
    var d = draft;
    if (!d) return;
    if (id === 'h') { d.cm = S.settings.hunits === 'ft' ? v * 2.54 : v; }
    if (id === 'w') {
      d.kg = S.settings.units === 'lb' ? v / 2.20462 : v;
      var bx = $('#bmi-box'); if (bx) bx.innerHTML = bmiBox(d.kg, d.cm);
    }
    if (id === 't') {
      d.targetKg = S.settings.units === 'lb' ? v / 2.20462 : v;
      var tb = $('#tg-box'); if (tb) tb.innerHTML = targetBox(d) + weightChart(d);
    }
  }

  // ---- paywall --------------------------------------------------------------------------------
  SCREENS.pay = {
    title: function () { return 'Membership'; },
    html: function (p) {
      var sel = p.plan || 'year', ended = status() === 'ended', link = BILL.paymentLink;
      var planBtn = function (pl) {
        return '<button class="plan-opt" data-act="pay-plan" data-v="' + pl.id + '" aria-pressed="' + (sel === pl.id) + '">' + (pl.best ? '<span class="hot">Best value</span>' : '') +
          '<span><b>' + (ended ? pl.name : BILL.trialDays + '-day free trial, then ' + pl.name.toLowerCase()) + '</b><span>' + pl.price + ' a ' + pl.per + '</span></span><span class="pw">' + pl.perWeek + '<br>a week</span></button>';
      };
      return '<div class="ob"><div class="ob-top"><button class="icon-btn" data-act="pay-close" aria-label="Close">' + ic('close') + '</button><span class="grow"></span></div>' +
        '<div class="pay"><h1>' + (ended ? 'Keep training' : 'Get your personal plan') + '</h1>' +
        '<ul class="perks">' + ['A 28-day plan for your goal, level and time, adjusted after every session', Object.keys(EX).length + ' moves shown by a 3D coach, with Frank\'s cues and the why',
          'Workouts for every body part, plus Frank\'s programs', 'Progress, weight, walks, water and food in one place', 'Plans that leave out what your body shouldn\'t do'].map(function (t) { return '<li>' + ic('check') + t + '</li>'; }).join('') + '</ul>' +
        BILL.plans.map(planBtn).join('') +
        (link ? '<a class="btn dark block" href="' + esc(link) + '" target="_blank" rel="noopener">' + (ended ? 'Become a member' : 'Start my free trial') + '</a>'
              : (ended ? '<button class="btn dark block" disabled>Become a member</button><p class="fine">Payments aren\'t switched on in this preview yet.</p>'
                       : '<button class="btn dark block" data-act="pay-trial">Start my ' + BILL.trialDays + '-day free trial</button><p class="fine">No payment needed for the trial. Payments aren\'t switched on in this preview, so nothing is charged.</p>')) +
        '<button class="btn white block" data-act="join">I\'m one of Frank\'s clients</button>' +
        '<p class="fine">Prices shown are placeholders until Frank sets them. Cancel any time.</p></div></div>';
    }
  };

  // ---- plan (home) -------------------------------------------------------------------------------
  SCREENS.plan = {
    title: function () { return 'Plan'; },
    html: function () {
      var now = new Date(), p = S.profile;
      var top = '<div class="hello"><div class="stack tight"><span class="wordmark">Wellness by Frank</span><span class="meta">' + esc(fmtLong.format(now)) + '</span></div>' +
        '<button class="avatar" data-act="tab" data-tab="me" aria-label="Me">' + esc(((p && p.name) || 'F').charAt(0).toUpperCase()) + '</button></div>';
      var fromFrank = S.inbox.length ? frankCard() : '';
      if (!p) {
        return '<div class="screen">' + top + fromFrank + '<div class="plan-card"><div class="pc-media is3d">' + figHtml('squat', { deco: true, note: false }) + '<span class="pc-badge">Free for ' + BILL.trialDays + ' days</span></div>' +
          '<div class="pc-body"><h2 class="pc-title">Your 28-day plan</h2><p class="lead">A few questions about your goal, body and time. Then every session is ready to press play.</p>' +
          '<button class="btn block" data-act="ob-start">Get my plan</button></div></div>' + quickRail() + lessonCard() + '</div>';
      }
      var nd = nextDay(), days = planDays(), trainN = days.filter(function (d) { return d.train; }).length;
      var doneN = days.filter(function (d) { return d.train && S.done[d.day]; }).length;
      var hero;
      if (nd) {
        var s = session(nd.workoutId, nd);
        hero = '<div class="plan-card"><div class="pc-media is3d">' + figHtml(firstMove(s), { deco: true, note: false }) + '<span class="pc-badge">Built for you</span></div>' +
          '<div class="pc-body"><h2 class="pc-title">' + esc(planName(p)) + '</h2>' +
          '<div class="pc-grid"><div>' + ic('clock') + '<span><b>' + p.minutes + ' min</b><span>Daily time</span></span></div>' +
          '<div>' + ic('bars') + '<span><b>' + WBF.LEVELS[s.level] + '</b><span>Level</span></span></div>' +
          '<div>' + ic('target') + '<span><b>' + esc(focusWords(p)) + '</b><span>Focus</span></span></div>' +
          '<div>' + ic('db') + '<span><b>' + esc(kitWords(p)) + '</b><span>Equipment</span></span></div></div>' +
          '<div class="progress-line"><div class="between"><span class="meta">Day ' + nd.day + ' · ' + esc(s.title) + '</span><span class="meta">' + doneN + '/' + trainN + ' done</span></div><div class="bar"><i style="width:' + (doneN / trainN * 100) + '%"></i></div></div>' +
          '<div class="rowx"><button class="btn grow" data-act="start-day" data-day="' + nd.day + '">Start day ' + nd.day + '</button><button class="btn two small" data-act="open-day" data-day="' + nd.day + '" aria-label="Details">' + ic('info') + '</button></div></div></div>';
      } else {
        hero = '<div class="plan-card"><div class="pc-body"><span class="pc-badge" style="position:static;align-self:flex-start">Plan complete</span><h2 class="pc-title">Four weeks done</h2>' +
          '<p class="lead">' + plural(doneN, 'workout') + ' finished. The next block starts a step harder.</p>' +
          '<button class="btn block" data-act="next-round">Start the next 28 days</button>' +
          '<a class="btn two block" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Plan the next step with Frank</a></div></div>';
      }
      // the four weeks at a glance, then this week's days
      var grid = '';
      for (var w = 0; w < 4; w++) {
        var wk = days.slice(w * 7, w * 7 + 7), wTrain = wk.filter(function (d) { return d.train; }), wDone = wTrain.filter(function (d) { return S.done[d.day]; }).length;
        grid += '<div class="wk"><div class="wk-h"><b>Week ' + (w + 1) + '</b><span>' + esc(WBF.STAGES[w].name) + '</span><span class="meta">' + wDone + '/' + wTrain.length + '</span></div><div class="wk-days">' +
          wk.map(function (d) {
            if (!d.train) return '<span class="dd rest" title="Day ' + d.day + ': rest">' + ic('walk') + '</span>';
            var done = !!S.done[d.day], isNext = nd && nd.day === d.day;
            return '<button class="dd' + (done ? ' done' : '') + (isNext ? ' next' : '') + '" data-act="open-day" data-day="' + d.day + '" aria-label="Day ' + d.day + (done ? ', done' : isNext ? ', next' : '') + '">' + (done ? ic('check') : d.day) + '</button>';
          }).join('') + '<span class="dd cup' + (wTrain.length && wDone === wTrain.length ? ' on' : '') + '" aria-hidden="true">' + ic('trophy') + '</span></div></div>';
      }
      var cw = nd ? nd.week - 1 : 3, wkDays = days.slice(cw * 7, cw * 7 + 7), Sg = WBF.STAGES[cw];
      var thisWeek = '<section class="stage"><div class="stage-head"><span class="n">' + (cw + 1) + '</span><div class="grow"><b>Week ' + (cw + 1) + ': ' + esc(Sg.name) + '</b><span>' + esc(Sg.line) + '</span></div></div><div class="days">' +
        wkDays.map(function (d) {
          if (!d.train) return '<div class="day-card rest"><span class="state">' + ic('walk') + '</span><span class="grow"><b style="font-size:15px">Day ' + d.day + ': rest</b><span>A 20 to 30 minute walk counts toward your week</span></span></div>';
          var ss = session(d.workoutId, d), done = !!S.done[d.day], isNext = nd && nd.day === d.day;
          var kc = kcalOf(ss);
          return '<button class="day-card' + (done ? ' done' : '') + (isNext ? ' next' : '') + '" data-act="open-day" data-day="' + d.day + '">' + thumbHtml(firstMove(ss)) +
            '<span class="grow"><b>Day ' + d.day + '</b><span>' + esc(ss.title) + ' · ' + mins(ss.estSec) + (kc ? ' · ' + kc + ' kcal est.' : '') + '</span></span>' +
            '<span class="state">' + (done ? ic('check') : isNext ? ic('play') : '') + '</span></button>';
        }).join('') + '</div></section>';
      return '<div class="screen">' + top + fromFrank + hero + quickBodies() +
        '<section class="stack"><div class="sec-head"><h2 class="h2">Your 28 days</h2><span class="meta">Round ' + (p.round || 1) + ' · ' + doneN + '/' + trainN + ' done</span></div><div class="month">' + grid + '</div></section>' +
        thisWeek +
        lessonCard() + quickRail() + '</div>';
    }
  };
  function quickBodies() {
    return '<section class="stack"><div class="sec-head"><h2 class="h2">Quick start</h2><button class="link" data-act="tab" data-tab="workouts">All workouts</button></div><div class="chips">' +
      WBF.BODY.map(function (b) { return '<button class="chip" data-act="body-go" data-v="' + b.id + '">' + esc(b.name) + '</button>'; }).join('') + '</div></section>';
  }
  function frankCard() {
    var pending = S.inbox.filter(function (x) { return !S.inboxDone[x.i]; });
    var sp = pending[0] || S.inbox[0], s = WBF.plan.custom(sp);
    var done = !!S.inboxDone[sp.i];
    return '<div class="plan-card"><div class="pc-media is3d">' + figHtml(firstMove(s), { deco: true, note: false }) + '<span class="pc-badge">From Frank' + (done ? ' · done' : '') + '</span></div><div class="pc-body">' +
      '<h2 class="pc-title" style="font-size:24px">' + esc(s.title) + '</h2><p class="meta">' + esc(fmtShort.format(fromIso(sp.d))) + ' · ' + metaLine(s) + '</p>' +
      (sp.n ? '<p class="note s">' + esc(sp.n) + '</p>' : '') +
      '<div class="rowx"><button class="btn grow" data-act="start-coach" data-id="' + sp.i + '">' + ic('play') + (done ? 'Do it again' : 'Start') + '</button>' +
      '<button class="btn two small" data-act="open-coach" data-id="' + sp.i + '" aria-label="Details">' + ic('info') + '</button></div>' +
      (S.inbox.length > 1 ? '<button class="link" data-act="inbox">All sessions from Frank (' + S.inbox.length + ')</button>' : '') + '</div></div>';
  }
  function lessonCard() {
    var n = Math.floor((Date.now() - new Date(2026, 0, 1).getTime()) / 864e5);
    var L = WBF.LESSONS[((n % WBF.LESSONS.length) + WBF.LESSONS.length) % WBF.LESSONS.length];
    return '<div class="card lesson"><p class="label">Frank\'s lesson of the day</p><p class="note">' + esc(L) + '</p>' +
      '<svg class="doodle" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 34c10-3 19-12 22-24"/><path d="M24 12l6-3 2 6"/></svg></div>';
  }
  function quickRail() {
    return '<section class="stack"><h2 class="h2">Short sessions</h2><div class="rail">' +
      ['wake-up', 'desk-reset', 'back-care', 'evening', 'mobility'].map(function (id) {
        var s = session(id);
        return '<button class="mini" data-act="open-workout" data-id="' + id + '">' + thumbHtml(firstMove(s)) + '<b>' + esc(s.title) + '</b><span class="meta">' + mins(s.estSec) + '</span></button>';
      }).join('') + '</div></section>';
  }

  // ---- workouts: the catalogue ----------------------------------------------------------------
  function bodyIcon(b) {
    return '<span class="bi">' + (use3d() ? mapImg({ p: b.mus.slice(0, 3), s: b.mus.slice(3) }, 'front', 62, 124).replace('<img ', '<img style="width:100%;height:auto" ') : ic(b.id === 'cardio' ? 'heart' : b.id === 'stretch' ? 'leaf' : 'target')) + '</span>';
  }
  function workoutCard(id) {
    var s = session(id), w = WBF.WORKOUT[id], lv = { b: 1, i: 2, a: 3 }[s.level] || 1;
    var kc = kcalOf(s);
    return '<button class="wo-card" data-act="open-workout" data-id="' + id + '">' + thumbHtml(firstMove(s)) + '<span class="grow"><b>' + esc(w.kind === 'area' ? s.title + ' · ' + WBF.LEVELS[s.level] : s.title) + '</b>' +
      '<span>' + mins(s.estSec) + ' · ' + plural(mainMoves(s).length, 'move') + (kc ? ' · ' + kc + ' kcal est.' : '') + '</span>' +
      (w.kind === 'area' ? '<span class="lv" aria-label="' + WBF.LEVELS[s.level] + '">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= lv ? 'on' : '') + '"></i>'; }).join('') + '</span>' : '<span class="meta">' + esc(w.blurb || '') + '</span>') + '</span></button>';
  }
  SCREENS.workouts = {
    title: function () { return 'Workouts'; },
    html: function (p) {
      var body = p.body || (S.profile && (S.profile.focus || [])[0]) || 'full';
      if (!WBF.BODY_BY_ID[body]) body = 'full';
      var lvl = p.lvl || 'all', dur = p.dur || 'any';
      var ids = WBF.WORKOUTS.filter(function (w) {
        if (body === 'stretch') return w.kind === 'quick';
        return w.kind === 'area' && w.area === body;
      }).map(function (w) { return w.id; }).filter(function (id) {
        var w = WBF.WORKOUT[id];
        if (lvl !== 'all' && w.level && w.level !== lvl) return false;
        if (dur !== 'any') {
          var m = session(id).estSec / 60;
          if (dur === 's' && m > 10.5) return false;
          if (dur === 'm' && (m <= 10.5 || m > 20.5)) return false;
          if (dur === 'l' && m <= 20.5) return false;
        }
        return true;
      });
      var progs = WBF.WORKOUTS.filter(function (w) { return w.kind === 'program'; }).map(function (w) {
        var s = session(w.id);
        return '<button class="prog" data-act="open-workout" data-id="' + w.id + '"><img src="' + img(w.img) + '" alt="' + esc(w.phrase) + '">' +
          '<span class="cap"><b class="display m">' + esc(w.title) + '</b><span class="meta">' + metaLine(s) + '</span></span></button>';
      }).join('');
      return '<div class="screen"><h1 class="h1">Workouts</h1>' +
        '<div class="search">' + ic('search') + '<label for="wq" class="sr">Search workouts and moves</label><input class="input" id="wq" type="search" placeholder="Search workouts and moves" autocomplete="off"></div>' +
        '<div id="wq-results" hidden></div><div id="wq-main" class="stack loose">' +
        '<div class="body-grid" role="group" aria-label="Body part">' + WBF.BODY.map(function (b) {
          return '<button class="body-btn" data-act="body" data-v="' + b.id + '" aria-pressed="' + (b.id === body) + '">' + bodyIcon(b) + esc(b.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="stack tight"><div class="chips" role="group" aria-label="Level">' + [['all', 'All levels'], ['b', 'Beginner'], ['i', 'Intermediate'], ['a', 'Advanced']].map(function (x) {
          return '<button class="chip" data-act="wf" data-k="lvl" data-v="' + x[0] + '" aria-pressed="' + (lvl === x[0]) + '">' + x[1] + '</button>';
        }).join('') + '</div><div class="chips" role="group" aria-label="Length">' + [['any', 'Any length'], ['s', 'Up to 10 min'], ['m', '10 to 20 min'], ['l', 'Over 20 min']].map(function (x) {
          return '<button class="chip" data-act="wf" data-k="dur" data-v="' + x[0] + '" aria-pressed="' + (dur === x[0]) + '">' + x[1] + '</button>';
        }).join('') + '</div></div>' +
        '<section class="stack"><h2 class="h2">' + esc(WBF.BODY_BY_ID[body].name) + '</h2>' + (ids.length ? ids.map(workoutCard).join('') : '<p class="empty">Nothing matches. Try another length or level.</p>') + '</section>' +
        '<section class="stack"><h2 class="h2">Frank\'s programs</h2><div class="rail">' + progs + '</div></section>' +
        '<button class="wo-card" data-act="moves">' + thumbHtml('hip-hinge') + '<span class="grow"><b>Exercise library</b><span>' + Object.keys(EX).length + ' moves with how-to, muscles and the why</span></span>' + ic('chev', 'chev') + '</button>' +
        '</div></div>';
    },
    mount: function () {
      var input = $('#wq'), res = $('#wq-results'), main = $('#wq-main');
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        if (!q) { res.hidden = true; main.hidden = false; return; }
        var ws = WBF.WORKOUTS.filter(function (w) { return w.kind !== 'area' || ['lower', 'upper', 'core'].indexOf(w.area) === -1; }).filter(function (w) {
          return (w.title + ' ' + (w.blurb || '') + ' ' + (WBF.BODY_BY_ID[w.area] ? WBF.BODY_BY_ID[w.area].name : '')).toLowerCase().indexOf(q) !== -1;
        }).slice(0, 8);
        var ms = Object.keys(EX).filter(function (id) { return (EX[id].name + ' ' + EX[id].pattern + ' ' + ((EX[id].mus || {}).p || []).join(' ')).toLowerCase().indexOf(q) !== -1; }).slice(0, 12);
        res.innerHTML = '<div class="stack">' + (ws.length ? '<h2 class="h2">Workouts</h2>' + ws.map(function (w) { return workoutCard(w.id); }).join('') : '') +
          (ms.length ? '<h2 class="h2">Moves</h2><div class="list">' + ms.map(function (id) {
            return '<button class="item" data-act="ex" data-id="' + id + '">' + thumbHtml(id) + '<span class="grow"><b>' + esc(EX[id].name) + '</b><span class="meta">' + esc(EX[id].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + '</span></span>' + ic('chev', 'chev') + '</button>';
          }).join('') + '</div>' : '') + (!ws.length && !ms.length ? '<p class="empty">No workouts or moves match "' + esc(input.value) + '".</p>' : '') + '</div>';
        res.hidden = false; main.hidden = true;
        mountFigures(res);
      });
    }
  };

  SCREENS.moves = {
    title: function () { return 'Exercise library'; },
    html: function (p) {
      var a = p.area || 'all';
      var chips = ['all', 'core', 'lower', 'upper', 'cardio', 'mobility'].map(function (x) {
        return '<button class="chip" data-act="moves-area" data-area="' + x + '" aria-pressed="' + (x === a) + '">' + (x === 'all' ? 'All' : WBF.AREAS[x]) + '</button>';
      }).join('');
      return '<div class="screen bare">' + backBar('Exercise library') +
        '<div class="search">' + ic('search') + '<label for="q" class="sr">Search moves</label><input class="input" id="q" type="search" placeholder="Search moves" autocomplete="off" value="' + esc(p.q || '') + '"></div>' +
        '<div class="chips" role="group" aria-label="Filter by area">' + chips + '</div>' +
        '<div class="list" id="move-list"></div></div>';
    },
    mount: function (p) {
      var input = $('#q'), list = $('#move-list');
      function fill() {
        var q = (input.value || '').trim().toLowerCase(), a = p.area || 'all';
        p.q = input.value;
        var ids = Object.keys(EX).filter(function (id) {
          var e = EX[id];
          return (a === 'all' || e.area.indexOf(a) !== -1) && (!q || e.name.toLowerCase().indexOf(q) !== -1 || e.pattern.indexOf(q) !== -1);
        }).sort(function (x, y) { return EX[x].name.localeCompare(EX[y].name); });
        list.innerHTML = ids.length ? ids.map(function (id, i) {
          var e = EX[id];
          return '<button class="item" data-act="ex-list" data-i="' + i + '">' + thumbHtml(id) + '<span class="grow"><b>' + esc(e.name) + '</b><span class="meta">' +
            esc(((e.mus || {}).p || []).map(function (m) { return MUS_NAME[m] || m; }).join(' · ')) + '</span></span>' + ic('chev', 'chev') + '</button>';
        }).join('') : '<p class="empty">No moves match "' + esc(q) + '".</p>';
        list._ids = ids;
        mountFigures(list);
      }
      input.addEventListener('input', fill);
      fill();
    }
  };

  // ---- workout detail ---------------------------------------------------------------------------
  function sessionFor(p) {
    var days = planDays(), day = p.day ? days[p.day - 1] : null;
    var wid = day ? day.workoutId : p.id;
    var s = p.coach ? frankSession(p.coach) : session(wid, day);
    return { s: s, day: day, wid: wid };
  }
  function uniqueSteps(s, block) {
    var seen = {};
    return s.steps.filter(function (st) {
      if (st.block !== block || st.side === 2) return false;
      var k = st.ex + '|' + st.side; if (seen[k]) return false; seen[k] = 1; return true;
    });
  }
  SCREENS.workout = {
    title: function (p) { var w = WBF.WORKOUT[p.id]; return w ? w.title : 'Workout'; },
    html: function (p) {
      var o = sessionFor(p), s = o.s, day = o.day, wid = o.wid, w = WBF.WORKOUT[wid];
      if (!s) return '<div class="screen bare">' + backBar('Workout') + '<p class="lead">This session is no longer on this phone.</p></div>';
      if (p.coach) w = { kind: 'coach', title: s.title, blurb: '' };
      var all = [];
      var blocks = [['warm', 'Warm-up'], ['main', 'Workout'], ['focus', 'Your focus'], ['cool', 'Cool-down']].map(function (b) {
        var rows = uniqueSteps(s, b[0]);
        if (!rows.length) return '';
        var start = all.length;
        rows.forEach(function (st) { all.push({ ex: st.ex, dose: st.dose }); });
        return '<section class="stack tight"><div class="block-title"><h2 class="h2">' + b[1] + '<small>' + rows.length + (b[0] === 'main' && s.rounds > 1 ? ' · ' + s.rounds + (s.coach && s.coach.f === 's' ? ' sets' : ' rounds') : '') + '</small></h2></div><div class="list">' +
          rows.map(function (st, k) {
            var canSwap = (b[0] === 'main' || b[0] === 'focus') && !p.coach;
            return '<div class="move-row"><button class="grow" data-act="ex-wo" data-i="' + (start + k) + '">' + thumbHtml(st.ex) +
              '<span class="grow"><b>' + esc(EX[st.ex].name) + '</b><span class="dose">' + doseText(st) + '</span></span></button>' +
              (canSwap ? '<button class="icon-btn swap-btn" data-act="swap" data-from="' + st.orig + '" data-cur="' + st.ex + '" aria-label="Swap ' + esc(EX[st.ex].name) + '">' + ic('swap') + '</button>' : '') + '</div>';
          }).join('') + '</div></section>';
      }).join('');
      SCREENS.workout._list = all;
      var kitNeeded = {};
      s.steps.forEach(function (st) { (EX[st.ex].eq || []).forEach(function (k) { kitNeeded[k] = 1; }); });
      var kitNames = Object.keys(kitNeeded).map(function (k) {
        if (k === 'load') return 'Something heavy to carry';
        var m = WBF.KIT.filter(function (x) { return x.id === k; })[0]; return m ? m.name : k;
      });
      var kc = kcalOf(s), mus = WBF.plan.musclesOf(s);
      var label = p.coach ? 'From Frank' : day ? 'Day ' + day.day + ' · Week ' + day.week : w.kind === 'program' ? 'Frank\'s program' : w.kind === 'quick' ? 'Short session' : (WBF.BODY_BY_ID[w.area] || {}).name || '';
      var hero = w.img ? '<img src="' + img(w.img) + '" alt="' + esc(w.phrase) + '">' : figHtml(firstMove(s), { deco: true, note: false, cls: 'is3d' });
      return '<div class="screen bare"><div class="wd-media">' + hero + '<div class="top-bar"><button class="icon-btn glass" data-act="back" aria-label="Back">' + ic('back') + '</button>' +
        '<button class="icon-btn glass" data-act="settings" aria-label="Workout settings">' + ic('gear') + '</button></div></div>' +
        '<div class="stack"><p class="label">' + esc(label) + '</p><h1 class="wd-title">' + esc(s.title) + '</h1>' +
        '<div class="facts"><span>' + ic('clock') + mins(s.estSec) + '</span>' + (kc ? '<span>' + ic('flame') + kc + ' kcal est.</span>' : '') + '<span>' + ic('bars') + WBF.LEVELS[s.level] + '</span></div>' +
        (w.blurb ? '<p class="lead">' + esc(w.blurb) + '</p>' : '') +
        (p.coach && s.coach.n ? '<div class="card"><p class="label">Note from Frank</p><p class="note s">' + esc(s.coach.n) + '</p></div>' : '') +
        '<div class="kit-line">' + (kitNames.length ? kitNames.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') : '<span class="tag">No equipment</span>') + '</div></div>' +
        (mus.p.length ? '<section class="stack"><p class="label">Focus area</p><div class="focus-row">' + focusMaps(mus, 64, 128) + musChips(mus, 8) + '</div></section>' : '') +
        blocks +
        (p.coach ? '' : '<button class="link" data-act="science">' + ic('info') + 'Why this workout works</button>') +
        '<div class="dock"><div class="dock-in">' + (p.coach ? '<button class="btn block" data-act="start-coach" data-id="' + esc(p.coach) + '">' + ic('play') + 'Start</button>'
          : '<button class="btn block" data-act="start" data-id="' + wid + '" data-day="' + (day ? day.day : '') + '">' + ic('play') + 'Start</button>') + '</div></div></div>';
    }
  };

  // ---- the player -------------------------------------------------------------------------------
  var PL = null, timer = null;
  function now() { return (W.performance && performance.now()) || Date.now(); }
  function timed(st) { return EX[st.ex].type === 'time'; }

  // members' workouts need the trial or a membership; Frank's sessions are open to his clients
  function begin(s) {
    if (!s) return;
    if (!mayTrain(s)) { go('pay', {}); return; }
    startSession(s);
  }
  function startSession(s) {
    SND.prime();
    closeOverlay();
    PL = { s: s, i: 0, phase: 'ready', left: +S.settings.ready || 15, len: +S.settings.ready || 15, elapsed: 0, last: now(),
           paused: false, did: {}, cueAt: 0, cueI: 0, half: false };
    cur().scroll = W.scrollY;
    stack.push({ name: 'player', params: {} });
    pushState();
    render(true);
    SND.awake(true);
    var f = s.steps[0];
    speak('Get ready. ' + EX[f.ex].name + ', ' + spokenDose(f) + '.');
    clearInterval(timer);
    timer = setInterval(tick, 200);
  }
  function speak(t) { if (S.settings.voice) SND.say(t); }
  function beep(kind) { if (S.settings.sound) SND[kind](); }
  function buzz(p) { if (S.settings.vibrate) SND.buzz(p); }
  function spokenDose(st) {
    var ex = EX[st.ex];
    if (ex.type === 'time') return st.dose + ' seconds' + (st.side === 1 ? ', first side' : st.side === 2 ? ', second side' : '');
    return st.dose + ' reps' + (st.side === 3 ? ' each side' : '');
  }
  function tick() {
    if (!PL) return;
    var t = now(), dt = Math.min(1, (t - PL.last) / 1000);
    PL.last = t;
    if (PL.paused) return;
    PL.elapsed += dt;
    var st = PL.s.steps[PL.i];
    if (PL.phase === 'move' && !timed(st)) { PL.left += dt; live(); return; }
    var before = Math.ceil(PL.left);
    PL.left -= dt;
    var after = Math.ceil(PL.left);
    if (after !== before && after > 0 && after <= 3) { beep('tick'); }
    if (PL.phase === 'move' && !PL.half && PL.len >= 20 && PL.left <= PL.len / 2) { PL.half = true; speak('Halfway.'); }
    if (PL.left <= 0) advance();
    else live();
  }
  function enterMove(i) {
    PL.i = i; PL.phase = 'move'; PL.half = false; PL.cueI = 0; PL.cueAt = PL.elapsed;
    var st = PL.s.steps[i];
    PL.len = timed(st) ? st.dose : 0;
    PL.left = timed(st) ? st.dose : 0;
    beep('go'); buzz(120);
    speak(EX[st.ex].name + '. ' + spokenDose(st) + '.');
    paintPlayer();
  }
  function afterMove() {
    PL.did[PL.i] = true;
    var i = PL.i, s = PL.s;
    if (i >= s.steps.length - 1) { finish(true); return; }
    var r = WBF.plan.restAfter(s, i), a = s.steps[i], b = s.steps[i + 1];
    PL.phase = (a.side === 1 && b.side === 2 && a.ex === b.ex) ? 'switch' : 'rest';
    PL.left = PL.len = r;
    beep('soft'); buzz([60, 60, 60]);
    speak(PL.phase === 'switch' ? 'Switch sides.' : 'Rest. Next: ' + EX[b.ex].name + '.');
    paintPlayer();
  }
  function advance() {
    if (PL.phase === 'ready') enterMove(0);
    else if (PL.phase === 'move') afterMove();
    else enterMove(PL.i + 1);
  }
  function live() {
    if (!PL) return;
    var clock = $('#pl-clock'); if (clock) clock.textContent = mmss(PL.elapsed);
    var st = PL.s.steps[PL.i];
    var count = $('#pl-count');
    if (count) {
      if (PL.phase === 'move' && !timed(st)) { /* reps: nothing counts down */ }
      else count.textContent = PL.phase === 'move' ? mmss(Math.ceil(PL.left)) : String(Math.max(0, Math.ceil(PL.left)));
    }
    var bar = $('#pl-bar');
    if (bar && PL.len) bar.style.width = Math.min(100, (1 - PL.left / PL.len) * 100) + '%';
    var ring = $('#pl-ring');
    if (ring && PL.len) ring.style.strokeDashoffset = String(565.5 * (1 - Math.max(0, PL.left) / PL.len));
    var cue = $('#pl-cue');
    if (cue && PL.phase === 'move' && PL.elapsed - PL.cueAt > 5) {
      var cues = EX[st.ex].cue;
      PL.cueI = (PL.cueI + 1) % cues.length; PL.cueAt = PL.elapsed;
      cue.textContent = cues[PL.cueI];
    }
  }
  function segs() {
    var s = PL.s, out = '';
    for (var i = 0; i < s.steps.length; i++) out += '<i class="' + (PL.did[i] ? 'on' : i === PL.i && PL.phase === 'move' ? 'now' : '') + '"></i>';
    return out;
  }
  function blockLabel(st) {
    if (st.block === 'warm') return 'Warm-up';
    if (st.block === 'cool') return 'Cool-down';
    if (st.block === 'focus') return 'Your focus';
    return st.rounds > 1 ? (PL && PL.s.coach && PL.s.coach.f === 's' ? 'Set ' : 'Round ') + st.round + ' of ' + st.rounds : 'Workout';
  }
  function paintPlayer() {
    if (!PL || cur().name !== 'player') return;
    app.innerHTML = SCREENS.player.html();
    mountFigures(app);
    live();
  }
  SCREENS.player = {
    title: function () { return 'Workout'; },
    html: function () {
      if (!PL) return '<div class="screen"><p class="lead">No workout running.</p><button class="btn" data-act="tab" data-tab="plan">Back to your plan</button></div>';
      var s = PL.s, st = s.steps[PL.i], ex = EX[st.ex];
      var top = '<div class="pl-top"><button class="icon-btn" data-act="quit" aria-label="End workout">' + ic('close') + '</button>' +
        '<div class="pl-segs" aria-hidden="true">' + segs() + '</div><span class="pl-clock" id="pl-clock">' + mmss(PL.elapsed) + '</span>' +
        '<button class="icon-btn" data-act="settings" aria-label="Workout settings">' + ic('gear') + '</button></div>';
      if (PL.phase === 'ready' || PL.phase === 'rest' || PL.phase === 'switch') {
        var nx = PL.phase === 'ready' ? st : s.steps[PL.i + 1];
        var nxi = PL.phase === 'ready' ? 0 : PL.i + 1;
        var title = PL.phase === 'ready' ? 'Ready to go' : PL.phase === 'switch' ? 'Switch sides' : 'Rest';
        return '<div class="player">' + top + '<div class="pl-rest">' +
          '<p class="label" style="text-align:center">' + title + '</p>' +
          '<div class="ring-wrap"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="track" cx="100" cy="100" r="90"/><circle class="fill" id="pl-ring" cx="100" cy="100" r="90" stroke-dasharray="565.5" stroke-dashoffset="0"/></svg>' +
          '<span class="pl-big" id="pl-count" role="timer">' + Math.ceil(PL.left) + '</span></div>' +
          '<div class="rowx" style="justify-content:center">' + (PL.phase === 'rest' ? '<button class="btn two small" data-act="pl-more">+20 s</button>' : '') +
          '<button class="btn small" data-act="pl-skip">' + (PL.phase === 'ready' ? 'Start' : 'Skip') + '</button></div>' +
          '<div class="pl-next"><div class="between"><p class="label">' + (PL.phase === 'ready' ? 'First' : 'Next') + '</p><span class="meta num">' + (nxi + 1) + ' / ' + s.steps.length + '</span></div>' +
          '<div class="pl-next-fig" data-fig="' + nx.ex + '" data-note="0"' + (nx.side === 2 ? ' data-flip="1"' : '') + '></div>' +
          '<div class="between"><p class="h2" style="font-size:18px">' + esc(EX[nx.ex].name) + '</p><p class="dose">' + doseText(nx) + (nx.side === 2 ? ' · side 2' : '') + '</p></div></div>' +
          '</div></div>';
      }
      var isT = timed(st);
      var side = st.side === 1 ? 'First side' : st.side === 2 ? 'Second side' : st.side === 3 ? 'Each side' : '';
      var nxt = s.steps[PL.i + 1];
      return '<div class="player">' + top + '<div class="pl-body">' +
        '<div class="pl-media"><div class="pl-fig" data-drag="1" data-fig="' + st.ex + '"' + (st.side === 2 ? ' data-flip="1"' : '') + '></div>' +
        '<button class="howto" data-act="pl-how">' + ic('info') + 'How to</button>' +
        '<button class="icon-btn glass turn" data-act="turn" data-turn="1" aria-label="Turn the figure" hidden>' + ic('turn') + '</button></div>' +
        '<div class="pl-name"><h1>' + esc(ex.name) + '</h1><span class="meta num">' + (PL.i + 1) + '/' + s.steps.length + '</span></div>' +
        '<p class="label dim">' + blockLabel(st) + (side ? ' · ' + side : '') + '</p>' +
        (isT ? '<div class="stack tight"><span class="pl-big" id="pl-count" role="timer">' + mmss(Math.ceil(PL.left)) + '</span><div class="pl-bar"><i id="pl-bar"></i></div></div>'
             : '<span class="pl-big"><small>×</small>' + st.dose + '</span>') +
        '<p class="note s pl-cue" id="pl-cue" aria-live="polite">' + esc(ex.cue[0]) + '</p>' +
        '<div class="pl-ctrl"><button class="icon-btn ring" data-act="pl-prev" aria-label="Previous move"' + (PL.i === 0 ? ' disabled' : '') + '>' + ic('prev') + '</button>' +
        (isT ? '<button class="pl-main" data-act="pl-pause" aria-label="' + (PL.paused ? 'Resume' : 'Pause') + '">' + ic(PL.paused ? 'play' : 'pause') + '</button>'
             : '<button class="pl-main" data-act="pl-done" aria-label="Done">' + ic('check') + '</button>') +
        '<button class="icon-btn ring" data-act="pl-next" aria-label="Skip this move">' + ic('next') + '</button></div>' +
        (nxt ? '<div class="pl-upnext">' + thumbHtml(nxt.ex) + '<span class="grow"><span class="meta">Next</span><br><b>' + esc(EX[nxt.ex].name) + '</b></span><span class="dose">' + doseText(nxt) + '</span></div>' : '') +
        '</div></div>';
    }
  };
  function finish(complete) {
    if (!PL) return;
    clearInterval(timer); timer = null;
    SND.awake(false);
    var s = PL.s, didN = Object.keys(PL.did).length;
    var mainTotal = s.steps.filter(function (x) { return x.block === 'main'; }).length;
    var mainDid = s.steps.filter(function (x, i) { return x.block === 'main' && PL.did[i]; }).length;
    if (complete) { beep('go'); speak('Workout complete. Well done.'); }
    else SND.hush();
    var rec = null;
    if (didN > 0) {
      rec = { id: 's' + Date.now().toString(36), at: new Date().toISOString(), date: iso(), wid: s.wid, title: s.title, level: s.level,
              day: s.day || null, sec: Math.round(PL.elapsed), moves: didN, total: s.steps.length, feel: null, adj: 0, loads: {},
              kcal: kcalOf(s, PL.elapsed) };
      S.sessions.push(rec);
      if (s.day && mainDid >= Math.ceil(mainTotal / 2)) S.done[s.day] = rec.id;
      if (s.coach) { rec.coach = s.coach.i; if (mainDid >= Math.ceil(mainTotal / 2)) S.inboxDone[s.coach.i] = rec.id; }
      save();
    }
    PL = null;
    if (rec) { stack = [{ name: 'plan', params: {} }, { name: 'done', params: { id: rec.id } }]; render(true); }
    else tab('plan');
  }
  function askQuit() {
    if (!PL) return;
    var wasPaused = PL.paused;
    PL.paused = true; SND.hush();
    var any = Object.keys(PL.did).length > 0;
    confirmBox('End this workout?', any ? 'End and save' : 'End', function () { finish(false); }, {
      body: any ? 'What you have done so far is saved.' : 'Nothing is saved yet.',
      no: 'Keep going', onNo: function () { if (PL) { PL.paused = wasPaused; PL.last = now(); paintPlayer(); } }
    });
  }

  SCREENS.done = {
    title: function () { return 'Workout complete'; },
    html: function (p) {
      var rec = S.sessions.filter(function (r) { return r.id === p.id; })[0];
      if (!rec) return '<div class="screen"><button class="btn" data-act="tab" data-tab="plan">Back to your plan</button></div>';
      var w = WBF.WORKOUT[rec.wid];
      var loaded = {}, s0 = w ? session(rec.wid) : rec.coach ? frankSession(rec.coach) : null;
      if (s0) s0.steps.forEach(function (st) { if ((EX[st.ex].eq || []).indexOf('db') !== -1) loaded[st.ex] = 1; });
      var u = wUnit();
      var loads = Object.keys(loaded).map(function (id) {
        var v = rec.loads[id];
        return '<div class="set-row"><div><b>' + esc(EX[id].name) + '</b><span class="meta">Weight per dumbbell</span></div>' +
          '<input class="input" style="width:110px" id="load-' + id + '" inputmode="decimal" data-load="' + id + '" placeholder="' + u + '" value="' + (v ? esc(kgShow(v)) : '') + '" aria-label="' + esc(EX[id].name) + ' weight in ' + u + '"></div>';
      }).join('');
      var full = rec.moves >= rec.total;
      return '<div class="screen bare"><div class="rowx" style="justify-content:center;padding-top:10px"><div class="badge" aria-hidden="true">' + ic('trophy') + '</div></div>' +
        '<div class="stack tight" style="text-align:center"><p class="label">' + (full ? 'Workout complete' : 'Saved: ' + rec.moves + ' of ' + rec.total + ' moves') + '</p><h1 class="display xl">' + esc(rec.title) + '</h1>' +
        (rec.day ? '<p class="meta">Day ' + rec.day + (S.done[rec.day] === rec.id ? ' is ticked off your plan.' : ' stays open: finish half the main moves to tick it off.') + '</p>' : '') +
        (rec.coach ? '<p class="meta">' + (S.inboxDone[rec.coach] === rec.id ? 'Ticked off. Frank\'s next session will show up on your plan.' : 'Finish half the main moves to tick it off.') + '</p>' : '') + '</div>' +
        '<div class="stats"><div><b>' + mmss(rec.sec) + '</b><span>Time</span></div><div><b>' + rec.moves + '</b><span>Moves</span></div>' +
        '<div><b>' + (rec.kcal ? rec.kcal : '–') + '</b><span>' + (rec.kcal ? 'kcal, est.' : 'Add weight') + '</span></div></div>' +
        '<section class="stack"><h2 class="h2">How did that feel?</h2><div class="feel" role="group" aria-label="How did that feel?">' +
        [['easy', 'Too easy', '😌'], ['right', 'Just right', '💪'], ['hard', 'Too hard', '😮‍💨']].map(function (f) {
          return '<button data-act="feel" data-id="' + rec.id + '" data-v="' + f[0] + '" aria-pressed="' + (rec.feel === f[0]) + '"><span aria-hidden="true">' + f[2] + '</span>' + f[1] + '</button>';
        }).join('') + '</div><p class="meta">' + (rec.feel === 'easy' ? 'Next sessions get a little harder.' : rec.feel === 'hard' ? 'Next sessions get a little easier.' : rec.feel === 'right' ? 'Good. The plan keeps building at this pace.' : 'Your answer tunes the next sessions.') + '</p></section>' +
        (loads ? '<section class="stack tight"><h2 class="h2">Weights you used</h2>' + loads + '</section>' : '') +
        '<div class="card"><p class="note">Want this with Frank, in person?</p><p class="lead">He watches how you move and corrects one thing at a time.</p>' +
        '<a class="btn two block" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Message Frank</a></div>' +
        '<div class="dock"><div class="dock-in"><button class="btn block" data-act="tab" data-tab="plan">Done</button></div></div></div>';
    },
    mount: function (p) {
      $$('[data-load]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var rec = S.sessions.filter(function (r) { return r.id === p.id; })[0];
          if (!rec) return;
          var kg = toKg(inp.value);
          if (kg) rec.loads[inp.getAttribute('data-load')] = kg; else delete rec.loads[inp.getAttribute('data-load')];
          save(); toast('Saved');
        });
      });
    }
  };

  // ---- today ------------------------------------------------------------------------------------
  function flags() {
    if (!S.flags) {
      var h = (S.profile && S.profile.health) || {}, a = ageNow();
      S.flags = { pregnant: !!h.pregnant, child: a != null && a < 18, medical: false };
    }
    return S.flags;
  }
  function foodDay(d) {
    if (!S.food[d]) S.food[d] = { water: 0, meals: [] };
    return S.food[d];
  }
  SCREENS.today = {
    title: function () { return 'Today'; },
    html: function () {
      var today = iso(), mon = monday(new Date()), todays = sessionsOn(today);
      var strip = '';
      for (var i = 0; i < 7; i++) {
        var d = addDays(mon, i), di = iso(d), on = sessionsOn(di).length || (S.walks || {})[di];
        strip += '<div>' + 'MTWTFSS'.charAt(i) + '<i class="' + (on ? 'on' : '') + (di === today ? ' today' : '') + '">' + d.getDate() + '</i></div>';
      }
      var minToday = Math.round(todays.reduce(function (a, r) { return a + r.sec; }, 0) / 60 + ((S.walks || {})[today] || 0));
      var kcToday = todays.reduce(function (a, r) { return a + (r.kcal || 0); }, 0);
      var goalMin = (S.profile && S.profile.minutes) || 20;
      var nd = nextDay(), card = '';
      if (nd) {
        var s = session(nd.workoutId, nd);
        card = '<button class="wo-card" data-act="open-day" data-day="' + nd.day + '">' + thumbHtml(firstMove(s)) + '<span class="grow"><span class="label">Next in your plan</span><b>Day ' + nd.day + ': ' + esc(s.title) + '</b><span>' + mins(s.estSec) + '</span></span>' + ic('chev', 'chev') + '</button>';
      }
      return '<div class="screen"><div class="stack tight"><p class="label">' + esc(fmtLong.format(new Date())) + '</p><h1 class="h1">Today</h1></div>' +
        '<div class="week-strip" aria-label="This week">' + strip + '</div>' +
        '<div class="act-card"><div class="act"><b>' + minToday + '<small>/ ' + goalMin + ' min</small></b><span>Active today</span><div class="bar"><i style="width:' + Math.min(100, minToday / goalMin * 100) + '%"></i></div></div>' +
        '<div class="act"><b>' + kcToday + '<small>kcal</small></b><span>Burned in workouts, est.</span></div></div>' +
        (card || '<button class="btn block" data-act="tab" data-tab="workouts">Start a workout</button>') +
        movingCard() + waterCard() + foodCard() + lessonCard() + '</div>';
    }
  };
  // WHO 2020: 150 to 300 minutes of moderate activity a week; fat loss needs more, about 250
  function movingCard() {
    var wkIso = iso(monday(new Date())), train = 0, walk = 0;
    S.sessions.forEach(function (r) { if (r.date >= wkIso) train += r.sec / 60; });
    Object.keys(S.walks || {}).forEach(function (d) { if (d >= wkIso) walk += S.walks[d]; });
    var goal = S.profile && S.profile.goal === 'fat' ? 250 : 150;
    var total = Math.round(train + walk), pct = Math.min(100, total / goal * 100);
    var todayWalk = (S.walks || {})[iso()] || 0;
    return '<section class="card"><div class="between"><p class="label">Moving minutes this week</p><p class="meta num">' + total + ' of ' + goal + '</p></div>' +
      '<div class="bar" role="img" aria-label="' + total + ' of ' + goal + ' minutes"><i style="width:' + pct + '%"></i></div>' +
      '<p class="small">Workouts ' + Math.round(train) + ' min · walks and other activity ' + Math.round(walk) + ' min. ' + (goal === 250 ? 'For fat loss, aim for about 250 minutes; brisk walking counts.' : 'The WHO advises 150 to 300 minutes a week; brisk walking counts.') + '</p>' +
      '<div class="rowx wrap"><span class="meta">Add activity' + (todayWalk ? ' (' + todayWalk + ' min today)' : '') + ':</span>' +
      [10, 20, 30].map(function (m) { return '<button class="toggle" data-act="walk" data-m="' + m + '">+' + m + ' min</button>'; }).join('') +
      (todayWalk ? '<button class="toggle" data-act="walk" data-m="0">Clear</button>' : '') + '</div></section>';
  }
  function waterCard() {
    var fd = foodDay(iso()), glasses = '';
    for (var g = 1; g <= 8; g++) glasses += '<button class="glass" data-act="water" data-n="' + g + '" aria-pressed="' + (fd.water >= g) + '" aria-label="' + g + ' glass' + (g > 1 ? 'es' : '') + '">' + ic('glass') + '</button>';
    return '<section class="card"><div class="between"><p class="label">Water</p><p class="meta num">' + fd.water + ' of 8 glasses</p></div><div class="glasses">' + glasses + '</div></section>';
  }
  function foodCard() {
    var f = flags(), any = f.pregnant || f.child || f.medical;
    var flagBox = '<details class="card"' + (any ? ' open' : '') + '><summary class="label" style="cursor:pointer;min-height:24px">Before you track food</summary>' +
      '<p class="small">Tick any that apply. They change what this card shows.</p><div class="stack tight">' +
      [['pregnant', 'Pregnant or breastfeeding'], ['child', 'Under 18'], ['medical', 'A medical condition that affects what I eat']].map(function (x) {
        return '<div class="set-row"><div><b>' + x[1] + '</b></div><button class="switch" role="switch" data-act="flag" data-k="' + x[0] + '" aria-checked="' + !!f[x[0]] + '" aria-label="' + x[1] + '"></button></div>';
      }).join('') + '</div></details>';
    if (any) {
      return '<div class="card"><p class="label">Food</p><p class="note s">For a diet or a medical question, talk to a dietitian or your doctor first.</p>' +
        '<p class="small">Food needs are different in pregnancy, while growing up, and with some conditions. A plan for that should come from someone who knows your health.</p></div>' + flagBox;
    }
    var fd = foodDay(iso());
    var meals = fd.meals.map(function (m, i) {
      return '<div class="meal"><div class="meal-top"><span class="meta num">' + esc(m.t) + '</span><b>' + esc(m.text) + '</b>' +
        '<button class="icon-btn" data-act="meal-del" data-i="' + i + '" aria-label="Remove ' + esc(m.text) + '">' + ic('close') + '</button></div>' +
        '<div class="toggles"><button class="toggle" data-act="meal-tag" data-i="' + i + '" data-k="protein" aria-pressed="' + !!m.protein + '">' + ic('egg') + 'Protein</button>' +
        '<button class="toggle" data-act="meal-tag" data-i="' + i + '" data-k="veg" aria-pressed="' + !!m.veg + '">' + ic('leaf') + 'Vegetables</button></div></div>';
    }).join('');
    var pN = fd.meals.filter(function (m) { return m.protein; }).length, vN = fd.meals.filter(function (m) { return m.veg; }).length;
    return '<section class="card"><div class="stack tight"><p class="label">Meals today</p>' + (fd.meals.length ? '<p class="meta">' + plural(fd.meals.length, 'meal') + ': ' + pN + ' with protein, ' + vN + ' with vegetables</p>' : '') + '</div>' +
      (meals ? '<div class="list">' + meals + '</div>' : '<p class="empty">Write down what you eat. Just the food, no counting.</p>') +
      '<form class="inline-form" data-form="meal"><label for="meal-in" class="sr">What did you eat?</label><input class="input" id="meal-in" placeholder="What did you eat?" autocomplete="off" maxlength="120"><button class="btn small" type="submit" aria-label="Add meal">' + ic('plus') + '</button></form>' +
      '<p class="small">General habits, not a diet. Frank is a sports nutritionist: for a plan made for you, ask him.</p></section>' + flagBox;
  }

  // ---- me -----------------------------------------------------------------------------------------
  function streakDays() {
    var on = {}, n = 0;
    S.sessions.forEach(function (r) { on[r.date] = 1; });
    Object.keys(S.walks || {}).forEach(function (d) { on[d] = 1; });
    var d = new Date();
    if (!on[iso(d)]) d = addDays(d, -1);
    while (on[iso(d)]) { n++; d = addDays(d, -1); }
    return n;
  }
  SCREENS.me = {
    title: function () { return 'Me'; },
    html: function (p) {
      var pr = S.profile, all = S.sessions, totalSec = all.reduce(function (a, r) { return a + r.sec; }, 0);
      var head = '<div class="profile-head"><span class="avatar">' + esc(((pr && pr.name) || 'F').charAt(0).toUpperCase()) + '</span><div class="grow"><p class="h2">' + esc((pr && pr.name) || 'Welcome') + '</p>' +
        '<p class="meta">' + (pr ? esc(WBF.GOALS[pr.goal].name + ' · ' + WBF.LEVELS[WBF.plan.levelFor(pr)] + ' · ' + pr.days + ' days a week') : 'No plan yet') + '</p></div>' +
        (pr ? '<button class="btn two small" data-act="ob-edit">Edit</button>' : '<button class="btn small" data-act="ob-start">Get my plan</button>') + '</div>';
      var tiles = '<div class="stats"><div><b>' + all.length + '</b><span>Workouts</span></div><div><b>' + Math.round(totalSec / 60) + '</b><span>Minutes</span></div>' +
        '<div><b>' + streakDays() + '</b><span>Day streak</span></div></div>';
      var off = p.m || 0, base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
      var first = new Date(base.getFullYear(), base.getMonth(), 1), lead = (first.getDay() + 6) % 7;
      var daysIn = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      var on = {}; all.forEach(function (r) { on[r.date] = (on[r.date] || 0) + 1; });
      var cal = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span class="dow">' + d + '</span>'; }).join('');
      for (var i = 0; i < lead; i++) cal += '<span></span>';
      var todayIso = iso();
      for (var d = 1; d <= daysIn; d++) {
        var di = iso(new Date(base.getFullYear(), base.getMonth(), d));
        cal += '<span class="d' + (on[di] ? ' on' : '') + (di === todayIso ? ' today' : '') + '"' + (on[di] ? ' aria-label="' + d + ': ' + plural(on[di], 'workout') + '"' : '') + '>' + d + '</span>';
      }
      var monthCount = all.filter(function (r) { return r.date.slice(0, 7) === iso(first).slice(0, 7); }).length;
      return '<div class="screen">' + head + tiles + weeklyChart() + weightCard() +
        '<section class="card"><div class="between"><button class="icon-btn" data-act="cal" data-m="' + (off - 1) + '" aria-label="Previous month">' + ic('back') + '</button>' +
        '<div class="stack tight" style="align-items:center"><p class="label">' + esc(fmtMonth.format(first)) + '</p><p class="meta">' + plural(monthCount, 'workout') + '</p></div>' +
        '<button class="icon-btn" data-act="cal" data-m="' + (off + 1) + '" aria-label="Next month"' + (off >= 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('chev') + '</button></div>' +
        '<div class="cal">' + cal + '</div><div class="streak">' + ic('flame') + plural(streakDays(), 'day') + ' in a row</div></section>' +
        historyCard() + loadsCard() + settingsCards() + '</div>';
    }
  };
  function weeklyChart() {
    var wk = monday(new Date()), weeks = [];
    for (var i = 7; i >= 0; i--) {
      var a = addDays(wk, -7 * i), b = addDays(a, 7), ai = iso(a), bi = iso(b);
      var sec = S.sessions.filter(function (r) { return r.date >= ai && r.date < bi; }).reduce(function (x, r) { return x + r.sec; }, 0);
      weeks.push({ label: i === 0 ? 'This week' : fmtShort.format(a), min: Math.round(sec / 60) });
    }
    var max = Math.max.apply(null, weeks.map(function (w) { return w.min; }));
    if (!S.sessions.length) return '<section class="card"><p class="label">Minutes per week</p><p class="empty">Your first workout will show up here.</p></section>';
    var Wd = 340, Hh = 150, top = 22, bottom = 22, step = Wd / 8, bw = 24;
    var nice = Math.max(10, Math.ceil(max / 10) * 10);
    var svg = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + Hh + '" role="img" aria-label="Minutes trained per week, last 8 weeks">';
    svg += '<line class="grid" x1="0" x2="' + Wd + '" y1="' + (Hh - bottom) + '" y2="' + (Hh - bottom) + '"/>';
    weeks.forEach(function (w, i) {
      var h = (Hh - top - bottom) * w.min / nice, x = i * step + (step - bw) / 2, y = Hh - bottom - h;
      if (w.min) svg += '<rect class="bar' + (i === 7 ? '' : ' dim') + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(2, h) + '" rx="5"/>';
      if (w.min) svg += '<text class="val" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + w.min + '</text>';
      if (i % 2 === 1) svg += '<text x="' + (x + bw / 2) + '" y="' + (Hh - 6) + '" text-anchor="' + (i === 7 ? 'end' : 'middle') + '"' + (i === 7 ? ' dx="12"' : '') + '>' + esc(w.label) + '</text>';
    });
    svg += '</svg>';
    return '<section class="card"><div class="between"><p class="label">Minutes per week</p><p class="meta">Week of</p></div>' + svg + '</section>';
  }
  function weightCard() {
    var u = wUnit(), ws = S.weights, pr = S.profile || {};
    var form = '<form class="inline-form" data-form="weight"><label for="w-in" class="sr">Weight in ' + u + '</label><input class="input" id="w-in" inputmode="decimal" placeholder="Today, in ' + u + '" autocomplete="off"><button class="btn small" type="submit">Log</button></form>';
    if (!ws.length) return '<section class="card"><p class="label">Weight</p><p class="empty">Log your weight once a week, same time of day, to see the trend.</p>' + form + '</section>';
    var lastW = ws[ws.length - 1], firstW = ws[0];
    var goal = pr.targetKg && Math.abs(pr.targetKg - lastW.kg) >= 0.3 ? pr.targetKg : null;
    var chart = '';
    if (ws.length >= 2) {
      var pts = ws.slice(-12), Wd = 340, Hh = 140, padL = 8, padR = 44, top = 14, bottom = 22;
      var vals = pts.map(function (x) { return kgShow(x.kg); }), lo = Math.min.apply(null, vals.concat(goal ? [kgShow(goal)] : [])), hi = Math.max.apply(null, vals.concat(goal ? [kgShow(goal)] : []));
      if (hi - lo < 2) { lo -= 1; hi += 1; }
      var X = function (i) { return padL + (Wd - padL - padR) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)); };
      var Y = function (v) { return top + (Hh - top - bottom) * (1 - (v - lo) / (hi - lo)); };
      var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join('');
      var area = line + 'L' + X(vals.length - 1).toFixed(1) + ',' + (Hh - bottom) + 'L' + X(0).toFixed(1) + ',' + (Hh - bottom) + 'Z';
      chart = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + Hh + '" role="img" aria-label="Weight trend">' +
        '<line class="grid" x1="0" x2="' + Wd + '" y1="' + (Hh - bottom) + '" y2="' + (Hh - bottom) + '"/>' +
        (goal ? '<line class="goal" x1="0" x2="' + (Wd - padR + 6) + '" y1="' + Y(kgShow(goal)) + '" y2="' + Y(kgShow(goal)) + '"/><text x="' + (Wd - padR + 10) + '" y="' + (Y(kgShow(goal)) + 4) + '">Goal</text>' : '') +
        '<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
        '<circle class="dot" cx="' + X(vals.length - 1) + '" cy="' + Y(vals[vals.length - 1]) + '" r="4.5"/>' +
        '<text x="' + X(0) + '" y="' + (Hh - 6) + '">' + esc(fmtShort.format(fromIso(pts[0].date))) + '</text>' +
        '<text x="' + X(vals.length - 1) + '" y="' + (Hh - 6) + '" text-anchor="end">' + esc(fmtShort.format(fromIso(pts[pts.length - 1].date))) + '</text></svg>';
    }
    var ch = lastW.kg - firstW.kg;
    var chTxt = Math.abs(ch) < 0.05 ? 'No change since ' + fmtShort.format(fromIso(firstW.date)) : (ch > 0 ? '+' : '−') + kgShow(Math.abs(ch)) + ' ' + u + ' since ' + fmtShort.format(fromIso(firstW.date));
    var b = bmiOf(lastW.kg, pr.cm);
    return '<section class="card"><div class="wt-top"><div><p class="label">Current</p><b>' + kgShow(lastW.kg) + '<small>' + u + '</small></b></div>' +
      (goal ? '<div style="text-align:right"><p class="label dim">Goal</p><b>' + kgShow(goal) + '<small>' + u + '</small></b></div>' : '') + '</div>' +
      '<p class="meta">' + esc(chTxt) + '</p>' + chart +
      (b ? '<div class="stack tight"><div class="between"><span class="meta">BMI ' + b.toFixed(1) + '</span><span class="meta">' + bmiWord(b) + '</span></div><div class="dark-bmi"><i style="left:' + clamp((b - 15) / 25 * 100, 0, 100) + '%"></i></div></div>' : '') +
      form + '</section>';
  }
  function loadsCard() {
    var latest = {};
    S.sessions.forEach(function (r) { for (var k in r.loads || {}) latest[k] = { kg: r.loads[k], date: r.date }; });
    var ids = Object.keys(latest);
    if (!ids.length) return '';
    return '<section class="card"><p class="label">Dumbbell weights</p><div class="list">' + ids.map(function (id) {
      return '<div class="item">' + thumbHtml(id) + '<span class="grow"><b>' + esc(EX[id] ? EX[id].name : id) + '</b><span class="meta">' + esc(fmtShort.format(fromIso(latest[id].date))) + '</span></span><span class="dose">' + kgShow(latest[id].kg) + ' ' + wUnit() + '</span></div>';
    }).join('') + '</div></section>';
  }
  function historyCard() {
    var last = S.sessions.slice(-8).reverse();
    if (!last.length) return '<section class="card"><p class="label">History</p><p class="empty">Nothing yet. Your plan is one tap away on the Plan tab.</p></section>';
    var feel = { easy: 'Too easy', right: 'Just right', hard: 'Too hard' };
    return '<section class="card"><p class="label">History</p><div class="list">' + last.map(function (r) {
      return '<div class="item" style="min-height:52px"><span class="grow"><b>' + esc(r.title) + '</b><span class="meta">' + esc(fmtShort.format(fromIso(r.date))) + ' · ' + mmss(r.sec) + (r.kcal ? ' · ' + r.kcal + ' kcal est.' : '') + (r.feel ? ' · ' + feel[r.feel] : '') + '</span></span></div>';
    }).join('') + '</div></section>';
  }
  function settingsCards() {
    var st = S.settings, pr = S.profile, h = (pr && pr.health) || {};
    var parq = WBF.PARQ.some(function (q) { return h[q[0]]; });
    var standalone = (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) || W.navigator.standalone;
    var install = (!standalone && !framed) ? '<section class="card"><p class="label">Put it on your home screen</p>' +
      (deferredInstall ? '<button class="btn block" data-act="install">Install the app</button>' :
        '<p class="small">iPhone: tap the Share button in Safari, then <b>Add to Home Screen</b>. Android: open the browser menu and tap <b>Install app</b>.</p>') + '</section>' : '';
    return '<section class="card"><p class="label">Workout settings</p><div class="list">' +
      ['voice', 'sound', 'vibrate'].map(function (k) {
        var L = { voice: ['Voice guidance', 'Calls out each move, the rest and halfway'], sound: ['Sound effects', 'Countdown beeps for the last three seconds'], vibrate: ['Vibration', 'A buzz when a move or rest starts (Android)'] }[k];
        return '<div class="set-row"><div><b>' + L[0] + '</b><span class="meta">' + L[1] + '</span></div><button class="switch" role="switch" data-act="setting" data-k="' + k + '" aria-checked="' + !!st[k] + '" aria-label="' + L[0] + '"></button></div>';
      }).join('') +
      segRow('rest', 'Rest time', [0, 15, 30, 45, 60], function (v) { return v ? v + 's' : 'Auto'; }, 'Between moves') +
      segRow('ready', 'Get ready', [5, 10, 15], function (v) { return v + 's'; }, 'Before the first move') +
      segRow('coach', 'Coach figure', ['', 'm', 'f'], function (v) { return v === 'm' ? 'Male' : v === 'f' ? 'Female' : 'Auto'; }) +
      segRow('units', 'Weight', ['kg', 'lb'], function (v) { return v; }) +
      segRow('hunits', 'Height', ['cm', 'ft'], function (v) { return v; }) + '</div></section>' +
      (pr ? '<section class="card"><p class="label">Health</p>' +
        (parq ? '<div class="set-row"><div><b>Cleared by a doctor</b><span class="meta">You answered yes to a health question. Switch this on once a doctor or qualified professional says vigorous exercise is fine.</span></div><button class="switch" role="switch" data-act="health" data-k="cleared" aria-checked="' + !!h.cleared + '" aria-label="Cleared by a doctor"></button></div>' : '') +
        '<div class="set-row"><div><b>Pregnancy mode</b><span class="meta">No lying flat, no jumping, no balance pad or rings</span></div><button class="switch" role="switch" data-act="health" data-k="pregnant" aria-checked="' + !!h.pregnant + '" aria-label="Pregnancy mode"></button></div>' +
        '<p class="small">Sore spots: ' + ((pr.injuries || []).length ? pr.injuries.map(function (x) { return WBF.SORE.filter(function (s) { return s[0] === x; })[0][1]; }).join(', ') : 'none') + '. <button class="link" data-act="ob-edit-step" data-step="sore" style="min-height:0;padding:0">Change</button></p></section>' : '') +
      membershipCard() + install +
      '<section class="card"><p class="label">The science</p><p class="small">How the plans follow the research on strength, cardio, balance and safety, with every source.</p>' +
      '<button class="btn two block" data-act="science">Why the plans work</button></section>' +
      '<section class="card quiet"><p class="label">Your data</p><p class="small">Everything you enter stays on this phone. Nothing is sent to Frank or anyone else. Clearing your browser data clears it too.</p>' +
      '<button class="link" data-act="reset">Delete my data and start over</button></section>';
  }
  function membershipCard() {
    var st = status(), body;
    if (st === 'client') body = '<p class="lead">You train with Frank. His sessions show up on your plan, and the whole app is open to you.</p>';
    else if (st === 'member') body = '<p class="lead">You\'re a member. Thank you.</p>';
    else if (st === 'trial') body = '<p class="lead">Free trial: ' + plural(daysLeft(), 'day') + ' left.</p><button class="btn two block" data-act="paywall">See membership</button>';
    else if (st === 'ended') body = '<p class="lead">Your free trial has ended.</p><button class="btn block" data-act="paywall">Become a member</button>';
    else body = '<p class="lead">Your ' + BILL.trialDays + '-day free trial starts with your first workout.</p>';
    if (st !== 'client') body += '<button class="link" data-act="join">I\'m one of Frank\'s clients</button>';
    return '<section class="card"><p class="label">Membership</p>' + body + '</section>';
  }

  // ---- frank -----------------------------------------------------------------------------------
  SCREENS.frank = {
    title: function () { return 'Frank'; },
    html: function () {
      var wa = FR.whatsapp ? 'https://wa.me/' + FR.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi Frank, I train with your app and I would like a session with you.') : '';
      var method = [
        ['ESSENTiALS', 'Scapula and hips first. Get these two moving well and the rest has a base to build on.'],
        ['CHANGE THE METHOD, ELEVATE THE RESULT', 'The same move on a heel wedge or a balance pad teaches your body something new.'],
        ['GRAViTY', 'Load is a tool. Rings and dumbbells add weight once the pattern is clean.'],
        ['NOT ONLY A TRAINER, BUT PURPOSELY AN EDUCATOR', 'Every exercise comes with its why, so you understand what you train.']
      ];
      return '<div class="screen"><div class="frank-hero"><img src="' + img('img/wellness-4.jpg') + '" alt="Frank\'s graphic: Not only a trainer, but purposely an educator"></div>' +
        '<div class="stack tight"><h1 class="display xl sky">Frank</h1><p class="note s">' + esc(FR.bio) + '</p></div>' +
        '<section class="card"><p class="label">Train with Frank in person</p><p class="lead">The app teaches the method. In a session, Frank watches how you move and fixes one thing at a time.</p>' +
        '<a class="btn block" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Message on Instagram</a>' +
        (wa ? '<a class="btn two block" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '<div class="between"><span class="handle">@' + esc(FR.handle) + '</span><button class="link" data-act="copy" data-v="@' + esc(FR.handle) + '">' + ic('copy') + 'Copy</button></div></section>' +
        (S.inbox.length ? '<section class="card"><p class="label">Sessions from Frank</p><p class="lead">' + plural(S.inbox.length, 'session') + ' on this phone.</p><button class="btn two block" data-act="inbox">See them</button></section>'
                        : '<section class="card"><p class="label">Already train with Frank?</p><p class="lead">Open the link he sends you, or paste it here, and his sessions land on your plan.</p><button class="btn two block" data-act="join">I\'m one of Frank\'s clients</button></section>') +
        '<section class="stack"><p class="label">The method</p><div class="list">' + method.map(function (m) {
          return '<div class="method"><p class="display s sky">' + m[0] + '</p><p class="small">' + m[1] + '</p></div>';
        }).join('') + '</div></section>' +
        '<section class="card"><p class="label">The science</p><p class="small">The rules behind the generated plans, with every source.</p><button class="btn two block" data-act="science">Why the plans work</button></section>' +
        '<section class="card quiet"><p class="label">For Frank</p><p class="small">Write sessions for your clients and send them as a link.</p>' +
        '<button class="btn two block" data-act="coach">Coach tools</button></section></div>';
    }
  };

  SCREENS.join = {
    title: function () { return 'Frank\'s clients'; },
    html: function () {
      return '<div class="screen bare">' + backBar('Frank\'s clients') +
        '<h1 class="h1">Sessions from Frank</h1>' +
        '<p class="lead">Frank writes your sessions and sends each one as a link. Open the link on this phone and the session lands on your plan. Or paste the link or code here.</p>' +
        '<form class="stack" data-form="join"><label for="join-in" class="sr">Link or code from Frank</label>' +
        '<textarea class="input" id="join-in" rows="3" placeholder="Paste the link or code from Frank" style="padding:14px 16px;min-height:100px;resize:vertical"></textarea>' +
        '<button class="btn block" type="submit">Add the session</button></form>' +
        '<div class="card quiet"><p class="small">Not training with Frank yet? He coaches in person and online.</p>' +
        '<a class="link" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Message Frank</a></div></div>';
    }
  };
  SCREENS.inbox = {
    title: function () { return 'From Frank'; },
    html: function () {
      return '<div class="screen bare">' + backBar('From Frank') +
        '<h1 class="h1">Sessions from Frank</h1><div class="list">' + S.inbox.map(function (sp) {
          var s = WBF.plan.custom(sp);
          return '<button class="item" data-act="open-coach" data-id="' + sp.i + '">' + thumbHtml(firstMove(s)) + '<span class="grow"><b>' + esc(sp.t) + '</b><span class="meta">' +
            esc(fmtShort.format(fromIso(sp.d))) + ' · ' + metaLine(s) + (S.inboxDone[sp.i] ? ' · done' : '') + '</span></span>' + ic('chev', 'chev') + '</button>';
        }).join('') + '</div>' +
        '<button class="btn two block" data-act="join">Add a session from a link</button></div>';
    }
  };

  // ---- the science behind the plans ------------------------------------------------------------
  SCREENS.science = {
    title: function () { return 'The science'; },
    html: function () {
      var SC = WBF.SCIENCE || { intro: '', sections: [], sources: [] };
      var cite = function (ids) {
        return (ids || []).map(function (n) { return '<a class="cite" href="#src-' + n + '" data-act="cite" data-n="' + n + '">' + n + '</a>'; }).join('');
      };
      return '<div class="screen bare">' + backBar('The science') +
        '<div class="stack tight"><h1 class="h1">Why the plans work</h1><p class="lead">' + esc(SC.intro) + '</p></div>' +
        SC.sections.map(function (sec) {
          return '<section class="card"><p class="label">' + esc(sec.title) + '</p><ul class="bul">' + sec.rules.map(function (r) {
            return '<li>' + esc(r.text) + ' ' + cite(r.src) + '</li>';
          }).join('') + '</ul>' + (sec.app ? '<p class="small"><b>In the app:</b> ' + esc(sec.app) + '</p>' : '') + '</section>';
        }).join('') +
        '<section class="stack"><p class="label">Sources</p><ol class="sources">' + SC.sources.map(function (src) {
          return '<li id="src-' + src.n + '"><a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.label) + '</a></li>';
        }).join('') + '</ol></section>' +
        '<p class="meta">General guidance for healthy adults, not medical advice. If you answered yes to a health question, check with your doctor and tell Frank.</p></div>';
    }
  };

  // ---- coach tools: Frank writes a session and sends it as a link ------------------------------
  var cdraft = null;
  function newCoachDraft() { return { i: Date.now().toString(36), t: '', c: '', n: '', r: 3, f: 'c', rs: 30, w: 1, k: 1, x: [], d: iso() }; }
  function backBar(label) {
    return '<div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button><p class="title">' + esc(label) + '</p><span style="width:44px"></span></div>';
  }
  SCREENS.coach = {
    title: function () { return 'Coach tools'; },
    html: function () {
      var list = S.coach.templates.map(function (t) {
        var s = WBF.plan.custom(t);
        return '<div class="coach-row"><div class="grow"><b>' + esc(t.t || 'Untitled session') + '</b><span class="meta">' + (t.c ? 'For ' + esc(t.c) + ' · ' : '') + metaLine(s) + '</span></div>' +
          '<div class="rowx"><button class="btn two small" data-act="coach-edit" data-id="' + t.i + '">Edit</button>' +
          '<button class="btn small" data-act="coach-send" data-id="' + t.i + '">' + ic('send') + 'Send</button></div></div>';
      }).join('');
      return '<div class="screen bare">' + backBar('Coach tools') +
        '<div class="stack tight"><h1 class="h1">Your clients\' sessions</h1>' +
        '<p class="lead">Build a session from the ' + Object.keys(EX).length + ' moves, then send it as a link. It opens in your client\'s app with the 3D coach, timers and voice.</p></div>' +
        '<button class="btn block" data-act="coach-new">' + ic('plus') + 'New session</button>' +
        (list ? '<section class="stack"><p class="label">Saved sessions</p><div class="list">' + list + '</div></section>' : '<p class="empty">No sessions yet. Your first one takes about a minute.</p>') +
        '<section class="card quiet"><p class="label">How your clients get in</p><p class="small">Anyone who opens one of your links gets your sessions in the app without paying the membership. You charge them for your coaching yourself.</p>' +
        '<button class="link" data-act="paywall">See what members see</button></section></div>';
    }
  };
  SCREENS['coach-edit'] = {
    title: function () { return 'Session'; },
    html: function () {
      var d = cdraft, s = WBF.plan.custom(d);
      var rows = d.x.map(function (m, i) {
        var ex = EX[m[0]], isT = ex.type === 'time';
        return '<div class="coach-move">' + thumbHtml(m[0]) + '<div class="grow stack tight"><b>' + esc(ex.name) + '</b>' +
          '<div class="stepper"><button class="icon-btn ring" data-act="c-dose" data-i="' + i + '" data-d="-1" aria-label="Less">' + ic('minus') + '</button>' +
          '<span class="dose num">' + (isT ? secText(m[1]) : '× ' + m[1]) + (ex.each ? ' each side' : '') + '</span>' +
          '<button class="icon-btn ring" data-act="c-dose" data-i="' + i + '" data-d="1" aria-label="More">' + ic('plus') + '</button></div></div>' +
          '<div class="stack tight"><button class="icon-btn" data-act="c-move" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('up') + '</button>' +
          '<button class="icon-btn" data-act="c-del" data-i="' + i + '" aria-label="Remove ' + esc(ex.name) + '">' + ic('close') + '</button></div></div>';
      }).join('');
      var seg = function (k, vals, fmt) {
        return '<span class="seg" role="group">' + vals.map(function (v) {
          return '<button data-act="c-set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (String(d[k]) === String(v)) + '">' + fmt(v) + '</button>';
        }).join('') + '</span>';
      };
      return '<div class="screen bare">' + backBar(S.coach.templates.some(function (t) { return t.i === d.i; }) ? 'Edit session' : 'New session') +
        '<div class="field"><label for="c-t">Title</label><input class="input" id="c-t" maxlength="60" placeholder="Lower body, week 2" value="' + esc(d.t) + '"></div>' +
        '<div class="field"><label for="c-c">For</label><input class="input" id="c-c" maxlength="40" placeholder="Client\'s first name (optional)" value="' + esc(d.c) + '"></div>' +
        '<div class="field"><label for="c-n">Note to your client</label><textarea class="input" id="c-n" maxlength="400" rows="3" placeholder="What to focus on today (optional)" style="padding:14px 16px;min-height:88px;resize:vertical">' + esc(d.n) + '</textarea></div>' +
        '<section class="stack"><div class="between"><p class="label">Moves</p><p class="meta">' + (d.x.length ? metaLine(s) : '') + '</p></div>' +
        (rows ? '<div class="list">' + rows + '</div>' : '<p class="empty">Add the first move.</p>') +
        '<button class="btn two block" data-act="c-add">' + ic('plus') + 'Add a move</button></section>' +
        '<section class="card"><div class="set-row"><div><b>Format</b><span class="meta">' + (d.f === 's' ? 'All sets of a move, then the next move' : 'Every move once, then repeat') + '</span></div>' + seg('f', ['c', 's'], function (v) { return v === 'c' ? 'Circuit' : 'Sets'; }) + '</div>' +
        '<div class="set-row"><div><b>' + (d.f === 's' ? 'Sets' : 'Rounds') + '</b></div><div class="stepper"><button class="icon-btn ring" data-act="c-rounds" data-d="-1" aria-label="Fewer">' + ic('minus') + '</button><span class="dose num">' + d.r + '</span><button class="icon-btn ring" data-act="c-rounds" data-d="1" aria-label="More">' + ic('plus') + '</button></div></div>' +
        '<div class="set-row"><div><b>Rest</b><span class="meta">Between moves</span></div>' + seg('rs', [15, 30, 45, 60, 90], function (v) { return v + 's'; }) + '</div>' +
        '<div class="set-row"><div><b>Warm-up</b><span class="meta">March, arm circles, leg swings</span></div><button class="switch" role="switch" data-act="c-toggle" data-k="w" aria-checked="' + !!d.w + '" aria-label="Warm-up"></button></div>' +
        '<div class="set-row"><div><b>Cool-down</b><span class="meta">Forward fold, child\'s pose</span></div><button class="switch" role="switch" data-act="c-toggle" data-k="k" aria-checked="' + !!d.k + '" aria-label="Cool-down"></button></div></section>' +
        '<div class="dock"><div class="dock-in"><button class="btn two" data-act="c-save">Save</button><button class="btn grow" data-act="c-send">' + ic('send') + 'Send</button></div></div></div>';
    },
    mount: function () {
      [['#c-t', 't'], ['#c-c', 'c'], ['#c-n', 'n']].forEach(function (f) {
        var el = $(f[0]);
        if (el) el.addEventListener('input', function () { cdraft[f[1]] = el.value; });
      });
    }
  };
  function pickerSheet() {
    openSheet('<div class="sheet-body"><div class="between"><h2 class="h2">Add a move</h2><button class="icon-btn" data-act="close" aria-label="Done">' + ic('check') + '</button></div>' +
      '<div class="search">' + ic('search') + '<label for="pick-q" class="sr">Search moves</label><input class="input" id="pick-q" type="search" placeholder="Search moves" autocomplete="off"></div>' +
      '<div class="list" id="pick-list"></div></div>', function () { render(false); });
    var q = $('#pick-q', overlay), list = $('#pick-list', overlay);
    function fill() {
      var t = (q.value || '').trim().toLowerCase();
      var ids = Object.keys(EX).filter(function (id) { return !t || EX[id].name.toLowerCase().indexOf(t) !== -1 || EX[id].area.join(' ').indexOf(t) !== -1; })
        .sort(function (a, b) { return EX[a].name.localeCompare(EX[b].name); });
      list.innerHTML = ids.map(function (id) {
        var n = cdraft.x.filter(function (m) { return m[0] === id; }).length;
        return '<button class="item" data-act="c-pick" data-id="' + id + '">' + thumbHtml(id) + '<span class="grow"><b>' + esc(EX[id].name) + '</b><span class="meta">' +
          esc(EX[id].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + (n ? ' · added' : '') + '</span></span>' + ic('plus', 'chev') + '</button>';
      }).join('');
      mountFigures(list);
    }
    q.addEventListener('input', fill);
    fill();
  }
  function saveDraft() {
    var spec = cleanSpec(cdraft);
    if (!spec) { toast('Add at least one move'); return null; }
    if (!spec.t || spec.t === 'Session from Frank') spec.t = cdraft.t.trim() || 'Session ' + fmtShort.format(new Date());
    spec.i = cdraft.i;
    S.coach.templates = S.coach.templates.filter(function (t) { return t.i !== spec.i; });
    S.coach.templates.unshift(spec);
    save();
    return spec;
  }
  function sendSheet(spec) {
    var link = shareLink(spec);
    var msg = 'Hi' + (spec.c ? ' ' + spec.c : '') + ', your next session: ' + spec.t + '. Open it here: ' + link;
    openSheet('<div class="sheet-body"><div class="between"><h2 class="h2">Send to ' + esc(spec.c || 'your client') + '</h2><button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<p class="lead">' + esc(spec.t) + '</p>' +
      '<a class="btn block" href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + ic('msg') + 'Send on WhatsApp</a>' +
      '<div class="field"><label for="send-link">Link</label><input class="input" id="send-link" readonly value="' + esc(link) + '"></div>' +
      '<button class="btn two block" data-act="copy" data-v="' + esc(link) + '">' + ic('copy') + 'Copy the link</button>' +
      '<p class="small">When ' + esc(spec.c || 'your client') + ' opens the link on their phone, the session appears on their plan under From Frank. If it opens in a browser instead, they can paste it in the app: Frank tab, I\'m one of Frank\'s clients.</p></div>');
    var inp = $('#send-link', overlay);
    if (inp) inp.addEventListener('focus', function () { inp.select(); });
  }

  // ---- actions ------------------------------------------------------------------------------------------
  function readObInputs() {
    var n = $('#ob-name');
    if (n && draft) draft.name = n.value.trim().slice(0, 40);
  }
  function finishProfile() {
    readObInputs();
    var old = S.profile, d = draft;
    d.level = d.level || levelFromTest(d);
    d.days = +d.days || 3;
    d.minutes = +d.minutes || 20;
    if (!d.focus || !d.focus.length) d.focus = ['full'];
    var changed = !old || ['goal', 'level', 'days', 'minutes'].some(function (k) { return String(old[k]) !== String(d[k]); }) ||
      String(old.kit) !== String(d.kit) || String(old.injuries) !== String(d.injuries) || JSON.stringify(old.health) !== JSON.stringify(d.health);
    if (changed) { d.start = iso(); d.round = old ? (old.round || 1) : 1; S.done = {}; }
    if (d.kg && (!S.weights.length || Math.abs(S.weights[S.weights.length - 1].kg - d.kg) > 0.01)) {
      S.weights = S.weights.filter(function (w) { return w.date !== iso(); });
      S.weights.push({ date: iso(), kg: Math.round(d.kg * 10) / 10 });
    }
    delete d.edit; delete d.soreDone;
    S.profile = d;
    S.flags = null; flags();
    save();
    setCoachFigure();
    return changed;
  }

  var deferredInstall = null;
  W.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });

  var A = {
    tab: function (el) { tab(el.getAttribute('data-tab')); },
    back: function () { back(); },
    close: function () { closeOverlay(); },
    'sheet-bg': function (el, e) { if (e.target === el) closeOverlay(); },
    'modal-yes': function () { var f = overlay._yes; closeOverlay(); if (f) f(); },
    'modal-no': function () { var f = overlay._no; closeOverlay(); if (f) f(); },
    'modal-extra': function () { var f = overlay._extra; closeOverlay(); if (f) f(); },
    browse: function () { tab('workouts'); },
    settings: function () { settingsSheet(); },
    // onboarding
    'ob-start': function () { draft = newDraft(); stack = [{ name: 'onboard', params: { step: 'p1' } }]; render(true); },
    'ob-edit': function () { draft = newDraft(); draft.edit = true; go('onboard', { step: 'goal' }); },
    'ob-edit-step': function (el) { draft = newDraft(); draft.edit = true; draft.only = el.getAttribute('data-step'); go('onboard', { step: draft.only }); },
    'ob-back': function () {
      var id = cur().params.step || 'p1', i = OB_I[id];
      readObInputs();
      if (draft && draft.only) { back(); return; }
      if (id === 'ready' || id === 'build') { obGo('name'); return; }
      if (i > 0) {
        var prev = OB[i - 1];
        if (prev.intro && draft && draft.edit) prev = OB[i - 2];
        if (prev && (!draft || !draft.edit || OB_I[prev.id] >= OB_I.goal)) { obGo(prev.id); return; }
      }
      if (stack.length > 1) back();
      else { stack = [{ name: S.profile ? 'plan' : 'welcome', params: {} }]; render(true); }
    },
    'ob-next': function () {
      var id = cur().params.step || 'p1';
      readObInputs();
      if (id === 'focus' && !(draft.focus || []).length) return toast('Pick at least one');
      if (draft.only) { if (finishProfile()) toast('Your plan was updated'); back(); return; }
      obGo(obNext(id));
    },
    'ob-pick': function (el) {
      var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
      draft[k] = v;
      if (k === 'sex') setCoachFigure();
      if (draft.only) { finishProfile(); back(); return; }
      obGo(obNext(cur().params.step));
    },
    'ob-pick-stay': function (el) {
      var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
      draft[k] = +v;
      var y = W.scrollY; obGo(cur().params.step); W.scrollTo(0, y);
    },
    'ob-multi': function (el) {
      var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
      var arr = draft[k] = (draft[k] || []).slice(), i = arr.indexOf(v);
      if (k === 'focus' && v === 'full') arr.length = 0, i = -1;
      if (k === 'focus' && v !== 'full') { var f = arr.indexOf('full'); if (f !== -1) arr.splice(f, 1); i = arr.indexOf(v); }
      if (i === -1) arr.push(v); else arr.splice(i, 1);
      if (k === 'injuries') draft.soreDone = true;
      var y = W.scrollY; obGo(cur().params.step); W.scrollTo(0, y);
    },
    'ob-none': function () { draft.injuries = []; draft.soreDone = true; var y = W.scrollY; obGo('sore'); W.scrollTo(0, y); },
    'ob-health': function (el) {
      draft.health[el.getAttribute('data-k')] = el.getAttribute('data-v') === '1';
      var y = W.scrollY; obGo('health'); W.scrollTo(0, y);
    },
    'ob-push': function (el) { draft.push = +el.getAttribute('data-v'); draft.level = levelFromTest(draft); var y = W.scrollY; obGo('pushups'); W.scrollTo(0, y); },
    'ob-level': function (el) { draft.level = el.getAttribute('data-v'); var y = W.scrollY; obGo('pushups'); W.scrollTo(0, y); },
    'ob-build': function () {
      readObInputs();
      if (draft.edit) { if (finishProfile()) toast('Your plan was updated'); else toast('Saved'); tab('plan'); return; }
      obGo('build');
    },
    'ob-finish': function () {
      finishProfile();
      var st = status();
      if (st === 'client' || st === 'member' || st === 'trial') { tab('plan'); return; }
      stack = [{ name: 'plan', params: {} }, { name: 'pay', params: { fromOb: true } }];
      pushState();
      render(true);
    },
    units: function (el) {
      S.settings.units = el.getAttribute('data-v'); save();
      if (cur().name === 'onboard') { var y = W.scrollY; obGo(cur().params.step); W.scrollTo(0, y); } else render(false);
    },
    hunits: function (el) {
      S.settings.hunits = el.getAttribute('data-v'); save();
      if (cur().name === 'onboard') { var y = W.scrollY; obGo(cur().params.step); W.scrollTo(0, y); } else render(false);
    },
    // paywall
    'pay-plan': function (el) { cur().params.plan = el.getAttribute('data-v'); render(false); },
    'pay-trial': function () { startTrial(); tab('plan'); toast('Your ' + BILL.trialDays + '-day free trial has started'); },
    'pay-close': function () { if (stack.length > 1) back(); else tab('plan'); },
    paywall: function () { go('pay', {}); },
    // plan and workouts
    'open-day': function (el) {
      var d = planDays()[+el.getAttribute('data-day') - 1];
      if (d) go('workout', { day: d.day });
    },
    'start-day': function (el) {
      var d = planDays()[+el.getAttribute('data-day') - 1];
      if (d) begin(session(d.workoutId, d));
    },
    'open-workout': function (el) { go('workout', { id: el.getAttribute('data-id') }); },
    start: function (el) {
      var day = el.getAttribute('data-day'), d = day ? planDays()[+day - 1] : null;
      begin(session(d ? d.workoutId : el.getAttribute('data-id'), d));
    },
    'start-coach': function (el) { begin(frankSession(el.getAttribute('data-id'))); },
    'open-coach': function (el) { go('workout', { coach: el.getAttribute('data-id') }); },
    inbox: function () { go('inbox', {}); },
    join: function () { closeOverlay(); go('join', {}); },
    coach: function () { go('coach', {}); },
    science: function () { closeOverlay(); go('science', {}); },
    cite: function (el) {
      var t = document.getElementById('src-' + el.getAttribute('data-n'));
      if (t) { t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); t.classList.add('hit'); setTimeout(function () { t.classList.remove('hit'); }, 1600); }
    },
    body: function (el) { cur().params.body = el.getAttribute('data-v'); render(false); },
    'body-go': function (el) { stack = [{ name: 'workouts', params: { body: el.getAttribute('data-v') } }]; render(true); },
    wf: function (el) { cur().params[el.getAttribute('data-k')] = el.getAttribute('data-v'); render(false); },
    'coach-new': function () { cdraft = newCoachDraft(); go('coach-edit', {}); },
    'coach-edit': function (el) {
      var sp = specById(el.getAttribute('data-id'));
      if (sp) { cdraft = JSON.parse(JSON.stringify(sp)); go('coach-edit', {}); }
    },
    'coach-send': function (el) { var sp = specById(el.getAttribute('data-id')); if (sp) sendSheet(sp); },
    'c-add': function () { pickerSheet(); },
    'c-pick': function (el) {
      var id = el.getAttribute('data-id'), ex = EX[id];
      cdraft.x.push([id, ex.dose.i]);
      toast('Added ' + ex.name);
      var meta = el.querySelector('.meta');
      if (meta && meta.textContent.indexOf('added') === -1) meta.textContent += ' · added';
    },
    'c-dose': function (el) {
      var m = cdraft.x[+el.getAttribute('data-i')], ex = EX[m[0]], step = ex.type === 'time' ? 5 : 1;
      m[1] = Math.max(step, Math.min(ex.type === 'time' ? 600 : 200, m[1] + step * +el.getAttribute('data-d')));
      render(false);
    },
    'c-move': function (el) {
      var i = +el.getAttribute('data-i');
      if (i > 0) { var t = cdraft.x[i]; cdraft.x[i] = cdraft.x[i - 1]; cdraft.x[i - 1] = t; render(false); }
    },
    'c-del': function (el) { cdraft.x.splice(+el.getAttribute('data-i'), 1); render(false); },
    'c-set': function (el) { var k = el.getAttribute('data-k'), v = el.getAttribute('data-v'); cdraft[k] = k === 'rs' ? +v : v; render(false); },
    'c-rounds': function (el) { cdraft.r = Math.max(1, Math.min(8, cdraft.r + +el.getAttribute('data-d'))); render(false); },
    'c-toggle': function (el) { var k = el.getAttribute('data-k'); cdraft[k] = cdraft[k] ? 0 : 1; el.setAttribute('aria-checked', String(!!cdraft[k])); },
    'c-save': function () { if (saveDraft()) toast('Saved'); },
    'c-send': function () { var sp = saveDraft(); if (sp) sendSheet(sp); },
    'next-round': function () {
      S.profile.round = (S.profile.round || 1) + 1; S.profile.start = iso(); S.done = {}; save();
      render(true); toast('Round ' + S.profile.round + ' starts today');
    },
    moves: function () { go('moves', {}); },
    'moves-area': function (el) { cur().params.area = el.getAttribute('data-area'); render(false); },
    ex: function (el) { exerciseSheet(el.getAttribute('data-id')); },
    'ex-list': function (el) {
      var list = (el.closest('#move-list') || {})._ids || [];
      exerciseSheet(list[+el.getAttribute('data-i')], { list: list.map(function (id) { return { ex: id }; }), i: +el.getAttribute('data-i') });
    },
    'ex-wo': function (el) { var list = SCREENS.workout._list || []; exerciseSheet(list[+el.getAttribute('data-i')].ex, { list: list, i: +el.getAttribute('data-i') }); },
    'xs-tab': function (el) { if (!XS) return; XS.tab = el.getAttribute('data-v'); paintExMedia(); },
    'xs-go': function (el) { if (!XS) return; XS.i = clamp(XS.i + +el.getAttribute('data-d'), 0, XS.list.length - 1); XS.tab = 'video'; paintExSheet(false); },
    swap: function (el) { swapSheet(el.getAttribute('data-from'), el.getAttribute('data-cur')); },
    'do-swap': function (el) {
      var from = el.getAttribute('data-from'), to = el.getAttribute('data-to');
      if (to) S.swaps[from] = to; else delete S.swaps[from];
      save(); closeOverlay(); render(false);
      toast(to ? EX[to].name + ' replaces ' + EX[from].name : EX[from].name + ' is back');
    },
    turn: function (el) {
      var host = el.parentNode.querySelector('[data-fig]');
      if (host && host._fig && host._fig.turn) host._fig.turn(60);
    },
    // player
    quit: function () { askQuit(); },
    'pl-skip': function () { if (PL.phase === 'ready') enterMove(0); else enterMove(PL.i + 1); },
    'pl-more': function () { PL.left += 20; PL.len += 20; live(); },
    'pl-done': function () { afterMove(); },
    'pl-next': function () {
      if (PL.i >= PL.s.steps.length - 1) { finish(Object.keys(PL.did).length >= PL.s.steps.length - 1); return; }
      enterMove(PL.i + 1);
    },
    'pl-prev': function () { if (PL.i > 0) enterMove(PL.phase === 'move' ? PL.i - 1 : PL.i); },
    'pl-pause': function () {
      PL.paused = !PL.paused; PL.last = now();
      if (PL.paused) SND.hush();
      var b = $('[data-act="pl-pause"]');
      if (b) { b.innerHTML = ic(PL.paused ? 'play' : 'pause'); b.setAttribute('aria-label', PL.paused ? 'Resume' : 'Pause'); }
      var fig = $('.pl-fig'); if (fig && fig._fig) { if (PL.paused) fig._fig.pause(); else fig._fig.play(); }
    },
    'pl-how': function () {
      var wasPaused = PL.paused; PL.paused = true; SND.hush();
      var st = PL.s.steps[PL.i];
      exerciseSheet(st.ex, { player: true, list: [{ ex: st.ex, dose: st.dose }], onClose: function () { if (PL) { PL.paused = wasPaused; PL.last = now(); } } });
    },
    feel: function (el) {
      var rec = S.sessions.filter(function (r) { return r.id === el.getAttribute('data-id'); })[0];
      if (!rec) return;
      var v = el.getAttribute('data-v');
      S.adjust = (S.adjust || 1) - (rec.adj || 0);
      var delta = v === 'easy' ? 0.05 : v === 'hard' ? -0.08 : 0;
      var next = Math.max(0.75, Math.min(1.3, S.adjust + delta));
      rec.adj = next - S.adjust; S.adjust = next; rec.feel = v;
      save(); render(false);
    },
    cal: function (el) { cur().params.m = +el.getAttribute('data-m'); render(false); },
    walk: function (el) {
      var m = +el.getAttribute('data-m'), d = iso();
      S.walks = S.walks || {};
      if (m) S.walks[d] = Math.min(600, (S.walks[d] || 0) + m); else delete S.walks[d];
      save(); render(false);
      if (m) toast('Activity logged: ' + m + ' min');
    },
    flag: function (el) {
      var f = flags(), k = el.getAttribute('data-k');
      f[k] = !f[k]; save(); render(false);
    },
    health: function (el) {
      var k = el.getAttribute('data-k'), h = S.profile.health = S.profile.health || {};
      h[k] = !h[k]; S.flags = null; save(); render(false);
      toast(k === 'cleared' ? (h[k] ? 'Your plan can include vigorous work now' : 'Your plan stays gentle') : (h[k] ? 'Pregnancy mode is on' : 'Pregnancy mode is off'));
    },
    water: function (el) {
      var fd = foodDay(iso()), n = +el.getAttribute('data-n');
      fd.water = fd.water === n ? n - 1 : n; save(); render(false);
    },
    'meal-del': function (el) { foodDay(iso()).meals.splice(+el.getAttribute('data-i'), 1); save(); render(false); },
    'meal-tag': function (el) {
      var m = foodDay(iso()).meals[+el.getAttribute('data-i')], k = el.getAttribute('data-k');
      m[k] = !m[k]; save(); render(false);
    },
    setting: function (el) { var k = el.getAttribute('data-k'); S.settings[k] = !S.settings[k]; save(); el.setAttribute('aria-checked', String(S.settings[k])); if (k !== 'vibrate') SND.prime(); },
    'setting-v': function (el) {
      var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
      S.settings[k] = (k === 'units' || k === 'hunits' || k === 'coach') ? v : +v; save();
      if (k === 'coach') setCoachFigure();
      $$('[data-act="setting-v"][data-k="' + k + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(v))); });
      if (overlay.hidden && cur().name !== 'player') render(false);
    },
    copy: function (el) {
      var v = el.getAttribute('data-v');
      try {
        navigator.clipboard.writeText(v).then(function () { toast(v.length > 40 ? 'Copied' : 'Copied ' + v); }, function () { toast('Copy it from the line above'); });
      } catch (e) { toast('Copy it from the line above'); }
    },
    install: function () { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } },
    reset: function () {
      confirmBox('Delete everything?', 'Delete', function () {
        try { W.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
        S = defaults(); draft = null; stack = [{ name: 'welcome', params: {} }]; render(true);
      }, { body: 'Your plan, workouts, weights and food notes on this phone will be removed. This can\'t be undone.' });
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var f = A[el.getAttribute('data-act')];
    if (!f) return;
    if (/^pl-/.test(el.getAttribute('data-act')) && !PL) return;
    if (el.classList.contains('part') && e.target.closest('button') && e.target.closest('button') !== el) return;
    f(el, e);
  });
  document.addEventListener('submit', function (e) {
    var form = e.target, kind = form.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    if (kind === 'meal') {
      var inp = $('#meal-in'), text = inp.value.trim();
      if (!text) return;
      foodDay(iso()).meals.push({ t: fmtTime.format(new Date()), text: text.slice(0, 120), protein: false, veg: false });
      save(); render(false);
      var again = $('#meal-in'); if (again) again.focus();
    } else if (kind === 'join') {
      var spec = importSession($('#join-in').value);
      if (!spec) { toast('That link or code didn\'t work. Ask Frank to send it again.'); return; }
      stack = [{ name: 'plan', params: {} }, { name: 'workout', params: { coach: spec.i } }];
      render(true);
      toast('Added: ' + spec.t);
    } else if (kind === 'weight') {
      var kg = toKg($('#w-in').value);
      if (!kg || kg < 20 || kg > 400) { toast('Enter your weight as a number'); return; }
      S.weights = S.weights.filter(function (w) { return w.date !== iso(); });
      S.weights.push({ date: iso(), kg: Math.round(kg * 10) / 10 });
      S.weights.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      save(); render(false); toast('Logged');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) {
      var f = overlay._no; if ($('.modal', overlay)) { closeOverlay(); if (f) f(); } else closeOverlay();
    }
    if (cur().name === 'player' && PL && overlay.hidden && (e.key === ' ' || e.key === 'Enter') && e.target === document.body) {
      e.preventDefault();
      if (PL.phase === 'move') { if (timed(PL.s.steps[PL.i])) A['pl-pause'](); else afterMove(); } else A['pl-skip']();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && PL && !PL.paused && PL.phase === 'move' && timed(PL.s.steps[PL.i])) {
      PL.paused = true; SND.hush(); paintPlayer();
    }
  });
  $$('.tab', tabsEl).forEach(function (t) { t.addEventListener('click', function () { tab(t.getAttribute('data-tab')); }); });

  // offline support when the app is hosted on its own
  if ('serviceWorker' in navigator && !framed && /^https?:$/.test(location.protocol)) {
    W.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ }); });
  }

  if (useHistory) { try { W.history.replaceState({ wbf: 1 }, ''); } catch (e) { useHistory = false; } }
  function upgrade3d() {
    if (!WBF.fig3d || !WBF.fig3d.init()) return;
    setCoachFigure();
    if (cur().name === 'player') paintPlayer(); else render(false);
    if (!overlay.hidden) mountFigures(overlay);
  }
  W.addEventListener('wbf-three', upgrade3d);
  function fromLink() {
    var h = (location.hash || '').slice(1);
    if (h.indexOf(LINK) !== 0) return false;
    var spec = importSession(h);
    if (useHistory) { try { W.history.replaceState({ wbf: 1 }, '', location.href.split('#')[0]); } catch (e) { /* ignore */ } }
    if (!spec) { setTimeout(function () { toast('That session link didn\'t work. Ask Frank to send it again.'); }, 300); return false; }
    stack = [{ name: 'plan', params: {} }, { name: 'workout', params: { coach: spec.i } }];
    pushState();
    setTimeout(function () { toast('New session from Frank: ' + spec.t); }, 300);
    return true;
  }
  W.addEventListener('hashchange', function () { if (fromLink()) render(true); });
  fromLink();
  if (W.THREE && WBF.fig3d) WBF.fig3d.init();
  render(true);
  W.WBF.app = { state: function () { return S; }, go: go, tab: tab };
})(window);
