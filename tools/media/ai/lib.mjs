// Shared parts of the AI demo pipeline in tools/media/ai/: the moves and the shot list, the coaches, prices and the
// budget, the two Google APIs (Gemini's image model and Veo), and small file and ffmpeg helpers.
// What the pipeline is for and how to run it: .claude/skills/frank-coach-video/SKILL.md
//
// The API key is read from GEMINI_API_KEY only when a paid call goes out. It is sent only in the x-goog-api-key header,
// only to the API's own host (never to a host a download redirects to), and shown as *** in anything printed. It never
// goes in a file, a log line, a URL or a commit.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const AI = path.dirname(fileURLToPath(import.meta.url));          // tools/media/ai
export const ROOT = path.resolve(AI, '..', '..', '..');                   // the repo
// Where the picks, the approvals and the runs live: this folder. The tests point FRANK_AI_HOME at a temporary
// folder, so a test never writes into the repo.
export const HOME = process.env.FRANK_AI_HOME ? path.resolve(process.env.FRANK_AI_HOME) : AI;
export const OUT = path.join(HOME, 'out');                                // the runs; git ignores it (.gitignore here)

// ---- printing, stopping -----------------------------------------------------------------------------------------

// A stop with a message for the person: printed without a stack, exit code 1 (or the one given).
export class Stop extends Error {
  constructor(msg, code = 1) { super(msg); this.code = code; }
}
export const say = (...a) => console.log(redact(a.join(' ')));
export const warn = (...a) => console.error(redact(a.join(' ')));
// a path for messages: relative to the repo when it's inside it
export const show = (f) => { const r = path.relative(ROOT, f); return r && !r.startsWith('..') && !path.isAbsolute(r) ? r : f; };
export const usd = (x) => '$' + (Math.round(x * 100) / 100).toFixed(2);
export const today = () => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-'); };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms * WAIT_SCALE));
// the tests shorten every wait (polling, retries) with FRANK_AI_WAIT_SCALE=0.01
const WAIT = Number(process.env.FRANK_AI_WAIT_SCALE);
const WAIT_SCALE = process.env.FRANK_AI_WAIT_SCALE !== undefined && Number.isFinite(WAIT) && WAIT >= 0 ? WAIT : 1;

// Runs a script's main function: a Stop prints its message, anything else its stack. Both set the exit code.
export async function main(fn) {
  try {
    process.exitCode = (await fn()) || 0;
  } catch (e) {
    if (e instanceof Stop) { warn(e.message); process.exitCode = e.code; } else { warn((e && e.stack) || String(e)); process.exitCode = 1; }
  }
}
export const isMain = (url) => !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(url);

// node x.mjs word --flag --key value --key=value. Names in `bools` take no value. Keys come back camelCased.
export function parseArgs(argv, bools = [], known = null) {
  const o = { _: [] };
  const camel = (k) => k.replace(/-([a-z0-9])/g, (m, c) => c.toUpperCase());
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const eq = a.indexOf('=');
    const k = eq > 0 ? a.slice(2, eq) : a.slice(2);
    if (known && !known.includes(k) && !bools.includes(k)) throw new Stop('Unknown option --' + k + ' (try --help)', 2);
    if (bools.includes(k)) { o[camel(k)] = eq > 0 ? !/^(0|false|no)$/i.test(a.slice(eq + 1)) : true; continue; }
    const v = eq > 0 ? a.slice(eq + 1) : argv[++i];
    if (v === undefined || v.startsWith('--')) throw new Stop('--' + k + ' needs a value', 2);
    o[camel(k)] = v;
  }
  return o;
}
export const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean);
export function count(v, name, dflt, max) {
  if (v === undefined || v === null || v === '') return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Stop(`${name} is a whole number from 1 to ${max}, not "${v}"`, 2);
  return n;
}
// What a run uses unless told otherwise (an option on the command line, or a field in a request file).
export const DEFAULTS = {
  imageModel: 'gemini-3.1-flash-image', imageSize: '1K', imageApi: 'interactions',
  videoModel: 'veo-3.1-fast-generate-preview', resolution: '720p', seconds: 8, veoImageForm: 'bytesBase64Encoded',
  looks: 2, candidates: 2, takes: 1, parallel: 3
};
// The budget in USD for one run. 5 unless raised on purpose (--budget, or "budget" in a request file).
export const DEFAULT_BUDGET = 5;
export function budget(v) {
  if (v === undefined || v === null || v === '') return DEFAULT_BUDGET;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Stop(`The budget is a number of US dollars, like 5 or 12.50, not "${v}"`, 2);
  return n;
}

// ---- files --------------------------------------------------------------------------------------------------------

export const read = (f) => fs.readFileSync(f, 'utf8');
export function readJson(f, fallback) {
  if (!fs.existsSync(f)) { if (fallback !== undefined) return fallback; throw new Stop('Missing file: ' + show(f)); }
  try { return JSON.parse(read(f)); } catch (e) { throw new Stop(show(f) + ' is not valid JSON: ' + e.message); }
}
export function writeJson(f, v) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
}
export const sha256 = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

