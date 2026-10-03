// The paid calls, with the dry run and the money guard around them: one picture from Gemini's image model, one clip
// from Veo. Every step goes through here, so no step can reach an API without the call being counted first.
import fs from 'node:fs';
import path from 'node:path';
import {
  ApiError, EXT, KEY_MISSING, Ledger, OUT, PRICES, Stop, apiJson, checkImageBody, checkVeoBody, download, hasKey, imageCall,
  imageFromAnswer, imageInput, imagePrice, kb, newRunId, openRun, operationUrl, placeholder, printEstimate, say, sha256, show,
  sleep, usd, veoCall, videoFromOperation, videoPrice, warn, writeCall, writeJson
} from './lib.mjs';

// Opens a run: prints the plan's estimate first, then refuses a plan over budget, or a paid run without a key,
// before anything is sent. A dry run over budget says a real run would stop, and goes on writing the bodies.
export function startRun({ id, out, budget, dry, lines, title, steps = [] }) {
  const total = printEstimate(lines, budget, title);
  const over = total > budget + 1e-9;
  if (over && !dry) {
    throw new Stop(`Over budget: this costs about ${usd(total)} and the budget is ${usd(budget)}. Nothing was sent. Raise the budget on ` +
      `purpose (--budget ${Math.ceil(total)}, or "budget": ${Math.ceil(total)} in the request file), or ask for fewer moves.`);
  }
  if (over) warn(`Over budget: a real run would stop here (${usd(total)} is more than ${usd(budget)}). The dry run goes on.`);
  if (!dry && !hasKey()) throw new Stop(KEY_MISSING);
  const run = openRun(id || newRunId(), out || OUT);            // only now: a refused run leaves no folder behind
  say('Run ' + run.id + ' in ' + show(run.dir));
  if (dry) say('Dry run: nothing is sent, nothing is spent. The request bodies go to ' + show(path.join(run.dir, 'calls')));
  // the budget holds for this command; run.json adds up every command that wrote into the same run folder
  const before = { spent: run.meta.spent || 0, calls: run.meta.calls || 0 };
  const ledger = new Ledger(budget, () => run.save({ spent: Math.round((before.spent + ledger.spent) * 100) / 100, calls: before.calls + ledger.calls }));
  run.save({ steps: [...new Set([...(run.meta.steps || []), ...steps])], budget, estimate: Math.round(total * 100) / 100, dry: !!dry, prices: PRICES.checked });
  return { run, ledger, dry: !!dry, over, made: [], failed: [] };
}

// One picture. `out` is the file name without extension (the extension follows what comes back). In a dry run it
// writes the request to calls/<name>.json and hands back a stand-in, so the next call that uses this picture can be
// written too.
export async function makeImage(ctx, { name, prompt, images = [], aspectRatio, o, out, meta = {} }) {
  const call = imageCall({ api: o.imageApi, model: o.imageModel, prompt, images, aspectRatio, imageSize: o.imageSize });
  const problems = checkImageBody(call.body, o.imageApi, o.imageModel);
  if (problems.length) throw new Stop(`The request for ${name} doesn't match the docs: ${problems.join('; ')}`);
  const cost = imagePrice(o.imageModel, o.imageSize);
  if (ctx.dry) {
    writeCall(path.join(ctx.run.dir, 'calls', name + '.json'), call, images);
    say(`  ${name}: request written (about ${usd(cost)} in a real run)`);
    return placeholder(show(out) + '.jpg, made earlier in the same run');
  }
  const hold = ctx.ledger.reserve(cost, name);
  let answer;
  try {
    answer = await apiJson('POST', call.url, call.body, { onRetry: (m, w) => warn(`  ${name}: ${m}. Trying again in ${Math.round(w / 1000)} s.`) });
  } catch (e) {
    if (!(e instanceof ApiError && e.maybeDone)) hold.release();         // refused or never sent: not charged
    throw e;
  }
  const img = imageFromAnswer(answer);                                    // no picture (a filter): it still counts
  const file = out + (EXT[img.mime] || '.png');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, img.buf);
  writeJson(out + '.json', {
    ...meta, run: ctx.run.id, model: o.imageModel, api: o.imageApi, imageSize: o.imageSize, aspectRatio,
    references: images.map((i) => i.label), prompt, estimatedCost: cost, made: new Date().toISOString(), sha256: sha256(file)
  });
  ctx.made.push(file);
  say(`  ${name}: ${show(file)} (${kb(img.buf.length)}, about ${usd(cost)})`);
  return imageInput(file);
}

