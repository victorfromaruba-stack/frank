# Wellness by Frank

A home workout app for Frank (@wellnessbyfrank), in his brand: forest green, sky
blue, heavy rounded capitals and thin serif notes. Modelled on Leap Fitness's
"Home Workout - No Equipment" app, built around Frank's method instead of
generic routines.

It's a web app (PWA): plain HTML, CSS and JavaScript, no build step, no server
code. On a phone it installs to the home screen and works offline.

Two kinds of users:

- **Members** train with generated, science-based plans: a free trial, then a
  membership (payments are not connected yet: see
  `docs/ACCOUNTS-AND-PAYMENTS.md`).
- **Frank's clients** follow sessions Frank writes for them in Coach tools and
  sends as a link, or type a client code under "I train with Frank" (make one
  with `node tools/client-code.mjs <code>`). Either opens the whole app without
  the membership. They pay Frank, not the app. A fuller premium version for
  them, **Personal**, is planned (`docs/PERSONAL.md`), with a clickable
  prototype in `personal/`.

## What it does

- **The fast start** (`js/onboard-flow.js`): someone new answers eight questions,
  with one bar over them: the goal, what keeps them safe (year of birth, the PAR-Q+
  health questions and pregnancy, each answered on purpose, sore spots), days a
  week, minutes, kit at home and who demonstrates (the male or female coach). The
  plan is built, and **Your first week** shows week 1's sessions with their real
  lengths, Day 1's first move, a line for the goal, the safety rows and when the
  free trial starts. **Start Day 1** opens the first workout. Everyone starts at
  Beginner.
- **Make it yours**: after the first workout, a card on the finish screen and the
  Plan asks the rest, one question at a time: the fitness check (how active, a
  push-up guess) that sets the level from the next workout, height and weight on
  sliding rulers with BMI, a target weight with a realistic date range, focus
  areas on a muscle map, what you want most, the name. No BMI verdict while
  growing up or pregnant; no target weight for anyone pregnant, maybe under 18,
  with a medical condition or in gentle mode. Me's **Your answers** lists every
  answer and changes each on its own; a new goal or new days ask before the 28
  days restart. One of Frank's clients with no plan is offered one "for the days
  between Frank's sessions". (Without the module, the app asks all nineteen
  questions in three parts, then shows a summary and the price screen.)
- **The plan**: 28 days in four weeks (Foundation, Build, Push, Peak) on a
  day grid, with this week's sessions listed. Every muscle is trained twice a
  week, the focus areas get extra work, and "Too easy / Just right / Too hard"
  after each session tunes the next ones. Pregnancy, PAR-Q+ answers, sore spots
  and age 60+ change which moves the plan uses.
- **Workouts**: body parts (Full body, Abs, Chest, Arms, Legs & glutes,
  Shoulders & back, Cardio, Stretch) at three levels, filters by level and
  length, search, Frank's three programs (Essentials, Change the method,
  Gravity) and the library of 80 exercises.
- **Every exercise** has a Video tab (a moving 3D coach, or Frank's own clip
  once he films it), a Muscle tab (an anatomy view that turns slowly, the
  muscles the move works in red), and a How-to tab (slow motion, or Frank
  explaining it), plus steps, cues, common mistakes, "why it works" and other
  options. Drag the coach to turn it.
- **The player**: get-ready countdown, timers or rep counts, rest with +20 s and
  skip, switching sides, pause, How-to mid-workout, voice coach, beeps,
  vibration, and the screen stays on.
- **Today**: the week, active minutes, moving minutes toward the WHO 150
  (250 for fat loss), walks, water, and a simple food journal. If someone is
  pregnant, may be under 18 or has a medical condition, the food card only
  refers them to a dietitian or doctor, and there is no water card (8 glasses
  is a goal), no lesson about food or drink and no 250 minutes.
- **Me**: Your answers, workouts, minutes, streak, minutes per week, weight trend
  with the goal, a calendar, history, dumbbell weights, settings, health switches,
  membership, the science, a backup file and Move my plan, delete my data.
- **Frank**: his bio, the method, "Train with Frank in person" (Instagram DM),
  and **Coach tools**: Frank builds a session from the library (moves, reps or
  seconds, circuit or sets, rest, warm-up, cool-down, a note) and sends it on
  WhatsApp or as a link. Coach tools open only on a phone where Frank typed his
  coach code (make one with `node tools/client-code.mjs --coach <code>`).
- **Links to one move or one workout**, for Frank to send: `#ex.goblet-squat`
  opens that move's sheet, `#w.desk-reset` that workout.
