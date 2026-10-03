// static: checks that need no browser. Syntax, the plan rules, the offline file list and its VERSION, the install
// manifest, nothing loaded from other sites, no GPL code, no secrets or plain client codes in the repo.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const L = require('./lib.cjs');

const R = L.REPO;
const read = (f) => fs.readFileSync(path.join(R, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(R, f));
const list = (dir, re) => (exists(dir) ? fs.readdirSync(path.join(R, dir)).filter((f) => re.test(f)).map((f) => dir + '/' + f) : []);
const git = (args) => { try { return cp.execFileSync('git', args, { cwd: R, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { return null; } };
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// the offline lists and VERSION of a sw.js source: SHELL is kept at install, LAZY the first time the app uses it
function swInfo(src) {
  const m = /const\s+SHELL\s*=\s*(\[[\s\S]*?\]);/.exec(src), z = /const\s+LAZY\s*=\s*(\[[\s\S]*?\]);/.exec(src), v = /const\s+VERSION\s*=\s*'([^']+)'/.exec(src);
  return { shell: m ? vm.runInNewContext(m[1]) : null, lazy: z ? vm.runInNewContext(z[1]) : [], version: v ? v[1] : null };
}
function png(file) {
  const b = fs.readFileSync(path.join(R, file));
  return b.toString('ascii', 1, 4) === 'PNG' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
}

module.exports = {
  name: 'static',
  about: 'syntax, tools/check-plans.cjs, the offline file list and its VERSION bump, every js file loaded and kept offline (modules before app.js), the manifest, no outside loads, no GPL, no secrets',
  async run(t) {
    await t.flow('syntax', async () => {
      const files = [...list('js', /\.js$/), 'sw.js', ...list('personal', /\.js$/), ...list('tools', /\.(mjs|cjs|js)$/), ...list('tools/test', /\.cjs$/),
        ...list('.claude/skills/frank-module', /\.js$/)];
      for (const f of files) {
        try { cp.execFileSync(process.execPath, ['--check', path.join(R, f)], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) {
          t.fail(f + ': ' + String(e.stderr || e.message).split('\n').filter(Boolean).slice(0, 4).join(' | '));
        }
      }
      t.log(files.length + ' files');
    });

    await t.flow('plan rules', async () => {
      try { cp.execFileSync(process.execPath, [path.join(R, 'tools/check-plans.cjs')], { cwd: R, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) {
        t.fail('tools/check-plans.cjs failed: ' + String(e.stdout || '').trim().split('\n').slice(-6).join(' | '));
      }
    });

    await t.flow('offline files (sw.js)', async () => {
      const sw = swInfo(read('sw.js'));
      if (!t.check(sw.shell && sw.version, 'sw.js: could not read SHELL and VERSION')) return;
      for (const f of sw.shell) if (f !== './' && !exists(f)) t.fail('sw.js lists ' + f + ', which does not exist: installing the app offline fails');
      for (const f of sw.lazy) {
        if (!exists(f)) t.fail('sw.js LAZY lists ' + f + ', which does not exist');
        if (sw.shell.includes(f)) t.fail(f + ' is in both SHELL and LAZY in sw.js: keep it in one');
      }
      // everything the page needs to start must be in the offline list
      const html = read('index.html');
      const need = new Set();
      for (const m of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"#:]+)"/g)) need.add(m[1].replace(/^\.\//, ''));
      for (const m of html.matchAll(/(?:from\s+|"three"\s*:\s*)['"](\.\/[^'"]+)['"]/g)) need.add(m[1].replace(/^\.\//, ''));
      const appJs = js => stripComments(read(js));
      for (const f of list('js', /\.js$/)) {
        for (const m of appJs(f).matchAll(/['"](?:\.\/)?((?:img|assets|fonts|vendor|media)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|svg|glb|woff2|js|css|mp4))['"]/g)) need.add(m[1]);
      }
      for (const f of need) {
        if (!exists(f)) t.fail(f + ' is used by the app but does not exist');
        else if (!sw.shell.includes(f) && !sw.lazy.includes(f) && !/^img\/icon-(180|192)\.png$|^media\//.test(f)) t.fail(f + ' is used by the app but missing from SHELL and LAZY in sw.js: it breaks offline');
        // a picture the screens show comes at install: kept only once used, it is broken offline on a phone that never
        // opened its screen online
        else if (/^img\//.test(f) && sw.lazy.includes(f)) t.fail(f + ' is shown by the app but is LAZY in sw.js: offline, a phone that never opened its screen online shows it broken. Put it in SHELL');
      }
      // a font loads when a letter needs it, maybe for the first time offline: every font is kept at install
      for (const m of read('fonts/fonts.css').matchAll(/url\(([^)]+)\)/g)) {
        const f = 'fonts/' + m[1].replace(/['"]/g, '');
        if (!exists(f)) t.fail('fonts/fonts.css: ' + m[1] + ' does not exist');
        else if (!sw.shell.includes(f)) t.fail(f + ' is missing from SHELL in sw.js: offline, a name like Łucja shows in another font');
      }

      // a changed cached file needs a new VERSION, or installed phones keep the old one
      const base = git(['rev-parse', '--verify', '--quiet', 'origin/app']) ? 'origin/app' : git(['rev-parse', '--verify', '--quiet', 'HEAD']) ? 'HEAD' : null;
      if (!base) { t.note('not a git checkout: VERSION bump not checked'); return; }
      const files = sw.shell.concat(sw.lazy).filter((f) => f !== './');
      const changed = (git(['diff', '--name-only', base, '--', ...files]) || '').split('\n').filter(Boolean);
      const untracked = (git(['ls-files', '--others', '--exclude-standard', '--', ...files]) || '').split('\n').filter(Boolean);
      const old = swInfo(git(['show', base + ':sw.js']) || '');
      const all = changed.concat(untracked);
      if (all.length && old.version === sw.version) {
        t.fail('cached files changed since ' + base + ' (' + all.slice(0, 6).join(', ') + (all.length > 6 ? ', …' : '') + ') but sw.js VERSION is still ' + sw.version + ': bump it so installed phones update');
      } else if (all.length) t.note('VERSION ' + old.version + ' → ' + sw.version + ' for ' + all.length + ' changed cached file' + (all.length > 1 ? 's' : ''));
    });

    await t.flow('modules: every js file loads and is kept offline', async () => {
      // A feature lives in a js/<feature>.js that queues its start on WBF.ext (.claude/skills/frank-module): index.html
      // loads it before js/app.js, which starts the queue, and SHELL in sw.js keeps it. tools/build.mjs packs what
      // index.html loads, so a file left out of index.html is left out of the app everywhere
      const sw = swInfo(read('sw.js'));
      const loads = [...read('index.html').replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*?\bsrc\s*=\s*["']?([^"'\s>]+)/g)].map((m) => m[1].replace(/^\.\//, ''));
      const appAt = loads.indexOf('js/app.js');
      t.check(appAt !== -1, 'index.html does not load js/app.js');
      for (const f of loads) if (!/^js\/[\w.-]+\.js$/.test(f)) t.fail('index.html loads ' + f + ' with <script src>: tools/build.mjs packs only js/*.js files, so the single-file builds stop');
      for (const f of list('js', /\.js$/)) {
        if (!loads.includes(f)) t.fail(f + ' is not loaded by index.html: add <script src="' + f + '"></script> before js/app.js');
        else if (f !== 'js/app.js' && /\bWBF\.ext\b|\bext\.push\(/.test(stripComments(read(f))) && loads.indexOf(f) > appAt) t.fail(f + ' is a module, but index.html loads it after js/app.js: it misses the start (boot) and the first screen');
        if (sw.shell && !sw.shell.includes(f)) t.fail(f + ' is missing from SHELL in sw.js: the app breaks offline without it');
      }
      t.log(loads.length + ' scripts: ' + loads.join(', '));
    });

    await t.flow('install manifest', async () => {
      let m = null;
      try { m = JSON.parse(read('manifest.webmanifest')); } catch (e) { t.fail('manifest.webmanifest is not valid JSON: ' + e.message); return; }
      t.equal([m.start_url, m.scope, m.display], ['./', './', 'standalone'], 'manifest start_url, scope, display (relative, so /frank/ works)');
      for (const k of ['name', 'short_name', 'theme_color', 'background_color']) t.check(m[k], 'manifest has no ' + k);
      for (const i of m.icons || []) {
        if (!exists(i.src)) { t.fail('manifest icon ' + i.src + ' does not exist'); continue; }
        const d = png(i.src), want = i.sizes.split('x').map(Number);
        t.check(d && d.w === want[0] && d.h === want[1], 'manifest icon ' + i.src + ' is ' + (d ? d.w + 'x' + d.h : 'not a PNG') + ', the manifest says ' + i.sizes);
      }
      t.check((m.icons || []).some((i) => /maskable/.test(i.purpose || '')), 'manifest has no maskable icon');
    });

    await t.flow('nothing from other sites', async () => {
      const pages = ['index.html', 'personal/index.html', 'app.css', 'fonts/fonts.css', ...list('personal', /\.css$/)];
      for (const f of pages) {
        const src = read(f);
        for (const m of src.matchAll(/<(?:script|link|img|iframe|video|source)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]+"/gi)) t.fail(f + ' loads ' + m[0].slice(0, 100));
        for (const m of src.matchAll(/(?:url\(\s*['"]?|@import\s+['"])(https?:)?\/\/[^)'"]+/gi)) t.fail(f + ' loads ' + m[0].slice(0, 100));
      }
      for (const f of [...list('js', /\.js$/), ...list('personal', /\.js$/), 'sw.js']) {
        const src = stripComments(read(f));
        for (const m of src.matchAll(/<(?:script|img|iframe|video|source|link)\b[^>'"]*\b(?:src|href)=\\?["'](https?:)?\/\/[^"'\\]+/gi)) t.fail(f + ' builds ' + m[0].slice(0, 100));
        for (const m of src.matchAll(/\b(?:fetch|importScripts|import)\s*\(\s*['"](https?:)?\/\/[^'"]+/g)) t.fail(f + ' fetches ' + m[0].slice(0, 100));
      }
    });

    await t.flow('licences', async () => {
      const dirs = ['js', 'vendor', 'personal', 'assets', 'fonts'];
      const files = [];
      const walk = (d) => { for (const e of fs.readdirSync(path.join(R, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(js|mjs|css|html|txt|md)$/.test(e.name)) files.push(p); } };
      dirs.filter(exists).forEach(walk);
      for (const f of files) if (/GNU (Lesser |Affero )?General Public License|\bL?A?GPL-?[23]/.test(read(f))) t.fail(f + ' mentions a GPL licence: the app is sold, so no GPL code');
    });

    await t.flow('secrets and plain client codes', async () => {
      const tracked = (git(['ls-files']) || '').split('\n').filter((f) => f && /\.(js|cjs|mjs|json|html|css|md|txt|webmanifest|sh|py|ya?ml|env)$/i.test(f));
      const SECRET = /\b(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|\d{8,10}:AA[A-Za-z0-9_-]{30,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
      for (const f of tracked) {
        if (!exists(f)) continue;
        const lines = read(f).split('\n');
        lines.forEach((l, i) => { if (SECRET.test(l)) t.fail(f + ':' + (i + 1) + ' looks like a secret (key or token): remove it and tell the owner'); });
      }
      if (exists('.env')) t.fail('a .env file is in the repo folder');
      // FRANK.codes must hold SHA-256 hashes only, so codes can't be read in the public repo
      const ctx = { document: { addEventListener() {}, hidden: false } };
      ctx.window = ctx;
      vm.createContext(ctx);
      for (const f of ['js/figure.js', 'js/exercises.js', 'js/programs.js']) vm.runInContext(read(f), ctx, { filename: f });
      const FR = ctx.WBF.FRANK, B = ctx.WBF.BILLING;
      for (const c of FR.codes || []) t.check(/^[0-9a-f]{64}$/.test(c), 'FRANK.codes holds "' + String(c).slice(0, 6) + '…", not a SHA-256 hash: use node tools/client-code.mjs <code>');
      // the same for Frank's coach code, which opens Coach tools
      t.check((FR.coachCodes || []).length, 'FRANK.coachCodes is empty: nobody can open Coach tools');
      for (const c of FR.coachCodes || []) t.check(/^[0-9a-f]{64}$/.test(c), 'FRANK.coachCodes holds "' + String(c).slice(0, 6) + '…", not a SHA-256 hash: use node tools/client-code.mjs --coach <code>');
      if (FR.whatsapp) t.note('FRANK.whatsapp is set (' + FR.whatsapp.replace(/\d(?=\d{3})/g, '•') + '): only with Frank\'s yes');
      if (B.paymentLink) t.note('BILLING.paymentLink is set: payments are live for members');
      const month = (B.plans || []).find((p) => p.id === 'month');
      t.check(month && month.price === '€15', 'the monthly price is no longer €15 (decided with Frank): ' + (month && month.price));
      // the price screen shows only plans with approved: true (Frank's yes)
      t.check(month && month.approved === true, 'the monthly plan has no approved: true, so the price screen hides it');
    });
  }
};

if (require.main === module) L.main([module.exports]);
