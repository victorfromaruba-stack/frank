---
name: frank-app
description: How the Wellness by Frank workout app is built and how to change it safely. Use it whenever you add or edit an exercise, its animation, video or coaching text, a workout or program, the 28-day plan generator, the 3D coach (models, poses, muscle view), Frank's filmed clips, the onboarding, the membership/paywall, Frank's coach tools or client links, or the app's look; and whenever someone mentions Frank's app, wellnessbyfrank, the 3D coach or demos, "the generated plans", or "the science behind the plans", even without naming a file.
metadata:
  owner: victor
  version: "2.3"
---
# Wellness by Frank: the app

A static web app (PWA) for personal trainer Frank (@wellnessbyfrank): plain HTML,
CSS and JavaScript, no build step, no server code. Modelled on Leap Fitness's
"Home Workout - No Equipment" app. Two audiences:

- **Members** get generated, science-based 28-day plans. Free trial, then a
  membership (`BILLING` in `js/programs.js`: €15 a month is decided, the rest are
  placeholders the price screen doesn't show).
- **Frank's clients** follow sessions Frank writes in Coach tools and sends as a
  link (`#frank.<code>`). Opening a link gives them access without the membership.
  Coach tools open only on a phone where Frank typed his coach code.

Read `README.md` first. Everything a person enters is stored in their browser
(`localStorage` key `wbf.v1`), one browser at a time: on an iPhone, Safari, Instagram's
own browser and the Home Screen app each keep their own. A backup file or a move link
(`js/keep.js`) carries it to another browser or phone.

The other project skills, each for one job:

| Skill | Use it for |
|---|---|
| `.claude/skills/frank-module/` | a new feature, card, screen or link: in its own file, `js/<feature>.js`, not in `js/app.js` |
| `.claude/skills/frank-qa/` | the test suites: before every push, and after any change |
| `.claude/skills/frank-words/` | any text people read: Frank's voice, and his approval in `docs/TEXT-FOR-FRANK.md` |
| `.claude/skills/frank-safety/` | food, weight, body numbers, hard efforts, health data: who gets what |
| `.claude/skills/frank-release/` | shipping to the live site, rolling back, moving to Frank's own domain |
| `.claude/skills/frank-device-check/` | the 15-minute check on a real iPhone and Android phone |
| `.claude/skills/frank-showcase/` | store screenshots, Instagram posts and portfolio images |

## Files and what owns what

| File | Owns |
|---|---|
| `js/figure.js` | 2D pose engine: pose format, forward kinematics, two-bone IK, keyframes. Every pose is solved here first |
| `js/figure3d.js` | the 3D coach: a rigged human (male or female) posed on the 2D engine's joints, contact with floor, box, table and wall, the Demo/Muscle/map shading, muscle-map pictures, coach portraits |
| `assets/coach-m.glb`, `assets/coach-f.glb` | the two coaches, built by `tools/coach/build_coach.py` from Quaternius' Universal Base Characters (CC0, `assets/CREDITS.txt`) |
| `assets/hd/` | 2048 px texture copies of the coaches (`build_coach.py --hd`), only for screenshots and marketing renders: the app never loads them |
| `js/exercises.js` | the 80 exercises: text, doses, kit, swaps, METs, muscles (`MUS`), joint stress (`STRESS`), animation keyframes |
| `js/media.js` | the exercise videos, by exercise id: AI demos (`ai: true`) replace the 3D coach in the Video tab, the player and lists; Frank's YouTube explanations (`howto`) play in the How-to tab |
| `js/programs.js` | Frank's details, `BILLING`, body parts, kit, workouts, the 28-day plan, safety (`avoidFor`, `safe`), the session builder, kcal |
| `js/science.js` | the science screen: rules and 36 sources. Mirrors `references/science.md` |
| `js/app.js` | screens and navigation, onboarding, paywall, plan, workouts, exercise sheet, player, Today, Me, Frank, coach tools, access; at its end the module seam (`WBF.ext`, `WBF.app`) |
| `js/links.js` | a module: links to one move (`#ex.<move>`) or one workout (`#w.<workout>`) for Frank to send. The example to read before writing one (`.claude/skills/frank-module/`) |
| `js/keep.js` | a module, keep my progress: the backup file and the move link (`#move.<code>`, made and checked here, merged into the phone's data with `WBF.app.replace`), "I already have a plan", the warning in Instagram's browser, the Home Screen sheet after a workout, `navigator.storage.persist()`, and the "Frank's app has moved" banner once `FRANK.home` is set |
| `js/onboard-flow.js` | a module, the fast start: the eight questions someone new answers before the plan (`FIRST`; the fitness check up front or after Day 1 is `FITNESS_FIRST`, Frank's decision), "Your first week" in place of the summary, "Make it yours" after Day 1 (the finish screen and the Plan), Me's "Your answers" (each answer on its own), and the plan card for Frank's clients with none. It keeps `profile.asked` (when each later question was answered) and `profile.later` (Not now) |
| `js/sound.js` | beeps, voice coach, vibration, screen wake lock |
| `app.css` | Frank's look; tokens at the top. Light screens (welcome, onboarding, paywall) use `body.light` |
| `vendor/` | three.js r170 and its GLTF loader (MIT). Single-file builds load them from jsDelivr |
| `tools/build.mjs` | `dist/wellness-by-frank.html` and `dist/artifact.html`, one file each, coaches embedded; it packs the scripts `index.html` loads, in that order |
| `tools/check-plans.cjs` | counts what every plan type trains per week; must pass |
| `tools/test/` | the test suites (`node tools/test/run.cjs`); how to read and extend them: `.claude/skills/frank-qa/` |
| `tools/text-diff.mjs`, `docs/TEXT-FOR-FRANK.md` | text added or changed since the doc's last update, and the lines waiting for Frank's yes (`.claude/skills/frank-words/`) |
| `tools/sheet3d.html` | contact sheet of 3D key poses: `?ids=a,b`, `from`, `to`, `keys`, `mode=muscle|map`, `coach=f`, `yaw`, `pitch` |
| `tools/media/process.sh`, `docs/FILMING-GUIDE.md` | Frank's clips: how to film them, and how to turn one into app files |
| `.claude/skills/frank-showcase/` | store screenshots, Instagram posts, previews and portfolio images of the app. It sets `window.WBF_SHOT` (screenshot mode in `js/figure3d.js`) and uses `WBF.app.state()`, `sheet()`, `nextDay()`, `session()` and `kcal()`; keep them working |
| `img/brand/`, `tools/brand/` | the "W by Frank" marks as SVG shapes and the app icons; rebuild with `tools/brand/build_marks.py`, then `render.cjs` |
| `personal/` | the Personal prototype (client app and Coach mode) on example data, `docs/PERSONAL.md`; `tools/build-personal.mjs` packs it into one file |

## Adding or changing an exercise

1. Copy a similar entry in `js/exercises.js`. Required: `name, area, pattern,
   type ('reps'|'time'), dose {b,i,a}, eq, met (2024 Compendium), cue[3], setup,
   steps, mistakes, why, focus {j,label,at}, anim, alts`. `each: true` means per
   side. Then add it to `MUS` (main and helper muscles), and to the `STRESS`,
   `POS` (supine/prone) and `JUMP` lists that apply: the safety rules read them.
2. Write the animation as 2D keyframes: [references/poses.md](references/poses.md).
   Planted hands and feet use `{ik: [x, y]}` so they stay put while the body moves.
3. If the move needs kit, add `eq` and at least one kit-free `alts` entry: plans
   swap automatically when someone lacks the kit.
4. Check it in 3D: serve the folder and open `tools/sheet3d.html?ids=<id>`, also
   with `&coach=f` and `&mode=muscle`. Hands and feet must touch the floor, nothing
   may pass through the floor, a box, the table or the wall.
5. The coaching text is Frank's voice: short imperative cues ("Hips back."),
   plain words, one idea per line. Frank approved the app's texts in October 2026;
   new or changed text is a draft until he approves it. List it in
   `docs/TEXT-FOR-FRANK.md` (`node tools/text-diff.mjs` finds it; see `frank-words`).

## Videos: AI demos and Frank's YouTube

Each move's demo is an AI clip (the frank-coach-video skill); Frank explains the
moves on YouTube, and a move's link goes in its `howto` in `js/media.js`
(`docs/FILMING-GUIDE.md`). No tag on the pictures (Victor, 4 October): the welcome
screen's small print and a note under the video in the exercise sheet say the videos
are made with AI, and an AI clip never shows "Frank". The main pictures show a move with
a clip: the welcome screen the squat, a workout's card and header `coverMove` (its first
main move with a clip; modules use `u.hasClip`). How-to plays Frank's YouTube video inside the app after a tap
(youtube-nocookie.com; nothing loads from YouTube before the tap), else a note
that his video is coming: How-to is Frank's, never the AI demo. The Muscle tab
shows the muscle maps, front and back, standing still (the moving anatomy figure
moved unlike a real person). The 3D coach stays for every move without a clip.
`tools/test/media.cjs` checks the pictures, the AI lines and the three tabs.
Videos are H.264 MP4: the test Chromium can't play them, so tests serve VP9
copies with the same names. The service worker leaves videos to the browser.

## Changing plans and workouts

- Workouts are lists of exercise ids (optionally `[id, dose]`) in `WORKOUTS`;
  levels pick doses from each exercise's `dose`.
- The plan comes from `ROTATION` (goal x days) and `WEEK` (which days train).
  `WEEK_MULT` raises doses each week; feedback after a session moves `adjust`
  between 0.75 and 1.3. The person's focus areas add a short `focus` block to
  plan sessions (`focusFor`).
- After any change run `node tools/check-plans.cjs`: every plan must train lower
  body, upper body and core on 2+ days a week, with at most 2 cardio days.
- Keep the evidence rules in [references/science.md](references/science.md).
  A change that breaks one needs a source and Frank's yes.

## The onboarding

The steps (questions, rulers, the year wheel, the health questions) are drawn in
`SCREENS.onboard` in `js/app.js`; which ones someone new answers, and in what order, is
`FIRST` in `js/onboard-flow.js`. The app refuses an order that leaves out the goal, the
year of birth, the health questions or the sore spots, or asks height, weight or a target
before the year and the health questions (`order()` in `js/app.js`): what keeps someone
safe is always asked before the plan is built. Everyone starts at Beginner until the
fitness check, which gentle mode doesn't get until a doctor clears it (`levelFor()` keeps
it at Beginner either way). Make it yours comes after the plan's first workout. A plan made
before the fast start has no `profile.asked` and never gets the Make it yours card. The
hooks a module uses for it: "The onboarding" in `.claude/skills/frank-module/`.

## Adding a feature

A new feature goes in its own file, `js/<feature>.js`, and plugs into the app
through `WBF.ext` (cards in fixed places, actions, screens, links, events, one key
of its own in `wbf.v1`). Not in `js/app.js`: `.claude/skills/frank-module/` has the
api, the template and the test it needs.

## Access, money and links

- `status()` in `js/app.js`: `new`, `trial`, `ended`, `member`, `client`.
  `mayTrain()` gates members' workouts; Frank's sessions are always open.
- Payments are not connected. `BILLING.paymentLink` takes any checkout link
  (Paddle, PayPal; Stripe only if the business is registered in a Stripe country,
  since Stripe doesn't accept Aruba). Real access control needs a server: accounts
  plus a webhook that marks `paid`. Until then the paywall is a client-side gate,
  easy to bypass. See `docs/ACCOUNTS-AND-PAYMENTS.md`.
- The price screen (`SCREENS.pay`) shows only the plans in `BILLING.plans` with
  `approved: true` (Frank's yes; today only €15 a month). It offers the free trial
  only before it starts. With no `paymentLink`, the trial and after it get "Tell me
  when it opens": it opens Frank's Instagram chat and copies a message for him. A
  member or one of Frank's clients gets their line from Me instead (`HAVE`).
- Client links carry the whole session, base64url JSON after `#frank.`. Keep
  them plain-anchor safe (letters, digits, `-`, `_`, `.`). `cleanSpec()`
  validates everything that comes in. `codeIn()` finds the code in a pasted
  message from any address, Frank's own domains too (wellnessbyfrank.com has a
  "frank." of its own), also when a mail or chat app wrapped the link (`%23` for
  the `#`). A session Frank changes and sends again shows as new. A link opened on
  the phone that made it (Frank trying his own) adds the session, not client access.
- Other links belong to modules (`#<name>.<rest>`): `js/links.js` opens `#ex.<move>`
  and `#w.<workout>`, `js/keep.js` opens `#move.<code>` (a person's whole data, packed:
  it waits for a yes, and during a workout for its end). The app takes a link out of
  the address bar before it opens it, and no link ends a workout
  (`.claude/skills/frank-module/`).
- A move link or a backup never brings `paid`, nor Coach tools (`coachMode`): Frank types
  his coach code again on a new address. It brings client access, the earlier free
  trial (one that says it starts after today starts today), Frank's sessions and his
  saved ones. On a phone with its own plan, the plan stays and the health answers of
  both count (`.claude/skills/frank-safety/`). `WBF.app.replace()` gives the data a new
  `stamp`, so another open window takes it as it is (an Undo holds there too).
  `FRANK.home` in `js/programs.js` stays empty until Frank's own address exists
  (`.claude/skills/frank-release/`).
- Client codes: `FRANK.codes` in `js/programs.js` holds SHA-256 hashes of
  `'wbf:' + code` (lower case, no spaces), so the codes can't be read in the
  public repo. `node tools/client-code.mjs <code>` prints the line to add. A
  matching code sets `access.client`. Like the paywall, it's a check on the
  phone until accounts exist.
- Frank's coach code: `FRANK.coachCodes` holds hashes of `'wbf-coach:' + code`;
  `node tools/client-code.mjs --coach <code>` prints the line (12 characters or
  more: the hash is public). Coach tools open only on a phone where it was typed
  (`coachOn()`; `coachMode` in `wbf.v1` keeps the hash), stay open after a reload
  and lock again with "Lock coach tools on this phone". A new hash locks every
  phone that had the old code. A check on the phone, like the paywall.
- Sore spots (`SORE`): each id must match the `stress` tags on exercises, except
  `other`, which only leaves out jumps (`avoidFor`).

## Check your work

Run `node tools/test/run.cjs` before a push, and `node tools/test/run.cjs live --wait`
after it (see `.claude/skills/frank-qa`). A new feature gets its test in the same change.

```bash
for f in js/*.js sw.js; do node --check "$f"; done
node tools/check-plans.cjs
node tools/test/run.cjs quick          # static and smoke, about 4 minutes, while you work
node tools/test/run.cjs                # every local suite, 15 to 20 minutes: before every push
node tools/test/run.cjs live --wait    # the live site, after the push
node tools/text-diff.mjs               # text added or changed, for docs/TEXT-FOR-FRANK.md
python3 -m http.server 8765            # to look for yourself: Playwright at 390x844
node tools/build.mjs
```

- The suites tap through all of this: welcome, the fast start (eight questions, Your
  first week, Start Day 1, Make it yours, Your answers), the app's own onboarding (rulers,
  year wheel, health questions, build, summary), the price screen before, during and
  after the trial, Plan (28-day grid, this week), a workout, the exercise sheet
  (Video, Muscle, How-to, the pager), a full session in the player (ready, timed
  move, reps move, rest, switch sides, pause, quit), the finish screen, Workouts
  (body parts, filters, search), Today, Me, Frank, Coach tools (locked without the
  coach code, then build, send, open the link in a fresh browser, press Back), the
  links to a move or a workout, the modules, keep my progress (a backup, a move link
  from one address to another, Instagram's browser), the keyboard and a screen reader's
  names, and an expired trial (`access.trialStart` 10 days back). After the full
  run, look at every screen you touched in `<out>/screens/index.html`.
- What a headless browser can't test (the silent switch, Safari's storage, the
  status bar, share sheets) is in `.claude/skills/frank-device-check/`.
- No console errors, no sideways scroll at 390 px. WebGL in headless Chromium:
  launch with `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- Block service workers in tests that route requests (`serviceWorkers: 'block'`).
- Bump `VERSION` in `sw.js` whenever a cached file changes (`.claude/skills/frank-release/`).
- The app loads nothing from other sites (fonts in `fonts/`, three.js in `vendor/`), but
  YouTube's privacy-enhanced player after a tap on Watch Frank explain it.
  Only the single-file builds fetch three.js from jsDelivr; in this sandbox Chromium
  doesn't trust the proxy CA, so route jsDelivr through Node's `fetch` in a test
  harness. Never turn off TLS checks.

## Never

- Present calorie numbers as exact: they are MET estimates and say "est.".
- Give diet advice to someone who ticked pregnant, under 18 or a medical
  condition: the food card only refers them to a dietitian or doctor, and
  `atRisk()` also takes away the water card, the food and drink lessons and
  the weight target. The full table of who gets what: `.claude/skills/frank-safety/`.
- Show made-up social proof: no invented reviews, user counts or "X people
  joined today".
- Add a GPL dependency (for example mannequin.js): the app is sold. Models and
  textures must be CC0 or licensed for commercial use.
- Put Frank's real WhatsApp number, prices or claims in the app without his yes.
- Write a real client code or Frank's coach code anywhere in the repo, a test or a
  commit message: only their hashes (`tools/client-code.mjs`). Tests use
  `L.QA_CODE` and `L.QA_COACH` (`.claude/skills/frank-qa/`).
