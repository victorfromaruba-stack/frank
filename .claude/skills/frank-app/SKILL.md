---
name: frank-app
description: How the Wellness by Frank workout app is built and how to change it safely. Use it whenever you add or edit an exercise, its animation or coaching text, a workout or program, the 4-week plan generator, the 3D coach figure, the membership/paywall, Frank's coach tools or client links, or the app's look; and whenever someone mentions Frank's app, wellnessbyfrank, the skeleton or 3D demos, "the generated plans", or "the science behind the plans", even without naming a file.
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: the app

A static web app (PWA) for personal trainer Frank (@wellnessbyfrank): plain HTML,
CSS and JavaScript, no build step, no server code. Two audiences:

- **Members** use generated, science-based 4-week plans. Free trial, then a
  monthly membership (`BILLING` in `js/programs.js`).
- **Frank's clients** follow sessions Frank writes in Coach tools and sends as a
  link (`#frank.<code>`). Opening a link gives them access without the membership.

Read `README.md` first. Everything a person enters is stored in their browser
(`localStorage` key `wbf.v1`).

## Files and what owns what

| File | Owns |
|---|---|
| `js/figure.js` | 2D pose engine: pose format, forward kinematics, two-bone IK, keyframe animation, the 2D skeleton |
| `js/figure3d.js` | 3D coach: body parts placed on the 2D engine's joints, one shared WebGL renderer, camera fit, drag to turn, muscle highlight |
| `js/exercises.js` | the exercise library: text, doses, kit, swaps, animation keyframes |
| `js/programs.js` | Frank's details, `BILLING`, workouts, plan rotation, `buildSession`, `buildCustom`, kcal, lessons |
| `js/app.js` | screens, player, access (trial, member, client), coach tools, progress, food, settings |
| `js/sound.js` | beeps, voice coach, vibration, screen wake lock |
| `app.css` | Frank's look (tokens at the top) |
| `vendor/three.module.min.js` | three.js r170 (MIT). Single-file builds load it from jsDelivr instead |
| `tools/build.mjs` | `dist/wellness-by-frank.html` (one file) and `dist/artifact.html` |
| `tools/sheet.html`, `tools/sheet3d.html` | every exercise's key poses, 2D and 3D, for checking animations |

## Adding or changing an exercise

1. Copy a similar entry in `js/exercises.js`. Required: `name, area, pattern,
   type ('reps'|'time'), dose {b,i,a}, eq, met, cue[3], setup, steps, mistakes,
   why, focus {j,label,at}, anim, alts`. `each: true` means per side.
2. Write the animation as keyframes. Conventions and examples:
   [references/poses.md](references/poses.md). Reuse the helpers at the top of
   the file (`stand`, `supine`, `prone`, `quad`, `plank`, `kneel`, `breathe`).
   Planted hands and feet use `{ik: [x, y]}` so they stay put while the body moves.
3. If the move needs kit, add `eq` and at least one kit-free `alts` entry: plans
   swap automatically when someone lacks the kit.
4. Check it: serve the folder (`python3 -m http.server`) and open
   `tools/sheet.html` and `tools/sheet3d.html?ids=<id>`. Look at every key pose
   in both. Hands and feet must touch the floor, nothing may pass through it.
5. The coaching text is Frank's voice: short imperative cues ("Hips back."),
   plain words, one idea per line. It is a draft until Frank approves it.

## Changing plans and workouts

- Workouts are lists of exercise ids (optionally `[id, dose]`) in `WORKOUTS`;
  levels pick doses from each exercise's `dose`.
- The 4-week plan comes from `ROTATION` (goal x days) and `WEEK` (which days
  train). `WEEK_MULT` raises the dose each week; feedback after each session
  moves `adjust` between 0.75 and 1.3.
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
python3 -m http.server 8765        # then drive it with Playwright at 390x844
node tools/build.mjs
```

- Walk through: onboarding, a full session in the player (ready, timed move,
  reps move, rest, switch sides, pause, quit), the finish screen, Progress,
  Food, Frank, Coach tools (build, send, open the link in a fresh browser),
  and an expired trial (set `access.trialStart` 10 days back).
- No console errors, no sideways scroll at 390 px.
- Bump `VERSION` in `sw.js` whenever a cached file changes.
- In this sandbox Chromium doesn't trust the proxy CA: route Google Fonts and
  jsDelivr through Node's `fetch` in the test harness. Never turn off TLS checks.

## Never

- Present calorie numbers as exact: they are MET estimates and say "est."
- Give diet advice to someone who ticked pregnant, under 18 or a medical
  condition: the Food tab only refers them to a dietitian or doctor.
- Add a GPL dependency (for example mannequin.js): the app is sold.
- Put Frank's real WhatsApp number, prices or claims in the app without his yes.