// What a file holds, from its first bytes (an image's name can lie; the API's mime type can be missing).
export function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp') return 'video/mp4';
  return null;
}
export const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'video/mp4': '.mp4' };
// base + whichever image extension exists (a picked file can be a .jpg, .png or .webp)
export function findImage(base) {
  for (const e of ['.jpg', '.jpeg', '.png', '.webp']) if (fs.existsSync(base + e)) return base + e;
  return null;
}
// An image to send: its type from its bytes, its base64, and a label for dry runs and messages.
export function imageInput(file, label) {
  const buf = fs.readFileSync(file);
  const mime = sniff(buf);
  if (!mime || !mime.startsWith('image/')) throw new Stop(show(file) + ' is not a PNG, JPEG or WebP image');
  return { file, mime, b64: buf.toString('base64'), bytes: buf.length, label: label || show(file) };
}
// A 1 x 1 PNG that stands in for a picture a dry run doesn't have yet. The label rides along after the image's end
// (decoders ignore it), so two stand-ins never share the same bytes and each keeps its own label in the written body.
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
export function placeholder(label) {
  const buf = Buffer.concat([DOT, Buffer.from(label)]);
  return { file: null, mime: 'image/png', b64: buf.toString('base64'), bytes: buf.length, label, missing: true };
}

// ---- the moves: js/exercises.js and the shot list -------------------------------------------------------------------

