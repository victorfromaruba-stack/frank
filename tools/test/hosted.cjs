// hosted: the app as GitHub Pages serves it, under /frank/ with 10-minute caching and the service worker on.
// Nothing from other sites, no 404s, fonts and the worker stay inside /frank/, the install manifest, opening with
// no network, and a new deploy (a VERSION bump) reaching a phone that has the app.
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { app } = L;

const swReady = (p) => p.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
const cacheKeys = (p) => p.evaluate(() => caches.keys());

module.exports = {
  name: 'hosted',
  about: 'served under /frank/ like GitHub Pages: no outside requests or 404s, fonts and service worker inside /frank/, manifest, opens offline, a new deploy reaches installed phones',
  fresh: true,
  timeout: 420,
  async run(t) {
    const srv = await L.serve({ prefix: '/frank/', cache: 'max-age=600' });       // what Pages sends
    const home = srv.home;
    const sw = fs.readFileSync(path.join(L.REPO, 'sw.js'), 'utf8');
    const version = (/VERSION\s*=\s*'([^']+)'/.exec(sw) || [])[1];
    const shell = (/SHELL\s*=\s*(\[[\s\S]*?\]);/.exec(sw) || [])[1];
    try {
      await t.flow('online', async () => {
        const p = await t.page({ server: srv, sw: true, href: srv.url + '/frank' });
        t.equal(p.url(), home, 'address after opening /frank');
        t.has(await app.text(p), 'Your personal plan', 'welcome');
        const fonts = await p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\.woff2/.test(n)));
        t.check(fonts.length && fonts.every((f) => f.startsWith(home + 'fonts/')), 'fonts should come from /frank/fonts/, got: ' + fonts.join(', '));
        t.equal(await swReady(p), home, 'service worker scope');
        const man = await p.evaluate(async () => {
          const href = document.querySelector('link[rel=manifest]').href, m = await (await fetch(href)).json();
          return { start: new URL(m.start_url, href).href, scope: new URL(m.scope, href).href, icons: m.icons.map((i) => new URL(i.src, href).href) };
        });
        t.equal([man.start, man.scope], [home, home], 'manifest start_url and scope');
        for (const icon of man.icons) t.equal(await p.evaluate((u) => fetch(u).then((r) => r.status), icon), 200, 'icon ' + icon.slice(home.length));
        t.step('second visit');
        await p.reload(); await L.settle(p);
        t.check(await p.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker does not control the page on the second visit');
        t.equal(await cacheKeys(p), [version], 'offline caches');
        const cached = await p.evaluate((v) => caches.open(v).then((c) => c.keys()).then((k) => k.map((r) => r.url)), version);
        const want = shell ? JSON.parse(shell.replace(/'/g, '"')).map((f) => new URL(f, home).href) : [];
        t.equal(want.filter((u) => !cached.includes(u)).map((u) => u.slice(home.length)), [], 'files missing from the offline cache');

        t.step('offline');
        await p.context().setOffline(true);
        await p.reload(); await L.settle(p);
        t.has(await app.text(p), 'Your personal plan', 'welcome offline');
        await t.look(p, 'welcome offline');
        // with a plan: the tabs, an exercise sheet and a workout work without a network
        await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [L.KEY, L.member()]);
        await p.reload(); await L.settle(p);
        await app.waitTitle(p, 'Plan');
        await t.look(p, 'plan offline');
        await p.evaluate(() => WBF.app.sheet('squat', 'muscle'));
        await t.look(p, 'exercise sheet offline');
        await app.tap(p, '#overlay .xs-foot [data-act="close"]');
        await app.tap(p, '[data-act="start-day"]');
        await app.waitTitle(p, 'Workout');
        await app.tap(p, '[data-act="pl-skip"]');
        await t.look(p, 'player offline');
        t.step('a session link offline');
        await p.goto(home + '#frank.' + L.pack(L.spec({ i: 'qa-off', t: 'Offline session' })));
        await app.waitHeading(p, 'Offline session');
        await p.context().setOffline(false);
      });

      await t.flow('a new deploy reaches the phone', async () => {
        const p = await t.page({ server: srv, sw: true, href: home });
        await swReady(p);
        await p.reload(); await L.settle(p);                     // installed and in control, as on a phone
        // the deploy: a changed app.js and a new VERSION, as a push to the app branch would bring
        const next = version + '-qa';
        srv.overlay['sw.js'] = sw.replace("'" + version + "'", "'" + next + "'");
        srv.overlay['js/app.js'] = fs.readFileSync(path.join(L.REPO, 'js/app.js'), 'utf8') + '\nwindow.__qaDeploy = "' + next + '";\n';
        await p.reload(); await L.settle(p);                     // the browser finds the new sw.js and installs it
        await p.waitForFunction((v) => caches.keys().then((k) => k.length === 1 && k[0] === v), next, { timeout: 30000, polling: 250 })
          .catch(async () => { throw new Error('the new service worker never took over (caches: ' + (await cacheKeys(p)).join(', ') + ')'); });
        let got = null;
        for (let i = 0; i < 2 && got !== next; i++) { await p.reload(); await L.settle(p); got = await p.evaluate(() => window.__qaDeploy || null); }
        t.check(got === next, 'two reloads after the new service worker took over, the phone still runs the old js/app.js');
      });

      await t.flow('personal prototype', async () => {
        const q = await t.page({ server: srv, sw: true, href: home + 'personal/', threeD: false });
        t.has(await app.text(q), 'Prototype', 'personal/');
        await t.look(q, 'personal under /frank/', { threeD: false, figures: false });
      });
    } finally {
      delete srv.overlay['sw.js']; delete srv.overlay['js/app.js'];
      if (srv.missing.length) t.fail('404s: ' + [...new Set(srv.missing)].join(', '));
      await srv.close();
    }
  }
};

if (require.main === module) L.main([module.exports]);
