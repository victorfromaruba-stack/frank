// Records a person's pick by copying it to where the next step reads it, with a .json beside it that says where it
// came from. Commit what it writes on the coach-video branch: a few small pictures. Git ignores out/.
//
//   node tools/media/ai/pick.mjs look <coach> <n> [--from <dir>] [--by <name>]
//        the run's coaches/<coach>/look-<n>/{front,side,45}  ->  tools/media/ai/coaches/<coach>/
//   node tools/media/ai/pick.mjs start <move> <coach> <n> [--from <dir>] [--by <name>]
//        the run's keyframes/<coach>/<move>/<n>              ->  tools/media/ai/keyframes/<coach>/<move>.jpg
//
// --from: a run folder, an unzipped artifact from GitHub, or out/ (the default: the newest run that has the pick).
// Without Node, the same works by hand: put the three photos of the look you chose in tools/media/ai/coaches/<coach>/
// as front.jpg, side.jpg and 45.jpg, or the start pose as tools/media/ai/keyframes/<coach>/<move>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { HOME, OUT, Stop, VIEWS, coachIds, findImage, isMain, main, move, parseArgs, readJson, runDirs, say, sha256, show, today, writeJson } from './lib.mjs';

const USAGE = 'node tools/media/ai/pick.mjs look <coach> <n>   or   node tools/media/ai/pick.mjs start <move> <coach> <n>   [--from <dir>] [--by <name>]';

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

export function pickStart(id, coach, n, { from, by } = {}) {
  move(id); coachIds(coach);
  if (!/^\d+$/.test(String(n))) throw new Stop('The start pose is a number, like 1: ' + USAGE, 2);
  const { dir, file } = find(from, path.join('keyframes', coach, id, String(n)));
  const dest = place(file, path.join(HOME, 'keyframes', coach, id));
  const made = readJson(file.replace(/\.\w+$/, '.json'), {});
  writeJson(path.join(HOME, 'keyframes', coach, id + '.json'), { ...made, move: id, coach, candidate: +n, run: path.basename(dir), picked: today(), by: by || null, sha256: sha256(dest) });
  say(`Picked ${show(dest)} (start pose ${n} of ${path.basename(dir)}). Commit it; the clip step animates it.`);
  return dest;
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['help'], ['from', 'by']);
    const [what, ...rest] = a._;
    if (what === 'look' && rest.length === 2) pickLook(rest[0], rest[1], a);
    else if (what === 'start' && rest.length === 3) pickStart(rest[0], rest[1], rest[2], a);
    else { say(USAGE); return a.help ? 0 : 2; }
    return 0;
  });
}
