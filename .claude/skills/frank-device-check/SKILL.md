---
name: frank-device-check
description: A 15-minute check of Wellness by Frank on a real iPhone and a real Android phone, for everything the headless test browser can't see. Use it after any release that touched storage, sw.js, the installed app, the player, sound or the voice, Frank's clips, calendar files, sharing, the status bar or the light screens; before anyone tells Frank or Victor that something "works on phones"; and whenever someone reports a phone problem with Frank's app ("my plan is gone", "no sound", "the screen turns off", "the clock is invisible", "can't add it to my calendar", "share doesn't work", "it doesn't open at the gym"), even if nobody asks for a device check. You hand the checklist to a person with the phones and read the results they paste back.
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: the 15-minute phone check

The suites (`.claude/skills/frank-qa/`) run the app in a phone-sized Chromium. They
can't see what only a real phone does: where Safari, the home-screen app and Instagram
keep their data, the clock over a light screen, the screen staying on, the silent
switch, a calendar file, a share sheet, a phone with no signal. This check covers that,
on one iPhone and one Android phone, in about 15 minutes.

You don't have the phones: Victor or Frank does. Send them the steps that apply (all of
them the first time) and the results template at the end, and ask for the iOS and
Android versions: most phone differences come down to a version. Steps marked "if the
build has it" are for features still on their way: skip them, and they answer n/a.

## Before you start (1 minute)

- Both phones: Wi-Fi on, volume up, Do Not Disturb off, Low Power Mode or battery saver
  off for now.
- Screen lock after 30 seconds. iPhone: Settings > Display & Brightness > Auto-Lock.
  Android: Settings > Display > Screen timeout.
- Which version is live: open https://victorfromaruba-stack.github.io/frank/sw.js in
  the browser. The top line says `const VERSION = 'wbf-…'`.

## 1. Where the data lives (4 minutes)

1. **Safari** (Android: Chrome): open the site, tap Look around first, go to Today and
   tap +30 min. The card says "(30 min today)".
2. **The home-screen app.** iPhone: Share > Add to Home Screen. Android: the menu >
   Install app (or Add to Home screen). Open it from the new icon, go to Today. Does it
   say "(30 min today)"?
   On iPhone, expect no: a home-screen app keeps its own storage, apart from Safari.
   That's iOS, not a bug, and why the app needs a move link or a backup. On Android,
   expect yes.
3. **Instagram's browser.** Send the site's link in an Instagram DM (or open Frank's bio
   link) and tap it there. Look around first, Today, +10 min. Then open the site in
   Safari or Chrome again: 30 or 40? Expect 30: Instagram keeps its own storage.
4. While in Instagram's browser: does the 3D coach show, and can you scroll through the
   first onboarding steps?

Safari also deletes a site's data after 7 days of use without a visit. A home-screen app
is spared. This check can't show it; it's why the home-screen app matters.

## 2. The top and bottom of the screen (1 minute)

In the home-screen app:

1. Welcome and the onboarding (Get my plan, a few steps) are light screens, like the
   price screen (Me > See membership, there once a workout has started the free trial:
   look at it after part 3). Can you read the clock, the signal and the battery at the
   very top? `index.html` asks iOS for white text over the page (`black-translucent`), so
   the light screens draw a dark band behind it, as tall as the notch or island
   (`body.light::before` in `app.css`). Is the band there, and no taller than the clock?
2. Plan, Today and Me: readable at the top too?
3. Nothing important hides under the notch or island, or under the home bar at the
   bottom: the tab bar, the player's buttons.

Android colours its status bar from the page (`theme-color`, light on the light
screens): are the icons readable on both?

## 3. One workout: the screen, the sound, Frank's clips (4 minutes)

In the home-screen app, start a short session (Plan > Short sessions, or any workout).
Voice guidance, Sound effects and Vibration are on unless someone switched them off
(Workout settings, in the workout).

1. **The screen stays on.** Don't touch the phone through a timed move and a rest,
   longer than the 30-second lock. It must stay on. Try once in Safari or Chrome as well.
   Older iOS versions don't keep a home-screen app's screen on: note the version.
2. **Beeps and the voice, silent switch off:** the last three seconds beep, and the
   voice says "Get ready", "Halfway." and the next move.
3. **The same with the silent switch on** (iPhone: the Ring/Silent switch, or Silent
   mode in Control Center on the newest models; Android: silent mode).
