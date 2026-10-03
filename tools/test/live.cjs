// live: the published site (GitHub Pages serves the app branch). Every file the app needs is there and is the same
// as what was pushed (origin/app), with the right types; then the app itself on a phone-sized screen: welcome,
// onboarding, a member's plan, an exercise sheet, a workout, a session link and the Personal prototype.
// After a push: node tools/test/run.cjs live --wait   (waits up to 5 minutes for Pages to finish deploying)
// Another copy (Frank's own domain, a preview): --site https://example.org/   or FRANK_QA_SITE=...
'use strict';
const crypto = require('crypto');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('./lib.cjs');
const { app } = L;

const git = (args) => {
  try { return cp.execFileSync('git', args, { cwd: L.REPO, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch (e) { return null; }
};
// git's id for a file's bytes, to compare a download with the pushed file without reading it out of git
const blobId = (buf) => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
// the types a browser insists on: module scripts and the service worker need JavaScript, the manifest JSON
const TYPES = { '.js': /javascript/, '.css': /text\/css/, '.html': /text\/html/, '.webmanifest': /json/, '.woff2': /font\/woff2|octet-stream/ };

// What the published copy should hold: the files at origin/app (what the last push sent; HEAD when there's no
// origin/app), by git blob id. Without git: the files on disk.
function expected() {
  const ref = git(['rev-parse', '--verify', '--quiet', 'origin/app']) ? 'origin/app' : git(['rev-parse', '--verify', '--quiet', 'HEAD']) ? 'HEAD' : null;
  const read = (f) => (ref ? git(['show', ref + ':' + f]) : fs.existsSync(path.join(L.REPO, f)) ? fs.readFileSync(path.join(L.REPO, f)) : null);
  const ids = {};
  if (ref) for (const line of String(git(['ls-tree', '-r', ref]) || '').split('\n')) { const m = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line); if (m) ids[m[2]] = m[1]; }
  const sw = String(read('sw.js') || '');
  const list = (name) => vm.runInNewContext((new RegExp('const\\s+' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);').exec(sw) || [])[1] || '[]');
  const shell = list('SHELL').concat(list('LAZY'));           // LAZY: kept offline from their first use
  const version = (/const\s+VERSION\s*=\s*'([^']+)'/.exec(sw) || [])[1];
  let manifest = {};
  try { manifest = JSON.parse(String(read('manifest.webmanifest'))); } catch (e) { /* reported by the file check */ }
  const files = new Set(shell.filter((f) => f !== './'));
  ['sw.js', 'img/icon-180.png', 'personal/index.html', 'personal/personal.js', 'personal/personal.css', 'personal/data.js'].forEach((f) => files.add(f));
  (manifest.icons || []).forEach((i) => files.add(i.src.replace(/^\.\//, '')));
  for (const m of String(read('fonts/fonts.css') || '').matchAll(/url\(['"]?([^)'"]+)['"]?\)/g)) files.add('fonts/' + m[1]);
  const id = (f) => ids[f] || (ref ? null : (read(f) ? blobId(read(f)) : null));
  let about = 'the files on disk';
  if (ref) {
    const [sha, date, subject] = String(git(['log', '-1', '--format=%h%x09%cr%x09%s', ref]) || '').trim().split('\t');
    about = ref + ' ' + sha + ' (' + date + ': ' + subject + ')';
  }
  return { ref, about, version, files: [...files], id };
}

// what is in this checkout but not published yet
function unpublished(ref, files) {
  if (!ref || ref === 'HEAD') return [];
  const out = [];
  const ahead = +String(git(['rev-list', '--count', ref + '..HEAD']) || '0').trim();
  if (ahead) out.push('HEAD is ' + ahead + ' commit' + (ahead > 1 ? 's' : '') + ' ahead of ' + ref + ': not live until pushed');
  const changed = String(git(['status', '--porcelain', '--', ...files, 'index.html', 'js', 'app.css', 'sw.js', 'personal']) || '').split('\n').filter(Boolean);
  if (changed.length) out.push(changed.length + ' app file' + (changed.length > 1 ? 's' : '') + ' changed and not committed (' + changed.slice(0, 3).map((l) => l.slice(3)).join(', ') + (changed.length > 3 ? ', …' : '') + '): not live');
  return out;
}

// every file against the pushed one: [] when the site matches
async function compare(site, want) {
  const bad = [];
  await Promise.all(want.files.map(async (f) => {
    let r;
    try { r = await L.fetchSite(site + f, { fresh: true }); } catch (e) { bad.push(f + ': could not fetch (' + L.short(e.cause || e) + ')'); return; }
    if (r.status !== 200) { bad.push(f + ': HTTP ' + r.status); return; }
    const type = r.headers['content-type'] || '';
    const ext = path.extname(f).toLowerCase();
    if (TYPES[ext] && !TYPES[ext].test(type)) bad.push(f + ': served as "' + type + '"');
    const id = want.id(f);
    if (id && blobId(r.body) !== id) bad.push(f + ': differs from ' + (want.ref || 'the file on disk'));
  }));
  return bad.sort();
}

module.exports = {
  name: 'live',
  about: 'the published site: every app file served, the same as origin/app, right types; then welcome, onboarding, plan, sheet, player, a session link, Personal',
  timeout: 900,
  async run(t) {
    const site = t.opts.site || L.SITE;
    const want = expected();
    t.note(site + ' against ' + want.about);
    for (const n of unpublished(want.ref, want.files)) t.note(n);

    let online = true;
    await t.flow('files', async () => {
      try { await L.fetchSite(site, { fresh: true }); } catch (e) {
        online = false;
        throw new Error('cannot reach ' + site + ': ' + L.short(e.cause || e) + '. Offline? (In a sandbox, Node needs NODE_EXTRA_CA_CERTS set to the proxy CA.)');
      }
      let bad = await compare(site, want);
      // a push takes a minute or two to go live: --wait polls until the site matches
      const until = Date.now() + (t.opts.wait || 0) * 60000;
      while (bad.length && Date.now() < until) {
        t.log('waiting for the deploy: ' + bad.length + ' file(s) differ');
        await new Promise((r) => setTimeout(r, 20000));
        bad = await compare(site, want);
      }
      for (const b of bad) t.fail(b);
      if (bad.some((b) => /differs/.test(b))) t.note('files differ: Pages may still be deploying the last push (rerun with --wait), or the push did not happen');
      const sw = await L.fetchSite(site + 'sw.js');
      const live = (/const\s+VERSION\s*=\s*'([^']+)'/.exec(sw.body.toString('utf8')) || [])[1];
      t.equal(live, want.version, 'sw.js VERSION on the site');
      // the page itself: the folder address serves the app (not a Jekyll page of the README), and without the slash it redirects
      const home = await L.fetchSite(site);
      t.check(home.status === 200 && /<main id="app"/.test(home.body.toString('utf8')), site + ' does not serve the app\'s index.html (HTTP ' + home.status + '): check Pages (branch app, folder /, .nojekyll)');
      if (new URL(site).pathname !== '/') {
        const bare = await L.fetchSite(site.replace(/\/$/, ''));
        t.check([301, 302, 307, 308].includes(bare.status) && /\/$/.test(bare.headers.location || ''), site.replace(/\/$/, '') + ' (no slash) should redirect to ' + site + ', got HTTP ' + bare.status);
      }
      t.log(want.files.length + ' files checked');
    });
    if (!online) return;

    await t.flow('welcome and onboarding', async () => {
      const p = await t.page({ site, url: '' });
      await t.look(p, 'welcome on the site');
      t.has(await app.text(p), 'Your personal plan', 'welcome');
      t.equal(await app.title(p), 'Wellness by Frank', 'page title');
      await app.tap(p, '[data-act="ob-start"]');
      t.has(await app.text(p), "What's your main goal?", 'onboarding');
      await app.tap(p, '[data-act="ob-pick"][data-k="goal"][data-v="fit"]');
      t.has(await app.text(p), 'What year were you born?', 'onboarding after picking a goal (the fast start: the year of birth next)');
      await t.look(p, 'onboarding on the site');
    });

    await t.flow('member: plan, sheet, player', async () => {
      const p = await t.page({ site, url: '', state: L.member() });
      await app.waitTitle(p, 'Plan');
      t.has(await app.text(p), 'Start day 1', 'plan');
      await t.look(p, 'plan on the site');
      await p.evaluate(() => WBF.app.sheet('squat'));
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="muscle"]');
      await t.look(p, 'exercise sheet muscle on the site');
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      await app.tap(p, '[data-act="start-day"][data-day="1"]');
      await app.waitTitle(p, 'Workout');
      await app.tap(p, '[data-act="pl-skip"]');
      await t.look(p, 'player on the site');
      const moving = await p.evaluate(async () => {
        const c = document.querySelector('.pl-fig canvas'); if (!c) return false;
        const a = c.toDataURL(); await new Promise((r) => setTimeout(r, 700)); return a !== c.toDataURL();
      });
      t.check(moving, 'player: the 3D coach is not moving');
    });

    await t.flow('session link', async () => {
      const p = await t.page({ site, url: '', hash: 'frank.' + L.pack(L.spec({ i: 'qa-live', t: 'Live check' })) });
      await app.waitHeading(p, 'Live check');
      t.has(await app.text(p), 'From Frank', 'session from a link');
      await t.look(p, 'session link on the site');
    });

    await t.flow('personal prototype', async () => {
      const p = await t.page({ site, url: 'personal/', threeD: false });
      t.has(await app.text(p), 'Prototype', 'personal/');
      await t.look(p, 'personal on the site', { threeD: false, figures: false });
    });
  }
};

if (require.main === module) L.main([module.exports]);
