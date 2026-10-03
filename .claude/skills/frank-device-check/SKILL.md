---
name: frank-device-check
description: A 15-minute check of Wellness by Frank on a real iPhone and a real Android phone, for everything the headless test browser can't see. Use it after any release that touched storage, sw.js, the installed app, the player, sound or the voice, Frank's clips, calendar files, sharing, the status bar or the light screens; before anyone tells Frank or Victor that something "works on phones"; and whenever someone reports a phone problem with Frank's app ("my plan is gone", "no sound", "the screen turns off", "the clock is invisible", "can't add it to my calendar", "share doesn't work", "it doesn't open at the gym"), even if nobody asks for a device check. You hand the checklist to a person with the phones and read the results they paste back.
metadata:
  owner: victor
  version: "1.2"
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
   That's iOS, not a bug, and why the app has a move link and a backup (part 6). On
   Android, expect yes.
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

## 6. Keep my progress (5 to 10 minutes)

The backup file, the move link and the Home Screen sheet (`js/keep.js`). Do it with a
plan that has a workout or two, made in Safari (Android: Chrome).

1. **Instagram's browser.** Open the site from an Instagram DM. Welcome shows "You're in
   Instagram's browser". iPhone: does the ••• menu at the top have "Open in external
   browser", and does it open Safari? Android: does "Open in Chrome" open Chrome (or the
   phone's browser without Chrome)?
2. **The Home Screen sheet.** In Safari or Chrome, with a plan that has never finished
   a workout there (Look around first works: any workout), finish or end a workout: does
   "Keep your progress" come up, once? iPhone: tap Copy my plan. Are the drawn Share and
   Add to Home Screen buttons the ones Safari shows? Android: does Install the app open
   Chrome's own install box (or the menu steps, when Chrome offers none)?
3. **Into the Home Screen app (iPhone).** After Copy my plan and Add to Home Screen, open
   the new icon: Welcome > I already have a plan > Paste. Does the phone ask to paste
   (a Paste bubble), and does "Bring your plan here?" show the plan and the workouts?
   Bring it here: the plan, history and free trial are there.
4. **Save a backup.** Me > Your data > Save a backup, in Safari, then in the Home Screen
   app. Safari: is there a "Download?" question, and is the file in Files > Downloads?
   Home Screen app: does the share sheet come up with Save to Files? Android: is the file
   in Downloads?
5. **Restore it.** On the other phone (or after Delete my data): Me > Restore from a
   backup, pick the file. The same "Bring your plan here?", then the same plan.
6. **Protected.** In the Home Screen app (Android: the installed app), Me > Your data
   says "Protected from automatic clearing." after a workout. In Safari it may say "Not
   protected yet: save a backup.": note which.
7. **A move link by message, if you have time.** Me > Move my plan > Share to WhatsApp or
   Messages on your own other phone, and open it there. Does the app open with "Bring
   your plan here?" Does the chat app show a preview of the link (it must not show the
   plan: the plan is after the #)?
8. **An app installed before.** On a phone that installed the app from the live site
   before this release (Android first): open the site in Chrome. The menu must offer
   "Open in app" (or nothing), not Install again, and Me has no Install the app. The
   installed app keeps opening and updating. A phone knows the installed app by its
   folder, `/frank/`, because `manifest.webmanifest` has no `id`.
9. **Chrome on an iPhone, if it's installed there.** The Home Screen sheet (or Me > Put
   it on your home screen > Show me how) says "Tap Share in Chrome". Does Chrome's Share
   button offer Add to Home Screen, and does the new app take the pasted plan?
10. **A small iPhone (an SE) in Instagram's browser.** On Welcome, is "Your personal
    plan" above Get my plan, under the warning?
11. **Frank's client in Instagram's browser.** Open a session link from Frank in an
    Instagram DM: the session opens. Back: the Plan's first card says "your sessions
    from Frank stay in it". Move my plan, paste the link in Safari or Chrome: are the
    session and the client access there?
12. **Two windows (Android).** The installed app open, and the site in a Chrome tab. In
    the tab, restore a backup, then Undo. Switch to the installed app and tap +10 min on
    Today: back in the tab, the backup's workouts must still be gone.

## 7. The fast start (4 minutes)

From Get my plan to Day 1 (`js/onboard-flow.js`), on a phone with no plan: a private tab,
or Me > Delete my data in a browser you don't need. Use the iPhone's browser and the
Android home-screen app.

1. **Get my plan to Day 1, timed.** Tap Get my plan, answer the eight questions, then
   Start Day 1. How long until the first move plays (minutes and seconds)? Expect under two
   minutes for someone reading every screen.
2. **The phone's Back.** On the third question: iPhone, swipe from the left edge in Safari;
   Android, the back gesture or button. Each Back goes one question back, with no flicker
   or jump forward. From the first question, Back goes to Welcome.
3. **Your first week.** Does the coach move (Day 1's first move)? Is the clock readable at
   the top (a light screen)? Can you reach Start Day 1 and See my plan with your thumb, on
   the small iPhone too (after a scroll)?
4. **Sound on Day 1.** After Start Day 1, with the silent switch off: does the voice say
   "Get ready" and do the last three seconds beep? The phone only plays sound after a tap,
   and Start Day 1 is the first tap of the workout.
5. **The two coaches on mobile data.** Wi-Fi off. On "Who should demonstrate your moves?",
   do both coaches' pictures show within a few seconds?
6. **Make it yours.** After Day 1, on the finish screen: Set my level, answer both, and you
   are back on the finish screen. Then Your body: do the height and weight rulers slide
   smoothly under a thumb, and does Next bring you back?
7. **Your answers with the keyboard.** Me > Your answers > Your name: the keyboard opens,
   Next saves and the keyboard closes. iPhone: is the page back at its normal size, not
   zoomed in or pushed up?

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
6.1 Instagram: the warning; external browser / Open in Chrome   ___      ___
6.2 Keep your progress sheet once; the drawn buttons match      ___      ___
6.3 Home Screen app: I already have a plan, Paste, plan there   ___      n/a
6.4 Save a backup: Safari / Home Screen app (share sheet)       ___      ___
6.5 Restore from a backup brings the same plan                  ___      ___
6.6 Me: Protected (Home Screen app) / Safari or Chrome says     ___      ___
6.7 A move link by message opens Bring your plan here?          ___      ___
6.8 Installed before: Open in app, not Install again            ___      ___
6.9 Chrome on iPhone: Share in Chrome, Add to Home Screen       ___      n/a
6.10 iPhone SE in Instagram: heading above the buttons          ___      n/a
6.11 Frank's client in Instagram: the card, the move works      ___      ___
6.12 Two windows: Undo holds after a tap in the other           n/a      ___
7.1 Get my plan to Day 1's first move (min:s)                   ___      ___
7.2 Back: one question back, no flicker; first one to Welcome   ___      ___
7.3 Your first week: coach moves, clock readable, both buttons  ___      ___
7.4 Start Day 1: the voice and the beeps                        ___      ___
7.5 Both coaches show on mobile data                            ___      ___
7.6 Make it yours: Set my level and rulers, back to the finish  ___      ___
7.7 Your answers > Your name: keyboard, Next, page not zoomed   ___      ___

Notes:
-
```
