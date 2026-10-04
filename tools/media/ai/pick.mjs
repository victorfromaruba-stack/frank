// Records a person's pick by copying it to where the next step reads it, with a .json beside it that says where it
// came from. Commit what it writes on the coach-video branch: a few small pictures. Git ignores out/.
//
//   node tools/media/ai/pick.mjs look <coach> <n> [--from <dir>] [--by <name>]
//        the run's coaches/<coach>/look-<n>/{front,side,45}  ->  tools/media/ai/coaches/<coach>/
//   node tools/media/ai/pick.mjs start <move> <coach> <n> [--from <dir>] [--by <name>] [--wider <scale>]
//        the run's keyframes/<coach>/<move>/<n>              ->  tools/media/ai/keyframes/<coach>/<move>.jpg
//
// --wider 0.85 (start poses of moves that jump): the photo at 85% on the same frame, with room above the head. See
// widen() below.
//
// --from: a run folder, an unzipped artifact from GitHub, or out/ (the default: the newest run that has the pick).
// Without Node, the same works by hand: put the three photos of the look you chose in tools/media/ai/coaches/<coach>/
// as front.jpg, side.jpg and 45.jpg, or the start pose as tools/media/ai/keyframes/<coach>/<move>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { HOME, OUT, Stop, VIEWS, coachIds, ff, findImage, isMain, main, move, parseArgs, probe, readJson, runDirs, say, sha256, show, today, writeJson } from './lib.mjs';

const USAGE = 'node tools/media/ai/pick.mjs look <coach> <n>   or   node tools/media/ai/pick.mjs start <move> <coach> <n> [--wider <scale>]   [--from <dir>] [--by <name>]';

// the newest run under `from` that has the picture (any image extension)
function find(from, rel) {
  for (const dir of runDirs(from || OUT)) { const f = findImage(path.join(dir, rel)); if (f) return { dir, file: f }; }
  throw new Stop(`Not found: ${rel}.(jpg|png|webp) in any run under ${show(path.resolve(from || OUT))}. Check the number, or give --from <run folder or unzipped artifact>.`);
}
// copies a picture in place of the old pick (whatever its extension was)
function place(src, base) {
  for (const e of ['.jpg', '.jpeg', '.png', '.webp']) fs.rmSync(base + e, { force: true });
  const dest = base + path.extname(src).toLowerCase();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return dest;
}

export function pickLook(coach, n, { from, by } = {}) {
  coachIds(coach);
  if (!/^\d+$/.test(String(n))) throw new Stop('The look is a number, like 2: ' + USAGE, 2);
  const files = {};
  let runDir = null;
  for (const view of VIEWS) {
    const { dir, file } = find(from, path.join('coaches', coach, 'look-' + n, view));
    if (runDir && dir !== runDir) throw new Stop(`The ${view} photo of look ${n} is in another run than the others: give --from <run folder>`);
    runDir = dir;
    files[view] = place(file, path.join(HOME, 'coaches', coach, view));
  }
  writeJson(path.join(HOME, 'coaches', coach, 'look.json'), {
    coach, look: +n, run: path.basename(runDir), picked: today(), by: by || null,
    files: Object.fromEntries(Object.entries(files).map(([v, f]) => [v, { file: path.basename(f), sha256: sha256(f) }])),
    prompt: readJson(path.join(runDir, 'coaches', coach, 'look-' + n, 'front.json'), {}).prompt || null
  });
  for (const f of Object.values(files)) say('Picked ' + show(f));
  say(`Coach ${coach} now has look ${n}. Commit ${show(path.join(HOME, 'coaches', coach))}, then make start poses (keyframe step).`);
  return files;
}

