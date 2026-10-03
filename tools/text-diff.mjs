// Lists the text people read in js/*.js that was added or changed since a commit, as a checklist to merge into
// docs/TEXT-FOR-FRANK.md. Frank approves every new or changed line before it ships, so none may ship unseen.
//
//   node tools/text-diff.mjs                     since the last commit that changed docs/TEXT-FOR-FRANK.md
//   node tools/text-diff.mjs <commit>            since that commit (a whole batch: the commit before its first)
//   node tools/text-diff.mjs <commit> --to <c>   between two commits (default: the files as they are now)
//   node tools/text-diff.mjs --all               every line of text in js/ now, for a full read-through
//
// It reads every string in js/*.js and joins the pieces a line is built from, so '<b>Day ' + n + ': ' reads
// "Day …:". It keeps what people see or hear (screens, toasts, the voice coach, screen-reader labels) and leaves out
// code (ids, keys, classes, selectors, styles, paths, icons). [x] means docs/TEXT-FOR-FRANK.md has that text already (the doc as
// it is now, or at --to). Exit code: 0 the doc has every line, 1 lines still to add, 2 a usage error.
// More: .claude/skills/frank-words/SKILL.md
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = 'docs/TEXT-FOR-FRANK.md';
const GAP = '\u0001';             // stands for whatever sits between two strings: a number, a name, a call
const SHOW = '…';

// ---- the command line ----------------------------------------------------------------------------------------
const HELP = 'Usage: node tools/text-diff.mjs [<since-commit>] [--to <commit>] [--all]\n' +
  '  <since-commit>  default: the last commit that changed ' + DOC + '\n' +
  '  --to <commit>   compare with that commit, not the files as they are now\n' +
  '  --all           list every line of text in js/*.js, changed or not';
function usage(msg) {
  console.error((msg ? msg + '\n' : '') + HELP);
  process.exit(2);
}
let since = null, to = null, all = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
  else if (a === '--all') all = true;
  else if (a === '--to') { to = argv[++i]; if (!to) usage('--to needs a commit.'); }
  else if (a.startsWith('--to=')) to = a.slice(5);
  else if (a.startsWith('-')) usage('Unknown option: ' + a);
  else if (!since) since = a;
  else usage('Give one commit to start from.');
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
function commitOf(rev) {
  try { return git('rev-parse', '--verify', '--quiet', rev + '^{commit}').trim(); } catch (e) { return usage('Not a commit here: ' + rev); }
}
const subject = (sha) => git('log', '-1', '--format=%h (%ad, %s)', '--date=short', sha).trim();
// the files compared: a commit's, or the folder's as it is now
function side(rev) {
  const names = rev ? git('ls-tree', '--name-only', rev, 'js/').split('\n').filter((f) => /^js\/[^/]+\.js$/.test(f))
    : fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
  const files = {};
  names.sort().forEach((f) => { files[f] = rev ? git('show', rev + ':' + f) : fs.readFileSync(path.join(root, f), 'utf8'); });
  let doc = '';
  try { doc = rev ? git('show', rev + ':' + DOC) : fs.readFileSync(path.join(root, DOC), 'utf8'); } catch (e) { /* no doc there yet */ }
  return { files, doc };
}

// ---- reading JavaScript: tokens with their line ----------------------------------------------------------------
const OPS = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=',
  '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**'];
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' };

