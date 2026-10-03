---
name: frank-module
description: How to add a feature to the Wellness by Frank app in its own file, js/<feature>.js, through the module seam (WBF.ext) instead of editing js/app.js. Use it whenever a feature is added to Frank's app, and whenever a card, banner, button, sheet, screen, link (#name.…) or saved setting is added to Plan, Today, Me, Frank, Welcome, the price screen, the finish screen or the exercise sheet. Use it for every roadmap feature (keep my progress and backups, the fast start, your week and reminders, the honest trial, the finish screen and story cards, train with Frank, Frank in the app, the day-28 proof, a faster coach), and whenever you touch WBF.ext, WBF.app, a js/*.js module, the script list in index.html or a module's test. Use it even when the change looks small enough to drop into app.js: that's how nine features end up colliding in one file.
metadata:
  owner: victor
  version: "1.1"
---
# Wellness by Frank: a feature in its own file

`js/app.js` holds every screen, the player and the person's data in one file of about
2,800 lines. A feature doesn't go in there. It goes in its own `js/<feature>.js`, a
module, and plugs into the app through the seam at the end of `app.js`: cards in fixed
places on the screens, actions, screens of its own, links, events, and one key of its own
in the saved data. Two features never edit the same lines, and a module that breaks is
left out while the app carries on.

