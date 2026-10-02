/* Wellness by Frank: workouts, the 4-week plan, and the session builder. */
(function (W) {
  'use strict';
  var EX = W.WBF.EX;

  // Frank's details. Fill in whatsapp to show a WhatsApp button (digits only, with country code).
  var FRANK = {
    brand: 'Wellness by Frank',
    name: 'Frank',
    handle: 'wellnessbyfrank',
    instagram: 'https://www.instagram.com/wellnessbyfrank/',
    dm: 'https://ig.me/m/wellnessbyfrank',
    whatsapp: '',
    bio: 'Wellness Trainer. Expert in Systematic Biomechanics. Sports Nutritionist. Neuromechanist Researcher.'
  };

  // Membership for people who train with the app. paymentLink: any checkout link (Paddle, PayPal,
  // or Stripe if the business is registered in a Stripe country; Stripe doesn't accept Aruba).
  // Frank's own clients don't pay here. See docs/ACCOUNTS-AND-PAYMENTS.md.
  var BILLING = { price: '$9.99', period: 'month', trialDays: 7, paymentLink: '' };

  var LEVELS = { b: 'Beginner', i: 'Intermediate', a: 'Advanced', f: 'Set by Frank' };
  var AREAS = {
    core: 'Core', lower: 'Lower body', upper: 'Upper body', full: 'Full body', cardio: 'Cardio', mobility: 'Mobility'
  };

  // Kit people may have. Furniture is on by default.
  var KIT = [
    { id: 'chair', name: 'A sturdy chair or step', def: true },
    { id: 'table', name: 'A sturdy table', def: true },
    { id: 'db', name: 'Dumbbells' },
    { id: 'rings', name: 'Gym rings' },
    { id: 'wedge', name: 'Heel wedges' },
    { id: 'pad', name: 'Balance pad' }
  ];

  var WARM = {
    lower: [['march', 30], ['leg-swings', 20], ['hip-hinge', 8]],
    upper: [['arm-circles', 30], ['wall-slide', 8], ['cat-cow', 6]],
    full: [['march', 30], ['arm-circles', 20], ['leg-swings', 20]],
    core: [['brace-breathe', 30], ['cat-cow', 6]],
    program: [['march', 30], ['cat-cow', 6], ['arm-circles', 20]]
  };
  var COOL = {
    lower: [['hip-flexor-stretch', 30], ['forward-fold', 30]],
    upper: [['childs-pose', 30], ['cobra', 6]],
    full: [['forward-fold', 30], ['childs-pose', 30]],
    core: [['childs-pose', 30], ['cobra', 6]],
    program: [['hip-flexor-stretch', 30], ['childs-pose', 30]]
  };

  function area(id, a, lvl, title, moves, extra) {
    var w = { id: id, kind: 'area', area: a, level: lvl, title: title, moves: moves, rounds: lvl === 'b' ? 2 : 3,
              warm: WARM[a === 'cardio' ? 'full' : a], cool: COOL[a === 'cardio' ? 'full' : a] };
    for (var k in extra || {}) w[k] = extra[k];
    return w;
  }

  var WORKOUTS = [
    // Frank's programs
    { id: 'essentials', kind: 'program', title: 'Essentials', phrase: 'ESSENTiALS', img: 'img/wellness-1.jpg', notes: ['Scapula', 'Hips'],
      blurb: 'The seven patterns every body needs: breathe, hinge, single-leg hinge, squat, split squat, pull and carry. Start here.',
      moves: ['brace-breathe', 'hip-hinge', 'single-leg-rdl', 'box-squat', 'split-squat', 'table-row', 'farmer-carry'],
      rounds: { b: 2, i: 2, a: 3 }, warm: WARM.program, cool: COOL.program },
    { id: 'method', kind: 'program', title: 'Change the method', phrase: 'CHANGE THE METHOD, ELEVATE THE RESULT', img: 'img/wellness-2.jpg', notes: ['Heel wedges', 'Balance pad'],
      blurb: 'Balance and control. Heel wedges and a balance pad change how the same moves feel, and how your body learns them.',
      moves: ['heel-squat', 'pad-balance', 'split-squat', 'single-leg-rdl', 'step-up', 'side-plank', 'calf-raise'],
      rounds: { b: 2, i: 2, a: 3 }, warm: WARM.program, cool: COOL.program },
    { id: 'gravity', kind: 'program', title: 'Gravity', phrase: 'GRAViTY', img: 'img/wellness-3.jpg', notes: ['Wooden rings', 'Dumbbell'],
      blurb: 'Strength with load. Dumbbells and rings, the same patterns made heavier. No kit yet? It swaps in bodyweight moves.',
      moves: ['goblet-squat', 'db-rdl', 'ring-row', 'db-press', 'db-row', 'push-up', 'farmer-carry'],
      rounds: { b: 2, i: 3, a: 3 }, warm: WARM.program, cool: COOL.program },

    area('core-b', 'core', 'b', 'Core', ['brace-breathe', 'dead-bug', 'bird-dog', 'glute-bridge', 'plank', 'side-plank']),
    area('core-i', 'core', 'i', 'Core', ['dead-bug', 'bird-dog', 'plank', 'side-plank', 'reverse-crunch', 'mountain-climber']),
    area('core-a', 'core', 'a', 'Core', ['hollow-hold', 'dead-bug', 'bear-hold', 'side-plank', 'reverse-crunch', 'shoulder-taps', 'mountain-climber']),
    area('lower-b', 'lower', 'b', 'Lower body', ['box-squat', 'glute-bridge', 'hip-hinge', 'split-squat', 'calf-raise', 'wall-sit']),
    area('lower-i', 'lower', 'i', 'Lower body', ['squat', 'single-leg-rdl', 'reverse-lunge', 'step-up', 'single-leg-bridge', 'wall-sit']),
    area('lower-a', 'lower', 'a', 'Lower body', ['jump-squat', 'bulgarian-split-squat', 'single-leg-rdl', 'lateral-lunge', 'single-leg-bridge', 'calf-raise']),
    area('upper-b', 'upper', 'b', 'Upper body', ['wall-slide', 'incline-push-up', 'table-row', 'prone-y-raise', 'scap-push-up', 'plank']),
    area('upper-i', 'upper', 'i', 'Upper body', ['push-up', 'table-row', 'chair-dip', 'pike-push-up', 'scap-push-up', 'superman']),
    area('upper-a', 'upper', 'a', 'Upper body', ['push-up', 'decline-push-up', 'table-row', 'pike-push-up', 'chair-dip', 'shoulder-taps']),
    area('full-b', 'full', 'b', 'Full body', ['march', 'box-squat', 'incline-push-up', 'glute-bridge', 'table-row', 'bird-dog']),
    area('full-i', 'full', 'i', 'Full body', ['jumping-jacks', 'squat', 'push-up', 'reverse-lunge', 'table-row', 'mountain-climber', 'plank']),
    area('full-a', 'full', 'a', 'Full body', ['burpee', 'jump-squat', 'push-up', 'bulgarian-split-squat', 'table-row', 'mountain-climber', 'hollow-hold']),
    area('cardio-b', 'cardio', 'b', 'Cardio', ['march', 'jumping-jacks', 'box-squat', 'high-knees', 'mountain-climber', 'calf-raise']),
    area('cardio-i', 'cardio', 'i', 'Cardio', ['jumping-jacks', 'high-knees', 'squat', 'mountain-climber', 'reverse-lunge', 'burpee']),
    area('cardio-a', 'cardio', 'a', 'Cardio', ['burpee', 'jump-squat', 'high-knees', 'mountain-climber', 'jumping-jacks', 'inchworm']),

    { id: 'mobility', kind: 'quick', area: 'mobility', title: 'Mobility flow', blurb: 'Spine, hips and shoulders through their full range. Good on rest days.',
      moves: ['cat-cow', 'down-dog', 'hip-flexor-stretch', 'deep-squat-hold', 'cobra', 'leg-swings', 'forward-fold'], rounds: 1, warm: [], cool: [] },
    { id: 'wake-up', kind: 'quick', area: 'mobility', title: 'Morning wake-up', blurb: 'Five easy minutes to get the blood moving.',
      moves: [['march', 40], ['arm-circles', 30], ['cat-cow', 6], ['squat', 8], ['hip-hinge', 8], ['wall-slide', 8]], rounds: 1, warm: [], cool: [] },
    { id: 'desk-reset', kind: 'quick', area: 'mobility', title: 'Desk reset', blurb: 'For long days sitting: open the hips, wake up the shoulder blades.',
      moves: [['wall-slide', 10], ['arm-circles', 30], ['hip-hinge', 10], ['hip-flexor-stretch', 30], ['forward-fold', 30], ['leg-swings', 20]], rounds: 1, warm: [], cool: [] },
    { id: 'evening', kind: 'quick', area: 'mobility', title: 'Evening stretch', blurb: 'Slow down before bed. Long holds, slow breathing.',
      moves: [['childs-pose', 45], ['cat-cow', 6], ['hip-flexor-stretch', 40], ['forward-fold', 40], ['cobra', 6], ['brace-breathe', 60]], rounds: 1, warm: [], cool: [] }
  ];
  var BY_ID = {};
  WORKOUTS.forEach(function (w) { BY_ID[w.id] = w; });

  // ---- The 4-week plan -------------------------------------------------------

  var GOALS = {
    fat: { name: 'Lose fat', line: 'Burn more, keep your strength.' },
    strength: { name: 'Get stronger', line: 'More muscle, stronger joints.' },
    move: { name: 'Move better', line: 'Less stiffness, better balance, no pain.' },
    fit: { name: 'Stay fit', line: 'A bit of everything, every week.' }
  };
  var ROTATION = {
    fat: { 3: ['full', 'cardio', 'full'], 4: ['full', 'cardio', 'lower', 'cardio'], 5: ['full', 'cardio', 'upper', 'cardio', 'lower'] },
    strength: { 3: ['lower', 'upper', 'full'], 4: ['lower', 'upper', 'lower', 'upper'], 5: ['lower', 'upper', 'core', 'lower', 'upper'] },
    move: { 3: ['essentials', 'mobility', 'method'], 4: ['essentials', 'core', 'method', 'mobility'], 5: ['essentials', 'core', 'method', 'mobility', 'full'] },
    fit: { 3: ['full', 'core', 'full'], 4: ['full', 'core', 'lower', 'upper'], 5: ['full', 'core', 'lower', 'upper', 'cardio'] }
  };
  var WEEK = { 3: [1, 0, 1, 0, 1, 0, 0], 4: [1, 1, 0, 1, 1, 0, 0], 5: [1, 1, 1, 0, 1, 1, 0] };
  var WEEK_MULT = [1, 1.1, 1.2, 1.3];

  // Returns 28 days: { day, week, train, workoutId }
  function planDays(profile) {
    var days = +profile.days || 3, goal = profile.goal || 'fit', lvl = profile.level || 'b';
    var rot = (ROTATION[goal] || ROTATION.fit)[days].slice();
    var kit = profile.kit || [];
    if (goal === 'strength' && kit.indexOf('db') !== -1) rot[rot.length - 1] = 'gravity';
    var out = [], n = 0;
    for (var w = 0; w < 4; w++) {
      for (var d = 0; d < 7; d++) {
        var train = !!WEEK[days][d];
        var wid = null;
        if (train) {
          var slot = rot[n % rot.length];
          n++;
          wid = BY_ID[slot] ? slot : slot + '-' + lvl;
        }
        out.push({ day: w * 7 + d + 1, week: w + 1, train: train, workoutId: wid });
      }
    }
    return out;
  }

  // ---- Building a session ---------------------------------------------------

  // kit: what the person has. Before onboarding we assume a chair and a table.
  var DEFAULT_KIT = KIT.filter(function (k) { return k.def; }).map(function (k) { return k.id; });
  function canDo(ex, kit) {
    return (ex.eq || []).every(function (k) { return k === 'load' || kit.indexOf(k) !== -1; });
  }
  // moves to leave out: avoid = { supine, prone, jump }
  function safe(ex, avoid) {
    if (!avoid) return true;
    return !(avoid.jump && ex.jump) && !(ex.pos && avoid[ex.pos]);
  }
  // health answers to things to avoid. Pregnancy: no lying flat on the back or front,
  // no jumping. Recovering from an injury: no jumping until Frank or a doctor says so.
  function avoidFor(health, age) {
    health = health || {};
    var a = {};
    if (health.pregnant) { a.supine = true; a.prone = true; a.jump = true; }
    if (health.injury) a.jump = true;
    if (age === '60') a.jump = true;              // 60 and over: low impact unless Frank says otherwise
    return Object.keys(a).length ? a : null;
  }
  // pick the exercise to use: the person's own swap, then kit-free alternatives
  // taken: ids already in this workout, so two moves don't fall back to the same one
  function pick(id, ctx, seen, taken) {
    seen = seen || {};
    if (seen[id]) return null;
    seen[id] = true;
    var swap = ctx.swaps && ctx.swaps[id];
    if (swap && EX[swap] && !seen[swap]) id = swap;
    var ex = EX[id];
    if (!ex) return null;
    if (canDo(ex, ctx.kit || DEFAULT_KIT) && safe(ex, ctx.avoid) && !(taken && taken[id])) return id;
    for (var i = 0; i < (ex.alts || []).length; i++) {
      var alt = pick(ex.alts[i], ctx, seen, taken);
      if (alt) return alt;
    }
    return null;
  }

  function roundDose(ex, n) {
    if (ex.type === 'time') return Math.max(10, Math.round(n / 5) * 5);
    return Math.max(3, Math.round(n));
  }

  // ctx: { level, kit, swaps, mult, goal }
  function buildSession(wid, ctx) {
    var w = BY_ID[wid];
    if (!w) return null;
    var lvl = ctx.level || w.level || 'b';
    var mult = ctx.mult || 1;
    var rounds = typeof w.rounds === 'object' ? w.rounds[lvl] : w.rounds;
    var steps = [], taken = {}, chosen = {};
    function addMove(item, block, round, R) {
      var id = Array.isArray(item) ? item[0] : item;
      var use;
      if (block === 'main') {
        // resolve each listed move once, then reuse it every round
        if (!(id in chosen)) { chosen[id] = pick(id, ctx, null, taken); if (chosen[id]) taken[chosen[id]] = true; }
        use = chosen[id];
      } else use = pick(id, ctx);
      if (!use) return;
      var ex = EX[use];
      var dose;
      if (Array.isArray(item) && use === id) dose = item[1];
      else if (block === 'main') dose = roundDose(ex, ex.dose[lvl] * mult);
      else dose = ex.type === 'time' ? Math.min(ex.dose.b, 30) : Math.min(ex.dose.b, 8);
      if (ex.type === 'time' && ex.each) {
        steps.push({ ex: use, orig: id, dose: dose, block: block, round: round, rounds: R, side: 1 });
        steps.push({ ex: use, orig: id, dose: dose, block: block, round: round, rounds: R, side: 2 });
      } else {
        steps.push({ ex: use, orig: id, dose: dose, block: block, round: round, rounds: R, side: ex.each ? 3 : 0 });
      }
    }
    (w.warm || []).forEach(function (it) { addMove(it, 'warm', 1, 1); });
    // 60 and over: balance work in every session (WHO 2020, older adults)
    if (ctx.older && w.kind !== 'quick') addMove(['balance', 20], 'warm', 1, 1);
    for (var r = 1; r <= rounds; r++) w.moves.forEach(function (it) { addMove(it, 'main', r, rounds); });
    (w.cool || []).forEach(function (it) { addMove(it, 'cool', 1, 1); });

    var rest = { b: 30, i: 20, a: 15 }[lvl];
    if (ctx.goal === 'strength') rest += 10;
    if (ctx.goal === 'fat') rest -= 5;
    if (w.kind === 'quick') rest = 10;
    if (ctx.restOverride) rest = ctx.restOverride;
    var s = { wid: wid, title: w.title, level: lvl, steps: steps, rest: rest, restRound: rest + 15, rounds: rounds };
    s.estSec = estimate(s);
    return s;
  }

  // A session Frank writes by hand for a client:
  // { i: id, t: title, n: note, c: client, r: rounds or sets, f: 'c' circuit | 's' sets,
  //   rs: rest seconds, w: warm-up 1/0, k: cool-down 1/0, x: [[exerciseId, reps or seconds], ...] }
  function buildCustom(spec) {
    var steps = [], R = Math.max(1, Math.min(8, Math.round(+spec.r || 1)));
    function add(id, dose, block, round, rounds) {
      var ex = EX[id];
      if (!ex) return;
      dose = Math.max(ex.type === 'time' ? 5 : 1, Math.min(ex.type === 'time' ? 600 : 200, Math.round(+dose || ex.dose.i)));
      if (ex.type === 'time' && ex.each) {
        steps.push({ ex: id, orig: id, dose: dose, block: block, round: round, rounds: rounds, side: 1 });
        steps.push({ ex: id, orig: id, dose: dose, block: block, round: round, rounds: rounds, side: 2 });
      } else {
        steps.push({ ex: id, orig: id, dose: dose, block: block, round: round, rounds: rounds, side: ex.each ? 3 : 0 });
      }
    }
    var xs = (spec.x || []).filter(function (x) { return Array.isArray(x) && EX[x[0]]; });
    if (spec.w) WARM.full.forEach(function (it) { add(it[0], it[1], 'warm', 1, 1); });
    if (spec.f === 's') xs.forEach(function (x) { for (var r = 1; r <= R; r++) add(x[0], x[1], 'main', r, R); });
    else for (var r = 1; r <= R; r++) xs.forEach(function (x) { add(x[0], x[1], 'main', r, R); });
    if (spec.k) COOL.full.forEach(function (it) { add(it[0], it[1], 'cool', 1, 1); });
    var rest = Math.max(5, Math.min(180, Math.round(+spec.rs || 30)));
    var out = { wid: 'coach:' + spec.i, title: String(spec.t || 'Session from Frank').slice(0, 60), level: 'f', steps: steps,
                rest: rest, restRound: spec.f === 's' ? rest : rest + 15, rounds: R, coach: spec };
    out.estSec = estimate(out);
    return out;
  }

  function stepSeconds(st) {
    var ex = EX[st.ex];
    if (ex.type === 'time') return st.dose;
    var tempo = ex.area.indexOf('cardio') !== -1 ? 2 : 3.2;
    return Math.round(st.dose * tempo * (st.side === 3 ? 2 : 1) + (st.side === 3 ? 5 : 0));
  }
  function restAfter(s, i) {
    var a = s.steps[i], b = s.steps[i + 1];
    if (!b) return 0;
    if (a.side === 1 && b.side === 2 && a.ex === b.ex) return 5;
    if (a.block !== 'main' || b.block !== 'main') return 8;
    if (b.round !== a.round) return s.restRound;
    return s.rest;
  }
  function estimate(s) {
    var t = 10;
    for (var i = 0; i < s.steps.length; i++) t += stepSeconds(s.steps[i]) + restAfter(s, i);
    return t;
  }
  function kcal(s, kg, seconds) {
    if (!kg) return null;
    var total = 0, all = 0;
    s.steps.forEach(function (st) { var sec = stepSeconds(st); all += sec; total += EX[st.ex].met * sec; });
    var met = all ? total / all : 3;
    var mins = (seconds || s.estSec) / 60;
    return Math.round(met * 3.5 * kg / 200 * mins);
  }

  // ---- Lessons: one short teaching line a day ----------------------------------
  var LESSONS = [
    'Breathe out on the hard part of every rep. A firm breath out braces your trunk.',
    'Your hips are the engine. Most lifts go better when the movement starts there.',
    'Shoulder blades are meant to glide on your ribs. Let them move in push-ups and rows.',
    'Muscle burn is fine. Sharp or joint pain means stop, and tell Frank.',
    'Feet first: spread your toes and feel heel, big toe and little toe on the floor.',
    'Lower slowly. Two to three seconds on the way down builds control.',
    'Sleep is part of training. Muscle repairs at night, not during the session.',
    'A ten-minute walk after a meal is one of the simplest habits there is.',
    'Start the day with a full glass of water.',
    'Some protein in every meal helps your body recover from the work you do here.',
    'Consistency beats intensity. Three sessions a week for a year beats seven for a month.',
    'On one-leg moves, start with your weaker side.',
    'Soft knees, not locked knees. Locking a joint hands the load to the ligaments.',
    'Keep your neck long. Your head weighs about five kilos; stack it over your shoulders.',
    'Rest days count. Easy movement helps you recover faster than lying still.',
    'If your lower back rounds, the set is over. Quality first, then reps.',
    'Breathe through your nose when you can. It keeps the effort steady.',
    'Balance is a skill. Practise standing on one leg while you brush your teeth.',
    'Sitting shortens the front of the hips. Stand up and move every 30 to 45 minutes.',
    'Strong is a feeling of control, not strain.',
    'Change the method, elevate the result: the same move on a wedge or a pad teaches your body something new.',
    'Every exercise has a why. Tap "How to" in any move to read it.'
  ];

  W.WBF.FRANK = FRANK;
  W.WBF.BILLING = BILLING;
  W.WBF.LEVELS = LEVELS;
  W.WBF.AREAS = AREAS;
  W.WBF.KIT = KIT;
  W.WBF.GOALS = GOALS;
  W.WBF.WORKOUTS = WORKOUTS;
  W.WBF.WORKOUT = BY_ID;
  W.WBF.LESSONS = LESSONS;
  W.WBF.WEEK_MULT = WEEK_MULT;
  W.WBF.DEFAULT_KIT = DEFAULT_KIT;
  W.WBF.plan = { avoidFor: avoidFor, safe: safe, days: planDays, build: buildSession, custom: buildCustom, stepSeconds: stepSeconds, restAfter: restAfter, kcal: kcal, pick: pick, canDo: canDo };
})(window);