let EX = null;
// The 80 moves, loaded from js/exercises.js the way the app loads them (js/figure.js first), in a sandbox.
export function exercises() {
  if (EX) return EX;
  const ctx = { document: { addEventListener() {}, hidden: true } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/figure.js', 'js/exercises.js']) vm.runInContext(read(path.join(ROOT, f)), ctx, { filename: f });
  return (EX = ctx.WBF.EX);
}

let SHOTS = null;
// The shot list in docs/FILMING-GUIDE.md: per move its set-up, camera (45°, Side, Front) and clip (3–4 reps, hold,
// 8–10 s, walking; right side only). Frank films from the same list, so his clip and the AI clip of a move match.
export function shotList() {
  if (SHOTS) return SHOTS;
  const md = read(path.join(ROOT, 'docs/FILMING-GUIDE.md'));
  const part = md.split(/^## The shot list/m)[1];
  if (!part) throw new Stop('docs/FILMING-GUIDE.md has no "## The shot list" section');
  const out = {};
  let batch = 0;
  for (const line of part.split(/^## /m)[0].split('\n')) {
    if (/^### /.test(line)) { batch++; continue; }
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    const [, n, name, id, place, camera, clip] = m;
    if (!['45°', 'Side', 'Front'].includes(camera)) throw new Stop(`The shot list gives ${id} the camera "${camera}": use 45°, Side or Front`);
    const parts = clip.split('·').map((s) => s.trim());
    out[id] = {
      n: +n, name, id, place, camera, clip, batch,
      kind: /\bhold\b/.test(clip) ? 'hold' : /\breps\b/.test(clip) ? 'reps' : /walking/.test(clip) ? 'walk' : 'rhythm',
      oneSide: /right side only/.test(clip),
      kitNote: parts.filter((p) => !/right side only/.test(p) && !/^(\d|hold\b)/.test(p)).join(', ')
    };
  }
  return (SHOTS = out);
}
// Moves in the library that the shot list lacks, and the other way round. Both lists must name the same 80 moves.
export function shotListProblems() {
  const ex = Object.keys(exercises()), shots = Object.keys(shotList());
  return [...ex.filter((id) => !shots.includes(id)).map((id) => id + ' is in js/exercises.js but not in the shot list'),
    ...shots.filter((id) => !ex.includes(id)).map((id) => id + ' is in the shot list but not in js/exercises.js')];
}

// One move with everything the prompts and the processing need.
export function move(id) {
  const ex = exercises()[id], shot = shotList()[id];
  if (!ex) throw new Stop(`No move called "${id}" in js/exercises.js (ids are lower case with dashes, like push-up)`);
  if (!shot) throw new Stop(`"${id}" is not in the shot list in docs/FILMING-GUIDE.md`);
  return {
    id, n: shot.n, name: ex.name, setup: ex.setup, steps: ex.steps, cues: ex.cue, mistakes: ex.mistakes,
    type: ex.type, each: !!ex.each, eq: ex.eq || [], pos: ex.pos || null,
    place: shot.place, camera: shot.camera, kind: shot.kind, oneSide: shot.oneSide, kitNote: shot.kitNote, batch: shot.batch,
    // process.sh --wide keeps the whole sideways frame: moves done lying, kneeling or on the hands
    wide: shot.place === 'On the floor' || (shot.camera === 'Side' && ['Chair or step', 'Table'].includes(shot.place))
  };
}
// "squat,push-up", or a batch from the shot list: first-20, next-25, other-35, all
export const GROUPS = { 'first-20': 1, 'next-25': 2, 'other-35': 3 };
export function moveIds(sel) {
  const ids = [];
  for (const s of list(sel)) {
    if (s === 'all') ids.push(...Object.values(shotList()).sort((a, b) => a.n - b.n).map((x) => x.id));
    else if (GROUPS[s]) ids.push(...Object.values(shotList()).filter((x) => x.batch === GROUPS[s]).sort((a, b) => a.n - b.n).map((x) => x.id));
    else { move(s); ids.push(s); }
  }
  if (!ids.length) throw new Stop('No moves given: name them (--moves squat,push-up) or a batch (first-20, next-25, other-35, all)', 2);
  return [...new Set(ids)];
}

// ---- the coaches ------------------------------------------------------------------------------------------------------

// coaches.json: the brief for each made-up coach (who, what they wear) and the studio. Edit the words there, not here.
export function coachBook() {
  const j = readJson(path.join(HOME, 'coaches.json'));
  if (!j.coaches || !Object.keys(j.coaches).length) throw new Stop('coaches.json has no coaches');
  for (const [id, c] of Object.entries(j.coaches)) {
    if (!/^[a-z]$/.test(id)) throw new Stop(`coaches.json: a coach id is one letter, like f or m, not "${id}"`);
    for (const k of ['label', 'person', 'outfit', 'wears']) if (!c[k]) throw new Stop(`coaches.json: coach ${id} has no "${k}"`);
  }
  for (const k of ['studio', 'light']) if (!j[k]) throw new Stop(`coaches.json has no "${k}"`);
  return j;
}
export function coachIds(sel) {
  const book = coachBook();
  const ids = list(sel || Object.keys(book.coaches).join(','));
  for (const id of ids) if (!book.coaches[id]) throw new Stop(`No coach "${id}" in coaches.json (there are: ${Object.keys(book.coaches).join(', ')})`, 2);
  return ids;
}
// The three views of a look: the picked ones are coaches/<coach>/front.jpg, side.jpg and 45.jpg (or .png, .webp)
export const VIEWS = ['front', 'side', '45'];
export const VIEW_NAME = { front: 'from the front', side: 'from the side', 45: 'from 45 degrees' };
export const pickedLook = (coach) => VIEWS.map((v) => ({ view: v, file: findImage(path.join(HOME, 'coaches', coach, v)) }));
export const pickedStart = (coach, id) => findImage(path.join(HOME, 'keyframes', coach, id));

// ---- money ------------------------------------------------------------------------------------------------------------

// Prices in USD from https://ai.google.dev/gemini-api/docs/pricing, read on 3 October 2026. Check them again before a
// big batch: Google changes them. A model or size missing here can't be estimated, so it is never called.
export const PRICES = {
  checked: '2026-10-03',
  video: {                       // per second of video (Veo always makes sound too; it is in the price)
    'veo-3.1-fast-generate-preview': { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
    'veo-3.1-generate-preview': { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
    'veo-3.1-lite-generate-preview': { '720p': 0.05, '1080p': 0.08 }
  },
  image: {                       // per image made, by image size
    'gemini-3.1-flash-image': { 512: 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
    'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 }
  },
  // on top of each image: the prompt, the reference photos and the model's thinking, which is billed (its draft
  // images aren't). An allowance, so the estimate errs high; not a figure from the price list.
  imageExtra: 0.01
};
export function imagePrice(model, size) {
  const p = (PRICES.image[model] || {})[size];
  if (p === undefined) throw new Stop(`No price for ${model} at ${size}: add it to PRICES in tools/media/ai/lib.mjs from the pricing page first`);
  return p + PRICES.imageExtra;
}
export function videoPrice(model, resolution, seconds) {
  const p = (PRICES.video[model] || {})[resolution];
  if (p === undefined) throw new Stop(`No price for ${model} at ${resolution}: add it to PRICES in tools/media/ai/lib.mjs from the pricing page first`);
  return p * seconds;
}

// The money guard. A run counts every call before it goes out and stops before one that would take the total past
// the budget. A call counts at its full estimated price once the API accepted it, also when Google later charges
// nothing (a blocked video), so the count can only come out too high, never too low.
export class Ledger {
  constructor(limit, onChange) { this.limit = limit; this.spent = 0; this.calls = 0; this.onChange = onChange || (() => {}); }
  reserve(cost, what) {
    if (this.spent + cost > this.limit + 1e-9) {
      throw new Stop(`Budget: ${what} would cost about ${usd(cost)}; ${usd(this.spent)} of the ${usd(this.limit)} budget is used. ` +
        'Raise it on purpose (--budget, or "budget" in the request file) to go on.');
    }
    this.spent += cost; this.calls++; this.onChange();
    let open = true;
    return { release: () => { if (open) { open = false; this.spent -= cost; this.calls--; this.onChange(); } } };
  }
}
// Prints the plan and its estimated cost, and says whether it fits the budget.
export function printEstimate(lines, limit, title) {
  const total = lines.reduce((s, l) => s + l.cost, 0);
  say(title || 'Estimated cost');
  for (const l of lines) say('  ' + l.what.padEnd(64) + usd(l.cost).padStart(9));
  say('  ' + 'Total'.padEnd(64) + usd(total).padStart(9) + '   budget ' + usd(limit) + (total > limit + 1e-9 ? '   OVER BUDGET' : '   within budget'));
  say('  Prices of ' + PRICES.checked + ' (tools/media/ai/lib.mjs). Google bills what it bills; this is an estimate that errs high.');
  return total;
}

// ---- the API ------------------------------------------------------------------------------------------------------------

export const API_DEFAULT = 'https://generativelanguage.googleapis.com/v1beta';
const isLocal = (u) => ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
// The API's address. GEMINI_API_BASE moves it, for the local test server only (plain http is refused anywhere else).
export function apiBase() {
  const b = (process.env.GEMINI_API_BASE || API_DEFAULT).replace(/\/+$/, '');
  let u;
  try { u = new URL(b); } catch (e) { throw new Stop('GEMINI_API_BASE is not an address: ' + b); }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal(u))) throw new Stop('GEMINI_API_BASE must use https (plain http only for a test server on this machine)');
  return b;
}
export const KEY_MISSING = 'GEMINI_API_KEY is not set, so nothing was sent. On GitHub: Settings > Secrets and variables > Actions > ' +
  'New repository secret, name GEMINI_API_KEY. On a computer: export GEMINI_API_KEY=... in the shell, never in a file in the repo. ' +
  'To see the requests without a key: --dry-run.';
export const hasKey = () => !!(process.env.GEMINI_API_KEY || '').trim();
function apiKey() {
  const k = (process.env.GEMINI_API_KEY || '').trim();
  if (!k) throw new Stop(KEY_MISSING);
  return k;
}
// Hides the key, and anything shaped like a Google API key, in text about to be printed or saved.
export function redact(s) {
  let t = String(s);
  const k = (process.env.GEMINI_API_KEY || '').trim();
  if (k.length >= 8) t = t.split(k).join('***');
  return t.replace(/AIza[0-9A-Za-z_-]{35}/g, '***');
}

export class ApiError extends Stop {
  // maybeDone: the request may have gone through (a gateway timeout), so its cost stays counted
  constructor(msg, status, maybeDone) { super(msg); this.status = status; this.maybeDone = !!maybeDone; }
}
function apiMessage(status, text) {
  let m = text;
  try { const j = JSON.parse(text); m = (j.error && (j.error.status ? j.error.status + ': ' : '') + j.error.message) || text; } catch (e) { /* not JSON */ }
  return `HTTP ${status}: ${redact(String(m).replace(/\s+/g, ' ').slice(0, 600))}`;
}
// errors from before the request was sent: safe to try again, even for a paid call
const BEFORE_SEND = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|ENETUNREACH|EHOSTUNREACH/;
const netCode = (e) => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && (e.name === 'TimeoutError' ? 'a timeout' : e.message)) || e);
const retryAfter = (res) => { const s = res && Number(res.headers.get('retry-after')); return s > 0 && s < 600 ? s * 1000 : 0; };

// One JSON call to the API, with the key in its header. GETs are tried again on passing trouble. A POST (a paid
// call) only when the API says it did nothing (429, 500, 503) or the connection never opened, so a paid request is
// never sent twice by accident.
export async function apiJson(method, url, body, { tries = 4, timeout = 180000, onRetry } = {}) {
  const base = new URL(apiBase()), u = new URL(url);
  if (u.origin !== base.origin) throw new Stop('Refusing to send the API key to ' + u.origin + ': only to ' + base.origin);
  const key = apiKey();
  for (let i = 1; ; i++) {
    let res = null, err = null;
    try {
      res = await fetch(u, {
        method, redirect: 'error', signal: AbortSignal.timeout(timeout),
        headers: body ? { 'x-goog-api-key': key, 'content-type': 'application/json' } : { 'x-goog-api-key': key },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) { err = e; }
    if (res && res.ok) return res.json();
    const msg = res ? apiMessage(res.status, await res.text().catch(() => '')) : 'no answer (' + netCode(err) + ')';
    const again = method === 'GET' ? (!res || [429, 500, 502, 503, 504].includes(res.status))
      : res ? [429, 500, 503].includes(res.status) : BEFORE_SEND.test(netCode(err));
    if (again && i < tries) {
      const wait = retryAfter(res) || Math.min(60000, 5000 * 2 ** (i - 1));
      if (onRetry) onRetry(msg, wait);
      await sleep(wait);
      continue;
    }
    const maybeDone = method !== 'GET' && (res ? [502, 504].includes(res.status) : !BEFORE_SEND.test(netCode(err)));
    throw new ApiError(msg, res ? res.status : 0, maybeDone);
  }
}

// Saves a finished video. The API's own link gets the key; when it redirects to a storage host, the redirect is
// followed by hand and the key stays behind (fetch on its own would pass it along).
export async function download(uri, dest, { tries = 4 } = {}) {
  const base = new URL(apiBase());
  let u = new URL(uri);
  for (let hop = 0, i = 1; hop < 6;) {
    if (u.protocol !== 'https:' && !isLocal(u)) throw new Stop('Not downloading over plain http: ' + u.origin);
    let res = null, err = null;
    try {
      res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(300000), headers: u.origin === base.origin ? { 'x-goog-api-key': apiKey() } : {} });
    } catch (e) { err = e; }
    if (res && [301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
      u = new URL(res.headers.get('location'), u); hop++; continue;
    }
    if (res && res.ok) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = dest + '.part';
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
      fs.renameSync(tmp, dest);
      return { bytes: fs.statSync(dest).size, hops: hop };
    }
    const msg = res ? apiMessage(res.status, await res.text().catch(() => '')) : 'no answer (' + netCode(err) + ')';
    if ((!res || [429, 500, 502, 503, 504].includes(res.status)) && i++ < tries) { await sleep(retryAfter(res) || 5000 * i); continue; }
    throw new ApiError('Download failed: ' + msg, res ? res.status : 0, false);
  }
  throw new Stop('Download failed: too many redirects');
}

// ---- Gemini's image model ---------------------------------------------------------------------------------------------
// Docs: https://ai.google.dev/gemini-api/docs/image-generation (read 3 October 2026). The page's REST examples use the
// Interactions API: POST /v1beta/interactions with "model", "input" (text and image items) and "response_format"
// ({"type": "image", "aspect_ratio", "image_size"}); the image comes back in steps[] as a "model_output" step whose
// "content" holds {"type": "image", "data", "mime_type"}. generateContent "remains fully supported"
// (docs/interactions): --image-api generate-content switches to it if Interactions ever refuses.

export const IMAGE_APIS = ['interactions', 'generate-content'];
export const ASPECTS = ['1:1', '1:4', '4:1', '1:8', '8:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
export const IMAGE_SIZES = ['512', '1K', '2K', '4K'];
// people photos the model keeps consistent, per model (docs: "Up to 4 images of characters" for 3.1 Flash Image)
const CHARACTER_REFS = { 'gemini-3.1-flash-image': 4, 'gemini-3-pro-image': 5 };

// images: [{ mime, b64, label, note }]. The note ("Reference photo 1: the coach from the front.") goes in front of
// each picture, so the model knows what it shows.
export function imageCall({ api = 'interactions', model, prompt, images = [], aspectRatio, imageSize }) {
  if (api === 'interactions') {
    const input = [{ type: 'text', text: prompt }];
    for (const im of images) { if (im.note) input.push({ type: 'text', text: im.note }); input.push({ type: 'image', mime_type: im.mime, data: im.b64 }); }
    return {
      method: 'POST', url: apiBase() + '/interactions',
      // store: false keeps the request and the picture out of Google's interaction log (kept 55 days otherwise)
      body: { model, input, response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: aspectRatio, image_size: imageSize }, store: false }
    };
  }
  if (api === 'generate-content') {
    const parts = [{ text: prompt }];
    for (const im of images) { if (im.note) parts.push({ text: im.note }); parts.push({ inlineData: { mimeType: im.mime, data: im.b64 } }); }
    return {
      method: 'POST', url: apiBase() + '/models/' + model + ':generateContent',
      body: { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, imageSize } } }
    };
  }
  throw new Stop(`--image-api is ${IMAGE_APIS.join(' or ')}, not "${api}"`, 2);
}

// The picture in an answer, from either API (and the Interactions API's shape before May 2026). Throws with the
// reason when there is none: blocked by a safety filter, failed, or text only.
export function imageFromAnswer(j) {
  const found = [];
  let why = '';
  if (Array.isArray(j.steps)) {                                    // Interactions, since May 2026
    for (const s of j.steps) {
      if (s.type === 'model_output') for (const c of s.content || []) if (c.type === 'image' && c.data) found.push(c);
      if (s.error) why = s.error.message || JSON.stringify(s.error);
    }
    if (j.status && j.status !== 'completed') why = 'status ' + j.status + (why ? ': ' + why : '');
  } else if (Array.isArray(j.outputs)) {                           // Interactions, before May 2026
    for (const c of j.outputs) if (c.type === 'image' && c.data) found.push(c);
  } else if (Array.isArray(j.candidates)) {                        // generateContent
    for (const c of j.candidates) {
      for (const p of (c.content && c.content.parts) || []) {
        const d = p.inlineData || p.inline_data;
        if (d && d.data && !p.thought) found.push({ data: d.data, mime_type: d.mimeType || d.mime_type });
      }
      if (c.finishReason && c.finishReason !== 'STOP') why = 'finishReason ' + c.finishReason;
    }
    if (j.promptFeedback && j.promptFeedback.blockReason) why = 'prompt blocked: ' + j.promptFeedback.blockReason;
  }
  if (Array.isArray(j.errors) && j.errors.length) why = j.errors.map((e) => e.message || JSON.stringify(e)).join('; ');
  const last = found[found.length - 1];                            // the final picture, as the SDK's output_image
  if (!last) throw new ApiError('No image in the answer' + (why ? ' (' + why + ')' : '') + '. A safety filter, or the prompt: see the skill.', 200, false);
  const buf = Buffer.from(last.data, 'base64');
  return { buf, mime: sniff(buf) || last.mime_type || 'image/png' };
}

// ---- Veo ------------------------------------------------------------------------------------------------------------------
// Docs: https://ai.google.dev/gemini-api/docs/veo (read 3 October 2026). POST /v1beta/models/<model>:predictLongRunning
// with {"instances": [{"prompt", "image", "lastFrame", "referenceImages"}], "parameters": {...}} answers
// {"name": "<operation>"}; GET /v1beta/<operation> until "done" is true; the video is at
// response.generateVideoResponse.generatedSamples[0].video.uri, downloaded with the key header.

export const VEO_MODELS = Object.keys(PRICES.video);
export const VEO_IMAGE_FORMS = ['inlineData', 'bytesBase64Encoded'];
// image form: Google's JS SDK (2.27) sends {"bytesBase64Encoded", "mimeType"}, and that's the default. The REST docs
// write {"inlineData": {"mimeType", "data"}}, but on 3 October 2026 the API answered it with a 400 ("`inlineData`
// isn't supported by this model") for veo-3.1-fast-generate-preview. --veo-image-form inlineData still sends it.
export function veoCall({ model, prompt, image, lastFrame, refs = [], aspectRatio = '16:9', resolution = '720p', durationSeconds = 8, form = 'bytesBase64Encoded' }) {
  if (!VEO_IMAGE_FORMS.includes(form)) throw new Stop(`--veo-image-form is ${VEO_IMAGE_FORMS.join(' or ')}`, 2);
  const pic = (im) => (form === 'inlineData' ? { inlineData: { mimeType: im.mime, data: im.b64 } } : { bytesBase64Encoded: im.b64, mimeType: im.mime });
  const inst = { prompt };
  if (image) inst.image = pic(image);
  if (lastFrame) inst.lastFrame = pic(lastFrame);
  if (refs.length) inst.referenceImages = refs.map((r) => ({ image: pic(r), referenceType: 'asset' }));
  return {
    method: 'POST', url: apiBase() + '/models/' + model + ':predictLongRunning',
    // personGeneration: "allow_adult" is the only value for image-to-video and first-and-last frames (and the only one
    // in the EU, UK, Switzerland and MENA). durationSeconds: the docs' table writes "8"; the JS SDK sends the number 8.
    body: { instances: [inst], parameters: { aspectRatio, resolution, durationSeconds, personGeneration: image || refs.length ? 'allow_adult' : 'allow_all' } }
  };
}
export function operationUrl(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(name) || name.includes('..')) throw new Stop('Not an operation name: ' + String(name).slice(0, 80));
  return apiBase() + '/' + name;
}
// What a polled operation says: still running, failed, blocked by a filter, or the video's link (or its bytes).
export function videoFromOperation(op) {
  if (!op || !op.done) return { done: false };
  if (op.error) return { done: true, error: (op.error.code ? op.error.code + ': ' : '') + (op.error.message || JSON.stringify(op.error)) };
  const r = (op.response && (op.response.generateVideoResponse || op.response)) || {};
  const s = (r.generatedSamples || r.generatedVideos || [])[0];
  const v = s && s.video;
  if (v && v.uri) return { done: true, uri: v.uri };
  if (v && (v.encodedVideo || v.videoBytes)) return { done: true, bytes: Buffer.from(v.encodedVideo || v.videoBytes, 'base64') };
  const reasons = r.raiMediaFilteredReasons || [];
  if (r.raiMediaFilteredCount || reasons.length) return { done: true, filtered: reasons.length ? reasons.join(' ') : 'blocked by a safety filter' };
  return { done: true, error: 'finished without a video: ' + JSON.stringify(r).slice(0, 300) };
}