// A standing side view comes back filling the frame top to bottom, whatever the framing words say, and a jump then
// leaves the frame (day 2's jump squat). widen() puts the photo, scaled down, on the same frame: centred left to
// right, with three quarters of the free room above the head. The studio around it is the average colour of the
// photo's edge, row by row and column by column, blurred sideways only (the line where wall meets floor stays sharp),
// and the photo goes over it with soft edges. Made for the plain studio; look at the result before committing it.
export function widen(src, dest, scale) {
  const s = Number(scale);
  if (!(s >= 0.6 && s <= 0.95)) throw new Stop('--wider takes a scale from 0.6 to 0.95, like 0.85', 2);
  const { width: W, height: H } = probe(src);
  const even = (v) => 2 * Math.round(v / 2);
  const w = even(W * s), h = even(H * s), x = Math.floor((W - w) / 2), r = W - w - x, y = Math.round((H - h) * 0.75), b = H - h - y;
  if (!(x > 0 && r > 0 && y > 0 && b > 0)) throw new Stop(`${show(src)} is too small to widen (${W} x ${H})`);
  const e = Math.max(4, Math.round(w * 0.04)), t = Math.max(4, Math.round(h * 0.06)), u = Math.max(2, Math.round(h * 0.02));
  const mean = (cw, ch, cx, cy, mw, mh, ow, oh) => `crop=${cw}:${ch}:${cx}:${cy},scale=${mw}:${mh}:flags=area,scale=${ow}:${oh}:flags=neighbor`;
  const graph = [
    `[0]scale=${w}:${h}:flags=lanczos,format=yuv444p,split=10[s0][s1][s2][s3][s4][s5][s6][s7][s8][s9]`,
    `[s1]${mean(e, h, 0, 0, 1, h, x, h)}[L]`, `[s2]${mean(e, h, w - e, 0, 1, h, r, h)}[R]`,
    `[s3]${mean(w, t, 0, 0, w, 1, w, y)}[T]`, `[s4]${mean(w, u, 0, h - u, w, 1, w, b)}[B]`,
    `[s5]${mean(e, t, 0, 0, 1, 1, x, y)}[TL]`, `[s6]${mean(e, t, w - e, 0, 1, 1, r, y)}[TR]`,
    `[s7]${mean(e, u, 0, h - u, 1, 1, x, b)}[BL]`, `[s8]${mean(e, u, w - e, h - u, 1, 1, r, b)}[BR]`,
    '[TL][T][TR]hstack=3[top]', '[L][s0][R]hstack=3[mid]', '[BL][B][BR]hstack=3[bot]',
    `[top][mid][bot]vstack=3,gblur=sigma=${Math.max(2, Math.round(W / 100))}:sigmaV=1[bg]`,
    `[s9]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,min(min(X,W-1-X)/${Math.max(4, Math.round(w * 0.048))},min(Y/${t},(H-1-Y)/${Math.max(2, Math.round(h * 0.01))})))'[fg]`,
    `[bg][fg]overlay=${x}:${y}:format=auto,format=yuvj420p`
  ].join(';');
  ff(['-i', src, '-filter_complex', graph, '-frames:v', '1', '-q:v', '2', dest]);
  return { scale: s, width: w, height: h, x, y, sourceSha256: sha256(src) };
}

export function pickStart(id, coach, n, { from, by, wider } = {}) {
  move(id); coachIds(coach);
  if (!/^\d+$/.test(String(n))) throw new Stop('The start pose is a number, like 1: ' + USAGE, 2);
  const { dir, file } = find(from, path.join('keyframes', coach, id, String(n)));
  const base = path.join(HOME, 'keyframes', coach, id);
  let dest = base + '.jpg', edit = null;
  if (wider != null) {
    const out = base + '.wider.jpg';
    edit = widen(file, out, wider);
    for (const x of ['.jpg', '.jpeg', '.png', '.webp']) fs.rmSync(base + x, { force: true });
    fs.renameSync(out, dest);
  } else dest = place(file, base);
  const made = readJson(file.replace(/\.\w+$/, '.json'), {});
  writeJson(base + '.json', { ...made, move: id, coach, candidate: +n, run: path.basename(dir), picked: today(), by: by || null, sha256: sha256(dest),
    ...(edit ? { wider: { ...edit, how: 'pick.mjs --wider: the photo scaled down on the same frame, the studio extended around it' } } : {}) });
  say(`Picked ${show(dest)} (start pose ${n} of ${path.basename(dir)}${edit ? ', at ' + edit.scale + ' on the same frame' : ''}). Commit it; the clip step animates it.`);
  return dest;
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['help'], ['from', 'by', 'wider']);
    const [what, ...rest] = a._;
    if (what === 'look' && rest.length === 2) pickLook(rest[0], rest[1], a);
    else if (what === 'start' && rest.length === 3) pickStart(rest[0], rest[1], rest[2], a);
    else { say(USAGE); return a.help ? 0 : 2; }
    return 0;
  });
}
