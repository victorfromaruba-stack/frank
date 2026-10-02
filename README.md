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
  sends as a link. They pay Frank, not the app. A fuller premium version for
  them, **Personal**, is planned (`docs/PERSONAL.md`), with a clickable
  prototype in `personal/`.

## What it does

- **Onboarding** in three parts, like the reference app. Goal and focus: goal,
  body parts to focus on (shown on a muscle map), what you want most. Your body:
  who demonstrates (the male or female coach), year of birth, height and weight
  on sliding rulers with BMI, target weight with a realistic date range, the
  PAR-Q+ health questions and pregnancy, sore spots. Fitness: how active you
  are, a push-up test that sets the level, days a week, minutes, kit at home.
  Then Frank, your name, the plan being built, and a summary.
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
  explaining it), plus steps, cues, common mistakes, "why it works" and easier
  options. Drag the coach to turn it.
- **The player**: get-ready countdown, timers or rep counts, rest with +20 s and
  skip, switching sides, pause, How-to mid-workout, voice coach, beeps,
  vibration, and the screen stays on.
- **Today**: the week, active minutes, moving minutes toward the WHO 150
  (250 for fat loss), walks, water, and a simple food journal. If someone is
  pregnant, under 18 or has a medical condition that affects food, the food
  card only refers them to a dietitian or doctor.
- **Me**: workouts, minutes, streak, minutes per week, weight trend with the
  goal, a calendar, history, dumbbell weights, settings, health switches,
  membership, the science, delete my data.
- **Frank**: his bio, the method, "Train with Frank in person" (Instagram DM),
  and **Coach tools**: Frank builds a session from the library (moves, reps or
  seconds, circuit or sets, rest, warm-up, cool-down, a note) and sends it on
  WhatsApp or as a link.
- **The science** screen: every rule the plans follow, with 36 sources.

Everything a person enters stays in their own browser (localStorage). Nothing is
sent anywhere.

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

## Frank needs to check or supply

1. **The words.** The exercise texts (`js/exercises.js`), the daily lessons and
   the method lines (`js/programs.js`, `js/app.js`) are drafts written from his
   graphics. He should read them and put them in his own words.
2. **His videos**, when he's ready: `docs/FILMING-GUIDE.md`.
3. **Prices and the trial** (now placeholders: €14.99 a month, €119.99 a year,
   7 days free) and a payment provider: `docs/ACCOUNTS-AND-PAYMENTS.md`.
4. **His bio.** The app now says only what his certificate covers: fitness trainer,
   NHA level 3, with sports nutrition and biomechanics. He should approve the wording.
5. **His WhatsApp number**, if he wants a WhatsApp button: `whatsapp` in
   `js/programs.js`, digits only with the country code (Aruba is 297).
6. **Programs and doses.** The workouts and reps in `js/programs.js` and
   `js/exercises.js` are sensible defaults. He may want his own.

## Run it, host it

Any static host works. Serve the folder as it is; the phone install and
offline mode need HTTPS.

```bash
python3 -m http.server 8000      # then open http://localhost:8000
node tools/check-plans.cjs       # every plan trains each body region twice a week
node tools/build.mjs             # dist/wellness-by-frank.html: the whole app in one file (about 3 MB)
node tools/build-personal.mjs    # dist/personal.html: the Personal prototype in one file
```

When you change a file, bump `VERSION` in `sw.js` so installed phones pick up
the update.

## Files

| File | What |
|---|---|
| `index.html`, `app.css` | the page and its look |
| `js/figure.js` | the 2D pose engine: poses, joints, the annotation arrows |
| `js/figure3d.js` | the 3D coach: poses the rigged models on the 2D joints, muscle view, muscle maps |
| `assets/coach-m.glb`, `assets/coach-f.glb`, `assets/CREDITS.txt` | the two coaches and their licence |
| `vendor/` | three.js r170 and its model loader (MIT) |
| `js/exercises.js` | the 80 exercises: text, doses, kit, swaps, muscles, animations |
| `js/media.js` | Frank's own clips, when he films them |
| `js/programs.js` | Frank's details, prices, workouts, the 28-day plan, safety rules, session builder |
| `js/science.js` | the science screen and its sources |
| `js/app.js` | screens, onboarding, the player, access (trial, member, client), coach tools, Today, Me |
| `js/sound.js` | beeps, voice, vibration, keeping the screen on |
| `img/` | Frank's four graphics and the app icons |
| `img/brand/`, `tools/brand/` | the "W by Frank" marks (SVG) and the scripts that draw them and the app icons |
| `personal/`, `tools/build-personal.mjs` | the Personal prototype: the client's app and Frank's Coach mode on example data |
| `manifest.webmanifest`, `sw.js` | home-screen install and offline cache |
| `tools/build.mjs` | packs everything into one HTML file |
| `tools/check-plans.cjs` | checks every plan type against the twice-a-week rule |
| `tools/sheet3d.html`, `tools/sheet.html` | every exercise's key poses in 3D and 2D: open them (served) to check animations after an edit |
| `tools/coach/build_coach.py` | rebuilds the 3D coaches from the source models |
| `tools/media/process.sh`, `docs/FILMING-GUIDE.md` | Frank's videos: how to film and add them |
| `docs/ACCOUNTS-AND-PAYMENTS.md` | what a real membership needs, and which payment providers work from Aruba |
| `.claude/skills/frank-app/` | how to change this app safely, for Claude and other agents |

## Not in this version

- Accounts and syncing between phones (data lives on one phone).
- Real payments: the paywall and checkout link are ready, the server that
  checks who paid is not.
- Push reminders (they need a server).
- An App Store or Play Store build. The same code can be wrapped later with
  Capacitor when Frank wants it in the stores.