// the escape at src[j] (a backslash): { ch, next, nl }
function escapeAt(src, j) {
  const e = src[j + 1];
  if (e === '\r') return { ch: '', next: src[j + 2] === '\n' ? j + 3 : j + 2, nl: 1 };
  if (e === '\n' || e === ' ' || e === ' ') return { ch: '', next: j + 2, nl: 1 };
  if (e === 'x') return { ch: String.fromCharCode(parseInt(src.substr(j + 2, 2), 16) || 0), next: j + 4, nl: 0 };
  if (e === 'u' && src[j + 2] === '{') {
    const k = src.indexOf('}', j + 3);
    return { ch: String.fromCodePoint(parseInt(src.slice(j + 3, k), 16) || 0), next: k + 1, nl: 0 };
  }
  if (e === 'u') return { ch: String.fromCharCode(parseInt(src.substr(j + 2, 4), 16) || 0), next: j + 6, nl: 0 };
  return { ch: ESC[e] !== undefined ? ESC[e] : e, next: j + 2, nl: 0 };
}
function readString(src, i, q) {
  let j = i + 1, v = '', nl = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === q) return { v, end: j + 1, nl };
    if (c === '\\') { const e = escapeAt(src, j); v += e.ch; nl += e.nl; j = e.next; continue; }
    if (c === '\n') return { v, end: j, nl };          // never closed: stop at the end of the line
    v += c; j++;
  }
  return { v, end: j, nl };
}
// a template literal: its ${...} parts read as gaps
function readTemplate(src, i) {
  let j = i + 1, v = '', nl = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === '`') return { v, end: j + 1, nl };
    if (c === '\\') { const e = escapeAt(src, j); v += e.ch; nl += e.nl; j = e.next; continue; }
    if (c === '$' && src[j + 1] === '{') {
      const e = skipBraces(src, j + 1);
      nl += (src.slice(j, e).match(/\n/g) || []).length;
      v += GAP; j = e; continue;
    }
    if (c === '\n') nl++;
    v += c; j++;
  }
  return { v, end: j, nl };
}
function skipBraces(src, k) {
  let depth = 0, j = k;
  while (j < src.length) {
    const c = src[j];
    if (c === '\'' || c === '"') { j = readString(src, j, c).end; continue; }
    if (c === '`') { j = readTemplate(src, j).end; continue; }
    if (c === '/' && src[j + 1] === '/') { const e = src.indexOf('\n', j); j = e < 0 ? src.length : e; continue; }
    if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? src.length : e + 2; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return j + 1;
    j++;
  }
  return j;
}
function readRegex(src, i) {
  let j = i + 1, cls = false;
  while (j < src.length) {
    const c = src[j];
    if (c === '\n') return null;                         // no closing slash on this line: a division
    if (c === '\\') { j += 2; continue; }
    if (cls) { if (c === ']') cls = false; } else if (c === '[') cls = true;
    else if (c === '/') { j++; while (/[a-z]/i.test(src[j] || '')) j++; return { v: src.slice(i, j), end: j }; }
    j++;
  }
  return null;
}
function tokenize(src) {
  const out = [];
  let i = 0, line = 1;
  const regexHere = () => {
    const p = out[out.length - 1];
    if (!p) return true;
    if (p.t === 'num' || p.t === 'str' || p.t === 're') return false;
    if (p.t === 'id') return BEFORE_REGEX.has(p.v);
    return !(p.v === ')' || p.v === ']' || p.v === '}');
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c) || c === '﻿') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2), end = e < 0 ? src.length : e + 2;
      line += (src.slice(i, end).match(/\n/g) || []).length; i = end; continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      const s = c === '`' ? readTemplate(src, i) : readString(src, i, c);
      out.push({ t: 'str', v: s.v, line }); line += s.nl; i = s.end; continue;
    }
    if (/[A-Za-z_$]/.test(c) || c > '\u007f') {
      let j = i + 1;
      while (j < src.length && (/[\w$]/.test(src[j]) || src[j] > '\u007f')) j++;
      out.push({ t: 'id', v: src.slice(i, j), line }); i = j; continue;
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
      const m = /^(0[xXbBoO][\da-fA-F_]+|(\d[\d_]*\.?[\d_]*|\.\d[\d_]*)([eE][+-]?\d+)?)n?/.exec(src.slice(i, i + 64));
      out.push({ t: 'num', v: m[0], line }); i += m[0].length; continue;
    }
    if (c === '/' && regexHere()) { const r = readRegex(src, i); if (r) { out.push({ t: 're', v: r.v, line }); i = r.end; continue; } }
    const op = OPS.find((o) => src.startsWith(o, i)) || c;
    out.push({ t: 'p', v: op, line }); i += op.length;
  }
  return out;
}

