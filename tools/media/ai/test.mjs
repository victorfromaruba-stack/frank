// Tests for the AI demo pipeline, with no key, no network and no cost. Everything is written to a temporary folder;
// nothing in the repo changes.
//   1. syntax: every script passes node --check
//   2. moves: js/exercises.js and the shot list name the same 80 moves; every move gets prompts that fit
//   3. dry run: the pilot (requests/examples/pilot-*.json) writes request bodies shaped as the docs say, and its estimate
//   4. money: a request over its budget, or without the key, stops before the first request
//   5. mock: design, pick, start poses, pick and clips against a stand-in of Google's API (mock-server.mjs): a busy
//      answer (429) is tried again; the clip sends the start pose as the first and last frame, checks until it's done,
//      follows the download's redirect without the key and saves the take; a filtered and a failed clip are reported,
//      not saved; --fetch finishes a clip that was left pending
//   6. review: frames, the loop seam, index.html and sheet.png (needs ffmpeg)
//   7. approve and process: an approved take into media/ of a copy of the app (no sound, cropped, a still), the
//      js/media.js line with ai: true, the warning while the app doesn't label AI clips, Frank's own clip left alone
//   8. workflow: .github/workflows/coach-video.yml parses as YAML (python3 with PyYAML) and keeps its rules
//   9. the key: in no file and no line of output
// Run: node tools/media/ai/test.mjs [--keep]   (about a minute; parts 6 and 7 need ffmpeg and say so when it's missing)
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AI, ROOT, checkImageBody, checkVeoBody, exercises, haveFfmpeg, imageCall, move, probe, sha256, shotListProblems, veoCall } from './lib.mjs';
import { clipPrompt, startPrompt, third, noBreath } from './prompts.mjs';
import { aiLabel } from './process.mjs';
import { TEST_KEY, startMock } from './mock-server.mjs';

