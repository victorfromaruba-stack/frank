---
name: frank-words
description: Frank's voice and the approval trail for every word in the Wellness by Frank app. Use it whenever you add, change, move or delete text people read or hear in the app (any string in js/*.js, such as screens, buttons, toasts, question boxes, the voice coach, screen-reader labels, exercise cues, lessons, the science screen, prices and Frank's bio), whenever you write or update docs/TEXT-FOR-FRANK.md, and before every commit that touches js/, even a one-word fix, even when the task looks like "just code". Also use it when someone asks to word, rename, rewrite, shorten or translate anything in Frank's app, asks "what has Frank approved", "is this text OK" or "what's waiting for Frank", or wants a feature that shows a claim, a price or a number about someone's body.
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: the words

Frank approved the app's texts on 2 October 2026 (commit `16d0050`: his bio, the exercise
texts, the daily lessons and the method lines). Since then, every new or changed line is
a draft until he says yes, and the live site is what his clients read. Two rules follow:

1. Write it in his voice (below).
2. In the same change, add it to `docs/TEXT-FOR-FRANK.md`, and run
   `node tools/text-diff.mjs` to see that nothing is missing. It must exit 0 before a push.

## Frank's voice

He's a trainer who teaches ("Not only a trainer, but purposely an educator."). The app
talks the way he does on the gym floor.

- **Short and plain.** One idea per line. Common words: many readers in The Hague read
  English as a second language.
- **Imperative when it's about doing.** Cues are 2 to 5 words with a full stop: "Hips
  back.", "Ribs down.", "Push the floor away.", "Stop if it hurts."
- **"You" and "your".** Frank is "Frank" or "he", never "we". "I" is the person
  speaking: the answers they pick ("I sit most of the day", "I train with Frank") and
  the messages they send him ("Hi Frank, I train with your app…").
- **Sentence case.** Capitals only where the CSS sets them; the doc then says "shown in
  capitals".
- **Buttons say what happens:** "Get my plan", "Keep my progress", "Restart". Not
  "Submit", "OK" or "Learn more".
- **Numbers, with units:** "13 to 16 minutes", "0.5 to 1% of body weight a week". A
  calorie number always says "est.".
- **The why, in one line.** "BMI is a rough guide: it can't tell muscle from fat."
- **A warning ends in what to do:** "Talk to your midwife or doctor first."
- **Honest about limits:** "An estimate, not a promise."
- No em dashes, no hype. Contractions are fine: "you're", "don't".
- His own lines stay exactly as he wrote them, his capitals included: `FRANK.tagline`
  and the method lines on the Frank tab (`SCREENS.frank` in `js/app.js`).
<!-- check:off -->
- Plain verbs: "Open coach tools", not "Unlock coach tools". The studio's check fails
  "unlock" in any doc that quotes it, `docs/TEXT-FOR-FRANK.md` included.
<!-- check:on -->

Before and after, from batch 1 (all in `docs/TEXT-FOR-FRANK.md`):

| Before | After | Why |
|---|---|---|
| Frank is a sports nutritionist | Frank is trained in sports nutrition | his bio says "trained in" |
| Choosing moves for lose fat | Choosing moves to lose fat | read it aloud |
| Setting doses for advanceds | Setting doses for advanced | one phrase per level, from `levelFor()` |
| End and save, while the phone couldn't save | End, and the save warning | don't promise what the app can't do |
| Easier options, over a list with harder moves | Other options | say what it is |
| 45 min / Daily time | 18 min / Next session | the real number, not the one picked |

## What his bio allows

`FRANK.bio` in `js/programs.js`, approved: "Fitness trainer (NHA level 3), trained in
sports nutrition and biomechanics. Based in The Hague. Neuroscience is his side passion."

