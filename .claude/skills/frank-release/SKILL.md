---
name: frank-release
description: Shipping Wellness by Frank to the live site, rolling a release back, and the one-time move to Frank's own domain. Use it whenever a change to Frank's app is about to be committed for a push to the app branch, when someone says ship, release, deploy, publish, push, go live or "put it on the site", when the live site or an installed phone shows something wrong or old ("roll back", "undo the last release", "phones still show the old version", "the update didn't arrive"), when you touch sw.js (VERSION, SHELL, LAZY) or add a file the app loads, and whenever Frank's own domain, a new host, Netlify, Cloudflare Pages or leaving GitHub Pages comes up, even if nobody says "release".
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: shipping, rolling back, moving

The `app` branch is the live site, https://victorfromaruba-stack.github.io/frank/, a
minute or two after a push, and Frank's clients have it on their phones. Installed
phones keep the app's files in the service worker's cache (`sw.js`) and only fetch new
ones when `sw.js` itself changes.

Agents commit; Victor pushes. Never push, force-push, amend, rebase or reset `app`, and
don't switch branches in a checkout others work in.

## Shipping

1. **Bump `VERSION` in `sw.js`** (`'wbf-11'` becomes `'wbf-12'`) once per push, whenever a
   file the app caches changed since `origin/app`. Several commits before one push share
   one bump. The `static` suite fails until you do.
2. **Every file the app loads is in `SHELL` or `LAZY`** in `sw.js`. `SHELL` is cached at
   install: what the app needs to open and train offline, and every picture the screens
   show. `LAZY` is cached the first time a phone uses it (the other coach, the big icon).
   A new `js/` file also goes in `index.html`, a module before `js/app.js`
   (`.claude/skills/frank-module/`). `tools/build.mjs` packs what `index.html` loads, and
   `static` fails on a `js/` file missing from `index.html` or `SHELL`. Frank's videos
   stay out: phones fetch them in pieces.
3. **Run the checks:**

   ```bash
   node tools/test/run.cjs        # every local suite, 15 to 20 minutes: all must pass
   node tools/text-diff.mjs       # must exit 0: every new line is in docs/TEXT-FOR-FRANK.md
   node tools/build.mjs           # the one-file builds still build (dist/ isn't committed)
   node tools/build-personal.mjs  # if personal/ changed
   ```

   Prices, Frank's WhatsApp number and health claims need his yes before the push, not
   after (`.claude/skills/frank-words/`).
4. **Commit, and hand Victor the push:** the commits, the suite's last line, the new
   `VERSION`, and what to look at on the live site.
5. **After his push:**

   ```bash
   git fetch origin app                    # live compares with origin/app
   node tools/test/run.cjs live --wait     # waits up to 5 minutes for Pages
   ```

   `differs from origin/app` means Pages is still deploying, or the push didn't happen.
6. **An installed phone gets it.** Open the app from the home screen (or switch back to
   it) and stay on Plan, Today or Me. Within a minute a bar says "New version ready";
   Update reloads into the new version. Then look for the change you shipped. The bar
   never shows in a workout or the onboarding, nor on a phone's very first visit.

How it works, if the bar doesn't come: `js/app.js` registers `sw.js` once the 3D coach
is in (or 15 s after load) and calls `registration.update()` each time the app comes
back on screen. A changed `sw.js` installs, fetches every `SHELL` file past Pages'
10-minute HTTP cache (`cache: 'no-cache'`), takes over (`skipWaiting`, `clients.claim`)
and deletes the other caches. The page sees `controllerchange` and `updateBar()` shows
the bar. The `hosted` suite tests all of this on a local copy with Pages' caching.

## Rolling back

A rollback is a new release whose files are old.

1. Find the bad commit: `git log --oneline origin/app`.
2. `git revert --no-edit <sha>` (several: `git revert --no-edit <oldest>^..<newest>`). A
   revert is a new commit. No reset, no amend, no force-push: the branch is live.
