---
name: frank-showcase
description: Makes super high quality pictures of Frank's app (Wellness by Frank). Covers App Store and Google Play screenshots, Instagram posts and stories, previews to show Frank or a client, portfolio and case-study images, and big sharp renders of the 3D coach doing any exercise. Use it whenever someone wants screenshots, mockups, store listing images, marketing or social images, a preview of the app, or "better", "sharper" or "higher quality" pictures of the app or its 3D coach, even if they never say "showcase".
metadata:
  owner: victor
  version: "1.1"
---
# Frank's showcase images

The app's look sells it, and these pictures are often the first thing people see:
a store listing, an Instagram post, a preview Victor sends a client. They should look
like the app on a real phone, stay sharp at 100% zoom, and show only what the app
really does. This skill captures the real app at full phone resolution and lays the
captures out in Frank's brand. The scripts do the fiddly parts, so spend your
attention on choosing good screens, good poses and honest captions.

Everything runs from the repo root of `frank`. You need Node with Playwright
(`npm i -D playwright && npx playwright install chromium`). WebGL runs in software,
so a full set takes a few minutes.

## Quick start: a whole set in one command

```bash
node .claude/skills/frank-showcase/scripts/make.cjs appstore --coach f
```

| Set | What you get |
|---|---|
| `appstore` | 7 screenshots at 1320 x 2868, the iPhone 6.9" size Apple requires: caption on top, the phone below |
| `play` | 6 screenshots at 1080 x 1920 (caption in the top fifth, no device), plus the 1024 x 500 feature graphic |
| `instagram` | 3 feed posts at 1080 x 1440 (two big 3D coach renders, one phone) and a 1080 x 1920 story |
| `preview` | 4 images at 3000 x 2500, three labelled screens each: sign-up, plan, moves, daily use. Tall enough that the phones stay readable after WhatsApp shrinks them; tell people to send with HD on |
| `workout` | the workout part as one session in 3 images at 3000 x 2500: find a workout, every move (its three tabs), press play (player, rest, finish) |
| `portfolio` | a 3200 x 1800 hero and a 2400 x 2400 square for the studio's site |

- **Options:**
  - `--coach m|f` picks who demonstrates.
  - `--ex squat` sets the exercise on the sheet, muscle and player screens. Preset items can name their own `"ex"`,
    so a set doesn't show the same move three times; `--ex` overrides them all.
  - `--only <name>` remakes one item.
  - `--fresh` captures everything again.
  - `--out <folder>` writes there instead of the repo's `showcase/`. Use it whenever you work for someone else
    or in a shared checkout, so nothing lands in the repo.
  - `all` makes every set.
- **Output:** everything goes under `showcase/`, which git ignores:
  - `showcase/<set>/NN-<name>.png`, the finished images;
  - `spec.json`, the exact layout, which you can edit and re-run;
  - `_sheet.png`, the whole set on one page.
- **Delivering:** send `_sheet.png` first, then the full-size files they choose.

Captions live in `assets/presets.json`. Change them there, or pass your own file
with `--presets` (copy the set you need and edit it). In captions, `{cues}`, `{name}` and `{muscles}` become
the exercise's cues, its name, and its main muscles as the app names them. A coach item can set its own `size`
(a push-up reads better in a wide render), `t` (a moment between key poses), `zoom` and `note: true` (Frank's
label and arrow, big and light, for posts).

## The four tools, for anything the presets don't cover

1. **`scripts/shoot.cjs`** captures app screens: `--screens plan,player --device iphone-6.9 --coach f --ex squat`.
   - What a capture includes:
     - the real app at the device's exact pixel size;
     - a demo member nine days into a fat-loss plan;
     - an iOS status bar at 9:41 and the safe areas;
     - the HD coach, frozen in a still pose;
     - Frank's fonts.
   - `--list` shows every screen (onboarding steps, Plan, workout, the exercise sheet tabs, player, rest, done, Workouts,
     Today, Me, Frank, science, coach tools, a client's plan) and the devices: `iphone-6.9`, `iphone-6.5`, `android`
     (1080 x 1920) and `iphone`.
   - The screens tell one consistent session, so a sequence reads true:
     - the exercise page opens from today's workout when the move is in it, so its dose matches the player;
     - `done` is today's workout, finished at the app's own time and kcal estimate;
     - `rest` waits until the session clock passes 1:20 (`--rest-clock`, 0 to skip), so it comes after the player;
     - `coaches` shows the `--coach` you asked for as chosen.
2. **`scripts/coach.cjs`** renders the 3D coach big, on a transparent background:
   `--ex squat --coach f --size 2160x2700 --mat off`.
   - `--key all` renders every key pose so you can pick the strongest. The working position usually beats the start.
   - `--mode muscle` shows the anatomy view: a grey body with the worked muscles in red.
   - `--t 0.3` takes a moment between key poses (0 to 1 through the movement), for when no key pose reads well:
     a push-up halfway down shows both the arms and the body line.
   - `--note` draws Frank's serif label and hand-drawn arrow, the way his own posts do.
   - `--yaw` and `--pitch` move the camera. `--zoom 0.8` frames looser so a long floor shadow fits; whatever still
     reaches the edge fades out softly (`--fade`, default 5% of the image) instead of ending in a hard line.
3. **`scripts/compose.cjs spec.json`** lays images out. A spec is a list of
   `{ out, size, layout, theme, kicker, title, note, shots | coach, ... }`.
   - Layouts:
     - `phone`: caption plus one phone. `phoneTop` puts every phone of a set at the same height (the caption
       centres above it); `bleed` lets it run off the bottom (`true` a tenth, or a fraction such as `0.3`);
     - `band`: Google Play, no device;
     - `phones`: two or three labelled phones;
     - `hero`: words left, three phones right;
     - `coach`: a big coach render with a caption;
     - `feature`: the Play feature graphic;
     - `sheet`: a review page.
   - Themes: `forest` (Frank's green), `paper` (light), `sky`.
   - In titles, `*word*` takes the accent colour, the way the app highlights one word.
   - All options are documented at the top of `assets/compose.html`.
4. **`scripts/check.cjs spec.json`** checks the results against the store's rules: exact size, no alpha channel, aspect
   ratio, counts, and words that read as prices or claims. `make.cjs` runs it for you.

For a new screen, add a recipe to `SCREENS` in `shoot.cjs`: which demo state it needs and the clicks that reach it.
The demo account is `demoState()` in the same file.

## Stay on Frank's theme

Victor wants these to look expensive but unmistakably Frank's. Everything should feel like it came from the same hand
as Frank's own graphics and the app:

- **Colours:** Frank's forest green (`#012D12` and the `forest` theme's deeper greens) with sky blue (`#7CC4EE`) as the
  one accent. The `paper` theme is for previews and sheets, never a new palette.
- **Type:** heavy rounded capitals (Nunito Black) for the headline, thin serif (Gilda Display) for the note and labels.
  One highlighted word or short phrase per title (`*built for you*`), the way the app does it.
- **His marks:** serif labels with a thin, curved hand-drawn arrow that starts at the body part (or object) and points
  toward its label, as on his own graphics (`img/wellness-*.jpg`). `coach.cjs --note` draws them the way the app
  does; add `--note-light` for a post on his green.
- **His mark:** "W by Frank", the big W (`img/brand/`). Use the SVGs as they are; don't redraw or recolour them.
- **The coach is the hero:** big, sharp, in a pose that shows the move's point (bottom of the squat, push-up halfway
  down), lit by the app's own lights. No extra filters, glows on the figure, or stock backgrounds.