// ---- where each string sits: the call it is passed to, and the named blocks around it --------------------------
const NOT_CALLS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'with']);
const QUIET = new Set(['html', 'title', 'mount']);       // labels that say nothing about the screen
const PAIR = { ')': '(', ']': '[', '}': '{' };
function annotate(toks) {
  const stack = [];
  let closed = null;                                   // the ( ... ) that just closed, and what came before it
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k], p1 = toks[k - 1], p2 = toks[k - 2];
    // the call whose arguments this is in: grouping brackets don't count, a function body starts afresh
    for (let s = stack.length - 1; s >= 0; s--) {
      if (stack[s].block) break;
      if (stack[s].callee) { t.call = stack[s].callee; break; }
    }
    t.ctx = stack.map((f) => f.label).filter(Boolean);
    if (t.t !== 'p') continue;
    if (t.v === '(' || t.v === '[' || t.v === '{') {
      const f = { v: t.v, at: k, label: '', callee: null, block: false };
      const is = (x, type, v) => x && x.t === type && (v === undefined || x.v === v);
      if (t.v === '(') {
        f.callee = is(p1, 'id') && !NOT_CALLS.has(p1.v) ? p1.v : null;
        f.before = [toks[k - 3], p2, p1];
      } else if (t.v === '{' && is(p1, 'p', ')') && closed) {
        // a block after ( ... ): a function's body, or an if whose test names a step ("id === 'born'")
        f.block = true;
        const [b3, b2, b1] = closed.before;
        if (is(b1, 'id') && is(b2, 'id', 'function')) f.label = b1.v;
        else if (is(b1, 'id', 'function') && b2 && b2.t === 'p' && (b2.v === ':' || b2.v === '=') && b3) f.label = b3.v;
        else if (is(b1, 'id', 'if')) f.label = closed.test || '';
      } else if (t.v === '{' && (is(p1, 'p', '=>') || is(p1, 'p', ';') || is(p1, 'p', '{') || is(p1, 'p', '}') || !p1)) f.block = true;
      else if (t.v === '{' && p1 && p1.t === 'id' && ['else', 'try', 'finally', 'do'].includes(p1.v)) f.block = true;
      else if (p1 && p1.t === 'p' && (p1.v === ':' || p1.v === '=') && p2 && (p2.t === 'id' || p2.t === 'str')) f.label = p2.v;
      else if (is(p1, 'p', '=') && is(p2, 'p', ']') && is(toks[k - 3], 'str')) f.label = toks[k - 3].v;   // SCREENS['coach-edit'] = {
      stack.push(f);
    } else if (PAIR[t.v]) {
      while (stack.length && stack[stack.length - 1].v !== PAIR[t.v]) stack.pop();
      const f = stack.pop();
      if (f && f.v === '(') {
        // the first string compared with === inside, for "if (id === 'born')"
        const inside = toks.slice(f.at + 1, k);
        const n = inside.findIndex((x, i) => x.t === 'str' && ((inside[i - 1] || {}).v === '===' || (inside[i + 1] || {}).v === '==='));
        f.test = n >= 0 ? inside[n].v : '';
        closed = f;
      }
    }
  }
}
const where = (ctx) => ctx.filter((c) => !QUIET.has(c) && /\w/.test(c)).slice(-2).join(' › ');

