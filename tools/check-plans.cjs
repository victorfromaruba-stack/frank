// Checks the generated plans against the evidence rules that can be counted:
// every goal x days x level x kit trains lower body, upper body and core on 2+ days a week,
// with at most 2 interval (cardio) days, and every session builds.
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
console.log(`${plans} plans checked, ${fails.length} failing`);
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
