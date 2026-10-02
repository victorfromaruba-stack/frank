// Lay out screenshots and coach renders into finished images (store, Instagram, previews, portfolio).
//
//   node compose.cjs spec.json              every image in the spec
//   node compose.cjs spec.json --only 2     just the third one
//
// spec.json is a list of images: { "out": "showcase/appstore/01-plan.png", "size": [1320, 2868],
//   "layout": "phone|band|phones|hero|coach|feature|sheet", "theme": "forest|paper|sky", "kicker": "...",
//   "title": "Your plan, *built for you*", "note": "...", "shots": ["path.png", ...], "labels": [...],
//   "coach": "render.png", "frame": "phone|none", "bleed": true, ... }  (all layout options: assets/compose.html)
// Paths are relative to the spec file. Output: opaque RGB PNG at exactly "size".
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const dataUrl = (file) => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');

async function render(browser, base, item, dir) {
  const [W, H] = item.size;
  const ctx = await L.context(browser, base, { width: W, height: H, scale: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/__showcase/compose.html');
  const spec = Object.assign({}, item);
  const abs = (p) => path.resolve(dir, p);
  if (item.shots) {
    spec.shots = item.shots.map((p) => dataUrl(abs(p)));
    const info = L.pngInfo(abs(item.shots[0]));
    spec.ratio = spec.ratio || info.height / info.width;
  }
  if (item.coach) spec.coach = dataUrl(abs(item.coach));
  if (item.images) {                       // the review sheet
    spec.images = item.images.map((p) => { const i = L.pngInfo(abs(p)); return { src: dataUrl(abs(p)), name: path.basename(p), w: i.width, h: i.height }; });
  }
  await page.evaluate((s) => window.build(s), spec);
  await L.settle(page, { threeD: false, extra: 150 });
  const t = await page.title();
  if (errors.length) throw new Error(errors[0]);
  if (!/^built/.test(t)) throw new Error('layout did not finish: ' + t);
  const outside = +t.split(' ')[1];
  const file = abs(item.out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  await ctx.close();
  const info = L.pngInfo(file);
  if (info.width !== W || info.height !== H) throw new Error('came out ' + info.width + 'x' + info.height + ', not ' + W + 'x' + H);
  return { file, outside, kb: Math.round(info.bytes / 1024) };
}

async function main() {
  const a = L.args();
  const specFile = a._[0];
  if (!specFile) throw new Error('usage: node compose.cjs spec.json [--only N]');
  let items = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  if (!Array.isArray(items)) items = [items];
  const dir = path.dirname(path.resolve(specFile));
  const pick = a.only != null ? String(a.only).split(',').map(Number) : null;
  const server = await L.serve();
  const browser = await L.launch();
  let bad = 0;
  for (let i = 0; i < items.length; i++) {
    if (pick && !pick.includes(i)) continue;
    const it = items[i];
    try {
      const r = await render(browser, server.url, it, dir);
      console.log((r.outside ? 'WARN ' : 'ok   ') + path.relative(process.cwd(), r.file) + '  ' + it.size.join('x') + '  ' + r.kb + ' KB' +
                  (r.outside ? '  (text runs outside the image)' : ''));
      if (r.outside) bad++;
    } catch (e) {
      bad++;
      console.log('FAIL ' + it.out + '  ' + e.message.split('\n')[0]);
    }
  }
  await browser.close();
  server.close();
  if (bad) process.exit(1);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