// ---- strings joined into lines ---------------------------------------------------------------------------------
function skipBalanced(toks, k) {
  let depth = 0;
  for (let j = k; j < toks.length; j++) {
    const v = toks[j].t === 'p' ? toks[j].v : '';
    if (v === '(' || v === '[' || v === '{') depth++;
    else if ((v === ')' || v === ']' || v === '}') && --depth === 0) return j + 1;
  }
  return toks.length;
}
// past one operand of +: a name, a call, a member, a bracket, with what follows it (.x, [i], (args))
function skipOperand(toks, i) {
  let k = i;
  while (toks[k] && ((toks[k].t === 'p' && ['!', '-', '+', '~', '++', '--'].includes(toks[k].v)) ||
    (toks[k].t === 'id' && ['typeof', 'new', 'void', 'delete', 'await'].includes(toks[k].v)))) k++;
  const t = toks[k];
  if (!t) return i;
  if (t.t === 'p' && (t.v === '(' || t.v === '[')) k = skipBalanced(toks, k);
  else if (t.t === 'id' || t.t === 'num' || t.t === 'str' || t.t === 're') k++;
  else return i;
  for (;;) {
    const s = toks[k];
    if (!s || s.t !== 'p') break;
    if ((s.v === '.' || s.v === '?.') && toks[k + 1] && toks[k + 1].t === 'id') { k += 2; continue; }
    if (s.v === '(' || s.v === '[') { k = skipBalanced(toks, k); continue; }
    if (s.v === '++' || s.v === '--') k++;
    break;
  }
  return k;
}
// the attribute a piece of markup ends inside, if any: 'class' for '<div class="', 'tag' for '<div '
function openAttr(text) {
  const t = text.slice(Math.max(text.lastIndexOf('>'), 0));
  const m = /([\w:-]+)\s*=\s*"[^"]*$/.exec(t);
  if (m) return m[1].toLowerCase();
  return /<[a-z][^<>]*$/i.test(text) || /^[^<>]*"[^<>"]*$/.test(t) && /^\s*"/.test(text) ? 'tag' : '';
}
// every string, or run of strings joined with +, as one piece of text with gaps for the rest. parts: each string
// in it with its line, to tell which line a piece of text comes from
function chains(toks) {
  const used = new Set(), out = [];
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t !== 'str' || used.has(k)) continue;
    const before = toks[k - 1], parts = [{ v: t.v, line: t.line }];
    let text = before && before.t === 'p' && before.v === '+' ? GAP : '';
    let j = k;
    text += t.v; used.add(k);
    for (;;) {
      const plus = toks[j + 1];
      if (!plus || plus.t !== 'p' || plus.v !== '+') break;
      const nx = toks[j + 2];
      if (nx && nx.t === 'str') { text += nx.v; parts.push({ v: nx.v, line: nx.line }); used.add(j + 2); j += 2; continue; }
      const end = skipOperand(toks, j + 2);
      if (end === j + 2) break;
      // strings inside this operand land inside an attribute when the markup so far leaves one open
      const attr = openAttr(text);
      if (attr) for (let x = j + 2; x < end; x++) if (!toks[x].attr) toks[x].attr = attr;
      text += GAP; j = end - 1;
    }
    out.push({ text, first: k, last: j, parts });
  }
  return out;
}
// the line of the string a piece of text starts in
function lineOf(piece, c) {
  const head = piece.split(GAP).map((p) => p.trim()).find((p) => letters(p) >= 1 || /\d/.test(p));
  const hit = head && c.parts.find((p) => decode(p.v).includes(head) || p.v.includes(head));
  return hit ? hit.line : c.parts[0].line;
}

// ---- what people read ------------------------------------------------------------------------------------------
// calls whose strings are code: the page, events, storage, formats, the app's own ids (screens, icons, exercises)
const CODE_CALLS = new Set(['$', '$$', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'closest', 'matches',
  'getAttribute', 'setAttribute', 'removeAttribute', 'hasAttribute', 'toggleAttribute', 'addEventListener', 'removeEventListener',
  'dispatchEvent', 'Event', 'CustomEvent', 'add', 'remove', 'toggle', 'contains', 'getItem', 'setItem', 'removeItem', 'createElement',
  'createElementNS', 'matchMedia', 'getEntriesByType', 'getPropertyValue', 'setProperty', 'require', 'indexOf', 'lastIndexOf', 'includes',
  'split', 'replace', 'replaceAll', 'test', 'match', 'search', 'startsWith', 'endsWith', 'padStart', 'padEnd', 'register', 'getRegistration',
  'request', 'fetch', 'Request', 'URL', 'RegExp', 'open', 'postMessage', 'DateTimeFormat', 'NumberFormat', 'toLocaleDateString',
  'toLocaleString', 'log', 'warn', 'error', 'info', 'debug', 'ic', 'go', 'tab', 'obGo', 'replaceTop', 'figHtml', 'thumbHtml', 'mapImg', 'img',
  'media', 'session', 'getObjectByName', 'getContext', 'getExtension', 'load', 'Blob', 'File', 'Image', 'execCommand', 'canPlayType',
  'Error', 'TypeError', 'RangeError', 'place', 'mk', 'el']);
