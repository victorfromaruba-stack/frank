// Step 2, the start poses: for each move and coach, --candidates photos of the picked coach in the move's start
// position, framed as the shot list says (camera 45°, Side or Front; 16:9). The coach's three picked reference photos
// (tools/media/ai/coaches/<coach>/front, side, 45) go along, so it stays the same person in every move.
// Victor picks one per move and coach: pick.mjs start <move> <coach> <n>. The clip step animates the picked one.
//
//   node tools/media/ai/keyframe.mjs --moves squat,push-up,plank [--coaches f,m] [--candidates 2] [--budget 5] [--dry-run]
//   --moves takes ids or a batch of the shot list: first-20, next-25, other-35, all
//   more: --image-model, --image-size, --image-api, --run <id>, --out <folder> (as in design.mjs)
//
// Writes out/<run>/keyframes/<coach>/<move>/<n>.jpg, each with a .json beside it. About $0.08 a photo at 1K.
import path from 'node:path';
import {
  DEFAULTS, HOME, VIEWS, VIEW_NAME, Stop, budget, coachIds, count, imageInput, imagePrice, isMain, main, move, moveIds, parseArgs,
  pickedLook, placeholder, say, show, usd
} from './lib.mjs';
import { makeImage, startRun } from './calls.mjs';
import { startPrompt } from './prompts.mjs';

export function plan(o) {
  const coaches = coachIds(o.coaches), moves = moveIds(o.moves), candidates = count(o.candidates, 'candidates', DEFAULTS.candidates, 6);
  const each = imagePrice(o.imageModel, o.imageSize), n = coaches.length * moves.length * candidates;
  return {
    coaches, moves, candidates,
    lines: [{ what: `start poses: ${moves.length} move(s) x ${coaches.length} coach(es) x ${candidates} = ${n} images x ${usd(each)}`, cost: n * each }]
  };
}

// The picked look of a coach, as reference images. A dry run without a pick uses labelled stand-ins.
function references(coach, dry) {
  const views = pickedLook(coach);
  const missing = views.filter((v) => !v.file).map((v) => v.view);
  if (missing.length && !dry) {
    throw new Stop(`Coach ${coach} has no picked look: ${missing.join(', ')} missing in ${show(path.join(HOME, 'coaches', coach))}. ` +
      `Run the design step, then: node tools/media/ai/pick.mjs look ${coach} <n>`);
  }
  return views.map((v, i) => ({
    ...(v.file ? imageInput(v.file) : placeholder(`tools/media/ai/coaches/${coach}/${v.view}.jpg (pick a look first)`)),
    note: `Reference photo ${i + 1}: the coach seen ${VIEW_NAME[VIEWS[i]]}.`
  }));
}

export async function run(o, ctx) {
  const p = plan(o);
  say(`Start poses: ${p.moves.join(', ')} for coach ${p.coaches.join(', ')}`);
  for (const coach of p.coaches) {
    const refs = references(coach, ctx.dry);
    for (const id of p.moves) {
      const m = move(id);
      for (let k = 1; k <= p.candidates; k++) {
        await makeImage(ctx, {
          name: `start-${coach}-${id}-${k}`, prompt: startPrompt(coach, m), images: refs, aspectRatio: '16:9', o,
          out: path.join(ctx.run.dir, 'keyframes', coach, id, String(k)), meta: { step: 'keyframe', coach, move: id, candidate: k, camera: m.camera }
        });
      }
    }
  }
  say(ctx.dry ? 'Start poses: requests written.' : `Start poses: done. Pick one per move and coach: node tools/media/ai/pick.mjs start <move> <coach> <n>`);
}

const OPTS = ['moves', 'coaches', 'candidates', 'budget', 'image-model', 'image-size', 'image-api', 'run', 'out'];
if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['dry-run', 'help'], OPTS);
    if (a.help || !a.moves) { say('node tools/media/ai/keyframe.mjs --moves squat,push-up [--coaches f,m] [--candidates 2] [--budget 5] [--dry-run]'); return a.help ? 0 : 2; }
    const o = { ...DEFAULTS, ...a };
    const ctx = startRun({ id: a.run, out: a.out, budget: budget(a.budget), dry: a.dryRun, lines: plan(o).lines, steps: ['keyframe'] });
    await run(o, ctx);
    return ctx.over ? 1 : 0;
  });
}
