// Check finished images against the rules of where they're going (see references/sizes.md).
//
//   node check.cjs showcase/appstore/spec.json            (rules come from the spec: appstore|play|instagram|any)
//   node check.cjs spec.json --rules play
//
// FAIL: the store would refuse it, or it isn't what the spec asked for. WARN: allowed, but costs you
// something (Google Play recommendations, words that read as claims). Exit code 1 on any FAIL.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const APPLE = ['1320x2868', '1290x2796', '1260x2736', '1284x2778', '1242x2688', '2064x2752', '2048x2732'];
const CLAIMS = /\b(best|#1|no\.? ?1|top[- ]rated|number one|new|free|discount|sale|million|award|winning|download|install now|get it now|guaranteed?|lose \d|\d+ ?kg in)\b/i;
const MONEY = /[$€£ƒ]\s?\d|\d+([.,]\d{2})?\s?(usd|eur|awg|dollars?)|\/\s?(month|year|mo|yr)\b|per (month|year|week)/i;

function main() {
  const a = L.args();
  const specFile = a._[0];
  if (!specFile) throw new Error('usage: node check.cjs spec.json [--rules appstore|play|instagram|any]');
  const dir = path.dirname(path.resolve(specFile));
  let items = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  if (!Array.isArray(items)) items = [items];
  let fails = 0, warns = 0;
  const count = { appstore: 0, play: 0 }, big = { play: 0 };
  for (const it of items) {
    const rules = a.rules || it.rules || 'any';
    const file = path.resolve(dir, it.out), out = [], bad = [];
    if (!fs.existsSync(file)) { console.log('FAIL ' + it.out + '  missing'); fails++; continue; }
    const p = L.pngInfo(file);
    if (!p) { console.log('FAIL ' + it.out + '  not a PNG'); fails++; continue; }
    const W = p.width, H = p.height, size = W + 'x' + H, words = [it.kicker, it.title, it.note, it.mark].filter(Boolean).join(' ');
    if (it.size && (W !== it.size[0] || H !== it.size[1])) bad.push('is ' + size + ', spec says ' + it.size.join('x'));
    if (p.depth !== 8) bad.push(p.depth + '-bit');
    const alpha = p.color === 6 || p.color === 4;
    if (p.bytes > 8 * 1024 * 1024) out.push(Math.round(p.bytes / 1048576) + ' MB: over 8 MB');
    if (MONEY.test(words)) (rules === 'any' ? out : bad).push('mentions a price');
    const claim = words.match(CLAIMS);
    if (claim) out.push('"' + claim[0] + '" reads as a claim or a promotion');
    if (rules === 'appstore') {
      count.appstore++;
      if (!APPLE.includes(size) && !APPLE.includes(H + 'x' + W)) bad.push(size + ' is not an App Store screenshot size');
      if (alpha) bad.push('has an alpha channel (Apple refuses it)');
    } else if (rules === 'play') {
      if (alpha) bad.push('has an alpha channel (Play wants 24-bit PNG)');
      if (it.layout === 'feature') {
        if (size !== '1024x500') bad.push('the feature graphic must be 1024x500');
      } else {
        count.play++;
        const lo = Math.min(W, H), hi = Math.max(W, H);
        if (lo < 320 || hi > 3840) bad.push('each side must be 320 to 3840 px');
        if (hi > 2 * lo) bad.push('long side more than twice the short side');
        if (lo >= 1080 && Math.abs(hi / lo - 16 / 9) < 0.01) big.play++;
        if (it.frame === 'phone' || it.layout === 'phone' || it.layout === 'phones' || it.layout === 'hero') out.push('shows a device: Play asks for none to recommend the app');
      }
    } else if (rules === 'instagram') {
      const r = H / W;
      if (W !== 1080) out.push('Instagram stores 1080 px wide; this is ' + W);
      if (r > 1.34 && !(Math.abs(r - 16 / 9) < 0.01)) bad.push('taller than 3:4: the feed would crop it');
      if (r < 1 / 1.91) bad.push('wider than 1.91:1');
    }
    const line = (bad.length ? 'FAIL ' : out.length ? 'WARN ' : 'ok   ') + it.out + '  ' + size + '  ' + Math.round(p.bytes / 1024) + ' KB' +
      (bad.concat(out).length ? '  ' + bad.concat(out).join('; ') : '');
    console.log(line);
    if (bad.length) fails++; else if (out.length) warns++;
  }
  if (count.appstore > 10) { console.log('FAIL App Store takes at most 10 screenshots per size; this set has ' + count.appstore); fails++; }
  if (count.play > 8) { console.log('FAIL Google Play takes at most 8 phone screenshots; this set has ' + count.play); fails++; }
  if (count.play && big.play < 4) { console.log('WARN Play recommends apps with at least 4 screenshots of 1080 x 1920 or more; this set has ' + big.play); warns++; }
  console.log(fails ? fails + ' failed, ' + warns + ' warnings' : 'all passed' + (warns ? ', ' + warns + ' warnings' : ''));
  if (fails) process.exit(1);
}
try { main(); } catch (e) { console.error(e.message); process.exit(1); }
