// One command for a whole image set: capture the screens, render the coach, lay everything out, check it.
//
//   node make.cjs appstore                       (sets: appstore, play, instagram, preview, portfolio; or all)
//   node make.cjs appstore,instagram --coach f --out showcase
//   node make.cjs instagram --only squat         (just one item, by name or screen)
//
// --coach m|f  who demonstrates (default m)   --ex squat  the exercise for the sheet, muscle and player screens
//              (a preset item can name its own "ex" so a set shows different moves; --ex overrides them all)
// --presets file.json  your own sets in the same format as assets/presets.json
// Writes <out>/<set>/NN-<name>.png, <out>/<set>/spec.json, and <out>/<set>/_sheet.png to review them all at once.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('./lib.cjs');

const node = (script, argv) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)].concat(argv), { stdio: 'inherit' });
  return r.status === 0;
};

function cuesOf(ex) {
  global.window = global;
  global.document = global.document || { addEventListener() {}, hidden: false };
  if (!global.WBF || !global.WBF.EX) {
    const vm = require('vm');
    for (const f of ['js/figure.js', 'js/exercises.js']) vm.runInThisContext(fs.readFileSync(path.join(L.REPO, f), 'utf8'), { filename: f });
  }
  const e = global.WBF.EX[ex];
  if (!e) throw new Error('no exercise called ' + ex);
  return e.cue.join(' ');
}

async function main() {
  const a = L.args();
  const presets = JSON.parse(fs.readFileSync(a.presets || path.join(L.SKILL, 'assets', 'presets.json'), 'utf8'));
  const want = String(a._[0] || '').split(',').filter(Boolean);
  const sets = want.includes('all') ? Object.keys(presets).filter((k) => !k.startsWith('_')) : want;
  if (!sets.length) {
    console.log('Sets:'); for (const [k, v] of Object.entries(presets)) if (!k.startsWith('_')) console.log('  ' + k.padEnd(10) + v.about);
    return;
  }
  const coach = a.coach === 'f' ? 'f' : 'm', ex = a.ex || 'squat';
  const outRoot = path.resolve(a.out || path.join(L.REPO, 'showcase'));
  const shotsDir = path.join(outRoot, 'shots-' + coach);
  const itemEx = (it) => (a.ex ? null : it.ex || null);             // an item's own exercise, unless --ex was given
  const shotFile = (dev, screen, e) => path.join(shotsDir, e ? 'ex-' + e : '', dev, screen + '.png');
  const coachDir = path.join(outRoot, 'coach');
  let ok = true;

  for (const name of sets) {
    const P = presets[name];
    if (!P) throw new Error('no set called ' + name + ' (sets: ' + Object.keys(presets).filter((k) => !k.startsWith('_')).join(', ') + ')');
    let items = P.items.map((it, i) => Object.assign({}, P.defaults, it, { _n: i + 1 }));
    if (a.only) items = items.filter((it) => String(a.only).split(',').some((o) => o === it.name || o === it.screen || o === String(it._n)));
    const dir = path.join(outRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    console.log('\n== ' + name + ': ' + items.length + ' image(s) -> ' + path.relative(process.cwd(), dir));

    // 1. screens, grouped by device and exercise
    const groups = {};
    for (const it of items) {
      const dev = it.device || P.device || 'iphone-6.9', e = itemEx(it);
      for (const s of [].concat(it.screen || [], it.screens || [])) (groups[dev + '|' + (e || '')] = groups[dev + '|' + (e || '')] || { dev, e, screens: new Set() }).screens.add(s);
    }
    for (const g of Object.values(groups)) {
      const need = [...g.screens].filter((s) => a.fresh || !fs.existsSync(shotFile(g.dev, s, g.e)));
      const out = g.e ? path.join(shotsDir, 'ex-' + g.e) : shotsDir;
      if (need.length && !node('shoot.cjs', ['--screens', need.join(','), '--device', g.dev, '--coach', coach, '--ex', g.e || ex, '--out', out])) ok = false;
    }
    // 2. coach renders
    for (const it of items) {
      if (!it.coach || typeof it.coach !== 'object') continue;
      const c = it.coach, file = path.join(coachDir, [c.ex, c.coach || coach, c.mode === 'muscle' ? 'muscle' : '', c.key != null ? 'k' + c.key : '',
                                                     c.t != null ? 't' + c.t : '', c.note ? 'note' : ''].filter(Boolean).join('-') + '.png');
      if (a.fresh || !fs.existsSync(file)) {
        const argv = ['--ex', c.ex, '--coach', c.coach || coach, '--size', '2160x2700', '--mat', 'off', '--out', file];
        if (c.mode) argv.push('--mode', c.mode);
        if (c.key != null) argv.push('--key', String(c.key));
        if (c.yaw != null) argv.push('--yaw', String(c.yaw));
        if (c.pitch != null) argv.push('--pitch', String(c.pitch));
        if (c.t != null) argv.push('--t', String(c.t));
        if (c.zoom != null) argv.push('--zoom', String(c.zoom));
        if (c.note) argv.push('--note', '--note-size', String(c.note === true ? 40 : c.note), '--note-light');
        if (!node('coach.cjs', argv)) ok = false;
      }
      it._coach = c;
      it.coach = path.relative(dir, file);
    }
    // 3. the layout spec, paths relative to it
    const spec = items.map((it) => {
      const dev = it.device || P.device || 'iphone-6.9';
      const s = Object.assign({}, it);
      const label = it.name || it.screen || (it.screens || []).join('-');
      s.out = String(it._n).padStart(2, '0') + '-' + label + '.png';
      if (it.screen) s.shots = [path.relative(dir, shotFile(dev, it.screen, itemEx(it)))];
      if (it.screens) s.shots = it.screens.map((x) => path.relative(dir, shotFile(dev, x, itemEx(it))));
      for (const k of ['title', 'note']) if (s[k] && s[k].includes('{cues}')) s[k] = s[k].replace('{cues}', cuesOf((it._coach || {}).ex || itemEx(it) || ex));
      s.rules = P.rules || 'any';
      delete s.screen; delete s.screens; delete s.device; delete s._n; delete s._coach; delete s.name; delete s.ex;
      return s;
    }).filter((s) => !s.shots || s.shots.every((f) => fs.existsSync(path.resolve(dir, f))));
    fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
    // 4. lay out, 5. check, 6. a review sheet
    if (!node('compose.cjs', [path.join(dir, 'spec.json')])) ok = false;
    if (!node('check.cjs', [path.join(dir, 'spec.json')])) ok = false;
    const done = spec.map((s) => s.out).filter((f) => fs.existsSync(path.join(dir, f)));
    if (done.length) {
      const maxH = Math.max(...spec.map((s) => s.size[1] / s.size[0]));
      const sheet = [{ out: '_sheet.png', size: [2400, Math.round(Math.min(2400, Math.max(900, 2400 / Math.min(done.length, 6) * maxH * (done.length > 6 ? 2 : 1) * 0.9)))], layout: 'sheet', images: done }];
      fs.writeFileSync(path.join(dir, '_sheet.json'), JSON.stringify(sheet));
      node('compose.cjs', [path.join(dir, '_sheet.json')]);
      fs.unlinkSync(path.join(dir, '_sheet.json'));
    }
  }
  if (!ok) { console.log('\nSome steps failed: see the FAIL lines above.'); process.exit(1); }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
