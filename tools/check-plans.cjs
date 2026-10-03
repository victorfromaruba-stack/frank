// Checks the generated plans against the evidence rules that can be counted:
// every goal x days x level x kit trains lower body, upper body and core on 2+ days a week,
// with at most 2 interval (cardio) days, and every session builds.
// And no session does a move twice: a warm-up or cool-down move that is also in the workout (or twice in its own block).
// Run: node tools/check-plans.cjs    (exits 1 and lists the plans that fail)
global.window = global;
global.document = { addEventListener() {}, hidden: false };
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
for (const f of ['js/figure.js', 'js/exercises.js', 'js/programs.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
}
const WBF = window.WBF, EX = WBF.EX;
const REGION = {
  lower: ['quadriceps', 'gluteal', 'hamstring', 'calves', 'adductor', 'abductors'],
  upper: ['chest', 'upper-back', 'front-deltoids', 'back-deltoids', 'triceps', 'biceps', 'trapezius'],
  core: ['abs', 'obliques', 'lower-back']
};
const fails = [];
let plans = 0;
for (const goal of Object.keys(WBF.GOALS))
  for (const days of [2, 3, 4, 5, 6])
    for (const level of ['b', 'i', 'a'])
      for (const kit of [['chair', 'table'], ['chair', 'table', 'db'], []]) {
        const p = { goal, days, level, minutes: 20, kit, focus: ['full'], health: {}, injuries: [], birthYear: 1985 };
        const week = WBF.plan.days(p).slice(0, 7).filter((d) => d.train);
        const count = { lower: 0, upper: 0, core: 0 };
        let cardio = 0;
        plans++;
        for (const d of week) {
          if (/^cardio/.test(d.workoutId)) cardio++;
          const s = WBF.plan.build(d.workoutId, { level, kit, swaps: {}, goal, avoid: WBF.plan.avoidFor(p), mult: 1, minutes: 20, day: d.day });
          if (!s || !s.steps.some((st) => st.block === 'main')) { fails.push(`${goal} ${days}d ${level} [${kit}]: ${d.workoutId} builds no workout`); continue; }
          // a session trains a region when 2+ of its sets have that region as a main muscle
          const sets = { lower: 0, upper: 0, core: 0 };
          for (const st of s.steps) {
            if (st.block !== 'main') continue;
            const main = (EX[st.ex].mus || { p: [] }).p;
            for (const r in REGION) if (main.some((m) => REGION[r].includes(m))) sets[r]++;
          }
          for (const r in REGION) if (sets[r] >= 2) count[r]++;
        }
        const low = Object.keys(count).filter((r) => count[r] < 2);
        if (low.length || cardio > 2) {
          fails.push(`${goal} ${days}d ${level} [${kit}]: ${week.map((d) => d.workoutId).join(', ')}` +
            (low.length ? ` | under twice a week: ${low.join(', ')}` : '') + (cardio > 2 ? ` | ${cardio} cardio days` : ''));
        }
      }
// The same move twice in one session: in the warm-up or cool-down and in the workout itself (main or focus block),
// or twice in the warm-up or cool-down. Rounds repeat the workout's moves on purpose; a timed move done per side has two steps.
function repeats(s) {
  const work = new Set(s.steps.filter((st) => st.block === 'main' || st.block === 'focus').map((st) => st.ex));
  const out = [];
  for (const b of ['warm', 'cool']) {
    const had = new Set(), name = b === 'warm' ? 'warm-up' : 'cool-down';
    for (const st of s.steps.filter((x) => x.block === b)) {
      if (work.has(st.ex)) out.push(`${st.ex} in the ${name} and the workout`);
      if (had.has(st.ex + st.side)) out.push(`${st.ex} twice in the ${name}`);
      had.add(st.ex + st.side);
    }
  }
  const warm = new Set(s.steps.filter((st) => st.block === 'warm').map((st) => st.ex));
  for (const st of s.steps) if (st.block === 'cool' && warm.has(st.ex)) out.push(`${st.ex} in the warm-up and the cool-down`);
  return [...new Set(out)];
}
// every workout as the app builds it, for people with and without limits; plan workouts also with focus areas, which
// add a focus block that turns with the day
const PEOPLE = { 'no limits': {}, 'a health yes': { health: { heart: true } }, pregnant: { health: { pregnant: true } }, '60+': { birthYear: 1950 },
  knee: { injuries: ['knee'] }, 'lower back': { injuries: ['back'] }, wrist: { injuries: ['wrist'] }, shoulder: { injuries: ['shoulder'] }, other: { injuries: ['other'] } };
const PLAN_IDS = new Set();
for (const goal of Object.keys(WBF.GOALS)) for (const days of [2, 3, 4, 5, 6]) for (const level of ['b', 'i', 'a'])
  for (const kit of [['chair', 'table'], ['chair', 'table', 'db']]) WBF.plan.days({ goal, days, level, kit, health: {} }).forEach((d) => { if (d.train) PLAN_IDS.add(d.workoutId); });
const twice = new Set();
let sessions = 0;
for (const w of WBF.WORKOUTS) {
  const levels = w.level ? [w.level] : ['b', 'i', 'a'];
  const focuses = [null].concat(PLAN_IDS.has(w.id) ? [['back'], ['arms'], ['abs', 'legs']] : []);
  for (const level of levels) for (const kit of [['chair', 'table'], ['chair', 'table', 'db'], []]) for (const who of Object.keys(PEOPLE)) for (const focus of focuses) {
    const p = Object.assign({ birthYear: 1985, health: {}, injuries: [] }, PEOPLE[who]);
    const avoid = WBF.plan.avoidFor(p);
    for (const day of focus ? [1, 2, 3, 4] : [0]) {
      const s = WBF.plan.build(w.id, { level, kit, swaps: {}, goal: 'fit', avoid, older: avoid.older, mult: 1, minutes: w.kind === 'quick' ? null : 20, focus, day });
      sessions++;
      for (const r of repeats(s)) twice.add(`${w.id} ${level} [${kit}] ${who}${focus ? ', focus ' + focus.join('+') : ''}: ${r}`);
    }
  }
}
for (const r of twice) fails.push('the same move twice: ' + r);
console.log(`${plans} plans and ${sessions} sessions checked, ${fails.length} failing`);
if (fails.length) { console.log(fails.slice(0, 40).join('\n') + (fails.length > 40 ? `\n(+${fails.length - 40} more)` : '')); process.exit(1); }
