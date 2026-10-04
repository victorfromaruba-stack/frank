// A stand-in for Google's API on this machine, for the tests (test.mjs): no key, no network, no cost. It answers the
// way the docs say the real API does, and checks every request body with the same rules as the dry run (lib.mjs):
//   POST /v1beta/interactions                            a picture (Gemini's image model, the Interactions API)
//   POST /v1beta/models/<model>:generateContent          a picture (the generateContent way)
//   POST /v1beta/models/<veo model>:predictLongRunning   {"name": "models/<model>/operations/<id>"}
//   GET  /v1beta/models/<model>/operations/<id>          not done for the first checks, then done, with a link
//   GET  /v1beta/files/<id>:download?alt=media           a redirect to a second server, another host, as storage
// It logs every request and whether the key came along: it must on the API, and must not reach the storage host.
//
//   node tools/media/ai/mock-server.mjs [--port 8787]
//   then: GEMINI_API_BASE=http://127.0.0.1:8787/v1beta GEMINI_API_KEY=test-key-not-real node tools/media/ai/...
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { checkImageBody, checkVeoBody, haveFfmpeg, isMain, parseArgs } from './lib.mjs';

export const TEST_KEY = 'test-key-not-real';
// a 1 x 1 grey JPEG, for a machine without ffmpeg
const TINY_JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// Pictures and a video to hand out: made with ffmpeg when it's there (so the review and process steps have real
// frames), small stand-ins when it isn't.
function media(dir) {
  const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'ignore' }).status === 0;
  const out = { images: {}, video: null };
  for (const [ratio, size] of [['16:9', '1376x768'], ['3:4', '768x1024']]) {
    const f = path.join(dir, 'mock-' + ratio.replace(':', 'x') + '.jpg');
    if (haveFfmpeg() && ff(['-f', 'lavfi', '-i', `testsrc2=s=${size}:d=1`, '-frames:v', '1', '-q:v', '4', f])) out.images[ratio] = fs.readFileSync(f).toString('base64');
  }
  const v = path.join(dir, 'mock-take.mp4');
  if (haveFfmpeg() && ff(['-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=24:d=8', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', v])) out.video = fs.readFileSync(v);
  else out.video = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(4000, 7)]);
  return out;
}

