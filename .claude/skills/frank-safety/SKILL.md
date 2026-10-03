---
name: frank-safety
description: Who may see what in the Wellness by Frank app. The rules for members who may be under 18, are pregnant or gave birth recently, answered yes to a PAR-Q question, have a medical condition, are 60 or over, or have a sore spot, and the GDPR rule for health data. Use it before you build or change anything that shows food, drink, calories, weight, height, BMI, a target or any number about someone's body; anything that asks for a maximum effort (a fitness test, "as many as you can", a timed hold to failure); anything that picks, swaps or suggests moves (the plan generator, workouts, the exercise sheet); the onboarding health questions or Me's health switches; and anything that puts health answers in a message to Frank, a link, a file or anywhere off the phone. Also use it whenever someone mentions teens, pregnancy, postpartum, PAR-Q, a doctor's OK, older members, injuries, sore spots, diet advice, GDPR or health data in Frank's app, even if they never say "safety".
metadata:
  owner: victor
  version: "1.2"
---
# Wellness by Frank: who gets what

The app gives plans, numbers and advice to people it has never met. These rules keep it
from giving a teenager a weight-loss target, a pregnant member a move flat on her back,
or anyone diet advice they should get from a dietitian or doctor. They are hard rules:
a feature that can't follow them waits for Victor.

## The rules

"At risk" (`atRisk()` in `js/app.js`) means someone who may be under 18, is pregnant, or
has a medical condition. It's the switch for everything about food and weight. Moves follow
`avoidFor()` in `js/programs.js`. Max tests: the app has none today (the push-up question
is a guess: "A guess is fine"; the fast start asks it after Day 1, in Make it yours), so
that part of each row is the rule a new feature follows.