- **Keep my progress** (`js/keep.js`): everything lives in one browser, and an
  iPhone keeps Safari, Instagram's own browser and the Home Screen app apart. So Me
  > Your data saves a **backup file** and restores one, and **Move my plan** makes a
  private link (`#move.<code>`) that brings the plan, history, free trial, Frank's
  sessions and client access to another browser or phone ("I already have a plan" on
  Welcome takes a pasted link or a file). What comes in is checked field by field,
  shown first ("Bring your plan here?"), merged with what the phone has (nothing is
  lost, nothing doubles, a membership never comes along; a phone with its own plan keeps
  it, with the health answers and sore spots from both) and can be undone for 10
  seconds, also in another open window. Instagram's, Facebook's and TikTok's browsers
  get a warning on Welcome and a Move my plan card on the Plan (Frank's clients who came
  by his link too); a phone gets a "Keep your progress" sheet once after a workout (Add
  to Home Screen, or Chrome's install button; an iPhone copies the plan first, as from
  Me's "Put it on your home screen"); the browser is asked to keep the data; and once
  `FRANK.home` is set, the old address shows "Frank's app has moved" on every tab, with
  a button that brings each person's progress along.
- **Membership**: a 7-day free trial that starts with the first workout, then €15
  a month. The price screen shows only prices Frank said yes to. Until payments
  are connected, "Tell me when it opens" copies a message for Frank and opens his
  Instagram chat.
- **The science** screen: every rule the plans follow, with 36 sources.

Everything a person enters stays in their own browser (localStorage). Nothing is
sent anywhere. A backup file or a move link carries it to another browser only when
the person saves or shares it themselves: the link holds the data after the `#`,
which browsers never send to a server, and the app says who can see it.

## The 3D coach

The demos use two realistic, rigged 3D people (male and female) from
Quaternius' Universal Base Characters (CC0, free for commercial use). Each
exercise is written as 2D key poses (`js/figure.js`); the 3D coach copies the
joints, keeps hands and feet on the floor, a box, the table or the wall, and
can light up the muscles. `tools/coach/build_coach.py` fitted the models to the
pose engine, dressed them in Frank's green and drew the Muscle tab's anatomy
look from the models' own muscle detail (`--hd` makes the sharper set in
`assets/hd/` that screenshots use).

When Frank films a move, his clip replaces the coach for that move:
`docs/FILMING-GUIDE.md` has the shot list and how to add a clip.

## Decided

- **The membership price:** €15 a month (`BILLING` in `js/programs.js`).
- **The words:** Frank approved his bio (only what his certificate covers: fitness
  trainer, NHA level 3, with sports nutrition and biomechanics) and the app's texts:
  the exercise texts (`js/exercises.js`), the daily lessons and the method lines
  (`js/programs.js`, `js/app.js`). New or changed text goes to him before it ships:
  `docs/TEXT-FOR-FRANK.md` holds the lines waiting for his yes.

## Frank needs to check or supply

1. **His logo:** the original file of the logo on his Instagram profile. The big W
   app icon in `img/` stands in for it until then.
2. **His videos and photos:** the list in `docs/FILMING-GUIDE.md`.
3. **The yearly price, the trial and a payment provider** (now placeholders: 7 days
   free, and €119.99 a year, which the price screen hides until he says yes):
   `docs/ACCOUNTS-AND-PAYMENTS.md`.
4. **His WhatsApp number**, if he wants a WhatsApp button: `whatsapp` in
   `js/programs.js`, digits only with the country code (the Netherlands is 31).
5. **Programs and doses.** The workouts and reps in `js/programs.js` and
   `js/exercises.js` are sensible defaults. He may want his own.

## Run it, host it

The preview runs on GitHub Pages from the `app` branch:
https://victorfromaruba-stack.github.io/frank/. A push to `app` is live a
minute or two later (`.nojekyll` makes Pages serve the files as they are),
and Frank's clients use it.

Run `node tools/test/run.cjs` before a push, and `node tools/test/run.cjs live --wait`
after it (see `.claude/skills/frank-qa`). Shipping, rolling back and the move
to Frank's own domain are in `.claude/skills/frank-release`.

Any static host works. Serve the folder as it is; the phone install and
offline mode need HTTPS. The app loads nothing from other sites: its fonts
are in `fonts/` and three.js is in `vendor/`.

Before members pay:
- **Frank's own domain first.** The app keeps each person's data per web
  address. When it moves, `home` in `FRANK` (`js/programs.js`) turns on the "Frank's
  app has moved" banner at the old address, and its button takes each person's
  progress to the new one in a move link (`.claude/skills/frank-release`).
- **A host that allows paid apps.** GitHub Pages isn't for running a paid
  service; Cloudflare Pages and Netlify are, with the same files.

