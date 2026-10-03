// Step 1, the coaches: for each coach in coaches.json, --looks candidate looks of one made-up person. A look is three
// reference photos: from the front (made from the brief), then from the side and from 45 degrees (made from the
// front photo, so it stays the same person). Victor picks one look per coach: pick.mjs look <coach> <n>.
//
//   node tools/media/ai/design.mjs [--coaches f,m] [--looks 2] [--budget 5] [--dry-run]
//   more: --image-model gemini-3.1-flash-image  --image-size 1K  --image-api interactions|generate-content
//         --run <id> (add to that run's folder)  --out <folder>  (default tools/media/ai/out)
//
// Writes out/<run>/coaches/<coach>/look-<n>/front.jpg, side.jpg, 45.jpg, each with a .json beside it (the prompt,
// the model, the estimated cost). 3 images per look, about $0.08 each at 1K (PRICES in lib.mjs).
import path from 'node:path';
import { DEFAULTS, VIEWS, budget, coachIds, count, imagePrice, isMain, main, parseArgs, say, usd } from './lib.mjs';
import { makeImage, startRun } from './calls.mjs';
import { lookPrompt } from './prompts.mjs';

export function plan(o) {
  const coaches = coachIds(o.coaches), looks = count(o.looks, 'looks', DEFAULTS.looks, 6);
  const each = imagePrice(o.imageModel, o.imageSize), n = coaches.length * looks * VIEWS.length;
  return {
    coaches, looks,
    lines: [{ what: `design: ${coaches.join(', ')} x ${looks} look(s) x 3 photos = ${n} images x ${usd(each)}`, cost: n * each }]
  };
}

export async function run(o, ctx) {
  const p = plan(o);
  say(`Design: ${p.looks} look(s) for coach ${p.coaches.join(', ')}`);
  for (const coach of p.coaches) {
    for (let look = 1; look <= p.looks; look++) {
      const dir = path.join(ctx.run.dir, 'coaches', coach, 'look-' + look);
      const made = {};
      for (const view of VIEWS) {
        // front from words alone; the side from the front; 45 degrees from both
        const refs = view === 'front' ? [] : view === 'side' ? [made.front] : [made.front, made.side];
        const images = refs.map((im, i) => ({ ...im, note: `Reference photo ${i + 1}: the coach seen ${['from the front', 'from the side'][i]}.` }));
        made[view] = await makeImage(ctx, {
          name: `design-${coach}-look${look}-${view}`, prompt: lookPrompt(coach, view), images, aspectRatio: '3:4', o,
          out: path.join(dir, view), meta: { step: 'design', coach, look, view }
        });
      }
    }
  }
  say(ctx.dry ? 'Design: requests written.' : `Design: done. Look at ${path.join('out', ctx.run.id, 'coaches')} and pick one look per coach: node tools/media/ai/pick.mjs look <coach> <n>`);
}

const OPTS = ['coaches', 'looks', 'budget', 'image-model', 'image-size', 'image-api', 'run', 'out'];
if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['dry-run', 'help'], OPTS);
    if (a.help) { say('node tools/media/ai/design.mjs [--coaches f,m] [--looks 2] [--budget 5] [--dry-run]  (more: the top of this file)'); return 0; }
    const o = { ...DEFAULTS, ...a };
    const ctx = startRun({ id: a.run, out: a.out, budget: budget(a.budget), dry: a.dryRun, lines: plan(o).lines, steps: ['design'] });
    await run(o, ctx);
    return ctx.over ? 1 : 0;
  });
}