| Who | How the app knows | Never gets | Where in the code | Tested by (`tools/test/safety.cjs` flow) |
|---|---|---|---|---|
| **No profile yet** (Look around first) | `S.profile` is empty, so the age is unknown and `possiblyMinor()` says yes | the meal journal, the water card, food and drink lessons | `foodCard()` (its no-profile branch: the referral and Get my plan), `waterCard()` and `lessonCard()` through `atRisk()` | look around first: no food journal; food and drink: no lesson or water goal when at risk |
| **Under 18, or may be** | `possiblyMinor()` in `js/programs.js`: `age()` counts the year only, so someone born 18 years ago counts, and so does no age at all. Or the food card's Under 18 switch | a weight target; diet and drink text (meal journal, water card, food and drink lessons, the 250-minute fat-loss goal); BMI, its verdict and its advice. Moves are as for adults; the year step asks for a parent's OK | `flags().child`, then `atRisk()` and `noBmi()`; the year step's note `#born-warn` (`bornSet()`) | under 18: onboarding gives no weight target or food advice; born 18 years ago: maybe 17; fast start: no target weight or BMI verdict for anyone at risk; food card; food and drink: no lesson or water goal when at risk |
| **Pregnant, or gave birth in the last six months** | `health.pregnant`: the eighth health question, or Me > Pregnancy mode. The food card's "Pregnant or breastfeeding" switch counts for food and weight only | a weight target; diet and drink text; BMI; jumps; lying on the back or front; the balance pad and rings (falls); a max test on the floor or a plank hold (push-up tests: incline or wall only) | `flags().pregnant`, `atRisk()`, `noBmi()`; `avoidFor()` sets `supine`, `prone`, `jump` and `kit: ['pad', 'rings']`, and `safe()` reads `ex.pos`, `ex.jump`, `ex.eq` (`POS`, `JUMP` in `js/exercises.js`); the health step's Pregnancy mode box | pregnant: no weight target or BMI verdict; fast start: no target weight or BMI verdict for anyone at risk; pregnancy; other options in the exercise sheet; food card |
| **A PAR-Q yes, until cleared** | any `WBF.PARQ` answer is yes and `health.cleared` isn't on (Me > Cleared by a doctor, shown only after a yes) | jumps; vigorous moves (MET 7 or more); interval cardio days (they become the Mobility flow); a level above Beginner; any max test; in the fast start, a target weight and the fitness check (Make it yours and Your answers leave them out until a doctor clears it) | `avoidFor()` sets `gentle`, `jump`, `vigorous`; `safe()`; `levelFor()` returns `'b'`; `planDays()` swaps cardio for `mobility`; the health step's warning and Next held by `healthDone()`; the Gentle mode row of the summary and Your first week (`safeRows()`); `allowed()` in `js/onboard-flow.js` | PAR-Q yes: gentle until cleared; health questions: every one answered; fast start: no target weight or BMI verdict for anyone at risk, no fitness check while gentle |
| **A medical condition** | a yes to heart, chronic, meds or supervised (`flags().from.medical`; "Cleared by a doctor" doesn't end it), or the food card's "A medical condition that affects what I eat" switch | a weight target; diet and drink text; the BMI advice ("Ask your doctor which weight is right for you." in its place; an adult still sees the BMI and its word); "a safe weekly pace". Moves: a PAR-Q yes is the row above, until cleared; the food card's switch changes no moves | `flags().medical`, `atRisk()`; `bmiBox()`; the height step's coach line | PAR-Q chronic yes: no diet advice or weight target; fast start: no target weight or BMI verdict for anyone at risk; food card: the switches stay; food and drink: no lesson or water goal when at risk |
| **60 and over** | `age()` is 60 or more (`older()` in `js/app.js`) | jumps; a max test on the floor (push-up tests: incline or wall only). Gets a balance drill in every session but the short ones, and a calorie estimate with 2.7 in place of 3.5 (the Older Adult Compendium) | `avoidFor()` sets `jump` and `older`; `buildWith()` adds `balance` to the warm-up; `kcalOf()` passes `older()` to `kcal()` | 60 and over |
| **Each sore spot** | `profile.injuries`: shoulder, wrist, knee, ankle, back, other | every move tagged with that joint (`STRESS` in `js/exercises.js`); with Other, every jump (the app can't tell what loads it); a max test that loads the spot (wrist or shoulder: no push-up or plank test; knee: no sit-to-stand) | `avoidFor()` copies the spots to `stress` (Other sets `jump`); `safe()` reads `ex.stress`; `buildSteps()` and `safeRows()` (the summary and Your first week) say what's left out | sore spots; other options in the exercise sheet |

The same rules reach every place a move is chosen:

- `pick()` in `js/programs.js` takes the person's swap, then easier or kit-free `alts`,
  then any move with the same pattern, each one through `safe()` and `canDo()`.
  `buildSession()` uses it for plan days and every catalogue workout.
- The exercise sheet's Other options (`paintExSheet()` in `js/app.js`) shows only `alts`
  that pass `safe()` and `canDo()`. The heading goes when none do, and in the player.
- The swap sheet (`swapSheet()`) offers moves with the same pattern that pass both. No
  test covers it yet: add one when you touch it.
- Frank's own sessions (`#frank.` links, `buildCustom()`) play as he wrote them. He
  knows his client. Don't filter them without asking Victor.
- A link to one workout (`#w.<workout>`, `js/links.js`) opens it as the catalogue does,
  built by `buildSession()` for the person. A link to one move (`#ex.<move>`) opens its
  sheet as the exercise library does: the library lists every move, and only the
  sheet's Other options go through `safe()`.

What a person can change, and what it changes:

- Me > Your answers (`js/onboard-flow.js`) asks one answer at a time, each step as the
  onboarding draws it; a health question an older version never saved stays open until
  it's answered (the Health row says "Not all answered"). Without the module, Me > Edit
  asks every step again.
- Me > Health: Cleared by a doctor (after a PAR-Q yes) and Pregnancy mode change the moves
  and, for pregnancy, food and weight too.
- The food card's three switches change food and weight only. What the profile says
  shows "From your plan answers" and can't be switched off there.
- A backup or a move link brought to a phone with a plan of its own (`careful()` in
  `js/keep.js`): the phone keeps its plan, but nothing the person told the app on the other
  side is lost. A yes to a health question or pregnancy comes along as Me's switches set it
  (no restart: the sessions follow), Cleared by a doctor stays only when it covered every
  yes from both sides, the sore spots join, the year of birth that asks for more care wins
  (60 and over, or maybe under 18), and the food card's switches stay on if either side had
  them on. The box before it says "with the health answers and sore spots from both".
  Tested by the `keep my progress: a plan that comes brings its health answers` flow.

## The fast start

Someone new answers eight questions before the plan is built (`FIRST` in
`js/onboard-flow.js`); the rest comes after Day 1, in Make it yours. What keeps someone
safe never moves to after Day 1:

- **The order is checked.** `order()` in `js/app.js` refuses an order without the goal, the
  year of birth, the health questions and the sore spots, or with height, weight or a
  target before the year and the health questions (what those steps may say depends on
  them). The console names the module and the app asks its own order.
- **No target weight** for anyone at risk (the step is skipped both ways, and `profile`
  never counts it as asked), nor in gentle mode, nor before a weight is known: Make it
  yours and Your answers leave the row out (`allowed()`), and the weight step keeps its
  BMI rules (`noBmi()`, `bmiBox()`). Your body's line on the card says "BMI" only when
  `noBmi()` is false.
- **The level** starts at Beginner. The fitness check (how active, the push-up guess) is
  Make it yours's first question, left out while gentle (`levelFor()` holds Beginner
  anyway). `FITNESS_FIRST` asks it straight after the sore spots: Frank's decision.
- **Your first week** shows the summary's rows for sore spots, gentle mode and pregnancy
  (`safeRows()`, the same words) and no BMI, target or food line; nothing is saved before
  Start Day 1 or See my plan.

## Building something that touches these rules

- **Food, drink, weight, BMI or a body number:** gate it with `atRisk(p)` and `noBmi(p)`
  in `js/app.js`, for the profile or the onboarding draft on screen (`p` is either).
  Think of "no profile yet" too. The at-risk version refers to a dietitian or doctor,
  or shows nothing; it never shows a softer target.
- **Moves:** never show or play a move that hasn't passed
  `WBF.plan.safe(EX[id], WBF.plan.avoidFor(profile))` and `WBF.plan.canDo(EX[id], kit)`.
  Need a stand-in? `pick()`.
- **A maximum effort** (a test, "as many as you can", a hold until form breaks):
  `avoidFor(p).gentle` means none at all. Pregnancy and 60+ get the incline or wall
  version and no floor or plank test. A sore spot rules out any test that loads it,
  even when the test's move has no `STRESS` tag. Every test says "Stop if it hurts."
- **One place per rule.** Add a group or a rule in `avoidFor()` or `flags()`, never a copy
  of the check inside a feature. A feature in its own file (a module,
  `.claude/skills/frank-module/`) asks `app.atRisk()`, `app.noBmi()` and `app.flags()`
  each time it draws, and hears the `profile` event when the answers or Me's health
  switches change. It never rebuilds them.
- **New words** for these screens go to Frank like any other (`.claude/skills/frank-words/`).
  What may be said to whom is in the table above.

## The safety.cjs flow every such feature adds

One flow per rule the feature touches, in `tools/test/safety.cjs`, with a control that
proves the check can fail. Seed the profiles; don't tap through the onboarding again.
`Y` is the tests' year, already defined at the top of the file.

```js
await t.flow('<feature>: nothing for anyone at risk', async () => {
  const who = [
    ['pregnant', L.member({ sex: 'f', health: { pregnant: true } })],
    ['under 18', L.member({ birthYear: Y - 15 })],
    ['born 18 years ago', L.member({ birthYear: Y - 18 })],
    ['PAR-Q chronic yes', L.member({ health: { chronic: true } })],
    ['the medical switch', L.member({}, { flags: { manual: { medical: true } } })],
    ['no profile', null]
  ];
  for (const [label, st] of who) {
    const p = await t.page(st ? { state: st } : {});
    if (!st) await app.tap(p, '[data-act="browse"]');
    await app.tap(p, '.tab[data-tab="today"]');               // the screen the feature is on
    t.lacks(await app.text(p), /<what it must never show>/i, label + ': <the card>');
    await t.look(p, '<feature>, ' + label);
    await p.context().close();
  }
  // control: an adult with no health yes gets it, so the checks above mean something
  const c = await t.page({ state: L.member() });
  await app.tap(c, '.tab[data-tab="today"]');
  t.has(await app.text(c), /<what it shows>/i, 'control: an adult with no health yes');
});
```

For moves or a maximum effort, seed `{ health: { heart: true } }` (gentle),
`{ sex: 'f', health: { pregnant: true } }`, `{ birthYear: 1960 }` and each sore spot
(`{ injuries: ['wrist'] }` and so on), and check what the feature offers with
`WBF.plan.safe()` the way `planAudit()` does. Then add the feature's screens to
`screens.cjs`, as `.claude/skills/frank-qa/` says.

## Health data and messages to Frank (GDPR article 9)

Frank works in the Netherlands, so the GDPR applies. Health answers are special category
data (article 9): the PAR-Q answers, pregnancy, sore spots, the food card's switches,
weight, height, BMI, a target weight, and fitness test results. Sending them anywhere
needs the person's explicit consent for that one purpose (article 9(2)(a)).

The app sends nothing anywhere. Data leaves the phone only when the person takes it: a
backup file they save, or a move link they copy or share (`js/keep.js`), which says where
it's made who can see it. Me > Your data says "Everything you enter stays in this browser
on this phone. Nothing is sent to Frank or anyone else." The Instagram button opens a
chat with nothing filled in, and the WhatsApp button (only once `FRANK.whatsapp` is
filled in) fills in a hello with no health data. "Tell me when it opens" on the price
screen copies a message with no health data for the person to paste in Frank's chat.

A feature that lets someone tell Frank about their health:

1. **Off until ticked.** Each health item is its own box, unticked every time, named
   plainly: "Add my sore spots (knee)". The message holds no health data until a box is
   ticked. A ticked box isn't remembered for next time.
2. **Who, how and why, next to the boxes:** "This goes to Frank in an Instagram message,
   so he can plan your first session."
3. **The whole message on screen before it goes,** and the person can edit it.
4. **The person sends it** from their own app: the share sheet, the DM, WhatsApp. The app
   never sends it itself, and never puts health data in a web address a server sees (no
   query strings, no analytics).
5. **Only what the purpose needs.**
6. **Nobody who may be under 18** (`possiblyMinor()`) gets health boxes: the app can't
   check a parent's consent, and Dutch law sets 16 for consent online.
7. **The privacy line changes too:** "Nothing is sent to Frank or anyone else" in Me (in
   `settingsCards()`) and the README, with the new text sent to Frank.
8. **A server is a separate decision.** Accounts, sync or Personal storing health data
   need consent records, a privacy notice and a data processing agreement. Ask Victor.

Its flow in `safety.cjs`: the message holds no health words before a tick, every box
starts unticked, someone who may be under 18 gets no boxes, and what's on screen is what
gets sent. A link or file that carries the person's own data (a backup, a move link)
says so where it's made: "Anyone with this link can see your answers. Keep it to
yourself."
