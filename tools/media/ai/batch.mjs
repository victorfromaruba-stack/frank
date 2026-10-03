// Runs request files (tools/media/ai/requests/*.json): the steps each one names, with its own budget and its own run
// folder. Every request is checked and estimated before anything is sent; one over its budget, or a paid run
// without the key, stops them all first.
//
//   node tools/media/ai/batch.mjs tools/media/ai/requests/pilot-1-coaches.json [more files] [--dry-run] [--check] [--budget 5]
//   --check     check the files, print the estimates, check the budget and the key, and stop (sends nothing)
//   --dry-run   write the request bodies to out/<run>/calls/ instead of sending them (no key needed, no cost)
//   --github    on GitHub Actions (.github/workflows/coach-video.yml): the request files come from the push (the ones
//               added or changed) or from the "request" input of a manual run, and a summary goes on the run's page
//
// A request file:
//   {
//     "about": "Pilot, part 3: clips of the picked start poses",
//     "steps": ["clip", "review"],          design | keyframe | clip | review (a person picks between the first three)
//     "coaches": ["f", "m"],                ids from coaches.json
//     "moves": ["squat", "push-up", "plank"],  or a shot-list batch: "first-20", "next-25", "other-35", "all"
//     "budget": 5,                          USD for this request; it stops before going past it
//     "looks": 2, "candidates": 2, "takes": 1, "resolution": "720p", "dryRun": false      (optional)
//     "parallel": 3                         clips Veo makes at once; 1 if the key's rate limit is low
//   }
// Only files directly in requests/ run on GitHub; requests/examples/ holds copies to start from.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULTS, DEFAULT_BUDGET, NO_FFMPEG, ROOT, Stop, budget as money, hasKey, haveFfmpeg, isMain, list, main, newRunId, parseArgs,
  readJson, say, show, usd, warn
} from './lib.mjs';
import { startRun } from './calls.mjs';
import * as design from './design.mjs';
import * as keyframe from './keyframe.mjs';
import * as clip from './clip.mjs';
import { review } from './review.mjs';

export const STEPS = ['design', 'keyframe', 'clip', 'review'];
const PAID = { design, keyframe, clip };
const FIELDS = {
  about: 'string', steps: 'list', coaches: 'list', moves: 'list', budget: 'number', looks: 'number', candidates: 'number', takes: 'number',
  resolution: 'string', seconds: 'number', videoModel: 'string', imageModel: 'string', imageSize: 'string', imageApi: 'string',
  veoImageForm: 'string', parallel: 'number', dryRun: 'boolean'
};

// A request file, checked: known fields, known steps in a sensible order, everything the steps need.
export function readRequest(file) {
  const r = readJson(file);
  const name = path.basename(file, '.json');
  const bad = (msg) => new Stop(`${show(file)}: ${msg}`, 2);
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw bad('a request is a JSON object');
  for (const [k, v] of Object.entries(r)) {
    const t = FIELDS[k];
    if (!t) throw bad(`unknown field "${k}" (the fields: ${Object.keys(FIELDS).join(', ')})`);
    const ok = t === 'list' ? Array.isArray(v) || typeof v === 'string' : typeof v === t;
    if (!ok) throw bad(`"${k}" should be ${t === 'list' ? 'a list' : 'a ' + t}`);
  }
  const steps = list(r.steps);
  if (!steps.length) throw bad('"steps" is empty: design, keyframe, clip or review');
  for (const s of steps) if (!STEPS.includes(s)) throw bad(`unknown step "${s}": design, keyframe, clip or review`);
  const has = (s) => steps.includes(s);
  if (has('design') && has('keyframe')) throw bad('design and keyframe can\'t share a request: a person picks the look in between (pick.mjs look)');
  if (has('keyframe') && has('clip')) throw bad('keyframe and clip can\'t share a request: a person picks the start pose in between (pick.mjs start)');
  if (has('review') && !has('clip')) throw bad('review goes with clip in the same request (a review of an earlier run: review.mjs --from <artifact>)');
  if ((has('keyframe') || has('clip')) && !r.moves) throw bad('"moves" is missing');
  const o = { ...DEFAULTS, ...r, steps: STEPS.filter(has), coaches: r.coaches ? list(r.coaches).join(',') : undefined, moves: r.moves ? list(r.moves).join(',') : undefined };
  o.lines = o.steps.filter((s) => PAID[s]).flatMap((s) => PAID[s].plan(o).lines);
  if (!o.lines.length) o.lines = [{ what: 'review only: no paid calls', cost: 0 }];
  return { file, name, o, budget: r.budget === undefined ? DEFAULT_BUDGET : money(r.budget), dry: r.dryRun === true };
}

