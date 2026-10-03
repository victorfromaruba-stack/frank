// Step 4, the review: a contact sheet of every take in a run, to decide which ones go in the app.
//   out/<run>/review/index.html   each take playing in a loop, its start, middle and end frames, the picked start
//                                 pose, the move's cues, set-up, steps and mistakes, and the line that approves it
//   out/<run>/review/sheet.png    the same frames and cues on one picture, to send or look at on a phone
// Measured, not guessed: the loop seam (SSIM between the first and the last frame, 1 = the same picture) and how close
// the first frame is to the picked start pose. They are hints; watching the loop decides.
//
//   node tools/media/ai/review.mjs [--from <run folder, unzipped artifact or out/>]   (default: the newest run with takes)
// Needs ffmpeg. Then approve the good ones: node tools/media/ai/approve.mjs <move> <coach> <take> --by <name>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  NO_FFMPEG, OUT, ROOT, Stop, coachBook, frameAt, haveFfmpeg, isMain, latestRun, main, move, parseArgs, probe, readJson, say, show, ssim, warn
} from './lib.mjs';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CLIP = { reps: '3 to 4 reps', hold: 'a hold', rhythm: 'a steady rhythm', walk: 'walking' };
const seamWord = (s) => (s == null ? 'not measured' : s >= 0.9 ? 'close' : s >= 0.8 ? 'check it' : 'likely a jump');

// Every take in the run folder, with what the review shows about it.
function takes(runDir) {
  const root = path.join(runDir, 'takes'), out = [];
  if (!fs.existsSync(root)) return out;
  const book = coachBook();
  for (const coach of fs.readdirSync(root).sort()) {
    for (const id of fs.readdirSync(path.join(root, coach)).sort()) {
      for (const f of fs.readdirSync(path.join(root, coach, id)).filter((x) => /^take-\d+\.json$/.test(x)).sort()) {
        const rec = readJson(path.join(root, coach, id, f));
        const take = f.replace('.json', ''), file = path.join(root, coach, id, take + '.mp4');
        out.push({ coach, coachLabel: (book.coaches[coach] || {}).label || coach, id, take, rec, file: fs.existsSync(file) ? file : null, m: move(id) });
      }
    }
  }
  return out.sort((a, b) => a.m.n - b.m.n || a.coach.localeCompare(b.coach) || a.take.localeCompare(b.take, 'en', { numeric: true }));
}

// The picked start pose a take was made from, when it is on this machine.
function keyframeOf(t) {
  const label = t.rec.keyframe || '';
  const f = path.isAbsolute(label) ? label : path.join(ROOT, label);
  return label && fs.existsSync(f) ? f : null;
}

// Frames and measurements of one take.
function measure(t, dir) {
  const base = path.join(dir, 'frames', `${t.coach}-${t.id}-${t.take}`);
  const p = probe(t.file);
  t.info = p;
  t.frames = {
    start: frameAt(t.file, 0, base + '-start.jpg'),
    middle: frameAt(t.file, p.duration / 2, base + '-middle.jpg'),
    end: frameAt(t.file, 'last', base + '-end.jpg')
  };
  t.seam = ssim(t.frames.start, t.frames.end);
  const kf = keyframeOf(t);
  if (kf) { t.keyframe = frameAt(kf, 0, base + '-pose.jpg'); t.startMatch = ssim(t.frames.start, t.keyframe); }
}

