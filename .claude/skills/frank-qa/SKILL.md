---
name: frank-qa
description: The test suites for the Wellness by Frank app (tools/test/), and how to read and extend them. Use it before ANY push or merge to the app branch (it's live on GitHub Pages a minute later), and right after any change to js/, app.css, index.html, sw.js, manifest.webmanifest, fonts/, vendor/, assets/ or personal/, even a one-line text or CSS fix, even when nobody asked for tests. Also use it when someone asks to test, check, QA, verify or screenshot Frank's app, asks "does it still work", "is the live site OK" or "did the deploy go through", reports a bug in the app, or adds a feature that needs a test.
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: QA

The `app` branch is live at https://victorfromaruba-stack.github.io/frank/ a minute or
two after a push, and Frank's clients use it. These suites use the app the way a
person does: a phone-sized Chromium (390 x 844) taps through it, with the date fixed,
workout timers sped up and localStorage seeded, so every run checks the same thing.
They also check the app's hard rules: calories say "est.", no diet advice when
pregnant, under 18 or with a medical condition, nothing loaded from other sites, no
secrets in the repo and client codes only as hashes.

Everything runs with Node and Playwright, from any folder. The runner serves the repo
itself on 127.0.0.1 and needs no network, except `live`.

## When to run what

| Situation | Run | Time |
|---|---|---|
| Before every push to `app` | `node tools/test/run.cjs` (every local suite) | about 8 min |
| While working on a small change | `node tools/test/run.cjs quick` (static, smoke), then the full run before the push | about 1 min |
| One area | `node tools/test/run.cjs player client` | |
| You changed how something looks | the full run, then open `<out>/screens/index.html` and look at every screen you touched | |
| After the push | `node tools/test/run.cjs live --wait` | about 1 min |

A suite is also a script: `node tools/test/smoke.cjs` runs just that one.

Options: `--out <dir>` (screenshots and `report.json`, default `$FRANK_QA_OUT` or
`<tmp>/frank-qa`; in a sandbox use your scratchpad), `-v` (every step as it runs),
`--scale 2` (sharper screenshots), `--shots` (a screenshot at every checked screen),
`--strict` (known app bugs fail too), `--timeout 40000` (per tap or wait; default
20000), `--site <url>` and `--wait [minutes]` for `live`. `--list` prints the suites.
Exit code: 0 all passed, 1 a suite failed, 2 a usage error.

## The suites

| Suite | What it checks |
|---|---|
| `static` | No browser. Every file passes `node --check`; `tools/check-plans.cjs` passes; every file the app loads exists and is in `SHELL` in `sw.js`; a cached file changed since `origin/app` means `VERSION` must change; the manifest (relative `start_url` and scope, icon sizes, a maskable icon); nothing loaded from other sites; no GPL text; no keys or tokens; `FRANK.codes` holds only hashes; the monthly price is still €15 |
| `smoke` | Welcome, onboarding start, "Look around first", every tab, Workouts (body part, search, library), the exercise sheet (three tabs, pager), a plan day, the player starts and the coach moves, the science, Coach tools; logging walks, water, meals and weight; Delete my data; Other options; the Personal prototype |
| `onboarding` | The whole onboarding tapped through like a person, once in cm and kg, once in ft and lb (rulers dragged, year wheel, PAR-Q answers, sore spots, push-up test), to the built plan; what was saved, the plan level and that no ruled-out move is in it; Me: change sore spots, Edit then Back, Edit all the way, Edit of an older profile (health questions it never answered stay open; answered No, the plan and its ticks stay) |
| `player` | Every control on a session from Frank (ready, reps, How-to, rest +20 s, skip, switch sides, pause, previous) and the screens in order; a plan day run to the finish screen; the feedback buttons tune `adjust`; Today, Me and the grid after; quitting with and without saving; the phone's Back mid-workout |
| `paywall` | The trial starts with the first workout; days left; the price screen after the trial (€15 a month, the yearly placeholder, "Become a member" off while payments are off); members; Frank's sessions stay open; "I'm one of Frank's clients" |
| `client` | Client codes (a test-only code, typed with capitals and spaces); session links opened, pasted, broken and hostile (no script runs, doses capped); long titles; Coach tools: build, save, send, the link opened on a fresh phone, Back, the player counts sets |
| `safety` | The food card refers to a dietitian or doctor when pregnant, under 18 or with a medical condition, with no water card, no food or drink lesson and no weight target (onboarding and Edit); every plan day and catalogue workout is checked against pregnancy, a PAR-Q yes (gentle until "Cleared by a doctor"), age 60+ and each sore spot; no made-up social proof |
| `hosted` | Served under `/frank/` with Pages' 10-minute caching and the service worker on: no outside requests, no 404s, fonts and worker scope inside `/frank/`, the manifest and icons, every `SHELL` file cached; with no network the welcome, the plan, an exercise sheet, a workout and a session link still work; a new deploy reaches a phone that has the app; Personal |
| `screens` | A screenshot of every screen and main state (86 of them, every onboarding step, sheets, player states, empty and full states, Personal) with the standard checks, plus `index.html`, a contact sheet to look through |
| `live` | The published site: every app file is served with the right type and is byte for byte what `origin/app` holds, `sw.js` VERSION, the folder address serves the app; then welcome, onboarding, a member's plan, the sheet, the player, a session link and Personal, through the real site. Only runs when named (or with `all`) |

Every screen a test looks at (`t.look`) also gets the standard checks: no page or
console errors, no sideways scroll at 390 px, Frank's fonts loaded, no broken
images, no undrawn 3D coach, no muscle map left hidden once the coach is in, every
"kcal" with "est." next to it, no screenshot mode, no HTTP errors, nothing
requested from another site.

## Reading the output

```
  onboarding  FAIL  81.2 s  (2 known)
      ✗ metric (cm, kg) › weight: BMI box is missing Healthy (found: "YOUR BMI 31.2 Obese ...")
      ✗ Me: Edit, then back: stopped: expected the "Me" screen, got "Your plan" (screen: /tmp/frank-qa/onboarding/FAILED-me-edit-then-back.png)
      ~ known: imperial (ft, lb) › build and summary: build steps should not show /advanceds/i
          why: Building your plan: "Setting doses for advanceds" (buildSteps adds an "s" to every level name).
      ! known issue not seen any more, remove it from tools/test/known.cjs if it is fixed: ...
      · a note (live: which commit it compared against)
```

- Each problem line starts with the flow, then ` › ` the step, then what was wrong.
  `got ..., expected ...` comes from `t.equal`; `is missing ... (found: ...)` from `t.has`.
- `stopped:` means a tap or a wait failed and that flow ended there, so its later
  checks didn't run. The screenshot shows the screen at that moment. Look at it first.
- `~ known:` is a bug listed in `tools/test/known.cjs`. It doesn't fail the run.
- `! known issue not seen any more`: the bug looks fixed. Run with `--strict` once
  to be sure, then delete its entry.
- `report.json` in the output folder has every result, for another agent or a script.

| Problem line | Usually means |
|---|---|
| `page error: ...` / `console error: ...` | A JavaScript exception or a failed load. Rerun the suite with `-v` to see the step, then reproduce it |
| `sideways scroll: the page is N px wider` | Something is wider than 390 px: a long word without `overflow-wrap`, a fixed width, a wide row. In the page, list elements whose `getBoundingClientRect().right > innerWidth` |
| `blank 3D coach: <id>` | A canvas drew nothing: a GLB that didn't load, a pose with NaN, lost WebGL |
| `the 3D coach did not load within 90 s` | The machine is overloaded (other agents running browsers?) or WebGL is broken. Rerun alone, maybe with `--timeout 40000` |
| `calories without "est."` | A kcal number without "est." in its line or its box. Calories are always estimates |
| `loaded from other sites` | The app requested something outside its own folder. It must not |
| `HTTP 404 for ...` | A missing file: a typo, or a file that isn't in the repo |
| `expected the "X" screen, got "Y"` | Navigation went somewhere else. Screen names are `document.title` before " · " |
| static: `bump it so installed phones update` | You changed a cached file: raise `VERSION` in `sw.js` |
| live: `differs from origin/app` | Pages is still deploying (rerun with `--wait`), or the push didn't happen |

## When a test fails

1. Look at the screenshot and the line. Reproduce it: `node tools/test/<suite>.cjs -v`.
2. Decide: is the test wrong, or the app?
   - The test is wrong (a selector changed with a deliberate redesign, a text Frank
     approved changed): fix the test in the same change. Say so in the commit.
   - The app is wrong: fix the app if that's your task. If it isn't, keep the test as
     it is, add an entry to `tools/test/known.cjs` and tell the owner.
3. Never loosen a check, widen a known entry's `match`, or delete a test to get a
   PASS. A known entry is only for a real app bug that someone has been told about.

A `known.cjs` entry: `{ suite, match, why, since }`. `match` is a regular expression
on the problem line; keep it narrow (`^flow name: the check`), so it can't hide a
new problem. `why` names the bug and where in the code it is.

## Adding a test for a new feature

Every feature that changes what a person sees or what's saved gets a test in the
same change. Put it in the suite for that area (a flow of its own, so one failure
doesn't hide the rest), and add its screen to `screens.cjs`:

```js
await t.flow('water: a glass and back', async () => {
  const p = await t.page({ state: L.member() });           // a fresh phone with a member's plan
  await app.tap(p, '.tab[data-tab="today"]');                // tap like a finger
  await app.tap(p, '[data-act="water"][data-n="3"]');
  t.has(await app.text(p), '3 of 8 glasses', 'water');        // what the person sees
  t.equal((await app.stored(p)).food[L.TODAY].water, 3, 'saved water');   // what was saved
  await t.look(p, 'today with water');                       // the standard checks for this screen
});
```

A new area gets its own file: copy `paywall.cjs` (the shortest), give it a `name`
and an `about`, and add the name to `ORDER` in `run.cjs`.

| Helper (`tools/test/lib.cjs`) | What it does |
|---|---|
| `t.page({ state, url, hash, speed, now, sw, prefix, site, threeD })` | A fresh phone with one page. `state` is seeded into localStorage once; `speed: 50` makes timers 50 times faster (`window.__qa.speed(n)` changes it later); `url: 'personal/'` opens Personal |
| `L.state()`, `L.member()`, `L.profile()`, `L.spec()`, `L.pack()` | Saved states to seed: a new person, a paying member, a profile, a session from Frank, a link code (`#frank.` + `L.pack(spec)`) |
| `L.TODAY`, `L.isoDay(n)` | The tests' date, 2026-10-14 09:00 in The Hague, and n days from it. An ended trial is `access: { trialStart: L.isoDay(-10) }` |
| `app.tap`, `app.tapText`, `p.fill` | What a person does. Use these for the thing you test |
| `WBF.app.go(name, params)`, `.tab(name)`, `.sheet(id)` | Jump to a screen to set up a test (`p.evaluate(() => WBF.app.go('pay'))`), not to test the way there |
| `app.waitTitle`, `app.waitHeading`, `app.waitText` | Wait for a screen, a heading, a text |
| `app.text`, `app.title`, `app.toast`, `app.toasts`, `app.overlay`, `app.stored` | What's on screen, the last toast (even after it faded), the open sheet, what was saved |
| `app.runWorkout`, `app.slideRuler`, `app.addCode` | Play a workout to the finish screen, drag an onboarding ruler, make the test-only client code valid |
| `app.maps`, `app.holdCoach` | Which muscle maps show; keep the 3D coach out until a test lets it in (a slow phone: open the page with `go: false`) |
| `t.has`, `t.lacks`, `t.equal`, `t.near`, `t.check`, `t.fail` | Checks. They record a problem and go on |
| `t.step`, `t.look`, `t.shot`, `t.note`, `t.log` | Name the step, run the standard checks, save a screenshot, print a note, print with `-v` |

Tests find things by `data-act`, `data-k`, `data-v`, `data-tab` and a few ids
(`#wq`, `#join-in`, `#ob-name`). If you rename one in the app, grep `tools/test/`
and change both together.

Keep tests deterministic. Seed the state you need; don't tap through the onboarding
again. Dates come from `L.TODAY` and `L.isoDay()`, never the real clock. Where you
can, wait for something on screen, not a fixed number of milliseconds.

## Sandbox notes

- **The proxy's certificate.** In Claude's sandbox, HTTPS goes through a proxy that
  signs with its own CA. Node trusts it through `NODE_EXTRA_CA_CERTS`; Playwright's
  Chromium may not. So `live` fetches every file with Node and hands it to Chromium
  (`viaNode` in `lib.cjs`), which also works on a laptop with no proxy. Never turn
  TLS checks off (`ignoreHTTPSErrors`, `NODE_TLS_REJECT_UNAUTHORIZED=0`). The local
  suites block every request outside 127.0.0.1 and report it.
- **4 CPUs, shared with other agents.** Run one test run at a time. A run opens one
  Chromium for all its suites and closes it at the end; don't start suites in
  parallel or another browser next to it. When the machine is busy, runs get slow
  and waits can time out: rerun alone, or add `--timeout 40000`.
- **SwiftShader.** WebGL runs in software (`--use-angle=swiftshader`), so every 3D
  coach takes seconds to load and draw, and `screens` takes about 2 minutes (longer
  with `--scale 2`). That's normal. The same software renderer makes screenshots
  match from machine to machine.
- **Playwright** comes from the global install here (`/opt/node22/lib/node_modules`);
  elsewhere, `npm i -D playwright && npx playwright install chromium`.
- Service workers are blocked in every suite but `hosted`. Frank's videos are H.264,
  which the test Chromium can't play (see the frank-app skill).

## Don't

- Don't commit the output folder or screenshots.
- Don't put a real client code, a token or Frank's business terms (fees, client
  numbers) in a test. Use `L.QA_CODE`; its hash is added in the page by `app.addCode`.
- Don't treat `live` as the check before a push: it tests what's already published.
