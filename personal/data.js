/* Personal prototype: example data only. The clients, gyms and numbers are made up, to show how
   Personal and Coach mode look and work. Nothing here is real or sent anywhere. */
(function (W) {
  'use strict';

  // the week around today, so the prototype always looks current
  function monday(d) { var x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  var MON = monday(new Date());
  function day(i) { var x = new Date(MON); x.setDate(x.getDate() + i); return x; }

  // a move in a home session: [exercise id, sets, reps or seconds, unit, load, Frank's note]
  var SESSIONS = {
    'lower-b': {
      title: 'Lower body B', min: 34, focus: 'Legs and glutes, single-leg strength',
      intro: 'Same as last week, with heavier squats. Slow on the way down.',
      moves: [
        ['goblet-squat', 3, 10, 'reps', '12 kg', 'Sit between your heels. Elbows inside the knees.'],
        ['split-squat', 3, 8, 'each', 'Body weight', 'Left knee: stay above parallel.'],
        ['hip-hinge', 3, 10, 'reps', '2 × 8 kg', 'Hips back, long spine. Stop when the back wants to round.'],
        ['side-plank', 2, 25, 'sec each', '', 'Hips high, a straight line from head to heels.'],
        ['dead-bug', 2, 8, 'each', '', 'Lower back stays on the floor. Breathe out as the arm goes back.']
      ]
    },
    'upper-a': {
      title: 'Upper body A', min: 30, focus: 'Push, pull and carry',
      intro: 'Today is about clean reps. Stop a set the moment the form goes.',
      moves: [
        ['knee-push-up', 3, 10, 'reps', '', 'Chest to the floor, body in one line. Full push-ups next block.'],
        ['table-row', 3, 10, 'reps', '', 'Pull your chest to the table, squeeze the shoulder blades.'],
        ['farmer-carry', 3, 40, 'sec', '2 × 10 kg', 'Tall, slow steps. Shoulders down.'],
        ['plank', 3, 35, 'sec', '', 'Ribs down, squeeze the glutes.'],
        ['glute-bridge', 2, 12, 'reps', '', 'Pause two seconds at the top.']
      ]
    }
  };

  // Sanne's week: what Frank planned for each day
  var WEEK = [
    { d: 0, kind: 'frank', title: 'Strength with Frank', time: '07:30', gym: 'centrum', note: 'Squat technique, then the first heavier goblet squats.', done: true },
    { d: 1, kind: 'walk', title: 'Walk', min: 40, done: true },
    { d: 2, kind: 'home', session: 'lower-b', done: true },
    { d: 3, kind: 'rest', title: 'Rest' },
    { d: 4, kind: 'home', session: 'upper-a' },
    { d: 5, kind: 'frank', title: 'Re-test with Frank', time: '09:00', gym: 'centrum', note: 'We test your squat, push-ups and plank again. Bring flat-soled shoes.' },
    { d: 6, kind: 'walk', title: 'Walk and check-in', min: 40 }
  ];

  var ASSESS = {
    start: { date: '1 Sep', label: 'Start' },
    latest: { date: '29 Sep', label: 'Re-test' },
    rows: [
      // [test, start, latest, unit, better: 'up' | 'down' | null]
      ['Goblet squat, 10 reps', 8, 12, 'kg', 'up'],
      ['Push-ups on the knees', 6, 12, 'reps', 'up'],
      ['Plank', 35, 60, 's', 'up'],
      ['Knee to wall, left ankle', 8, 10, 'cm', 'up'],
      ['Knee to wall, right ankle', 10, 11, 'cm', 'up'],
      ['Waist', 84, 81, 'cm', 'down'],
      ['Weight', 72.4, 70.9, 'kg', 'down']
    ],
    notes: [
      ['Hip hinge', 'Rounded at the lower back', 'Neutral spine to mid-shin'],
      ['Squat', 'Heels lift at depth', 'Full depth, heels down'],
      ['Posture', 'Right shoulder sits forward', 'Better; keep the rows in']
    ],
    summary: 'Squat depth is there now and the hinge is clean. Next block: single-leg strength and the first full push-ups.'
  };

  var CLIENTS = [
    { id: 'sanne', name: 'Sanne', initial: 'S', goal: 'Stronger legs and back, 4 kg lighter', gym: 'centrum', since: '1 Sep', week: 5, weeks: 12,
      planned: 4, done: 3, checkin: { when: 'Sunday', status: 'ok' }, flags: [], next: 'Sat 09:00 · Re-test' },
    { id: 'daan', name: 'Daan', initial: 'D', goal: 'Run again without knee pain', gym: 'west', since: '15 Sep', week: 3, weeks: 8,
      planned: 3, done: 1, checkin: { when: '3 days late', status: 'late' }, flags: ['Knee pain 4/10 after Tuesday'], next: 'Today 07:30' },
    { id: 'mila', name: 'Mila', initial: 'M', goal: 'First strict pull-up', gym: 'beach', since: '2 Aug', week: 9, weeks: 12,
      planned: 4, done: 4, checkin: { when: 'Today', status: 'new' }, flags: [], next: 'Today 17:30' },
    { id: 'joris', name: 'Joris', initial: 'J', goal: 'Back in shape after a desk year', gym: 'centrum', since: 'Starts Tuesday', week: 0, weeks: 12,
      planned: 0, done: 0, checkin: { when: 'Not yet', status: 'none' }, flags: [], next: 'Tue 18:00 · Assessment' }
  ];

  var TODAY = [   // Frank's day
    { time: '07:30', client: 'daan', what: 'Lower body, easy on the knee', prep: 'Check the knee before we load it. Swap split squats for box squats if it hurts.' },
    { time: '12:30', block: 'Answer check-ins', what: 'Mila sent hers this morning' },
    { time: '17:30', client: 'mila', what: 'Pull-up progressions', prep: 'Negatives 3 × 3, then band-assisted sets. Film one rep for her.' }
  ];

  var MESSAGES = [
    { from: 'frank', text: 'Good session on Monday. Your squat looks completely different from week one.', at: 'Mon 09:12' },
    { from: 'client', text: 'Thanks! My legs were sore on Tuesday, is that normal?', at: 'Mon 21:40' },
    { from: 'frank', text: 'Yes, normal after heavier squats. The walk on Tuesday helps. Tell me if it is still there by Thursday.', at: 'Tue 07:05' }
  ];

  var LAST_CHECKIN = {
    when: 'Last Sunday', weight: 71.0, waist: 81.5, sleep: 4, energy: 4, stress: 2, soreness: 2, sessions: '4 of 4',
    win: 'Squatted 12 kg for 10 and it felt easy.', struggle: 'Late dinners on work days.',
    reply: 'Great week. Next week we add a set to the split squats. For the late dinners: try the ten-minute bowl in Food.'
  };

  var FOOD = {
    intro: 'Frank wrote this plan from your assessment. Portions, not grams: your hand is the measure.',
    days: {
      train: [
        ['Breakfast', 'Greek yoghurt, oats and berries', '1 bowl, a fist of oats'],
        ['Lunch', 'Wholegrain wrap with chicken, hummus and salad', '1 palm of chicken'],
        ['Before training', 'A banana or a slice of bread with peanut butter', '1 to 2 hours before'],
        ['Dinner', 'Salmon, potatoes and green beans', '1 palm of fish, 2 fists of vegetables']
      ],
      rest: [
        ['Breakfast', 'Two eggs on wholegrain toast, tomatoes', '2 eggs, 1 to 2 slices'],
        ['Lunch', 'Lentil soup and a cheese sandwich', '1 bowl'],
        ['Snack', 'An apple and a handful of nuts', '1 cupped hand of nuts'],
        ['Dinner', 'Ten-minute chicken bowl: rice, chicken, peppers, soy and sesame', 'Recipe in the videos']
      ]
    },
    guides: [
      ['Protein at every meal', 'Why it helps you keep muscle while you lose weight, and the easy sources.', '4 min read'],
      ['Eating around training', 'What to eat before and after a session, and when it does not matter.', '3 min read'],
      ['Sleep and recovery', 'The habit that makes the training work.', '5 min read']
    ],
    videos: [
      ['Ten-minute chicken bowl', 'Frank cooks the dinner from your plan'],
      ['Overnight oats, three ways', 'Breakfast you make the night before']
    ],
    shopping: ['Greek yoghurt', 'Oats', 'Berries (frozen is fine)', 'Wholegrain wraps', 'Chicken breast', 'Hummus', 'Salmon', 'Potatoes', 'Green beans', 'Eggs', 'Lentils', 'Apples', 'Nuts', 'Rice', 'Peppers']
  };

  W.WBF_PERSONAL = {
    gyms: { centrum: 'Centrum gym', west: 'West gym', beach: 'Beach gym' },
    client: { id: 'sanne', name: 'Sanne', goal: 'Stronger legs and back, 4 kg lighter', week: 5, weeks: 12, gym: 'centrum', block: 'Block 2 · Strength and shape' },
    monday: MON, day: day,
    sessions: SESSIONS, week: WEEK, assess: ASSESS, clients: CLIENTS, today: TODAY,
    messages: MESSAGES, lastCheckin: LAST_CHECKIN, food: FOOD,
    weights: [72.4, 72.1, 71.9, 71.6, 71.5, 71.2, 71.0, 70.9],
    lifts: [['Goblet squat', '8 kg', '12 kg'], ['Hip hinge', '2 × 4 kg', '2 × 8 kg'], ['Farmer carry', '2 × 6 kg', '2 × 10 kg']]
  };
})(window);