function page(runDir, list, meta) {
  const rel = (f) => path.relative(path.join(runDir, 'review'), f).split(path.sep).join('/');
  const row = (t) => {
    const head = `<h2>${t.m.n}. ${esc(t.m.name)}</h2><p class="meta">${esc(t.coachLabel)} coach · ${esc(t.take)} · camera ${esc(t.m.camera)} · ` +
      `${CLIP[t.m.kind]}${t.m.oneSide ? ', right side only' : ''} · <code>${esc(t.id)}</code></p>`;
    if (!t.file) {
      return `<section class="take"><div>${head}<p class="bad">No video: ${esc(t.rec.status)}${t.rec.error ? ', ' + esc(t.rec.error) : ''}.</p></div></section>`;
    }
    const fig = (f, cap) => `<figure><img src="${rel(f)}" alt="${esc(cap)} of ${esc(t.m.name)}, ${esc(t.take)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`;
    return `<section class="take" id="${esc(t.coach + '-' + t.id + '-' + t.take)}">
<div class="watch">${head}
<video src="${rel(t.file)}" poster="${rel(t.frames.middle)}" controls loop muted playsinline preload="metadata"></video>
<div class="frames">${fig(t.frames.start, 'Start')}${fig(t.frames.middle, 'Middle')}${fig(t.frames.end, 'End')}${t.keyframe ? fig(t.keyframe, 'Picked start pose') : ''}</div>
<p class="measured">Loop seam, start against end frame: <b>SSIM ${t.seam == null ? 'n/a' : t.seam.toFixed(3)}</b> (${seamWord(t.seam)})` +
      `${t.startMatch != null ? ` · first frame against the picked start pose: <b>SSIM ${t.startMatch.toFixed(3)}</b>` : ''}` +
      ` · ${t.info.duration.toFixed(1)} s, ${t.info.width} x ${t.info.height}, ${Math.round(t.info.fps)} fps${t.info.audio ? ', with sound (processing takes it out)' : ''}. Measured with ffmpeg; 1 is the same picture.</p>
</div>
<div class="text">
<h3>Frank's cues</h3><ul>${t.m.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<h3>Set-up</h3><p>${esc(t.m.setup)}</p>
<h3>Steps</h3><ol>${t.m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<h3>Watch out for</h3><ul>${t.m.mistakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<h3>Approve it</h3><p>Only when none of the reasons to reject (at the top) applies:</p>
<pre>node tools/media/ai/approve.mjs ${esc(t.id)} ${esc(t.coach)} ${esc(t.take)} --from ${esc(show(runDir))} --by &lt;your name&gt;</pre>
</div></section>`;
  };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo review ${esc(meta.id)}</title>
<style>
:root {
  --paper: #F2F6F3;
  --white: #FFFFFF;
  --ink: #0E2A1A;
  --ink-2: #4A6455;
  --line: #D5DED8;
  --bad: #A3362A;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
header, main { max-width: 1240px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; margin: 8px 0; } h2 { font-size: 20px; margin: 0 0 2px; } h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-2); margin: 16px 0 4px; }
.meta, .measured, figcaption { color: var(--ink-2); font-size: 14px; }
.check { background: var(--white); border: 1px solid var(--line); border-radius: 6px; padding: 8px 16px; }
.take { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 24px; background: var(--white); border: 1px solid var(--line); border-radius: 6px; padding: 16px; margin: 16px 0; }
video { width: 100%; border-radius: 4px; background: var(--ink); margin-top: 8px; }
.frames { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
figure { margin: 0; } img { width: 100%; display: block; border-radius: 4px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: var(--paper); padding: 8px; border-radius: 4px; font-size: 13px; }
code { font-size: 13px; } .bad { color: var(--bad); }
ul, ol { padding-left: 20px; margin: 4px 0; }
@media (max-width: 760px) { .take { grid-template-columns: minmax(0, 1fr); } .frames { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style></head>
<body><header>
<h1>AI demo review</h1>
<p class="meta">Run ${esc(meta.id)} · ${esc((meta.started || '').slice(0, 10))} · ${list.length} take(s) · estimated spend $${Number(meta.spent || 0).toFixed(2)} · made by AI (Veo), not filmed</p>
<div class="check"><h3>Reject a take when any of these is true</h3><ul>
<li>The form doesn't match every cue exactly, at the start, in the middle and at the end.</li>
<li>A hand or foot is warped, melts, slides or changes shape; fingers or toes are wrong.</li>
<li>An extra or missing arm, leg, hand or finger, even for one frame.</li>
<li>The rep path is wrong: joints bend the wrong way, the depth or line is off, the reps aren't the same.</li>
<li>The loop jumps: watch the end run into the start a few times.</li>
<li>Text, a logo, a watermark you can see, another person, or the camera moves.</li>
<li>The face or clothes change, or it looks like a cartoon or a game.</li>
</ul></div></header>
<main>${list.map(row).join('\n')}</main>
</body></html>
`;
}

// The PNG: one row per take (start, middle, end frames and the cues), drawn by ffmpeg in Frank's font (fonts/).
function sheetPng(runDir, list, meta) {
  const rows = list.filter((t) => t.file);
  if (!rows.length) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-ai-sheet-'));     // simple file names: no escaping in the filter
  const font = path.join(ROOT, 'fonts', 'Nunito-latin.woff2');
  const W = 384, H = 216, T = 640;
  const run = (withText) => {
    const args = ['-hide_banner', '-loglevel', 'error', '-y'], graph = [];
    if (withText) fs.copyFileSync(font, path.join(dir, 'font.woff2'));
    const text = (name, s, size, x, y) => { fs.writeFileSync(path.join(dir, name), s); return `drawtext=fontfile=font.woff2:textfile=${name}:expansion=none:fontcolor=0x0E2A1A:fontsize=${size}:line_spacing=8:x=${x}:y=${y}`; };
    let k = 0;
    rows.forEach((t, i) => {
      for (const f of ['start', 'middle', 'end']) { fs.copyFileSync(t.frames[f], path.join(dir, `f${k}.jpg`)); args.push('-i', `f${k}.jpg`); k++; }
      const cells = [0, 1, 2].map((j) => { graph.push(`[${3 * i + j}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xDEE5E0[c${i}_${j}]`); return `[c${i}_${j}]`; });
      const lines = [`${t.coachLabel} coach, ${t.take}, camera ${t.m.camera}`, `Loop seam SSIM ${t.seam == null ? 'n/a' : t.seam.toFixed(3)} (${seamWord(t.seam)})`, ...t.m.cues];
      const words = withText ? ',' + text(`n${i}.txt`, `${t.m.n}. ${t.m.name}`, 22, 20, 14) + ',' + text(`t${i}.txt`, lines.join('\n'), 16, 20, 52) : '';
      graph.push(`color=c=0xFFFFFF:s=${T}x${H}:d=1${words}[t${i}]`);
      graph.push(`${cells.join('')}[t${i}]hstack=inputs=4,pad=iw:ih+8:0:0:color=0xF2F6F3[r${i}]`);
    });
    const title = `AI demo review, run ${meta.id}: start, middle and end of each take. Made by AI (Veo), not filmed.`;
    graph.push(`color=c=0xF2F6F3:s=${3 * W + T}x48:d=1${withText ? ',' + text('title.txt', title, 22, 20, 12) : ''}[head]`);
    graph.push(`[head]${rows.map((_, i) => `[r${i}]`).join('')}vstack=inputs=${rows.length + 1}[out]`);
    args.push('-filter_complex', graph.join(';'), '-map', '[out]', '-frames:v', '1', 'sheet.png');
    return spawnSync('ffmpeg', args, { cwd: dir, encoding: 'utf8' });
  };
  let r = run(true);
  if (r.status !== 0) { warn('The sheet\'s text could not be drawn (' + String(r.stderr).trim().split('\n').pop() + '); making it with the frames only.'); r = run(false); }
  if (r.status !== 0) { warn('sheet.png failed: ' + String(r.stderr).trim().split('\n').pop()); fs.rmSync(dir, { recursive: true, force: true }); return null; }
  const out = path.join(runDir, 'review', 'sheet.png');
  fs.copyFileSync(path.join(dir, 'sheet.png'), out);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

export function review(runDir) {
  if (!haveFfmpeg()) throw new Stop(NO_FFMPEG + '. The review needs it for the frames and the sheet.');
  const list = takes(runDir);
  if (!list.length) throw new Stop('No takes in ' + show(runDir) + ': run the clip step first.');
  const dir = path.join(runDir, 'review');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of list) if (t.file) measure(t, dir);
  const meta = readJson(path.join(runDir, 'run.json'), {});
  fs.writeFileSync(path.join(dir, 'index.html'), page(runDir, list, { id: path.basename(runDir), ...meta }));
  const png = sheetPng(runDir, list, { id: path.basename(runDir) });
  say(`Review: ${show(path.join(dir, 'index.html'))}${png ? ' and ' + show(png) : ''} (${list.length} take(s))`);
  for (const t of list) {
    say(`  ${t.id} ${t.coach} ${t.take}: ${t.file ? `loop seam SSIM ${t.seam == null ? 'n/a' : t.seam.toFixed(3)} (${seamWord(t.seam)})` : 'no video, ' + t.rec.status}`);
  }
  say('Approve a good one: node tools/media/ai/approve.mjs <move> <coach> <take> --from ' + show(runDir) + ' --by <your name>');
  return { html: path.join(dir, 'index.html'), png, takes: list };
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['help'], ['from']);
    if (a.help) { say('node tools/media/ai/review.mjs [--from <run folder, unzipped artifact or out/>]'); return 0; }
    review(latestRun(a.from || OUT, 'takes'));
    return 0;
  });
}
