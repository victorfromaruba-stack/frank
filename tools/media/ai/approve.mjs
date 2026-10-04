// Records that a person approved one take for the app, in tools/media/ai/approved.json. Commit that file: the process
// step reads it and processes nothing else. Each approval names its run and the take's sha256, so the file that goes
// in the app is exactly the one that was watched.
//
//   node tools/media/ai/approve.mjs <move> <coach> <take> --by <name> [--from <run folder or unzipped artifact>] [--note "..."] [--end <s>]
//   node tools/media/ai/approve.mjs --list
//
// --end: when the take's last moments jump (feet sliding back into place to meet the last frame, say), the time in
// seconds of a frame that matches the first one, before the jump: the app's clip is cut just before that frame, so it
// loops there. Watch the cut loop before approving it.
//
// Approve only after watching the take against the checklist on the review sheet (review.mjs). These clips teach a
// move in Frank's app: the form is checked against his cues first, and Frank looks at each in the app (Victor's
// decision, 4 October 2026: the clips go in before Frank sees them). --by names who said yes. To take an approval
// back, delete its entry in approved.json.
import fs from 'node:fs';
import path from 'node:path';
import { HOME, NO_FFMPEG, OUT, Stop, coachIds, haveFfmpeg, isMain, main, move, parseArgs, probe, readJson, runDirs, say, sha256, show, today, writeJson } from './lib.mjs';

export const APPROVED = () => path.join(HOME, 'approved.json');
const ABOUT = 'Takes approved for the app. tools/media/ai/approve.mjs adds them; process.mjs reads them. Each names its run and its sha256, ' +
  'so only that exact file is processed. To take one back, delete its entry.';
export const approvals = () => readJson(APPROVED(), { about: ABOUT, approved: [] });

export function approve(id, coach, take, { by, from, note, end } = {}) {
  move(id); coachIds(coach);
  if (!/^take-\d+$/.test(take || '')) throw new Stop('The take is named like take-1 (the review sheet shows it)', 2);
  if (!by || !String(by).trim()) throw new Stop('Say who approved it: --by <name>. Frank\'s yes on the form comes first.', 2);
  const rel = path.join('takes', coach, id, take);
  const dir = runDirs(from || OUT).find((d) => fs.existsSync(path.join(d, rel + '.mp4')));
  if (!dir) throw new Stop(`No ${rel}.mp4 in any run under ${show(path.resolve(from || OUT))}. Give --from <run folder or unzipped artifact>.`);
  const rec = readJson(path.join(dir, rel + '.json'), {});
  if (rec.status && rec.status !== 'done') throw new Stop(`${rel} is ${rec.status}, not a finished take`);
  const sum = sha256(path.join(dir, rel + '.mp4'));
  if (rec.sha256 && rec.sha256 !== sum) throw new Stop(`${rel}.mp4 changed since it was downloaded (sha256 differs from its .json). Don't approve an edited file.`);
  let loop = null;
  if (end != null && end !== '' && end !== true) {
    if (!haveFfmpeg()) throw new Stop(NO_FFMPEG);
    const len = probe(path.join(dir, rel + '.mp4')).duration;
    loop = Number(end);
    if (!(loop >= 1 && loop < len)) throw new Stop(`--end is where the loop closes, in seconds: from 1 to the take's length (${len.toFixed(2)} s)`, 2);
  }
  const all = approvals();
  const run = path.basename(dir);
  if (all.approved.some((x) => x.move === id && x.coach === coach && x.sha256 === sum)) { say(`Already approved: ${id} ${coach} ${take} of ${run}.`); return all; }
  all.approved.push(Object.assign({ move: id, coach, take, run, sha256: sum, approvedBy: String(by).trim(), date: today(), note: note || '', model: rec.model || null },
    loop ? { end: loop } : {}));
  writeJson(APPROVED(), all);
  say(`Approved ${id} (coach ${coach}, ${take} of ${run}${loop ? ', the loop closing at ' + loop + ' s' : ''}) by ${String(by).trim()}. Commit ${show(APPROVED())}.`);
  say('Next, where the take is on disk: node tools/media/ai/process.mjs --moves ' + id + ' --from ' + show(dir));
  return all;
}

if (isMain(import.meta.url)) {
  main(async () => {
    const a = parseArgs(process.argv.slice(2), ['list', 'help'], ['by', 'from', 'note', 'end']);
    if (a.list) {
      const all = approvals().approved;
      if (!all.length) say('Nothing approved yet.');
      for (const x of all) say(`${x.move.padEnd(22)} ${x.coach}  ${x.take.padEnd(8)} ${x.run.padEnd(26)} ${x.date}  ${x.approvedBy}${x.end ? '  loop to ' + x.end + ' s' : ''}${x.note ? '  (' + x.note + ')' : ''}`);
      return 0;
    }
    if (a.help || a._.length !== 3) { say('node tools/media/ai/approve.mjs <move> <coach> <take> --by <name> [--from <dir>] [--note "..."] [--end <s>]   or   --list'); return a.help ? 0 : 2; }
    approve(a._[0], a._[1], a._[2], a);
    return 0;
  });
}
