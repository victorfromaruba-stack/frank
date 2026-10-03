/* Wellness by Frank: the fast start. Someone new answers eight questions (the goal, what keeps them safe, their time, kit
   and coach), sees their first week and starts Day 1. The rest comes after the first workout, one question at a time
   ("Make it yours", on the finish screen and the Plan), and Me's "Your answers" changes any answer on its own. A client
   of Frank's with no plan gets it offered as a plan for the days between his sessions. A module: it plugs into js/app.js
   through WBF.ext (.claude/skills/frank-module). */
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};

  // ---- what is asked when: change it here ---------------------------------------------------------------------------
  // Frank's decision (docs/TEXT-FOR-FRANK.md): the fitness check (how active, push-ups) up front, straight after the sore
  // spots (true), or after Day 1 (false: everyone starts at Beginner, and "Make it yours" offers it first)
  var FITNESS_FIRST = false;
  // the questions before the plan is built: the goal, then what keeps someone safe (year of birth, the health questions
  // and pregnancy, sore spots), then time and kit, and who demonstrates last (it fetches the second coach). The app refuses
  // an order without the safety questions (order() in js/app.js)
  var FIRST = ['goal', 'born', 'health', 'sore'].concat(FITNESS_FIRST ? ['active', 'pushups'] : [], ['days', 'minutes', 'kit', 'sex']);
  // every answer, in the order Me's "Your answers" lists them: its onboarding steps, and later: asked after Day 1 by
  // "Make it yours" (its id is the key in profile.asked, the day it was answered)
  var ROWS = [
    { id: 'goal', title: 'Goal', steps: ['goal'] },
    { id: 'days', title: 'Days a week', steps: ['days'] },
    { id: 'minutes', title: 'Minutes a workout', steps: ['minutes'] },
    { id: 'kit', title: 'Kit at home', steps: ['kit'] },
    { id: 'born', title: 'Year of birth', steps: ['born'] },
    { id: 'health', title: 'Health', steps: ['health'] },
    { id: 'sore', title: 'Sore spots', steps: ['sore'] },
    { id: 'coach', title: 'Coach', steps: ['sex'] },
    { id: 'body', title: 'Your body', steps: ['height', 'weight'], later: true },
    { id: 'target', title: 'Your target', steps: ['target'], later: true },
    { id: 'focus', title: 'Focus areas', steps: ['focus'], later: true },
    { id: 'want', title: 'What you want most', steps: ['want'], later: true },
    { id: 'fitness', title: 'Fitness check', steps: ['active', 'pushups'], later: !FITNESS_FIRST },
    { id: 'name', title: 'Your name', steps: ['name'], later: true }
  ];
  // the goal's line on "Your first week": what the plan does, never a result
  var GOAL_LINE = {
    fat: 'Your week mixes strength and cardio. Walks on the other days count too.',
    strength: 'Your week trains every muscle twice. Each week asks a little more.',
    move: 'Your week starts with scapula and hips. Then strength, balance and load.',
    fit: 'Your week has a bit of everything. Short sessions count.'
  };

  (WBF.ext = WBF.ext || []).push(function flow(app) {
    var u = app.util, esc = u.esc;

    function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
    function has(list, x) { return list.indexOf(x) !== -1; }
    // the weight the app knows: the last one logged, else the onboarding's
    function weightOf(p) {
      var w = app.state().weights || [], last = w.length ? w[w.length - 1].kg : null;
      return (typeof last === 'number' && last > 0 && last) || (typeof p.kg === 'number' && p.kg > 0 && p.kg) || null;
    }

    // ---- who is asked what ----------------------------------------------------------------------------------------------
    // No target weight for anyone at risk (may be under 18, pregnant, a medical condition) or in gentle mode (a PAR-Q yes
    // until a doctor clears it), nor before a weight is known. No fitness check on the card while the plan is gentle: its
    // level stays Beginner until then (.claude/skills/frank-safety). Asked each time: Me's switches change it
    function allowed(r, p, card) {
      if (r.id === 'target') return !app.atRisk(p) && !WBF.plan.avoidFor(p).gentle && !!weightOf(p);
      if (r.id === 'fitness' && card) return !WBF.plan.avoidFor(p).gentle;
      return true;
    }
    // the questions "Make it yours" still asks. None for a plan from before the fast start (no profile.asked: every answer
    // was given then), and none once the card was put away (profile.later)
    function pending(p) {
      if (!p || !isObj(p.asked) || p.later) return [];
      return ROWS.filter(function (r) { return r.later && !p.asked[r.id] && allowed(r, p, true); });
    }

    // ---- answers as Me's "Your answers" shows them: the app's words for them (util), in the units picked -----------------
    function kgText(kg) { return u.kgShow(kg) + ' ' + u.wUnit(); }
    var SHOW = {
      goal: function (p) { return (WBF.GOALS[p.goal] || WBF.GOALS.fit).name; },
      days: function (p) { return String(+p.days || 3); },
      minutes: function (p) { return String(+p.minutes || 20); },
      kit: function (p) { return u.kitWords(p); },
      born: function (p) { return p.birthYear ? String(p.birthYear) : 'Not given'; },
      health: function (p) {
        var h = p.health || {}, keys = WBF.PARQ.map(function (q) { return q[0]; }), out = [];
        if (h.pregnant) out.push('Pregnancy mode');
        if (keys.some(function (k) { return h[k]; })) out.push(WBF.plan.avoidFor(p).gentle ? 'Gentle mode' : 'Cleared by a doctor');
        if (out.length) return out.join(' · ');
        return keys.concat(['pregnant']).every(function (k) { return typeof h[k] === 'boolean'; }) ? 'None apply' : 'Not all answered';
      },
      sore: function (p) { return (p.injuries || []).length ? p.injuries.map(u.soreName).join(', ') : 'None'; },
      coach: function (p) { return p.sex === 'f' ? 'Female' : p.sex === 'm' ? 'Male' : 'Not said'; },
      body: function (p) { var kg = weightOf(p); return p.cm && kg ? u.heightShow(p.cm) + ' · ' + kgText(kg) : 'Not given'; },
      target: function (p) { return p.targetKg ? kgText(p.targetKg) : 'Not given'; },
      focus: function (p) { return u.focusWords(p); },
      want: function (p) { var n = (p.want || []).length; return n ? n + ' picked' : 'None picked'; },
      fitness: function (p) { return WBF.LEVELS[WBF.plan.levelFor(p)]; },
      name: function (p) { return p.name || 'Not given'; }
    };
    // on the card: what each question is for (the fitness check is its button, Set my level)
    var WHY = {
      body: function (p) { return app.noBmi(p) ? 'Height and weight, for your calorie estimate' : 'Height and weight, for your BMI and calorie estimate'; },
      target: function () { return 'A weight to aim for, at a safe weekly pace'; },
      focus: function () { return 'Extra work for the parts you pick'; },
      want: function () { return 'Pick any'; },
      name: function () { return 'What Frank should call you'; }
    };
    // a row: it opens its question on its own, and Next saves it and comes back here (js/app.js, ob-edit-step)
    function row(r, p, card) {
      var meta = card ? WHY[r.id](p) : r.later && isObj(p.asked) && !p.asked[r.id] ? 'Not yet' : SHOW[r.id](p);
      return '<button class="item" data-act="ob-edit-step" data-step="' + r.steps.join(',') + '" data-row="' + r.id + '"><span class="grow"><b>' + esc(r.title) + '</b>' +
        '<span class="meta">' + esc(meta) + '</span></span>' + u.ic('chev', 'chev') + '</button>';
    }

    // ---- the order, and what a save answered ----------------------------------------------------------------------------
    app.steps(function () { return FIRST; });
    // A new plan gets profile.asked: what the onboarding didn't ask, Make it yours asks after Day 1. Every later save from
    // the onboarding's steps (Make it yours, Your answers) dates the questions it answered. A plan from before the fast start
    // has no asked and gets none: its answers were all given
    app.on('profile', function (old, p, changed, steps) {
      if (!p || !Array.isArray(steps)) return;
      var fresh = !old && !isObj(p.asked), now = u.iso(), more = false;
      if (fresh) p.asked = {};
      if (!isObj(p.asked)) return;
      ROWS.forEach(function (r) {
        if (r.later && !p.asked[r.id] && r.steps.every(function (s) { return has(steps, s); })) { p.asked[r.id] = now; more = true; }
      });
      if (fresh || more) app.save();
    });

    // ---- "Your first week": after the build, in place of the app's summary ------------------------------------------------
    function firstMove(s) { var m = s.steps.filter(function (st) { return st.block === 'main'; })[0] || s.steps[0]; return m.ex; }
    function coachLine(text) { return '<div class="coachline"><span class="av">F</span><p>' + esc(text) + '</p></div>'; }
    // the answers of someone new on the ready step: Edit and steps on their own keep the app's summary
    function newcomer(p) {
      var d = p && p.step === 'ready' ? app.draft() : null;
      return d && !d.edit && !d.only && WBF.GOALS[d.goal] ? d : null;
    }
    function reveal(d) {
      var week = WBF.plan.days(d).filter(function (x) { return x.train && x.week === 1; });
      var ses = week.map(function (x) { return { day: x, s: app.session(x.workoutId, x, null, d) }; });
      var first = firstMove(ses[0].s), av = WBF.plan.avoidFor(d), st = app.status();
      var level = WBF.LEVELS[WBF.plan.levelFor(d)];
      var trial = st === 'new' ? 'Your ' + WBF.BILLING.trialDays + '-day free trial starts with your first workout.' :
        st === 'trial' ? u.plural(app.daysLeft(), 'day') + ' left of your free trial.' : '';
      var days = ses.map(function (o) {
        return '<div class="wk1-day" data-day="' + o.day.day + '">' + u.thumbHtml(firstMove(o.s)) + '<span class="grow"><b>Day ' + o.day.day + '</b><span>' + esc(o.s.title) + '</span></span>' +
          '<span class="mins">' + u.mins(o.s.estSec) + '</span></div>';
      }).join('');
      return '<div class="ob reveal"><div class="ob-top"><button class="icon-btn" data-act="ob-back" aria-label="Back">' + u.ic('back') + '</button>' +
        '<div class="ob-prog one" aria-hidden="true"><i><b style="width:100%"></b></i></div><span style="width:44px"></span></div>' +
        '<div class="stack tight"><p class="label" style="color:var(--sky-ink)">' + esc(u.planName(d)) + '</p>' +
        '<h1 class="ob-q">Your first <em>week</em></h1></div>' +
        '<div class="reveal-fig is3d">' + u.figHtml(first, { deco: true, note: false }) + '<span class="cap">From Day 1: ' + esc(WBF.EX[first].name) + '</span></div>' +
        coachLine(GOAL_LINE[d.goal] || GOAL_LINE.fit) +
        '<div class="summary"><div class="between"><p class="label" style="color:var(--ink-d2)">Week 1: ' + esc(WBF.STAGES[0].name) + '</p>' +
        '<p class="label" style="color:var(--ink-d2)">' + u.plural(ses.length, 'workout') + '</p></div><div class="wk1">' + days + '</div>' +
        (av.gentle ? '' : '<p class="reveal-level">You start at ' + esc(level) + '.' + (FITNESS_FIRST ? '' : ' The fitness check after Day 1 sets your level.') + '</p>') +
        u.safeRows(d) + '</div>' +      // the safety rows of the app's summary, in its words
        (trial ? '<p class="ob-note">' + esc(trial) + '</p>' : '') +
        '<div class="ob-cta"><button class="btn dark block" data-act="ob-finish" data-then="day">Start Day 1</button>' +
        '<button class="btn white block" data-act="ob-finish" data-then="plan">See my plan</button></div></div>';
    }
    // Start Day 1 and See my plan save the answers (ob-finish): until then nothing is saved, as on the app's summary
    var own = app.override('onboard', {
      title: function (p) { return own.title(p); },
      html: function (p) { var d = newcomer(p); return d ? reveal(d) : own.html(p); },
      mount: function (p) { if (!newcomer(p) && own.mount) own.mount(p); }
    });

    // ---- "Make it yours": after the first workout, on the finish screen and the Plan ----------------------------------------
    // The fitness check first: everyone starts at Beginner, and the next session follows the answer
    function yours(where) {
      var S = app.state(), p = S.profile, list = pending(p);
      if (!list.length || !(S.sessions || []).length) return null;
      var fit = list.filter(function (r) { return r.id === 'fitness'; })[0], rest = list.filter(function (r) { return r.id !== 'fitness'; });
      return { id: 'flow-yours', priority: where === 'done' ? 30 : 40, html: '<section class="card"><p class="label">Make it yours</p>' +
        (fit ? '<p class="small">You started at Beginner. Two questions set your level for the next workout.</p>' +
          '<button class="btn block" data-act="ob-edit-step" data-step="' + fit.steps.join(',') + '" data-row="fitness">Set my level</button>' :
          '<p class="small">A few more answers make the plan fit you.</p>') +
        (rest.length ? '<div class="list">' + rest.map(function (r) { return row(r, p, true); }).join('') + '</div>' : '') +
        '<button class="link" data-act="flow-later">Not now</button></section>' };
    }
    app.card('done.next', function () { return yours('done'); });
    app.card('plan.top', function () { return yours('plan'); });
    app.action('flow-later', function () {
      var p = app.state().profile;
      if (!p) return;
      p.later = u.iso();
      var ok = app.save();
      app.refresh();
      if (ok) app.toast('You can answer them any time in Me, Your answers.');
    });

    // ---- Me: "Your answers" in place of Edit (which asks every question again) -----------------------------------------
    app.html('me.edit', function () { return '<button class="btn two small" data-act="flow-answers">Your answers</button>'; });
    app.action('flow-answers', function () { app.go('answers', {}); });
    app.screen('answers', {
      title: function () { return 'Your answers'; },
      html: function () {
        var p = app.state().profile;
        return '<div class="screen bare">' + u.backBar('Your answers') + '<div class="stack tight"><h1 class="h1">Your answers</h1>' +
          '<p class="lead">Tap an answer to change it. A new goal or new days ask before your 28 days start again.</p></div>' +
          (p ? '<section class="card"><div class="list">' + ROWS.filter(function (r) { return allowed(r, p, false); }).map(function (r) { return row(r, p, false); }).join('') + '</div></section>' : '') + '</div>';
      }
    });

    // ---- Frank's client with no plan: the plan for the days between his sessions -----------------------------------------
    app.html('plan.start', function () {
      if (app.state().profile || app.status() !== 'client') return '';
      return '<div class="plan-card"><div class="pc-media is3d">' + u.figHtml('squat', { deco: true, note: false }) + '</div><div class="pc-body">' +
        '<h2 class="pc-title">A plan for the days between Frank\'s sessions</h2><p class="lead">' + FIRST.length + ' quick questions. Then your first week is ready.</p>' +
        '<button class="btn block" data-act="ob-start">Get my plan</button></div></div>';
    });

    // for the tests and the showcase captures: the order, the answers, and what Make it yours still asks
    WBF.flow = {
      first: FIRST.slice(), fitnessFirst: FITNESS_FIRST, rows: ROWS.map(function (r) { return { id: r.id, steps: r.steps.slice(), later: !!r.later }; }),
      pending: function () { return pending(app.state().profile).map(function (r) { return r.id; }); }
    };
  });
})(window);