// One clip: send it, wait for it, save it. `take` is the file name without extension; its .json sidecar holds the
// operation's name from the moment Veo accepts the job, so a clip that is slow to finish is never lost (it stays on
// Google's side for 2 days: clip.mjs --fetch picks it up).
export async function makeClip(ctx, { name, prompt, image, o, take, meta = {} }) {
  const call = veoCall({ model: o.videoModel, prompt, image, lastFrame: image, resolution: o.resolution, durationSeconds: o.seconds, form: o.veoImageForm });
  const problems = checkVeoBody(call.body, o.videoModel);
  if (problems.length) throw new Stop(`The request for ${name} doesn't match the docs: ${problems.join('; ')}`);
  const cost = videoPrice(o.videoModel, o.resolution, o.seconds);
  if (ctx.dry) {
    writeCall(path.join(ctx.run.dir, 'calls', name + '.json'), call, [image]);
    say(`  ${name}: request written (about ${usd(cost)} in a real run)`);
    return { status: 'dry' };
  }
  const side = take + '.json';
  const record = {
    ...meta, run: ctx.run.id, model: o.videoModel, resolution: o.resolution, durationSeconds: o.seconds, aspectRatio: '16:9',
    keyframe: image.label, prompt, estimatedCost: cost, status: 'sending'
  };
  writeJson(side, record);
  const hold = ctx.ledger.reserve(cost, name);
  let op;
  try {
    op = await apiJson('POST', call.url, call.body, { timeout: 300000, onRetry: (m, w) => warn(`  ${name}: ${m}. Trying again in ${Math.round(w / 1000)} s.`) });
  } catch (e) {
    if (!(e instanceof ApiError && e.maybeDone)) hold.release();
    writeJson(side, { ...record, status: 'failed', error: e.message });
    throw e;
  }
  if (!op || !op.name) throw new Stop(`${name}: Veo accepted the job but sent no operation name: ${JSON.stringify(op).slice(0, 200)}`);
  Object.assign(record, { status: 'pending', operation: op.name, sent: new Date().toISOString() });
  writeJson(side, record);
  say(`  ${name}: sent (${op.name})`);
  return finishClip(ctx, { name, take, record, every: o.pollSeconds });
}

// Polls a sent clip until it is done, then downloads it. Used right after sending, and by clip.mjs --fetch.
export async function finishClip(ctx, { name, take, record, every = 10, limit = 20 }) {
  const side = take + '.json';
  const t0 = Date.now();
  let polls = 0, v;
  for (;;) {
    await sleep(every * 1000);
    polls++;
    v = videoFromOperation(await apiJson('GET', operationUrl(record.operation), null, { timeout: 60000 }));
    if (v.done) break;
    if ((Date.now() - t0) / 60000 > limit) {
      writeJson(side, { ...record, status: 'pending', polls });
      throw new Stop(`${name}: not done after ${limit} minutes. Saved as pending; within 2 days, fetch it with: node tools/media/ai/clip.mjs --fetch --from ${show(ctx.run.dir)}`);
    }
    if (polls % 6 === 0) say(`  ${name}: still making it (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  if (v.error || v.filtered) {
    const status = v.filtered ? 'filtered' : 'failed';
    writeJson(side, { ...record, status, polls, error: v.filtered || v.error, finished: new Date().toISOString() });
    warn(`  ${name}: ${v.filtered ? 'blocked by a safety filter (' + v.filtered + '). Google charges nothing for a blocked video.' : 'failed: ' + v.error}`);
    return { status, error: v.filtered || v.error };
  }
  const file = take + '.mp4';
  if (v.uri) await download(v.uri, file);
  else fs.writeFileSync(file, v.bytes);
  writeJson(side, { ...record, status: 'done', polls, finished: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), sha256: sha256(file) });
  ctx.made.push(file);
  say(`  ${name}: ${show(file)} (${kb(fs.statSync(file).size)}, ${polls} checks)`);
  return { status: 'done', file };
}

// Runs fn over items, n at a time (Veo makes several clips at once on its side).
export async function pool(items, n, fn) {
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
}