| You may say | Don't say |
|---|---|
| fitness trainer, NHA level 3 | expert, specialist, or any title or certificate beyond NHA level 3 |
| trained in sports nutrition | sports nutritionist, dietitian, nutrition coach, meal plans from Frank |
| trained in biomechanics | physio, therapist, rehab, "treats injuries" |
| based in The Hague; trains you in person at the gym you go to | online coaching (it's not in his bio: `docs/TEXT-FOR-FRANK.md` asks him), other cities |
| neuroscience is his side passion | neuroscientist, brain claims |
| his method: scapula and hips first, then strength, balance and load | a method he didn't write |

## Never write

| Never | Why | Write this |
|---|---|---|
| A health promise: "no pain", "fixes your back", "burn fat fast", a result by a date | Frank can't promise outcomes; a claim needs a source and his yes | what the plan does: "Moves that load your knee are left out." |
| A calorie number without "est." | MET estimates (`kcal()` in `js/programs.js`), not measurements | "… kcal est." The suites fail a kcal without it |
| Food, drink, calorie, BMI or weight-loss advice to anyone `atRisk()` | they need a dietitian or doctor (`.claude/skills/frank-safety/`) | "For a diet or a medical question, talk to a dietitian or your doctor first." |
| Made-up social proof: reviews, ratings, user counts, "joined today", "#1" | nobody measured it | nothing. A real review only with Frank's yes and the reviewer's |
| A price, or a new one, without Frank's yes | `BILLING` in `js/programs.js`: €15 a month is decided; the yearly price and the 7-day trial are placeholders. The price screen shows only plans with `approved: true` | the decided price only |
| Frank's WhatsApp number | `FRANK.whatsapp` stays empty until he gives it and says yes | his Instagram DM (`FRANK.dm`) |
| Words in Frank's mouth: quotes, "Frank recommends…" | he didn't say them | the app's own voice |
| Business terms: fees, what Frank charges, client numbers | the repo is public | nothing |
| Pressure: fake deadlines, "last chance", guilt about a missed day | not how he coaches | what's next, plainly |

## The approval trail: docs/TEXT-FOR-FRANK.md

The batch of lines waiting for Frank's yes. Frank reads it, so it uses his words, not
the code's.

- **Its shape:** a short intro (what "at risk" means), then one table per screen in app
  order (Onboarding, Price screen, Plan, Workout player, Exercise sheet, Today, Me,
  Frank, Coach tools, On several screens, The science; a screen with no new lines has
  no table), then "Older lines to check" (Where | Text | Why).
- **Where:** the screen, the spot, when it shows and to whom. "Year of birth, a note
  under the wheel. It shows as soon as a year 18 years ago or later is picked." Never a
  function name.
- **New text:** exactly as in the app. Variants with " / " between them. For a line with
  values, a real example ("Your first sessions take 13 to 16 minutes.") and where the
  numbers come from.
- **Old text:** the line it replaces, or "New". A line taken out gets a row too, with
  "(no line)" or "Not shown" as the new text.
- **The same line in a new place, or for new people,** is a change: give it a row (batch
  1: the save warning in the End this workout? box).
- **When:** in the commit that changes the text, so the doc is never behind the code.

When Frank answers:

- **Yes:** delete those rows in a commit that says so ("Text: Frank's yes of 12 October").
  Git keeps the history, and that commit is where `text-diff` starts from next time.
- **His own wording:** put it in `js/` exactly as he wrote it, and delete the row.
- **No:** put the old text back (the Old text column has it), or write a new draft and
  keep the row.

## Finding every changed line: tools/text-diff.mjs

```bash
node tools/text-diff.mjs                        # since the doc last changed, against your files now
node tools/text-diff.mjs d720916                # a whole batch: from the commit before its first one
node tools/text-diff.mjs d720916 --to fea0c86   # between two commits, against the doc at the second
node tools/text-diff.mjs --all                  # every line of text now, for a full read-through
```

It reads every string in `js/*.js`, joins the pieces a line is built from
(`'<b>Day ' + n + ': '` reads "Day …:"), keeps what people see or hear and leaves out
code. Then it compares the text with the starting commit and with the doc. Batch 1, the
whole batch against the doc it wrote:

```
js/app.js
  [x] 589  paintExSheet
        Other options
        was: Easier options
  [x] 844  onboard › born
        This app is made for adults. If you're under 18, train with a parent's OK. Food tracking and weight targets stay off.
        was: This app is made for adults. Train with a parent's OK; the food tracking stays off.
  [x] 2114 finishProfile
        Keep my progress  (question box)
Taken out (no longer in js/):
  [x] js/app.js, onboard › sex: Also used for the calorie estimate.

37 added or changed (37 in the doc), 4 taken out. The doc has them all.
```

- `[ ]`: not in the doc yet, so add a row. `[x]`: the doc has these words somewhere.
  Short ones ("Next", "Start") match easily: check that the row is for this spot.
- The number is the line in the new file; after it, where in the code (`onboard › born` is
  the year-of-birth step, `A › ob-next` an action).
- `…` is a value the app fills in. `(toast)`, `(spoken)`, `(question box)`,
  `(screen reader)` and `(field hint)` say how the line reaches the person.
- `was:` the old line it most likely replaced. Taken out: lines no longer in the app.
- Exit code 0: the doc has every line. 1: lines to add. 2: a usage error.

What it can't see, so look yourself:

- Text outside `js/*.js`: `index.html` (tab names, the page title and description),
  `manifest.webmanifest` (the installed name), `personal/`, pictures.
  `git diff <commit> -- index.html manifest.webmanifest personal/` shows them.
- A line that already exists, shown in a new place or to new people (a variable such as
  `SAVE_FAIL` in a new box, a changed condition).
- Capitals set by CSS (`text-transform`).
- A word in lower case on its own, which looks like an id (`squat`, `ob-next`): the units
  a screen reader says after a ruler's number ("centimetres", "kilograms", "pounds" in
  `UNIT_SAID`, `js/app.js`). List such words by hand.