// Runs one request in its own run folder.
async function runRequest(req, { id, dry, out }) {
  say(`\n== ${show(req.file)}${req.o.about ? ': ' + req.o.about : ''}`);
  const ctx = startRun({ id, out, budget: req.budget, dry, lines: req.o.lines, steps: req.o.steps, title: 'Estimated cost of ' + req.name });
  if (req.o.steps.includes('review') && !dry && !haveFfmpeg()) throw new Stop(NO_FFMPEG + ': the review step needs it.');
  for (const s of req.o.steps) {
    if (PAID[s]) await PAID[s].run(req.o, ctx);
    else if (s === 'review' && !dry) review(ctx.run.dir);
  }
  ctx.run.save({ finished: new Date().toISOString(), failed: ctx.failed });
  return ctx;
}

// The request files of a GitHub run: the ones this push added or changed, or the manual run's input.
function githubRequests() {
  const event = process.env.EVENT || process.env.GITHUB_EVENT_NAME;
  if (event === 'workflow_dispatch') {
    const f = (process.env.REQUEST || '').trim();
    if (!/^tools\/media\/ai\/requests\/[A-Za-z0-9._-]+\.json$/.test(f)) throw new Stop('The "request" input is a file directly in tools/media/ai/requests/, like tools/media/ai/requests/pilot-1-coaches.json', 2);
    return [path.join(ROOT, f)];
  }
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
  const before = process.env.BEFORE || '', after = process.env.GITHUB_SHA || 'HEAD', where = ['--', 'tools/media/ai/requests/'];
  // what the push added or changed; for a new branch (or a before that a force-push removed), since the branch left
  // app; failing that, in its last commit only
  const tries = [
    ...(before && !/^0+$/.test(before) ? [['diff', '--name-only', '--diff-filter=AM', before, after, ...where]] : []),
    ['diff', '--name-only', '--diff-filter=AM', 'origin/app...' + after, ...where],
    ['diff-tree', '--no-commit-id', '--name-only', '-r', '--diff-filter=AM', after, ...where]
  ];
  let names = null;
  for (const t of tries) { try { names = git(...t); break; } catch (e) { /* next way */ } }
  if (!names) throw new Stop('Could not tell which request files this push changed (git diff failed). Start the run by hand with the "request" input.');
  return names.filter((n) => /^tools\/media\/ai\/requests\/[^/]+\.json$/.test(n)).map((n) => path.join(ROOT, n));
}

function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
const ann = (kind, title, msg) => { if (process.env.GITHUB_ACTIONS) console.log(`::${kind} title=${title}::${msg.replace(/\n/g, ' ')}`); };

