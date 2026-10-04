// Step 5, into the app: every approved take (approved.json) goes through tools/media/process.sh, the script for
// Frank's own clips, which takes the sound out, crops, compresses and makes the still: media/<move>.mp4 and
// media/<move>.jpg. Then it prints the js/media.js lines, marked ai: true. It never edits js/media.js itself: that
// file ships to Frank's members, so a person adds the lines once the app labels AI clips (see the warning below).
//
//   node tools/media/ai/process.mjs [--moves squat,push-up] [--coach f] [--from <run folder or unzipped artifact>]
//   --root <folder>   the app to write into (default: this repo; the tests use a copy)
//
// The rules it keeps:
//   - only approved takes, found by their sha256: another or a changed file is refused;
//   - one clip per move, as the app plays one: a move approved for both coaches needs --coach;
//   - never over Frank's own clip: a move in js/media.js with frank: true is his, and stays (a clip line with
//     neither flag isn't replaced either: someone has to say whose it is);
//   - honest labels: until the app reads ai: true, it warns not to add the lines (today the Video tab tags every clip
//     "Frank", in js/app.js).
// It cuts the take's last frame: it is the same picture as the first, which comes right after it in the loop.
// Needs ffmpeg.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NO_FFMPEG, OUT, ROOT, Stop, coachIds, haveFfmpeg, isMain, list, main, move, moveIds, parseArgs, probe, read, runDirs, say, sha256, show, warn } from './lib.mjs';
import { approvals } from './approve.mjs';