- The template to copy, with the test it needs: [template.js](template.js).
- A real module, small enough to read in a minute: `js/links.js` (#ex.<move> and
  #w.<workout> links). It changes none of the app's screens.
- The seam itself: "modules" at the end of `js/app.js`. Its tests: the `modules:` flow
  in `tools/test/smoke.cjs` (it runs the template), the links flow next to it (for
  `js/links.js`), and the `modules:` flow in `tools/test/static.cjs`.

## Add a feature

1. Copy [template.js](template.js) to `js/<feature>.js`. Rename every `example`: the
   function's name (it names the module in error messages), `KEY`, the actions, the
   screen and the link. Replace the top comment with what the module adds, in one line.
2. List it in `index.html` after the other modules and before `js/app.js`, and in `SHELL`
   in `sw.js`, also before `'js/app.js'`. A new or changed module is a cached file:
   bump `VERSION` (`.claude/skills/frank-release/`). `tools/build.mjs` reads the list
   from `index.html`, so the one-file builds pick the module up by themselves.
3. Build the feature from what `app` gives it (below). Don't edit `app.js` for it. If the
   seam lacks something (a slot in a new place, a new event), add that to the seam as its
   own small change, with a check in the smoke `modules:` flow, and add it to the tables
   here.
4. Every line a person reads or hears goes to `docs/TEXT-FOR-FRANK.md`
   (`.claude/skills/frank-words/`). Food, weight, body numbers, maximum efforts and health
   data follow `.claude/skills/frank-safety/`.
5. Test it: copy the flow at the end of the template into the suite for its area (a new
   area gets its own suite, see `.claude/skills/frank-qa/`), and add its screens to
   `tools/test/screens.cjs`. Run `node tools/test/run.cjs quick`, then the full run.

## How a module starts

```js
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};
  (WBF.ext = WBF.ext || []).push(function keep(app) {
    app.card('plan.top', function () { ... });
  });
})(window);
```

The module only queues its start. `app.js` starts the queue in `index.html` order, before
it reads a link and draws the first screen. Each module gets its own `app`: `WBF.app`
(the app's functions, below) plus the ways in. A module listed after `app.js` still
starts, but too late for `boot` and the first screen; the static suite flags it.

When a module throws:

- while it starts: it's left out, and everything it had added is taken back;
- later, in a card, a screen (or a screen's `html()` that gives no html), an action or an
  event: only that piece is skipped (a replaced screen falls back to the one it replaced, a
  new one shows just its Back button);
- `app.go()` or `app.tab()` to a screen that isn't there (a typo) throws before anything
  moves, so the handler stops there and the app stays on its own screen. A screen that isn't
  there by another way (one of a module that was left out) is dropped, and the one under it
  shows: the console says `there is no screen "<name>"`;
- either way the console says `Wellness by Frank: module <name> failed (<where>)`, once
  per place, and the suites fail on console errors. A broken module never passes a run.

## What `app` gives a module

The app's own functions (also `WBF.app`, which the tests and the showcase captures use):

| | |
|---|---|
| `state()` | the saved data (`wbf.v1`). Ask for it each time: another window's save or Delete my data puts a new object there |
| `save()` | writes it; `true` when the phone saved. No "Saved" toast on `false` |
| `refresh()` | draws the screen again where it is: the scroll, typed text and the focus stay. Use it after a tap in your card |
| `render()` | draws the screen again, at the scroll it was left at (the top, on a tab). The app's own taps use it |
| `go(name, params)`, `back()`, `tab(name, params)`, `cur()` | screens: open one, Back, a tab afresh, the one showing (`{ name, params }`). A name that isn't a screen throws |
| `toast(text)`, `openSheet(html, onClose, full)`, `closeOverlay()`, `confirmBox(text, yes, onYes, opts)` | a toast, a sheet, a question box (`opts`: `body`, `no`, `onNo`, `extra`, `onExtra`) |
| `status()`, `daysLeft()` | `'new'`, `'trial'`, `'ended'`, `'member'` or `'client'`; days left of the free trial |
| `planDays()`, `nextDay()`, `session(workoutId, day)`, `kcalOf(session, seconds)` | the 28 days, the next one to train, a session as the plan builds it, its calories (always shown with "est.") |
| `atRisk(p)`, `noBmi(p)`, `flags(p)` | the safety rules (`.claude/skills/frank-safety/`), for the saved profile or `p`: no food, drink or weight advice and no weight target when `atRisk()`; no BMI when `noBmi()`; `flags()` says why (`pregnant`, `child`, `medical`). They follow the answers, Me's switches and the food card's: ask each time you draw, never copy the rule |
| `sheet(moveId, tab)`, `mountFigures(root)` | a move's sheet; draws the coach, thumbnails and muscle maps in html you put on screen yourself |

`app.util`: `esc` (escape every text you put in html), `iso`, `fromIso`, `addDays`,
`monday`, `mins`, `mmss`, `plural`, `ic` (the app's icons), `figHtml`, `thumbHtml`,
`backBar` (a screen's top bar with Back), `fmtShort`, `fmtLong`.

The module's ways in:

| | |
|---|---|
| `card(slot, fn)` | `fn(arg)` gives `null` or `{ id, priority, html }`. A card slot shows one card: the highest `priority` (default 0), on a tie the module that started first |
| `html(slot, fn)` | `fn(arg)` gives html, or `''`. Every module's piece shows, in start order |
| `on(event, fn)` | the events below |
| `action(name, fn)` | `data-act="<name>"` runs `fn(el, event)`. The names are shared with the app's, so a name that exists stops the module. Start yours with the module's name. Names starting `pl-` run only during a workout |
| `screen(name, def)` | a screen of its own: `{ title(p), html(p), mount(p) }`, opened with `app.go(name, params)`. The title is the screen's name in `document.title` and in tests |
| `override(name, def)` | replaces a screen and gives back the one it replaced. Your `title`, `html` and `mount` run in place of its own: to draw the old one inside yours, call all three (below). If yours throws, the old one shows |
| `data(key, fresh)` | the module's own data, `state()[key]`, made by `fresh()` the first time it's asked for with one. One key per module, never one of the app's: call `app.data(key)` once as it starts to claim it |

A screen of the app inside yours: its search, rulers and inputs come alive in its `mount`
(Workouts, the exercise library, the finish screen, the onboarding, the session editor),
so call that too, or they do nothing.

```js
var old = app.override('workouts', {
  title: function (p) { return old.title(p); },
  html: function (p) { return '<section class="card">…</section>' + old.html(p); },
  mount: function (p) { if (old.mount) old.mount(p); }
});
```

Each card or piece sits in `<div data-slot="…" data-module="…" data-card="…">` that takes
no room on screen (`display: contents`): the screen keeps its own spacing, and tests find
a card by `[data-card="<id>"]`. With nothing to show, a screen is exactly as without
modules.

## The slots

| Slot | Kind | Where | `fn` gets |
|---|---|---|---|
| `welcome.top` | card | Welcome, under the coach, above "Your personal plan". A light screen | the screen's params |
| `plan.top` | card | Plan, under the date, above Frank's session and the plan card; with or without a plan | the screen's params |
| `plan.after-hero` | html | Plan, under the plan card | the screen's params |
| `today.top` | card | Today, under the heading, above the week strip | the screen's params |
| `me.top` | card | Me, under the name, above the numbers | the screen's params |
| `me.data` | html | Me, inside Your data, above "Delete my data and start over" | the screen's params |
| `frank.top` | card | Frank, under his bio, above "Train with Frank in person" | the screen's params |
| `pay.top` | card | the price screen, above its heading. A light screen | the screen's params |
| `done.after-stats` | html | the finish screen, under Time, Moves and kcal | the session's record |
| `done.next` | card | the finish screen, under "How did that feel?" (and the weights used), above "Want this with Frank, in person?" | the session's record |
| `sheet.foot` | html | a move's sheet, at the end, above the pager and Close | the move's id |

Welcome and the price screen are light (`body.light`): use what those screens use
(`.infobox`, `.ob-note`, `.btn.dark`, `.btn.white`). Everywhere else, the app's dark
classes: `.card`, `.label`, `.small`, `.lead`, `.btn.two.small`, `.rowx`. The screen
checks in every test (contrast, tap sizes, names) then hold for your card too. Welcome
has little room: the coach fills the top and the buttons stay at the bottom, so a card
there pushes the text under the buttons until the person scrolls. Keep it to two lines,
and look at the screen.

## The events

| Event | Gets | When |
|---|---|---|
| `boot` | `link` | once, after every module has started, before the first screen. `link` is the address after `#` when it looks like a link (`name.rest`), else `''`. Return `true` when your module opened it: the modules after yours and the app's own `#frank.` links don't get it |
| `hash` | `link` | a link opened in a tab that has the app already. Same rule. A sheet or a box that was open has closed (not during a workout), a box like its Cancel; when the box's answer leaves its screen ("Restart your 28 days?" after Edit), the link comes after that |
| `screen` | `name, root` | after a screen is drawn (`root` is `#app`). The player's own redraws don't count |
| `finish` | `rec, s` | a workout was saved (one move or more), before the finish screen draws. `rec` is its record in the history, `s` the session |
| `profile` | `old, new, changed` | the profile changed: the onboarding or Edit saved it, a health switch on Me (Pregnancy mode, Cleared by a doctor) or "Start the next 28 days". `old` is the profile before, `new` the saved one. `changed`: the sessions change. The food card's switches change `atRisk()` but not the profile: they don't send it |
| `saved` | `ok` | after every save; `ok` is `false` when the phone refused (storage full or blocked) |

An event set off inside a handler of the same event (a save in a `saved` handler, a screen
drawn in a `screen` handler) isn't passed on to any module, so nothing loops.

## Rules for a module

- **Data:** everything it keeps lives under its one key in `wbf.v1`, made lazily, with a
  `v` to migrate it later. No other storage (no localStorage keys of its own, no cookies,
  no IndexedDB): Delete my data and the merge with other windows work on `wbf.v1` only.
  Change the app's own data (`profile`, `access`, `done`, …) only when the feature needs it,
  and say so in the commit with a test.
- **Links** are `#<name>.<rest>`, for links from outside the app (Frank's messages, a
  story card). The app takes a link out of the address bar before it hands it over, so a
  reload doesn't open it twice. Open a link's screen with one `app.go()`, over the screen
  that is showing: Back goes back there. A sheet is dark and needs a dark screen under it:
  `js/links.js` opens a move's sheet over the Plan (`app.tab('plan')`, then `app.sheet()`).
  Never `app.tab()` and then `app.go()` in one handler: `tab()` takes the phone's history
  back while `go()` adds to it, and Back goes wrong. Never open a link during a workout
  (`app.cur().name === 'player'`). In the app, open things with `data-act` actions: a `#`
  link inside the app adds a history entry the app doesn't count, and the phone's Back
  goes wrong.
- **Redraw** with `app.refresh()` after a tap in your card. `app.render()` sends a tab
  back to its top.
- **Html:** escape every value with `app.util.esc`. No inline event handlers: actions only.
  Nothing from other sites, no GPL code, calories with "est.", no diet advice or weight
  targets for anyone at risk: ask `app.atRisk()` and `app.noBmi()` as you draw
  (`.claude/skills/frank-safety/`).
- **Only `app`:** a module reads nothing private from `app.js`. What it needs and can't
  get is a change to the seam (step 3).

## Before you commit

```bash
node --check js/<feature>.js
node tools/test/run.cjs quick        # static checks the file is in index.html (before app.js) and in SHELL
node tools/test/run.cjs              # every suite, before a push
node tools/build.mjs                 # prints the scripts it packed: yours is among them
node tools/text-diff.mjs             # your new words, for docs/TEXT-FOR-FRANK.md
```