4. **Music:** play music in another app and start again. Does the music keep playing,
   get quieter under the voice, or stop?
5. **Vibration (Android):** a buzz when a move or a rest starts.
6. **Lock the phone during a timed move or a rest, then open it again.** The workout
   waits, paused. (A move counted in reps simply waits for Done.)
7. **Frank's clips, if the build has them** (`js/media.js` lists one; it's empty today):
   the Video tab loops the clip without sound, also with Low Power Mode on. The How-to
   clip plays its sound, also with the silent switch on.

## 4. Calendar and sharing (2 minutes)

1. **Calendar, if the build has it** ("Add to my calendar" on Plan): from Safari, then
   from the home-screen app. Does Calendar open with the plan's days and time, and a
   reminder? Android: does the file open in a calendar app?
2. **A story card, if the build has it** (Share on the finish screen) to Instagram
   Stories, then to WhatsApp.
   Does the picture arrive whole, with the text? Write down which Instagram choices the
   share sheet offered (Stories, Feed, Messages).
3. **A session link from Frank** (needs Frank's coach code: Frank tab > Frank? Open coach
   tools, then the code): Coach tools > a session > Send on WhatsApp, to the other phone.
   Tap the link there. Where does it open, and is the session on the plan? If it opened
   in the browser, paste it in the home-screen app: Frank tab > I'm one of Frank's
   clients.
4. **Tell me when it opens** (the price screen once the free trial has started: Me > See
   membership). Instagram opens on Frank's chat. Long-press the message box > Paste: is
   "Hi Frank, I train with your app. Please tell me when the membership opens." there?
   Don't send it.

## 5. Offline at the gym, and the update bar (3 minutes)

1. **No signal.** Airplane mode on, Wi-Fi off. Close the app fully (swipe it away) and
   open it from the home screen. It opens (on Welcome, or on Plan once there's a plan),
   and Workouts, a workout with the moving coach and the Frank tab with his photos work.
2. **A whole workout offline,** to the finish screen. Network back on: still saved?
3. **The update bar,** only when a release went out since the phone last opened the
   app: open it from the home screen and stay on Plan, Today or Me. "New version ready"
   comes up; Update reloads. Check the top line of `sw.js` again: the new number.

## Reading the results

- A "no" where the step says what to expect is a bug. Reproduce what you can in the
  suites (`hosted` covers offline and updates), fix it, and ask for that step again.
- An expected "no" (the iPhone's home-screen storage, Instagram's browser) is how the
  phone works: it's the case for a move link or backup, not a fix in the player.
- Put every finding, with the phone and its OS version, in the commit message or the
  hand-over, and tell Victor what still fails.

## The results template

Ask for it filled in and pasted back as it is:

```
Frank device check · <date> · VERSION wbf-<n> (from sw.js)
iPhone: <model>, iOS <x.y>        Android: <model>, Android <n>, Chrome <n>
Answers: yes / no / n/a (not in this build) / ? (couldn't tell). A note for every no.

                                                              iPhone   Android
1.2 Safari's 30 min shows in the home-screen app                ___      ___    (expect: iPhone no, Android yes)
1.3 Instagram's 10 min shows in Safari or Chrome                ___      ___    (expect: no)
1.4 In Instagram's browser: coach shows, onboarding scrolls     ___      ___
2.1 Clock and battery readable on the light screens (the band)  ___      ___
2.2 Clock and battery readable on Plan, Today, Me               ___      ___
2.3 Nothing hidden under the notch, island or home bar          ___      ___
3.1 Screen stays on: home-screen app / browser                  ___      ___
3.2 Beeps and voice, silent switch off                          ___      ___
3.3 Beeps and voice, silent switch on                           ___      ___
3.4 Music from another app: keeps playing / quieter / stops     ___      ___
3.5 Vibration at each move                                      n/a      ___
3.6 Locked in a timed move: paused when opened again           ___      ___
3.7 Frank's clips: loop (also Low Power Mode), How-to sound     ___      ___
4.1 Calendar from the browser / the home-screen app             ___      ___
4.2 Story card to Instagram Stories / WhatsApp                  ___      ___
4.3 Session link from WhatsApp lands on the plan                ___      ___
4.4 Tell me when it opens: Frank's chat, the message pastes     ___      ___
5.1 Opens and works with no signal                              ___      ___
5.2 A whole workout offline, still saved after                  ___      ___
5.3 New version ready bar, Update shows the new VERSION         ___      ___

Notes:
-
```