// The moves js/media.js lists, and whether each is marked ai: true or frank: true (Frank's own), and has a video.
export function mediaLines(root) {
  const f = path.join(root, 'js', 'media.js');
  const out = {};
  if (!fs.existsSync(f)) return out;
  const body = read(f).split('W.WBF.MEDIA = {')[1] || '';
  for (const m of body.matchAll(/^\s*'?([a-z0-9-]+)'?\s*:\s*\{([^}]*)\}/gm)) {
    out[m[1]] = { ai: /\bai\s*:\s*true\b/.test(m[2]), frank: /\bfrank\s*:\s*true\b/.test(m[2]), video: /\bvideo\s*:/.test(m[2]) };
  }
  return out;
}
// Whether the app labels AI clips: some js/ file other than media.js reads the ai flag of a clip (like m.ai). Where the
// Video tab tags every clip "Frank", it says where, for the warning.
export function aiLabel(root) {
  const dir = path.join(root, 'js');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'media.js') : [];
  let reads = false, frankTag = null;
  for (const f of files) {
    const src = read(path.join(dir, f));
    if (/\.ai\b/.test(src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''))) reads = true;
    src.split('\n').forEach((l, i) => { if (!frankTag && /tag">Frank</.test(l)) frankTag = `js/${f}:${i + 1}`; });
  }
  return { reads, frankTag };
}

// The approved take for each move, after the rules above.
function chosen(o) {
  const all = approvals().approved;
  const want = o.moves ? moveIds(o.moves) : null, coach = o.coach ? coachIds(o.coach)[0] : null;
  const byMove = new Map();
  for (const x of all) {
    if (want && !want.includes(x.move)) continue;
    if (coach && x.coach !== coach) continue;
    if (!byMove.has(x.move)) byMove.set(x.move, []);
    byMove.get(x.move).push(x);
  }
  const picks = [], problems = [];
  for (const [id, xs] of byMove) {
    const coaches = [...new Set(xs.map((x) => x.coach))];
    if (coaches.length > 1) { problems.push(`${id} is approved for coaches ${coaches.join(' and ')}; the app plays one clip per move. Choose with --coach.`); continue; }
    if (xs.length > 1) say(`${id}: ${xs.length} approved takes for coach ${coaches[0]}; using the newest approval (${xs[xs.length - 1].take} of ${xs[xs.length - 1].run}).`);
    picks.push(xs[xs.length - 1]);
  }
  if (want) for (const id of want) if (!byMove.has(id)) problems.push(`${id}: nothing approved${coach ? ' for coach ' + coach : ''} (approve.mjs --list)`);
  return { picks, problems };
}

// The file of an approval, wherever its run folder is: matched by its sha256, never by name alone.
function fileOf(x, from) {
  const rel = path.join('takes', x.coach, x.move, x.take + '.mp4');
  for (const dir of runDirs(from || OUT)) {
    const f = path.join(dir, rel);
    if (fs.existsSync(f) && sha256(f) === x.sha256) return f;
  }
  return null;
}

export function processApproved(o = {}) {
  if (!haveFfmpeg()) throw new Stop(NO_FFMPEG);
  const root = path.resolve(o.root || ROOT);
  const script = path.join(root, 'tools', 'media', 'process.sh');
  if (!fs.existsSync(script)) throw new Stop('No tools/media/process.sh in ' + show(root));
  const { picks, problems } = chosen(o);
  const theirs = mediaLines(root);
  const done = [];
  for (const x of picks) {
    const line = theirs[x.move];
    if (line && line.frank) { problems.push(`${x.move}: Frank's own clip is in js/media.js. An AI clip never replaces it.`); continue; }
    if (line && line.video && !line.ai) { problems.push(`${x.move}: its clip in js/media.js has neither ai: true nor frank: true. Say whose it is first.`); continue; }
    const f = fileOf(x, o.from);
    if (!f) { problems.push(`${x.move}: approved ${x.take} of run ${x.run} isn't on this machine (or changed). Download that run's artifact and give --from.`); continue; }
    const p = probe(f);
    // drop the last frame (the start pose again: the loop's first frame follows it), or cut just before the frame an
    // approval's end names (approve.mjs --end), where the loop closes
    const frame = p.fps ? 1 / p.fps : 0.04;
    const end = (x.end ? Math.min(Number(x.end), p.duration) - frame / 2 : Math.max(0.5, p.duration - frame)).toFixed(3);
    const m = move(x.move);
    const r = spawnSync('bash', [script, f, x.move, '0', end, ...(m.wide ? ['--wide'] : [])], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) { problems.push(`${x.move}: process.sh failed: ${String(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' | ')}`); continue; }
    const video = path.join(root, 'media', x.move + '.mp4'), poster = path.join(root, 'media', x.move + '.jpg');
    const q = probe(video);
    if (q.audio || q.vcodec !== 'h264' || !fs.existsSync(poster)) { problems.push(`${x.move}: the result isn't right (sound: ${q.audio}, codec: ${q.vcodec}, poster: ${fs.existsSync(poster)})`); continue; }
    say(`${x.move}: ${show(video)} (${q.width} x ${q.height}, ${q.duration.toFixed(1)} s${x.end ? ', cut where the loop closes' : ''}, ${Math.round(fs.statSync(video).size / 1024)} KB, no sound) and ${show(poster)}, from ${x.take} of ${x.run} (coach ${x.coach}, approved by ${x.approvedBy} on ${x.date})`);
    done.push(x);
  }
  if (done.length) {
    say('\nThe js/media.js lines, inside W.WBF.MEDIA:');
    for (const x of done) say(`    '${x.move}': { video: 'media/${x.move}.mp4', poster: 'media/${x.move}.jpg', ai: true },`);
    const label = aiLabel(root);
    if (!label.reads) {
      warn('\nDON\'T ADD THESE LINES YET. The app doesn\'t read ai: true, so it would show an AI clip as Frank\'s own' +
        (label.frankTag ? ` (${label.frankTag} tags every clip "Frank")` : '') + '. First the app labels AI clips (the frank-coach-video skill), then the lines.');
    } else {
      say('\nThen: bump VERSION in sw.js (js/media.js is cached), run node tools/test/run.cjs, and look at the moves in the app (frank-release).');
    }
  }
  for (const pr of problems) warn('Not processed: ' + pr);
  if (!picks.length && !problems.length) say('Nothing approved yet: approve takes first (approve.mjs).');
  return { done, problems };
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['help'], ['moves', 'coach', 'from', 'root']);
    if (a.help) { say('node tools/media/ai/process.mjs [--moves squat,push-up] [--coach f] [--from <run folder or unzipped artifact>] [--root <app folder>]'); return 0; }
    if (a.moves) list(a.moves);
    const r = processApproved(a);
    return r.problems.length ? 1 : 0;
  });
}
