// Step 3, the clips: Veo 3.1 Fast animates each picked start pose (tools/media/ai/keyframes/<coach>/<move>.jpg), with
// the same picture as the first and the last frame, so the clip ends where it starts and loops. 8 seconds, 16:9,
// 720p, personGeneration allow_adult; the prompt comes from the move's steps and cues (prompts.mjs). Veo answers with
// a long-running operation: the step checks it every 10 seconds, downloads the video when it is done and keeps the
// raw take as it came, sound and all (process.mjs takes the sound out).
//
//   node tools/media/ai/clip.mjs --moves squat,push-up,plank [--coaches f,m] [--takes 1] [--budget 5] [--dry-run]
//   node tools/media/ai/clip.mjs --fetch [--from <run folder>]   clips still pending: Google keeps a video 2 days
//   more: --video-model veo-3.1-fast-generate-preview  --resolution 720p|1080p  --parallel 3  --poll-seconds 10
//         --veo-image-form inlineData|bytesBase64Encoded  --run <id>  --out <folder>
//
// Writes out/<run>/takes/<coach>/<move>/take-<n>.mp4 with a .json beside it (prompt, operation, status, sha256).
// Cost: 8 s x $0.10 = $0.80 a clip at 720p with Veo 3.1 Fast, $0.96 at 1080p (PRICES in lib.mjs).
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULTS, HOME, KEY_MISSING, OUT, Stop, budget, coachIds, count, hasKey, imageInput, isMain, main, move, moveIds, parseArgs,
  pickedStart, placeholder, readJson, runDirs, say, show, usd, videoPrice, warn
} from './lib.mjs';
import { finishClip, makeClip, pool, startRun } from './calls.mjs';
import { clipPrompt } from './prompts.mjs';

export function plan(o) {
  const coaches = coachIds(o.coaches), moves = moveIds(o.moves), takes = count(o.takes, 'takes', DEFAULTS.takes, 4);
  const seconds = Number(o.seconds);
  if (![4, 6, 8].includes(seconds)) throw new Stop('--seconds is 4, 6 or 8 (Veo 3.1)', 2);
  const each = videoPrice(o.videoModel, o.resolution, seconds), n = coaches.length * moves.length * takes;
  return {
    coaches, moves, takes, seconds,
    lines: [{ what: `clips: ${moves.length} move(s) x ${coaches.length} coach(es) x ${takes} = ${n} clips x ${seconds} s x ${usd(each / seconds)} a second`, cost: n * each }]
  };
}

// take-1, take-2, ... after the ones already in this run's folder for that move and coach
function takeNames(dir, n) {
  const have = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => +((f.match(/^take-(\d+)\.json$/) || [])[1] || 0)) : [];
  const first = Math.max(0, ...have) + 1;
  return Array.from({ length: n }, (_, i) => 'take-' + (first + i));
}

export async function run(o, ctx) {
  const p = plan(o);
  say(`Clips: ${p.moves.join(', ')} for coach ${p.coaches.join(', ')} (${o.videoModel}, ${o.resolution}, ${p.seconds} s)`);
  const jobs = [], missing = [];
  for (const coach of p.coaches) {
    for (const id of p.moves) {
      const file = pickedStart(coach, id);
      if (!file) missing.push(`${id} (${coach})`);
      const image = file ? imageInput(file) : placeholder(`tools/media/ai/keyframes/${coach}/${id}.jpg (pick a start pose first)`);
      const dir = path.join(ctx.run.dir, 'takes', coach, id);
      for (const t of takeNames(dir, p.takes)) jobs.push({ coach, id, image, take: path.join(dir, t), name: `clip-${coach}-${id}-${t}` });
    }
  }
  if (missing.length && !ctx.dry) {
    throw new Stop(`No picked start pose for ${missing.join(', ')} in ${show(path.join(HOME, 'keyframes'))}. ` +
      'Make start poses (keyframe step), then: node tools/media/ai/pick.mjs start <move> <coach> <n>. Nothing was sent.');
  }
  let stop = null;
  await pool(jobs, count(o.parallel, 'parallel', DEFAULTS.parallel, 6), async (j) => {
    if (stop) return;
    try {
      const r = await makeClip(ctx, {
        name: j.name, prompt: clipPrompt(j.coach, move(j.id)), image: j.image, o, take: j.take,
        meta: { step: 'clip', coach: j.coach, move: j.id, take: path.basename(j.take) }
      });
      if (r.status === 'filtered' || r.status === 'failed') ctx.failed.push({ name: j.name, status: r.status, error: r.error });
    } catch (e) {
      if (/^Budget:/.test(e.message)) stop = e.message;
      ctx.failed.push({ name: j.name, status: 'failed', error: e.message });
      warn(`  ${j.name}: ${e.message}`);
    }
  });
  if (stop) warn('Stopped: ' + stop);
  if (!ctx.dry) say(`Clips: ${jobs.length - ctx.failed.length} of ${jobs.length} made. Next: node tools/media/ai/review.mjs --from ${show(ctx.run.dir)}`);
}

// --fetch: finish clips that were sent but not downloaded (a run cut short, a slow day at Google). No new cost.
async function fetchPending(o) {
  if (!hasKey()) throw new Stop(KEY_MISSING);
  let n = 0;
  for (const dir of runDirs(o.from || OUT)) {
    const root = path.join(dir, 'takes');
    if (!fs.existsSync(root)) continue;
    const ctx = { run: { id: path.basename(dir), dir }, made: [], failed: [] };
    for (const coach of fs.readdirSync(root)) {
      for (const id of fs.readdirSync(path.join(root, coach))) {
        for (const f of fs.readdirSync(path.join(root, coach, id)).filter((x) => /^take-\d+\.json$/.test(x))) {
          const record = readJson(path.join(root, coach, id, f));
          if (record.status !== 'pending' || !record.operation) continue;
          n++;
          await finishClip(ctx, { name: `clip-${coach}-${id}-${f.replace('.json', '')}`, take: path.join(root, coach, id, f.replace('.json', '')), record, every: o.pollSeconds });
        }
      }
    }
  }
  say(n ? `Fetched ${n} pending clip(s).` : 'No pending clips.');
}

const OPTS = ['moves', 'coaches', 'takes', 'budget', 'video-model', 'resolution', 'seconds', 'parallel', 'poll-seconds', 'veo-image-form', 'run', 'out', 'from'];
if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['dry-run', 'fetch', 'help'], OPTS);
    const o = { ...DEFAULTS, ...a, pollSeconds: a.pollSeconds ? +a.pollSeconds : undefined };
    if (a.fetch) { await fetchPending(o); return 0; }
    if (a.help || !a.moves) { say('node tools/media/ai/clip.mjs --moves squat,push-up [--coaches f,m] [--takes 1] [--budget 5] [--dry-run]   or   --fetch'); return a.help ? 0 : 2; }
    const ctx = startRun({ id: a.run, out: a.out, budget: budget(a.budget), dry: a.dryRun, lines: plan(o).lines, steps: ['clip'] });
    await run(o, ctx);
    return ctx.over || ctx.failed.some((f) => f.status === 'failed') ? 1 : 0;
  });
}