// opts.clip(prompt) says what a clip does: 'ok', 'filtered' or 'error'. opts.checks: polls before done.
// opts.image(prompt): 'ok', or 'none' for an answer with words and no picture (a filter); setImage changes it later.
// opts.busyOnce: the first POST gets a 429 with Retry-After, as a busy API would.
export async function startMock({ key = TEST_KEY, checks = 2, clip = () => 'ok', image = () => 'ok', busyOnce = false } = {}) {
  let imageRule = image;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-ai-mock-'));
  const m = media(dir);
  const log = [];
  const ops = new Map();
  let busy = busyOnce, n = 0;
  const json = (res, code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
  const fail = (res, code, status, message) => json(res, code, { error: { code, status, message } });
  const bodyOf = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString())); });

  const storage = http.createServer((req, res) => {
    log.push({ host: 'storage', method: req.method, path: req.url, key: req.headers['x-goog-api-key'] ? 'SENT' : 'none' });
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': m.video.length });
    res.end(m.video);
  });
  const api = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const k = req.headers['x-goog-api-key'];
    const entry = { host: 'api', method: req.method, path: url.pathname, key: k === key ? 'ok' : k ? 'wrong' : 'none' };
    log.push(entry);
    if (k !== key) return fail(res, 400, 'INVALID_ARGUMENT', 'API key not valid. Please pass a valid API key.');
    const raw = req.method === 'POST' ? await bodyOf(req) : '';
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return fail(res, 400, 'INVALID_ARGUMENT', 'Invalid JSON payload received.'); }
    if (req.method === 'POST' && busy) { busy = false; entry.answer = 429; res.setHeader('retry-after', '1'); return fail(res, 429, 'RESOURCE_EXHAUSTED', 'Mock: busy on purpose, try again.'); }

    let mm;
    if (req.method === 'POST' && url.pathname === '/v1beta/interactions') {
      const problems = checkImageBody(body, 'interactions', body.model);
      entry.problems = problems;
      if (problems.length) return fail(res, 400, 'INVALID_ARGUMENT', problems.join('; '));
      const data = m.images[body.response_format.aspect_ratio] || m.images['16:9'] || TINY_JPEG;
      entry.images = body.input.filter((x) => x.type === 'image').length;
      if (imageRule(body.input.filter((x) => x.type === 'text').map((x) => x.text).join(' ')) === 'none') {
        return json(res, 200, { id: 'int_mock_' + ++n, status: 'completed', model: body.model, steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Mock: no picture on purpose.' }] }] });
      }
      return json(res, 200, {
        id: 'int_mock_' + ++n, status: 'completed', model: body.model,
        steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Here is the photo.' }, { type: 'image', mime_type: 'image/jpeg', data }] }]
      });
    }
    if (req.method === 'POST' && (mm = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/))) {
      const problems = checkImageBody(body, 'generate-content', mm[1]);
      entry.problems = problems;
      if (problems.length) return fail(res, 400, 'INVALID_ARGUMENT', problems.join('; '));
      return json(res, 200, { candidates: [{ content: { role: 'model', parts: [{ inlineData: { mimeType: 'image/jpeg', data: m.images['16:9'] || TINY_JPEG } }] }, finishReason: 'STOP' }] });
    }
    if (req.method === 'POST' && (mm = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):predictLongRunning$/))) {
      const problems = checkVeoBody(body, mm[1]);
      entry.problems = problems;
      if (problems.length) return fail(res, 400, 'INVALID_ARGUMENT', problems.join('; '));
      const inst = body.instances[0];
      const pic = (p) => p && (p.inlineData ? p.inlineData.data : p.bytesBase64Encoded);
      entry.loop = !!inst.lastFrame && pic(inst.image) === pic(inst.lastFrame);   // the same frame first and last
      const name = `models/${mm[1]}/operations/mock${++n}`;
      ops.set(name, { left: checks, outcome: clip(inst.prompt), file: 'mockfile' + n });
      return json(res, 200, { name });
    }
    if (req.method === 'GET' && (mm = url.pathname.match(/^\/v1beta\/(models\/[\w.-]+\/operations\/\w+)$/))) {
      const op = ops.get(mm[1]);
      if (!op) return fail(res, 404, 'NOT_FOUND', 'Mock: no such operation.');
      if (op.left-- > 0) return json(res, 200, { name: mm[1] });            // the real API leaves "done" out until it's true
      const type = 'type.googleapis.com/google.ai.generativelanguage.v1beta.PredictLongRunningResponse';
      if (op.outcome === 'error') return json(res, 200, { name: mm[1], done: true, error: { code: 13, message: 'Mock: failed on purpose.' } });
      if (op.outcome === 'filtered') {
        return json(res, 200, { name: mm[1], done: true, response: { '@type': type, generateVideoResponse: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ['Mock: filtered on purpose.'] } } });
      }
      const uri = `http://127.0.0.1:${api.address().port}/v1beta/files/${op.file}:download?alt=media`;
      return json(res, 200, { name: mm[1], done: true, response: { '@type': type, generateVideoResponse: { generatedSamples: [{ video: { uri } }] } } });
    }
    if (req.method === 'GET' && (mm = url.pathname.match(/^\/v1beta\/files\/(\w+):download$/))) {
      res.writeHead(302, { location: `http://127.0.0.1:${storage.address().port}/blobs/${mm[1]}.mp4?signature=mock` });
      return res.end();
    }
    return fail(res, 404, 'NOT_FOUND', 'Mock: nothing at ' + req.method + ' ' + url.pathname);
  });
  await new Promise((ok) => storage.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => api.listen(Number(process.env.MOCK_PORT) || 0, '127.0.0.1', ok));
  return {
    base: `http://127.0.0.1:${api.address().port}/v1beta`, key, log, video: m.video, realMedia: !!m.images['16:9'], setImage: (f) => { imageRule = f; },
    close: () => { api.close(); storage.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  };
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), [], ['port']);
  if (a.port) process.env.MOCK_PORT = a.port;
  const s = await startMock();
  console.log(`Mock API at ${s.base} (key: ${s.key}). Ctrl-C stops it.`);
  console.log(`GEMINI_API_BASE=${s.base} GEMINI_API_KEY=${s.key} node tools/media/ai/clip.mjs --moves squat --coaches f`);
}