const KEEP = process.argv.includes('--keep');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-ai-test-'));
let checks = 0, fails = 0;
const outputs = [];
const ok = (cond, msg) => { checks++; if (cond) console.log('  ok    ' + msg); else { fails++; console.log('  FAIL  ' + msg); } };
const part = (s) => console.log('\n' + s);
const skip = (s) => console.log('  SKIP  ' + s);
const exists = (f) => fs.existsSync(f);
const readJ = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// a clean environment for the scripts: none of the caller's key, API address, home or GitHub settings
const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(GEMINI_|FRANK_AI_|GITHUB_|EVENT$|BEFORE$|REQUEST$|DRY_RUN$|MOCK_PORT$)/.test(k)) delete clean[k];
// runs a script as its own process. spawn, not spawnSync: the mock server lives in this process and must answer.
function run(args, env = {}) {
  return new Promise((done) => {
    const p = spawn(process.execPath, args, { cwd: ROOT, env: { ...clean, ...env } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => { outputs.push(out); done({ code, out }); });
  });
}
const S = (f) => path.join(AI, f);
const newHome = (name) => { const h = path.join(tmp, name); fs.mkdirSync(h, { recursive: true }); fs.copyFileSync(S('coaches.json'), path.join(h, 'coaches.json')); return h; };

part('1. syntax');
for (const f of fs.readdirSync(AI).filter((f) => f.endsWith('.mjs'))) {
  const r = spawnSync(process.execPath, ['--check', S(f)], { encoding: 'utf8' });
  ok(r.status === 0, `node --check ${f}` + (r.status ? ': ' + r.stderr.split('\n')[0] : ''));
}

part('2. moves and prompts');
ok(shotListProblems().length === 0, 'js/exercises.js and the shot list in docs/FILMING-GUIDE.md name the same moves ' + JSON.stringify(shotListProblems()));
const ids = Object.keys(exercises());
ok(ids.length === 80, `80 moves (${ids.length})`);
let long = [], missingCue = [];
for (const id of ids) {
  const m = move(id);
  for (const c of ['f', 'm']) {
    const sp = startPrompt(c, m), cp = clipPrompt(c, m);
    if (cp.length > 3800 || sp.length > 6000) long.push(id);
    if (!noBreath(m.cues).every((q) => cp.includes(third(q))) || /\bbreath/i.test(cp.replace('"' + m.name + '"', ''))) missingCue.push(id);
  }
}
ok(!long.length, 'every clip prompt fits Veo\'s 1,024 tokens ' + long.join(' '));
ok(!missingCue.length, 'every clip prompt carries all the move\'s cues but the ones about breathing, and no word of breathing but a move\'s name (Veo\'s audio filter) ' + missingCue.join(' '));
ok(/returns exactly to the start position/.test(clipPrompt('f', move('squat'))) && /holds this position steady/.test(clipPrompt('f', move('plank'))), 'reps return to the start; holds hold steady');
ok(move('plank').wide && move('push-up').wide && move('table-row').wide && move('side-plank').wide && !move('squat').wide && !move('wall-sit').wide && !move('deep-squat-hold').wide,
  'process.sh --wide for moves on the floor or on the hands, not for standing ones');
ok(move('split-squat').oneSide && /right side/.test(startPrompt('f', move('split-squat'))), 'one-sided moves show the right side');
// the bodies with real picture data match the docs (the dry run writes them with the data left out)
const jpg = { mime: 'image/jpeg', b64: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', label: 'test.jpg' };
const vb = veoCall({ model: 'veo-3.1-fast-generate-preview', prompt: clipPrompt('f', move('squat')), image: jpg, lastFrame: jpg });
ok(checkVeoBody(vb.body, 'veo-3.1-fast-generate-preview').length === 0, 'a Veo body with real data matches the docs ' + checkVeoBody(vb.body, 'veo-3.1-fast-generate-preview').join('; '));
ok(checkVeoBody({ ...vb.body, parameters: { ...vb.body.parameters, durationSeconds: 5, seed: 1 } }, 'veo-3.1-fast-generate-preview').length === 2, 'the checker catches a wrong duration and a parameter the Gemini API lacks');
ok(checkVeoBody(veoCall({ model: 'veo-3.1-fast-generate-preview', prompt: 'x', image: jpg, lastFrame: jpg, resolution: '1080p', durationSeconds: 6 }).body, 'veo-3.1-fast-generate-preview').some((p) => /must be 8/.test(p)), 'the checker knows 1080p needs 8 s');
for (const api of ['interactions', 'generate-content']) {
  const ib = imageCall({ api, model: 'gemini-3.1-flash-image', prompt: 'x', images: [jpg, jpg, jpg], aspectRatio: '16:9', imageSize: '1K' });
  ok(checkImageBody(ib.body, api, 'gemini-3.1-flash-image').length === 0, `an image body (${api}) with three references matches the docs`);
}
ok(checkImageBody(imageCall({ model: 'gemini-3.1-flash-image', prompt: 'x', images: [jpg, jpg, jpg, jpg, jpg], aspectRatio: '16:9', imageSize: '1K' }).body, 'interactions', 'gemini-3.1-flash-image').length === 1,
  'the checker stops a fifth photo of the coach (3.1 Flash Image keeps four people photos consistent)');

part('3. dry run of the pilot');
{
  const home = newHome('dry-home'), out = path.join(tmp, 'dry');
  const pilot = ['pilot-1-coaches', 'pilot-2-start-poses', 'pilot-3-clips'].map((n) => S('requests/examples/' + n + '.json'));
  const r = await run([S('batch.mjs'), ...pilot, '--dry-run', '--out', out], { FRANK_AI_HOME: home });
  ok(r.code === 0, 'batch.mjs --dry-run on the three pilot requests exits 0' + (r.code ? '\n' + r.out.slice(-600) : ''));
  ok(/pilot-1-coaches: design, about \$0\.92/.test(r.out) && /pilot-2-start-poses: keyframe, about \$0\.92/.test(r.out) && /pilot-3-clips: clip \+ review, about \$4\.80/.test(r.out),
    'estimates: $0.92 for the looks, $0.92 for the start poses, $4.80 for the clips');
  ok(/Together about \$6\.65 in real runs/.test(r.out), 'the pilot together: about $6.65 (12 x $0.077 twice, plus $4.80), each part within its $5 budget');
  const calls = fs.readdirSync(out).flatMap((d) => (exists(path.join(out, d, 'calls')) ? fs.readdirSync(path.join(out, d, 'calls')).map((f) => path.join(out, d, 'calls', f)) : []));
  const of = (re) => calls.filter((f) => re.test(path.basename(f))).map((f) => ({ f, ...readJ(f) }));
  const looks = of(/^design-/), starts = of(/^start-/), clips = of(/^clip-/);
  ok(looks.length === 12 && starts.length === 12 && clips.length === 6, `30 request files: 12 looks, 12 start poses, 6 clips (${looks.length}, ${starts.length}, ${clips.length})`);
  ok([...looks, ...starts, ...clips].every((c) => c.method === 'POST' && c.headers['x-goog-api-key'] === '<GEMINI_API_KEY, not written>'), 'every request is a POST with the key header left out of the file');
  ok([...looks, ...starts].every((c) => c.url === 'https://generativelanguage.googleapis.com/v1beta/interactions'), 'pictures: POST /v1beta/interactions');
  ok(clips.every((c) => c.url === 'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning'), 'clips: POST /v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning');
  const fmt = (c) => JSON.stringify(c.body.response_format);
  ok(looks.every((c) => fmt(c) === '{"type":"image","mime_type":"image/jpeg","aspect_ratio":"3:4","image_size":"1K"}' && c.body.store === false && c.body.model === 'gemini-3.1-flash-image'),
    'looks: gemini-3.1-flash-image, response_format image 3:4 1K, store false');
  const pics = (c) => c.body.input.filter((x) => x.type === 'image').length;
  ok(looks.filter((c) => /front/.test(c.f)).every((c) => pics(c) === 0) && looks.filter((c) => /side/.test(c.f)).every((c) => pics(c) === 1) && looks.filter((c) => /-45/.test(c.f)).every((c) => pics(c) === 2),
    'a look: the front from words, the side from the front, 45 degrees from both');
  ok(starts.every((c) => pics(c) === 3 && /"aspect_ratio":"16:9"/.test(fmt(c)) && c.body.input[0].type === 'text'), 'start poses: the prompt, then the coach\'s 3 reference photos, 16:9');
  ok(starts.every((c) => c.body.input.filter((x) => x.type === 'image').every((x) => /^<base64 of tools\/media\/ai\/coaches\/[fm]\/(front|side|45)\.jpg/.test(x.data))),
    'start poses name the picked photos they send (stand-ins in a dry run before the pick)');
  ok(clips.every((c) => {
    const i = c.body.instances[0], p = c.body.parameters;
    return c.body.instances.length === 1 && typeof i.prompt === 'string' && /^image\/(jpeg|png)$/.test(i.image.mimeType) && /^<base64 of /.test(i.image.bytesBase64Encoded) && !i.image.inlineData && JSON.stringify(i.image) === JSON.stringify(i.lastFrame) &&
      JSON.stringify(p) === '{"aspectRatio":"16:9","resolution":"720p","durationSeconds":8,"personGeneration":"allow_adult"}' && !i.referenceImages;
  }), 'clips: image = lastFrame (the same start pose, as bytesBase64Encoded), 16:9, 720p, 8 s, allow_adult');
  const big = calls.filter((f) => /[A-Za-z0-9+/]{400,}/.test(fs.readFileSync(f, 'utf8')));
  ok(!big.length, 'the written bodies carry notes, not base64, so they stay readable');
  fs.writeFileSync(path.join(tmp, 'pilot-dry-run.txt'), r.out);
}

part('4. money: the budget and the key');
const mock = await startMock({
  clip: (prompt) => (/"Push-up"/.test(prompt) ? 'filtered' : /"Forearm plank"/.test(prompt) ? 'error' : 'ok'), busyOnce: true
});
{
  const home = newHome('money-home');
  const req = path.join(tmp, 'too-much.json');
  fs.writeFileSync(req, JSON.stringify({ about: 'test', steps: ['clip'], coaches: ['f', 'm'], moves: 'first-20', budget: 5 }));
  const env = { FRANK_AI_HOME: home, GEMINI_API_BASE: mock.base, GEMINI_API_KEY: TEST_KEY };
  const r = await run([S('batch.mjs'), req, '--out', path.join(tmp, 'money')], env);
  ok(r.code === 1 && /costs about \$32\.00, over its \$5\.00 budget/.test(r.out), '40 clips ($32.00) against a $5 budget: stopped' + (r.code !== 1 ? ' ' + r.out.slice(-300) : ''));
  ok(mock.log.length === 0, 'and nothing reached the API');
  const r2 = await run([S('batch.mjs'), req, '--budget', '32', '--check'], env);
  ok(r2.code === 0 && /Checked: nothing sent/.test(r2.out) && mock.log.length === 0, 'raised on purpose (--budget 32) it passes the check, and --check sends nothing');
  const r3 = await run([S('clip.mjs'), '--moves', 'squat', '--coaches', 'f', '--out', path.join(tmp, 'money')], { FRANK_AI_HOME: home, GEMINI_API_BASE: mock.base });
  ok(r3.code === 1 && /GEMINI_API_KEY is not set/.test(r3.out) && mock.log.length === 0, 'without the key a paid step stops before sending');
  const r4 = await run([S('clip.mjs'), '--moves', 'squat,push-up,plank,march,cobra,crunch,superman', '--coaches', 'f', '--out', path.join(tmp, 'money')], env);
  ok(r4.code === 1 && /Over budget: this costs about \$5\.60/.test(r4.out) && mock.log.length === 0, 'a single step over the default $5 budget (7 clips, $5.60) stops too');
}

part('5. the clip flow against the mock API');
const home = newHome('mock-home'), runs = path.join(home, 'out');
const env = { FRANK_AI_HOME: home, GEMINI_API_BASE: mock.base, GEMINI_API_KEY: TEST_KEY, FRANK_AI_WAIT_SCALE: '0.01' };
{
  const r = await run([S('design.mjs'), '--coaches', 'f', '--looks', '1', '--run', 'mock1'], env);
  ok(r.code === 0 && ['front', 'side', '45'].every((v) => exists(path.join(runs, 'mock1/coaches/f/look-1', v + '.jpg'))), 'design: a look of three photos' + (r.code ? ' ' + r.out.slice(-400) : ''));
  ok(mock.log.some((e) => e.answer === 429) && /Trying again/.test(r.out), 'a busy API (429) is tried again after its Retry-After');
  const ins = mock.log.filter((e) => e.path === '/v1beta/interactions' && e.answer !== 429);
  ok(ins.length === 3 && ins.map((e) => e.images).join() === '0,1,2' && ins.every((e) => !e.problems.length), 'the look\'s requests carry 0, 1 and 2 reference photos and match the docs');
  const p1 = await run([S('pick.mjs'), 'look', 'f', '1', '--by', 'Tester'], env);
  ok(p1.code === 0 && ['front', 'side', '45'].every((v) => exists(path.join(home, 'coaches/f', v + '.jpg'))) && readJ(path.join(home, 'coaches/f/look.json')).by === 'Tester', 'pick look: the photos and look.json in coaches/f/');
  const k = await run([S('keyframe.mjs'), '--moves', 'squat,push-up,plank', '--coaches', 'f', '--candidates', '1', '--run', 'mock1'], env);
  ok(k.code === 0 && mock.log.filter((e) => e.path === '/v1beta/interactions').slice(-3).every((e) => e.images === 3), 'start poses: three requests, each with the coach\'s 3 photos');
  for (const id of ['squat', 'push-up', 'plank']) await run([S('pick.mjs'), 'start', id, 'f', '1'], env);
  ok(['squat', 'push-up', 'plank'].every((id) => exists(path.join(home, 'keyframes/f', id + '.jpg'))), 'pick start: keyframes/f/<move>.jpg');
  const before = mock.log.length;
  const c = await run([S('clip.mjs'), '--moves', 'squat,push-up,plank', '--coaches', 'f', '--run', 'mock1', '--poll-seconds', '1'], env);
  const log = mock.log.slice(before);
  const takes = path.join(runs, 'mock1/takes/f');
  const squat = path.join(takes, 'squat/take-1.mp4');
  ok(exists(squat) && Buffer.compare(fs.readFileSync(squat), mock.video) === 0, 'the squat take is saved, byte for byte what the API served');
  const rec = readJ(path.join(takes, 'squat/take-1.json'));
  ok(rec.status === 'done' && rec.polls === 3 && rec.sha256 === sha256(squat) && /operations\/mock/.test(rec.operation), 'its record: done after 3 checks (the mock says "not done" twice), the operation, the sha256');
  const posts = log.filter((e) => /:predictLongRunning$/.test(e.path));
  ok(posts.length === 3 && posts.every((e) => e.loop && !e.problems.length), 'every clip request sends the start pose as first and last frame, as the docs shape it');
  ok(log.filter((e) => /\/operations\//.test(e.path)).length >= 9, 'the operations are polled with GET until done');
  ok(log.filter((e) => e.host === 'api').every((e) => e.key === 'ok'), 'every API request carries the key in x-goog-api-key');
  ok(log.some((e) => e.host === 'storage') && log.filter((e) => e.host === 'storage').every((e) => e.key === 'none'), 'the download follows the redirect to the storage host without the key');
  ok(readJ(path.join(takes, 'push-up/take-1.json')).status === 'filtered' && !exists(path.join(takes, 'push-up/take-1.mp4')) && /blocked by a safety filter/.test(c.out), 'a filtered clip: reported, nothing saved');
  ok(readJ(path.join(takes, 'plank/take-1.json')).status === 'failed' && !exists(path.join(takes, 'plank/take-1.mp4')) && c.code === 1, 'a failed clip: reported, nothing saved, exit 1');
  ok(readJ(path.join(runs, 'mock1/run.json')).spent > 0, 'run.json keeps the estimated spend');
  // a clip left pending (a run cut short): --fetch finishes it
  const sent = await fetch(mock.base + '/models/veo-3.1-fast-generate-preview:predictLongRunning', {
    method: 'POST', headers: { 'x-goog-api-key': TEST_KEY, 'content-type': 'application/json' }, body: JSON.stringify(vb.body)
  }).then((x) => x.json());
  fs.writeFileSync(path.join(takes, 'squat/take-9.json'), JSON.stringify({ status: 'pending', operation: sent.name, move: 'squat', coach: 'f' }));
  const fe = await run([S('clip.mjs'), '--fetch', '--from', path.join(runs, 'mock1'), '--poll-seconds', '1'], env);
  ok(fe.code === 0 && exists(path.join(takes, 'squat/take-9.mp4')) && readJ(path.join(takes, 'squat/take-9.json')).status === 'done', 'clip.mjs --fetch finishes a pending clip');
  fs.rmSync(path.join(takes, 'squat/take-9.mp4')); fs.rmSync(path.join(takes, 'squat/take-9.json'));
}

const R = path.join(tmp, 'app');            // a copy of the parts of the app process.sh and process.mjs use
if (!haveFfmpeg()) {
  part('6. review'); skip('ffmpeg is not installed (brew install ffmpeg, or sudo apt-get install ffmpeg): no frames, sheet or processing tested');
  part('7. approve and process'); skip('ffmpeg is not installed');
} else {
  part('6. review');
  const rv = await run([S('review.mjs'), '--from', path.join(runs, 'mock1')], env);
  const html = path.join(runs, 'mock1/review/index.html'), png = path.join(runs, 'mock1/review/sheet.png');
  ok(rv.code === 0 && exists(html) && exists(png), 'review: index.html and sheet.png' + (rv.code ? ' ' + rv.out.slice(-400) : ''));
  const page = exists(html) ? fs.readFileSync(html, 'utf8') : '';
  ok(page.includes('Sit between your heels.') && page.includes('approve.mjs squat f take-1') && /No video: filtered/.test(page) && /SSIM 0\.\d{3}/.test(page),
    'the page: the cues, the approve line, the filtered take, the measured loop seam');
  ok(['start', 'middle', 'end', 'pose'].every((f) => exists(path.join(runs, 'mock1/review/frames/f-squat-take-1-' + f + '.jpg'))), 'frames: start, middle, end and the picked start pose');
  const head = exists(png) ? fs.readFileSync(png) : Buffer.alloc(24);
  ok(head.toString('latin1', 1, 4) === 'PNG' && head.readUInt32BE(16) === 3 * 384 + 640 && head.readUInt32BE(20) === 48 + 224, 'sheet.png: one row of frames and cues under a title');

  part('7. approve and process');
  const ap = await run([S('approve.mjs'), 'squat', 'f', 'take-1', '--by', 'Tester', '--from', path.join(runs, 'mock1')], env);
  const all = readJ(path.join(home, 'approved.json')).approved;
  ok(ap.code === 0 && all.length === 1 && all[0].sha256 === sha256(path.join(runs, 'mock1/takes/f/squat/take-1.mp4')) && all[0].approvedBy === 'Tester' && all[0].run === 'mock1',
    'approve: approved.json gets the move, coach, take, run, sha256, who and the date');
  ok((await run([S('approve.mjs'), 'squat', 'f', 'take-1', '--from', path.join(runs, 'mock1')], env)).code === 2, 'approve needs --by');
  ok((await run([S('approve.mjs'), 'push-up', 'f', 'take-1', '--by', 'Tester', '--from', path.join(runs, 'mock1')], env)).code === 1, 'a filtered take can\'t be approved');
  fs.mkdirSync(path.join(R, 'tools/media'), { recursive: true }); fs.mkdirSync(path.join(R, 'js'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'tools/media/process.sh'), path.join(R, 'tools/media/process.sh'));
  for (const f of ['exercises.js', 'media.js']) fs.copyFileSync(path.join(ROOT, 'js', f), path.join(R, 'js', f));
  // an app that tags every clip "Frank" (as js/app.js did before it read ai: true), so the warning shows
  fs.writeFileSync(path.join(R, 'js', 'app.js'), `  html += '<div class="tags-on">' + (m && m.video ? '<span class="tag">Frank</span>' : '') + '</div>';\n`);
  const pr = await run([S('process.mjs'), '--root', R, '--from', path.join(runs, 'mock1')], env);
  const v = path.join(R, 'media/squat.mp4');
  const info = exists(v) ? probe(v) : {};
  ok(pr.code === 0 && exists(v) && exists(path.join(R, 'media/squat.jpg')), 'process: media/squat.mp4 and media/squat.jpg' + (pr.code ? ' ' + pr.out.slice(-500) : ''));
  ok(info.vcodec === 'h264' && !info.audio && info.width === 960 && info.height === 720 && info.duration < 8, 'H.264, no sound, 4:3 for a standing move (960 x 720), the last frame cut');
  ok(pr.out.includes("    'squat': { video: 'media/squat.mp4', poster: 'media/squat.jpg', ai: true },"), 'the js/media.js line, with ai: true');
  ok(/DON'T ADD THESE LINES YET/.test(pr.out) && /js\/app\.js:\d+ tags every clip "Frank"/.test(pr.out), 'it warns while the app shows every clip as Frank\'s');
  // a move on the floor keeps the whole frame
  const fake = path.join(tmp, 'runs/fake1'), t = path.join(fake, 'takes/m/push-up');
  fs.mkdirSync(t, { recursive: true });
  fs.writeFileSync(path.join(fake, 'run.json'), JSON.stringify({ id: 'fake1', started: new Date().toISOString() }));
  fs.copyFileSync(path.join(runs, 'mock1/takes/f/squat/take-1.mp4'), path.join(t, 'take-1.mp4'));
  fs.writeFileSync(path.join(t, 'take-1.json'), JSON.stringify({ status: 'done', sha256: sha256(path.join(t, 'take-1.mp4')) }));
  await run([S('approve.mjs'), 'push-up', 'm', 'take-1', '--by', 'Tester', '--from', fake], env);
  const pw = await run([S('process.mjs'), '--moves', 'push-up', '--root', R, '--from', path.join(tmp, 'runs')], env);
  ok(pw.code === 0 && exists(path.join(R, 'media/push-up.mp4')) && probe(path.join(R, 'media/push-up.mp4')).width === 1280, 'a move on the floor keeps the whole 16:9 frame (process.sh --wide)');
  // --end: a take whose last moments jump loops at an earlier frame that matches its first
  const pl = path.join(fake, 'takes/f/plank'), len = probe(path.join(t, 'take-1.mp4')).duration;
  fs.mkdirSync(pl, { recursive: true });
  fs.copyFileSync(path.join(t, 'take-1.mp4'), path.join(pl, 'take-1.mp4'));
  fs.writeFileSync(path.join(pl, 'take-1.json'), '{"status":"done"}');
  ok((await run([S('approve.mjs'), 'plank', 'f', 'take-1', '--by', 'Tester', '--from', fake, '--end', String(len + 1)], env)).code === 2, 'approve --end past the take\'s end is refused');
  const cut = +(len / 2).toFixed(3);
  const ae = await run([S('approve.mjs'), 'plank', 'f', 'take-1', '--by', 'Tester', '--from', fake, '--end', String(cut)], env);
  const pe = await run([S('process.mjs'), '--moves', 'plank', '--root', R, '--from', fake], env);
  const pd = exists(path.join(R, 'media/plank.mp4')) ? probe(path.join(R, 'media/plank.mp4')).duration : 0;
  ok(ae.code === 0 && readJ(path.join(home, 'approved.json')).approved.some((x) => x.move === 'plank' && x.end === cut) && pe.code === 0 && Math.abs(pd - cut) < 0.1,
    `approve --end ${cut}: approved.json keeps it, and process cuts the clip just before that frame (${pd.toFixed(2)} s of ${len.toFixed(2)})`);
  // one clip per move: both coaches approved for one move needs --coach
  fs.copyFileSync(path.join(t, 'take-1.mp4'), path.join(fake, 'squat-m.mp4'));
  fs.mkdirSync(path.join(fake, 'takes/m/squat'), { recursive: true });
  fs.renameSync(path.join(fake, 'squat-m.mp4'), path.join(fake, 'takes/m/squat/take-1.mp4'));
  fs.writeFileSync(path.join(fake, 'takes/m/squat/take-1.json'), '{"status":"done"}');
  await run([S('approve.mjs'), 'squat', 'm', 'take-1', '--by', 'Tester', '--from', fake], env);
  const two = await run([S('process.mjs'), '--moves', 'squat', '--root', R, '--from', tmp], env);
  ok(two.code === 1 && /approved for coaches f and m.*--coach/.test(two.out), 'a move approved for both coaches needs --coach (the app plays one clip)');
  ok((await run([S('process.mjs'), '--moves', 'squat', '--coach', 'm', '--root', R, '--from', tmp], env)).code === 0, '--coach m picks one');
  // a changed file is refused
  fs.appendFileSync(path.join(fake, 'takes/m/squat/take-1.mp4'), 'x');
  const changed = await run([S('process.mjs'), '--moves', 'squat', '--coach', 'm', '--root', R, '--from', tmp], env);
  ok(changed.code === 1 && /isn't on this machine \(or changed\)/.test(changed.out), 'a take that changed after its approval is refused');
  // the app reads ai: true: no warning; Frank's own clip in js/media.js: left alone
  fs.writeFileSync(path.join(R, 'js/label.js'), "function tag(m) { return m.ai ? 'AI demo' : 'Frank'; }\n");
  const labelled = await run([S('process.mjs'), '--moves', 'push-up', '--root', R, '--from', tmp], env);
  ok(labelled.code === 0 && !/DON'T ADD/.test(labelled.out) && /bump VERSION in sw\.js/.test(labelled.out), 'once the app reads ai: true, no warning, and it says to bump VERSION');
  fs.writeFileSync(path.join(R, 'js/media.js'), fs.readFileSync(path.join(R, 'js/media.js'), 'utf8').replace('W.WBF.MEDIA = {', "W.WBF.MEDIA = {\n    'push-up': { video: 'media/push-up.mp4', poster: 'media/push-up.jpg' },"));
  const franks = await run([S('process.mjs'), '--moves', 'push-up', '--root', R, '--from', tmp], env);
  ok(franks.code === 1 && /Frank's own clip is in js\/media\.js/.test(franks.out), 'Frank\'s own clip (no ai: true) is never replaced');
  ok(aiLabel(ROOT).reads, 'the app in this repo reads ai: true (js/app.js tags an AI clip AI demo), so its lines go in without a warning');
}

part('8. the workflow');
{
  const wf = path.join(ROOT, '.github/workflows/coach-video.yml');
  const src = fs.readFileSync(wf, 'utf8');
  const py = spawnSync('python3', ['-c', 'import json,sys,yaml; d=yaml.safe_load(open(sys.argv[1])); d["on"]=d.pop(True, d.get("on")); print(json.dumps(d))', wf], { encoding: 'utf8' });
  if (py.status !== 0 && /No module named/.test(py.stderr)) skip('python3 with PyYAML is not installed: no YAML parse (pip install pyyaml)');
  else {
    ok(py.status === 0, 'coach-video.yml parses as YAML' + (py.status ? ': ' + py.stderr.trim().split('\n').pop() : ''));
    const d = py.status === 0 ? JSON.parse(py.stdout) : { on: {}, jobs: {} };
    ok(JSON.stringify(d.on.push) === '{"branches":["coach-video"],"paths":["tools/media/ai/requests/*.json"]}', 'push: only the coach-video branch, only request files');
    ok(d.on.workflow_dispatch && d.on.workflow_dispatch.inputs.request.required === true && d.on.workflow_dispatch.inputs.dry_run.type === 'boolean', 'by hand: a request file and a dry-run switch');
    ok(!d.on.pull_request && !d.on.pull_request_target && !d.on.schedule, 'no pull request or schedule triggers');
    ok(JSON.stringify(d.permissions) === '{"contents":"read"}', 'permissions: contents read, nothing else');
    const job = (d.jobs || {}).make || {};
    ok(job.if === "github.ref == 'refs/heads/coach-video'", 'the job runs only on coach-video, also by hand');
    ok((job.steps || []).filter((s) => s.uses).every((s) => /@[0-9a-f]{40}$/.test(s.uses)), 'actions pinned to full commit SHAs');
    ok((job.steps || []).some((s) => s.uses && /upload-artifact/.test(s.uses) && s.with.path === 'tools/media/ai/out/' && s.if === 'always()'), 'the artifact: tools/media/ai/out/, also after a failure');
    const keyLines = src.split('\n').filter((l) => /secrets\./.test(l));
    ok(keyLines.length === 2 && keyLines.every((l) => /^\s+GEMINI_API_KEY: \$\{\{ secrets\.GEMINI_API_KEY \}\}$/.test(l)), 'the secret only as GEMINI_API_KEY in two steps\' env');
    ok(!/echo[^\n]*GEMINI_API_KEY|set -x/.test(src), 'nothing echoes the key');
    ok(job['timeout-minutes'] > 0 && d.concurrency && d.concurrency['cancel-in-progress'] === false, 'a time limit, and one run at a time');
  }
  // the request selection on GitHub, without GitHub
  const g1 = await run([S('batch.mjs'), '--github', '--check'], { EVENT: 'push', BEFORE: 'HEAD', GITHUB_SHA: 'HEAD' });
  ok(g1.code === 0 && /No request files to run/.test(g1.out), 'a push that changed no request file runs nothing');
  const g2 = await run([S('batch.mjs'), '--github', '--check'], { EVENT: 'workflow_dispatch', REQUEST: 'tools/media/ai/requests/examples/pilot-1-coaches.json' });
  ok(g2.code === 2, 'a manual run takes only a file directly in requests/ (examples/ are copies to start from)');
  const g3 = await run([S('batch.mjs'), '--github', '--check'], { EVENT: 'workflow_dispatch', REQUEST: 'tools/media/ai/requests/../../../../etc/passwd.json' });
  ok(g3.code === 2, 'a request path outside requests/ is refused');
  // a push that adds request files, in a throwaway git repo holding copies of the scripts and what they read
  const repo = path.join(tmp, 'repo'), g = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' });
  for (const f of ['docs/FILMING-GUIDE.md', 'js/figure.js', 'js/exercises.js', ...fs.readdirSync(AI).filter((f) => /\.(mjs|json)$/.test(f)).map((f) => 'tools/media/ai/' + f)]) {
    fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(repo, f));
  }
  g('init', '-q', '-b', 'coach-video'); g('config', 'user.email', 'test@example.com'); g('config', 'user.name', 'Test');
  g('add', '-A'); g('commit', '-q', '-m', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  const reqs = path.join(repo, 'tools/media/ai/requests');
  fs.mkdirSync(path.join(reqs, 'examples'), { recursive: true });
  fs.writeFileSync(path.join(reqs, 'pilot.json'), JSON.stringify({ steps: ['clip', 'review'], coaches: ['f'], moves: ['squat'], budget: 5 }));
  fs.writeFileSync(path.join(reqs, 'try.json'), JSON.stringify({ steps: ['design'], coaches: ['m'], looks: 1, dryRun: true }));
  fs.writeFileSync(path.join(reqs, 'examples/ignored.json'), JSON.stringify({ steps: ['design'] }));
  g('add', '-A'); g('commit', '-q', '-m', 'requests');
  const sum = path.join(tmp, 'summary.md'), gout = path.join(tmp, 'output.txt');
  const gh = { EVENT: 'push', BEFORE: base, GITHUB_SHA: g('rev-parse', 'HEAD').stdout.trim(), GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: sum, GITHUB_OUTPUT: gout };
  const nk = await run([path.join(repo, 'tools/media/ai/batch.mjs'), '--github', '--check'], gh);
  ok(nk.code === 1 && /tools\/media\/ai\/requests\/pilot\.json, tools\/media\/ai\/requests\/try\.json/.test(nk.out) && !/ignored/.test(nk.out),
    'a push: the request files it added run, the ones in examples/ don\'t');
  ok(/::error title=Coach video stopped::GEMINI_API_KEY is missing/.test(nk.out), 'without the secret the check step fails at once, with how to add it');
  const wk = await run([path.join(repo, 'tools/media/ai/batch.mjs'), '--github', '--check'], { ...gh, GEMINI_API_KEY: TEST_KEY });
  ok(wk.code === 0 && /pilot: clip \+ review, about \$0\.80/.test(wk.out) && /try: design, about \$0\.23 .*dry run/.test(wk.out), 'with it, the check passes and prints each request\'s estimate');
  ok(/\| pilot \| clip \+ review \| \$0\.80 \| \$5\.00 \|/.test(fs.readFileSync(sum, 'utf8')) && /ffmpeg=true/.test(fs.readFileSync(gout, 'utf8')),
    'the run\'s page gets the estimate table; ffmpeg is asked for (a review)');
  const nb = await run([path.join(repo, 'tools/media/ai/batch.mjs'), '--github', '--check'], { ...gh, BEFORE: '0'.repeat(40), GEMINI_API_KEY: TEST_KEY });
  ok(nb.code === 0 && /requests\/pilot\.json/.test(nb.out), 'a new branch (no before): the files of its last commit');
}

part('9. the key');
mock.close();
const textFiles = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(json|html|txt|js)$/.test(e.name)) textFiles.push(p); } };
walk(tmp);
ok(!textFiles.some((f) => fs.readFileSync(f, 'utf8').includes(TEST_KEY)), `the key is in none of the ${textFiles.length} files the runs wrote`);
ok(!outputs.some((o) => o.includes(TEST_KEY)), `and in none of the ${outputs.length} scripts' output`);

console.log(`\n${checks} checks, ${fails} failed.` + (KEEP ? ' Kept: ' + tmp : ''));
if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