- Whether it sounds like Frank. It lists; you read.

## Where the text lives

| Text | File |
|---|---|
| Exercise names, cues, setup, steps, mistakes, why, focus labels | `js/exercises.js` (`EX`; its header says the texts are drafts for Frank) |
| Goals and plan names, stages, PAR-Q questions, sore spots, kit, body parts, levels, lessons, bio, tagline, prices | `js/programs.js` (`GOALS`, `STAGES`, `PARQ`, `SORE`, `KIT`, `BODY`, `LEVELS`, `LESSONS`, `FRANK`, `BILLING`) |
| The science screen: rules and sources | `js/science.js`, mirrored in `.claude/skills/frank-app/references/science.md` |
| Screens, toasts, question boxes, the voice | `js/app.js`: `SCREENS.*`, the actions in `A`, `toast()`, `confirmBox()`, `speak()` |
| A feature's cards, screens and toasts | its own module, `js/<feature>.js` (`.claude/skills/frank-module/`). `text-diff` reads every `js/*.js` |
| Muscle names | `MUS_NAME` in `js/app.js` |
| Tab names, the page title and description | `index.html` |
| The installed app's name and description | `manifest.webmanifest` |
| The Personal prototype | `personal/` |

## Checks that already guard the words

- `node tools/test/run.cjs` (`.claude/skills/frank-qa/`): every screen a test looks at
  fails on a "kcal" without "est."; the `safety` suite checks the food card's referral
  and has a "no made-up social proof" flow; `static` checks the €15 monthly price and its
  `approved: true`, and that `FRANK.codes` and `FRANK.coachCodes` hold only hashes; the
  `paywall` suite fails on "Yearly", "€119.99", "placeholder" or "preview" on the price
  screen.
- The studio's check (`scripts/check.py` in the aruba-web-studio skill) on any doc you
  write: em dashes, banned words, contractions. It reads quoted app text too.
