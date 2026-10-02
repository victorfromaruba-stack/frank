/* Wellness by Frank: the exercise library.
   Coaching text is written as a draft for Frank to check and put in his own words.

   type: 'reps' or 'time' (seconds). each: true = per side.
   dose: { b, i, a } for beginner, intermediate, advanced.
   eq: what you need ([] = nothing). Values: chair, table, db (dumbbells),
       rings, wedge (heel wedges), pad (balance pad), load (anything heavy).
   area: core, lower, upper, full, mobility, cardio.
   met: effort in METs from the 2024 Adult Compendium of Physical Activities (Herrmann 2024),
        for the calorie estimate: calisthenics light 2.8, moderate 3.8, vigorous 7.5; bodyweight
        resistance 3.0; weights 3.5; jogging in place 4.8; stretching 2.3; stepping 2.0; lying still 1.3.
   alts: easier or kit-free swaps, in order of preference. */
(function (W) {
  'use strict';
  var H = W.WBF.fig.H;

  function extend(base, o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o || {}) r[k] = o[k]; return r; }
  function stand(o) { return extend({ p: [0, 49.3], t: 180, aN: [6, 3], aF: [-3, -1], lN: { ik: [1.5, 2.5] }, lF: { ik: [-1.5, 2.5] } }, o); }
  function supine(o) { return extend({ p: [8, 6.6], s: [-22, 6.6], h: -90, aN: [85, 85], aF: [84, 84] }, o); }
  function prone(o) { return extend({ p: [-8, 6.9], s: [22, 6.9], h: 90, aN: [92, 92], aF: [91, 91], lN: [-90, -90], lF: [-89, -89], fN: -80, fF: -80 }, o); }
  function quad(o) { return extend({ p: [-10, 26.5], s: [19.4, 32.5], aN: { ik: [19.4, 2.5] }, aF: { ik: [18.4, 2.5] }, lN: [0, -90], lF: [0, -90], fN: -90, fF: -90 }, o); }
  function plank(anchor, sy, o) {
    var l = H.line(anchor, sy);
    return extend({ p: l.p, s: l.s, lN: { ik: anchor }, lF: { ik: [anchor[0] - 1, anchor[1]] } }, o);
  }
  function kneel(knee, sy, o) {
    var l = H.line(knee, sy, H.L.th);
    return extend({ p: l.p, s: l.s, lN: [H.ang(l.p, knee), -120], lF: [H.ang(l.p, [knee[0] - 1, knee[1]]), -118], fN: -150, fF: -150 }, o);
  }
  function breathe(P, dy) {
    var Q = extend(P, { p: [P.p[0], P.p[1] + (dy == null ? 0.5 : dy)] });
    return [P, Q];
  }

  // A few shared shapes
  var hiTop = plank([-44, 7], 32), hiBot = plank([-44, 7], 10.5);
  var HANDS = { aN: { ik: [28.5, 2.5] }, aF: { ik: [27.5, 2.5] } };
  var squatTop = stand({ lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [10, 5], aF: [6, 3] });
  var squatBot = stand({ p: [-11.5, 22.4], t: 140, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [82, 84], aF: [78, 80] });

  var EX = {

    // ---- Brace and core ------------------------------------------------
    'brace-breathe': {
      name: 'Brace and breathe', area: ['core', 'mobility'], pattern: 'brace', type: 'time', dose: { b: 40, i: 45, a: 60 }, eq: [], met: 1.3,
      cue: ['Breathe into your sides.', 'Ribs wide, then down.', 'Long, slow breath out.'],
      setup: 'Lie on your back, knees bent, feet flat. Hands on your lower ribs.',
      steps: ['Breathe in through your nose so your ribs widen into your hands.', 'Breathe out slowly until your ribs drop and your belly firms up.', 'Keep that firmness and take the next breath on top of it.'],
      mistakes: ['Lifting the chest and shoulders to breathe.', 'Arching the lower back off the floor.'],
      why: 'Every lift starts here. Wide ribs and a firm belly give your spine support from all sides, so the load goes through your hips and legs, not your lower back.',
      focus: { j: 'ribs', label: 'Ribs', at: 'tl' },
      anim: { k: [supine({ lN: { ik: [26, 2.5], b: [0, 1] }, lF: { ik: [25, 2.5], b: [0, 1] } }),
                  supine({ sp: -0.3, lN: { ik: [26, 2.5], b: [0, 1] }, lF: { ik: [25, 2.5], b: [0, 1] }, aN: [86, 86], aF: [85, 85] })], d: [2.6, 3.4], h: [0.6, 0.3] },
      alts: []
    },
    'dead-bug': {
      name: 'Dead bug', area: ['core'], pattern: 'brace', type: 'reps', each: true, dose: { b: 6, i: 8, a: 10 }, eq: [], met: 2.8,
      cue: ['Back stays flat.', 'Reach long, slow.', 'Breathe out as you reach.'],
      setup: 'Lie on your back. Arms up to the ceiling, knees bent at 90 degrees above your hips.',
      steps: ['Press your lower back gently into the floor.', 'Reach one arm overhead and the opposite leg out long, just above the floor.', 'Come back to the start and switch sides.'],
      mistakes: ['The lower back lifts off the floor when the leg goes out.', 'Rushing: this one works best slow.'],
      why: 'Your arms and legs move while your trunk stays still. That is the job your core has when you walk, run and carry.',
      focus: { j: 'ribs', label: 'Back flat', at: 'tl' },
      anim: { k: [supine({ aN: [180, 180], aF: [178, 178], lN: [180, 90], lF: [178, 88] }),
                  supine({ aN: [-95, -95], aF: [178, 178], lN: [180, 90], lF: [95, 95] }),
                  supine({ aN: [180, 180], aF: [178, 178], lN: [180, 90], lF: [178, 88] }),
                  supine({ aN: [180, 180], aF: [-95, -95], lN: [95, 95], lF: [178, 88] })], d: [1.4], h: [0.2, 0.5, 0.2, 0.5] },
      alts: ['bird-dog', 'brace-breathe']
    },
    'bird-dog': {
      name: 'Bird dog', area: ['core', 'mobility'], pattern: 'brace', type: 'reps', each: true, dose: { b: 6, i: 8, a: 10 }, eq: [], met: 2.8,
      cue: ['Spine still as a table.', 'Reach long, not high.', 'Hips stay level.'],
      setup: 'On hands and knees. Hands under shoulders, knees under hips.',
      steps: ['Slide one arm forward and the opposite leg back until both are straight.', 'Hold for a breath without letting your hips turn.', 'Bring them back under you and switch sides.'],
      mistakes: ['Lifting the leg too high so the back arches.', 'Hips rolling open to one side.'],
      why: 'The opposite arm and leg work together, the same cross pattern you use when you walk. Keeping the spine still trains the deep muscles that protect it.',
      focus: { j: 'spine', label: 'Spine still', at: 'tr' },
      anim: { k: [quad(), quad({ aN: [92, 92], lF: [-88, -88] }), quad(), quad({ aF: [91, 91], lN: [-88, -88] })], d: [1.2], h: [0.2, 0.7, 0.2, 0.7] },
      alts: ['dead-bug']
    },
    'plank': {
      name: 'Forearm plank', area: ['core'], pattern: 'brace', type: 'time', dose: { b: 20, i: 35, a: 50 }, eq: [], met: 3.8,
      cue: ['Ribs down.', 'Squeeze your glutes.', 'Push the floor away.'],
      setup: 'Forearms on the floor, elbows under shoulders. Step your feet back.',
      steps: ['Lift your body into one straight line from head to heels.', 'Pull your ribs down toward your hips and squeeze your glutes.', 'Breathe slowly and hold.'],
      mistakes: ['Hips sagging so the lower back takes the weight.', 'Holding your breath.'],
      why: 'A plank teaches your trunk to resist bending. Squeezing the glutes sets the pelvis so the work lands on your abs, not your back.',
      focus: { j: 'ribs', label: 'Ribs down', at: 'tr' },
      anim: (function () { var P = plank([-52, 7], 18, { aN: [0, 90], aF: [0, 90], hN: 90, hF: 90 }); return { k: breathe(P, 0.6), d: [1.8, 2.2] }; })(),
      alts: ['bird-dog']
    },
    'side-plank': {
      name: 'Side plank', area: ['core'], pattern: 'brace', type: 'time', each: true, dose: { b: 15, i: 25, a: 35 }, eq: [], met: 3.8,
      cue: ['Hips high.', 'Elbow under shoulder.', 'Long from head to heels.'],
      setup: 'Lie on your side, elbow under your shoulder, feet stacked. Bend your knees to make it easier.',
      steps: ['Lift your hips until your body is one straight line.', 'Reach your top arm up, or keep the hand on your hip.', 'Hold, then switch sides.'],
      mistakes: ['Hips dropping toward the floor.', 'Shoulder creeping up to your ear.'],
      why: 'Side planks train the muscles that stop you bending sideways: the ones that keep your pelvis level each time you stand on one leg.',
      focus: { j: 'hip', label: 'Hips high', at: 'tr' },
      anim: (function () {
        var P = { v: 'f', p: [-6.26, 18.87], t: 107.7, aN: [72.3, 132.3, 1, 0.3], aF: [107.7, 107.7], lN: [-5, -5], lF: [-5, -5] };
        return { k: breathe(P, 0.5), d: [1.8, 2.2] };
      })(),
      alts: ['plank']
    },
    'hollow-hold': {
      name: 'Hollow hold', area: ['core'], pattern: 'brace', type: 'time', dose: { b: 15, i: 20, a: 30 }, eq: [], met: 3.8,
      cue: ['Lower back on the floor.', 'Long arms, long legs.', 'Bend the knees if the back lifts.'],
      setup: 'Lie on your back, arms overhead.',
      steps: ['Press your lower back into the floor.', 'Lift your shoulders, arms and legs a few centimetres.', 'Hold the shape and breathe.'],
      mistakes: ['The lower back peels off the floor.', 'Legs too low for your level: raise them or bend your knees.'],
      why: 'The hollow position is the body\'s strongest straight line. Gymnasts build everything on it.',
      focus: { j: 'ribs', label: 'Back down', at: 'tl' },
      anim: (function () {
        var P = { p: [8, 7], s: [-21.6, 11.2], h: -82, sp: 0.4, aN: [-100, -100], aF: [-99, -99], lN: [100, 100], lF: [99, 99] };
        return { k: breathe(P, 0.4), d: [1.8, 2.2] };
      })(),
      alts: ['dead-bug', 'bird-dog']
    },
    'bear-hold': {
      name: 'Bear hold', area: ['core', 'full'], pattern: 'brace', type: 'time', dose: { b: 15, i: 25, a: 40 }, eq: [], met: 3.8,
      cue: ['Knees two fingers off the floor.', 'Back flat.', 'Keep breathing.'],
      setup: 'On hands and knees, toes tucked under.',
      steps: ['Press into your hands and lift your knees just off the floor.', 'Keep your back flat and still.', 'Hold and breathe.'],
      mistakes: ['Hips shooting up high.', 'Holding your breath.'],
      why: 'Small position, big demand: shoulders, core and legs all have to share the work.',
      focus: { j: 'spine', label: 'Back flat', at: 'tr' },
      anim: (function () {
        var P = { p: [-10, 29.5], s: [19.85, 32.5], aN: { ik: [19.85, 2.5] }, aF: { ik: [18.85, 2.5] }, lN: [0, -80], lF: [0, -80], fN: 15, fF: 15 };
        return { k: breathe(P, 0.5), d: [1.6, 2] };
      })(),
      alts: ['bird-dog']
    },
    'reverse-crunch': {
      name: 'Reverse crunch', area: ['core'], pattern: 'brace', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: [], met: 3.8,
      cue: ['Curl, don\'t swing.', 'Knees to chest.', 'Slow on the way down.'],
      setup: 'Lie on your back, knees bent at 90 degrees above your hips, arms by your sides.',
      steps: ['Breathe out and curl your hips off the floor, knees toward your chest.', 'Lower slowly until your hips touch down.', 'Keep your shoulders relaxed on the floor.'],
      mistakes: ['Swinging the legs to get up.', 'Pushing hard through the hands.'],
      why: 'Curling the pelvis toward the ribs works the lower abs without pulling on your neck.',
      focus: { j: 'hip', label: 'Curl the hips', at: 'tr' },
      anim: { k: [supine({ lN: [180, 90], lF: [178, 88] }),
                  supine({ p: [5.5, 10], sp: 0.5, lN: [-160, 120], lF: [-162, 118] })], d: [0.9, 1.4], h: [0.2, 0.3] },
      alts: ['dead-bug']
    },
    'mountain-climber': {
      name: 'Mountain climbers', area: ['core', 'cardio'], pattern: 'cardio', type: 'time', dose: { b: 20, i: 30, a: 40 }, eq: [], met: 7.5,
      cue: ['Shoulders over hands.', 'Hips low and still.', 'Quick, light feet.'],
      setup: 'High plank: hands under shoulders, body in one line.',
      steps: ['Drive one knee toward your chest.', 'Switch legs quickly, like running.', 'Keep your hips level the whole time.'],
      mistakes: ['Hips bouncing up and down.', 'Shoulders drifting behind the hands.'],
      why: 'A plank and a sprint at once. It raises your heart rate while your core holds the line.',
      focus: { j: 'hip', label: 'Hips level', at: 'tl' },
      anim: { k: [extend(hiTop, extend(HANDS, { lN: [55, -75], lF: { ik: [-45, 7] } })),
                  extend(hiTop, extend(HANDS, { lN: { ik: [-44, 7] }, lF: [55, -75] }))], d: [0.32, 0.32] },
      alts: ['march']
    },
    'shoulder-taps': {
      name: 'Plank shoulder taps', area: ['core', 'upper'], pattern: 'brace', type: 'reps', each: true, dose: { b: 6, i: 10, a: 14 }, eq: [], met: 3.8,
      cue: ['Feet wide.', 'Hips don\'t rock.', 'Slow taps.'],
      setup: 'High plank with your feet a bit wider than your hips.',
      steps: ['Lift one hand and tap the opposite shoulder.', 'Put it back down and tap with the other hand.', 'Keep your hips as still as you can.'],
      mistakes: ['Hips swaying side to side.', 'Feet too close together.'],
      why: 'Taking a hand away makes your trunk fight rotation. That control protects your back when you twist and reach.',
      focus: { j: 'hip', label: 'Hips still', at: 'tl' },
      anim: { k: [extend(hiTop, HANDS), extend(hiTop, extend(HANDS, { aN: [-20, 160] })), extend(hiTop, HANDS), extend(hiTop, extend(HANDS, { aF: [-20, 160] }))], d: [0.5], h: [0.1, 0.25, 0.1, 0.25] },
      alts: ['plank']
    },

    // ---- Hinge and glutes ------------------------------------------------
    'glute-bridge': {
      name: 'Glute bridge', area: ['lower', 'core'], pattern: 'hinge', type: 'reps', dose: { b: 10, i: 15, a: 20 }, eq: [], met: 3.0,
      cue: ['Push through your heels.', 'Ribs down, hips up.', 'Squeeze at the top.'],
      setup: 'Lie on your back, knees bent, feet flat and hip-width apart.',
      steps: ['Breathe out, press your heels down and lift your hips.', 'Stop when shoulders, hips and knees make a line.', 'Lower slowly.'],
      mistakes: ['Arching the lower back to get higher.', 'Pushing through the toes.'],
      why: 'Your glutes are the engine of the hip. This wakes them up without loading your spine.',
      focus: { j: 'hip', label: 'Glutes', at: 'tr' },
      anim: { k: [supine({ lN: { ik: [27, 2.5], b: [0, 1] }, lF: { ik: [26, 2.5], b: [0, 1] } }),
                  supine({ p: [0.98, 25.8], lN: { ik: [27, 2.5], b: [0, 1] }, lF: { ik: [26, 2.5], b: [0, 1] } })], d: [1.1, 1.4], h: [0.3, 0.6] },
      alts: ['hip-hinge']
    },
    'single-leg-bridge': {
      name: 'Single-leg bridge', area: ['lower', 'core'], pattern: 'hinge', type: 'reps', each: true, dose: { b: 6, i: 8, a: 12 }, eq: [], met: 3.0,
      cue: ['Hips stay level.', 'Drive through one heel.', 'Pause at the top.'],
      setup: 'Lie on your back, one foot flat, the other leg straight.',
      steps: ['Press the planted heel down and lift your hips.', 'Keep both sides of the pelvis at the same height.', 'Lower slowly, then switch legs.'],
      mistakes: ['One hip dropping.', 'Pushing with the hands.'],
      why: 'On one leg your glute also has to keep the pelvis level, like it does in every step you take.',
      focus: { j: 'hip', label: 'Hips level', at: 'tl' },
      anim: { k: [supine({ lN: [135, 135], lF: { ik: [26, 2.5], b: [0, 1] } }),
                  supine({ p: [0.98, 25.8], lN: [80, 80], lF: { ik: [26, 2.5], b: [0, 1] } })], d: [1.1, 1.4], h: [0.3, 0.6] },
      alts: ['glute-bridge', 'single-leg-rdl']
    },
    'hip-hinge': {
      name: 'Hip hinge', area: ['lower'], pattern: 'hinge', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: [], met: 3.0,
      cue: ['Hips back.', 'Spine stays long.', 'Stand up by pushing the hips forward.'],
      setup: 'Stand with feet hip-width apart, knees soft.',
      steps: ['Push your hips back as if closing a car door behind you.', 'Let your chest come forward with a long, flat back.', 'Stop when you feel the back of your thighs, then drive your hips forward to stand.'],
      mistakes: ['Bending the knees into a squat.', 'Rounding the back to reach lower. If the back rounds, stop the set.'],
      why: 'The hinge is how you lift anything from the floor safely. Your hips do the work and your spine stays long.',
      focus: { j: 'hip', label: 'Hips back', at: 'tl' },
      anim: { k: [stand({ aN: [10, 5], aF: [6, 3] }), stand({ p: [-9, 46.5], t: 98, aN: [0, 0], aF: [-2, 0] })], d: [1.3, 1.1], h: [0.3, 0.3] },
      alts: ['glute-bridge']
    },
    'single-leg-rdl': {
      name: 'Single-leg hinge', area: ['lower', 'core'], pattern: 'hinge', type: 'reps', each: true, dose: { b: 6, i: 8, a: 10 }, eq: [], met: 3.0,
      cue: ['Hips still square.', 'Back leg and chest move together.', 'Soft standing knee.'],
      setup: 'Stand on one leg, knee soft. Hold a wall lightly if you need balance.',
      steps: ['Hinge forward while the free leg reaches straight back.', 'Go until your body is close to level, hips pointing at the floor.', 'Drive the standing hip forward to come up.'],
      mistakes: ['The hip of the free leg rolling open.', 'Locking the standing knee.'],
      why: 'Balance, hamstrings and glutes in one move. It trains the hip to stay stable while you are on one foot.',
      focus: { j: 'hip', label: 'Hips square', at: 'tr' },
      anim: { k: [stand({ lF: { ik: [0.5, 2.5] }, lN: [-8, -2], aN: [2, 0], aF: [-2, 0] }),
                  stand({ p: [-3, 47], t: 95, lF: { ik: [0.5, 2.5] }, lN: [-85, -85], aN: [0, 0], aF: [-1, 0] })], d: [1.4, 1.2], h: [0.3, 0.4] },
      alts: ['hip-hinge']
    },

    // ---- Squat -------------------------------------------------------------
    'box-squat': {
      name: 'Squat to a target', area: ['lower'], pattern: 'squat', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: ['chair'], met: 3.8,
      cue: ['Sit to the target.', 'Knees follow your toes.', 'Stand tall at the top.'],
      setup: 'Stand in front of a sturdy chair, feet a little wider than your hips.',
      steps: ['Reach your hips back and down until you lightly touch the seat.', 'Don\'t rest: touch and go.', 'Push the floor away to stand.'],
      mistakes: ['Dropping onto the seat.', 'Knees caving inward.'],
      why: 'A target teaches depth and control. Lower it over time and your squat grows with you.',
      focus: { j: 'hip', label: 'Hips', at: 'tr' },
      props: [{ k: 'box', x: -32, w: 21, h: 21 }],
      anim: { k: [squatTop, stand({ p: [-12, 26.5], t: 146, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [80, 82], aF: [76, 78] })], d: [1.4, 1.1], h: [0.3, 0.2] },
      alts: ['squat']
    },
    'squat': {
      name: 'Squat', area: ['lower'], pattern: 'squat', type: 'reps', dose: { b: 10, i: 15, a: 20 }, eq: [], met: 3.8,
      cue: ['Sit between your heels.', 'Whole foot on the floor.', 'Chest proud.'],
      setup: 'Feet a little wider than your hips, toes slightly out.',
      steps: ['Bend hips and knees together and sit down between your heels.', 'Go as low as you can with your heels down and back long.', 'Drive up through the whole foot.'],
      mistakes: ['Heels lifting.', 'Knees caving inward.'],
      why: 'You squat every time you sit and stand. Training it keeps your knees and hips strong for life.',
      focus: { j: 'hip', label: 'Hips', at: 'tr' },
      anim: { k: [squatTop, squatBot], d: [1.3, 1.1], h: [0.3, 0.2] },
      alts: ['box-squat']
    },
    'heel-squat': {
      name: 'Heels-up squat', area: ['lower'], pattern: 'squat', type: 'reps', dose: { b: 10, i: 12, a: 15 }, eq: ['wedge'], met: 3.8,
      cue: ['Knees travel forward.', 'Chest tall.', 'Slow down, strong up.'],
      setup: 'Heels on the wedges, feet hip-width. No wedges: a thick book under the heels.',
      steps: ['Sit straight down, letting the knees go forward over the toes.', 'Keep your chest tall.', 'Stand up through the middle of the foot.'],
      mistakes: ['Heels sliding off the wedge.', 'Leaning forward like a normal squat.'],
      why: 'Lifting the heels lets the knees travel and the torso stay upright. More work for the front of the thigh, less for the lower back.',
      focus: { j: 'knee', label: 'Heel wedges', at: 'tr' },
      props: [{ k: 'wedge', x: -4.5, w: 14, h: 5 }],
      anim: { k: [stand({ p: [0.5, 52.6], lN: { ik: [0.5, 6.4] }, lF: { ik: [-1, 6.4] }, fN: 64, fF: 64, aN: [10, 5], aF: [6, 3] }),
                  stand({ p: [-7, 24.5], t: 158, lN: { ik: [0.5, 6.4] }, lF: { ik: [-1, 6.4] }, fN: 64, fF: 64, aN: [78, 80], aF: [74, 76] })], d: [1.4, 1.1], h: [0.3, 0.2] },
      alts: ['squat']
    },
    'goblet-squat': {
      name: 'Goblet squat', area: ['lower'], pattern: 'squat', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: ['db'], met: 3.5,
      cue: ['Weight close to your chest.', 'Elbows inside the knees.', 'Tall back.'],
      setup: 'Hold one dumbbell upright against your chest, feet a little wider than hips.',
      steps: ['Sit down between your heels, keeping the weight on your chest.', 'Let your elbows brush the inside of your knees at the bottom.', 'Stand up tall.'],
      mistakes: ['The weight drifting away from the body.', 'Rounding the upper back.'],
      why: 'Holding the weight in front pulls your torso upright, which makes a clean squat almost automatic.',
      focus: { j: 'hip', label: 'Hips', at: 'tr' },
      hold: { db: 'near' },
      anim: { k: [stand({ lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [18, 162], aF: [16, 164] }),
                  stand({ p: [-10.5, 22.6], t: 146, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [30, 168], aF: [28, 170] })], d: [1.4, 1.1], h: [0.3, 0.2] },
      alts: ['squat']
    },
    'wall-sit': {
      name: 'Wall sit', area: ['lower'], pattern: 'squat', type: 'time', dose: { b: 20, i: 30, a: 45 }, eq: [], met: 3.8,
      cue: ['Back flat on the wall.', 'Knees over ankles.', 'Keep breathing.'],
      setup: 'Back against a wall, feet about a step in front of you.',
      steps: ['Slide down until your thighs are close to level.', 'Knees over your ankles, weight in your heels.', 'Hold and breathe.'],
      mistakes: ['Knees pushing past the toes.', 'Hands pushing on the thighs.'],
      why: 'A static hold builds strength in the exact angle where most people feel weak getting out of a chair.',
      focus: { j: 'knee', label: 'Knees over ankles', at: 'tr' },
      props: [{ k: 'wall', x: -23.6, side: -1 }],
      anim: (function () { var P = stand({ p: [-17, 26], t: 180, lN: { ik: [7, 2.5] }, lF: { ik: [6, 2.5] }, aN: [12, 30], aF: [10, 28] }); return { k: breathe(P, 0.4), d: [1.8, 2.2] }; })(),
      alts: ['box-squat']
    },
    'jump-squat': {
      name: 'Jump squat', area: ['lower', 'cardio'], pattern: 'squat', type: 'reps', dose: { b: 6, i: 10, a: 12 }, eq: [], met: 7.5,
      cue: ['Land soft and quiet.', 'Knees over toes.', 'Explode up.'],
      setup: 'Feet a little wider than your hips.',
      steps: ['Squat down, arms back.', 'Jump up, swinging the arms.', 'Land softly, sinking straight into the next squat.'],
      mistakes: ['Landing with straight legs.', 'Knees caving in on landing.'],
      why: 'Jumping trains power: strength made fast. Landing well teaches your knees to absorb force.',
      focus: { j: 'knee', label: 'Soft landing', at: 'tr' },
      anim: { k: [stand({ p: [-11.5, 22.4], t: 140, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [-40, -40], aF: [-42, -42] }),
                  stand({ p: [0.5, 57], t: 180, lN: { ik: [1, 10.5] }, lF: { ik: [-1, 10.5] }, fN: 40, fF: 40, aN: [165, 170], aF: [162, 168] })], d: [0.35, 0.45], h: [0.35, 0] },
      alts: ['squat']
    },

    // ---- Single leg --------------------------------------------------------
    'split-squat': {
      name: 'Split squat', area: ['lower'], pattern: 'lunge', type: 'reps', each: true, dose: { b: 6, i: 10, a: 12 }, eq: [], met: 3.8,
      cue: ['Back knee down.', 'Front foot planted.', 'Tall torso.'],
      setup: 'One long step: front foot flat, back heel up. Hold a wall if you need to.',
      steps: ['Drop the back knee straight down toward the floor.', 'Stop just above the floor, front shin close to vertical.', 'Push through the front foot to rise. Finish all reps, then switch.'],
      mistakes: ['Stance too short so the front knee shoots forward.', 'Leaning on the back leg.'],
      why: 'Your legs work one at a time in real life. Split stance builds each leg and shows up any left-right difference.',
      focus: { j: 'knee', label: 'Front knee', at: 'tr' },
      anim: { k: [stand({ p: [-3, 47], t: 178, lN: { ik: [14, 2.5] }, lF: { ik: [-20, 5], b: [0.3, -1] }, fF: 55 }),
                  stand({ p: [-3, 26], t: 178, lN: { ik: [14, 2.5] }, lF: { ik: [-20, 5], b: [0.3, -1] }, fF: 55 })], d: [1.3, 1.1], h: [0.3, 0.2] },
      alts: ['reverse-lunge']
    },
    'reverse-lunge': {
      name: 'Reverse lunge', area: ['lower'], pattern: 'lunge', type: 'reps', each: true, dose: { b: 6, i: 10, a: 12 }, eq: [], met: 3.8,
      cue: ['Step back, not out.', 'Knee straight down.', 'Push off the front heel.'],
      setup: 'Stand tall, feet hip-width.',
      steps: ['Step one foot back and lower the back knee toward the floor.', 'Keep most of your weight on the front leg.', 'Push through the front heel to return. Alternate or do one side at a time.'],
      mistakes: ['Stepping back too short.', 'Front knee falling inward.'],
      why: 'Stepping back is kinder to the knees than stepping forward, and still builds strong, balanced legs.',
      focus: { j: 'knee', label: 'Front knee', at: 'tr' },
      anim: (function () {
        var K0 = stand({ lN: { ik: [1.5, 2.5] }, lF: { ik: [-1.5, 2.5] } });
        var K1 = stand({ p: [-2, 46.5], t: 176, lN: { ik: [1.5, 2.5] }, lF: { ik: [-12, 11], b: [0.3, -1] }, fF: 60 });
        var K2 = stand({ p: [-5, 26], t: 174, lN: { ik: [1.5, 2.5] }, lF: { ik: [-23, 5], b: [0.3, -1] }, fF: 55 });
        return { k: [K0, K1, K2, K1], d: [0.5, 0.6, 0.6, 0.5], h: [0.3, 0, 0.2, 0] };
      })(),
      alts: ['split-squat']
    },
    'lateral-lunge': {
      name: 'Side lunge', area: ['lower', 'mobility'], pattern: 'lunge', type: 'reps', each: true, dose: { b: 6, i: 8, a: 10 }, eq: [], met: 3.8,
      cue: ['Sit back into one hip.', 'Other leg long.', 'Feet flat.'],
      setup: 'Feet wide, toes forward or slightly out.',
      steps: ['Shift your weight to one side, bending that knee and sitting the hip back.', 'Keep the other leg straight and both feet flat.', 'Push back to the middle, then go to the other side.'],
      mistakes: ['Bent knee caving inward.', 'Lifting the heel of the bent leg.'],
      why: 'Most training goes forward and back. Side lunges work the inner thighs and hips in the side-to-side direction that protects your knees in sport.',
      focus: { j: 'knee', label: 'Knee over foot', at: 'tl' },
      anim: (function () {
        var arms = { aN: [35, -40], aF: [35, -40] };
        var mid = extend({ v: 'f', p: [0, 42.6], t: 180, lN: { ik: [30, 2.5] }, lF: { ik: [-30, 2.5] } }, arms);
        return { k: [mid, extend(mid, { p: [15, 28] }), mid, extend(mid, { p: [-15, 28] })], d: [0.9], h: [0.1, 0.4, 0.1, 0.4] };
      })(),
      alts: ['split-squat']
    },
    'step-up': {
      name: 'Step-up', area: ['lower'], pattern: 'lunge', type: 'reps', each: true, dose: { b: 6, i: 10, a: 12 }, eq: ['chair'], met: 3.8,
      cue: ['Whole foot on the step.', 'Drive through the top leg.', 'Control the way down.'],
      setup: 'Face a sturdy step or low box, one foot fully on top.',
      steps: ['Lean slightly forward and push through the top foot to stand on the step.', 'Bring the other knee up, then step it back down slowly.', 'Finish all reps on one leg, then switch.'],
      mistakes: ['Pushing off with the bottom foot.', 'Knee falling inward on the way up.'],
      why: 'Stairs, curbs, hills: the step-up is the most useful leg exercise for daily life.',
      focus: { j: 'knee', label: 'Top knee', at: 'tl' },
      props: [{ k: 'box', x: 5, w: 26, h: 14 }],
      anim: { k: [stand({ p: [-2, 42], t: 168, lN: { ik: [14, 16.5] }, lF: { ik: [-8, 2.5] }, aN: [12, 6], aF: [-12, -6] }),
                  stand({ p: [13, 63.3], t: 180, lN: { ik: [14, 16.5] }, lF: [75, 0], aN: [-20, -10], aF: [22, 30] })], d: [1, 1.1], h: [0.25, 0.35] },
      alts: ['split-squat']
    },
    'bulgarian-split-squat': {
      name: 'Rear-foot-up split squat', area: ['lower'], pattern: 'lunge', type: 'reps', each: true, dose: { b: 5, i: 8, a: 10 }, eq: ['chair'], met: 3.8,
      cue: ['Most weight on the front leg.', 'Back knee straight down.', 'Hips square.'],
      setup: 'Top of your back foot on a sturdy chair behind you, front foot a long step forward.',
      steps: ['Lower the back knee toward the floor.', 'Keep the front heel down and torso slightly forward.', 'Push through the front foot to rise. Then switch legs.'],
      mistakes: ['Front foot too close to the chair.', 'Bouncing off the bottom.'],
      why: 'Lifting the back foot puts nearly all the load on one leg. Serious strength with no weights.',
      focus: { j: 'knee', label: 'Front leg', at: 'tr' },
      props: [{ k: 'box', x: -45, w: 20, h: 24 }],
      anim: { k: [stand({ p: [-4, 48], t: 172, lN: { ik: [14, 2.5] }, lF: { ik: [-31, 27.5], b: [0.3, -1] }, fF: -80 }),
                  stand({ p: [-6, 26], t: 168, lN: { ik: [14, 2.5] }, lF: { ik: [-31, 27.5], b: [0.3, -1] }, fF: -80 })], d: [1.4, 1.1], h: [0.3, 0.2] },
      alts: ['split-squat']
    },
    'calf-raise': {
      name: 'Calf raise', area: ['lower'], pattern: 'lunge', type: 'reps', dose: { b: 12, i: 15, a: 20 }, eq: [], met: 3.0,
      cue: ['Up on the big toe.', 'Pause at the top.', 'Slow down.'],
      setup: 'Stand tall, feet hip-width. Fingers on a wall for balance.',
      steps: ['Rise onto the balls of your feet as high as you can.', 'Pause for a second.', 'Lower slowly all the way down.'],
      mistakes: ['Rolling out to the little toes.', 'Bouncing.'],
      why: 'Strong calves and ankles are your first shock absorbers when you walk, run and land.',
      focus: { j: 'ankle', label: 'Calves', at: 'tr' },
      anim: { k: [stand(), stand({ p: [1, 53.3], lN: { ik: [1.07, 6.5] }, lF: { ik: [-1.9, 6.5] }, fN: 60, fF: 60 })], d: [0.8, 1.2], h: [0.2, 0.6] },
      alts: []
    },
    'balance': {
      name: 'Single-leg balance', area: ['lower', 'mobility'], pattern: 'balance', type: 'time', each: true, dose: { b: 20, i: 30, a: 40 }, eq: [], met: 2.0,
      cue: ['Grip the floor with your foot.', 'Hips level.', 'Eyes on one point.'],
      setup: 'Stand near a wall. Lift one knee to hip height.',
      steps: ['Spread your toes and press the whole foot into the floor.', 'Keep your hips level and stand tall.', 'Hold. To make it harder, close your eyes.'],
      mistakes: ['Hip of the standing leg pushing out to the side.', 'Locking the standing knee.'],
      why: 'Balance is a skill your nervous system can learn. The foot and ankle send the signals; this trains them to be quick.',
      focus: { j: 'ankle', label: 'Foot', at: 'tr' },
      anim: (function () {
        var P = stand({ lF: { ik: [0.5, 2.5] }, lN: [85, 0], aN: [-25, 60], aF: [-25, 58] });
        return { k: [P, extend(P, { p: [0.6, 49.2], t: 179 })], d: [1.4, 1.6] };
      })(),
      alts: []
    },
    'pad-balance': {
      name: 'Balance pad stand', area: ['lower', 'mobility'], pattern: 'balance', type: 'time', each: true, dose: { b: 20, i: 30, a: 40 }, eq: ['pad'], met: 2.0,
      cue: ['Soft knee.', 'Quiet foot.', 'Breathe.'],
      setup: 'Stand on the balance pad on one foot. A wall within reach.',
      steps: ['Let the foot and ankle make the small corrections.', 'Keep your hips level and your chest tall.', 'Hold, then switch.'],
      mistakes: ['Locking the knee.', 'Holding your breath.'],
      why: 'The soft surface makes your ankle and hip react faster. That is how you stop a fall before it starts.',
      focus: { j: 'foot', label: 'Balance pad', at: 'tr' },
      props: [{ k: 'pad', x: -9, w: 20, h: 4 }],
      anim: (function () {
        var P = stand({ p: [0.5, 53.2], lF: { ik: [0.5, 6.5] }, lN: [85, 0], aN: [-25, 60], aF: [-25, 58] });
        return { k: [P, extend(P, { p: [1.1, 53.1], t: 178.6 }), extend(P, { p: [0, 53.2], t: 181 })], d: [1.1, 1.3, 1.1] };
      })(),
      alts: ['balance']
    },

    // ---- Push ----------------------------------------------------------------
    'incline-push-up': {
      name: 'Incline push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: ['chair'], met: 3.8,
      cue: ['Body in one line.', 'Elbows at 45 degrees.', 'Chest to the edge.'],
      setup: 'Hands on the edge of a sturdy chair or counter, feet back.',
      steps: ['Lower your chest to the edge, elbows angled back.', 'Keep head, hips and heels in one line.', 'Push the edge away to come up.'],
      mistakes: ['Hips sagging.', 'Elbows flaring straight out.'],
      why: 'The higher the hands, the easier it gets. Same pattern as a push-up, built at the right level for you.',
      focus: { j: 'shoulder', label: 'Scapula', at: 'tr' },
      props: [{ k: 'box', x: 16, w: 22, h: 26 }],
      anim: (function () {
        var t = plank([-40, 7], 58), b = plank([-40, 7], 43.5);
        var arms = { aN: { ik: [23.5, 28.5] }, aF: { ik: [22.5, 28.5] } };
        return { k: [extend(t, arms), extend(b, arms)], d: [1.2, 1], h: [0.2, 0.2] };
      })(),
      alts: ['knee-push-up']
    },
    'knee-push-up': {
      name: 'Knee push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 6, i: 10, a: 15 }, eq: [], met: 3.8,
      cue: ['Knees, hips, head in one line.', 'Elbows back at 45.', 'Push the floor away.'],
      setup: 'Hands under shoulders, knees on the floor behind you.',
      steps: ['Lower your chest toward the floor between your hands.', 'Keep your hips in line with knees and shoulders.', 'Push back up.'],
      mistakes: ['Bending at the hips.', 'Only going halfway.'],
      why: 'Full range on the knees beats half range on the toes. Build depth first, then move to the toes.',
      focus: { j: 'shoulder', label: 'Scapula', at: 'tr' },
      anim: (function () {
        var arms = { aN: { ik: [24.5, 2.5] }, aF: { ik: [23.5, 2.5] } };
        return { k: [kneel([-20, 2.5], 32, arms), kneel([-20, 2.5], 10.5, arms)], d: [1.2, 1], h: [0.2, 0.2] };
      })(),
      alts: ['incline-push-up']
    },
    'push-up': {
      name: 'Push-up', area: ['upper', 'core'], pattern: 'push', type: 'reps', dose: { b: 5, i: 10, a: 15 }, eq: [], met: 3.8,
      cue: ['Plank first, then push.', 'Elbows at 45 degrees.', 'Chest leads, hips follow.'],
      setup: 'Hands a bit wider than shoulders, body in a straight line on your toes.',
      steps: ['Lower your whole body as one piece until your chest is close to the floor.', 'Elbows angle back, not out to the sides.', 'Push the floor away.'],
      mistakes: ['Hips sagging or piking up.', 'Head dropping toward the floor.'],
      why: 'A push-up is a moving plank. Your shoulder blades should glide around the ribs, which keeps the shoulder joint healthy.',
      focus: { j: 'shoulder', label: 'Scapula', at: 'tr' },
      anim: { k: [extend(hiTop, HANDS), extend(hiBot, HANDS)], d: [1.2, 1], h: [0.2, 0.2] },
      alts: ['knee-push-up']
    },
    'decline-push-up': {
      name: 'Feet-up push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 5, i: 8, a: 12 }, eq: ['chair'], met: 3.8,
      cue: ['Glutes tight.', 'Hands under shoulders.', 'Slow down.'],
      setup: 'Feet on a sturdy chair behind you, hands on the floor.',
      steps: ['Lower your chest toward the floor, body straight.', 'Keep your hips from sagging.', 'Push back up.'],
      mistakes: ['Lower back arching.', 'Rushing the descent.'],
      why: 'Raising the feet shifts more load to your shoulders and upper chest.',
      focus: { j: 'shoulder', label: 'Shoulders', at: 'tr' },
      props: [{ k: 'box', x: -60, w: 22, h: 26 }],
      anim: (function () {
        var arms = { aN: { ik: [31, 2.5] }, aF: { ik: [30, 2.5] } };
        return { k: [plank([-46, 31], 32, extend(arms, { fN: 20, fF: 20 })), plank([-46, 31], 11, extend(arms, { fN: 20, fF: 20 }))], d: [1.3, 1], h: [0.2, 0.2] };
      })(),
      alts: ['push-up']
    },
    'pike-push-up': {
      cam: { yaw: 14, pitch: 8 },
      name: 'Pike push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 5, i: 8, a: 10 }, eq: [], met: 3.8,
      cue: ['Hips high.', 'Head goes past the hands.', 'Elbows back.'],
      setup: 'Hands and feet on the floor, hips high in an upside-down V.',
      steps: ['Bend your elbows and lower the top of your head toward the floor in front of your hands.', 'Keep your hips high.', 'Push back up.'],
      mistakes: ['Hips dropping into a push-up.', 'Elbows flaring wide.'],
      why: 'This is your bodyweight overhead press. It builds the shoulders for anything you lift above your head.',
      focus: { j: 'shoulder', label: 'Shoulders', at: 'tr' },
      anim: { k: [{ p: [-6, 50], s: [12.3, 26.3], aN: { ik: [30.6, 2.5] }, aF: { ik: [29.6, 2.5] }, lN: { ik: [-22, 7] }, lF: { ik: [-23, 7] }, fN: 50, fF: 50 },
                  { p: [0, 42], s: [21, 20.6], aN: { ik: [30.6, 2.5], b: [-0.6, 0.8] }, aF: { ik: [29.6, 2.5], b: [-0.6, 0.8] }, lN: { ik: [-22, 7] }, lF: { ik: [-23, 7] }, fN: 50, fF: 50 }], d: [1.2, 1], h: [0.2, 0.2] },
      alts: ['incline-push-up']
    },
    'chair-dip': {
      cam: { yaw: 20 },
      name: 'Chair dip', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 6, i: 10, a: 12 }, eq: ['chair'], met: 3.8,
      cue: ['Shoulders down, away from ears.', 'Elbows straight back.', 'Hips close to the chair.'],
      setup: 'Hands on the front edge of a sturdy chair, fingers forward, knees bent.',
      steps: ['Bend your elbows and lower your hips toward the floor.', 'Stop when your upper arms are about level.', 'Press back up.'],
      mistakes: ['Going so low the shoulders roll forward.', 'Shrugging.'],
      why: 'Dips build the back of the arms. Keeping the shoulders down protects the front of the joint.',
      focus: { j: 'elbow', label: 'Elbows back', at: 'tr' },
      props: [{ k: 'box', x: -32, w: 22, h: 26 }],
      anim: { k: [{ p: [-9, 28.5], s: [-8, 58.5], aN: { ik: [-11, 28.5], b: [-1, 0] }, aF: { ik: [-12, 28.5], b: [-1, 0] }, lN: { ik: [22, 2.5] }, lF: { ik: [21, 2.5] } },
                  { p: [-7, 15.5], s: [-6, 45.5], aN: { ik: [-11, 28.5], b: [-1, 0] }, aF: { ik: [-12, 28.5], b: [-1, 0] }, lN: { ik: [22, 2.5] }, lF: { ik: [21, 2.5] } }], d: [1.2, 1], h: [0.2, 0.2] },
      alts: ['knee-push-up']
    },

    // ---- Pull and scapula ----------------------------------------------------
    'prone-y-raise': {
      name: 'Prone Y raise', area: ['upper', 'mobility'], pattern: 'pull', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: [], met: 2.8,
      cue: ['Thumbs up.', 'Shoulder blades down and back.', 'Neck long.'],
      setup: 'Lie face down, arms overhead in a Y, thumbs pointing up.',
      steps: ['Draw your shoulder blades down and lift your arms off the floor.', 'Hold for a breath.', 'Lower slowly.'],
      mistakes: ['Shrugging toward the ears.', 'Leading with the head. The arms do the lifting.'],
      why: 'The lower trapezius pulls the shoulder blade down and around. It is the muscle most of us lose from sitting, and the one that keeps shoulders pain-free overhead.',
      focus: { j: 'scapula', label: 'Scapula', at: 'tr' },
      anim: { k: [prone(), prone({ s: [22, 9.4], h: 96, aN: [108, 108], aF: [107, 107] })], d: [1, 1.2], h: [0.2, 0.7] },
      alts: ['wall-slide']
    },
    'wall-slide': {
      name: 'Wall slide', area: ['upper', 'mobility'], pattern: 'pull', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: [], met: 2.8,
      cue: ['Ribs down.', 'Forearms on the wall.', 'Slide up, pull down.'],
      setup: 'Back against a wall, arms in a goalpost shape, forearms touching the wall.',
      steps: ['Slide your arms up the wall without letting your ribs flare.', 'Go as high as you can while keeping contact.', 'Pull your elbows back down as if into your back pockets.'],
      mistakes: ['Lower back arching off the wall.', 'Shrugging.'],
      why: 'Your shoulder blades must rotate upward for the arms to go overhead. This trains that rhythm.',
      focus: { j: 'shoulder', label: 'Scapula', at: 'tr' },
      anim: { k: [{ v: 'f', p: [0, 49.3], t: 180, aN: [82, 172], lN: [3, 1] }, { v: 'f', p: [0, 49.3], t: 180, aN: [148, 158], lN: [3, 1] }], d: [1.3, 1.3], h: [0.3, 0.4] },
      alts: ['prone-y-raise']
    },
    'scap-push-up': {
      name: 'Scapular push-up', area: ['upper', 'core'], pattern: 'pull', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: [], met: 2.8,
      cue: ['Arms stay straight.', 'Spread the shoulder blades, then pinch.', 'Small and slow.'],
      setup: 'High plank, or on your knees.',
      steps: ['With straight arms, let your chest sink between your shoulders.', 'Push the floor away until your upper back rounds slightly.', 'Repeat slowly.'],
      mistakes: ['Bending the elbows.', 'Hips moving. Only the shoulder blades should.'],
      why: 'It isolates the serratus, the muscle that holds your shoulder blade against the ribs. Weak serratus shows up as shoulder pain in push-ups.',
      focus: { j: 'scapula', label: 'Scapula', at: 'tr' },
      anim: { k: [extend(plank([-44, 7], 32), extend(HANDS, { sp: 0.7 })), extend(plank([-44, 7], 30.2), extend(HANDS, { sp: -0.2 }))], d: [0.9, 0.9], h: [0.3, 0.3] },
      alts: ['wall-slide']
    },
    'table-row': {
      name: 'Table row', area: ['upper'], pattern: 'pull', type: 'reps', dose: { b: 6, i: 10, a: 12 }, eq: ['table'], met: 3.8,
      cue: ['Chest to the table.', 'Elbows past your ribs.', 'Body stiff as a plank.'],
      setup: 'Lie under a sturdy table. Grip the edge with both hands, heels on the floor. Check that the table can\'t tip.',
      steps: ['Pull your chest up toward the edge, elbows going past your ribs.', 'Keep your body in a straight line.', 'Lower with control.'],
      mistakes: ['Hips sagging.', 'Shrugging the shoulders up.'],
      why: 'Most of us push all day and pull too little. Rows balance the shoulder and build the upper back that holds your posture.',
      focus: { j: 'elbow', label: 'Elbow past ribs', at: 'tl' },
      props: [{ k: 'table', x: 21, w: 44, h: 43 }],
      anim: (function () {
        var arms = { aN: { ik: [24, 43.5], b: [-0.3, -1] }, aF: { ik: [23, 43.5], b: [-0.3, -1] }, fN: 172, fF: 172 };
        return { k: [plank([-52, 3], 13, arms), plank([-52, 3], 31, arms)], d: [1, 1.3], h: [0.3, 0.3] };
      })(),
      alts: ['prone-y-raise']
    },
    'superman': {
      name: 'Superman', area: ['core', 'upper'], pattern: 'pull', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: [], met: 2.8,
      cue: ['Lift long, not high.', 'Glutes on.', 'Look at the floor.'],
      setup: 'Lie face down, arms overhead.',
      steps: ['Squeeze your glutes and lift arms, chest and legs a few centimetres.', 'Reach long in both directions.', 'Hold a breath, then lower.'],
      mistakes: ['Cranking the neck up.', 'Kicking the legs high.'],
      why: 'The back of your body holds you upright all day. This trains it to work as one long chain.',
      focus: { j: 'spine', label: 'Long spine', at: 'tr' },
      anim: { k: [prone(), prone({ s: [22, 11], h: 97, sp: -0.6, aN: [106, 106], aF: [105, 105], lN: [-100, -100], lF: [-99, -99] })], d: [1.1, 1.2], h: [0.2, 0.8] },
      alts: ['prone-y-raise', 'bird-dog']
    },

    // ---- Kit: dumbbells and rings ---------------------------------------------
    'db-rdl': {
      name: 'Dumbbell Romanian deadlift', area: ['lower'], pattern: 'hinge', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: ['db'], met: 3.5,
      cue: ['Weights slide down your thighs.', 'Hips back.', 'Squeeze to stand.'],
      setup: 'Stand tall holding a dumbbell in each hand in front of your thighs.',
      steps: ['Push your hips back and let the weights slide down your legs.', 'Go until you feel a strong stretch in the back of your thighs.', 'Drive your hips forward to stand.'],
      mistakes: ['Squatting the weights down.', 'Weights drifting away from the legs.'],
      why: 'The best exercise for the back of your legs. Load here builds the hips that protect your back.',
      focus: { j: 'hip', label: 'Hips back', at: 'tl' },
      hold: { db: 'both' },
      anim: { k: [stand({ aN: [8, 4], aF: [6, 3] }), stand({ p: [-9.5, 46], t: 100, aN: [0, 0], aF: [-1, 0] })], d: [1.4, 1.1], h: [0.3, 0.3] },
      alts: ['hip-hinge']
    },
    'db-row': {
      name: 'One-arm dumbbell row', area: ['upper'], pattern: 'pull', type: 'reps', each: true, dose: { b: 8, i: 10, a: 12 }, eq: ['db', 'chair'], met: 3.5,
      cue: ['Elbow to your back pocket.', 'Flat back.', 'Shoulder away from the ear.'],
      setup: 'One hand on a sturdy chair, back flat, dumbbell hanging in the other hand.',
      steps: ['Pull the dumbbell up toward your hip, elbow close to your side.', 'Pause with your shoulder blade drawn back.', 'Lower all the way. Then switch sides.'],
      mistakes: ['Twisting the torso to lift.', 'Pulling toward the chest. Aim for the hip.'],
      why: 'Rowing toward the hip uses the lats, the big muscles that connect your arm to your pelvis.',
      focus: { j: 'elbow', label: 'Elbow back', at: 'tl' },
      props: [{ k: 'box', x: 20, w: 22, h: 26 }],
      hold: { db: 'near' },
      anim: { k: [stand({ p: [-8, 44], t: 100, aN: [0, 0], aF: { ik: [26, 28.5] }, lN: { ik: [-14, 2.5] }, lF: { ik: [2, 2.5] } }),
                  stand({ p: [-8, 44], t: 100, aN: [-110, 0], aF: { ik: [26, 28.5] }, lN: { ik: [-14, 2.5] }, lF: { ik: [2, 2.5] } })], d: [0.9, 1.2], h: [0.3, 0.4] },
      alts: ['prone-y-raise', 'table-row']
    },
    'db-press': {
      name: 'Dumbbell overhead press', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 8, i: 10, a: 12 }, eq: ['db'], met: 3.5,
      cue: ['Ribs down.', 'Press up and slightly back.', 'Glutes on.'],
      setup: 'Stand tall, dumbbells at your shoulders, palms facing each other.',
      steps: ['Brace and press the weights straight up.', 'Finish with your arms by your ears.', 'Lower to the shoulders with control.'],
      mistakes: ['Leaning back to push.', 'Shrugging at the bottom.'],
      why: 'Pressing overhead while standing makes your whole body a stable base for your arms.',
      focus: { j: 'ribs', label: 'Ribs down', at: 'tl' },
      hold: { db: 'both' },
      anim: { k: [stand({ aN: [30, 175], aF: [28, 176] }), stand({ aN: [178, 180], aF: [177, 179] })], d: [1, 1.2], h: [0.2, 0.3] },
      alts: ['pike-push-up']
    },
    'farmer-carry': {
      name: 'Farmer carry', area: ['full', 'core'], pattern: 'carry', type: 'time', dose: { b: 30, i: 40, a: 60 }, eq: ['load'], met: 3.5,
      cue: ['Tall, and walk past.', 'Shoulders down.', 'Short, quiet steps.'],
      setup: 'A dumbbell or a heavy bag in each hand. Two full shopping bags work too.',
      steps: ['Stand tall with the weights at your sides.', 'Walk with short, even steps. Turn and come back in a small space.', 'Put the weights down with a hinge, not a rounded back.'],
      mistakes: ['Leaning or shrugging.', 'Weights swinging.'],
      why: 'Carrying is the oldest strength test. It trains grip, shoulders and the core all at once, the way life loads you.',
      focus: { j: 'shoulder', label: 'Shoulders down', at: 'tr' },
      hold: { db: 'both' },
      anim: (function () {
        var arms = { aN: [2, 0], aF: [-2, 0] };
        var A = stand(extend(arms, { p: [0, 47.6], lN: { ik: [11, 2.5] }, lF: { ik: [-10, 5], b: [1, 0] }, fF: 60 }));
        var B = stand(extend(arms, { p: [0, 49], lN: { ik: [0.5, 2.5] }, lF: [22, -15] }));
        var C = stand(extend(arms, { p: [0, 47.6], lF: { ik: [11, 2.5] }, lN: { ik: [-10, 5], b: [1, 0] }, fN: 60 }));
        var D = stand(extend(arms, { p: [0, 49], lF: { ik: [0.5, 2.5] }, lN: [22, -15] }));
        return { k: [A, B, C, D], d: [0.42] };
      })(),
      alts: []
    },
    'suitcase-carry': {
      name: 'Suitcase carry', area: ['core', 'full'], pattern: 'carry', type: 'time', each: true, dose: { b: 20, i: 30, a: 40 }, eq: ['load'], met: 3.5,
      cue: ['Don\'t lean.', 'Both shoulders level.', 'Walk tall.'],
      setup: 'One dumbbell or heavy bag in one hand, the other hand free.',
      steps: ['Stand tall and level, as if the weight wasn\'t there.', 'Walk with short, even steps.', 'Switch hands halfway.'],
      mistakes: ['Leaning toward or away from the weight.', 'The free shoulder hiking up.'],
      why: 'Weight on one side tries to bend you sideways. Staying level trains the side of your core that a plank can\'t reach.',
      focus: { j: 'ribs', label: 'Stay level', at: 'tr' },
      hold: { db: 'near' },
      anim: (function () {
        var arms = { aN: [2, 0], aF: [-15, -5] };
        var A = stand(extend(arms, { p: [0, 47.6], lN: { ik: [11, 2.5] }, lF: { ik: [-10, 5], b: [1, 0] }, fF: 60 }));
        var B = stand(extend(arms, { p: [0, 49], lN: { ik: [0.5, 2.5] }, lF: [22, -15], aF: [5, 10] }));
        var C = stand(extend(arms, { p: [0, 47.6], lF: { ik: [11, 2.5] }, lN: { ik: [-10, 5], b: [1, 0] }, fN: 60, aF: [20, 30] }));
        var D = stand(extend(arms, { p: [0, 49], lF: { ik: [0.5, 2.5] }, lN: [22, -15], aF: [5, 10] }));
        return { k: [A, B, C, D], d: [0.42] };
      })(),
      alts: ['farmer-carry']
    },
    'ring-row': {
      name: 'Ring row', area: ['upper'], pattern: 'pull', type: 'reps', dose: { b: 6, i: 10, a: 12 }, eq: ['rings'], met: 3.8,
      cue: ['Lean back, body straight.', 'Pull the rings to your ribs.', 'Turn the rings as you pull.'],
      setup: 'Rings at waist height. Hold them and walk your feet forward until you lean back with straight arms.',
      steps: ['Pull your chest up to the rings, elbows past your ribs.', 'Let the rings turn so your palms face you at the top.', 'Lower slowly. Walk your feet forward to make it harder.'],
      mistakes: ['Hips sagging.', 'Pulling with the neck and shrugging.'],
      why: 'Rings move with you, so the shoulder finds its own natural path. That makes rows smoother on the joints.',
      focus: { j: 'elbow', label: 'Rings', at: 'tl' },
      hold: { rings: true },
      anim: (function () {
        var leg = { lN: { ik: [20, 3] }, lF: { ik: [19, 3] }, fN: 150, fF: 150 };
        return { k: [extend({ p: [-13.2, 36.2], t: -135, aN: { ik: [-13.2, 78.6] }, aF: { ik: [-14.2, 78.6] } }, leg),
                     extend({ p: [-3.5, 43.7], t: -150, aN: { ik: [-13.2, 78.6] }, aF: { ik: [-14.2, 78.6] } }, leg)], d: [1, 1.3], h: [0.3, 0.3] };
      })(),
      alts: ['table-row']
    },

    // ---- Cardio ------------------------------------------------------------
    'march': {
      name: 'March in place', area: ['cardio', 'full'], pattern: 'cardio', type: 'time', dose: { b: 30, i: 40, a: 45 }, eq: [], met: 2.0,
      cue: ['Knees up.', 'Opposite arm swings.', 'Stand tall.'],
      setup: 'Stand tall with space around you.',
      steps: ['Lift one knee toward hip height while the opposite arm swings forward.', 'Switch at a steady rhythm.', 'Speed up as you warm up.'],
      mistakes: ['Leaning back.', 'Stomping.'],
      why: 'An easy way to raise your heart rate and wake up the hips before training.',
      focus: { j: 'hip', label: 'Tall', at: 'tr' },
      anim: (function () {
        var A = stand({ lN: [60, 0], lF: { ik: [-0.5, 2.5] }, aN: [-28, -12], aF: [32, 70] });
        var B = stand();
        var C = stand({ lF: [60, 0], lN: { ik: [0.5, 2.5] }, aF: [-28, -12], aN: [32, 70] });
        return { k: [A, B, C, B], d: [0.36] };
      })(),
      alts: []
    },
    'high-knees': {
      name: 'High knees', area: ['cardio'], pattern: 'cardio', type: 'time', dose: { b: 20, i: 30, a: 40 }, eq: [], met: 7.5,
      cue: ['Knees to hip height.', 'Light on the balls of your feet.', 'Drive the arms.'],
      setup: 'Stand tall. Low impact option: a fast march.',
      steps: ['Run in place, bringing each knee up to hip height.', 'Land softly on the balls of your feet.', 'Pump the arms with the legs.'],
      mistakes: ['Leaning back.', 'Landing heavy on the heels.'],
      why: 'Quick, high steps raise the heart rate fast and train the hip flexors and calves to work at speed.',
      focus: { j: 'knee', label: 'Hip height', at: 'tr' },
      anim: (function () {
        var A = stand({ p: [0, 51], lN: [88, 0], lF: { ik: [0, 4.5] }, fF: 60, aN: [-35, -10], aF: [40, 100] });
        var C = stand({ p: [0, 51], lF: [88, 0], lN: { ik: [0, 4.5] }, fN: 60, aF: [-35, -10], aN: [40, 100] });
        return { k: [A, C], d: [0.26] };
      })(),
      alts: ['march']
    },
    'jumping-jacks': {
      name: 'Jumping jacks', area: ['cardio', 'full'], pattern: 'cardio', type: 'time', dose: { b: 20, i: 30, a: 40 }, eq: [], met: 7.5,
      cue: ['Soft knees.', 'Light feet.', 'Arms all the way up.'],
      setup: 'Stand tall, feet together. Low impact: step one foot out at a time.',
      steps: ['Jump your feet out wide as your arms swing overhead.', 'Jump back together, arms down.', 'Keep a steady rhythm.'],
      mistakes: ['Landing with locked knees.', 'Half arm swings.'],
      why: 'The classic warm-up: the whole body moves, the heart rate climbs and the shoulders get a full range.',
      focus: null,
      anim: { k: [{ v: 'f', p: [0, 49.3], t: 180, aN: [8, 4], lN: [2, 0] }, { v: 'f', p: [0, 47.5], t: 180, aN: [155, 165], lN: [15, 15] }], d: [0.38, 0.38] },
      alts: ['march']
    },
    'burpee': {
      name: 'Burpee', area: ['cardio', 'full'], pattern: 'cardio', type: 'reps', dose: { b: 5, i: 8, a: 12 }, eq: [], met: 7.5,
      cue: ['Hands down, feet back.', 'Body straight in the plank.', 'Jump tall.'],
      setup: 'Stand with space in front of you. Easier: step back and in instead of jumping.',
      steps: ['Squat and put your hands on the floor.', 'Jump or step your feet back to a plank.', 'Jump or step your feet in, then stand and jump up.'],
      mistakes: ['Sagging hips in the plank.', 'Landing heavy.'],
      why: 'Floor to standing to air in a few seconds. It trains you to get up and down well, which matters more every year.',
      focus: { j: 'hip', label: 'Plank', at: 'tr' },
      anim: (function () {
        var hands = { aN: { ik: [22.5, 2.5] }, aF: { ik: [21.5, 2.5] } };
        var K0 = stand();
        var K1 = stand(extend(hands, { p: [-6, 23], t: 116, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] } }));
        var K2 = plank([-50, 7], 32, hands);
        var K4 = stand({ p: [0.5, 57], lN: { ik: [1, 10.5] }, lF: { ik: [-1, 10.5] }, fN: 40, fF: 40, aN: [170, 175], aF: [168, 174] });
        return { k: [K0, K1, K2, K1, K4], d: [0.45, 0.35, 0.35, 0.35, 0.4], h: [0.2, 0, 0.25, 0, 0] };
      })(),
      alts: ['squat']
    },
    'inchworm': {
      cam: { yaw: 18 },
      name: 'Inchworm', area: ['mobility', 'full'], pattern: 'mobility', type: 'reps', dose: { b: 4, i: 6, a: 8 }, eq: [], met: 3.8,
      cue: ['Walk the hands out.', 'Plank, then walk back.', 'Soft knees are fine.'],
      setup: 'Stand with feet hip-width.',
      steps: ['Fold forward and put your hands on the floor, bending your knees as needed.', 'Walk your hands out to a plank.', 'Walk them back and roll up to stand.'],
      mistakes: ['Hips sagging in the plank.', 'Rushing the walk.'],
      why: 'A warm-up that stretches the back of the legs and wakes up the shoulders and core in one flow.',
      focus: { j: 'hip', label: 'Hamstrings', at: 'tl' },
      anim: (function () {
        var K0 = stand();
        var K1 = { p: [-6, 46], t: 30, sp: 0.5, aN: { ik: [13, 2.5] }, aF: { ik: [12, 2.5] }, lN: { ik: [1.5, 2.5] }, lF: { ik: [-1.5, 2.5] } };
        var K2 = { p: [-1, 40], t: 72, aN: { ik: [44, 2.5] }, aF: { ik: [43, 2.5] }, lN: { ik: [2, 5] }, lF: { ik: [1, 5] }, fN: 45, fF: 45 };
        var K3 = plank([3, 7], 32, { aN: { ik: [75.5, 2.5] }, aF: { ik: [74.5, 2.5] }, fN: 35, fF: 35 });
        return { k: [K0, K1, K2, K3, K2, K1], d: [0.9, 0.8, 0.8, 0.8, 0.8, 0.9], h: [0.3, 0.1, 0, 0.5, 0, 0.1] };
      })(),
      alts: ['forward-fold']
    },

    // ---- Mobility --------------------------------------------------------------
    'cat-cow': {
      name: 'Cat and cow', area: ['mobility'], pattern: 'mobility', type: 'reps', dose: { b: 6, i: 8, a: 10 }, eq: [], met: 2.3,
      cue: ['Move one bone at a time.', 'Breathe out to round.', 'Breathe in to arch.'],
      setup: 'On hands and knees, hands under shoulders.',
      steps: ['Breathe out and round your back up, tucking tail and chin.', 'Breathe in and let your belly drop, chest forward, tail up.', 'Flow slowly between the two.'],
      mistakes: ['Only moving the neck.', 'Rushing.'],
      why: 'Your spine is 24 moving bones, not one stick. This reminds each segment how to move.',
      focus: { j: 'spine', label: 'Spine', at: 'tr' },
      anim: { k: [quad({ sp: 1, h: 125 }), quad({ sp: -0.9, h: 65 })], d: [1.8, 1.8], h: [0.3, 0.3] },
      alts: []
    },
    'childs-pose': {
      cam: { yaw: 30, pitch: 20 },
      name: 'Child\'s pose', area: ['mobility'], pattern: 'mobility', type: 'time', dose: { b: 30, i: 40, a: 45 }, eq: [], met: 2.3,
      cue: ['Hips to heels.', 'Breathe into your back.', 'Let the arms be heavy.'],
      setup: 'Kneel, big toes together, knees apart.',
      steps: ['Sit your hips back toward your heels.', 'Walk your hands forward and rest your forehead down.', 'Breathe slowly into your back.'],
      mistakes: ['Forcing the hips down. Use a cushion if needed.'],
      why: 'A resting position that gently opens the hips and the back while your breathing slows down.',
      focus: { j: 'ribs', label: 'Wide back', at: 'tr' },
      anim: (function () {
        var P = { p: [-17, 12], t: 80, h: 95, sp: 0.5, aN: [88, 90], aF: [87, 89], lN: [H.ang([-17, 12], [5, 2.5]), -90], lF: [H.ang([-17, 12], [4, 2.5]), -90], fN: -90, fF: -90 };
        return { k: breathe(P, 0.5), d: [2.4, 3] };
      })(),
      alts: []
    },
    'down-dog': {
      cam: { yaw: 16, pitch: 8 },
      name: 'Downward dog', area: ['mobility'], pattern: 'mobility', type: 'time', dose: { b: 25, i: 30, a: 40 }, eq: [], met: 2.3,
      cue: ['Push the floor away.', 'Hips high and back.', 'Pedal the heels.'],
      setup: 'Hands and feet on the floor, hips high.',
      steps: ['Push through your hands so your chest moves toward your thighs.', 'Lift your hips up and back. Bend your knees if your back rounds.', 'Pedal one heel down, then the other.'],
      mistakes: ['Rounding the back to get the heels down.', 'Hands too close to the feet.'],
      why: 'It stretches the calves and the back of the legs while your shoulders carry weight overhead.',
      focus: { j: 'hip', label: 'Hips high', at: 'tr' },
      anim: (function () {
        var base = { p: [-8, 50], s: [9.5, 25.6], aN: { ik: [26, 2.5] }, aF: { ik: [25, 2.5] }, fN: 50, fF: 50 };
        return { k: [extend(base, { lN: { ik: [-25, 3.5] }, lF: { ik: [-23, 8] } }), extend(base, { lN: { ik: [-23, 8] }, lF: { ik: [-25, 3.5] } })], d: [1.2, 1.2], h: [0.5, 0.5] };
      })(),
      alts: ['childs-pose']
    },
    'hip-flexor-stretch': {
      name: 'Half-kneeling hip stretch', area: ['mobility'], pattern: 'mobility', type: 'time', each: true, dose: { b: 30, i: 30, a: 40 }, eq: [], met: 2.3,
      cue: ['Tuck your tail.', 'Squeeze the back glute.', 'Reach up tall.'],
      setup: 'Kneel on one knee, the other foot flat in front. Cushion under the knee.',
      steps: ['Tuck your pelvis under and squeeze the glute of the back leg.', 'Shift your hips forward a little until you feel the front of the back hip.', 'Reach the arm on that side up. Hold and breathe.'],
      mistakes: ['Arching the lower back. Tuck the pelvis under.', 'Lunging too far forward.'],
      why: 'Sitting keeps the front of the hip short. Opening it lets your glutes work and takes pressure off your lower back.',
      focus: { j: 'hip', label: 'Front of the hip', at: 'tl' },
      anim: (function () {
        var knee = [-12, 2.5];
        var A = { p: [-6, 26], t: 180, lN: { ik: [20, 2.5] }, lF: [H.ang([-6, 26], knee), -90], fF: -90, aN: [20, -30], aF: [176, 180] };
        var B = { p: [-1, 25], t: 178, lN: { ik: [20, 2.5] }, lF: [H.ang([-1, 25], knee), -90], fF: -90, aN: [20, -30], aF: [178, 182] };
        return { k: [A, B], d: [2, 2.4], h: [0.3, 0.8] };
      })(),
      alts: []
    },
    'forward-fold': {
      cam: { yaw: 12, pitch: 8 },
      name: 'Standing forward fold', area: ['mobility'], pattern: 'mobility', type: 'time', dose: { b: 30, i: 30, a: 40 }, eq: [], met: 2.3,
      cue: ['Soft knees.', 'Heavy head.', 'Breathe out to sink.'],
      setup: 'Stand with feet hip-width.',
      steps: ['Bend your knees slightly and fold forward from the hips.', 'Let your head and arms hang.', 'Breathe out and let gravity take you a little lower each time.'],
      mistakes: ['Locking the knees and bouncing.'],
      why: 'Gravity does the stretching. You only need to relax and breathe.',
      focus: { j: 'hip', label: 'Hamstrings', at: 'tr' },
      anim: (function () {
        var P = { p: [-5.5, 47.5], t: 18, h: 6, sp: 0.6, aN: { ik: [5, 9] }, aF: { ik: [4, 9] }, lN: { ik: [1.5, 2.5] }, lF: { ik: [-1.5, 2.5] } };
        return { k: [P, extend(P, { t: 12, aN: { ik: [6, 6] }, aF: { ik: [5, 6] } })], d: [2.4, 2.8] };
      })(),
      alts: []
    },
    'deep-squat-hold': {
      name: 'Deep squat hold', area: ['mobility', 'lower'], pattern: 'mobility', type: 'time', dose: { b: 20, i: 30, a: 45 }, eq: [], met: 2.3,
      cue: ['Heels down.', 'Elbows push the knees out.', 'Chest up.'],
      setup: 'Feet wider than hips, toes out. Hold a door frame if you need to.',
      steps: ['Sink into the deepest squat you can with your heels down.', 'Bring your palms together and press the elbows into your knees.', 'Breathe and let the hips open.'],
      mistakes: ['Heels lifting.', 'Rounding hard through the back.'],
      why: 'A deep squat is a natural resting position. Spending time here keeps hips, knees and ankles moving well.',
      focus: { j: 'hip', label: 'Hips open', at: 'tr' },
      anim: (function () {
        var P = stand({ p: [-8, 17.5], t: 156, lN: { ik: [2, 2.5] }, lF: { ik: [-1, 2.5] }, aN: [40, 150], aF: [38, 152] });
        return { k: breathe(P, 0.5), d: [2, 2.4] };
      })(),
      alts: ['box-squat']
    },
    'cobra': {
      name: 'Cobra', area: ['mobility'], pattern: 'mobility', type: 'reps', dose: { b: 6, i: 8, a: 10 }, eq: [], met: 2.3,
      cue: ['Hips stay down.', 'Long neck.', 'Breathe in as you rise.'],
      setup: 'Lie face down, hands under your shoulders.',
      steps: ['Press gently and lift your chest, keeping your hips on the floor.', 'Go only as high as is comfortable.', 'Lower slowly.'],
      mistakes: ['Pushing into pain.', 'Shrugging the shoulders.'],
      why: 'After sitting and bending, your spine likes a gentle move the other way.',
      focus: { j: 'spine', label: 'Spine', at: 'tl' },
      anim: { k: [prone({ aN: { ik: [24, 2.5], b: [-1, 0.5] }, aF: { ik: [23, 2.5], b: [-1, 0.5] } }),
                  prone({ t: 120, s: null, h: 112, sp: -0.8, aN: { ik: [24, 2.5], b: [-1, 0.5] }, aF: { ik: [23, 2.5], b: [-1, 0.5] } })], d: [1.4, 1.4], h: [0.3, 0.6] },
      alts: ['superman', 'cat-cow']
    },
    'leg-swings': {
      name: 'Leg swings', area: ['mobility'], pattern: 'mobility', type: 'time', each: true, dose: { b: 20, i: 20, a: 25 }, eq: [], met: 2.3,
      cue: ['Relaxed leg.', 'Tall standing side.', 'Bigger each swing.'],
      setup: 'Stand side-on to a wall, one hand on it.',
      steps: ['Swing the outside leg forward and back like a pendulum.', 'Let it get a little bigger each time.', 'Switch legs.'],
      mistakes: ['Arching the back to swing higher.'],
      why: 'Dynamic warm-up for the hips: it raises temperature and range before you load them.',
      focus: { j: 'hip', label: 'Hip', at: 'tr' },
      anim: { k: [stand({ lF: { ik: [0.5, 2.5] }, lN: [55, 40], aN: [-25, 60] }), stand({ lF: { ik: [0.5, 2.5] }, lN: [-35, -32], aN: [-25, 60] })], d: [0.6, 0.6] },
      alts: []
    },
    'arm-circles': {
      name: 'Arm circles', area: ['mobility', 'upper'], pattern: 'mobility', type: 'time', dose: { b: 20, i: 30, a: 30 }, eq: [], met: 2.3,
      cue: ['Big, slow circles.', 'Ribs stay down.', 'Switch direction halfway.'],
      setup: 'Stand tall, arms by your sides.',
      steps: ['Swing your arms in big circles, forward.', 'Keep your ribs down so the shoulders do the moving.', 'Halfway through, go backward.'],
      mistakes: ['Arching the back as the arms go up.'],
      why: 'Warms up the shoulder through its whole range before any push or pull.',
      focus: { j: 'shoulder', label: 'Shoulder', at: 'tr' },
      anim: { lin: true, wrap: true, d: [0.5, 0.5, 0.5, 0.5, 0],
              k: [stand({ aN: [0, 0], aF: [0, 0] }), stand({ aN: [90, 90], aF: [90, 90] }), stand({ aN: [180, 180], aF: [180, 180] }),
                  stand({ aN: [270, 270], aF: [270, 270] }), stand({ aN: [360, 360], aF: [360, 360] })] },
      alts: []
    }
  };

  // ---- More moves: the classic home-workout set (abs, chest, arms, legs, shoulders) ------------
  var pushAnim = EX['push-up'].anim;
  function crunchLegs(o) { return supine(extend({ lN: { ik: [26, 2.5], b: [0, 1] }, lF: { ik: [25, 2.5], b: [0, 1] } }, o)); }
  var MORE = {
    'crunch': {
      name: 'Crunch', area: ['core'], pattern: 'brace', type: 'reps', dose: { b: 12, i: 16, a: 20 }, eq: [], met: 3.8,
      cue: ['Ribs toward hips.', 'Chin tucked, neck long.', 'Breathe out on the way up.'],
      setup: 'Lie on your back, knees bent, feet flat. Reach your hands toward your knees.',
      steps: ['Breathe out and curl your head and shoulders off the floor, ribs toward your hips.', 'Stop when your shoulder blades lift. Your lower back stays down.', 'Lower slowly.'],
      mistakes: ['Pulling on your neck.', 'Swinging up with momentum.'],
      why: 'A short curl works the six-pack muscle through its real job: bringing the ribs toward the pelvis. Small and controlled beats big and fast.',
      focus: { j: 'core', label: 'Abs', at: 'tl' },
      anim: { k: [crunchLegs({ aN: [95, 95], aF: [94, 94] }), crunchLegs({ s: [-19.5, 16], h: -68, sp: 0.5, aN: [102, 102], aF: [101, 101] })], d: [0.9, 1.2], h: [0.2, 0.3] },
      alts: ['dead-bug', 'bird-dog']
    },
    'leg-raise': {
      name: 'Leg raise', area: ['core'], pattern: 'brace', type: 'reps', dose: { b: 8, i: 12, a: 15 }, eq: [], met: 3.8,
      cue: ['Lower back stays down.', 'Legs long and together.', 'Lower slowly.'],
      setup: 'Lie on your back, legs straight, hands under your hips or by your sides.',
      steps: ['Press your lower back into the floor and lift both legs until they point at the ceiling.', 'Lower them slowly, stopping before your back starts to arch.', 'Bend your knees a little to make it easier.'],
      mistakes: ['Arching the lower back as the legs come down.', 'Dropping the legs fast.'],
      why: 'The lower abs work hardest on the way down, keeping the pelvis from tipping as the legs get heavy.',
      focus: { j: 'hip', label: 'Lower abs', at: 'tl' },
      anim: { k: [supine({ lN: [94, 94], lF: [93, 93] }), supine({ lN: [178, 178], lF: [177, 177] })], d: [1.1, 1.6], h: [0.2, 0.3] },
      alts: ['reverse-crunch', 'dead-bug', 'bird-dog']
    },
    'bicycle-crunch': {
      name: 'Bicycle crunch', area: ['core'], pattern: 'brace', type: 'reps', each: true, dose: { b: 8, i: 12, a: 16 }, eq: [], met: 3.8,
      cue: ['Shoulder toward the opposite knee.', 'Long leg stays low.', 'Slow and steady.'],
      setup: 'Lie on your back, fingertips behind your ears, shoulders lifted, knees above your hips.',
      steps: ['Bring one knee in while the other leg stretches out long.', 'Turn your opposite shoulder toward the bent knee.', 'Switch sides in a slow pedalling rhythm.'],
      mistakes: ['Pulling the head with the hands.', 'Rushing so the legs just flap.'],
      why: 'Twisting while the legs pedal trains the obliques, the muscles that turn and steady your trunk.',
      focus: { j: 'core', label: 'Obliques', at: 'tr' },
      anim: (function () {
        var up = { s: [-20, 13.5], h: -72, sp: 0.4, aN: [-150, -15], aF: [-148, -14] };
        return { k: [supine(extend(up, { lN: [-155, 100], lF: [96, 96] })), supine(extend(up, { lN: [96, 96], lF: [-155, 100] }))], d: [0.7, 0.7], h: [0.15, 0.15] };
      })(),
      alts: ['dead-bug', 'bird-dog']
    },
    'flutter-kicks': {
      name: 'Flutter kicks', area: ['core', 'cardio'], pattern: 'brace', type: 'time', dose: { b: 20, i: 30, a: 40 }, eq: [], met: 3.8,
      cue: ['Lower back on the floor.', 'Small, quick kicks.', 'Keep breathing.'],
      setup: 'Lie on your back, hands under your hips, legs straight and just off the floor.',
      steps: ['Lift both legs a few centimetres.', 'Kick them up and down in small, quick movements.', 'Raise the legs higher if your back starts to arch.'],
      mistakes: ['Lower back arching off the floor.', 'Big, slow swings.'],
      why: 'Holding the legs off the floor while they move keeps the deep abs working the whole time.',
      focus: { j: 'hip', label: 'Lower abs', at: 'tl' },
      anim: { k: [supine({ s: [-21.6, 9], h: -80, lN: [103, 103], lF: [96, 96] }), supine({ s: [-21.6, 9], h: -80, lN: [96, 96], lF: [103, 103] })], d: [0.28, 0.28] },
      alts: ['dead-bug', 'bird-dog']
    },
    'v-up': {
      name: 'V-up', area: ['core'], pattern: 'brace', type: 'reps', dose: { b: 5, i: 8, a: 12 }, eq: [], met: 3.8,
      cue: ['Reach for your toes.', 'Legs and chest rise together.', 'Lower with control.'],
      setup: 'Lie on your back, arms overhead, legs straight.',
      steps: ['Lift your legs and chest at the same time, reaching your hands toward your feet.', 'Balance for a moment on your seat in a V.', 'Lower both ends slowly back to the floor.'],
      mistakes: ['Jerking up with the arms.', 'Crashing back down.'],
      why: 'Both ends of the body fold toward the middle, so the whole front of the trunk works in one move.',
      focus: { j: 'core', label: 'Abs', at: 'tr' },
      anim: { k: [supine({ aN: [-95, -95], aF: [-94, -94], lN: [93, 93], lF: [92, 92] }),
                  { p: [8, 6.6], t: -138, h: -128, sp: 0.35, aN: [122, 122], aF: [121, 121], lN: [133, 133], lF: [132, 132] }], d: [0.8, 1.2], h: [0.2, 0.3] },
      alts: ['crunch', 'reverse-crunch', 'bird-dog']
    },
    'knee-to-chest': {
      name: 'Knees to chest', area: ['mobility'], pattern: 'mobility', type: 'time', dose: { b: 30, i: 30, a: 40 }, eq: [], met: 2.3,
      cue: ['Hug your knees in.', 'Lower back long on the floor.', 'Slow breaths.'],
      setup: 'Lie on your back and pull both knees toward your chest.',
      steps: ['Hold your shins or the backs of your thighs.', 'Gently draw your knees closer as you breathe out.', 'Let your lower back lengthen into the floor.'],
      mistakes: ['Lifting your head off the floor.', 'Pulling hard. This one is gentle.'],
      why: 'A gentle rounding of the lower back after work that arched or loaded it.',
      focus: { j: 'spine', label: 'Lower back', at: 'tr' },
      anim: (function () {
        var P = supine({ sp: 0.3, lN: [-158, 112], lF: [-156, 114], aN: { ik: [2, 25], b: [0, -1] }, aF: { ik: [1, 24], b: [0, -1] } });
        return { k: [P, extend(P, { lN: [-163, 108], lF: [-161, 110] })], d: [2.2, 2.6] };
      })(),
      alts: ['childs-pose']
    },
    'wide-push-up': {
      name: 'Wide push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 5, i: 10, a: 14 }, eq: [], met: 3.8,
      cue: ['Hands wider than your shoulders.', 'Chest to the floor.', 'Body in one line.'],
      setup: 'Hands about one and a half shoulder-widths apart, body straight on your toes. Knees down to make it easier.',
      steps: ['Lower your chest toward the floor between your hands.', 'Keep your hips in line with your shoulders.', 'Push back up.'],
      mistakes: ['Hands so wide the shoulders hurt.', 'Hips sagging.'],
      why: 'Wider hands give the chest more of the work and the triceps less.',
      focus: { j: 'shoulder', label: 'Chest', at: 'tr' },
      anim: { k: pushAnim.k, d: pushAnim.d, h: pushAnim.h, handsZ: 16 },
      alts: ['push-up', 'knee-push-up']
    },
    'diamond-push-up': {
      name: 'Diamond push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 4, i: 8, a: 12 }, eq: [], met: 3.8,
      cue: ['Hands together under your chest.', 'Elbows brush your ribs.', 'Slow down.'],
      setup: 'Thumbs and index fingers touching to make a diamond under your chest. Knees down to make it easier.',
      steps: ['Lower your chest to your hands, elbows close to your sides.', 'Keep your body in one line.', 'Push back up.'],
      mistakes: ['Elbows flaring out.', 'Shortening the range.'],
      why: 'Hands close together put the triceps to work, the muscle that straightens your elbow.',
      focus: { j: 'elbow', label: 'Triceps', at: 'tr' },
      anim: { k: pushAnim.k, d: pushAnim.d, h: pushAnim.h, handsZ: 2.5 },
      alts: ['push-up', 'knee-push-up']
    },
    'wall-push-up': {
      cam: { yaw: -32 },
      name: 'Wall push-up', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 10, i: 15, a: 20 }, eq: [], met: 2.8,
      cue: ['Body in one line.', 'Elbows back at 45.', 'Chest to the wall.'],
      setup: 'Stand an arm\'s length from a wall, hands on it at shoulder height.',
      steps: ['Lower your chest toward the wall, keeping your body straight.', 'Elbows angle back, not out.', 'Push the wall away.'],
      mistakes: ['Bending at the hips.', 'Only moving the head.'],
      why: 'The easiest push-up there is. It teaches the movement and builds the base for the floor version.',
      focus: { j: 'shoulder', label: 'Chest', at: 'tl' },
      props: [{ k: 'wall', x: 50, side: 1 }],
      anim: (function () {
        var arms = { aN: { ik: [48.5, 75] }, aF: { ik: [48, 75] } };
        return { k: [extend(plank([-5, 2.5], 75), arms), extend(plank([-5, 2.5], 69), arms)], d: [1, 1], h: [0.2, 0.2] };
      })(),
      alts: ['incline-push-up']
    },
    'db-curl': {
      name: 'Dumbbell curl', area: ['upper'], pattern: 'pull', type: 'reps', dose: { b: 10, i: 12, a: 15 }, eq: ['db'], met: 3.5,
      cue: ['Elbows pinned to your sides.', 'Squeeze at the top.', 'Three seconds down.'],
      setup: 'Stand tall, a dumbbell in each hand, palms forward.',
      steps: ['Bend your elbows and curl the weights up toward your shoulders.', 'Keep your upper arms still by your sides.', 'Lower slowly all the way down.'],
      mistakes: ['Swinging the body to lift.', 'Elbows drifting forward.'],
      why: 'The biceps bend the elbow and turn the palm up. Every pull and carry uses them.',
      focus: { j: 'elbow', label: 'Biceps', at: 'tr' },
      hold: { db: 'both' },
      anim: { k: [stand({ aN: [4, 2], aF: [2, 1] }), stand({ aN: [6, 150], aF: [4, 148] })], d: [0.9, 1.4], h: [0.2, 0.3] },
      alts: ['table-row', 'prone-y-raise']
    },
    'db-triceps': {
      name: 'Overhead triceps extension', area: ['upper'], pattern: 'push', type: 'reps', dose: { b: 10, i: 12, a: 15 }, eq: ['db'], met: 3.5,
      cue: ['Elbows point up.', 'Only the forearms move.', 'Ribs down.'],
      setup: 'Stand tall, holding one dumbbell overhead with both hands.',
      steps: ['Bend your elbows and lower the weight behind your head.', 'Keep your upper arms close to your ears.', 'Straighten your arms to lift it back up.'],
      mistakes: ['Elbows flaring wide.', 'Arching the lower back.'],
      why: 'With the arms overhead, the long part of the triceps is stretched, so it works through its full length.',
      focus: { j: 'elbow', label: 'Triceps', at: 'tr' },
      hold: { db: 'near' },
      anim: { k: [stand({ aN: [176, 180], aF: [175, 179] }), stand({ aN: [172, -22], aF: [171, -21] })], d: [1.2, 1], h: [0.2, 0.2], handsZ: 2.5 },
      alts: ['chair-dip', 'diamond-push-up']
    },
    'punches': {
      name: 'Punches', area: ['cardio', 'upper'], pattern: 'cardio', type: 'time', dose: { b: 30, i: 40, a: 45 }, eq: [], met: 3.8,
      cue: ['Fists by your chin.', 'Turn into each punch.', 'Fast and light.'],
      setup: 'Stand with one foot slightly forward, knees soft, fists up by your chin.',
      steps: ['Punch one arm straight forward, turning your shoulder into it.', 'Pull it back to your chin as the other arm punches.', 'Keep a quick, steady rhythm.'],
      mistakes: ['Snapping the elbow straight.', 'Dropping the guard hand.'],
      why: 'Fast arm work raises the heart rate with no impact on the joints.',
      focus: { j: 'shoulder', label: 'Shoulders', at: 'tr' },
      anim: (function () {
        var legs = { p: [0, 48.5], lN: { ik: [8, 2.5] }, lF: { ik: [-8, 2.5] } }, guard = [35, 165];
        return { k: [stand(extend(legs, { aN: [88, 90], aF: guard })), stand(extend(legs, { aN: guard, aF: [88, 90] }))], d: [0.24, 0.24], h: [0.06, 0.06] };
      })(),
      alts: ['march']
    },
    'arm-raise': {
      name: 'Side arm raise', area: ['upper', 'mobility'], pattern: 'push', type: 'reps', dose: { b: 12, i: 16, a: 20 }, eq: [], met: 2.8,
      cue: ['Lead with the elbows.', 'Shoulders down, away from the ears.', 'Up to shoulder height.'],
      setup: 'Stand tall, arms by your sides, a slight bend in the elbows.',
      steps: ['Raise both arms out to the sides up to shoulder height.', 'Pause for a moment.', 'Lower slowly.'],
      mistakes: ['Shrugging.', 'Swinging up with the body.'],
      why: 'The side of the shoulder lifts the arm away from the body. Strong here, the shoulder stays centred when you reach.',
      focus: { j: 'shoulder', label: 'Shoulders', at: 'tr' },
      anim: { k: [{ v: 'f', p: [0, 49.3], t: 180, aN: [10, 12], lN: [2, 0] }, { v: 'f', p: [0, 49.3], t: 180, aN: [88, 92], lN: [2, 0] }], d: [1, 1.2], h: [0.2, 0.4] },
      alts: ['wall-slide']
    },
    'plank-up-down': {
      name: 'Plank up-down', area: ['core', 'upper'], pattern: 'push', type: 'reps', each: true, dose: { b: 4, i: 6, a: 10 }, eq: [], met: 3.8,
      cue: ['Hips stay level.', 'Hand where the elbow was.', 'Feet wide for balance.'],
      setup: 'Forearm plank, feet a bit wider than your hips.',
      steps: ['Put one hand where that elbow was and push up, then the other, into a high plank.', 'Lower back down one forearm at a time.', 'Lead with the other arm next time.'],
      mistakes: ['Hips swinging side to side.', 'Feet too close together.'],
      why: 'Moving from forearms to hands under control builds the shoulders and makes the core resist rocking.',
      focus: { j: 'hip', label: 'Hips level', at: 'tl' },
      anim: (function () {
        var lo = plank([-52, 7], 18, { aN: [0, 90], aF: [0, 90], hN: 90, hF: 90 });
        var hi = plank([-52, 7], 32, { aN: { ik: [21.5, 2.5] }, aF: { ik: [20.5, 2.5] } });
        return { k: [lo, hi], d: [0.8, 0.8], h: [0.4, 0.4] };
      })(),
      alts: ['plank', 'shoulder-taps']
    },
    'sumo-squat': {
      name: 'Sumo squat', area: ['lower'], pattern: 'squat', type: 'reps', dose: { b: 10, i: 15, a: 20 }, eq: [], met: 3.8,
      cue: ['Feet wide, toes out.', 'Knees push out over the toes.', 'Chest tall.'],
      setup: 'Feet wider than your shoulders, toes turned out, hands together at your chest.',
      steps: ['Sit straight down between your feet, pushing your knees out.', 'Keep your chest tall and your heels down.', 'Squeeze your glutes to stand up.'],
      mistakes: ['Knees falling inward.', 'Leaning forward.'],
      why: 'The wide stance shifts the work to the inner thighs and glutes, and opens the hips.',
      focus: { j: 'kneeF', label: 'Inner thighs', at: 'tl' },
      anim: (function () {
        var arms = { aN: [25, -155] };
        return { k: [extend({ v: 'f', p: [0, 47.6], t: 180, lN: { ik: [17, 2.5] }, lF: { ik: [-17, 2.5] } }, arms),
                     extend({ v: 'f', p: [0, 29], t: 180, lN: { ik: [17, 2.5] }, lF: { ik: [-17, 2.5] } }, arms)], d: [1.2, 1.1], h: [0.3, 0.3] };
      })(),
      alts: ['squat']
    },
    'donkey-kick': {
      name: 'Donkey kick', area: ['lower'], pattern: 'hinge', type: 'reps', each: true, dose: { b: 10, i: 12, a: 15 }, eq: [], met: 3.0,
      cue: ['Foot drives to the ceiling.', 'Knee stays bent.', 'Back stays flat.'],
      setup: 'On hands and knees, hands under shoulders, knees under hips.',
      steps: ['Keeping the knee bent, lift one leg until the thigh is level with your back.', 'Squeeze the glute at the top.', 'Lower without touching down, then repeat. Switch sides.'],
      mistakes: ['Arching the lower back to kick higher.', 'Rocking onto the other hip.'],
      why: 'Extending the hip is the glute\'s main job. This isolates it while the spine stays still.',
      focus: { j: 'hip', label: 'Glutes', at: 'tr' },
      anim: { k: [quad(), quad({ lN: [-92, 175], fN: -90 })], d: [0.7, 0.9], h: [0.1, 0.4] },
      alts: ['glute-bridge', 'bird-dog']
    },
    'side-leg-raise': {
      name: 'Side-lying leg raise', area: ['lower'], pattern: 'balance', type: 'reps', each: true, dose: { b: 10, i: 15, a: 20 }, eq: [], met: 3.0,
      cue: ['Hips stacked.', 'Lead with the heel.', 'Toes point forward.'],
      setup: 'Lie on your side, legs straight and stacked, head resting on your lower arm.',
      steps: ['Lift your top leg to about 45 degrees, keeping it straight.', 'Keep your hips stacked; don\'t roll back.', 'Lower slowly. Finish the set, then switch sides.'],
      mistakes: ['Rolling the hips backward.', 'Turning the toes up to the ceiling.'],
      why: 'The side of the hip keeps your pelvis level every time you stand on one leg. Weakness here often shows up as knee or back pain.',
      focus: { j: 'hipF', label: 'Side of the hip', at: 'tr' },
      anim: (function () {
        var P = { v: 'f', p: [-8, 9.5], t: 90, aN: [180, 180], aF: [0, 0], lN: [0, 0] };
        return { k: [extend(P, { lF: [0, 0] }), extend(P, { lF: [32, 32] })], d: [1, 1.2], h: [0.2, 0.3] };
      })(),
      alts: ['donkey-kick', 'glute-bridge']
    },
    'quad-stretch': {
      name: 'Standing quad stretch', area: ['mobility'], pattern: 'mobility', type: 'time', each: true, dose: { b: 30, i: 30, a: 30 }, eq: [], met: 2.3,
      cue: ['Knees side by side.', 'Tuck your tail.', 'Stand tall.'],
      setup: 'Stand near a wall for balance.',
      steps: ['Bend one knee and hold that foot behind you.', 'Bring your knees together and gently tuck your pelvis under.', 'Hold, then switch legs.'],
      mistakes: ['Arching the lower back.', 'The bent knee drifting out to the side.'],
      why: 'The front of the thigh crosses both the hip and the knee. Tucking the pelvis stretches the part that sitting shortens.',
      focus: { j: 'knee', label: 'Front of the thigh', at: 'tr' },
      anim: (function () {
        var P = stand({ lF: { ik: [0.5, 2.5] }, lN: [-6, 174], aN: { ik: [-0.5, 47], b: [-1, 0] }, aF: [20, 40] });
        return { k: breathe(P, 0.3), d: [1.8, 2.2] };
      })(),
      alts: ['hip-flexor-stretch']
    },
    'calf-stretch': {
      cam: { yaw: -32 },
      name: 'Wall calf stretch', area: ['mobility'], pattern: 'mobility', type: 'time', each: true, dose: { b: 30, i: 30, a: 30 }, eq: [], met: 2.3,
      cue: ['Back heel down.', 'Back knee straight.', 'Toes point at the wall.'],
      setup: 'Face a wall, hands on it at shoulder height, one foot a long step behind you.',
      steps: ['Bend the front knee and lean toward the wall.', 'Keep the back leg straight and its heel on the floor.', 'Hold where you feel the calf, then switch legs.'],
      mistakes: ['The back heel lifting.', 'The back foot turning out.'],
      why: 'Stiff calves limit how far the knee can travel over the foot, and that shows up in squats and on stairs.',
      focus: { j: 'ankle', label: 'Calf', at: 'tl' },
      props: [{ k: 'wall', x: 34, side: 1 }],
      anim: (function () {
        var P = { p: [0, 42], t: 160, lN: { ik: [-26, 2.5] }, lF: { ik: [14, 2.5] }, aN: { ik: [33, 70], b: [0, -1] }, aF: { ik: [32.5, 70], b: [0, -1] } };
        return { k: breathe(P, -0.4), d: [1.8, 2.2] };
      })(),
      alts: ['down-dog']
    },
    'butt-kicks': {
      name: 'Butt kicks', area: ['cardio'], pattern: 'cardio', type: 'time', dose: { b: 20, i: 30, a: 40 }, eq: [], met: 4.8,
      cue: ['Heels to your seat.', 'Quick, light feet.', 'Stand tall.'],
      setup: 'Stand tall with space around you. Low impact: walk it, one heel at a time.',
      steps: ['Jog in place, kicking each heel up toward your seat.', 'Stay on the balls of your feet.', 'Swing your arms with the legs.'],
      mistakes: ['Leaning forward.', 'Landing heavily.'],
      why: 'A quick warm-up for the back of the thighs and the calves that also raises the heart rate.',
      focus: { j: 'knee', label: 'Hamstrings', at: 'tr' },
      anim: (function () {
        var A = stand({ p: [0, 50.5], lN: [-8, 165], lF: { ik: [0, 4.5] }, fF: 60, aN: [30, 100], aF: [-30, -10] });
        var B = stand({ p: [0, 50.5], lF: [-8, 165], lN: { ik: [0, 4.5] }, fN: 60, aF: [30, 100], aN: [-30, -10] });
        return { k: [A, B], d: [0.26] };
      })(),
      alts: ['march']
    },
    'skipping': {
      name: 'Skipping, no rope', area: ['cardio'], pattern: 'cardio', type: 'time', dose: { b: 20, i: 30, a: 45 }, eq: [], met: 7.5,
      cue: ['Small hops.', 'Wrists turn the rope.', 'Land on the balls of the feet.'],
      setup: 'Stand tall, elbows by your sides, hands out as if holding a rope.',
      steps: ['Hop a few centimetres off the floor with both feet.', 'Turn your wrists in small circles as if turning a rope.', 'Keep a quick, steady rhythm.'],
      mistakes: ['Jumping too high.', 'Landing on the heels.'],
      why: 'Short, springy hops train the calves and ankles to absorb and return force, and raise the heart rate fast.',
      focus: { j: 'ankle', label: 'Ankles', at: 'tr' },
      anim: (function () {
        var arms = { aN: [12, 70], aF: [10, 68] };
        var down = stand(extend(arms, { p: [0, 48.8], lN: { ik: [1, 2.5] }, lF: { ik: [-1, 2.5] } }));
        var up = stand(extend(arms, { p: [0.5, 53.5], lN: { ik: [1, 6.8] }, lF: { ik: [-1, 6.8] }, fN: 55, fF: 55 }));
        return { k: [down, up], d: [0.2, 0.2] };
      })(),
      alts: ['march', 'punches']
    }
  };
  Object.keys(MORE).forEach(function (id) { EX[id] = MORE[id]; });

  // the muscles each move works: main | helpers (the names the body map and the 3D coach use)
  var MUS = {
    'brace-breathe': 'abs obliques | lower-back', 'dead-bug': 'abs | obliques quadriceps',
    'bird-dog': 'lower-back gluteal | abs back-deltoids', 'plank': 'abs | obliques front-deltoids gluteal quadriceps',
    'side-plank': 'obliques abductors | abs front-deltoids', 'hollow-hold': 'abs | obliques quadriceps',
    'bear-hold': 'abs quadriceps | front-deltoids obliques', 'reverse-crunch': 'abs | obliques',
    'mountain-climber': 'abs front-deltoids | quadriceps obliques chest', 'shoulder-taps': 'abs obliques | front-deltoids chest triceps',
    'glute-bridge': 'gluteal | hamstring lower-back', 'single-leg-bridge': 'gluteal | hamstring abductors abs',
    'hip-hinge': 'gluteal hamstring | lower-back', 'single-leg-rdl': 'gluteal hamstring | abductors lower-back calves',
    'box-squat': 'quadriceps gluteal | adductor hamstring', 'squat': 'quadriceps gluteal | adductor hamstring calves',
    'heel-squat': 'quadriceps | gluteal adductor', 'goblet-squat': 'quadriceps gluteal | adductor abs front-deltoids',
    'wall-sit': 'quadriceps | gluteal adductor', 'jump-squat': 'quadriceps gluteal | calves hamstring',
    'split-squat': 'quadriceps gluteal | adductor hamstring', 'reverse-lunge': 'quadriceps gluteal | hamstring adductor calves',
    'lateral-lunge': 'adductor quadriceps | gluteal abductors', 'step-up': 'quadriceps gluteal | hamstring calves',
    'bulgarian-split-squat': 'quadriceps gluteal | adductor hamstring', 'calf-raise': 'calves |',
    'balance': 'calves abductors | abs', 'pad-balance': 'calves abductors | abs',
    'incline-push-up': 'chest | triceps front-deltoids', 'knee-push-up': 'chest | triceps front-deltoids abs',
    'push-up': 'chest triceps | front-deltoids abs', 'decline-push-up': 'chest front-deltoids | triceps abs',
    'pike-push-up': 'front-deltoids triceps | chest trapezius', 'chair-dip': 'triceps | chest front-deltoids',
    'prone-y-raise': 'trapezius upper-back | back-deltoids lower-back', 'wall-slide': 'trapezius | front-deltoids upper-back',
    'scap-push-up': 'upper-back | chest abs front-deltoids', 'table-row': 'upper-back biceps | back-deltoids trapezius forearm',
    'superman': 'lower-back gluteal | upper-back hamstring back-deltoids', 'db-rdl': 'hamstring gluteal | lower-back forearm trapezius',
    'db-row': 'upper-back biceps | back-deltoids trapezius forearm', 'db-press': 'front-deltoids triceps | trapezius abs',
    'farmer-carry': 'forearm trapezius | abs obliques', 'suitcase-carry': 'obliques | forearm trapezius abs',
    'ring-row': 'upper-back biceps | back-deltoids forearm abs', 'march': 'quadriceps calves | abs gluteal',
    'high-knees': 'quadriceps calves | abs gluteal', 'jumping-jacks': 'calves abductors | front-deltoids quadriceps adductor',
    'burpee': 'quadriceps chest | gluteal triceps abs front-deltoids calves', 'inchworm': 'hamstring abs | front-deltoids chest calves',
    'cat-cow': 'lower-back abs | upper-back', 'childs-pose': 'lower-back upper-back | gluteal',
    'down-dog': 'hamstring calves | front-deltoids upper-back', 'hip-flexor-stretch': 'quadriceps | abs gluteal',
    'forward-fold': 'hamstring | lower-back calves', 'deep-squat-hold': 'adductor gluteal | quadriceps calves lower-back',
    'cobra': 'abs lower-back | chest', 'leg-swings': 'gluteal hamstring | quadriceps adductor',
    'arm-circles': 'front-deltoids back-deltoids | trapezius', 'crunch': 'abs | obliques',
    'leg-raise': 'abs | quadriceps obliques', 'bicycle-crunch': 'obliques abs | quadriceps',
    'flutter-kicks': 'abs | quadriceps obliques', 'v-up': 'abs | quadriceps obliques',
    'knee-to-chest': 'lower-back gluteal | hamstring', 'wide-push-up': 'chest | front-deltoids triceps',
    'diamond-push-up': 'triceps | chest front-deltoids', 'wall-push-up': 'chest | triceps front-deltoids',
    'db-curl': 'biceps | forearm', 'db-triceps': 'triceps | abs',
    'punches': 'front-deltoids | triceps obliques chest', 'arm-raise': 'front-deltoids | trapezius',
    'plank-up-down': 'triceps abs | chest front-deltoids obliques', 'sumo-squat': 'adductor quadriceps | gluteal calves',
    'donkey-kick': 'gluteal | hamstring abs', 'side-leg-raise': 'abductors | gluteal obliques',
    'quad-stretch': 'quadriceps |', 'calf-stretch': 'calves | hamstring',
    'butt-kicks': 'hamstring calves | quadriceps', 'skipping': 'calves | quadriceps front-deltoids forearm'
  };
  Object.keys(MUS).forEach(function (id) {
    var two = MUS[id].split('|');
    var list = function (t) { return (t || '').trim().split(/\s+/).filter(Boolean); };
    if (EX[id]) EX[id].mus = { p: list(two[0]), s: list(two[1]) };
  });

  // joints a move loads: with a sore area, the plan swaps these for a move that spares it
  var STRESS = {
    wrist: ['push-up', 'knee-push-up', 'incline-push-up', 'wide-push-up', 'diamond-push-up', 'decline-push-up', 'pike-push-up', 'chair-dip',
            'bear-hold', 'mountain-climber', 'shoulder-taps', 'plank-up-down', 'burpee', 'inchworm', 'down-dog', 'scap-push-up'],
    shoulder: ['pike-push-up', 'db-press', 'chair-dip', 'decline-push-up', 'db-triceps', 'plank-up-down', 'burpee', 'diamond-push-up'],
    knee: ['jump-squat', 'bulgarian-split-squat', 'split-squat', 'reverse-lunge', 'lateral-lunge', 'step-up', 'deep-squat-hold', 'heel-squat',
           'wall-sit', 'squat', 'sumo-squat', 'goblet-squat', 'high-knees', 'skipping', 'butt-kicks', 'burpee', 'jumping-jacks'],
    ankle: ['jump-squat', 'jumping-jacks', 'high-knees', 'skipping', 'butt-kicks', 'burpee', 'pad-balance', 'lateral-lunge'],
    back: ['superman', 'v-up', 'leg-raise', 'flutter-kicks', 'db-rdl', 'burpee', 'jump-squat', 'crunch', 'bicycle-crunch']
  };
  Object.keys(STRESS).forEach(function (j) { STRESS[j].forEach(function (id) { (EX[id].stress = EX[id].stress || []).push(j); }); });

  var POS = { supine: ['brace-breathe', 'dead-bug', 'hollow-hold', 'reverse-crunch', 'glute-bridge', 'single-leg-bridge',
                       'crunch', 'leg-raise', 'bicycle-crunch', 'flutter-kicks', 'v-up', 'knee-to-chest'],
              prone: ['superman', 'prone-y-raise', 'cobra'] };
  var JUMP = ['jump-squat', 'burpee', 'jumping-jacks', 'high-knees', 'butt-kicks', 'skipping'];
  Object.keys(POS).forEach(function (k) { POS[k].forEach(function (id) { EX[id].pos = k; }); });
  JUMP.forEach(function (id) { EX[id].jump = true; });

  Object.keys(EX).forEach(function (id) {
    var e = EX[id];
    e.id = id;
    e.anim.focus = e.focus || null;
    e.anim.props = e.props || null;
    e.anim.hold = e.hold || null;
    e.anim.cam = e.cam || null;
    e.anim.mus = e.mus || null;
  });

  W.WBF.EX = EX;
})(window);