// properties whose strings are code: the page's, a canvas's, a shader's
const CODE_PROPS = new Set(['className', 'id', 'type', 'src', 'href', 'cssText', 'overflow', 'cursor', 'display', 'key', 'name', 'lang',
  'rel', 'target', 'mode', 'kind', 'phase', 'tab', 'font', 'fillStyle', 'strokeStyle', 'textAlign', 'textBaseline', 'lineCap', 'lineJoin',
  'globalCompositeOperation', 'filter', 'shadowColor', 'vertexShader', 'fragmentShader', 'crossOrigin', 'preload', 'responseType']);
const SAID = { 'aria-label': 'screen reader', 'aria-valuetext': 'screen reader', 'aria-description': 'screen reader', alt: 'screen reader', title: 'screen reader', placeholder: 'field hint' };
const KIND = { say: 'spoken', speak: 'spoken', toast: 'toast', confirmBox: 'question box', alert: 'box', confirm: 'box' };
const INLINE = new Set(['b', 'strong', 'em', 'i', 'u', 'a', 'br', 'wbr', 'abbr', 'q', 'mark', 'sup', 'sub', 'code', 'kbd', 'time', 's']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', minus: '−', middot: '·', times: '×' };
const letters = (s) => (s.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] || m));
const tidy = (s) => s.replace(/\s+/g, ' ').trim();

