/* Wellness by Frank: workouts, the 28-day plan and the session builder.
   The rules follow the research in js/science.js (sources there, and in
   .claude/skills/frank-app/references/science.md). */
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
    city: 'The Hague',
    // what his certificate says (NHA Fitness Trainer level 3, which covers sports nutrition and biomechanics);
    // keep claims to what he holds: neuroscience is his own interest, not a qualification
    bio: 'Fitness trainer (NHA level 3), trained in sports nutrition and biomechanics. Based in The Hague. Neuroscience is his side passion.',
    tagline: 'Not only a trainer, but purposely an educator.',
    // Client codes: typing one on "Frank's clients" opens the whole app without the membership.
    // Only hashes live here, so the codes can't be read in this public repo. Add one with
    // node tools/client-code.mjs <code>. Like the paywall, it's a check on the phone, not a lock.
    codes: [
      '3423e93ea2938ccbb786555bc73794e7b5216f5f85a319ebe19c57d723e3b57b'   // 2026-10-02
    ]
  };

  // Membership for people who train with the app, in euro (Frank sells from the Netherlands).
  // The monthly price is decided; the yearly price and the trial are placeholders. paymentLink: any checkout link
  // (Mollie, Stripe, Paddle). Frank's own clients don't pay here. See docs/ACCOUNTS-AND-PAYMENTS.md.
  var BILLING = {
    trialDays: 7, paymentLink: '',
    plans: [
      { id: 'year', name: 'Yearly', price: '€119.99', per: 'year', perWeek: '€2.31', best: true },
      { id: 'month', name: 'Monthly', price: '€15', per: 'month', perWeek: '€3.46' }
    ]
  };

  var LEVELS = { b: 'Beginner', i: 'Intermediate', a: 'Advanced', f: 'Set by Frank' };
  var AREAS = { core: 'Core', lower: 'Lower body', upper: 'Upper body', full: 'Full body', cardio: 'Cardio', mobility: 'Mobility' };

  // Body parts, as in the reference app's catalogue. mus: the muscles its icon lights up.
  var BODY = [
    { id: 'full', name: 'Full body', mus: ['chest', 'abs', 'quadriceps', 'gluteal', 'upper-back', 'front-deltoids'] },
    { id: 'abs', name: 'Abs', mus: ['abs', 'obliques'] },
    { id: 'chest', name: 'Chest', mus: ['chest', 'front-deltoids', 'triceps'] },
    { id: 'arms', name: 'Arms', mus: ['biceps', 'triceps', 'forearm'] },
    { id: 'legs', name: 'Legs & glutes', mus: ['quadriceps', 'gluteal', 'hamstring', 'calves', 'adductor'] },
    { id: 'back', name: 'Shoulders & back', mus: ['upper-back', 'trapezius', 'back-deltoids', 'front-deltoids', 'lower-back'] },
    { id: 'cardio', name: 'Cardio', mus: ['quadriceps', 'calves', 'gluteal', 'abs'] },
    { id: 'stretch', name: 'Stretch', mus: ['hamstring', 'lower-back', 'chest', 'quadriceps'] }
  ];
  var BODY_BY_ID = {};
  BODY.forEach(function (b) { BODY_BY_ID[b.id] = b; });

  // Kit people may have. Furniture is on by default.
  var KIT = [
    { id: 'chair', name: 'A sturdy chair or step', def: true },
    { id: 'table', name: 'A sturdy table', def: true },
    { id: 'db', name: 'Dumbbells' },
    { id: 'rings', name: 'Gym rings' },
    { id: 'wedge', name: 'Heel wedges' },
    { id: 'pad', name: 'Balance pad' }
  ];

  // Warm-ups: 5 to 10 minutes of easy movement, then the moves to come at low effort (RAMP).
  // Cool-downs are optional by the evidence; short stretches with holds of 30 s or less.
  var WARM = {
    lower: [['march', 30], ['leg-swings', 20], ['hip-hinge', 8]],
    upper: [['arm-circles', 30], ['wall-slide', 8], ['cat-cow', 6]],
    full: [['march', 30], ['arm-circles', 20], ['leg-swings', 20]],
    core: [['march', 30], ['cat-cow', 6]],
    cardio: [['march', 30], ['jumping-jacks', 20], ['arm-circles', 20]],
    program: [['march', 30], ['cat-cow', 6], ['arm-circles', 20]]
  };
  var COOL = {
    lower: [['quad-stretch', 30], ['calf-stretch', 30], ['knee-to-chest', 30]],
    upper: [['childs-pose', 30], ['cobra', 6]],
    full: [['forward-fold', 30], ['childs-pose', 30]],
    core: [['cobra', 6], ['knee-to-chest', 30]],
    program: [['hip-flexor-stretch', 30], ['childs-pose', 30]]
  };

  function area(id, a, lvl, title, moves, extra) {
    var base = { abs: 'core', legs: 'lower', chest: 'upper', arms: 'upper', back: 'upper', core: 'core', lower: 'lower', upper: 'upper', full: 'full', cardio: 'cardio' }[a];
    var w = { id: id, kind: 'area', area: a, level: lvl, title: title, moves: moves, rounds: { b: 2, i: 3, a: 3 }[lvl],
              warm: WARM[base === 'core' ? 'core' : base], cool: COOL[base === 'cardio' ? 'full' : base] };
    if (a === 'cardio') w.warm = WARM.cardio;
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
      moves: ['goblet-squat', 'db-rdl', 'ring-row', 'db-press', 'db-row', 'push-up', 'suitcase-carry'],
      rounds: { b: 2, i: 3, a: 3 }, warm: WARM.program, cool: COOL.program },

    // the catalogue: body part x level, modelled on the reference app's routines
    area('abs-b', 'abs', 'b', 'Abs', ['crunch', 'dead-bug', 'mountain-climber', 'reverse-crunch', 'leg-raise', 'plank']),
    area('abs-i', 'abs', 'i', 'Abs', ['crunch', 'bicycle-crunch', 'mountain-climber', 'leg-raise', 'flutter-kicks', 'plank', 'side-plank']),
    area('abs-a', 'abs', 'a', 'Abs', ['v-up', 'bicycle-crunch', 'hollow-hold', 'mountain-climber', 'flutter-kicks', 'side-plank', 'plank-up-down']),
    area('chest-b', 'chest', 'b', 'Chest', ['wall-push-up', 'incline-push-up', 'knee-push-up', 'chair-dip', 'scap-push-up']),
    area('chest-i', 'chest', 'i', 'Chest', ['incline-push-up', 'push-up', 'wide-push-up', 'chair-dip', 'knee-push-up', 'scap-push-up']),
    area('chest-a', 'chest', 'a', 'Chest', ['push-up', 'wide-push-up', 'decline-push-up', 'diamond-push-up', 'chair-dip', 'plank-up-down']),
    area('arms-b', 'arms', 'b', 'Arms', ['wall-push-up', 'chair-dip', 'punches', 'arm-raise', 'db-curl', 'shoulder-taps']),
    area('arms-i', 'arms', 'i', 'Arms', ['diamond-push-up', 'chair-dip', 'db-curl', 'db-triceps', 'punches', 'plank-up-down']),
    area('arms-a', 'arms', 'a', 'Arms', ['diamond-push-up', 'chair-dip', 'pike-push-up', 'db-curl', 'db-triceps', 'plank-up-down']),
    area('legs-b', 'legs', 'b', 'Legs & glutes', ['squat', 'side-leg-raise', 'reverse-lunge', 'donkey-kick', 'glute-bridge', 'sumo-squat', 'calf-raise']),
    area('legs-i', 'legs', 'i', 'Legs & glutes', ['squat', 'reverse-lunge', 'side-leg-raise', 'donkey-kick', 'step-up', 'sumo-squat', 'wall-sit', 'calf-raise']),
    area('legs-a', 'legs', 'a', 'Legs & glutes', ['jump-squat', 'bulgarian-split-squat', 'single-leg-rdl', 'lateral-lunge', 'single-leg-bridge', 'sumo-squat', 'calf-raise']),
    area('back-b', 'back', 'b', 'Shoulders & back', ['arm-raise', 'wall-slide', 'prone-y-raise', 'knee-push-up', 'superman', 'scap-push-up']),
    area('back-i', 'back', 'i', 'Shoulders & back', ['arm-raise', 'prone-y-raise', 'table-row', 'pike-push-up', 'superman', 'bird-dog']),
    area('back-a', 'back', 'a', 'Shoulders & back', ['table-row', 'pike-push-up', 'prone-y-raise', 'ring-row', 'superman', 'shoulder-taps']),
    area('full-b', 'full', 'b', 'Full body', ['march', 'box-squat', 'incline-push-up', 'glute-bridge', 'table-row', 'bird-dog']),
    area('full-i', 'full', 'i', 'Full body', ['jumping-jacks', 'squat', 'push-up', 'reverse-lunge', 'table-row', 'mountain-climber', 'plank']),
    area('full-a', 'full', 'a', 'Full body', ['burpee', 'jump-squat', 'push-up', 'bulgarian-split-squat', 'table-row', 'mountain-climber', 'hollow-hold']),
    area('cardio-b', 'cardio', 'b', 'Cardio', ['march', 'jumping-jacks', 'box-squat', 'high-knees', 'mountain-climber', 'punches']),
    area('cardio-i', 'cardio', 'i', 'Cardio', ['jumping-jacks', 'high-knees', 'squat', 'mountain-climber', 'butt-kicks', 'burpee']),
    area('cardio-a', 'cardio', 'a', 'Cardio', ['burpee', 'jump-squat', 'high-knees', 'mountain-climber', 'skipping', 'inchworm']),
    // plan sessions that train a whole half of the body (each muscle twice a week)
    area('lower-b', 'lower', 'b', 'Lower body', ['box-squat', 'glute-bridge', 'hip-hinge', 'split-squat', 'calf-raise', 'wall-sit']),
    area('lower-i', 'lower', 'i', 'Lower body', ['squat', 'single-leg-rdl', 'reverse-lunge', 'step-up', 'single-leg-bridge', 'wall-sit']),
    area('lower-a', 'lower', 'a', 'Lower body', ['jump-squat', 'bulgarian-split-squat', 'single-leg-rdl', 'lateral-lunge', 'single-leg-bridge', 'calf-raise']),
    area('upper-b', 'upper', 'b', 'Upper body', ['wall-slide', 'incline-push-up', 'table-row', 'prone-y-raise', 'scap-push-up', 'plank']),
    area('upper-i', 'upper', 'i', 'Upper body', ['push-up', 'table-row', 'chair-dip', 'pike-push-up', 'scap-push-up', 'superman']),
    area('upper-a', 'upper', 'a', 'Upper body', ['push-up', 'decline-push-up', 'table-row', 'pike-push-up', 'chair-dip', 'shoulder-taps']),

    // stretch and short sessions
    { id: 'mobility', kind: 'quick', area: 'stretch', title: 'Mobility flow', blurb: 'Spine, hips and shoulders through their full range. Good on rest days.',
      moves: ['cat-cow', 'down-dog', 'hip-flexor-stretch', 'deep-squat-hold', 'cobra', 'leg-swings', 'forward-fold'], rounds: 1, warm: [], cool: [] },
    { id: 'wake-up', kind: 'quick', area: 'stretch', title: 'Morning wake-up', blurb: 'Five easy minutes to get the blood moving.',
      moves: [['march', 40], ['arm-circles', 30], ['cat-cow', 6], ['squat', 8], ['hip-hinge', 8], ['wall-slide', 8]], rounds: 1, warm: [], cool: [] },
    { id: 'desk-reset', kind: 'quick', area: 'stretch', title: 'Desk reset', blurb: 'For long days sitting: open the hips, wake up the shoulder blades.',
      moves: [['wall-slide', 10], ['arm-circles', 30], ['hip-hinge', 10], ['hip-flexor-stretch', 30], ['forward-fold', 30], ['leg-swings', 20]], rounds: 1, warm: [], cool: [] },
    { id: 'evening', kind: 'quick', area: 'stretch', title: 'Evening stretch', blurb: 'Slow down before bed. Long holds, slow breathing.',
      moves: [['childs-pose', 45], ['cat-cow', 6], ['hip-flexor-stretch', 40], ['forward-fold', 40], ['cobra', 6], ['brace-breathe', 60]], rounds: 1, warm: [], cool: [] },
    { id: 'back-care', kind: 'quick', area: 'stretch', title: 'Lower back care', blurb: 'Gentle core and hip work that eases a stiff back. Stop if anything hurts.',
      moves: [['cat-cow', 8], ['knee-to-chest', 30], ['bird-dog', 6], ['glute-bridge', 10], ['childs-pose', 40], ['brace-breathe', 45]], rounds: 1, warm: [], cool: [] }
  ];
  var BY_ID = {};
  WORKOUTS.forEach(function (w) { BY_ID[w.id] = w; });
  // which catalogue section a workout belongs to
  function bodyOf(w) {
    if (!w) return null;
    if (w.kind === 'quick') return 'stretch';
    if (w.kind === 'program') return 'full';
    return BODY_BY_ID[w.area] ? w.area : w.area === 'lower' ? 'legs' : w.area === 'core' ? 'abs' : w.area === 'upper' ? 'back' : 'full';
  }

  // ---- The 28-day plan ---------------------------------------------------------------------
  // Every muscle twice a week, two days or more between hard sessions of the same muscles,
  // aerobic work on top (WHO 2020; ACSM 2026). Fat loss: at most two interval sessions a week.
  // Check after a change: every goal x days x kit trains lower, upper and core on 2+ days a week.
  var GOALS = {
    fat: { name: 'Lose fat', line: 'Burn more, keep your muscle.', plan: 'Fat burner' },
    strength: { name: 'Build strength', line: 'More muscle, stronger joints.', plan: 'Strength builder' },
    move: { name: 'Move better', line: 'Less stiffness, better balance, no pain.', plan: 'Move better' },
    fit: { name: 'Stay fit', line: 'A bit of everything, every week.', plan: 'Fit for life' }
  };
  var ROTATION = {
    fat: { 2: ['full', 'cardio'], 3: ['full', 'cardio', 'full'], 4: ['lower', 'cardio', 'upper', 'cardio'],
           5: ['full', 'cardio', 'lower', 'upper', 'cardio'], 6: ['lower', 'cardio', 'upper', 'abs', 'cardio', 'full'] },
    strength: { 2: ['full', 'full'], 3: ['lower', 'upper', 'full'], 4: ['lower', 'upper', 'lower', 'upper'],
                5: ['lower', 'upper', 'abs', 'lower', 'upper'], 6: ['lower', 'upper', 'abs', 'lower', 'upper', 'full'] },
    move: { 2: ['essentials', 'full'], 3: ['essentials', 'mobility', 'full'], 4: ['essentials', 'mobility', 'method', 'full'],
            5: ['essentials', 'abs', 'method', 'mobility', 'full'], 6: ['essentials', 'abs', 'method', 'mobility', 'full', 'evening'] },
    fit: { 2: ['full', 'full'], 3: ['full', 'abs', 'full'], 4: ['full', 'abs', 'lower', 'upper'],
           5: ['full', 'abs', 'lower', 'upper', 'cardio'], 6: ['full', 'abs', 'lower', 'upper', 'cardio', 'mobility'] }
  };
  var WEEK = { 2: [1, 0, 0, 1, 0, 0, 0], 3: [1, 0, 1, 0, 1, 0, 0], 4: [1, 1, 0, 1, 1, 0, 0], 5: [1, 1, 1, 0, 1, 1, 0], 6: [1, 1, 1, 1, 1, 1, 0] };
  var WEEK_MULT = [1, 1.1, 1.2, 1.3];
  var STAGES = [
    { name: 'Foundation', line: 'Learn the moves. Leave two or three reps in the tank.' },
    { name: 'Build', line: 'A little more each session.' },
    { name: 'Push', line: 'The work you could not do in week one.' },
    { name: 'Peak', line: 'Your strongest week. Then a new block starts.' }
  ];

  function age(profile) {
    if (!profile) return null;
    if (profile.birthYear) return new Date().getFullYear() - profile.birthYear;
    return { u30: 25, 30: 37, 45: 52, 60: 65 }[profile.age] || null;
  }
  // under 18, or may be: age counts the year only, so someone born 18 years ago can still be 17. An unknown age counts too.
  function possiblyMinor(profile) {
    var a = age(profile);
    return a == null || a <= 18;
  }

  // Returns 28 days: { day, week, train, workoutId }
  function planDays(profile) {
    var days = Math.max(2, Math.min(6, +profile.days || 3)), goal = profile.goal || 'fit', lvl = levelFor(profile);
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
          if (slot === 'cardio' && avoidFor(profile).gentle) slot = 'mobility';
          wid = BY_ID[slot] ? slot : slot + '-' + (slot === 'cardio' && avoidFor(profile).gentle ? 'b' : lvl);
        }
        out.push({ day: w * 7 + d + 1, week: w + 1, train: train, workoutId: wid });
      }
    }
    return out;
  }

  // ---- Safety ---------------------------------------------------------------------------------------
  // PAR-Q+ 2025: any yes means nothing vigorous until a doctor or qualified professional clears you.
  var PARQ = [
    ['heart', 'Has your doctor ever said you have a heart condition or high blood pressure?'],
    ['chest', 'Do you feel pain in your chest at rest, in daily life, or when you are active?'],
    ['dizzy', 'Have you lost your balance from dizziness, or lost consciousness, in the last 12 months?'],
    ['chronic', 'Have you ever been diagnosed with another chronic medical condition?'],
    ['meds', 'Do you take medicine for a chronic medical condition?'],
    ['joint', 'Do you have a bone, joint or soft-tissue problem that more activity could make worse?'],
    ['supervised', 'Has your doctor ever said you should only do medically supervised physical activity?']
  ];
  // 'other' is a sore spot the app can't place: it only leaves out jumps (see avoidFor)
  var SORE = [['shoulder', 'Shoulder'], ['wrist', 'Wrist'], ['knee', 'Knee'], ['ankle', 'Ankle'], ['back', 'Lower back'], ['other', 'Other']];

  // what a person's answers rule out: { supine, prone, jump, vigorous, kit: [...], stress: [...], gentle, older }
  function avoidFor(profile) {
    profile = profile || {};
    var h = profile.health || {}, a = { kit: [], stress: (profile.injuries || []).slice() };
    var parq = PARQ.some(function (q) { return h[q[0]]; });
    if (parq && !h.cleared) { a.gentle = true; a.jump = true; a.vigorous = true; }
    if (h.pregnant) {
      // no lying on the back after the first trimester, nothing with a fall risk (WHO 2020, Mottola 2018)
      a.supine = true; a.prone = true; a.jump = true; a.kit = a.kit.concat(['pad', 'rings']);
    }
    var yrs = age(profile);
    if (yrs != null && yrs >= 60) { a.jump = true; a.older = true; }
    if (h.injury) a.jump = true;                      // the older yes/no injury question
    if (a.stress.indexOf('other') !== -1) a.jump = true;   // a sore spot the app can't place
    return a;
  }
  function vigorous(ex) { return ex.met >= 7; }
  // moves to leave out for these answers
  function safe(ex, avoid) {
    if (!avoid) return true;
    if (avoid.jump && ex.jump) return false;
    if (avoid.vigorous && vigorous(ex)) return false;
    if (ex.pos && avoid[ex.pos]) return false;
    if (avoid.kit && (ex.eq || []).some(function (k) { return avoid.kit.indexOf(k) !== -1; })) return false;
    if (avoid.stress && (ex.stress || []).some(function (j) { return avoid.stress.indexOf(j) !== -1; })) return false;
    return true;
  }
  // the level a plan uses: answers that call for caution keep it at beginner
  function levelFor(profile) {
    var l = profile.level || 'b';
    if (avoidFor(profile).gentle) return 'b';
    return l;
  }

  // ---- Building a session ---------------------------------------------------------------------------
  // kit: what the person has. Before onboarding we assume a chair and a table.
  var DEFAULT_KIT = KIT.filter(function (k) { return k.def; }).map(function (k) { return k.id; });
  function canDo(ex, kit) {
    return (ex.eq || []).every(function (k) { return k === 'load' || kit.indexOf(k) !== -1; });
  }
  // pick the exercise to use: the person's own swap, then easier or kit-free alternatives,
  // then any safe move that trains the same pattern
  // taken: ids already in this workout, so two moves don't fall back to the same one
  function pick(id, ctx, seen, taken) {
    var first = !seen;
    seen = seen || {};
    if (seen[id]) return null;
    seen[id] = true;
    var swap = ctx.swaps && ctx.swaps[id];
    if (swap && EX[swap] && !seen[swap]) id = swap;
    var ex = EX[id];
    if (!ex) return null;
    var kit = ctx.kit || DEFAULT_KIT;
    if (canDo(ex, kit) && safe(ex, ctx.avoid) && !(taken && taken[id])) return id;
    for (var i = 0; i < (ex.alts || []).length; i++) {
      var alt = pick(ex.alts[i], ctx, seen, taken);
      if (alt) return alt;
    }
    if (first) {
      var same = Object.keys(EX).filter(function (k) {
        var e = EX[k];
        return !seen[k] && e.pattern === ex.pattern && e.area.join() === ex.area.join() && canDo(e, kit) && safe(e, ctx.avoid) && !(taken && taken[k]);
      })[0];
      if (same) return same;
    }
    return null;
  }

  function roundDose(ex, n) {
    if (ex.type === 'time') return Math.max(10, Math.round(n / 5) * 5);
    return Math.max(3, Math.round(n));
  }

  // ctx: { level, kit, swaps, mult, goal, avoid, older, minutes, restOverride, focus, day }
  function buildSession(wid, ctx) {
    var w = BY_ID[wid];
    if (!w) return null;
    var lvl = ctx.level || w.level || 'b';
    var base = typeof w.rounds === 'object' ? w.rounds[lvl] : w.rounds;
    var s = buildWith(w, wid, ctx, lvl, base);
    // fit the session to the minutes the person has: beginners 1 to 2 rounds, others up to 3 or 4
    if (ctx.minutes && w.kind !== 'quick') {
      var target = ctx.minutes * 60, max = { b: 2, i: 3, a: 4 }[lvl] || 3, best = s;
      for (var r = 1; r <= max; r++) {
        var t = buildWith(w, wid, ctx, lvl, r);
        if (Math.abs(t.estSec - target) < Math.abs(best.estSec - target)) best = t;
      }
      s = best;
    }
    return s;
  }
  function buildWith(w, wid, ctx, lvl, rounds) {
    var mult = ctx.mult || 1;
    var steps = [], taken = {}, chosen = {};
    function addMove(item, block, round, R, orig) {
      var id = Array.isArray(item) ? item[0] : item;
      var use;
      if (block === 'main') {
        // resolve each listed move once, then reuse it every round
        if (!(id in chosen)) { chosen[id] = pick(id, ctx, null, taken); if (chosen[id]) taken[chosen[id]] = true; }
        use = chosen[id];
      } else if (block === 'focus') use = id;
      else use = pick(id, ctx);
      if (!use) return;
      if (orig) id = orig;
      var ex = EX[use];
      var dose;
      if (Array.isArray(item) && use === id) dose = item[1];
      else if (block === 'main' || block === 'focus') dose = roundDose(ex, ex.dose[lvl] * mult);
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
    // the body parts the person wants to focus on: a short extra block at the end of plan sessions
    focusFor(w, ctx, lvl).forEach(function (f) {
      for (var i = 0, added = 0; i < f.list.length && added < f.n; i++) {
        var id = f.list[i];
        if (taken[id]) continue;
        var use = pick(id, ctx, null, taken);
        if (!use) continue;
        taken[use] = true;
        addMove(use, 'focus', 1, 1, id);
        added++;
      }
    });
    (w.cool || []).forEach(function (it) { addMove(it, 'cool', 1, 1); });

    // circuits: a short change-over between moves; each muscle rests while the others work
    var rest = { b: 30, i: 20, a: 15 }[lvl] || 25;
    if (ctx.goal === 'strength') rest += 10;
    if (ctx.goal === 'fat') rest -= 5;
    if (w.kind === 'quick') rest = 10;
    if (ctx.restOverride) rest = ctx.restOverride;
    var s = { wid: wid, title: w.title, level: lvl, steps: steps, rest: rest, restRound: rest + 15, rounds: rounds, body: bodyOf(w) };
    s.estSec = estimate(s);
    return s;
  }

  // focus: ['abs', 'legs', ...] from onboarding. Each part gives candidate moves from its catalogue
  // workout at this level, turned by the plan day so the extra block varies. Two moves for one
  // part, one each for two or three parts. Not on days that already train that part (legs on a
  // lower-body day, chest, arms or back on an upper-body day).
  var COVERS = { lower: ['legs'], upper: ['chest', 'arms', 'back'], core: ['abs'] };
  function focusFor(w, ctx, lvl) {
    if (!ctx.focus || w.kind === 'quick') return [];
    var covered = (COVERS[w.area] || []).concat([w.area]);
    var parts = ctx.focus.filter(function (f) { return f !== 'full' && BY_ID[f + '-' + lvl] && covered.indexOf(f) === -1; }).slice(0, 3);
    var n = parts.length === 1 ? 2 : 1, turn = ctx.day || 0;
    return parts.map(function (f) {
      var list = BY_ID[f + '-' + lvl].moves.map(function (m) { return Array.isArray(m) ? m[0] : m; });
      var k = (turn * n) % list.length;
      return { part: f, n: n, list: list.slice(k).concat(list.slice(0, k)) };
    });
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
                rest: rest, restRound: spec.f === 's' ? rest : rest + 15, rounds: R, coach: spec, body: 'full' };
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
    var work = function (x) { return x.block === 'main' || x.block === 'focus'; };
    if (!work(a) || !work(b)) return 8;
    if (b.round !== a.round || b.block !== a.block) return s.restRound;
    return s.rest;
  }
  function estimate(s) {
    var t = 10;
    for (var i = 0; i < s.steps.length; i++) t += stepSeconds(s.steps[i]) + restAfter(s, i);
    return t;
  }
  // Energy estimate (2024 Compendium): kcal/min = MET x 3.5 x kg / 200; rests count as 1.3 MET.
  // From 60 the Older Adult Compendium uses 2.7 in place of 3.5. Always shown as an estimate.
  function kcal(s, kg, seconds, older) {
    if (!kg) return null;
    var work = 0, workMet = 0, rest = 0;
    s.steps.forEach(function (st, i) { var sec = stepSeconds(st); work += sec; workMet += EX[st.ex].met * sec; rest += restAfter(s, i); });
    var planned = work + rest || 1, scale = (seconds || s.estSec) / planned;
    var metSec = (workMet + 1.3 * rest) * scale;
    return Math.round(metSec / 60 * (older ? 2.7 : 3.5) * kg / 200);
  }
  // all the muscles a session works, main ones first
  function musclesOf(s) {
    var p = {}, sec = {};
    s.steps.forEach(function (st) {
      if (st.block !== 'main') return;
      var m = EX[st.ex].mus || { p: [], s: [] };
      m.p.forEach(function (x) { p[x] = (p[x] || 0) + 1; });
      m.s.forEach(function (x) { sec[x] = (sec[x] || 0) + 1; });
    });
    var main = Object.keys(p).sort(function (a, b) { return p[b] - p[a]; });
    return { p: main, s: Object.keys(sec).filter(function (x) { return !p[x]; }) };
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
    'Stop each set with two or three good reps left. Going to failure isn\'t needed to grow.',
    'Balance is a skill. Practise standing on one leg while you brush your teeth.',
    'Sitting shortens the front of the hips. Stand up and move every 30 to 45 minutes.',
    'Strong is a feeling of control, not strain.',
    'Change the method, elevate the result: the same move on a wedge or a pad teaches your body something new.',
    'Every exercise has a why. Open any move to read it.'
  ];

  W.WBF.FRANK = FRANK;
  W.WBF.BILLING = BILLING;
  W.WBF.LEVELS = LEVELS;
  W.WBF.AREAS = AREAS;
  W.WBF.BODY = BODY;
  W.WBF.BODY_BY_ID = BODY_BY_ID;
  W.WBF.KIT = KIT;
  W.WBF.GOALS = GOALS;
  W.WBF.STAGES = STAGES;
  W.WBF.PARQ = PARQ;
  W.WBF.SORE = SORE;
  W.WBF.WORKOUTS = WORKOUTS;
  W.WBF.WORKOUT = BY_ID;
  W.WBF.LESSONS = LESSONS;
  W.WBF.WEEK_MULT = WEEK_MULT;
  W.WBF.DEFAULT_KIT = DEFAULT_KIT;
  W.WBF.plan = { avoidFor: avoidFor, safe: safe, days: planDays, build: buildSession, custom: buildCustom, stepSeconds: stepSeconds,
                 restAfter: restAfter, kcal: kcal, pick: pick, canDo: canDo, age: age, possiblyMinor: possiblyMinor, levelFor: levelFor, musclesOf: musclesOf, bodyOf: bodyOf };
})(window);