// ---- checking request bodies against the docs ----------------------------------------------------------------------------
// The dry run, the tests and the local mock server all use these, so a body that drifts from the docs shows up
// before it costs anything.

const isB64 = (s) => typeof s === 'string' && s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s);
function checkPicture(p, where, out) {
  const d = p && (p.inlineData ? { mime: p.inlineData.mimeType, data: p.inlineData.data } : { mime: p.mimeType, data: p.bytesBase64Encoded });
  if (!d || !d.data) return out.push(where + ': expected {"inlineData": {"mimeType", "data"}} or {"bytesBase64Encoded", "mimeType"}');
  if (!['image/png', 'image/jpeg'].includes(d.mime)) out.push(where + ': mimeType ' + d.mime + ' (PNG or JPEG)');
  if (!isB64(d.data)) out.push(where + ': data is not base64');
  else if (!String(sniff(Buffer.from(d.data.slice(0, 64), 'base64'))).startsWith('image/')) out.push(where + ': data is not a PNG or JPEG');
}
export function checkVeoBody(body, model) {
  const out = [];
  if (!VEO_MODELS.includes(model)) out.push('model ' + model + ' is not one of ' + VEO_MODELS.join(', '));
  const extra = Object.keys(body || {}).filter((k) => !['instances', 'parameters'].includes(k));
  if (extra.length) out.push('unknown top-level fields: ' + extra.join(', '));
  if (!Array.isArray(body.instances) || body.instances.length !== 1) return out.concat('instances must hold exactly one instance');
  const inst = body.instances[0], p = body.parameters || {};
  const extraI = Object.keys(inst).filter((k) => !['prompt', 'image', 'lastFrame', 'referenceImages', 'video'].includes(k));
  if (extraI.length) out.push('unknown instance fields: ' + extraI.join(', '));
  if (typeof inst.prompt !== 'string' || !inst.prompt.trim()) out.push('prompt is empty');
  else if (inst.prompt.length > 3800) out.push('prompt is ' + inst.prompt.length + ' characters: the limit is 1,024 tokens');
  if (inst.image) checkPicture(inst.image, 'image', out);
  if (inst.lastFrame) { checkPicture(inst.lastFrame, 'lastFrame', out); if (!inst.image) out.push('lastFrame needs image (docs: "Must be used in combination with the image parameter")'); }
  const refs = inst.referenceImages || [];
  if (refs.length > 3) out.push('referenceImages: at most 3');
  refs.forEach((r, i) => { checkPicture(r.image, 'referenceImages[' + i + '].image', out); if (r.referenceType !== 'asset') out.push('referenceImages[' + i + '].referenceType must be "asset"'); });
  const extraP = Object.keys(p).filter((k) => !['aspectRatio', 'resolution', 'durationSeconds', 'personGeneration', 'negativePrompt'].includes(k));
  if (extraP.length) out.push('parameters outside the docs\' table, which the scripts never send: ' + extraP.join(', '));
  if (p.aspectRatio !== undefined && !['16:9', '9:16'].includes(p.aspectRatio)) out.push('aspectRatio ' + p.aspectRatio + ' (16:9 or 9:16)');
  const res = p.resolution || '720p';
  if (!(res in (PRICES.video[model] || {}))) out.push('resolution ' + res + ' is not offered for ' + model);
  const dur = p.durationSeconds === undefined ? 8 : Number(p.durationSeconds);
  if (![4, 6, 8].includes(dur)) out.push('durationSeconds ' + p.durationSeconds + ' (4, 6 or 8)');
  if (dur !== 8 && (res !== '720p' || refs.length)) out.push('durationSeconds must be 8 with 1080p, 4k or reference images');
  const withPictures = !!(inst.image || refs.length);
  if (p.personGeneration !== (withPictures ? 'allow_adult' : 'allow_all')) out.push('personGeneration must be "' + (withPictures ? 'allow_adult' : 'allow_all') + '" here');
  return out;
}
export function checkImageBody(body, api, model) {
  const out = [];
  if (!(model in PRICES.image)) out.push('model ' + model + ' has no price in PRICES');
  let pics = [], texts = [], fmt = {};
  if (api === 'interactions') {
    if (body.model !== model) out.push('model field is ' + body.model);
    if (!Array.isArray(body.input) || !body.input.length) return out.concat('input must be a list of text and image items');
    for (const [i, it] of body.input.entries()) {
      if (it.type === 'text') { if (typeof it.text !== 'string' || !it.text) out.push('input[' + i + ']: empty text'); else texts.push(it.text); }
      else if (it.type === 'image') { pics.push(it); checkPicture({ inlineData: { mimeType: it.mime_type, data: it.data } }, 'input[' + i + ']', out); }
      else out.push('input[' + i + ']: type ' + it.type);
    }
    fmt = body.response_format || {};
    if (fmt.type !== 'image') out.push('response_format.type must be "image"');
    if (fmt.mime_type !== undefined && fmt.mime_type !== 'image/jpeg') out.push('response_format.mime_type can only be image/jpeg');
    fmt = { aspect: fmt.aspect_ratio, size: fmt.image_size };
    if (body.store !== false) out.push('store should be false: nothing needs keeping on Google\'s side');
  } else if (api === 'generate-content') {
    const parts = (((body.contents || [])[0] || {}).parts) || [];
    if (!parts.length) out.push('contents[0].parts is empty');
    for (const [i, p] of parts.entries()) {
      if (p.text) texts.push(p.text);
      else if (p.inlineData) { pics.push(p); checkPicture(p, 'parts[' + i + ']', out); } else out.push('parts[' + i + '] is neither text nor inlineData');
    }
    const g = body.generationConfig || {};
    if (!(g.responseModalities || []).includes('IMAGE')) out.push('generationConfig.responseModalities must include IMAGE');
    fmt = { aspect: (g.imageConfig || {}).aspectRatio, size: (g.imageConfig || {}).imageSize };
  } else out.push('unknown api ' + api);
  if (!texts.length) out.push('no text prompt');
  if (fmt.aspect !== undefined && !ASPECTS.includes(fmt.aspect)) out.push('aspect ratio ' + fmt.aspect);
  if (fmt.size !== undefined && !IMAGE_SIZES.includes(fmt.size)) out.push('image size ' + fmt.size);
  if (pics.length > 14) out.push(pics.length + ' input images: at most 14');
  if (pics.length > (CHARACTER_REFS[model] || 4)) out.push(pics.length + ' photos of the coach: ' + model + ' keeps up to ' + (CHARACTER_REFS[model] || 4) + ' people photos consistent');
  return out;
}