// a CSS selector, or a list of them, kept in a list before it goes to $(): '.top-bar .title', 'h2, .label'
const SEL_PART = /^(?:[a-z][a-z0-9]*)?(?:[.#][A-Za-z_][\w-]*|\[[^\]]*\]|::?[a-z-]+(?:\([^)]*\))?)+$/;
const SEL_TAG = /^(a|b|i|p|ul|ol|li|h[1-6]|div|span|button|input|label|section|form|select|textarea|img|svg|canvas|video|small|strong|em|main|nav|header|footer|figure|table|tr|td|th)$/;
function isSelector(s) {
  const parts = s.split(/\s*[\s>+~,]\s*/).filter(Boolean);
  return parts.some((p) => /[.#[]/.test(p)) && parts.every((p) => SEL_PART.test(p) || SEL_TAG.test(p));
}
// a plain string (no markup) that is code: ids, keys, paths, colours, CSS, selectors, SVG paths, lists of ids. Prices
// and phone numbers are not code: they need Frank's yes too.
function looksLikeCode(raw) {
  const s = tidy(raw.split(GAP).join(' ')), bare = tidy(raw.split(GAP).join(''));
  if (/[€$£]\s?\d/.test(s) || /^\+?\d[\d -]{7,}\d$/.test(bare)) return false;
  if (letters(s) < 2) return true;
  if (!/\s/.test(bare)) {                                        // one word
    if (raw.includes(GAP) && /^[a-z]+$/.test(bare)) return /^(px|em|rem|vh|vw|ms|deg|fr|s)$/.test(bare);   // a unit after a value: … min, … kg
    if (/^[A-Z][a-z\u00C0-\u024F'’]+[.!?,:]?$/.test(bare)) return false;   // Next, Pause, Frank's
    if (/^[A-Z][A-Za-z]*[a-z][A-Z]/.test(bare)) return true;          // CamelCase: AudioContext, LeftUpLeg
    return !(/^[A-Z][A-Za-z0-9]*$/.test(bare) && /[A-Z]{2}/.test(bare) && !/[a-z]{2}/.test(bare));   // GRAViTY reads; squat, ob-next, wbf.v1, #012D12 don't
  }
  if (/^(https?:|mailto:|tel:|data:|blob:|\.?\.?\/)/.test(s)) return true;
  if (isSelector(s)) return true;
  if (/^[a-z-]+\s*:\s*[^;]*;/.test(s) || /^(width|height|left|top|right|bottom|margin|padding|font|color|background|display|opacity|transform|grid|align|justify|text-align|min-|max-|cursor|border|position|z-index|flex|gap|stroke|fill|transition|animation)[\w-]*\s*:/.test(s)) return true;
  if (/\bpx\b.*\b(serif|sans-serif|monospace|system-ui)\b/.test(s)) return true;               // a canvas font
  if (/\b(uniform|varying|attribute)\s+(float|int|bool|vec[234]|mat[34]|sampler2D)\b|\bgl_\w+/.test(s)) return true;   // shader code
  if (/^[MLHVCSQTAZmlhvcsqtaz\d\s.,-]+$/.test(s) && !/[A-Za-z]{2}/.test(s)) return true;      // SVG path data
  if (/^[a-z0-9-]+( [a-z0-9-]+)* ?\| ?[a-z0-9 -]*$/.test(s)) return true;   // muscle lists: 'abs | obliques'
  if (/^[a-z][a-z0-9]*-[a-z0-9-]+(\s+[a-z][a-z0-9]*-[a-z0-9-]+)+$/.test(s)) return true;   // class lists: 'fg-bone fg-far'
  if (/(^|\s)[a-z]+[A-Z][a-z]+[A-Z]/.test(s)) return true;                                  // xMidYMax meet
  if (/^\(?[a-z-]+:\s*[a-z-]+\)?$/.test(s)) return true;       // a media query: (display-mode: standalone)
  return false;
}
// the pieces of one chain that people read: [{ text, kind }]
function readable(text, kind) {
  const out = [];
  const markup = /<\/?[a-z][a-z0-9-]*/i.test(text) || /[\w-]+\s*=\s*"/.test(text) || /^\s*"\s*\/?>/.test(text) || /"\s*\/?>/.test(text);
  if (!markup) {
    if (!looksLikeCode(text)) out.push({ text, kind });
    return out;
  }
  // what screen readers say and fields hint, from the tags (an attribute may still be open at either end)
  const said = /\b(aria-label|aria-valuetext|aria-description|placeholder|alt|title)\s*=\s*"([^"]*)("|$)/g;
  let m;
  while ((m = said.exec(text))) out.push({ text: decode(m[2]), kind: SAID[m[1]] });
  let body = text;
  const lt = body.indexOf('<'), gt = body.indexOf('>');
  if (gt >= 0 && (lt < 0 || gt < lt)) body = body.slice(gt + 1);               // the end of a tag opened in another string
  const lastLt = body.lastIndexOf('<');
  if (lastLt >= 0 && lastLt > body.lastIndexOf('>')) body = body.slice(0, lastLt);   // a tag that goes on in another string
  body = body.replace(/<\/?([a-z][a-z0-9-]*)(?:[^<>"]|"[^"]*")*\/?>/gi, (tag, name) => {
    const n = name.toLowerCase();
    return n === 'br' ? ' ' : INLINE.has(n) ? '' : '\n';
  });
  if (!/[<>]/.test(body)) body = body.replace(/\s*[\w:-]+\s*=\s*"[^"]*("|$)/g, '\n');   // attributes with no tag around them
  decode(body).split('\n').forEach((piece) => {
    if (!/[<>]/.test(piece) && !/^\s*"\s*$/.test(piece)) out.push({ text: piece.replace(/^\s*"(?=\s|$)/, ''), kind });
  });
  return out;
}
function isCode(toks, c) {
  const b = toks[c.first - 1], b2 = toks[c.first - 2], a = toks[c.last + 1], first = toks[c.first];
  if (first.attr && !SAID[first.attr]) return true;                          // a class, a style, a data-*, an href
  if (first.call && CODE_CALLS.has(first.call)) return true;
  if (b && b.t === 'p' && ['===', '!==', '==', '!='].includes(b.v)) return true;
  if (b && b.t === 'id' && (b.v === 'case' || b.v === 'in')) return true;
  if (a && a.t === 'p' && ['===', '!==', '==', '!='].includes(a.v)) return true;
  if (a && a.t === 'id' && a.v === 'in') return true;
  if (a && a.t === 'p' && a.v === ':' && b && b.t === 'p' && (b.v === '{' || b.v === ',')) return true;   // an object's key
  if (b && b.t === 'p' && (b.v === '=' || b.v === '+=') && b2 && b2.t === 'id' && CODE_PROPS.has(b2.v)) return true;
  if (b && b.t === 'p' && b.v === '[' && a && a.t === 'p' && a.v === ']') return true;              // obj['key']
  return toks[c.first].v === 'use strict';
}
// every readable line in one file: [{ text, kind, line, where }]
function linesOf(src) {
  const toks = tokenize(src);
  annotate(toks);
  const out = [];
  chains(toks).forEach((c) => {
    if (isCode(toks, c)) return;
    const first = toks[c.first], b = toks[c.first - 1], b2 = toks[c.first - 2];
    const kind = first.attr ? SAID[first.attr] : KIND[first.call] || '';
    // where it sits: the named blocks around it, or the name it's kept in (var SAVE_FAIL = '...')
    const at = where(first.ctx) || (b && b.v === '=' && b2 && b2.t === 'id' ? b2.v : '');
    readable(c.text, kind).forEach((r) => {
      // a gap that touches a word is an icon or an optional ending ('…Start', 'Done…'): leave it out
      const text = tidy(r.text.split(GAP).join(SHOW)).replace(/…(\s*…)+/g, SHOW).replace(/^…(?=[A-Z])/, '').replace(/([A-Za-z])…$/, '$1');
      if (letters(text) < 2 && !/[€$£]\s?\d|\d{8}/.test(text)) return;
      out.push({ text, kind: r.kind, line: lineOf(r.text, c), where: at });
    });
  });
  return out;
}

// ---- what changed ----------------------------------------------------------------------------------------------
function addedLines(file, oldRev, newRev) {
  const set = new Set();
  const args = ['diff', '-U0', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', oldRev].concat(newRev ? [newRev] : [], ['--', file]);
  git(...args).split('\n').forEach((l) => {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (!m) return;
    const from = +m[1], n = m[2] == null ? 1 : +m[2];
    for (let i = 0; i < n; i++) set.add(from + i);
  });
  return set;
}
// how alike two lines are, 0 to 1: the pairs of letters they share
function alike(a, b) {
  const pairs = (s) => {
    s = s.toLowerCase();
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) m.set(s.substr(i, 2), (m.get(s.substr(i, 2)) || 0) + 1);
    return m;
  };
  const A = pairs(a), B = pairs(b);
  let both = 0, n = 0;
  A.forEach((v, k) => { n += v; both += Math.min(v, B.get(k) || 0); });
  B.forEach((v) => { n += v; });
  return n ? 2 * both / n : 0;
}
// is this line in the doc? Each part between the gaps must be there, in order (case and line breaks don't count)
function inDoc(text, doc) {
  const parts = text.split(SHOW).map((p) => p.replace(/^[\s.,:;·!?()"'/-]+|[\s.,:;·!?()"'/-]+$/g, '')).filter((p) => letters(p) >= 1);
  if (!parts.length) return false;
  const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const edge = (p, at) => (/\w/.test(at ? p[p.length - 1] : p[0]) ? '\\b' : '');
  return new RegExp(edge(parts[0], 0) + parts.map(esc).join('[\\s\\S]{0,160}?') + edge(parts[parts.length - 1], 1), 'i').test(doc);
}

// ---- run -------------------------------------------------------------------------------------------------------
const newRev = to ? commitOf(to) : null;
const now = side(newRev);
const doc = tidy(now.doc);
const tick = (ok) => (ok ? '[x]' : '[ ]');
const show = (l) => l.text + (l.kind ? '  (' + l.kind + ')' : '');

if (all) {
  let n = 0;
  console.log('Every line of text in js/*.js' + (newRev ? ' at ' + subject(newRev) : ', as the files are now') + '. [x]: ' + DOC + ' has it.\n');
  Object.keys(now.files).forEach((f) => {
    const ls = linesOf(now.files[f]);
    if (!ls.length) return;
    console.log(f);
    ls.forEach((l) => { n++; console.log('  ' + tick(inDoc(l.text, doc)) + ' ' + String(l.line).padEnd(5) + (l.where ? l.where + ': ' : '') + show(l)); });
    console.log('');
  });
  console.log(n + ' lines of text.');
  process.exit(0);
}

if (!since) {
  since = git('log', '-1', '--format=%H', ...(newRev ? [newRev] : []), '--', DOC).trim();
  if (!since) usage(DOC + ' has no history yet: name the commit to start from.');
}
const oldRev = commitOf(since);
const before = side(oldRev);
const oldAll = {}, newAll = {};
Object.keys(before.files).forEach((f) => { oldAll[f] = linesOf(before.files[f]); });
Object.keys(now.files).forEach((f) => { newAll[f] = linesOf(now.files[f]); });
const count = (lists) => lists.flat().reduce((m, l) => m.set(l.text, (m.get(l.text) || 0) + 1), new Map());
const oldCount = count(Object.values(oldAll)), newCount = count(Object.values(newAll));

// added or changed: more of it in js/ now than before (text that only moved between files doesn't count). Of its
// places, the ones on lines the diff marks as new; if none is, all of them.
const added = [];
Object.keys(newAll).forEach((f) => {
  const fresh = f in before.files ? addedLines(f, oldRev, newRev) : null;     // null: a new file, every line is new
  const grew = newAll[f].filter((l) => (newCount.get(l.text) || 0) > (oldCount.get(l.text) || 0));
  new Set(grew.map((l) => l.text)).forEach((text) => {
    const all = grew.filter((l) => l.text === text), onNew = all.filter((l) => !fresh || fresh.has(l.line));
    (onNew.length ? onNew : all).forEach((l) => added.push(Object.assign({ file: f }, l)));
  });
});
// taken out or changed: less of it in js/ now than before, and less of it in that file
const gone = [], seen = new Set();
Object.keys(oldAll).forEach((f) => {
  const here = count([oldAll[f]]), there = count([newAll[f] || []]);
  oldAll[f].forEach((l) => {
    if ((oldCount.get(l.text) || 0) <= (newCount.get(l.text) || 0) || here.get(l.text) <= (there.get(l.text) || 0) || seen.has(f + '\n' + l.text)) return;
    seen.add(f + '\n' + l.text);
    gone.push(Object.assign({ file: f }, l));
  });
});
// each new line next to the old line it most likely replaced: the same file, the most alike, 60% alike at least
const replaced = new Set();
added.forEach((a) => {
  let best = null, score = 0.6;
  gone.forEach((g) => {
    if (g.file !== a.file) return;
    const s = alike(a.text, g.text) + (g.where && g.where === a.where ? 0.05 : 0);
    if (s > score) { score = s; best = g; }
  });
  if (best) { a.was = best; replaced.add(best); }
});
const takenOut = gone.filter((g) => !replaced.has(g));

console.log('Text in js/*.js added or changed since ' + subject(oldRev));
console.log('compared with ' + (newRev ? subject(newRev) : 'the files as they are now') + '.');
if (!added.length && !takenOut.length) {
  console.log('\nNo text people read has changed: nothing to add to ' + DOC + '.');
  process.exit(0);
}
console.log('Each line needs a row in ' + DOC + ': where it shows, the new text, what it said before.');
console.log('[x]: the doc' + (newRev ? ' at that commit' : '') + ' has it already. Line numbers are in the new files.\n');
let missing = 0;
Object.keys(newAll).forEach((f) => {
  const mine = added.filter((a) => a.file === f).sort((x, y) => x.line - y.line);
  if (!mine.length) return;
  console.log(f);
  mine.forEach((a) => {
    const ok = inDoc(a.text, doc);
    if (!ok) missing++;
    console.log('  ' + tick(ok) + ' ' + String(a.line).padEnd(5) + a.where);
    console.log('        ' + show(a));
    if (a.was) console.log('        was: ' + a.was.text);
  });
  console.log('');
});
if (takenOut.length) {
  console.log('Taken out (no longer in js/):');
  takenOut.forEach((g) => {
    const ok = inDoc(g.text, doc);
    if (!ok) missing++;
    console.log('  ' + tick(ok) + ' ' + g.file + (g.where ? ', ' + g.where : '') + ': ' + show(g));
  });
  console.log('');
}
const there = added.filter((a) => inDoc(a.text, doc)).length;
console.log(added.length + ' added or changed (' + there + ' in the doc), ' + takenOut.length + ' taken out. ' +
  (missing ? missing + ' still to add to ' + DOC + '.' : 'The doc has them all.'));
process.exit(missing ? 1 : 0);
