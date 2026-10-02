# Wellness by Frank

A home workout app for Frank (@wellnessbyfrank), in his brand: forest green, sky
blue, heavy rounded capitals and thin serif notes. Modelled on Leap Fitness's
"Home Workout - No Equipment" app, built around Frank's method instead of
generic routines.

It's a web app (PWA): plain HTML, CSS and JavaScript, no build step, no server
code. On a phone it installs to the home screen and works offline.

Two kinds of users:

- **Members** train with generated, science-based plans: a free trial, then a
  monthly membership (payments are not connected yet: see
  `docs/ACCOUNTS-AND-PAYMENTS.md`).
- **Frank's clients** follow sessions Frank writes for them in Coach tools and
  sends as a link. They pay Frank, not the app.

## What it does

- **Onboarding**: goal, level, days a week, kit at home, six health questions,
  then name, age and weight (all optional). Pregnancy, injury and age 60+ change
  which moves the plan uses: no jumping, nothing flat on the back or front in
  pregnancy, balance work for 60+.
- **A 4-week plan**: training and rest days, a little harder each week, and
  sessions that adjust to "Too easy / About right / Too hard" after every workout.
- **Workouts**: Frank's three programs (Essentials, Change the method, Gravity),
  core, lower body, upper body, full body and cardio at three levels, plus mobility
  and quick sessions.
- **80 exercises**, each with a moving 3D demo (drag or tap to turn it, the
  muscles worked light up), set-up, steps, cues, common mistakes and "why it
  works". Without WebGL the app shows a 2D skeleton instead. Moves that need kit
  you don't have are swapped automatically, and you can swap any move yourself.
- **The player**: get-ready countdown, timers or rep counts, rest with +20 s and
  skip, switching sides, pause, voice coach, beeps, vibration, and the screen
  stays on.
- **Progress**: sessions, minutes, a calendar, minutes per week, weight trend and
  dumbbell weights.
- **Food**: water and a simple meal journal (protein? vegetables?). If someone is
  pregnant, under 18 or has a medical condition that affects food, the page only
  refers them to a dietitian or their doctor.
- **Frank**: his bio, the method, "Train with Frank in person" (Instagram DM),
  membership status, settings, and a delete-my-data button.
- **Coach tools** (Frank tab, For Frank): Frank builds a session from the
  library (moves, reps or seconds, circuit or sets, rest, warm-up, cool-down, a
  note), saves it, and sends it on WhatsApp or as a link.

Everything a person enters stays in their own browser (localStorage). Nothing is
sent anywhere.

## Frank needs to check or supply

1. **The words.** The exercise texts (`js/exercises.js`), the daily lessons and
   the method lines (`js/programs.js`, `js/app.js`) are drafts written from his
   graphics. He should read them and put them in his own words.
2. **His WhatsApp number**, if he wants a WhatsApp button: `whatsapp` in
   `js/programs.js`, digits only with the country code (Aruba is 297).
3. **Programs and doses.** The workouts and reps in `js/programs.js` and
   `js/exercises.js` are sensible defaults. He may want his own.
4. **Later: his own videos.** Each exercise could show a short clip of Frank
   instead of the skeleton.

## Run it, host it

Any static host works. Serve the folder as it is; the phone install and
offline mode need HTTPS.

```bash
python3 -m http.server 8000      # then open http://localhost:8000
node tools/build.mjs             # makes dist/wellness-by-frank.html, the whole app in one file
```

When you change a file, bump `VERSION` in `sw.js` so installed phones pick up
the update.

## Files

| File | What |
|---|---|
| `index.html`, `app.css` | the page and its look |
| `js/figure.js` | the 2D pose engine and skeleton: poses, joints, the annotation arrows |
| `js/figure3d.js` | the 3D coach: body parts on the same joints, one shared WebGL renderer |
| `vendor/three.module.min.js` | three.js r170 (MIT), used by the 3D coach |
| `js/exercises.js` | the 80 exercises: text, doses, kit, swaps, animations |
| `js/programs.js` | Frank's details, workouts, the 4-week plan, session builder, lessons |
| `js/app.js` | screens, the player, access (trial, member, client), coach tools, progress, food, settings |
| `js/sound.js` | beeps, voice, vibration, keeping the screen on |
| `img/` | Frank's four graphics and the app icons |
| `manifest.webmanifest`, `sw.js` | home-screen install and offline cache |
| `tools/build.mjs` | packs everything into one HTML file |
| `tools/sheet.html`, `tools/sheet3d.html` | every exercise's key poses in 2D and 3D: open them (served) to check animations after an edit |
| `docs/ACCOUNTS-AND-PAYMENTS.md` | what a real membership needs, and which payment providers work from Aruba |
| `.claude/skills/frank-app/` | how to change this app safely, for Claude and other agents |

## Not in this version

- Accounts and syncing between phones (data lives on one phone).
- Real payments: the paywall and checkout link are ready, the server that
  checks who paid is not.
- Push reminders (they need a server).
- An App Store or Play Store build. The same code can be wrapped later with
  Capacitor when Frank wants it in the stores.
