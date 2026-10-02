#!/usr/bin/env node
// Runs the app's test suites and prints PASS or FAIL for each. Exits 1 when a suite fails, 2 on a usage error.
//
//   node tools/test/run.cjs                  every local suite (all but live)
//   node tools/test/run.cjs smoke player     only these
//   node tools/test/run.cjs all              every suite, the published site too
//   node tools/test/run.cjs --list           what each suite checks
//
// Options: --out <dir> (screenshots and report.json; default $FRANK_QA_OUT or <tmp>/frank-qa), --scale 2 (sharper
// screenshots), --shots (a screenshot at every checked screen), --strict (known app bugs fail too), -v (every step).
// More: .claude/skills/frank-qa/SKILL.md
'use strict';
const path = require('path');
const L = require('./lib.cjs');

// in the order they run: quick ones first
const ORDER = ['static', 'smoke', 'onboarding', 'player', 'paywall', 'client', 'safety', 'hosted', 'screens', 'live'];
const LOCAL = ORDER.filter((n) => n !== 'live');

function load(name) { return require(path.join(__dirname, name + '.cjs')); }

(async () => {
  const args = L.parseArgs(process.argv.slice(2));
  if (args.list || args.help || args.h) {
    console.log('Suites (node tools/test/run.cjs [names] [--out dir] [--scale 2] [--shots] [--strict] [-v]):\n');
    for (const n of ORDER) console.log('  ' + n.padEnd(11) + load(n).about + (n === 'live' ? ' (only when named, or with "all")' : ''));
    console.log('\nKnown app bugs: tools/test/known.cjs');
    return;
  }
  let names = args._.length ? args._ : LOCAL;
  if (names.includes('all')) names = ORDER;
  const bad = names.filter((n) => !ORDER.includes(n));
  if (bad.length) { console.error('No such suite: ' + bad.join(', ') + '. Suites: ' + ORDER.join(', ')); process.exit(2); }
  names = ORDER.filter((n) => names.includes(n));
  const opts = L.options(args);
  console.log('Wellness by Frank tests · ' + names.join(', ') + '\n  output: ' + opts.out + '\n');
  const t0 = Date.now();
  const res = await L.runSuites(names.map(load), opts);
  const failed = res.filter((r) => !r.ok);
  const known = res.reduce((a, r) => a + r.known.length, 0);
  console.log('\n' + (failed.length ? 'FAIL' : 'PASS') + ': ' + (res.length - failed.length) + ' of ' + res.length + ' suites passed in ' +
    Math.round((Date.now() - t0) / 1000) + ' s' + (known ? ', ' + known + ' known app bug' + (known > 1 ? 's' : '') + ' (tools/test/known.cjs)' : '') +
    (failed.length ? '. Failed: ' + failed.map((r) => r.suite).join(', ') : ''));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('The test runner broke: ' + (e.stack || e.message)); process.exit(1); });