- **Brand on everything that leaves the app:** "Wellness by Frank" and @wellnessbyfrank on social posts.
- Things that pull it off-theme: emoji, extra colours, other fonts, drop-shadowed text, busy backgrounds, more than
  one idea per image.

## What makes them sharp, and how to keep it that way

- **Never upscale.** Capture at the final pixel size (`shoot.cjs` uses 3x CSS pixels, the phone's real density).
  Layouts only ever scale captures down.
- **The HD coach** (`assets/hd/coach-*.glb`, 2048 px textures) is used for every capture when present. To rebuild it you
  need Quaternius' free Universal Base Characters pack:
  `python3 tools/coach/build_coach.py "<pack folder>" f --hd`.
  The app itself never loads these files.
- **Screenshot mode** (`window.WBF_SHOT`, read by `js/figure3d.js`) draws the coach at the phone's full density, renders
  it at twice the size and scales it down for clean edges, uses 4096 px shadows, and holds a still pose.
- **Fonts** come from `assets/fonts`, so a capture never falls back to a system font. Nunito and Gilda Display are both
  under the SIL Open Font License.
- **PNG, RGB, no alpha** for anything going to a store. Coach renders keep their transparency because they're
  ingredients, not final images.
- **Look before you deliver.** Open each final image and also crop two or three spots at 100%: the coach, small
  text, the edges. Look for:
  - a blank or half-drawn 3D figure;
  - text that wraps badly or runs off the image;
  - a leftover toast;
  - the wrong coach;
  - a screen with almost nothing on it.
  The scripts catch the mechanical errors; only looking catches a dull pose or an awkward crop.

## Keep it true

These images promise things to strangers, so they follow both stores' rules and the frank-app skill's "Never" list:

- **Only what the app does today.** Never mock up a feature that doesn't exist.
- **The demo account is an example state.** Don't turn its numbers into claims. "Lost 4 kg" or "5-day streak!" as a
  caption is a promise about results.
- **No prices.** Apple guideline 2.3.7 forbids them, and the paywall's placeholder prices aren't real. Never use the
  `pay` screen in store images.
- **No promotion words or fake proof.** No "best", "#1", "top", "new", "free" or "download now". No awards, invented
  reviews or user counts. Google Play stops recommending apps that use them, and the studio doesn't fake social
  proof anywhere.
- **Devices:**
  - The phone frame is a generic phone. Don't add iPhone details (Dynamic Island, Apple logo): Apple's marketing
    guidelines reserve those for Apple's own artwork.
  - Google Play wants no device at all, which is why the `play` set uses `band`.
- **Captions are drafts in Frank's voice:** short, plain, one idea. Frank approves the words, and Victor says yes,
  before anything is posted or submitted. Until then, label the work "draft" when you send it.

## Sizes and store rules

| Where | Size | Notes |
|---|---|---|
| App Store, iPhone | 1320 x 2868 | Required; 1 to 10 images; no alpha; captions allowed |
| Google Play, phone | 1080 x 1920 | Long side at most 2x the short; 4 or more to be recommended; up to 8 |
| Google Play, feature graphic | 1024 x 500 | Required; keep the middle clear of the edges |
| Instagram feed | 1080 x 1440 (3:4) | Also 1080 x 1350 or 1080 x 1080; carousel items share one shape |
| Instagram story | 1080 x 1920 | No words in the top 14% or bottom 35% |

Details and sources are in [references/sizes.md](references/sizes.md). Re-check it before a store submission: these
rules change.
