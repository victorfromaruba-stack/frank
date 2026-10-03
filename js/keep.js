/* Wellness by Frank: keep my progress. A backup file and a move link (#move.<code>) take a person's plan, history, free
   trial, Frank's sessions and Frank's own saved sessions to another browser or phone (Me > Your data, and "I already have
   a plan" on Welcome). Instagram's, Facebook's and TikTok's own browsers get a warning on Welcome, a phone gets a Home
   Screen sheet once after a workout, the browser is asked to keep the data, and once FRANK.home is set (js/programs.js)
   every tab offers to take the progress to Frank's new address. A move link holds health answers: they ride after the
   '#', which a browser never sends to a server, and the app sends them nowhere. Only the person shares the link.
   A module: it plugs into js/app.js through WBF.ext (.claude/skills/frank-module). */
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};

  (WBF.ext = WBF.ext || []).push(function keep(app) {
    var u = app.util, esc = u.esc, KEY = 'keep';
    app.data(KEY);                    // the module's data: S.keep in wbf.v1

    var APP = 'wellness-by-frank', FILE_V = 1, DATA_V = 2;
    // a backup file, a move link's code (a longer one gets the file instead), the data a code may unpack to
    var MAX_FILE = 2 * 1024 * 1024, MAX_LINK = 60 * 1024, MAX_DATA = 4 * 1024 * 1024, MAX_CODE = 3 * 1024 * 1024;
    var UNDO_MS = 10000;
    var SAY = {
      notOurs: 'That isn\'t a backup from this app.',
      tooBig: 'That file is too big to be a backup from this app.',
      badLink: 'That link didn\'t work. Make a new one on your other phone.',
      noLink: 'That isn\'t a move link. Copy it again on your other phone.',
      newer: 'This plan is from a newer version of the app. Update the app first: close it and open it again.',
      noUnpack: 'This browser can\'t open that link. Use a backup file instead.',
      noStore: 'This browser can\'t keep your plan: it\'s in private mode or blocks storage. Open the app in a normal window.',
      privacy: 'Anyone with this link can see your answers. Keep it to yourself.'
    };

    // ---- the module's data ------------------------------------------------------------------------------------------
    // persisted: the day the browser said it keeps the data; backupAt: the last backup file; installAsked: the day the Home
    // Screen sheet came up by itself (once); movedTo: the new address progress went to; saveFailed: the last day the phone
    // refused a save
    function mine() { return app.data(KEY, function () { return { v: 1, persisted: null, backupAt: null, installAsked: null, movedTo: null, saveFailed: null }; }); }
    function kept() { return app.state()[KEY] || {}; }

    // a callback the seam doesn't guard (a file read, a promise): its error stays here, and the console says so
    function safely(where, fn) {
      return function () {
        try { return fn.apply(this, arguments); } catch (e) {
          try { console.error('Wellness by Frank: module keep failed (' + where + ')', e); } catch (x) { /* no console */ }
        }
      };
    }

    // ---- this browser -------------------------------------------------------------------------------------------------
    function agent() { return (W.navigator && W.navigator.userAgent) || ''; }
    function ios() { return /iPhone|iPad|iPod/.test(agent()) || (/Macintosh/.test(agent()) && (W.navigator.maxTouchPoints || 0) > 1); }
    function android() { return /Android/.test(agent()); }
    // Instagram's, Facebook's or TikTok's own browser: it keeps its own storage, apart from Safari's and Chrome's
    function inApp() {
      var m = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly/.exec(agent());
      return !m ? '' : m[0] === 'Instagram' ? 'Instagram' : /^FB/.test(m[0]) ? 'Facebook' : 'TikTok';
    }
    var framed = (function () { try { return W.self !== W.top; } catch (e) { return true; } })();
    // opened from the Home Screen (iPhone) or as an installed app (Android)
    function installed() {
      try { return !!((W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) || W.navigator.standalone === true); } catch (e) { return false; }
    }
    // false once the phone refused a save, or when storage is blocked: a plan brought here would be gone on the next visit
    var failing = false;
    function canKeep() { try { return !failing && !!W.localStorage; } catch (e) { return false; } }
    function here() { return W.location.href.split(/[?#]/)[0]; }
    // Frank's new address (FRANK.home) when this is the old one; null before the move, and at the new address itself
    function home() {
      var h = WBF.FRANK && WBF.FRANK.home;
      if (!h || typeof h !== 'string') return null;
      try {
        var url = new URL(h, W.location.href);
        return /^https?:$/.test(url.protocol) && url.origin !== W.location.origin ? url.href.split('#')[0] : null;
      } catch (e) { return null; }
    }

    // ---- move codes: 'z' and the data packed with deflate-raw, or 'j' and plain JSON where a browser can't pack ------------
    function toB64(bytes) {
      var bin = '';
      for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function fromB64(s) {
      var b = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var bin = atob(b), out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    // bytes through a (de)compression stream; it stops, rejected, once the result passes max (a code made to blow up)
    function pipe(bytes, stream, max) {
      var reader = new Blob([bytes]).stream().pipeThrough(stream).getReader(), parts = [], n = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var out = new Uint8Array(n), at = 0;
            parts.forEach(function (p) { out.set(p, at); at += p.length; });
            return out;
          }
          n += r.value.length;
          if (n > max) { var c = reader.cancel(); if (c && c.catch) c.catch(function () { /* stopped anyway */ }); throw new Error('too big'); }
          parts.push(r.value);
          return pump();
        });
      }
      return pump();
    }
    // a promise of the code for obj
    function encode(obj) {
      var bytes = new TextEncoder().encode(JSON.stringify(obj));
      var plain = function () { return 'j' + toB64(bytes); };
      try {
        if (!W.CompressionStream) return Promise.resolve(plain());
        return pipe(bytes, new W.CompressionStream('deflate-raw'), MAX_DATA).then(function (z) { return 'z' + toB64(z); }, plain);
      } catch (e) { return Promise.resolve(plain()); }       // an older browser: no deflate-raw
    }
    // a promise of what a code holds, parsed; rejected with the words to show when it can't be read
    function decode(code) {
      var kind = code.charAt(0), bytes, got;
      if (code.length > MAX_CODE || (kind !== 'z' && kind !== 'j')) return Promise.reject(SAY.badLink);
      try { bytes = fromB64(code.slice(1)); } catch (e) { return Promise.reject(SAY.badLink); }
      if (kind === 'j') got = Promise.resolve(bytes);
      else if (!W.DecompressionStream) return Promise.reject(SAY.noUnpack);
      else {
        try { got = pipe(bytes, new W.DecompressionStream('deflate-raw'), MAX_DATA); } catch (e) { return Promise.reject(SAY.noUnpack); }
      }
      return got.then(function (b) {
        if (b.length > MAX_DATA) throw new Error('too big');
        return JSON.parse(new TextDecoder().decode(b));
      }).catch(function () { throw SAY.badLink; });
    }

    // ---- what comes in: checked field by field before anything changes ------------------------------------------------
    var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
    var ID = /^[A-Za-z0-9_-]{1,40}$/;
    function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
    function isDay(s) {
      var m = typeof s === 'string' && /^\d{4}-(\d{2})-(\d{2})$/.exec(s);
      return !!m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31;
    }
    function num(v, lo, hi, none) {
      v = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? +v : NaN;
      return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : none;
    }
    function whole(v, lo, hi, none) { var n = num(v, lo, hi, null); return n == null ? none : Math.round(n); }
    function text(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
    function pick(v, list, none) { return list.indexOf(v) !== -1 ? v : none; }
    function ids(v, ok, max) {
      var out = [];
      (Array.isArray(v) ? v : []).forEach(function (x) { if (typeof x === 'string' && ok(x) && out.indexOf(x) === -1 && out.length < max) out.push(x); });
      return out;
    }
    function safeKey(k) { return /^[A-Za-z0-9_.:-]{1,60}$/.test(k) && k !== '__proto__' && k !== 'constructor' && k !== 'prototype'; }
    // markup in any text or key (<script>, <img ...>, </b>): the app never writes any, so a file that holds it was made
    // to do harm. Also true for data far bigger or deeper than the app makes
    var TAG = /<\/?[A-Za-z!][^<>]*>/;
    function marked(v) {
      var n = 0;
      function walk(x, depth) {
        if (++n > 300000 || depth > 12) return true;
        if (typeof x === 'string') return TAG.test(x);
        if (!x || typeof x !== 'object') return false;
        var ks = Object.keys(x);
        for (var i = 0; i < ks.length; i++) if (TAG.test(ks[i]) || walk(x[ks[i]], depth + 1)) return true;
        return false;
      }
      return walk(v, 0);
    }
    // a value no rule here knows (a field a later version added, a module's data): plain JSON only, and small.
    // undefined: leave it out
    function plain(v, depth) {
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return isFinite(v) ? v : undefined;
      if (typeof v === 'string') return v.length <= 2000 ? v : undefined;
      if (!depth || typeof v !== 'object') return undefined;
      if (Array.isArray(v)) return v.length > 1000 ? undefined : v.map(function (x) { var y = plain(x, depth - 1); return y === undefined ? null : y; });
      var o = {}, ks = Object.keys(v);
      if (ks.length > 1000) return undefined;
      ks.forEach(function (k) { if (safeKey(k)) { var y = plain(v[k], depth - 1); if (y !== undefined) o[k] = y; } });
      return o;
    }
    // the fields of o that aren't in known, as plain values
    function extras(o, known) {
      var out = {};
      Object.keys(o).forEach(function (k) {
        if (known.indexOf(k) !== -1 || !/^[a-z][A-Za-z0-9]{0,30}$/.test(k)) return;
        var y = plain(o[k], 4);
        if (y != null) out[k] = y;
      });
      return out;
    }

    var HEALTH = WBF.PARQ.map(function (q) { return q[0]; }).concat(['pregnant', 'cleared', 'injury', 'under18']);
    var PROFILE = ['goal', 'focus', 'want', 'sex', 'birthYear', 'age', 'cm', 'kg', 'targetKg', 'health', 'injuries', 'active', 'push', 'level', 'days',
      'minutes', 'kit', 'name', 'start', 'round', 'only', 'edit', 'soreDone'];
    // undefined: not a profile the app can use
    function profileOf(p) {
      if (p == null) return null;
      if (!isObj(p) || typeof p.goal !== 'string' || !has(WBF.GOALS, p.goal)) return undefined;
      var h = isObj(p.health) ? p.health : {}, o = extras(p, PROFILE), year = new Date().getFullYear();
      o.goal = p.goal;
      o.focus = ids(p.focus, function (x) { return has(WBF.BODY_BY_ID, x); }, 8);
      if (!o.focus.length) o.focus = ['full'];
      o.want = ids(p.want, function (x) { return /^[a-z]{2,16}$/.test(x); }, 8);
      o.sex = pick(p.sex, ['m', 'f', 'x'], null);
      o.birthYear = whole(p.birthYear, year - 110, year, null);
      if (['u30', '30', '45', '60'].indexOf(String(p.age)) !== -1) o.age = p.age;     // an older profile's age band (migrate)
      o.cm = num(p.cm, 100, 250, null);
      o.kg = num(p.kg, 20, 400, null);
      o.targetKg = num(p.targetKg, 20, 400, null);
      // the health answers as they were given: one that was never answered stays open
      o.health = {};
      HEALTH.forEach(function (k) { if (typeof h[k] === 'boolean') o.health[k] = h[k]; });
      if (isDay(h.confirmed)) o.health.confirmed = h.confirmed;
      o.injuries = ids(p.injuries, function (x) { return WBF.SORE.some(function (s) { return s[0] === x; }); }, 6);
      o.active = whole(p.active, 0, 3, 1);
      o.push = whole(p.push, 0, 3, null);
      o.level = pick(p.level, ['b', 'i', 'a'], null);
      o.days = whole(p.days, 2, 6, 3);
      o.minutes = whole(p.minutes, 5, 90, 20);
      o.kit = ids(p.kit, function (x) { return WBF.KIT.some(function (k) { return k.id === x; }); }, 12);
      o.name = text(p.name, 40);
      if (isDay(p.start)) o.start = p.start;
      o.round = whole(p.round, 1, 99, 1);
      return o;
    }
    var RECORD = ['id', 'at', 'date', 'wid', 'title', 'level', 'day', 'sec', 'moves', 'total', 'feel', 'adj', 'loads', 'kcal', 'coach'];
    function sessionOf(r) {
      if (!isObj(r) || typeof r.id !== 'string' || !ID.test(r.id) || !isDay(r.date)) return null;
      var at = typeof r.at === 'string' ? Date.parse(r.at) : NaN, o = extras(r, RECORD);
      o.id = r.id; o.at = isFinite(at) ? new Date(at).toISOString() : r.date + 'T12:00:00.000Z'; o.date = r.date;
      o.wid = typeof r.wid === 'string' && (has(WBF.WORKOUT, r.wid) || /^coach:[A-Za-z0-9_-]{1,20}$/.test(r.wid)) ? r.wid : null;
      o.title = text(r.title, 80) || 'Workout';
      o.level = pick(r.level, ['b', 'i', 'a', 'f'], null);
      o.day = whole(r.day, 1, 28, null);
      o.sec = whole(r.sec, 0, 6 * 3600, 0); o.moves = whole(r.moves, 0, 999, 0); o.total = whole(r.total, 0, 999, 0);
      o.feel = pick(r.feel, ['easy', 'right', 'hard'], null);
      o.adj = num(r.adj, -0.3, 0.3, 0);
      o.loads = {};
      if (isObj(r.loads)) Object.keys(r.loads).forEach(function (k) { var kg = num(r.loads[k], 0.5, 300, null); if (has(WBF.EX, k) && kg != null) o.loads[k] = kg; });
      o.kcal = whole(r.kcal, 0, 5000, null);
      if (typeof r.coach === 'string' && ID.test(r.coach)) o.coach = r.coach;
      return o;
    }
    // a weight out of the range the app takes is left out, not moved into it
    function weightOf(w) {
      if (!isObj(w) || !isDay(w.date) || typeof w.kg !== 'number' || !(w.kg >= 20 && w.kg <= 400)) return null;
      var o = { date: w.date, kg: Math.round(w.kg * 10) / 10 };
      if (w.from === 'plan') o.from = 'plan';
      return o;
    }
    function foodDayOf(x) {
      if (!isObj(x)) return undefined;
      var meals = (Array.isArray(x.meals) ? x.meals : []).filter(isObj).slice(0, 40).map(function (m) {
        return { t: typeof m.t === 'string' && /^\d{1,2}:\d{2}$/.test(m.t) ? m.t : '', text: text(m.text, 120), protein: m.protein === true, veg: m.veg === true };
      }).filter(function (m) { return m.text; });
      return { water: whole(x.water, 0, 8, 0), meals: meals };
    }
    function walkOf(x) { return whole(x, 0, 600, 0) || undefined; }
    function daysOf(v, fn) {
      var o = {};
      if (isObj(v)) Object.keys(v).slice(0, 5000).forEach(function (d) { var x = isDay(d) ? fn(v[d]) : undefined; if (x !== undefined) o[d] = x; });
      return o;
    }
    function listOf(v, fn, max) { return (Array.isArray(v) ? v : []).slice(0, max).map(fn).filter(Boolean); }
    function settingsOf(s) {
      var o = {};
      if (!isObj(s)) return o;
      ['sound', 'voice', 'vibrate'].forEach(function (k) { if (typeof s[k] === 'boolean') o[k] = s[k]; });
      if (s.rest != null && [0, 15, 30, 45, 60].indexOf(+s.rest) !== -1) o.rest = +s.rest;
      if (s.ready != null && [5, 10, 15].indexOf(+s.ready) !== -1) o.ready = +s.ready;
      if (pick(s.units, ['kg', 'lb'], null)) o.units = s.units;
      if (pick(s.hunits, ['cm', 'ft'], null)) o.hunits = s.hunits;
      if (pick(s.coach, ['', 'm', 'f'], null) != null) o.coach = s.coach;
      return o;
    }
    function swapsOf(v) {
      var o = {};
      if (isObj(v)) Object.keys(v).forEach(function (k) { if (has(WBF.EX, k) && typeof v[k] === 'string' && has(WBF.EX, v[k])) o[k] = v[k]; });
      return o;
    }
    function doneOf(v) {
      var o = {};
      if (isObj(v)) Object.keys(v).forEach(function (k) { if (/^([1-9]|1\d|2[0-8])$/.test(k) && typeof v[k] === 'string' && ID.test(v[k])) o[k] = v[k]; });
      return o;
    }
    function idMap(v) {
      var o = {};
      if (isObj(v)) Object.keys(v).forEach(function (k) { if (ID.test(k) && typeof v[k] === 'string' && ID.test(v[k])) o[k] = v[k]; });
      return o;
    }
    // the food card's switches: an older phone kept them without 'manual'
    function flagsOf(f) {
      if (!isObj(f)) return null;
      var m = isObj(f.manual) ? f.manual : f;
      return { manual: { pregnant: m.pregnant === true, child: m.child === true, medical: m.medical === true } };
    }
    // a membership ('paid') never comes from outside: only the checkout sets it. A free trial can't have started after
    // today (another phone's clock or time zone, or a file made to give an endless trial): at the latest, today
    function accessOf(a) {
      if (!isObj(a)) return null;
      var o = extras(a, ['trialStart', 'client', 'paid']);
      if (isDay(a.trialStart)) o.trialStart = a.trialStart > u.iso() ? u.iso() : a.trialStart;
      if (a.client === true) o.client = true;
      return o;
    }
    // Frank's sessions, through the app's own check of a session from a link (cleanSpec). The app keeps the newest first;
    // max is far more than years of sessions, and the file's own size limit comes first
    function specsOf(v, max) {
      var out = [], seen = {};
      (Array.isArray(v) ? v.slice(0, max * 2) : []).forEach(function (x) {
        var s = app.cleanSpec(x);
        if (s && !seen[s.i] && out.length < max) { seen[s.i] = 1; out.push(s); }
      });
      return out;
    }
    var APP_KEYS = ['v', 'profile', 'settings', 'adjust', 'swaps', 'done', 'sessions', 'weights', 'food', 'flags', 'access', 'inbox', 'inboxDone', 'coach', 'coachMode', 'walks', 'stamp'];
    // The data in a backup or a link, made safe: every field of the app's checked, numbers kept in range, Frank's sessions
    // through cleanSpec. null: it isn't the app's data
    function clean(x) {
      var lists = ['sessions', 'weights', 'inbox'], maps = ['profile', 'settings', 'swaps', 'done', 'food', 'flags', 'access', 'inboxDone', 'coach', 'walks'];
      if (lists.some(function (k) { return x[k] != null && !Array.isArray(x[k]); }) || maps.some(function (k) { return x[k] != null && !isObj(x[k]); })) return null;
      var profile = profileOf(x.profile);
      if (profile === undefined) return null;
      var d = { v: DATA_V, profile: profile, settings: settingsOf(x.settings), adjust: num(x.adjust, 0.75, 1.3, 1), swaps: swapsOf(x.swaps), done: doneOf(x.done),
        sessions: listOf(x.sessions, sessionOf, 5000), weights: listOf(x.weights, weightOf, 5000), food: daysOf(x.food, foodDayOf), flags: flagsOf(x.flags),
        access: accessOf(x.access), inbox: specsOf(x.inbox, 5000), inboxDone: idMap(x.inboxDone), coach: { templates: specsOf((x.coach || {}).templates, 5000) },
        walks: daysOf(x.walks, walkOf) };
      // a module's data, and what a later version keeps: plain values, taken only where this phone has none (merge)
      Object.keys(x).forEach(function (k) {
        if (APP_KEYS.indexOf(k) !== -1 || k === KEY || !/^[a-z][A-Za-z0-9]{0,30}$/.test(k)) return;
        var y = plain(x[k], 6);
        if (y != null) d[k] = y;
      });
      return d;
    }
    // A backup or a code's contents: { data } made safe, or { no: the words to show }. from: 'file' or 'link'. The data
    // may still say v 1 (the app's first version, which the app reads the same way: its profile is brought up to date)
    function check(o, from) {
      var no = from === 'link' ? SAY.badLink : SAY.notOurs;
      if (!isObj(o) || o.app !== APP || typeof o.v !== 'number' || !isObj(o.data) || typeof o.data.v !== 'number') return { no: no };
      if (o.v > FILE_V || o.data.v > DATA_V) return { no: SAY.newer };
      if (o.v !== FILE_V || (o.data.v !== 1 && o.data.v !== DATA_V) || marked(o.data)) return { no: no };
      var d = clean(o.data);
      return d ? { data: d } : { no: no };
    }

    // ---- merging: this phone's data and what came in ------------------------------------------------------------------
    function dayFill(x) { return x ? (x.meals || []).length * 100 + (x.water || 0) : -1; }
    function sameSpec(a, b) { var k = function (s) { return JSON.stringify([s.t, s.n, s.r, s.f, s.rs, s.w, s.k, s.x]); }; return k(a) === k(b); }
    // anything a person would miss
    function filled(d) {
      var a = d.access || {};
      return !!(d.profile || (d.sessions || []).length || (d.weights || []).length || (d.inbox || []).length || ((d.coach || {}).templates || []).length ||
        Object.keys(d.walks || {}).length || Object.keys(d.food || {}).some(function (k) { return dayFill(d.food[k]) > 0; }) || a.trialStart || a.client || a.paid);
    }
    // The plan this phone keeps never loses what the person told the app on the other side (.claude/skills/frank-safety):
    // a yes to a health question or pregnancy comes along, as Me's switches set them (no restart, the sessions follow);
    // "Cleared by a doctor" stays only when it covered every yes, from either side; sore spots join; and the year of birth
    // that asks for more care is kept (60 and over, or maybe under 18). p: this phone's profile, changed in place
    function careful(p, q) {
      var h = p.health = isObj(p.health) ? p.health : {}, g = Object.assign({}, q.health);
      if (g.injury && g.joint == null) g.joint = true;      // the first version's injury question, as the app reads it (migrate)
      var parq = function (x) { return WBF.PARQ.some(function (k) { return x[k[0]] === true; }); };
      var clear = (!parq(h) || h.cleared === true) && (!parq(g) || g.cleared === true);
      HEALTH.forEach(function (k) { if (k !== 'cleared' && g[k] === true) h[k] = true; });
      if (parq(h) && !!h.cleared !== clear) h.cleared = clear;
      p.injuries = (p.injuries || []).concat((q.injuries || []).filter(function (x) { return (p.injuries || []).indexOf(x) === -1; }));
      // the other side's year of birth, or the one the app works out for a first version's profile (its under 18 answer,
      // its age band: migrate in js/app.js)
      var now = new Date().getFullYear(), age = WBF.plan.age;
      var year = typeof q.birthYear === 'number' ? q.birthYear : g.under18 ? now - 16 : age(q) == null ? null : now - age(q);
      if (year == null || year === p.birthYear) return;
      if ((now - year >= 60 && !(age(p) >= 60)) || (now - year <= 18 && !WBF.plan.possiblyMinor(p))) p.birthYear = year;
    }
    // the answers careful() reads, to see whether it changed any
    function answers(p) { return JSON.stringify([p.health || {}, p.injuries || [], p.birthYear]); }
    // A phone with nothing takes what came as it is. Otherwise workouts join by id, weights by date (the one that came wins
    // on the same date), food and walks by date (the fuller day), Frank's sessions and his saved ones by id. The plan, its
    // settings and its ticks stay this phone's unless it has no plan (ticks of the same plan join), with the health answers
    // of both (careful); a tick for one of Frank's sessions comes along when both have the same session. The food card's
    // switches stay on if either had them on. The free trial is the earliest of the two, client access comes from either,
    // a membership never from outside, and Coach tools stay as they are here
    function merge(mineNow, got) {
      var out = JSON.parse(JSON.stringify(mineNow));
      if (!out.profile && got.profile) {
        out.profile = got.profile; out.settings = got.settings; out.adjust = got.adjust; out.done = got.done;
      } else if (out.profile && got.profile) {
        if (out.profile.start && out.profile.start === got.profile.start) Object.keys(got.done).forEach(function (d) { if (!out.done[d]) out.done[d] = got.done[d]; });
        careful(out.profile, got.profile);
      }
      out.swaps = out.swaps || {};
      Object.keys(got.swaps).forEach(function (k) { if (!out.swaps[k]) out.swaps[k] = got.swaps[k]; });
      var seen = {};
      out.sessions.forEach(function (r) { seen[r.id] = 1; });
      got.sessions.forEach(function (r) { if (!seen[r.id]) { seen[r.id] = 1; out.sessions.push(r); } });
      out.sessions.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
      var byDate = {};
      out.weights.concat(got.weights).forEach(function (w) { byDate[w.date] = w; });
      out.weights = Object.keys(byDate).sort().map(function (d) { return byDate[d]; });
      out.food = out.food || {};
      Object.keys(got.food).forEach(function (d) { if (dayFill(got.food[d]) > dayFill(out.food[d])) out.food[d] = got.food[d]; });
      out.walks = out.walks || {};
      Object.keys(got.walks).forEach(function (d) { if (got.walks[d] > (out.walks[d] || 0)) out.walks[d] = got.walks[d]; });
      var join = function (list, more) {
        var have = {};
        list.forEach(function (s) { have[s.i] = 1; });
        return list.concat(more.filter(function (s) { return !have[s.i]; }));
      };
      out.inbox = join(out.inbox || [], got.inbox);
      out.coach = out.coach || {};
      out.coach.templates = join(out.coach.templates || [], got.coach.templates);
      out.inboxDone = out.inboxDone || {};
      Object.keys(got.inboxDone).forEach(function (i) {
        var a = out.inbox.filter(function (s) { return s.i === i; })[0], b = got.inbox.filter(function (s) { return s.i === i; })[0];
        if (!out.inboxDone[i] && a && b && sameSpec(a, b)) out.inboxDone[i] = got.inboxDone[i];
      });
      if (got.flags) {
        var m = (out.flags && out.flags.manual) || {}, g = got.flags.manual;
        out.flags = { manual: { pregnant: !!(m.pregnant || g.pregnant), child: !!(m.child || g.child), medical: !!(m.medical || g.medical) } };
      }
      var a = out.access || {}, b = got.access || {}, acc = Object.assign({}, b, a);
      delete acc.paid;
      if (a.paid) acc.paid = a.paid;
      var starts = [a.trialStart, b.trialStart].filter(isDay).sort();
      if (starts.length) acc.trialStart = starts[0];
      if (a.client || b.client) acc.client = true;
      out.access = Object.keys(acc).length ? acc : null;
      Object.keys(got).forEach(function (k) { if (APP_KEYS.indexOf(k) === -1 && k !== KEY && out[k] == null) out[k] = got[k]; });
      return out;
    }

    // ---- bringing a plan here -----------------------------------------------------------------------------------------
    var pending = null;               // a plan that came during a workout: it waits for the workout's end
    var undo = null;                  // { data, timer }: the phone as it was before a plan came, for 10 seconds
    // "28-day fat burner · 14 workouts · last on 2 Oct"
    function preview(d) {
      var parts = [], n = d.sessions.length;
      if (d.profile) parts.push('28-day ' + WBF.GOALS[d.profile.goal].plan.toLowerCase());
      parts.push(n ? u.plural(n, 'workout') : 'no workouts yet');
      if (n) parts.push('last on ' + u.fmtShort.format(u.fromIso(d.sessions.reduce(function (x, r) { return r.date > x ? r.date : x; }, ''))));
      if (d.inbox.length) parts.push(u.plural(d.inbox.length, 'session') + ' from Frank');
      if (d.coach.templates.length) parts.push(u.plural(d.coach.templates.length, 'saved session'));
      var s = parts.join(' · ');
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    function offer(res) {
      if (res.no) { app.toast(res.no); return; }
      if (!canKeep()) { app.toast(SAY.noStore); return; }
      if (app.cur().name === 'player') { pending = function () { offer(res); }; return; }
      var d = res.data, now = app.state(), body = preview(d), p = now.profile;
      // a phone with its own plan: say when the health answers that came change it
      if (filled(now)) {
        body += '. ' + (!p ? 'It\'s added to what\'s on this phone.' : answers(p) !== answers(merge(now, d).profile) ?
          'It\'s added to what\'s on this phone, and this phone keeps its own plan, with the health answers and sore spots from both.' :
          'It\'s added to what\'s on this phone, and this phone keeps its own plan.');
      }
      app.confirmBox('Bring your plan here?', 'Bring it here', function () { bring(d); }, { body: body });
    }
    function bring(d) {
      if (app.cur().name === 'player') { pending = function () { offer({ data: d }); }; return; }
      var before = JSON.parse(JSON.stringify(app.state()));
      var ok = app.replace(merge(app.state(), d));
      if (undo) clearTimeout(undo.timer);
      undo = { data: before, timer: setTimeout(function () { undo = null; if (app.cur().name === 'plan') app.refresh(); }, UNDO_MS) };
      app.tab('plan');
      if (ok) app.toast('Your plan is on this phone now.');
    }
    function receive(code) {
      decode(code).then(safely('link', function (o) { offer(check(o, 'link')); }), safely('link', function (no) { app.toast(typeof no === 'string' ? no : SAY.badLink); }));
    }
    // a move code in a link, a whole message or alone. A mail or chat app that wrapped the link carries its '#' as %23
    function codeIn(t) {
      t = String(t || '').trim().replace(/%(?:25)*23/g, '#');
      var m = t.match(/#move\.([zj][A-Za-z0-9_-]{4,})/) || t.match(/(?:^|\s)move\.([zj][A-Za-z0-9_-]{4,})/);
      return m ? m[1] : (/^[zj][A-Za-z0-9_-]{20,}$/.test(t) ? t : null);
    }
    // #move.<code>: when the app opens with it, or in a tab that has the app. The app has taken it out of the address bar
    // already, so a reload doesn't bring it twice. During a workout it waits for the end: a link never ends a workout
    function link(h) {
      if (h.indexOf('move.') !== 0) return false;
      var code = h.slice(5);
      if (!/^[zj][A-Za-z0-9_-]{4,}$/.test(code)) { setTimeout(function () { app.toast(SAY.badLink); }, 300); return true; }
      if (app.cur().name === 'player') pending = function () { receive(code); };
      else receive(code);
      return true;
    }
    app.on('boot', link);
    app.on('hash', link);

    // ---- a backup and a move link ---------------------------------------------------------------------------------------
    // what both carry: the whole saved data, less this phone's own (Coach tools stay locked until Frank types his code
    // there, this module's notes, and the stamp of the last time a whole data came here). The file also says when and
    // where it was made
    function payload(file) {
      var d = JSON.parse(JSON.stringify(app.state()));
      delete d.coachMode; delete d[KEY]; delete d.stamp;
      var o = { app: APP, v: FILE_V };
      if (file) { o.made = new Date().toISOString(); o.origin = W.location.origin; }
      o.data = d;
      return o;
    }
    function saveBackup() {
      var name = 'wellness-by-frank-' + u.iso() + '.json', blob = new Blob([JSON.stringify(payload(true))], { type: 'application/json' });
      var done = function () {
        mine().backupAt = u.iso();
        app.save();
        if (app.cur().name === 'me') app.refresh();
        app.toast('Your backup file is ready. Keep it somewhere safe.');
      };
      // an iPhone's Home Screen app can't download a file: the share sheet saves it (Save to Files)
      if (ios() && installed() && W.File && W.navigator.canShare) {
        try {
          var file = new W.File([blob], name, { type: 'application/json' });
          if (W.navigator.canShare({ files: [file] })) { W.navigator.share({ files: [file] }).then(safely('backup', done), function () { /* closed */ }); return; }
        } catch (e) { /* the download below */ }
      }
      var a = document.createElement('a'), url = URL.createObjectURL(blob);
      a.href = url; a.download = name; a.hidden = true;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);   // a phone may ask "Download?" first
      done();
    }
    function readFile(f) {
      if (f.size > MAX_FILE) { app.toast(SAY.tooBig); return; }
      var r = new FileReader();
      r.onload = safely('file', function () {
        var o = null;
        try { o = JSON.parse(String(r.result || '')); } catch (e) { /* not JSON */ }
        offer(check(o, 'file'));
      });
      r.onerror = function () { app.toast(SAY.notOurs); };
      r.readAsText(f);
    }
    // text on the clipboard, then the toast ok; where the phone won't, fail(), by default the link's field selected to
    // copy by hand
    function copy(t, ok, fail) {
      var no = fail || function () {
        var inp = document.getElementById('keep-link');
        if (inp) try { inp.focus(); inp.select(); } catch (e) { /* ignore */ }
        app.toast('Copy it from the line above.');
      };
      try { W.navigator.clipboard.writeText(t).then(function () { app.toast(ok); }, no); } catch (e) { no(); }
    }

    // ---- sheets ---------------------------------------------------------------------------------------------------------
    function closeBtn() { return '<button class="icon-btn" data-act="close" aria-label="Close">' + u.ic('close') + '</button>'; }
    function sheet(title, body) { app.openSheet('<div class="sheet-body"><div class="between"><h2 class="h2">' + title + '</h2>' + closeBtn() + '</div>' + body + '</div>'); }
    // the phone's own buttons, drawn as the person sees them
    var GLYPH = {
      share: '<path d="M12 14.5V3.5M8.5 7 12 3.5 15.5 7"/><path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5"/>',
      add: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
      menu: '<circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/>'
    };
    function glyph(name) {
      return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="' + (name === 'menu' ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-5px;color:var(--sky)">' + GLYPH[name] + '</svg>';
    }
    var moveLink = '';                // the link the move sheet shows
    var homeLink = '';                // the link the iPhone's Home Screen steps copy: '' while it's made, null when too big
    function tooBigSheet(to) {
      sheet('Save a backup instead', '<p class="lead">Your plan is too big for a link. Save a backup file, then restore it ' + (to ? 'at the new address' : 'in the other browser or on your other phone') + ': Me, Your data.</p>' +
        '<button class="btn block" data-act="keep-save">Save a backup</button>' + (to ? '<a class="btn two block" href="' + esc(to) + '">Open the new address</a>' : ''));
    }
    function moveSheet() {
      if (app.cur().name === 'player') return;
      encode(payload(false)).then(safely('move', function (code) {
        if (code.length > MAX_LINK) { tooBigSheet(''); return; }
        moveLink = here() + '#move.' + code;
        sheet('Move my plan', '<p class="lead">Open this link in the other browser, or on your other phone. Your plan and progress come along.</p>' +
          '<div class="field"><label for="keep-link">Your link</label><input class="input" id="keep-link" readonly value="' + esc(moveLink) + '"></div>' +
          '<div class="rowx"><button class="btn grow" data-act="keep-copy">Copy</button>' + (W.navigator.share ? '<button class="btn two grow" data-act="keep-share">Share</button>' : '') + '</div>' +
          '<p class="warnbox">' + esc(SAY.privacy) + '</p><p class="small">Your plan travels inside the link itself. The app sends it nowhere: only you can share it.</p>');
        var inp = document.getElementById('keep-link');
        if (inp) inp.addEventListener('focus', function () { inp.select(); });
      }));
    }
    function makeHomeLink(base) {
      homeLink = '';
      encode(payload(false)).then(safely('home', function (code) { homeLink = code.length > MAX_LINK ? null : (base || here()) + '#move.' + code; }));
    }
    // the browser an iPhone has the app open in: Chrome, Firefox and Edge on an iPhone put a website on the Home Screen
    // from their own Share button too
    function browserName() { var a = agent(); return /CriOS/.test(a) ? 'Chrome' : /FxiOS/.test(a) ? 'Firefox' : /EdgiOS/.test(a) ? 'Edge' : 'Safari'; }
    // An iPhone: the plan copied first (an app put on the Home Screen starts empty: the copied link holds the person's
    // answers, and says so), Share, Add to Home Screen, then "I already have a plan" in the new app. host: an address to
    // open in Safari first (the app moved)
    function iphoneSteps(host) {
      return '<ol class="steps"><li><span class="stack tight"><span>Copy your plan. The app on your Home Screen starts empty.</span>' +
        '<button class="btn two small" data-act="keep-copy-home" style="align-self:flex-start">Copy my plan</button><span class="small">' + esc(SAY.privacy) + '</span></span></li>' +
        (host ? '<li><span>Open Safari and go to <b>' + esc(host) + '</b>.</span></li>' : '') +
        '<li><span>Tap ' + glyph('share') + ' <b>Share</b> in ' + (host ? 'Safari' : browserName()) + '.</span></li>' +
        '<li><span>Tap ' + glyph('add') + ' <b>Add to Home Screen</b>.</span></li>' +
        '<li><span>Open Frank from your Home Screen. Tap <b>I already have a plan</b>, then <b>Paste</b>.</span></li></ol>';
    }
    // Android: the browser's own install prompt when it offers one, else its menu
    function androidSteps() {
      if (app.canInstall()) return '<button class="btn block" data-act="keep-install-now">Install the app</button>';
      return '<ol class="steps"><li><span>Open the browser\'s menu ' + glyph('menu') + '.</span></li><li><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li></ol>';
    }
    function installSheet() {
      if (ios()) makeHomeLink('');
      sheet('Keep your progress', '<p class="lead">Put Frank on your Home Screen. Browsers can clear a website\'s data; the app on your Home Screen keeps it.</p>' +
        (ios() ? iphoneSteps('') : androidSteps()));
    }

    // ---- actions --------------------------------------------------------------------------------------------------------
    app.action('keep-have', function () { app.go('keep', {}); });
    app.action('keep-save', function () { saveBackup(); });
    app.action('keep-move', function () { moveSheet(); });
    app.action('keep-copy', function () { if (moveLink) copy(moveLink, 'Link copied. Open it in the other browser.'); });
    app.action('keep-share', function () {
      if (!moveLink || !W.navigator.share) return;
      try { W.navigator.share({ title: WBF.FRANK.brand, url: moveLink }).catch(function () { /* closed */ }); } catch (e) { /* no share sheet */ }
    });
    app.action('keep-copy-home', function () {
      if (homeLink === null) { tooBigSheet(''); return; }
      if (homeLink) copy(homeLink, 'Your plan is copied. In the new app, tap I already have a plan.', function () { moveSheet(); });
    });
    app.action('keep-install', function () { installSheet(); });
    app.action('keep-install-now', function () { app.closeOverlay(); app.install(); });
    // a backup file: picked with the phone's own file picker, read here and nowhere else
    app.action('keep-restore', function () {
      if (app.cur().name === 'player') return;
      var old = document.getElementById('keep-file');
      if (old) old.remove();
      var inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'keep-file'; inp.accept = '.json,application/json';
      inp.setAttribute('aria-hidden', 'true'); inp.tabIndex = -1;
      inp.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0';
      inp.addEventListener('change', safely('file', function () {
        var f = inp.files && inp.files[0];
        inp.remove();
        if (f) readFile(f);
      }));
      document.body.appendChild(inp);
      inp.click();
    });
    app.action('keep-in', function () {
      var inp = document.getElementById('keep-in'), code = codeIn(inp ? inp.value : '');
      if (code) receive(code); else app.toast(SAY.noLink);
    });
    app.action('keep-paste', function () {
      var inp = document.getElementById('keep-in'), no = function () { if (inp) inp.focus(); app.toast('Paste the link in the box.'); };
      try {
        W.navigator.clipboard.readText().then(safely('paste', function (t) {
          if (inp) inp.value = t;
          var code = codeIn(t);
          if (code) receive(code); else app.toast(SAY.noLink);
        }), no);
      } catch (e) { no(); }
    });
    app.action('keep-undo', function () {
      if (!undo || app.cur().name === 'player') return;
      var was = undo.data;
      clearTimeout(undo.timer);
      undo = null;
      var ok = app.replace(was);
      app.tab(was.profile ? 'plan' : 'welcome');
      if (ok) app.toast('Undone. This phone is as it was.');
    });
    // the app moved: the progress goes to the new address in a move link. An iPhone's Home Screen app opens other
    // addresses in Safari, not in a new Home Screen app: there, the steps that put the new one on the Home Screen
    app.action('keep-moved', function () {
      var to = home();
      if (!to || app.cur().name === 'player') return;
      if (!filled(app.state())) { WBF.keep.leave(to); return; }
      encode(payload(false)).then(safely('moved', function (code) {
        if (code.length > MAX_LINK) { tooBigSheet(to); return; }
        mine().movedTo = to;
        app.save();
        if (ios() && installed()) {
          homeLink = to + '#move.' + code;
          sheet('Frank\'s app has moved', '<p class="lead">Put the new app on your Home Screen and bring your progress along.</p>' + iphoneSteps(new URL(to).host));
          return;
        }
        WBF.keep.leave(to + '#move.' + code);
      }));
    });

    // ---- "I already have a plan": a screen of its own, dark like Frank's clients ------------------------------------------
    app.screen('keep', {
      title: function () { return 'Bring your plan'; },
      html: function () {
        var paste = W.navigator.clipboard && W.navigator.clipboard.readText;
        var body = !canKeep() ? '<p class="warnbox">' + esc(SAY.noStore) + '</p>' :
          '<p class="lead">On your other phone or browser, go to Me and tap Move my plan. Then paste the link here.</p>' +
          '<div class="stack"><label for="keep-in" class="sr">Your move link</label>' +
          '<textarea class="input" id="keep-in" rows="3" placeholder="Paste the link here" autocapitalize="off" autocorrect="off" spellcheck="false" style="padding:14px 16px;min-height:100px;resize:vertical"></textarea>' +
          '<div class="rowx">' + (paste ? '<button class="btn two grow" data-act="keep-paste">Paste</button>' : '') + '<button class="btn grow" data-act="keep-in">Continue</button></div></div>' +
          '<div class="card quiet"><p class="small">Have a backup file instead?</p><button class="link" data-act="keep-restore">Restore from a backup</button></div>';
        return '<div class="screen bare">' + u.backBar('Bring your plan') + '<h1 class="h1">Bring your plan</h1>' + body + '</div>';
      }
    });

    // ---- cards ----------------------------------------------------------------------------------------------------------
    // where the app is now; "Bring your progress" only when this phone has some (any), as its button says
    function movedLine(to, any) { return 'It\'s at ' + new URL(to).host + ' now.' + (any ? ' Bring your progress there in one tap.' : '') + ' This copy keeps working.'; }
    function movedCard() {
      var to = home(), any = filled(app.state());
      if (!to) return null;
      return { id: 'keep-moved', priority: 95, html: '<section class="card"><p class="label">Frank\'s app has moved</p><p class="small">' + esc(movedLine(to, any)) + '</p>' +
        '<button class="btn block" data-act="keep-moved">' + (any ? 'Bring my progress' : 'Go to the new app') + '</button></section>' };
    }
    // Android: Chrome opens the same address (or the phone's browser, without Chrome)
    function chromeLink() {
      return 'intent://' + W.location.host + W.location.pathname + '#Intent;scheme=' + W.location.protocol.replace(':', '') + ';package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(here()) + ';end';
    }
    app.card('welcome.top', function () {
      var to = home(), name = inApp();
      if (to) {
        var any = filled(app.state());
        return { id: 'keep-moved', priority: 95, html: '<div class="infobox"><p><b>Frank\'s app has moved.</b> ' + esc(movedLine(to, any)) + '</p>' +
          '<button class="btn dark block" data-act="keep-moved">' + (any ? 'Bring my progress' : 'Go to the new app') + '</button></div>' };
      }
      if (!name) return null;
      // Welcome has little room: the warning and what to do in one short paragraph (Android: and one small button). The
      // coach makes room for it (app.css), so the heading stays above the buttons
      var how = ios() ? 'To keep your plan, tap <span aria-hidden="true">•••</span><span class="sr">the menu</span> then <b>' + (name === 'TikTok' ? 'Open in browser' : 'Open in external browser') + '</b>.'
        : android() ? 'To keep your plan, open the app in Chrome.' : 'Open the app in Safari or Chrome to keep your plan.';
      return { id: 'keep-inapp', priority: 50, html: '<div class="infobox"><p><b>You\'re in ' + name + '\'s browser.</b> ' + how + '</p>' +
        (android() && !ios() ? '<a class="btn dark small" style="align-self:flex-start" href="' + esc(chromeLink()) + '">Open in Chrome</a>' : '') + '</div>' };
    });
    app.html('welcome.cta', function () { return '<button class="ob-skip" data-act="keep-have">I already have a plan</button>'; });
    // what stays inside Instagram's browser, for its move cards: a plan, or Frank's sessions and access, or other progress
    function stays(name, S) {
      return 'You\'re in ' + name + '\'s browser, and ' + (S.profile ? 'your plan stays in it. Move it' : (S.inbox || []).length ? 'your sessions from Frank stay in it. Move them' :
        'your progress stays in it. Move it') + ' to Safari or Chrome.';
    }
    // the Plan: Undo for a few seconds after a plan came; the move card inside Instagram's browser once there's something
    // to keep there: a plan, or Frank's sessions and client access (his clients come by his link, never through Welcome)
    app.card('plan.top', function () {
      if (undo) {
        return { id: 'keep-undo', priority: 100, html: '<section class="card"><div class="between"><p class="small">Not what you wanted? You can undo it for a few seconds.</p>' +
          '<button class="btn two small" data-act="keep-undo">Undo</button></div></section>' };
      }
      var moved = movedCard(), name = inApp(), S = app.state();
      if (moved || !name || !filled(S)) return moved;
      return { id: 'keep-inapp', priority: 60, html: '<section class="card"><p class="label">' + (S.profile ? 'Keep your plan' : 'Keep your progress') + '</p>' +
        '<p class="small">' + esc(stays(name, S)) + '</p><button class="btn block" data-act="keep-move">Move my plan</button></section>' };
    });
    ['workouts.top', 'today.top', 'me.top', 'frank.top'].forEach(function (s) { app.card(s, movedCard); });
    // Me's "Put it on your home screen" card, in place of its own steps. An iPhone: the sheet, whose first step copies the
    // plan, since the app on the Home Screen starts empty. Inside Instagram's browser, which can't put it there: move first.
    // Elsewhere (Android, a computer) the app's own steps: an installed app there keeps the browser's data
    app.html('me.install', function () {
      var name = inApp(), S = app.state();
      if (name) {
        return filled(S) ? '<p class="small">' + esc(stays(name, S)) + '</p><button class="btn two block" data-act="keep-move">Move my plan</button>' :
          '<p class="small">' + esc('You\'re in ' + name + '\'s browser. Open the app in Safari or Chrome to keep your plan.') + '</p>';
      }
      return ios() ? '<button class="btn two block" data-act="keep-install">Show me how</button>' : '';
    });
    // Me > Your data: the backup, the move link, what the browser said about keeping the data
    app.html('me.data', function () {
      var S = app.state(), k = kept(), out = '', any = filled(S);
      // the phone refuses to save: the backup comes from what's on screen, so it holds what wasn't saved too. Whether the
      // browser protects its data from clearing doesn't matter then, so no line about it
      if (failing) return '<p class="small">Save a backup now. It holds everything on screen, also what this phone couldn\'t save.</p><button class="btn block" data-act="keep-save">Save a backup</button>';
      if (prot === true) out += '<p class="small">Protected from automatic clearing.</p>';
      else if (prot === false && any) out += '<p class="small">Not protected yet: save a backup.</p>';
      if (any) out += '<button class="btn two block" data-act="keep-save">Save a backup</button><button class="btn two block" data-act="keep-move">Move my plan</button>';
      out += '<button class="link" data-act="keep-restore">Restore from a backup</button>';
      if (k.backupAt && isDay(k.backupAt)) out += '<p class="small">Last backup: ' + esc(u.fmtShort.format(u.fromIso(k.backupAt))) + '.</p>';
      if (any) out += '<p class="small">Anyone with your backup file or move link can see your answers. Keep them to yourself.</p>';
      return out;
    });
    // the finish screen of the workout after which the Home Screen sheet came up: the way back to it
    var shownFor = null;
    app.card('done.next', function (rec) {
      if (!rec || rec.id !== shownFor || installed()) return null;
      return { id: 'keep-home', priority: 20, html: '<section class="card"><p class="label">Keep your progress</p><p class="small">Put Frank on your Home Screen. The app there keeps your plan.</p>' +
        '<button class="btn two block" data-act="keep-install">Show me how</button></section>' };
    });

    // ---- storage the browser keeps ----------------------------------------------------------------------------------------
    var prot = null, asked = false;   // prot: what the browser says (true: kept; false: it may clear it; null: can't tell)
    function storage() { return W.navigator && W.navigator.storage; }
    function protect(yes) {
      var was = prot;
      prot = !!yes;
      if (prot && !kept().persisted && filled(app.state())) { mine().persisted = u.iso(); app.save(); }
      if (was !== prot && app.cur().name === 'me') app.refresh();
    }
    // after a workout (once a visit), and on every Home Screen launch, until the browser says yes. Most browsers answer
    // without asking the person; Firefox asks
    function askKeep() {
      var st = storage();
      if (!st || !st.persist || kept().persisted || asked) return;
      asked = true;
      try { st.persist().then(safely('persist', protect), function () { /* can't tell */ }); } catch (e) { /* no answer */ }
    }
    (function measure() {
      var st = storage();
      if (st && st.persisted) try { st.persisted().then(safely('persist', protect), function () { /* can't tell */ }); } catch (e) { /* no answer */ }
      if (installed()) askKeep();
    })();

    // ---- events ---------------------------------------------------------------------------------------------------------
    // the Home Screen sheet: once, on a phone's finish screen, when the app isn't on the Home Screen yet. Not inside
    // Instagram's (Facebook's, TikTok's) browser, which can't put it there: the Plan's move card is the way out of it
    var askAfter = null;
    app.on('finish', function (rec) {
      askKeep();
      if (!kept().installAsked && (ios() || android()) && !installed() && !framed && !inApp()) askAfter = rec.id;
    });
    function autoInstall(id) {
      var o = document.getElementById('overlay');
      if (app.cur().name !== 'done' || (app.cur().params || {}).id !== id || (o && !o.hidden)) return;
      mine().installAsked = u.iso();
      app.save();
      shownFor = id;
      app.refresh();                  // the finish screen gets its card back to the sheet
      installSheet();
    }
    app.on('screen', function (name) {
      if (name === 'player') return;
      if (pending) { var go = pending; pending = null; setTimeout(go, 0); return; }
      if (askAfter && name === 'done' && (app.cur().params || {}).id === askAfter) { var id = askAfter; askAfter = null; setTimeout(function () { autoInstall(id); }, 0); }
    });
    // the phone refused a save: Me's data card offers the backup, made from what's on screen
    app.on('saved', function (ok) {
      failing = !ok;
      if (!ok) mine().saveFailed = u.iso();
    });

    // for the tests and the showcase captures: the code a move link carries, and what a link or file is checked with.
    // leave(url) goes to Frank's new address (tests replace it to see where it would go)
    WBF.keep = { encode: encode, decode: decode, check: check, merge: merge, payload: payload, leave: function (url) { W.location.href = url; } };
  });
})(window);
