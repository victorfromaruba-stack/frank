// hosted: the app as GitHub Pages serves it, under /frank/ with 10-minute caching, ETags and the service worker on.
// Nothing from other sites, no 404s, fonts and the worker stay inside /frank/, the install manifest; a first visit that
// lets the coach load first and downloads each file once; opening with no network (the server off, so the worker can't
// fetch what it should have kept), also straight after a first visit: the tabs, Frank's photos, shared links, the other
// coach; a phone without the 3D coach; a new deploy (a VERSION bump) reaching a phone that has the app, and an open app
// offering it on Plan, Today and Me only.
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { app } = L;

const PREFIX = '/frank/';
const swReady = (p) => p.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
const cacheKeys = (p) => p.evaluate(() => caches.keys());
// what a cache holds, as paths inside /frank/ ('' is the folder itself)
const cached = (p, v) => p.evaluate((k) => caches.open(k).then((c) => c.keys()).then((r) => r.map((x) => new URL(x.url).pathname + new URL(x.url).search)), v)
  .then((l) => l.map((u) => u.slice(PREFIX.length)));
// until fn, run in the page, answers yes (it may answer with a promise: waitForFunction doesn't wait for those); false
// when the time is up
async function until(p, fn, arg, timeout = 15000) {
  for (const end = Date.now() + timeout; ;) {
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
    if (Date.now() > end) return false;
    await p.waitForTimeout(200);
  }
}
const isCached = (p, file) => until(p, (f) => caches.match(f).then(Boolean), file);
// the phone locked (true) or unlocked (false): what the page sees when the screen goes off or another app opens
const locked = (p, on) => p.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, on);
// runs in the page before the app: when it registers the service worker, and whether the 3D coach was in by then
function watchRegister() {
  if (!window.ServiceWorkerContainer) return;             // the browser's own error page
  const reg = ServiceWorkerContainer.prototype.register;
  ServiceWorkerContainer.prototype.register = function () {
    if (!window.__qaSw) window.__qaSw = { ms: Math.round(performance.now()), coach: !!(window.WBF && WBF.fig3d && WBF.fig3d.ready()) };
    return reg.apply(this, arguments);
  };
}
// No network: the server off (the worker's own requests don't see setOffline) and the browser's HTTP cache emptied, as
// it is once Pages' 10 minutes are over, so only what the worker kept can answer. The function it returns brings the
// network back and lists the page's requests that failed in between: files the worker didn't keep. The worker's own
// refresh of each file fails too, out of the page's sight, and a request the next screen or page cut short
// (ERR_ABORTED) isn't a missing file. Nor is a clip or still in media/: they aren't kept offline, and the app shows
// the coach in their place (coachOffline checks that).
async function offline(p, srv) {
  const failed = [];
  const seen = (r) => {
    const why = (r.failure() || {}).errorText || '';
    const line = r.url().replace(srv.home, '') + ' (' + why + ')';
    if (!/ERR_ABORTED/.test(why) && !/\/media\/[^/]+$/.test(r.url()) && !failed.includes(line)) failed.push(line);
  };
  await srv.stop();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  await p.context().setOffline(true);
  p.on('requestfailed', seen);
  return async () => {
    p.off('requestfailed', seen);
    await p.context().setOffline(false);
    await srv.start();
    return failed;
  };
}
// Offline, no clip and no still in its place: the coach. The app doesn't ask for them when the phone says it's offline,
// and shows the coach when one doesn't load (Chromium's offline mode doesn't always reach navigator.onLine after a
// reload, so here both happen).
async function coachOffline(t, p, label) {
  const broken = () => p.evaluate(() => [...document.querySelectorAll('[data-fig] video')].map((v) => v.getAttribute('src'))
    .concat([...document.querySelectorAll('[data-thumb] img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src'))));
  await until(p, () => !document.querySelector('[data-fig] video') && ![...document.querySelectorAll('[data-thumb] img')].some((i) => i.complete && !i.naturalWidth), null, 5000);
  t.equal(await broken(), [], label + ': clips or stills offline (the coach goes in their place)');
}
// From Plan: Workouts, one of Frank's programs and Frank, the screens with his photos (img/wellness-*.jpg)
async function photosOffline(t, p) {
  await app.tap(p, '.tab[data-tab="workouts"]');
  await app.waitTitle(p, 'Workouts');
  await t.look(p, 'workouts offline');
  await coachOffline(t, p, 'workouts offline');
  await app.tap(p, '[data-act="open-workout"][data-id="essentials"]');
  await app.waitTitle(p, 'Essentials');
  await t.look(p, 'a program offline');
  await coachOffline(t, p, 'a program offline');
  await app.tap(p, '[data-act="back"]');
  await app.waitTitle(p, 'Workouts');
  await app.tap(p, '.tab[data-tab="frank"]');
  await app.waitTitle(p, 'Frank');
  await t.look(p, 'frank offline');
}

