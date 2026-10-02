---
name: frank-app
description: How the Wellness by Frank workout app is built and how to change it safely. Use it whenever you add or edit an exercise, its animation, video or coaching text, a workout or program, the 28-day plan generator, the 3D coach (models, poses, muscle view), Frank's filmed clips, the onboarding, the membership/paywall, Frank's coach tools or client links, or the app's look; and whenever someone mentions Frank's app, wellnessbyfrank, the 3D coach or demos, "the generated plans", or "the science behind the plans", even without naming a file.
metadata:
  owner: victor
  version: "2.0"
---
# Wellness by Frank: the app

A static web app (PWA) for personal trainer Frank (@wellnessbyfrank): plain HTML,
CSS and JavaScript, no build step, no server code. Modelled on Leap Fitness's
"Home Workout - No Equipment" app. Two audiences:

- **Members** get generated, science-based 28-day plans. Free trial, then a
  membership (`BILLING` in `js/programs.js`; prices are placeholders).
- **Frank's clients** follow sessions Frank writes in Coach tools and sends as a
  link (`#frank.<code>`). Opening a link gives them access without the membership.

Read `README.md` first. Everything a person enters is stored in their browser
(`localStorage` key `wbf.v1`).

## Files and what owns what

| File | Owns |
|---|---|
| `js/figure.js` | 2D pose engine: pose format, forward kinematics, two-bone IK, keyframes. Every pose is solved here first |
| `js/figure3d.js` | the 3D coach: a rigged human (male or female) posed on the 2D engine's joints, contact with floor, box, table and wall, the Demo/Muscle/map shading, muscle-map pictures, coach portraits |
| `assets/coach-m.glb`, `assets/coach-f.glb` | the two coaches, built by `tools/coach/build_coach.py` from Quaternius' Universal Base Characters (CC0, `assets/CREDITS.txt`) |
| `assets/hd/` | 2048 px texture copies of the coaches (`build_coach.py --hd`), only for screenshots and marketing renders: the app never loads them |
| `js/exercises.js` | the 80 exercises: text, doses, kit, swaps, METs, muscles (`MUS`), joint stress (`STRESS`), animation keyframes |
| `js/media.js` | Frank's own clips, by exercise id. A clip replaces the 3D coach in the Video tab, the player and lists |
| `js/programs.js` | Frank's details, `BILLING`, body parts, kit, workouts, the 28-day plan, safety (`avoidFor`, `safe`), the session builder, kcal |
| `js/science.js` | the science screen: rules and 36 sources. Mirrors `references/science.md` |
| `js/app.js` | screens and navigation, onboarding, paywall, plan, workouts, exercise sheet, player, Today, Me, Frank, coach tools, access |
| `js/sound.js` | beeps, voice coach, vibration, screen wake lock |
| `app.css` | Frank's look; tokens at the top. Light screens (welcome, onboarding, paywall) use `body.light` |
| `vendor/` | three.js r170 and its GLTF loader (MIT). Single-file builds load them from jsDelivr |
| `tools/build.mjs` | `dist/wellness-by-frank.html` and `dist/artifact.html`, one file each, coaches embedded |
| `tools/check-plans.cjs` | counts what every plan type trains per week; must pass |
| `tools/sheet3d.html` | contact sheet of 3D key poses: `?ids=a,b`, `from`, `to`, `keys`, `mode=muscle|map`, `coach=f`, `yaw`, `pitch` |
| `tools/media/process.sh`, `docs/FILMING-GUIDE.md` | Frank's clips: how to film them, and how to turn one into app files |
| `.claude/skills/frank-showcase/` | store screenshots, Instagram posts, previews and portfolio images of the app. It sets `window.WBF_SHOT` (screenshot mode in `js/figure3d.js`) and uses `WBF.app.sheet()`, `nextDay()`, `session()` and `kcal()`; keep them working |
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
   new or changed text is a draft until he approves it.

## Frank's videos

Film and process as in `docs/FILMING-GUIDE.md`, then add the printed line to
`js/media.js`. The 3D coach stays for the Muscle tab and every move without a
clip. Videos are H.264 MP4: the test Chromium can't play them, so tests serve
VP9 copies with the same names. The service worker leaves videos to the browser.

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

## Access, money and links

- `status()` in `js/app.js`: `new`, `trial`, `ended`, `member`, `client`.
  `mayTrain()` gates members' workouts; Frank's sessions are always open.
- Payments are not connected. `BILLING.paymentLink` takes any checkout link
  (Paddle, PayPal; Stripe only if the business is registered in a Stripe country,
  since Stripe doesn't accept Aruba). Real access control needs a server: accounts
  plus a webhook that marks `paid`. Until then the paywall is a client-side gate,
  easy to bypass. See `docs/ACCOUNTS-AND-PAYMENTS.md`.
- Client links carry the whole session, base64url JSON after `#frank.`. Keep
  them plain-anchor safe (letters, digits, `-`, `_`, `.`). `cleanSpec()`
  validates everything that comes in.

## Check your work

```bash
for f in js/*.js sw.js; do node --check "$f"; done
node tools/check-plans.cjs
python3 -m http.server 8765        # then drive it with Playwright at 390x844
node tools/build.mjs
```

- Walk through: welcome, the whole onboarding (rulers, year wheel, health
  questions, build, summary), the paywall, Plan (28-day grid, this week), a
  workout, the exercise sheet (Video, Muscle, How-to, the pager), a full session
  in the player (ready, timed move, reps move, rest, switch sides, pause, quit),
  the finish screen, Workouts (body parts, filters, search), Today, Me, Frank,
  Coach tools (build, send, open the link in a fresh browser, press Back), and an
  expired trial (set `access.trialStart` 10 days back).
- No console errors, no sideways scroll at 390 px. WebGL in headless Chromium:
  launch with `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- Block service workers in tests that route requests (`serviceWorkers: 'block'`).
- Bump `VERSION` in `sw.js` whenever a cached file changes.
- In this sandbox Chromium doesn't trust the proxy CA: route Google Fonts and
  jsDelivr through Node's `fetch` in the test harness. Never turn off TLS checks.

## Never

- Present calorie numbers as exact: they are MET estimates and say "est.".
- Give diet advice to someone who ticked pregnant, under 18 or a medical
  condition: the food card only refers them to a dietitian or doctor.
- Show made-up social proof: no invented reviews, user counts or "X people
  joined today".
- Add a GPL dependency (for example mannequin.js): the app is sold. Models and
  textures must be CC0 or licensed for commercial use.
- Put Frank's real WhatsApp number, prices or claims in the app without his yes.