// Dry run: writes the exact request (method, URL, headers, body) to a file, the key left out and each picture's
// base64 replaced by a note of which file it is, so the file stays readable. Everything else is byte for byte what
// a real run sends.
export function writeCall(file, call, images = []) {
  const label = new Map(images.map((im) => [im.b64, `<base64 of ${im.label}: ${im.missing ? 'not there yet, so this dry run sent a 1 px stand-in' : kb(im.bytes) + ', ' + im.mime}>`]));
  const body = JSON.parse(JSON.stringify(call.body, (k, v) => (typeof v === 'string' && label.has(v) ? label.get(v) : v)));
  writeJson(file, { method: call.method, url: call.url, headers: { 'x-goog-api-key': '<GEMINI_API_KEY, not written>', 'content-type': 'application/json' }, body });
}

// ---- ffmpeg ----------------------------------------------------------------------------------------------------------------

let FF = null;
export function haveFfmpeg() {
  if (FF === null) FF = ['ffmpeg', 'ffprobe'].every((b) => spawnSync(b, ['-version'], { stdio: 'ignore' }).status === 0);
  return FF;
}
export const NO_FFMPEG = 'ffmpeg is not installed (brew install ffmpeg, or sudo apt-get install ffmpeg)';
export function ff(args) {
  if (!haveFfmpeg()) throw new Stop(NO_FFMPEG);
  return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
}
// Length, size, frame rate and streams of a video.
export function probe(file) {
  if (!haveFfmpeg()) throw new Stop(NO_FFMPEG);
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_frames:format=duration', '-of', 'json', file], { encoding: 'utf8' }));
  const v = (j.streams || []).find((s) => s.codec_type === 'video') || {};
  const [a, b] = String(v.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    duration: +(j.format && j.format.duration) || 0, width: v.width || 0, height: v.height || 0, fps: b ? a / b : 0,
    frames: +v.nb_frames || 0, vcodec: v.codec_name || null, audio: (j.streams || []).some((s) => s.codec_type === 'audio')
  };
}
// One frame as a JPEG, `width` pixels wide. t = 'last' takes the very last frame (decodes the last half second and
// keeps the final picture, which a seek near the end can miss).
export function frameAt(video, t, out, width = 480) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // (no -ss for t = 0: on a still picture ffmpeg then writes nothing and still says it went well)
  if (t === 'last') ff(['-sseof', '-0.5', '-i', video, '-vf', `scale=${width}:-2`, '-q:v', '3', '-update', '1', out]);
  else ff([...(t > 0 ? ['-ss', String(t)] : []), '-i', video, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', out]);
  if (!fs.existsSync(out)) throw new Stop(`ffmpeg made no frame at ${t} s of ${show(video)}`);
  return out;
}
// How alike two pictures are, from 0 to 1 (SSIM, measured by ffmpeg on grey copies of the same size).
export function ssim(a, b) {
  if (!haveFfmpeg()) throw new Stop(NO_FFMPEG);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi',
    '[0:v]scale=640:360,format=gray[x];[1:v]scale=640:360,format=gray[y];[x][y]ssim', '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = String(r.stderr).match(/All:\s*([0-9.]+)/);
  return m ? +m[1] : null;
}

// ---- runs ------------------------------------------------------------------------------------------------------------------
// A run is one folder in out/: run.json (what was asked, the estimate, the spend) and what it made:
//   coaches/<coach>/look-<n>/{front,side,45}.jpg   keyframes/<coach>/<move>/<n>.jpg   takes/<coach>/<move>/take-<n>.mp4
//   review/index.html, review/sheet.png             calls/ (dry run: the request bodies)
// On GitHub the whole folder is the workflow's artifact.

export function newRunId() {
  if (process.env.GITHUB_RUN_ID) return `gh-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || 1}`;
  return 'local-' + new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}
export function openRun(id, out = OUT) {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Stop('A run id is letters, digits, dots and dashes: ' + id, 2);
  const dir = path.join(out, id);
  const file = path.join(dir, 'run.json');
  const meta = readJson(file, { id, started: new Date().toISOString(), steps: [], spent: 0, calls: 0 });
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir, meta, save(patch) { Object.assign(meta, patch || {}); writeJson(file, meta); } };
}
// Every run folder under `from`: a run folder itself, out/, or an unzipped artifact. Newest first.
export function runDirs(from = OUT) {
  const found = [];
  const walk = (d, depth) => {
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) return;
    if (fs.existsSync(path.join(d, 'run.json'))) { found.push(d); return; }
    if (depth < 4) for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && e.name !== 'node_modules') walk(path.join(d, e.name), depth + 1);
  };
  walk(path.resolve(from), 0);
  const started = (d) => readJson(path.join(d, 'run.json'), {}).started || '';
  return found.sort((a, b) => (started(b) > started(a) ? 1 : started(b) < started(a) ? -1 : 0));
}
// The newest run under `from` that has `sub` in it (like takes, or coaches/f).
export function latestRun(from, sub) {
  const d = runDirs(from).find((r) => !sub || fs.existsSync(path.join(r, sub)));
  if (!d) throw new Stop(`No run with ${sub || 'anything'} in ${show(path.resolve(from || OUT))}. Run the step first, or give --from <run folder or downloaded artifact>.`);
  return d;
}