module.exports = {
  name: 'hosted',
  about: 'served under /frank/ like GitHub Pages: no outside requests or 404s, fonts and service worker inside /frank/, manifest, a first visit that downloads each file once, every tab offline (right after a first visit too) and from shared links, a new deploy reaches installed and open phones',
  fresh: true,
  timeout: 420,
  async run(t) {
    const srv = await L.serve({ prefix: PREFIX, cache: 'max-age=600', etag: true });       // what Pages sends
    const home = srv.home;
    const sw = fs.readFileSync(path.join(L.REPO, 'sw.js'), 'utf8');
    const appJs = fs.readFileSync(path.join(L.REPO, 'js/app.js'), 'utf8');
    const version = (/VERSION\s*=\s*'([^']+)'/.exec(sw) || [])[1];
    const list = (name) => { const m = new RegExp('\\b' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);').exec(sw); return m ? JSON.parse(m[1].replace(/'/g, '"')) : []; };
    const shell = list('SHELL').map((f) => (f === './' ? '' : f)), lazy = list('LAZY');
    // a deploy, as a push to the app branch brings it: a changed js/app.js and a new VERSION
    const deploy = (tag) => {
      const next = version + tag;
      srv.overlay['sw.js'] = sw.replace("'" + version + "'", "'" + next + "'");
      srv.overlay['js/app.js'] = appJs + '\nwindow.__qaDeploy = "' + next + '";\n';
      return next;
    };
    const undeploy = () => { delete srv.overlay['sw.js']; delete srv.overlay['js/app.js']; };
    t.check(version && shell.length && lazy.length, 'sw.js: could not read VERSION, SHELL and LAZY');
    try {
      await t.flow('online', async () => {
        const from = srv.hits.length;
        const p = await t.page({ server: srv, sw: true, go: false });
        await p.addInitScript(watchRegister);
        await p.goto(srv.url + '/frank'); await L.settle(p);
        t.equal(p.url(), home, 'address after opening /frank');
        t.has(await app.text(p), 'Your personal plan', 'welcome');
        const fonts = await p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\.woff2/.test(n)));
        t.check(fonts.length && fonts.every((f) => f.startsWith(home + 'fonts/')), 'fonts should come from /frank/fonts/, got: ' + fonts.join(', '));
        t.equal(await swReady(p), home, 'service worker scope');
        // a first visit: the coach first, then the worker; each file comes once, and nothing the visit doesn't show
        const reg = await p.evaluate(() => window.__qaSw || null);
        t.check(reg && reg.coach, () => 'the service worker was registered before the 3D coach was in (' + JSON.stringify(reg) + '): a first visit downloads the app twice at once');
        const got = srv.hits.slice(from).filter((h) => h.status === 200).map((h) => h.url.slice(PREFIX.length));
        t.equal(got.filter((u, i) => got.indexOf(u) !== i), [], 'files the first visit downloaded twice');
        t.equal(got.filter((u) => lazy.includes(u)), [], 'files the first visit downloaded without showing them (LAZY in sw.js)');
        // on top of what the page loaded, the worker adds the SHELL files it hasn't used yet: small ones and Frank's
        // photos (about 110 KB), never a coach
        const used = ['', ...(await p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name)))].map((u) => (u ? u.slice(home.length) : u));
        const extra = got.filter((u) => !used.includes(u));
        const kb = Math.round(extra.reduce((a, u) => a + fs.statSync(path.join(L.REPO, u || 'index.html')).size, 0) / 1024);
        t.check(kb < 250, () => 'the first visit downloaded ' + kb + ' KB it does not show: ' + extra.join(', '));
        const man = await p.evaluate(async () => {
          const href = document.querySelector('link[rel=manifest]').href, m = await (await fetch(href)).json();
          return { start: new URL(m.start_url, href).href, scope: new URL(m.scope, href).href, icons: m.icons.map((i) => new URL(i.src, href).href) };
        });
        t.equal([man.start, man.scope], [home, home], 'manifest start_url and scope');
        // the app's identity as Chromium works it out: the folder, as before ids (a "./" id would be the site's root, and
        // every phone that installed the app would be offered it again as another app)
        const cdp = await p.context().newCDPSession(p);
        const parsed = await cdp.send('Page.getAppManifest').catch((e) => ({ error: String(e) }));
        await cdp.detach().catch(() => null);
        t.equal(parsed.manifest ? parsed.manifest.id : JSON.stringify(parsed.errors || parsed.error || parsed), home, "the app's identity (the manifest id Chromium reads)");
        for (const icon of man.icons) t.equal(await p.evaluate((u) => fetch(u).then((r) => r.status), icon), 200, 'icon ' + icon.slice(home.length));
        t.step('second visit');
        await p.reload(); await L.settle(p);
        t.check(await p.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker does not control the page on the second visit');
        t.equal(await cacheKeys(p), [version], 'offline caches');
        const have = await cached(p, version);
        t.equal(shell.filter((f) => !have.includes(f)), [], 'files missing from the offline cache');
        t.step('a shared link');
        await p.goto(home + '?utm_source=ig&utm_medium=social'); await L.settle(p);
        t.has(await app.text(p), 'Your personal plan', 'welcome from a shared link');
        t.equal((await cached(p, version)).filter((f) => f.includes('?')), [], 'shared links kept as more copies of the page');

        t.step('offline');
        const online = await offline(p, srv);
        try {
          await p.reload(); await L.settle(p);
          t.has(await app.text(p), 'Your personal plan', 'welcome offline');
          await t.look(p, 'welcome offline');
          // with a plan: the tabs, an exercise sheet and a workout work without a network
          await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [L.KEY, L.member()]);
          await p.reload(); await L.settle(p);
          await app.waitTitle(p, 'Plan');
          await t.look(p, 'plan offline');
          await coachOffline(t, p, 'plan offline');
          await p.evaluate(() => WBF.app.sheet('squat', 'muscle'));
          await t.look(p, 'exercise sheet offline');
          await app.tap(p, '#overlay .xs-foot [data-act="close"]');
          await app.tap(p, '[data-act="start-day"]');
          await app.waitTitle(p, 'Workout');
          await app.tap(p, '[data-act="pl-skip"]');
          await t.look(p, 'player offline');
          await coachOffline(t, p, 'player offline');
          t.step('a session link offline');
          await p.goto(home + '#frank.' + L.pack(L.spec({ i: 'qa-off', t: 'Offline session' })));
          await app.waitHeading(p, 'Offline session');
          await L.settle(p);                                     // a whole page load (the address had a query): let the coach finish
          // links shared on Instagram, Facebook or WhatsApp carry a query the cache has never seen
          t.step('shared links offline');
          for (const q of ['?fbclid=IwAR0qa', '?utm_source=ig', 'index.html?utm_source=wa']) {
            await p.goto(home + q); await L.settle(p);
            await app.waitTitle(p, 'Plan');
          }
          await t.look(p, 'plan from a shared link offline');
          // Frank's photos, on screens this phone never opened online
          t.step('Frank\'s photos offline');
          await photosOffline(t, p);
        } finally {
          t.equal(await online(), [], 'requests that failed offline');
        }
      });

      // the worker takes over during the first visit and the phone goes offline right after: the tabs work, with Frank's
      // photos on screens the visit never opened. A member, and a client who came by Frank's link (no onboarding, so no
      // "Meet your coach" with his photo)
      const link = '#frank.' + L.pack(L.spec({ i: 'qa-first', t: 'First session' }));
      for (const who of ['a member', 'a client from a link']) {
        await t.flow('a first visit, then no network: ' + who, async () => {
          const client = who !== 'a member';
          const p = await t.page({ server: srv, sw: true, href: home + (client ? link : ''), state: client ? L.state() : L.member() });
          if (!(await until(p, () => !!navigator.serviceWorker.controller, null, 30000))) throw new Error('the service worker did not take over the first visit');
          const online = await offline(p, srv);
          try {
            if (client) {
              await p.goto('about:blank');                       // the app closed, then the link opened again
              await p.goto(home + link);
              await app.waitHeading(p, 'First session');
              await L.settle(p);
              await app.tap(p, '[data-act="back"]');
            } else {
              await p.reload(); await L.settle(p);
            }
            await app.waitTitle(p, 'Plan');
            await photosOffline(t, p);
          } finally {
            t.equal(await online(), [], 'requests that failed offline');
          }
        });
      }

      await t.flow('a new deploy reaches the phone', async () => {
        // she trains with the female coach (LAZY): kept once her phone has used it, and by the next version too
        const p = await t.page({ server: srv, sw: true, href: home, state: L.member({ sex: 'f' }) });
        await swReady(p);
        await p.reload(); await L.settle(p);                     // installed and in control, as on a phone
        await p.waitForFunction(() => WBF.fig3d.coach() === 'f', null, { timeout: 30000 });
        t.check(await isCached(p, 'assets/coach-f.glb'), 'before the deploy: the coach she uses (assets/coach-f.glb) was not kept for offline');
        try {
          const next = deploy('-qa');
          await p.reload(); await L.settle(p);                   // the browser finds the new sw.js and installs it
          if (!(await until(p, (v) => caches.keys().then((k) => k.length === 1 && k[0] === v), next, 30000))) {
            throw new Error('the new service worker never took over (caches: ' + (await cacheKeys(p)).join(', ') + ')');
          }
          const kept = await cached(p, next);
          t.equal(lazy.filter((f) => kept.includes(f)), ['assets/coach-f.glb'], 'LAZY files in the new version\'s cache (only the one this phone used)');
          await p.reload(); await L.settle(p);
          t.check((await p.evaluate(() => window.__qaDeploy || null)) === next, 'a reload after the new service worker took over, the phone still runs the old js/app.js');
        } finally { undeploy(); }
      });

      await t.flow('an open app finds a new version', async () => {
        const p = await t.page({ server: srv, sw: true, href: home, state: L.member() });
        await swReady(p);
        await p.reload(); await L.settle(p);                     // installed and in control
        await app.waitTitle(p, 'Plan');
        t.equal(await p.locator('#update-bar').count(), 0, 'update bars before a new version');
        await p.evaluate(() => { window.__qaTakeover = 0; navigator.serviceWorker.addEventListener('controllerchange', () => { window.__qaTakeover++; }); });
        try {
          // mid-workout the phone locks, a deploy goes out, the phone unlocks: the app looks for the new version
          await app.tap(p, '[data-act="start-day"]');
          await app.waitTitle(p, 'Workout');
          await locked(p, true);
          const next = deploy('-open');
          await locked(p, false);
          await p.waitForFunction(() => window.__qaTakeover > 0, null, { timeout: 30000, polling: 250 })
            .catch(() => { throw new Error('the open app never took the new version: no update check when it came back on screen'); });
          await p.waitForTimeout(300);
          t.equal(await p.locator('#update-bar').count(), 0, 'update bars in the workout');
          t.lacks(await app.text(p), 'New version ready', 'workout with a new version in');
          // after the workout, Plan, Today and Me offer it; the other tabs and the onboarding don't
          await app.tap(p, '[data-act="quit"]');
          await app.tap(p, '#overlay [data-act="modal-yes"]');
          await app.waitTitle(p, 'Plan');
          t.has(await app.text(p), 'New version ready', 'Plan after the workout');
          await t.look(p, 'plan with a new version');
          for (const [name, n] of [['workouts', 0], ['today', 1], ['frank', 0], ['me', 1]]) {
            await app.tap(p, '.tab[data-tab="' + name + '"]');
            t.equal(await p.locator('#update-bar').count(), n, 'update bars on ' + name);
          }
          await app.tap(p, '[data-act="flow-answers"]');
          await app.waitTitle(p, 'Your answers');
          t.equal(await p.locator('#update-bar').count(), 0, 'update bars on Your answers');
          await app.tap(p, '[data-row="goal"]');
          await app.waitTitle(p, 'Your plan');
          t.equal(await p.locator('#update-bar').count(), 0, 'update bars in the onboarding (Me, Your answers, Goal)');
          await app.tap(p, '[data-act="ob-back"]');
          await app.waitTitle(p, 'Your answers');
          await app.tap(p, '[data-act="back"]');
          await app.waitTitle(p, 'Me');
          // Update: the new version on screen, and no bar after it
          await Promise.all([p.waitForEvent('load'), app.tap(p, '#update-bar [data-act="sw-update"]')]);
          await L.settle(p);
          t.equal(await p.evaluate(() => window.__qaDeploy || null), next, 'js/app.js after Update');
          t.equal(await p.locator('#update-bar').count(), 0, 'update bars after Update');
        } finally { undeploy(); }
      });

      await t.flow('the other coach offline', async () => {
        // she trains with the female coach (LAZY): it loads before the worker takes over, and is kept all the same
        const p = await t.page({ server: srv, sw: true, href: home, state: L.member({ sex: 'f' }) });
        await swReady(p);
        await p.waitForFunction(() => WBF.fig3d.coach() === 'f', null, { timeout: 30000 });
        t.check(await isCached(p, 'assets/coach-f.glb'), 'the coach she uses (assets/coach-f.glb) was not kept for offline');
        const online = await offline(p, srv);
        try {
          await p.reload(); await L.settle(p);
          await app.waitTitle(p, 'Plan');
          await p.waitForFunction(() => WBF.fig3d.coach() === 'f', null, { timeout: 30000 })
            .catch(() => { throw new Error('offline, the female coach did not load'); });
          await t.look(p, 'plan offline with the female coach');
        } finally {
          t.equal(await online(), [], 'requests that failed offline');
        }
      });

      await t.flow('no 3D coach', async () => {
        // a phone that can't draw the coach shows the 2D figures; the worker comes 15 s after load all the same
        const p = await t.page({ server: srv, sw: true, go: false });
        await p.addInitScript(watchRegister);
        await p.route('**/assets/coach-*.glb', (r) => r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: 'not a model' }));
        await p.goto(home); await L.settle(p, { threeD: false });
        t.equal(await swReady(p), home, 'service worker scope without the 3D coach');
        const reg = await p.evaluate(() => window.__qaSw || null);
        t.check(reg && !reg.coach && reg.ms >= 15000, () => 'without the 3D coach, the worker should come 15 s after load, got: ' + JSON.stringify(reg));
        await t.look(p, 'welcome without the 3D coach', { threeD: false });
      });

      await t.flow('personal prototype', async () => {
        const q = await t.page({ server: srv, sw: true, href: home + 'personal/', threeD: false });
        t.has(await app.text(q), 'Prototype', 'personal/');
        await t.look(q, 'personal under /frank/', { threeD: false, figures: false });
      });
    } finally {
      undeploy();
      if (srv.missing.length) t.fail('404s: ' + [...new Set(srv.missing)].join(', '));
      await srv.close();
    }
  }
};

if (require.main === module) L.main([module.exports]);
