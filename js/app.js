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

  var I = {
    plan: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
    work: '<path d="M8 12h8"/><path d="M5.2 7.5 8 9.1v5.8l-2.8 1.6-2.8-1.6V9.1z"/><path d="M18.8 7.5l2.8 1.6v5.8l-2.8 1.6-2.8-1.6V9.1z"/>',
    food: '<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z"/><path d="M12 12c0-4 2.5-6.5 6-7-.3 3.6-2.6 6-6 7z"/>',
    prog: '<path d="M4 19h16"/><path d="M5 15l4.5-5 3.5 3 6-7"/><path d="M15 6h4v4"/>',
    frank: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3.4"/>',
    prev: '<path d="M6 5.5v13"/><path d="M18 6.5 9.5 12l8.5 5.5z" fill="currentColor"/>',
    next: '<path d="M18 5.5v13"/><path d="M6 6.5l8.5 5.5L6 17.5z" fill="currentColor"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    swap: '<path d="M7 7.5h11l-3-3M17 16.5H6l3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
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
    minus: '<path d="M5 12h14"/>',
    up: '<path d="M6 14l6-6 6 6"/>',
    down: '<path d="M6 10l6 6 6-6"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="M11 13l9-9"/>',
    turn: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M18 3.5v4h-4"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M6 20.5v-4h4"/>'
  };
  function ic(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I[name] + '</svg>';
  }

  // ---- data ---------------------------------------------------------------------
  var KEY = 'wbf.v1';
  function defaults() {
    return { v: 1, profile: null, settings: { sound: true, voice: true, vibrate: true, rest: 0, ready: 10, units: 'kg' },
             adjust: 1, swaps: {}, done: {}, sessions: [], weights: [], food: {}, flags: null,
             access: null, inbox: [], inboxDone: {}, coach: { templates: [] }, walks: {} };
  }
  function load() {
    var d = defaults();
    try {
      var raw = W.localStorage.getItem(KEY);
      if (raw) {
        var got = JSON.parse(raw);
        for (var k in got) if (got[k] != null) d[k] = got[k];
        d.settings = Object.assign(defaults().settings, got.settings || {});
      }
    } catch (e) { /* private mode: start fresh */ }
    return d;
  }
  var S = load();
  function save() { try { W.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }

  function kgShow(kg) {
    if (kg == null) return '';
    return S.settings.units === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10;
  }
  function toKg(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return null;
    return S.settings.units === 'lb' ? n / 2.20462 : n;
  }
  function lastWeight() { return S.weights.length ? S.weights[S.weights.length - 1].kg : (S.profile && S.profile.kg) || null; }

  // ---- plan -------------------------------------------------------------------------
  function planDays() { return S.profile ? WBF.plan.days(S.profile) : []; }
  function nextDay() {
    var days = planDays();
    for (var i = 0; i < days.length; i++) if (days[i].train && !S.done[days[i].day]) return days[i];
    return null;
  }
  function ctx(day, level) {
    var p = S.profile || {};
    var wm = day ? WBF.WEEK_MULT[day.week - 1] : 1;
    return { level: level || p.level || 'b', kit: p.kit || WBF.DEFAULT_KIT, swaps: S.swaps, goal: p.goal, avoid: WBF.plan.avoidFor(p.health, p.age), older: p.age === '60',
             mult: wm * (S.adjust || 1) * (1 + 0.15 * ((p.round || 1) - 1)), restOverride: +S.settings.rest || 0 };
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
  function metaLine(s) {
    var n = mainMoves(s).length;
    var unit = s.coach && s.coach.f === 's' ? ' sets' : ' rounds';
    return plural(n, 'move') + (s.rounds > 1 ? ' · ' + s.rounds + unit : '') + ' · ' + mins(s.estSec);
  }
  function doseText(st) {
    var ex = EX[st.ex];
    if (ex.type === 'time') return secText(st.dose) + (st.side === 1 || st.side === 2 ? ' each side' : '');
    return '× ' + st.dose + (st.side === 3 ? ' each side' : '');
  }
  function sessionsOn(date) { return S.sessions.filter(function (r) { return r.date === date; }); }
  function thumbKey(ex) {
    var o = { 'jumping-jacks': 1, 'arm-circles': 1, burpee: 2, inchworm: 3, 'reverse-lunge': 2, 'lateral-lunge': 1, 'shoulder-taps': 1, 'farmer-carry': 0 };
    if (o[ex.id] != null) return o[ex.id];
    return ex.type === 'time' ? 0 : 1;
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
  // the free trial starts with the first workout; Frank's sessions are always open
  function mayTrain(s) {
    if (s && s.coach) return true;
    var st = status();
    if (st === 'new') { S.access = Object.assign(S.access || {}, { trialStart: iso() }); save(); return true; }
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
  function figHtml(id, opts) {
    opts = opts || {};
    return '<div class="fig-box' + (opts.wide ? ' wide' : '') + '" data-fig="' + esc(id) + '"' + (opts.deco ? ' data-deco="1"' : '') + (opts.flip ? ' data-flip="1"' : '') + (opts.drag ? ' data-drag="1"' : '') + '></div>';
  }
  function thumbHtml(id, big) { return '<div class="thumb' + (big ? ' big' : '') + '" data-thumb="' + esc(id) + '"></div>'; }
  // 3D when WebGL and three.js are there, the 2D skeleton otherwise
  function use3d() { return !!(WBF.fig3d && WBF.fig3d.ready()); }
  var thumbWatch = ('IntersectionObserver' in W) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { thumbWatch.unobserve(en.target); drawThumb(en.target); } });
  }, { rootMargin: '240px' }) : null;
  function drawThumb(el) {
    var ex = EX[el.getAttribute('data-thumb')];
    if (!ex || !el.isConnected) return;
    if (use3d()) new WBF.fig3d.Figure(ex.anim, {}).mount(el).still(thumbKey(ex));
    else new F.Figure(ex.anim, { aspect: 1, minW: 60, minH: 60, pad: 6, bare: true }).mount(el).still(thumbKey(ex));
  }
  function mountFigures(root) {
    $$('[data-thumb]', root).forEach(function (el) {
      if (use3d() && thumbWatch) thumbWatch.observe(el); else drawThumb(el);
    });
    $$('[data-fig]', root).forEach(function (el) {
      var ex = EX[el.getAttribute('data-fig')];
      if (!ex) return;
      var f, flip = el.hasAttribute('data-flip');
      if (use3d()) {
        f = new WBF.fig3d.Figure(ex.anim, { note: !el.hasAttribute('data-quiet'), flip: flip, drag: el.hasAttribute('data-drag') }).mount(el);
      } else {
        var box = el.getBoundingClientRect();
        var aspect = box.width && box.height ? box.width / box.height : 4 / 3;
        f = new F.Figure(ex.anim, { aspect: aspect, note: true, minW: 90, minH: 66, flip: flip }).mount(el);
      }
      el._fig = f;
      if (reduce && el.hasAttribute('data-deco')) f.still(thumbKey(ex));
      else f.play();
    });
    $$('[data-turn]', root).forEach(function (b) { b.hidden = !use3d(); });
  }

  // ---- navigation ---------------------------------------------------------------------
  var TABS = ['plan', 'workouts', 'food', 'progress', 'frank'];
  var stack = [{ name: S.profile ? 'plan' : 'welcome', params: {} }];
  var useHistory = !framed;           // inside a frame, history.back() could leave the host page
  function cur() { return stack[stack.length - 1]; }
  function pushState() { if (!useHistory) return; try { W.history.pushState({ wbf: stack.length }, ''); } catch (e) { useHistory = false; } }
  function go(name, params) {
    cur().scroll = W.scrollY;
    stack.push({ name: name, params: params || {} });
    pushState();
    render(true);
  }
  function pop() { if (stack.length > 1) { stack.pop(); render(false); } }
  function back() {
    if (useHistory) { try { W.history.back(); return; } catch (e) { useHistory = false; } }
    pop();
  }
  function tab(name) { stack = [{ name: name, params: {} }]; render(true); }
  W.addEventListener('popstate', function () {
    if (!useHistory) return;
    if (closeOverlay()) { pushState(); return; }
    if (cur().name === 'player') { pushState(); askQuit(); return; }
    pop();
  });

  function render(top) {
    var c = cur(), scr = SCREENS[c.name];
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
    toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  // ---- overlays: sheets and confirm boxes -------------------------------------------------
  var onOverlayClose = null;
  function openSheet(html, onClose) {
    closeOverlay();
    overlay.innerHTML = '<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
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
      '<p class="display m ink">' + esc(text) + '</p>' + (opts.body ? '<p class="lead">' + esc(opts.body) + '</p>' : '') +
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

  // ---- exercise sheet -------------------------------------------------------------------------
  function exerciseSheet(id, opts) {
    opts = opts || {};
    var ex = EX[id];
    if (!ex) return;
    var kit = (ex.eq || []).filter(function (k) { return k !== 'load'; }).map(function (k) {
      var m = WBF.KIT.filter(function (x) { return x.id === k; })[0];
      return m ? m.name : k;
    });
    var alts = (ex.alts || []).filter(function (a) { return EX[a]; });
    var html = '<div class="sheet-body">' +
      '<div class="top-bar"><p class="label">' + esc(ex.area.map(function (a) { return WBF.AREAS[a]; }).join(' · ')) + '</p>' +
      '<button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<div class="pl-fig-wrap">' + figHtml(id, { drag: true }) + '<button class="icon-btn turn" data-act="turn" data-turn="1" aria-label="Turn the figure" hidden>' + ic('turn') + '</button></div>' +
      '<div class="stack tight"><h2 class="display">' + esc(ex.name) + '</h2>' +
      '<p class="meta">' + (ex.type === 'time' ? 'Hold or keep moving' : 'Reps') + (ex.each ? ', each side' : '') +
      ' · Beginner ' + esc(ex.type === 'time' ? secText(ex.dose.b) : ex.dose.b) + ', advanced ' + esc(ex.type === 'time' ? secText(ex.dose.a) : ex.dose.a) + '</p></div>' +
      (kit.length ? '<div class="kit-line">' + kit.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="stack"><p class="label">Set up</p><p>' + esc(ex.setup) + '</p></div>' +
      '<div class="stack"><p class="label">How to</p><ol class="steps">' + ex.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="stack"><p class="label">Cues</p><ul class="bul">' + ex.cue.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="stack"><p class="label">Watch out for</p><ul class="bul x">' + ex.mistakes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><p class="label">Why it works</p><p class="note s">' + esc(ex.why) + '</p></div>' +
      (alts.length ? '<div class="stack"><p class="label">Other options</p><div class="list">' + alts.map(function (a) {
        return '<button class="item" data-act="ex" data-id="' + a + '">' + thumbHtml(a) + '<span class="grow"><b>' + esc(EX[a].name) + '</b><span class="meta">' + esc(EX[a].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + '</span></span>' + ic('chev', 'chev') + '</button>';
      }).join('') + '</div></div>' : '') +
      (opts.player ? '<button class="btn block" data-act="close">Back to the workout</button>' : '') +
      '</div>';
    openSheet(html, opts.onClose);
  }

  function swapSheet(origId, curId) {
    var orig = EX[origId], kit = (S.profile && S.profile.kit) || WBF.DEFAULT_KIT;
    var opts = Object.keys(EX).filter(function (k) {
      var e = EX[k];
      return k !== curId && e.pattern === orig.pattern && WBF.plan.canDo(e, kit) && (e.area.indexOf('mobility') === -1 || orig.area.indexOf('mobility') !== -1);
    });
    var html = '<div class="sheet-body"><div class="top-bar"><p class="label">Swap ' + esc(EX[curId].name) + '</p>' +
      '<button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<p class="lead">Pick a move that trains the same pattern. Your choice is used in every workout from now on.</p>' +
      '<div class="list">' + opts.map(function (k) {
        return '<button class="item" data-act="do-swap" data-from="' + origId + '" data-to="' + k + '">' + thumbHtml(k) + '<span class="grow"><b>' + esc(EX[k].name) + '</b><span class="meta">' + esc(EX[k].area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + '</span></span>' + ic('swap', 'chev') + '</button>';
      }).join('') + '</div>' +
      (S.swaps[origId] ? '<button class="btn two block" data-act="do-swap" data-from="' + origId + '" data-to="">Go back to ' + esc(orig.name) + '</button>' : '') +
      '</div>';
    openSheet(html);
  }

  // ---- screens -----------------------------------------------------------------------------------
  var SCREENS = {};
  var draft = null;

  SCREENS.welcome = {
    html: function () {
      return '<div class="welcome">' +
        '<div class="top-bar"><span class="wordmark">Wellness by Frank</span></div>' +
        '<div class="hero-img"><img src="' + img('img/wellness-1.jpg') + '" alt="Frank\'s Essentials graphic: a skeleton with the scapula and hips marked"></div>' +
        '<div class="stack"><h1 class="display xl">Train the method</h1>' +
        '<p class="lead">Home workouts built on Frank\'s system: biomechanics first. Every move shows you how, and tells you why.</p></div>' +
        '<div class="stack"><button class="btn block" data-act="ob-start">Build my plan</button>' +
        '<button class="btn two block" data-act="join">I train with Frank</button>' +
        '<button class="link" data-act="browse" style="align-self:center">Look around first</button></div>' +
        '<p class="meta">' + BILL.trialDays + ' days free, then ' + esc(BILL.price) + ' a ' + BILL.period + '. Frank\'s clients get in through him. Your answers and progress stay on this phone.</p></div>';
    }
  };

  var OB_STEPS = 6;
  SCREENS.onboard = {
    title: function () { return 'Your plan'; },
    html: function (p) {
      var st = p.step || 0, d = draft;
      var head = '<div class="top-bar"><button class="icon-btn" data-act="ob-back" aria-label="Back">' + ic('back') + '</button>' +
        '<div class="ob-bar" aria-hidden="true"><i style="width:' + Math.round((st + 1) / (OB_STEPS + 1) * 100) + '%"></i></div>' +
        '<span class="meta num">' + (st + 1) + ' / ' + OB_STEPS + '</span></div>';
      var body = '', next = '<button class="btn block" data-act="ob-next">Next</button>';
      if (st === 0) {
        body = '<h1 class="display">What do you want most?</h1><div class="stack">' +
          [['fat', 'flame'], ['strength', 'work'], ['move', 'walk'], ['fit', 'heart']].map(function (g) {
            var G = WBF.GOALS[g[0]];
            return '<button class="choice" data-act="ob-pick" data-k="goal" data-v="' + g[0] + '" aria-pressed="' + (d.goal === g[0]) + '"><span class="ic">' + ic(g[1]) + '</span><span class="grow"><b>' + G.name + '</b><span>' + G.line + '</span></span></button>';
          }).join('') + '</div>';
        next = '';
      } else if (st === 1) {
        var L = [['b', 'Beginner', 'New to training, or back after a long break.'], ['i', 'Intermediate', 'You train now and then. Ten push-ups on the knees are fine.'], ['a', 'Advanced', 'You train three times a week or more.']];
        body = '<h1 class="display">Where are you starting?</h1><div class="stack">' + L.map(function (l) {
          return '<button class="choice" data-act="ob-pick" data-k="level" data-v="' + l[0] + '" aria-pressed="' + (d.level === l[0]) + '"><span class="grow"><b>' + l[1] + '</b><span>' + l[2] + '</span></span><span class="tick">' + ic('check') + '</span></button>';
        }).join('') + '</div><p class="meta">Not sure? Pick the easier one. The plan adjusts after every session.</p>';
        next = '';
      } else if (st === 2) {
        body = '<h1 class="display">How many days a week?</h1><div class="bigpick">' + [3, 4, 5].map(function (n) {
          return '<button data-act="ob-pick" data-k="days" data-v="' + n + '" aria-pressed="' + (+d.days === n) + '"><b>' + n + '</b><span>days</span></button>';
        }).join('') + '</div><p class="lead">Training days get rest days between them. Three is plenty to see progress.</p>';
        next = '';
      } else if (st === 3) {
        body = '<h1 class="display">What do you have at home?</h1><p class="lead">Moves that need kit you don\'t have are swapped for ones that don\'t.</p><div class="stack">' +
          WBF.KIT.map(function (k) {
            var on = d.kit.indexOf(k.id) !== -1;
            return '<button class="choice" role="checkbox" data-act="ob-kit" data-v="' + k.id + '" aria-checked="' + on + '"><span class="grow"><b>' + esc(k.name) + '</b></span><span class="tick">' + ic('check') + '</span></button>';
          }).join('') + '</div>';
      } else if (st === 4) {
        var Q = [['heart', 'Has a doctor said you have a heart condition or high blood pressure?'],
                 ['chest', 'Do you get chest pain when you are active, or at rest?'],
                 ['dizzy', 'Do you lose your balance from dizziness, or have you fainted lately?'],
                 ['injury', 'Are you recovering from an injury, an operation or a joint problem?'],
                 ['pregnant', 'Are you pregnant, or did you give birth in the last six months?'],
                 ['under18', 'Are you under 18?']];
        var anyYes = Q.some(function (q) { return d.health[q[0]]; });
        body = '<h1 class="display">Before you start</h1><p class="lead">Six quick questions, so the plan is safe for you.</p><div class="yn">' +
          Q.map(function (q) {
            var v = !!d.health[q[0]];
            return '<div><p>' + q[1] + '</p><span class="seg" role="group" aria-label="' + esc(q[1]) + '">' +
              '<button data-act="ob-health" data-k="' + q[0] + '" data-v="0" aria-pressed="' + !v + '">No</button>' +
              '<button data-act="ob-health" data-k="' + q[0] + '" data-v="1" aria-pressed="' + v + '">Yes</button></span></div>';
          }).join('') + '</div>' +
          (anyYes ? '<p class="callout">Check with your doctor before you start, and tell Frank. He can adapt the plan with you in person. Until then, keep every session easy.</p>' : '');
      } else if (st === 5) {
        var u = S.settings.units;
        body = '<h1 class="display">About you</h1><p class="lead">All optional. Age tunes the plan (60 and over adds balance work and keeps it low impact). Weight is only used to estimate energy and chart your progress.</p>' +
          '<div class="field"><label for="ob-name">First name</label><input class="input" id="ob-name" autocomplete="given-name" value="' + esc(d.name || '') + '" placeholder="Your name"></div>' +
          '<div class="field"><span class="label" id="age-l">Age</span><span class="seg" role="group" aria-labelledby="age-l" style="align-self:flex-start">' +
          [['u30', 'Under 30'], ['30', '30–44'], ['45', '45–59'], ['60', '60+']].map(function (a) {
            return '<button data-act="ob-age" data-v="' + a[0] + '" aria-pressed="' + (d.age === a[0]) + '">' + a[1] + '</button>';
          }).join('') + '</span></div>' +
          '<div class="field"><label for="ob-kg">Weight</label><div class="inline-form"><input class="input" id="ob-kg" inputmode="decimal" value="' + esc(d.kg ? kgShow(d.kg) : '') + '" placeholder="' + (u === 'lb' ? '154' : '70') + '">' +
          '<span class="seg" role="group" aria-label="Units"><button data-act="units" data-v="kg" aria-pressed="' + (u === 'kg') + '">kg</button><button data-act="units" data-v="lb" aria-pressed="' + (u === 'lb') + '">lb</button></span></div></div>';
        next = '<button class="btn block" data-act="ob-finish">Build my plan</button>';
      } else {
        var days = WBF.plan.days(d), first = days.filter(function (x) { return x.train; })[0];
        var s1 = first ? WBF.plan.build(first.workoutId, { level: d.level, kit: d.kit, swaps: S.swaps, goal: d.goal, mult: 1 }) : null;
        return '<div class="ob">' +
          '<p class="label">Your plan is ready</p><h1 class="display xl">' + esc(d.name ? d.name + ', 4 weeks' : 'Four weeks') + '</h1>' +
          '<p class="lead">' + d.days + ' days a week · ' + WBF.LEVELS[d.level] + ' · ' + WBF.GOALS[d.goal].name + '. Each week asks a little more than the last.</p>' +
          (status() === 'new' || status() === 'trial' ? '<p class="meta">Your ' + BILL.trialDays + '-day free trial starts with your first workout.</p>' : '') +
          (s1 ? '<div class="card">' + figHtml(mainMoves(s1)[0].ex, { deco: true }) + '<p class="label">Day 1</p><p class="display m">' + esc(s1.title) + '</p><p class="meta">' + metaLine(s1) + '</p></div>' : '') +
          '<div class="stack"><button class="btn block" data-act="ob-go">Start day 1</button><button class="btn two block" data-act="ob-plan">See the plan</button></div></div>';
      }
      return '<div class="ob">' + head + body + '<div class="grow"></div>' + next + '</div>';
    }
  };

  SCREENS.plan = {
    title: function () { return 'Plan'; },
    html: function () {
      var now = new Date(), h = now.getHours();
      var hello = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (S.profile && S.profile.name ? ', ' + S.profile.name : '') + '.';
      var top = '<div class="hello"><div class="stack tight"><p class="label">' + esc(fmtLong.format(now)) + '</p><p class="note">' + esc(hello) + '</p></div>' +
        '<button class="avatar" data-act="tab" data-tab="frank" aria-label="Frank">F</button></div>';
      var fromFrank = S.inbox.length ? frankCard() : '';
      if (!S.profile) {
        return '<div class="screen">' + top + fromFrank + '<div class="card' + (fromFrank ? '' : ' hero') + '">' + (fromFrank ? '' : figHtml('hip-hinge', { deco: true })) +
          '<p class="label">' + (fromFrank ? 'For the days between' : 'No plan yet') + '</p><h2 class="display' + (fromFrank ? ' m' : '') + '">Four weeks, built for you</h2>' +
          '<p class="lead">Six quick questions: your goal, level, days and kit. Then every session is ready to press play.</p>' +
          '<button class="btn' + (fromFrank ? ' two' : '') + ' block" data-act="ob-start">Build my plan</button></div>' + lessonCard() + quickRail() + '</div>';
      }
      var nd = nextDay(), today = iso(), todays = sessionsOn(today);
      var hero;
      if (nd) {
        var s = session(nd.workoutId, nd), first = mainMoves(s)[0];
        hero = '<div class="card hero">' +
          '<div class="between"><p class="label">Day ' + nd.day + ' · Week ' + nd.week + '</p><p class="label dim">' + WBF.LEVELS[s.level] + '</p></div>' +
          (todays.length ? '<p class="small">' + ic('check', 'ico') + ' Done today: ' + esc(todays[todays.length - 1].title) + '. Next one tomorrow is fine; a walk today still counts.</p>' : '') +
          '<h2 class="display">' + esc(s.title) + '</h2><p class="meta">' + metaLine(s) + '</p>' +
          (first ? figHtml(first.ex, { deco: true }) : '') +
          '<div class="rowx"><button class="btn grow" data-act="start-day" data-day="' + nd.day + '">' + ic('play') + 'Start</button>' +
          '<button class="btn two small" data-act="open-day" data-day="' + nd.day + '">Details</button></div></div>';
      } else {
        hero = '<div class="card hero"><p class="label">Plan complete</p><h2 class="display">Four weeks done</h2>' +
          '<p class="lead">' + plural(Object.keys(S.done).length, 'session') + ' finished. The next four weeks start a step harder.</p>' +
          '<button class="btn block" data-act="next-round">Start the next 4 weeks</button>' +
          '<a class="btn two block" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Plan the next step with Frank</a></div>';
      }
      var days = planDays(), doneN = days.filter(function (d) { return d.train && S.done[d.day]; }).length, trainN = days.filter(function (d) { return d.train; }).length;
      var weeks = '';
      for (var w = 0; w < 4; w++) {
        weeks += '<div class="week"><span class="label dim">W' + (w + 1) + '</span>';
        for (var i = 0; i < 7; i++) {
          var d = days[w * 7 + i];
          if (!d.train) { weeks += '<span class="day rest" title="Rest day">' + d.day + '</span>'; continue; }
          var cls = 'day train' + (S.done[d.day] ? ' done' : '') + (nd && nd.day === d.day ? ' next' : '');
          weeks += '<button class="' + cls + '" data-act="open-day" data-day="' + d.day + '" aria-label="Day ' + d.day + (S.done[d.day] ? ', done' : '') + '">' + (S.done[d.day] ? ic('check') : d.day) + '</button>';
        }
        weeks += '</div>';
      }
      return '<div class="screen">' + top + fromFrank + hero +
        '<section class="stack"><div class="between"><p class="label">Your 4 weeks</p><p class="meta">' + doneN + ' of ' + trainN + ' done</p></div>' +
        '<div class="weeks">' + weeks + '</div></section>' +
        lessonCard() + quickRail() + '</div>';
    }
  };

  function frankCard() {
    var pending = S.inbox.filter(function (x) { return !S.inboxDone[x.i]; });
    var sp = pending[0] || S.inbox[0], s = WBF.plan.custom(sp), first = mainMoves(s)[0];
    var done = !!S.inboxDone[sp.i];
    return '<div class="card hero"><div class="between"><p class="label">From Frank' + (done ? ' · done' : '') + '</p><p class="label dim">' + esc(fmtShort.format(fromIso(sp.d))) + '</p></div>' +
      '<h2 class="display">' + esc(s.title) + '</h2><p class="meta">' + metaLine(s) + '</p>' +
      (sp.n ? '<p class="note s">' + esc(sp.n) + '</p>' : '') +
      (first ? figHtml(first.ex, { deco: true }) : '') +
      '<div class="rowx"><button class="btn grow" data-act="start-coach" data-id="' + sp.i + '">' + ic('play') + (done ? 'Do it again' : 'Start') + '</button>' +
      '<button class="btn two small" data-act="open-coach" data-id="' + sp.i + '">Details</button></div>' +
      (S.inbox.length > 1 ? '<button class="link" data-act="inbox">All sessions from Frank (' + S.inbox.length + ')</button>' : '') + '</div>';
  }

  function lessonCard() {
    var n = Math.floor((Date.now() - new Date(2026, 0, 1).getTime()) / 864e5);
    var L = WBF.LESSONS[((n % WBF.LESSONS.length) + WBF.LESSONS.length) % WBF.LESSONS.length];
    return '<div class="card lesson"><p class="label">Lesson of the day</p><p class="note">' + esc(L) + '</p>' +
      '<svg class="doodle" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 34c10-3 19-12 22-24"/><path d="M24 12l6-3 2 6"/></svg></div>';
  }
  function quickRail() {
    return '<section class="stack"><p class="label">Quick sessions</p><div class="rail">' +
      ['wake-up', 'desk-reset', 'evening', 'mobility'].map(function (id) {
        var s = session(id), m = mainMoves(s)[0];
        return '<button class="mini" data-act="open-workout" data-id="' + id + '"><span class="fig-box" data-thumb="' + m.ex + '"></span><b>' + esc(s.title) + '</b><span class="meta">' + mins(s.estSec) + '</span></button>';
      }).join('') + '</div></section>';
  }

  SCREENS.workouts = {
    title: function () { return 'Workouts'; },
    html: function (p) {
      var areaSel = p.area || 'core', lvl = (S.profile && S.profile.level) || 'b';
      var progs = WBF.WORKOUTS.filter(function (w) { return w.kind === 'program'; }).map(function (w) {
        var s = session(w.id);
        return '<button class="prog" data-act="open-workout" data-id="' + w.id + '"><img src="' + img(w.img) + '" alt="' + esc(w.phrase) + '">' +
          '<span class="cap"><b class="display m">' + esc(w.title) + '</b><span class="meta">' + metaLine(s) + '</span></span></button>';
      }).join('');
      var chips = ['core', 'lower', 'upper', 'full', 'cardio'].map(function (a) {
        return '<button class="chip" data-act="area" data-area="' + a + '" aria-pressed="' + (a === areaSel) + '">' + WBF.AREAS[a] + '</button>';
      }).join('');
      var levels = ['b', 'i', 'a'].map(function (l) {
        var id = areaSel + '-' + l, s = session(id);
        return '<button class="item" data-act="open-workout" data-id="' + id + '">' + thumbHtml(mainMoves(s)[0].ex, true) +
          '<span class="grow"><b>' + WBF.LEVELS[l] + (l === lvl && S.profile ? ' <span class="here">· your level</span>' : '') + '</b><span class="meta">' + metaLine(s) + '</span></span>' + ic('chev', 'chev') + '</button>';
      }).join('');
      var quick = ['mobility', 'wake-up', 'desk-reset', 'evening'].map(function (id) {
        var s = session(id), w = WBF.WORKOUT[id];
        return '<button class="item" data-act="open-workout" data-id="' + id + '">' + thumbHtml(mainMoves(s)[0].ex) +
          '<span class="grow"><b>' + esc(s.title) + '</b><span class="meta">' + mins(s.estSec) + ' · ' + esc(w.blurb) + '</span></span>' + ic('chev', 'chev') + '</button>';
      }).join('');
      return '<div class="screen"><div class="stack tight"><h1 class="display xl">Workouts</h1><p class="lead">Frank\'s method, from the first breath to the heaviest carry.</p></div>' +
        '<section class="stack"><p class="label">Frank\'s programs</p><div class="rail">' + progs + '</div></section>' +
        '<section class="stack"><p class="label">By body area</p><div class="chips" role="group" aria-label="Body area">' + chips + '</div><div class="list levels">' + levels + '</div></section>' +
        '<section class="stack"><p class="label">Mobility and quick sessions</p><div class="list">' + quick + '</div></section>' +
        '<section class="stack"><div class="between"><p class="label">All moves</p><p class="meta">' + Object.keys(EX).length + '</p></div>' +
        '<button class="item" data-act="moves">' + thumbHtml('hip-hinge') + '<span class="grow"><b>Exercise library</b><span class="meta">Every move with how-to, cues and the why</span></span>' + ic('chev', 'chev') + '</button></section>' +
        '</div>';
    }
  };

  SCREENS.moves = {
    title: function () { return 'Exercise library'; },
    html: function (p) {
      var a = p.area || 'all';
      var chips = ['all', 'core', 'lower', 'upper', 'cardio', 'mobility'].map(function (x) {
        return '<button class="chip" data-act="moves-area" data-area="' + x + '" aria-pressed="' + (x === a) + '">' + (x === 'all' ? 'All' : WBF.AREAS[x]) + '</button>';
      }).join('');
      return '<div class="screen bare"><div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button><p class="label">Exercise library</p><span style="width:44px"></span></div>' +
        '<div class="field"><label for="q" class="sr">Search moves</label><input class="input" id="q" type="search" placeholder="Search moves" autocomplete="off" value="' + esc(p.q || '') + '"></div>' +
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
        list.innerHTML = ids.length ? ids.map(function (id) {
          var e = EX[id], kit = (e.eq || []).filter(function (k) { return k !== 'load'; });
          return '<button class="item" data-act="ex" data-id="' + id + '">' + thumbHtml(id) + '<span class="grow"><b>' + esc(e.name) + '</b><span class="meta">' +
            esc(e.area.map(function (x) { return WBF.AREAS[x]; }).join(' · ')) + (kit.length ? ' · ' + esc(kit.map(function (k) { var m = WBF.KIT.filter(function (z) { return z.id === k; })[0]; return m ? m.name.replace(/^A sturdy /, '') : k; }).join(', ')) : '') +
            '</span></span>' + ic('chev', 'chev') + '</button>';
        }).join('') : '<p class="empty">No moves match "' + esc(q) + '".</p>';
        mountFigures(list);
      }
      input.addEventListener('input', fill);
      fill();
    }
  };

  SCREENS.workout = {
    title: function (p) { var w = WBF.WORKOUT[p.id]; return w ? w.title : 'Workout'; },
    html: function (p) {
      var days = planDays(), day = p.day ? days[p.day - 1] : null;
      var wid = day ? day.workoutId : p.id, w = WBF.WORKOUT[wid];
      var s = p.coach ? frankSession(p.coach) : session(wid, day);
      if (!s) return '<div class="screen bare"><button class="btn" data-act="back">Back</button><p class="lead">This session is no longer on this phone.</p></div>';
      if (p.coach) w = { kind: 'coach', title: s.title, blurb: '' };
      var blocks = [['warm', 'Warm-up'], ['main', s.rounds > 1 ? 'Main · ' + s.rounds + ' rounds' : 'Main'], ['cool', 'Cool-down']];
      var list = blocks.map(function (b) {
        var seen = {}, rows = s.steps.filter(function (st) {
          if (st.block !== b[0] || st.side === 2) return false;
          var k = st.ex + '|' + st.side; if (seen[k]) return false; seen[k] = 1; return true;
        });
        if (!rows.length) return '';
        return '<section class="stack tight"><div class="block-title"><p class="label">' + b[1] + '</p><p class="meta">' + plural(rows.length, 'move') + '</p></div><div class="list">' +
          rows.map(function (st) {
            var canSwap = b[0] === 'main' && !p.coach;
            return '<div class="item"><button class="item" style="padding:0;min-height:0" data-act="ex" data-id="' + st.ex + '">' + thumbHtml(st.ex) +
              '<span class="grow"><b>' + esc(EX[st.ex].name) + '</b><span class="dose">' + doseText(st) + '</span></span></button>' +
              (canSwap ? '<button class="icon-btn swap-btn" data-act="swap" data-from="' + st.orig + '" data-cur="' + st.ex + '" aria-label="Swap ' + esc(EX[st.ex].name) + '">' + ic('swap') + '</button>' : '') + '</div>';
          }).join('') + '</div></section>';
      }).join('');
      var kitNeeded = {};
      s.steps.forEach(function (st) { (EX[st.ex].eq || []).forEach(function (k) { kitNeeded[k] = 1; }); });
      var kitNames = Object.keys(kitNeeded).map(function (k) {
        if (k === 'load') return 'Something heavy to carry';
        var m = WBF.KIT.filter(function (x) { return x.id === k; })[0]; return m ? m.name : k;
      });
      var kcal = WBF.plan.kcal(s, lastWeight());
      var head = '<div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button>' +
        '<p class="label">' + (p.coach ? 'From Frank' : day ? 'Day ' + day.day + ' · Week ' + day.week : w.kind === 'program' ? 'Frank\'s program' : w.kind === 'quick' ? 'Quick session' : WBF.AREAS[w.area]) + '</p><span style="width:44px"></span></div>';
      var hero = w.img ? '<div class="card flush"><img src="' + img(w.img) + '" alt="' + esc(w.phrase) + '"></div>' : '<div class="card">' + figHtml(mainMoves(s)[0].ex, { deco: true }) + '</div>';
      return '<div class="screen bare">' + head + hero +
        '<div class="detail-head"><h1 class="display xl">' + esc(s.title) + '</h1>' +
        '<p class="meta">' + WBF.LEVELS[s.level] + ' · ' + metaLine(s) + (kcal ? ' · about ' + kcal + ' kcal' : '') + '</p>' +
        (w.blurb ? '<p class="lead">' + esc(w.blurb) + '</p>' : '') +
        (p.coach && s.coach.n ? '<div class="card"><p class="label">Note from Frank</p><p class="note s">' + esc(s.coach.n) + '</p></div>' : '') +
        (kitNames.length ? '<div class="kit-line">' + kitNames.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>' : '<div class="kit-line"><span class="tag">No kit needed</span></div>') +
        '</div>' + list +
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
    if (!mayTrain(s)) { paywall(true); return; }
    startSession(s);
  }
  function startSession(s) {
    SND.prime();
    closeOverlay();
    PL = { s: s, i: 0, phase: 'ready', left: +S.settings.ready || 10, len: +S.settings.ready || 10, elapsed: 0, last: now(),
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
    var ex = EX[st.ex];
    speak(ex.name + '. ' + spokenDose(st) + '.');
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
    return st.rounds > 1 ? (PL && PL.s.coach && PL.s.coach.f === 's' ? 'Set ' : 'Round ') + st.round + ' of ' + st.rounds : 'Main';
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
        '<div class="pl-segs" aria-hidden="true">' + segs() + '</div><span class="pl-clock" id="pl-clock">' + mmss(PL.elapsed) + '</span></div>';
      if (PL.phase === 'ready' || PL.phase === 'rest' || PL.phase === 'switch') {
        var nx = PL.phase === 'ready' ? st : PL.phase === 'switch' ? s.steps[PL.i + 1] : s.steps[PL.i + 1];
        var nxi = PL.phase === 'ready' ? 0 : PL.i + 1;
        var title = PL.phase === 'ready' ? 'Get ready' : PL.phase === 'switch' ? 'Switch sides' : 'Rest';
        return '<div class="player">' + top + '<div class="pl-rest">' +
          '<p class="label" style="text-align:center">' + title + '</p>' +
          '<div class="ring-wrap"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="track" cx="100" cy="100" r="90"/><circle class="fill" id="pl-ring" cx="100" cy="100" r="90" stroke-dasharray="565.5" stroke-dashoffset="0"/></svg>' +
          '<span class="pl-big" id="pl-count" role="timer">' + Math.ceil(PL.left) + '</span></div>' +
          '<div class="rowx" style="justify-content:center">' +
          (PL.phase === 'rest' ? '<button class="btn two small" data-act="pl-more">+20 s</button>' : '') +
          '<button class="btn small" data-act="pl-skip">' + (PL.phase === 'ready' ? 'Start now' : 'Skip') + '</button></div>' +
          '<div class="pl-next"><div class="between"><p class="label">' + (PL.phase === 'ready' ? 'First' : 'Next') + '</p><span class="meta num">' + (nxi + 1) + ' / ' + s.steps.length + '</span></div>' +
          '<div class="pl-next-fig" data-fig="' + nx.ex + '"' + (nx.side === 2 ? ' data-flip="1"' : '') + '></div>' +
          '<div class="between"><p class="display s ink">' + esc(EX[nx.ex].name) + '</p><p class="dose">' + doseText(nx) + (nx.side === 2 ? ' · side 2' : '') + '</p></div></div>' +
          '</div></div>';
      }
      var isT = timed(st);
      var side = st.side === 1 ? 'First side' : st.side === 2 ? 'Second side' : st.side === 3 ? 'Each side' : '';
      return '<div class="player">' + top +
        '<div class="pl-body">' +
        '<div class="between" style="align-items:center"><p class="label">' + blockLabel(st) + ' · <span class="num">' + (PL.i + 1) + ' / ' + s.steps.length + '</span></p>' +
        '<button class="link" data-act="pl-how">' + ic('info') + 'How to</button></div>' +
        '<div class="pl-fig-wrap"><div class="pl-fig" data-drag="1" data-fig="' + st.ex + '"' + (st.side === 2 ? ' data-flip="1"' : '') + '></div>' +
        '<button class="icon-btn turn" data-act="turn" data-turn="1" aria-label="Turn the figure" hidden>' + ic('turn') + '</button></div>' +
        '<div class="pl-name"><h1 class="display" style="font-size:30px">' + esc(ex.name) + '</h1>' +
        (side ? '<p class="label dim">' + side + '</p>' : '') + '</div>' +
        (isT ? '<div class="stack tight"><span class="pl-big" id="pl-count" role="timer">' + mmss(Math.ceil(PL.left)) + '</span><div class="pl-bar"><i id="pl-bar"></i></div></div>'
             : '<span class="pl-big"><small>×</small>' + st.dose + '</span>') +
        '<p class="note s pl-cue" id="pl-cue" aria-live="polite">' + esc(ex.cue[0]) + '</p>' +
        '<div class="pl-ctrl"><button class="icon-btn ring" data-act="pl-prev" aria-label="Previous move"' + (PL.i === 0 ? ' disabled' : '') + '>' + ic('prev') + '</button>' +
        (isT ? '<button class="pl-main" data-act="pl-pause" aria-label="' + (PL.paused ? 'Resume' : 'Pause') + '">' + ic(PL.paused ? 'play' : 'pause') + '</button>'
             : '<button class="pl-main" data-act="pl-done" aria-label="Done">' + ic('check') + '</button>') +
        '<button class="icon-btn ring" data-act="pl-next" aria-label="Skip this move">' + ic('next') + '</button></div>' +
        '</div></div>';
    },
    mount: function () {}
  };

  function finish(complete) {
    if (!PL) return;
    clearInterval(timer); timer = null;
    SND.awake(false);
    var s = PL.s, didN = Object.keys(PL.did).length;
    var mainTotal = s.steps.filter(function (x) { return x.block === 'main'; }).length;
    var mainDid = s.steps.filter(function (x, i) { return x.block === 'main' && PL.did[i]; }).length;
    if (complete) { beep('go'); speak('Session done.'); }
    else SND.hush();
    var rec = null;
    if (didN > 0) {
      rec = { id: 's' + Date.now().toString(36), at: new Date().toISOString(), date: iso(), wid: s.wid, title: s.title, level: s.level,
              day: s.day || null, sec: Math.round(PL.elapsed), moves: didN, total: s.steps.length, feel: null, adj: 0, loads: {},
              kcal: WBF.plan.kcal(s, lastWeight(), PL.elapsed) };
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
    title: function () { return 'Session done'; },
    html: function (p) {
      var rec = S.sessions.filter(function (r) { return r.id === p.id; })[0];
      if (!rec) return '<div class="screen"><button class="btn" data-act="tab" data-tab="plan">Back to your plan</button></div>';
      var w = WBF.WORKOUT[rec.wid];
      var loaded = {}, s0 = w ? session(rec.wid) : rec.coach ? frankSession(rec.coach) : null;
      if (s0) s0.steps.forEach(function (st) { if ((EX[st.ex].eq || []).indexOf('db') !== -1) loaded[st.ex] = 1; });
      var u = S.settings.units;
      var loads = Object.keys(loaded).map(function (id) {
        var v = rec.loads[id];
        return '<div class="set-row"><div><b>' + esc(EX[id].name) + '</b><span class="meta">Weight per dumbbell</span></div>' +
          '<input class="input" style="width:110px" id="load-' + id + '" inputmode="decimal" data-load="' + id + '" placeholder="' + u + '" value="' + (v ? esc(kgShow(v)) : '') + '" aria-label="' + esc(EX[id].name) + ' weight in ' + u + '"></div>';
      }).join('');
      var full = rec.moves >= rec.total;
      return '<div class="screen bare">' +
        '<div class="badge" aria-hidden="true">' + ic('check') + '</div>' +
        '<div class="stack tight"><p class="label">' + (full ? 'Session done' : 'Saved: ' + rec.moves + ' of ' + rec.total + ' moves') + '</p><h1 class="display xl">' + esc(rec.title) + '</h1>' +
        (rec.day ? '<p class="meta">Day ' + rec.day + (S.done[rec.day] === rec.id ? ' is ticked off your plan.' : ' stays open: finish half the main moves to tick it off.') + '</p>' : '') +
        (rec.coach ? '<p class="meta">' + (S.inboxDone[rec.coach] === rec.id ? 'Ticked off. Frank\'s next session will show up on your plan.' : 'Finish half the main moves to tick it off.') + '</p>' : '') + '</div>' +
        '<div class="stats"><div><b>' + mmss(rec.sec) + '</b><span>Time</span></div><div><b>' + rec.moves + '</b><span>Moves</span></div>' +
        '<div><b>' + (rec.kcal ? rec.kcal : '–') + '</b><span>' + (rec.kcal ? 'kcal, est.' : 'kcal: add weight') + '</span></div></div>' +
        '<section class="stack"><p class="label">How did that feel?</p><div class="feel" role="group" aria-label="How did that feel?">' +
        [['easy', 'Too easy'], ['right', 'About right'], ['hard', 'Too hard']].map(function (f) {
          return '<button data-act="feel" data-id="' + rec.id + '" data-v="' + f[0] + '" aria-pressed="' + (rec.feel === f[0]) + '">' + f[1] + '</button>';
        }).join('') + '</div><p class="meta">' + (rec.feel === 'easy' ? 'Next sessions get a little harder.' : rec.feel === 'hard' ? 'Next sessions get a little easier.' : rec.feel === 'right' ? 'Good. The plan keeps building at this pace.' : 'Your answer tunes the next sessions.') + '</p></section>' +
        (loads ? '<section class="stack tight"><p class="label">Weights you used</p>' + loads + '</section>' : '') +
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

  // ---- progress -----------------------------------------------------------------------------------
  SCREENS.progress = {
    title: function () { return 'Progress'; },
    html: function (p) {
      var all = S.sessions, totalSec = all.reduce(function (a, r) { return a + r.sec; }, 0);
      var wk = monday(new Date()), wkIso = iso(wk);
      var thisWeek = all.filter(function (r) { return r.date >= wkIso; }).length;
      var target = (S.profile && +S.profile.days) || 3;
      var tiles = '<div class="stats"><div><b>' + all.length + '</b><span>Sessions</span></div><div><b>' + Math.round(totalSec / 60) + '</b><span>Minutes</span></div>' +
        '<div><b>' + thisWeek + '<small style="font-size:16px;color:var(--ink-3)">/' + target + '</small></b><span>This week</span></div></div>';
      // calendar
      var off = p.m || 0, base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
      var first = new Date(base.getFullYear(), base.getMonth(), 1), lead = (first.getDay() + 6) % 7;
      var daysIn = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      var on = {}; all.forEach(function (r) { on[r.date] = (on[r.date] || 0) + 1; });
      var cal = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span class="dow">' + d + '</span>'; }).join('');
      for (var i = 0; i < lead; i++) cal += '<span></span>';
      var todayIso = iso();
      for (var d = 1; d <= daysIn; d++) {
        var di = iso(new Date(base.getFullYear(), base.getMonth(), d));
        cal += '<span class="d' + (on[di] ? ' on' : '') + (di === todayIso ? ' today' : '') + '"' + (on[di] ? ' aria-label="' + d + ': ' + plural(on[di], 'session') + '"' : '') + '>' + d + '</span>';
      }
      var monthCount = all.filter(function (r) { return r.date.slice(0, 7) === iso(first).slice(0, 7); }).length;
      return '<div class="screen"><h1 class="display xl">Progress</h1>' + tiles + movingCard() +
        '<section class="card"><div class="between"><button class="icon-btn" data-act="cal" data-m="' + (off - 1) + '" aria-label="Previous month">' + ic('back') + '</button>' +
        '<div class="stack tight" style="align-items:center"><p class="label">' + esc(fmtMonth.format(first)) + '</p><p class="meta">' + plural(monthCount, 'session') + '</p></div>' +
        '<button class="icon-btn" data-act="cal" data-m="' + (off + 1) + '" aria-label="Next month"' + (off >= 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('chev') + '</button></div>' +
        '<div class="cal">' + cal + '</div></section>' +
        weeklyChart() + weightCard() + loadsCard() + historyCard() + '</div>';
    }
  };

  // WHO 2020: 150 to 300 minutes of moderate activity a week for adults
  function movingCard() {
    var wkIso = iso(monday(new Date())), train = 0, walk = 0;
    S.sessions.forEach(function (r) { if (r.date >= wkIso) train += r.sec / 60; });
    Object.keys(S.walks || {}).forEach(function (d) { if (d >= wkIso) walk += S.walks[d]; });
    var total = Math.round(train + walk), pct = Math.min(100, total / 150 * 100);
    var todayWalk = (S.walks || {})[iso()] || 0;
    return '<section class="card"><div class="between"><p class="label">Moving minutes this week</p><p class="meta num">' + total + ' of 150</p></div>' +
      '<div class="pl-bar" role="img" aria-label="' + total + ' of 150 minutes"><i style="width:' + pct + '%"></i></div>' +
      '<p class="small">Workouts ' + Math.round(train) + ' min · walks ' + Math.round(walk) + ' min. The WHO advises 150 to 300 minutes a week; brisk walking counts.</p>' +
      '<div class="rowx wrap"><span class="meta">Log a walk today' + (todayWalk ? ' (' + todayWalk + ' min so far)' : '') + ':</span>' +
      [10, 20, 30].map(function (m) { return '<button class="toggle" data-act="walk" data-m="' + m + '">+' + m + ' min</button>'; }).join('') +
      (todayWalk ? '<button class="toggle" data-act="walk" data-m="0">Clear</button>' : '') + '</div></section>';
  }

  function weeklyChart() {
    var wk = monday(new Date()), weeks = [];
    for (var i = 7; i >= 0; i--) {
      var a = addDays(wk, -7 * i), b = addDays(a, 7), ai = iso(a), bi = iso(b);
      var sec = S.sessions.filter(function (r) { return r.date >= ai && r.date < bi; }).reduce(function (x, r) { return x + r.sec; }, 0);
      weeks.push({ label: fmtShort.format(a), min: Math.ceil(sec / 60) });
    }
    var max = Math.max.apply(null, weeks.map(function (w) { return w.min; }));
    if (!max) return '<section class="card"><p class="label">Minutes per week</p><p class="empty">Your first session will show up here.</p></section>';
    var Wd = 340, Hh = 150, top = 22, bottom = 22, step = Wd / 8, bw = 24;
    var nice = Math.max(10, Math.ceil(max / 10) * 10);
    var svg = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + Hh + '" role="img" aria-label="Minutes trained per week, last 8 weeks">';
    svg += '<line class="grid" x1="0" x2="' + Wd + '" y1="' + (Hh - bottom) + '" y2="' + (Hh - bottom) + '"/>';
    weeks.forEach(function (w, i) {
      var h = (Hh - top - bottom) * w.min / nice, x = i * step + (step - bw) / 2, y = Hh - bottom - h;
      if (w.min) svg += '<rect class="bar' + (i === 7 ? '' : ' dim') + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(2, h) + '" rx="5"/>';
      if (w.min) svg += '<text class="val" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + w.min + '</text>';
      svg += '<text x="' + (x + bw / 2) + '" y="' + (Hh - 6) + '" text-anchor="middle">' + esc(w.label) + '</text>';
    });
    svg += '</svg>';
    return '<section class="card"><div class="between"><p class="label">Minutes per week</p><p class="meta">Week of</p></div>' + svg + '</section>';
  }

  function weightCard() {
    var u = S.settings.units, ws = S.weights;
    var form = '<form class="inline-form" data-form="weight"><label for="w-in" class="sr">Weight in ' + u + '</label><input class="input" id="w-in" inputmode="decimal" placeholder="Today, in ' + u + '" autocomplete="off"><button class="btn small" type="submit">Log</button></form>';
    if (!ws.length) return '<section class="card"><p class="label">Weight</p><p class="empty">Log your weight once a week, same time of day, to see the trend.</p>' + form + '</section>';
    var lastW = ws[ws.length - 1], firstW = ws[0], ch = lastW.kg - firstW.kg;
    var chart = '';
    if (ws.length >= 2) {
      var pts = ws.slice(-12), Wd = 340, Hh = 140, padL = 8, padR = 40, top = 14, bottom = 22;
      var vals = pts.map(function (x) { return kgShow(x.kg); }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      if (hi - lo < 2) { lo -= 1; hi += 1; }
      var X = function (i) { return padL + (Wd - padL - padR) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)); };
      var Y = function (v) { return top + (Hh - top - bottom) * (1 - (v - lo) / (hi - lo)); };
      var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join('');
      var area = line + 'L' + X(vals.length - 1).toFixed(1) + ',' + (Hh - bottom) + 'L' + X(0).toFixed(1) + ',' + (Hh - bottom) + 'Z';
      chart = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + Hh + '" role="img" aria-label="Weight trend">' +
        '<line class="grid" x1="0" x2="' + Wd + '" y1="' + (Hh - bottom) + '" y2="' + (Hh - bottom) + '"/>' +
        '<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
        '<circle class="dot" cx="' + X(vals.length - 1) + '" cy="' + Y(vals[vals.length - 1]) + '" r="4.5"/>' +
        '<text class="val" x="' + (X(vals.length - 1) + 8) + '" y="' + (Y(vals[vals.length - 1]) + 4) + '">' + vals[vals.length - 1] + '</text>' +
        '<text x="' + X(0) + '" y="' + (Hh - 6) + '">' + esc(fmtShort.format(fromIso(pts[0].date))) + '</text>' +
        '<text x="' + X(vals.length - 1) + '" y="' + (Hh - 6) + '" text-anchor="end">' + esc(fmtShort.format(fromIso(pts[pts.length - 1].date))) + '</text></svg>';
    }
    var chTxt = Math.abs(ch) < 0.05 ? 'No change since ' + fmtShort.format(fromIso(firstW.date)) : (ch > 0 ? '+' : '−') + Math.abs(kgShow(Math.abs(ch))) + ' ' + u + ' since ' + fmtShort.format(fromIso(firstW.date));
    return '<section class="card"><div class="between"><p class="label">Weight</p><p class="meta">' + esc(chTxt) + '</p></div>' +
      '<p class="display m ink num">' + kgShow(lastW.kg) + ' ' + u + '</p>' + chart + form + '</section>';
  }

  function loadsCard() {
    var latest = {};
    S.sessions.forEach(function (r) { for (var k in r.loads || {}) latest[k] = { kg: r.loads[k], date: r.date }; });
    var ids = Object.keys(latest);
    if (!ids.length) return '';
    return '<section class="card"><p class="label">Dumbbell weights</p><div class="list">' + ids.map(function (id) {
      return '<div class="item">' + thumbHtml(id) + '<span class="grow"><b>' + esc(EX[id] ? EX[id].name : id) + '</b><span class="meta">' + esc(fmtShort.format(fromIso(latest[id].date))) + '</span></span><span class="dose">' + kgShow(latest[id].kg) + ' ' + S.settings.units + '</span></div>';
    }).join('') + '</div></section>';
  }

  function historyCard() {
    var last = S.sessions.slice(-8).reverse();
    if (!last.length) return '<section class="card"><p class="label">History</p><p class="empty">Nothing yet. Your plan is one tap away on the Plan tab.</p></section>';
    var feel = { easy: 'Too easy', right: 'About right', hard: 'Too hard' };
    return '<section class="card"><p class="label">History</p><div class="list">' + last.map(function (r) {
      return '<div class="item"><span class="grow"><b>' + esc(r.title) + '</b><span class="meta">' + esc(fmtShort.format(fromIso(r.date))) + ' · ' + mmss(r.sec) + (r.feel ? ' · ' + feel[r.feel] : '') + (r.moves < r.total ? ' · ' + r.moves + '/' + r.total + ' moves' : '') + '</span></span></div>';
    }).join('') + '</div></section>';
  }

  // ---- food ------------------------------------------------------------------------------------------
  function flags() {
    if (!S.flags) {
      var h = (S.profile && S.profile.health) || {};
      S.flags = { pregnant: !!h.pregnant, child: !!h.under18, medical: false };
    }
    return S.flags;
  }
  function foodDay(d) {
    if (!S.food[d]) S.food[d] = { water: 0, meals: [] };
    return S.food[d];
  }
  SCREENS.food = {
    title: function () { return 'Food'; },
    html: function () {
      var f = flags(), any = f.pregnant || f.child || f.medical, today = iso();
      var flagBox = '<details class="card"' + (any ? ' open' : '') + '><summary class="label" style="cursor:pointer;min-height:24px">Before you track food</summary>' +
        '<p class="small">Tick any that apply. They change what this page shows.</p><div class="stack tight">' +
        [['pregnant', 'Pregnant or breastfeeding'], ['child', 'Under 18'], ['medical', 'A medical condition that affects what I eat']].map(function (x) {
          return '<div class="set-row"><div><b>' + x[1] + '</b></div><button class="switch" role="switch" data-act="flag" data-k="' + x[0] + '" aria-checked="' + !!f[x[0]] + '" aria-label="' + x[1] + '"></button></div>';
        }).join('') + '</div></details>';
      if (any) {
        return '<div class="screen"><div class="stack tight"><h1 class="display xl">Food</h1><p class="label">' + esc(fmtLong.format(new Date())) + '</p></div>' +
          '<div class="card"><p class="note">For a diet or a medical question, talk to a dietitian (diëtist) or your doctor (huisarts) first.</p>' +
          '<p class="lead">Food needs are different in pregnancy, while growing up, and with some conditions. A plan for that should come from someone who knows your health.</p></div>' +
          flagBox + '</div>';
      }
      var fd = foodDay(today);
      var glasses = '';
      for (var g = 1; g <= 8; g++) glasses += '<button class="glass" data-act="water" data-n="' + g + '" aria-pressed="' + (fd.water >= g) + '" aria-label="' + g + ' glass' + (g > 1 ? 'es' : '') + '">' + ic('glass') + '</button>';
      var meals = fd.meals.map(function (m, i) {
        return '<div class="meal"><div class="meal-top"><span class="meta num">' + esc(m.t) + '</span><b>' + esc(m.text) + '</b>' +
          '<button class="icon-btn" data-act="meal-del" data-i="' + i + '" aria-label="Remove ' + esc(m.text) + '">' + ic('close') + '</button></div>' +
          '<div class="toggles"><button class="toggle" data-act="meal-tag" data-i="' + i + '" data-k="protein" aria-pressed="' + !!m.protein + '">' + ic('egg') + 'Protein</button>' +
          '<button class="toggle" data-act="meal-tag" data-i="' + i + '" data-k="veg" aria-pressed="' + !!m.veg + '">' + ic('leaf') + 'Vegetables</button></div></div>';
      }).join('');
      var pN = fd.meals.filter(function (m) { return m.protein; }).length, vN = fd.meals.filter(function (m) { return m.veg; }).length;
      var week = [];
      for (var i = 6; i >= 0; i--) {
        var di = iso(addDays(new Date(), -i)), x = S.food[di];
        week.push({ d: di, water: x ? x.water : 0, meals: x ? x.meals.length : 0 });
      }
      var wkRows = week.filter(function (x) { return x.water || x.meals; });
      return '<div class="screen"><div class="stack tight"><h1 class="display xl">Food</h1><p class="label">' + esc(fmtLong.format(new Date())) + '</p></div>' +
        '<section class="card"><div class="between"><p class="label">Water</p><p class="meta num">' + fd.water + ' of 8 glasses</p></div><div class="glasses">' + glasses + '</div></section>' +
        '<section class="card"><div class="stack tight"><p class="label">Meals today</p>' + (fd.meals.length ? '<p class="meta">' + plural(fd.meals.length, 'meal') + ': ' + pN + ' with protein, ' + vN + ' with vegetables</p>' : '') + '</div>' +
        (meals ? '<div class="list">' + meals + '</div>' : '<p class="empty">Write down what you eat. Just the food, no counting.</p>') +
        '<form class="inline-form" data-form="meal"><label for="meal-in" class="sr">What did you eat?</label><input class="input" id="meal-in" placeholder="What did you eat?" autocomplete="off" maxlength="120"><button class="btn small" type="submit" aria-label="Add meal">' + ic('plus') + '</button></form></section>' +
        (wkRows.length > 1 ? '<section class="card"><p class="label">Last 7 days</p><div class="list">' + wkRows.reverse().map(function (x) {
          return '<div class="item" style="min-height:48px"><span class="grow"><b>' + esc(fmtLong.format(fromIso(x.d))) + '</b></span><span class="meta">' + x.water + ' glasses · ' + plural(x.meals, 'meal') + '</span></div>';
        }).join('') + '</div></section>' : '') +
        '<div class="card quiet"><p class="small">General habits, not a diet. Frank is a sports nutritionist: for a plan made for you, ask him in person.</p>' +
        '<a class="link" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Message Frank</a></div>' +
        flagBox + '</div>';
    }
  };

  // ---- frank and settings -------------------------------------------------------------------------
  SCREENS.frank = {
    title: function () { return 'Frank'; },
    html: function () {
      var p = S.profile, st = S.settings;
      var wa = FR.whatsapp ? 'https://wa.me/' + FR.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi Frank, I train with your app and I would like a session with you.') : '';
      var method = [
        ['ESSENTiALS', 'Scapula and hips first. Get these two moving well and the rest has a base to build on.'],
        ['CHANGE THE METHOD, ELEVATE THE RESULT', 'The same move on a heel wedge or a balance pad teaches your body something new.'],
        ['GRAViTY', 'Load is a tool. Rings and dumbbells add weight once the pattern is clean.'],
        ['NOT ONLY A TRAINER, BUT PURPOSELY AN EDUCATOR', 'Every exercise comes with its why, so you understand what you train.']
      ];
      var settings = [
        ['sound', 'Beeps', 'Countdown beeps for the last three seconds.'],
        ['voice', 'Voice coach', 'Calls out each move, rest and halfway.'],
        ['vibrate', 'Vibration', 'A buzz when a move or rest starts (Android).']
      ].map(function (x) {
        return '<div class="set-row"><div><b>' + x[1] + '</b><span class="meta">' + x[2] + '</span></div><button class="switch" role="switch" data-act="setting" data-k="' + x[0] + '" aria-checked="' + !!st[x[0]] + '" aria-label="' + x[1] + '"></button></div>';
      }).join('');
      var segRow = function (k, label, vals, fmt, sub) {
        return '<div class="set-row"><div><b>' + label + '</b>' + (sub ? '<span class="meta">' + sub + '</span>' : '') + '</div><span class="seg" role="group" aria-label="' + label + '">' + vals.map(function (v) {
          return '<button data-act="setting-v" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (String(st[k]) === String(v)) + '">' + fmt(v) + '</button>';
        }).join('') + '</span></div>';
      };
      var standalone = (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) || W.navigator.standalone;
      var install = (!standalone && !framed) ? '<section class="card"><p class="label">Put it on your home screen</p>' +
        (deferredInstall ? '<button class="btn block" data-act="install">Install the app</button>' :
          '<p class="small">iPhone: tap the Share button in Safari, then <b>Add to Home Screen</b>. Android: open the browser menu and tap <b>Install app</b>.</p>') + '</section>' : '';
      var health = p && p.health ? Object.keys(p.health).filter(function (k) { return p.health[k]; }) : [];
      return '<div class="screen"><div class="frank-hero"><img src="' + img('img/wellness-4.jpg') + '" alt="Frank\'s graphic: Not only a trainer, but purposely an educator"></div>' +
        '<div class="stack tight"><h1 class="display xl">Frank</h1><p class="note s">' + esc(FR.bio) + '</p></div>' +
        '<section class="card"><p class="label">Train with Frank in person</p><p class="lead">The app teaches the method. In a session, Frank watches how you move and fixes one thing at a time.</p>' +
        '<a class="btn block" href="' + FR.dm + '" target="_blank" rel="noopener">' + ic('msg') + 'Message on Instagram</a>' +
        (wa ? '<a class="btn two block" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '<div class="between"><span class="handle">@' + esc(FR.handle) + '</span><button class="link" data-act="copy" data-v="@' + esc(FR.handle) + '">' + ic('copy') + 'Copy</button></div></section>' +
        '<section class="stack"><p class="label">The method</p><div class="list">' + method.map(function (m) {
          return '<div class="method"><p class="display s">' + m[0] + '</p><p class="small">' + m[1] + '</p></div>';
        }).join('') + '</div></section>' +
        membershipCard() +
        '<section class="card"><p class="label">Your plan</p>' + (p ?
          '<p class="lead">' + WBF.GOALS[p.goal].name + ' · ' + WBF.LEVELS[p.level] + ' · ' + p.days + ' days a week' + (p.round > 1 ? ' · block ' + p.round : '') + '</p>' +
          '<p class="meta">Started ' + esc(fmtShort.format(fromIso(p.start))) + '. Intensity ' + Math.round((S.adjust || 1) * 100) + '%: it follows your answers to "How did that feel?"</p>' +
          (health.length ? '<p class="callout">You answered yes to a health question. Check with your doctor and tell Frank before training hard.</p>' : '') +
          '<button class="btn two block" data-act="ob-edit">Change my plan</button>'
          : '<p class="lead">No plan yet.</p><button class="btn block" data-act="ob-start">Build my plan</button>') + '</section>' +
        '<section class="card"><p class="label">Workout settings</p><div class="list">' + settings +
        segRow('rest', 'Rest', [0, 15, 30, 45], function (v) { return v ? v + 's' : 'Auto'; }, 'Between moves') +
        segRow('ready', 'Get ready', [5, 10, 15], function (v) { return v + 's'; }, 'Before the first move') +
        segRow('units', 'Units', ['kg', 'lb'], function (v) { return v; }) + '</div></section>' +
        install +
        '<section class="card"><p class="label">The science</p><p class="small">How the plans follow the research on strength, cardio, balance and safety, with every source.</p>' +
        '<button class="btn two block" data-act="science">Why the plans work</button></section>' +
        '<section class="card quiet"><p class="label">For Frank</p><p class="small">Write sessions for your clients and send them as a link.</p>' +
        '<button class="btn two block" data-act="coach">Coach tools</button></section>' +
        '<section class="card quiet"><p class="label">Your data</p><p class="small">Everything you enter stays on this phone. Nothing is sent to Frank or anyone else. Clearing your browser data clears it too.</p>' +
        '<button class="link" data-act="reset">Delete my data and start over</button></section>' +
        '</div>';
    }
  };

  function membershipCard() {
    var st = status(), body;
    if (st === 'client') body = '<p class="lead">You train with Frank. His sessions show up on your plan, and the whole app is open to you.</p>';
    else if (st === 'member') body = '<p class="lead">You\'re a member. Thank you.</p>';
    else if (st === 'trial') body = '<p class="lead">Free trial: ' + plural(daysLeft(), 'day') + ' left.</p><button class="btn two block" data-act="paywall">See membership</button>';
    else if (st === 'ended') body = '<p class="lead">Your free trial has ended.</p><button class="btn block" data-act="paywall">Become a member</button>';
    else body = '<p class="lead">Your ' + BILL.trialDays + '-day free trial starts with your first workout. Then ' + esc(BILL.price) + ' a ' + BILL.period + '.</p>';
    if (st !== 'client') body += '<button class="link" data-act="join">I\'m one of Frank\'s clients</button>';
    return '<section class="card"><p class="label">Membership</p>' + body + '</section>';
  }

  function paywall(ended) {
    var link = BILL.paymentLink;
    openSheet('<div class="sheet-body"><div class="top-bar"><p class="label">Membership</p><button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<h2 class="display">' + (ended ? 'Keep training' : 'Train with Frank\'s method') + '</h2>' +
      '<p class="lead">' + (ended ? 'Your ' + BILL.trialDays + '-day free trial has ended. A membership keeps your plan going.' : 'Everything in the app, for as long as you train.') + '</p>' +
      '<ul class="bul"><li>A 4-week plan built for your goal and level, adjusted after every session</li><li>' + Object.keys(EX).length + ' moves with 3D demos, cues and the why</li>' +
      '<li>Frank\'s programs: Essentials, Change the method, Gravity</li><li>Progress, weight, food and water tracking</li></ul>' +
      '<p class="display m ink num">' + esc(BILL.price) + ' <span class="meta">a ' + BILL.period + ', cancel any time</span></p>' +
      (link ? '<a class="btn block" href="' + esc(link) + '" target="_blank" rel="noopener">Become a member</a>'
            : '<button class="btn block" disabled style="opacity:.45">Become a member</button><p class="meta">Payments aren\'t switched on in this preview yet.</p>') +
      '<button class="btn two block" data-act="join">I\'m one of Frank\'s clients</button></div>');
  }

  SCREENS.join = {
    title: function () { return 'Frank\'s clients'; },
    html: function () {
      return '<div class="screen bare"><div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button><p class="label">Frank\'s clients</p><span style="width:44px"></span></div>' +
        '<h1 class="display xl">Sessions from Frank</h1>' +
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
      return '<div class="screen bare"><div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button><p class="label">From Frank</p><span style="width:44px"></span></div>' +
        '<h1 class="display xl">Sessions from Frank</h1><div class="list">' + S.inbox.map(function (sp) {
          var s = WBF.plan.custom(sp), first = mainMoves(s)[0];
          return '<button class="item" data-act="open-coach" data-id="' + sp.i + '">' + (first ? thumbHtml(first.ex) : '') + '<span class="grow"><b>' + esc(sp.t) + '</b><span class="meta">' +
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
        '<div class="stack tight"><h1 class="display xl">Why the plans work</h1><p class="lead">' + esc(SC.intro) + '</p></div>' +
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
    return '<div class="top-bar"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button><p class="label">' + esc(label) + '</p><span style="width:44px"></span></div>';
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
        '<div class="stack tight"><h1 class="display xl">Your clients\' sessions</h1>' +
        '<p class="lead">Build a session from the ' + Object.keys(EX).length + ' moves, then send it as a link. It opens in your client\'s app with the 3D demos, timers and voice coach.</p></div>' +
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
    openSheet('<div class="sheet-body"><div class="top-bar"><p class="label">Add a move</p><button class="icon-btn" data-act="close" aria-label="Done">' + ic('check') + '</button></div>' +
      '<div class="field"><label for="pick-q" class="sr">Search moves</label><input class="input" id="pick-q" type="search" placeholder="Search moves" autocomplete="off"></div>' +
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
    openSheet('<div class="sheet-body"><div class="top-bar"><p class="label">Send to ' + esc(spec.c || 'your client') + '</p><button class="icon-btn" data-act="close" aria-label="Close">' + ic('close') + '</button></div>' +
      '<h2 class="display m">' + esc(spec.t) + '</h2>' +
      '<a class="btn block" href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + ic('msg') + 'Send on WhatsApp</a>' +
      '<div class="field"><label for="send-link">Link</label><input class="input" id="send-link" readonly value="' + esc(link) + '"></div>' +
      '<button class="btn two block" data-act="copy" data-v="' + esc(link) + '">' + ic('copy') + 'Copy the link</button>' +
      '<p class="small">When ' + esc(spec.c || 'your client') + ' opens the link on their phone, the session appears on their plan under From Frank. If it opens in a browser instead, they can paste it in the app: Frank tab, I\'m one of Frank\'s clients.</p></div>');
    var inp = $('#send-link', overlay);
    if (inp) inp.addEventListener('focus', function () { inp.select(); });
  }

  // ---- actions ------------------------------------------------------------------------------------------
  function newDraft() {
    var p = S.profile;
    return p ? JSON.parse(JSON.stringify(p)) : { goal: null, level: null, days: 3, kit: WBF.DEFAULT_KIT.slice(), health: {}, name: '', kg: null };
  }
  function obGo(step) { replaceTop('onboard', { step: step }); }
  function replaceTop(name, params) { stack[stack.length - 1] = { name: name, params: params }; render(true); }
  function readObInputs() {
    var n = $('#ob-name'), k = $('#ob-kg');
    if (n) draft.name = n.value.trim().slice(0, 40);
    if (k) draft.kg = k.value ? toKg(k.value) : null;
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
    'ob-start': function () { draft = newDraft(); stack = [{ name: 'onboard', params: { step: 0 } }]; render(true); },
    'ob-edit': function () { draft = newDraft(); go('onboard', { step: 0 }); },
    'ob-back': function () {
      var st = cur().params.step || 0;
      if (st > 0) { readObInputs(); obGo(st - 1); }
      else if (stack.length > 1) back();
      else { stack = [{ name: S.profile ? 'plan' : 'welcome', params: {} }]; render(true); }
    },
    'ob-pick': function (el) {
      var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
      draft[k] = k === 'days' ? +v : v;
      obGo((cur().params.step || 0) + 1);
    },
    'ob-kit': function (el) {
      var v = el.getAttribute('data-v'), i = draft.kit.indexOf(v);
      if (i === -1) draft.kit.push(v); else draft.kit.splice(i, 1);
      el.setAttribute('aria-checked', String(i === -1));
    },
    'ob-age': function (el) {
      readObInputs();
      var v = el.getAttribute('data-v');
      draft.age = draft.age === v ? null : v;
      obGo(5);
    },
    'ob-health': function (el) {
      draft.health[el.getAttribute('data-k')] = el.getAttribute('data-v') === '1';
      var y = W.scrollY; obGo(4); W.scrollTo(0, y);
    },
    'ob-next': function () {
      var st = cur().params.step || 0;
      if (st === 0 && !draft.goal) return toast('Pick a goal first');
      if (st === 1 && !draft.level) return toast('Pick a level first');
      readObInputs();
      obGo(st + 1);
    },
    units: function (el) {
      readObInputs();
      S.settings.units = el.getAttribute('data-v'); save();
      if (cur().name === 'onboard') obGo(cur().params.step); else render(false);
    },
    'ob-finish': function () {
      readObInputs();
      var old = S.profile;
      var changed = !old || old.goal !== draft.goal || old.level !== draft.level || +old.days !== +draft.days || String(old.kit) !== String(draft.kit) || old.age !== draft.age;
      draft.days = +draft.days || 3;
      if (changed) { draft.start = iso(); draft.round = old ? (old.round || 1) : 1; S.done = {}; }
      if (draft.kg && (!S.weights.length || Math.abs(S.weights[S.weights.length - 1].kg - draft.kg) > 0.01)) {
        S.weights = S.weights.filter(function (w) { return w.date !== iso(); });
        S.weights.push({ date: iso(), kg: Math.round(draft.kg * 10) / 10 });
      }
      S.profile = draft;
      S.flags = null; flags();
      save();
      if (changed) obGo(6);
      else { tab('frank'); toast('Saved'); }
    },
    'ob-go': function () { var d = nextDay(); if (d) { tab('plan'); begin(session(d.workoutId, d)); } },
    'ob-plan': function () { tab('plan'); },
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
    paywall: function () { paywall(status() === 'ended'); },
    coach: function () { go('coach', {}); },
    science: function () { go('science', {}); },
    cite: function (el) {
      var t = document.getElementById('src-' + el.getAttribute('data-n'));
      if (t) { t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); t.classList.add('hit'); setTimeout(function () { t.classList.remove('hit'); }, 1600); }
    },
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
      render(true); toast('Block ' + S.profile.round + ' starts today');
    },
    area: function (el) { cur().params.area = el.getAttribute('data-area'); render(false); },
    moves: function () { go('moves', {}); },
    'moves-area': function (el) { cur().params.area = el.getAttribute('data-area'); render(false); },
    ex: function (el) { exerciseSheet(el.getAttribute('data-id')); },
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
      exerciseSheet(PL.s.steps[PL.i].ex, { player: true, onClose: function () { if (PL) { PL.paused = wasPaused; PL.last = now(); } } });
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
      if (m) toast('Walk logged: ' + m + ' min');
    },
    flag: function (el) {
      var f = flags(), k = el.getAttribute('data-k');
      f[k] = !f[k]; save(); render(false);
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
      S.settings[k] = k === 'units' ? v : +v; save(); render(false);
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
      }, { body: 'Your plan, sessions, weights and food notes on this phone will be removed. This can\'t be undone.' });
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var f = A[el.getAttribute('data-act')];
    if (!f) return;
    if (/^pl-/.test(el.getAttribute('data-act')) && !PL) return;
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
    if (!WBF.fig3d || use3d() || !WBF.fig3d.init()) return;
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
    setTimeout(function () { toast('New session from Frank: ' + spec.t); }, 300);
    return true;
  }
  W.addEventListener('hashchange', function () { if (fromLink()) render(true); });
  fromLink();
  if (W.THREE && WBF.fig3d) WBF.fig3d.init();
  render(true);
  W.WBF.app = { state: function () { return S; }, go: go, tab: tab };
})(window);