export async function batch(files, a = {}) {
  if (!files.length) { say('No request files to run.'); summary('### Coach video\nNo request files were added or changed: nothing to run.'); return 0; }
  const reqs = files.map(readRequest);
  if (a.budget !== undefined) for (const r of reqs) r.budget = money(a.budget);
  if (a.dryRun) for (const r of reqs) r.dry = true;
  // first everything's cost, and every reason to stop, before anything is sent
  let total = 0, stop = [];
  say('Requests: ' + reqs.map((r) => show(r.file)).join(', '));
  for (const r of reqs) {
    const cost = r.o.lines.reduce((s, l) => s + l.cost, 0);
    total += cost;
    say(`  ${r.name}: ${r.o.steps.join(' + ')}, about ${usd(cost)} of a ${usd(r.budget)} budget${r.dry ? ' (dry run: $0.00)' : ''}`);
    if (cost > r.budget + 1e-9 && !r.dry) stop.push(`${r.name} costs about ${usd(cost)}, over its ${usd(r.budget)} budget. Raise "budget" in the file on purpose, or ask for fewer moves.`);
  }
  say(`  Together about ${usd(total)}` + (reqs.every((r) => r.dry) ? ' in real runs; these are dry runs: nothing is sent or spent.' : reqs.some((r) => r.dry) ? ' (the dry runs among them cost nothing).' : '.'));
  if (reqs.some((r) => !r.dry) && !hasKey()) stop.push('GEMINI_API_KEY is missing. On GitHub: Settings > Secrets and variables > Actions > New repository secret, name GEMINI_API_KEY. Nothing was sent.');
  if (a.github && a.check) {        // the check step writes the estimate on the run's page; the run step adds results
    summary(`### Coach video: estimate\n| Request | Steps | Estimate | Budget |\n|---|---|---|---|\n` +
      reqs.map((r) => `| ${r.name} | ${r.o.steps.join(' + ')} | ${r.dry ? 'dry run, $0.00' : usd(r.o.lines.reduce((s, l) => s + l.cost, 0))} | ${usd(r.budget)} |`).join('\n') +
      `\n\nPrices of the pricing page on 3 October 2026, an estimate that errs high.\n`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ffmpeg=${reqs.some((r) => r.o.steps.includes('review') && !r.dry)}\n`);
  }
  if (stop.length) {
    for (const s of stop) { warn('Stopped: ' + s); ann('error', 'Coach video stopped', s); }
    summary('**Stopped before sending anything:**\n' + stop.map((s) => '- ' + s).join('\n'));
    return 1;
  }
  if (a.check) { say('Checked: nothing sent.'); return 0; }
  let failed = 0;
  for (const r of reqs) {
    const id = newRunId() + '-' + r.name.replace(/[^A-Za-z0-9._-]/g, '-');
    try {
      const ctx = await runRequest(r, { id, dry: r.dry, out: a.out });
      failed += ctx.failed.filter((f) => f.status === 'failed').length;
      for (const f of ctx.failed) ann(f.status === 'failed' ? 'error' : 'warning', `${f.name} ${f.status}`, String(f.error || ''));
      summary(`### ${r.name}${r.dry ? ' (dry run)' : ''}\nRun \`${ctx.run.id}\`: ${ctx.made.length} file(s) made, about ${usd(ctx.ledger.spent)} spent` +
        (ctx.failed.length ? `, ${ctx.failed.length} not made: ${ctx.failed.map((f) => `${f.name} (${f.status})`).join(', ')}` : '') +
        `.\n\nIn the artifact: \`${ctx.run.id}/\`` + (r.o.steps.includes('review') && !r.dry ? `, the review sheet at \`${ctx.run.id}/review/index.html\` and \`sheet.png\`.` : '.') + '\n');
    } catch (e) {
      failed++;
      warn(`${r.name}: ${e.message}`);
      ann('error', `${r.name} failed`, e.message);
      summary(`### ${r.name}\nFailed: ${e.message}\n`);
    }
  }
  return failed ? 1 : 0;
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['dry-run', 'check', 'github', 'help'], ['budget', 'out']);
    if (a.help) { say('node tools/media/ai/batch.mjs <request files> [--dry-run] [--check] [--budget 5]   or, on GitHub Actions: --github [--check]'); return 0; }
    if (a.github && process.env.DRY_RUN === 'true') a.dryRun = true;
    const files = a.github ? githubRequests() : a._.map((f) => path.resolve(f));
    if (!a.github && !files.length) { say('Give request files, like tools/media/ai/requests/examples/pilot-1-coaches.json (see the top of this file).'); return 2; }
    for (const f of files) if (!fs.existsSync(f)) throw new Stop('No such request file: ' + show(f), 2);
    return batch(files, a);
  });
}