```bash
python3 -m http.server 8000           # then open http://localhost:8000
node tools/test/run.cjs               # every local test suite, 15 to 20 minutes: before every push
node tools/test/run.cjs live --wait   # the live site, after a push
node tools/check-plans.cjs            # every plan trains each body region twice a week
node tools/text-diff.mjs              # text added or changed since docs/TEXT-FOR-FRANK.md was last updated
node tools/build.mjs                  # dist/wellness-by-frank.html: the whole app in one file (about 3 MB)
node tools/build-personal.mjs         # dist/personal.html: the Personal prototype in one file
```

When you change a file the app caches, bump `VERSION` in `sw.js` so installed
phones pick up the update. The `static` suite fails until you do.

## Files

| File | What |
|---|---|
| `index.html`, `app.css` | the page and its look |
| `fonts/` | Nunito and Gilda Display, served with the app (SIL Open Font License) |
| `js/figure.js` | the 2D pose engine: poses, joints, the annotation arrows |
| `js/figure3d.js` | the 3D coach: poses the rigged models on the 2D joints, muscle view, muscle maps |
| `assets/coach-m.glb`, `assets/coach-f.glb`, `assets/CREDITS.txt` | the two coaches and their licence |
| `vendor/` | three.js r170 and its model loader (MIT) |
| `js/exercises.js` | the 80 exercises: text, doses, kit, swaps, muscles, animations |
| `js/media.js` | Frank's own clips, when he films them |
| `js/programs.js` | Frank's details, prices, workouts, the 28-day plan, safety rules, session builder |
| `js/science.js` | the science screen and its sources |
| `js/app.js` | screens, onboarding, the player, access (trial, member, client), coach tools, Today, Me, and the seam modules plug into (`WBF.ext`) |
| `js/links.js` | links to one move or one workout: a module, a feature in its own file (`.claude/skills/frank-module`) |
| `js/keep.js` | keep my progress: the backup file, the move link (`#move.`), the Instagram warning, the Home Screen sheet, storage the browser keeps, the moved banner (a module) |
| `js/onboard-flow.js` | the fast start: the eight questions before the plan, Your first week, Make it yours after Day 1, Me's Your answers (a module) |
| `js/sound.js` | beeps, voice, vibration, keeping the screen on |
| `img/` | Frank's four graphics, the app icons, and the two screenshots Android's install dialog shows (`screenshot-*.png`, not cached offline) |
| `img/brand/`, `tools/brand/` | the "W by Frank" marks (SVG) and the scripts that draw them and the app icons |
| `personal/`, `tools/build-personal.mjs` | the Personal prototype: the client's app and Frank's Coach mode on example data |
| `manifest.webmanifest`, `sw.js` | home-screen install and offline cache |
| `tools/build.mjs` | packs everything `index.html` loads into one HTML file |
| `tools/check-plans.cjs` | checks every plan type against the twice-a-week rule |
| `tools/test/` | the test suites: `node tools/test/run.cjs` taps through the app in a phone-sized browser (`.claude/skills/frank-qa`) |
| `tools/text-diff.mjs` | lists the text in `js/` added or changed since `docs/TEXT-FOR-FRANK.md` was last updated |
| `tools/client-code.mjs` | makes a client code's line for `FRANK.codes`, or with `--coach` Frank's coach code's line for `FRANK.coachCodes` |
| `tools/sheet3d.html`, `tools/sheet.html` | every exercise's key poses in 3D and 2D: open them (served) to check animations after an edit |
| `tools/coach/build_coach.py` | rebuilds the 3D coaches from the source models |
| `tools/media/process.sh`, `docs/FILMING-GUIDE.md` | Frank's videos: how to film and add them |
| `docs/ACCOUNTS-AND-PAYMENTS.md` | what a real membership needs, and which payment providers work from Aruba |
| `docs/TEXT-FOR-FRANK.md` | new or changed text waiting for Frank's yes, screen by screen, with what it said before |
| `.claude/skills/` | how to change this app safely, for Claude and other agents: `frank-app` (the code), `frank-module` (a new feature in its own file), `frank-qa` (the tests), `frank-words` (text and Frank's approval), `frank-safety` (who gets what), `frank-release` (shipping and rolling back), `frank-device-check` (real phones), `frank-showcase` (store and Instagram images) |

## Not in this version

- Accounts and syncing between phones (data lives in one browser; a backup file or a
  move link carries it to another).
- Real payments: the paywall and checkout link are ready, the server that
  checks who paid is not. Until then the paywall, client codes and the coach
  code are checks on the phone, not locks.
- Push reminders (they need a server).
- An App Store or Play Store build. The same code can be wrapped later with
  Capacitor when Frank wants it in the stores.
