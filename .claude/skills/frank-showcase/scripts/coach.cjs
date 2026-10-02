// Render the 3D coach doing one exercise, big and sharp, on a transparent background:
// for Instagram posts, the portfolio and anything else that needs the coach without the app around it.
//
//   node coach.cjs --ex squat --coach f --size 2160x2700 --out showcase/coach/squat-f.png
//   node coach.cjs --ex squat --coach f --key all --out showcase/coach/      (every key pose, to pick one)
//
// --key   which key pose (0 is the start; default: the working position)   --mode demo|muscle
// --yaw   turn the camera (degrees)   --pitch  look from higher up   --note  draw Frank's label and arrow
// --fit move   frame the whole movement (default: frame the chosen pose tightly)   --mat off  no exercise mat
// --t 0.3   a moment between key poses (0..1 through the movement), when no key pose reads well
// --zoom 0.8   frame looser, so a long floor shadow stays in   --fade 0.05   soften the outer 5% (0: off)
// --note-size 40 --note-light   Frank's label and arrow big and light, for a post on his dark green
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

function shotInit(o) { window.WBF_SHOT = o.shot; if (o.coachUrls) window.WBF_COACH_URLS = o.coachUrls; }

async function main() {
  const a = L.args();
  if (!a.ex) throw new Error('give an exercise id: --ex squat (ids are in js/exercises.js)');
  const [W, H] = String(a.size || '2160x2700').split('x').map(Number);
  const coach = a.coach === 'f' ? 'f' : 'm';
  const hd = !a['no-hd'] && fs.existsSync(path.join(L.REPO, 'assets/hd/coach-' + coach + '.glb'));
  if (!hd) console.log('note: using the app\'s standard coach model (build the HD one: see SKILL.md)');
  const srv = await L.serve();
  const browser = await L.launch();
  const half = W % 2 === 0 && H % 2 === 0;       // odd sizes render at 1x so the file is exactly W x H
  const ctx = await L.context(browser, srv.url, {
    width: half ? W / 2 : W, height: half ? H / 2 : H, scale: half ? 2 : 1,
    init: [[shotInit, { shot: { dpr: 2, ss: +(a.ss || 2), shadow: 4096, still: true },
                        coachUrls: hd ? { m: '/assets/hd/coach-m.glb', f: '/assets/hd/coach-f.glb' } : null }]]
  });
  const page = await ctx.newPage();
  const keys = a.key === 'all' ? null : (a.key != null ? [+a.key] : [undefined]);
  const noteSize = a['note-size'] || (a['note-light'] ? Math.round((half ? W / 2 : W) / 11) : null);   // post labels: about a ninth of the width
  const q = (k) => '?' + new URLSearchParams(Object.entries({ ex: a.ex, coach, key: k, mode: a.mode, yaw: a.yaw, pitch: a.pitch, note: a.note ? 1 : 0, fit: a.fit, mat: a.mat === 'off' ? 0 : null,
                                                              t: a.t, zoom: a.zoom, fade: a.fade, noteSize: noteSize,
                                                              noteInk: a['note-light'] ? '#A9DCF8' : null, noteHalo: a['note-light'] ? 0 : null })
    .filter(([, v]) => v != null && v !== '')).toString();
  let list = keys;
  if (!list) {                                   // --key all: find out how many key poses there are
    await page.goto(srv.url + '/__showcase/coach.html' + q(0));
    await page.waitForFunction(() => /^(done|error)/.test(document.title), null, { timeout: 180000 });
    const t = await page.title();
    if (t.startsWith('error')) throw new Error(t);
    list = Array.from({ length: +t.split('/')[1] }, (_, i) => i);
  }
  const outs = [];
  for (const k of list) {
    await page.goto(srv.url + '/__showcase/coach.html' + q(k));
    await page.waitForFunction(() => /^(done|error)/.test(document.title), null, { timeout: 180000 });
    const t = await page.title();
    if (t.startsWith('error')) throw new Error(t);
    await L.settle(page, { extra: 300 });
    const used = t.split(' ')[1].split('/')[0];
    // --out file.png for one pose; a folder for --key all (or when no file name is given)
    const out = a.out || 'showcase/coach/';
    const name = a.ex + '-' + coach + (keys ? '' : '-k' + used) + (a.t != null ? '-t' + a.t : '') + (a.mode === 'muscle' ? '-muscle' : '') + '.png';
    const file = keys && /\.png$/i.test(out) ? path.resolve(out) : path.resolve(out, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, omitBackground: true });
    const info = L.pngInfo(file);
    outs.push(file);
    console.log('ok   ' + path.relative(process.cwd(), file) + '  ' + info.width + 'x' + info.height + '  key ' + used);
  }
  await browser.close();
  srv.close();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