3. **Give `sw.js` a new `VERSION`, higher than any used before**, even when the revert
   put an older number back. After `wbf-12` went wrong, the rollback is `wbf-13`, never
   `wbf-11`:
   - phones only update when the bytes of `sw.js` change; a revert that leaves `sw.js`
     as the bad release had it leaves every phone on the bad files;
   - caches go by name: an old name can match a cache a phone still holds, and the
     install keeps the `LAZY` files it finds there, stale ones too;
   - two releases with one name can't be told apart in a bug report.
4. Data: the app keeps everything under `wbf.v1`, and older code keeps keys it doesn't
   know, so a rollback rarely loses data. A field whose meaning changed is the danger:
   seed the state the bad release saved and run the old suites on it.
5. Ship it as above: full suite, Victor pushes, `live --wait`, the phone's update bar.
   Tell Victor what was rolled back and why. If the reverted commits added text, its rows
   in `docs/TEXT-FOR-FRANK.md` go too: `node tools/text-diff.mjs` lists what's left.

## Moving to Frank's own domain (once)

The README's plan: Frank's own domain first, and a host that allows a paid app
(Cloudflare Pages or Netlify, the same files). GitHub Pages isn't for running a paid
service.

**Why it needs care: data stays with the address.** Everything a person enters
(`localStorage` key `wbf.v1`) and the offline cache belong to the origin, the scheme and
host and port. The new address starts empty: no plan, no history, no trial start, no
client access, none of Frank's saved sessions in Coach tools, and Coach tools locked until
Frank types his coach code there. The home-screen app keeps opening the old address. (On `github.io` every project page of the account shares one
origin and so one storage: one more reason to move.)

Before the move:

1. **A way to carry the data.** A backup file, or a move link (`#move.<code>`, the
   keep-my-progress feature). Check it's in: `grep -n "#move\|backup" js/*.js`. Without
   it, everyone's progress stays behind, so the move waits.
2. **Links from any host.** A session link Frank sent from the old address must still
   work pasted on the new one, and the other way round (`client.cjs` pastes links from
   several hosts).
3. **Test the move across two local origins.** Two servers on two ports are two origins,
   each with its own storage, like the old and the new address:

   ```js
   await t.flow('moving to a new address', async () => {
     const a = await L.serve(), b = await L.serve();              // 127.0.0.1:<port A> and :<port B>
     const old = await t.page({ server: a, state: L.member() });
     // make the move link on A the way a person does, then read it: <steps>
     const link = '<the move link>';
     const now = await t.page({ server: b, href: link.replace(a.url, b.url) });
     // confirm on B: the same plan, history, trial, client access and Frank's saved sessions
     // a phone that already has a plan on B merges, nothing is overwritten
     await a.close(); await b.close();
   });
   ```

On the day:

1. **Deploy `app` to the new host** as it is: no build step, HTTPS on.
2. **`sw.js` uncached by the host.** Add `_headers` at the root (Netlify and Cloudflare
   Pages both read it), so phones see a new `VERSION` at once:

   ```
   /sw.js
     Cache-Control: no-cache
   ```

3. **The moved banner on the old address.** The old address runs the same code and
   shows, on every tab screen, that the app has moved, with one button that brings the
   person's progress (the move link to the new address). The new home is one setting in
   `js/programs.js` (keep-my-progress plans `FRANK.home`). Leave the old site up: people
   come back late, and old installs work offline.
4. **The address in the files.** `og:url` and any `og:image` hold the new absolute
   address (`index.html` has no `og:` tags today; add them with the move if the link
   previews are wanted). `manifest.webmanifest` needs no new address: `start_url` and
   `scope` are `./`. But an installed app belongs to its origin, so people install again
   from the new address; the banner says how.
5. **The old address elsewhere:**
   `grep -rn "victorfromaruba-stack.github.io" --exclude-dir=dist .` finds the README,
   `SITE` in `tools/test/lib.cjs` (or set `FRANK_QA_SITE`), the frank-qa skill and this one.
6. **Test the live site there:**
   `node tools/test/run.cjs live --site https://<new address>/ --wait`.
7. **Frank sends new session links from the new address**, after he has moved his own
   phone's data (his saved sessions go with it) and typed his coach code there.
