// App bugs the suites already know about. A problem that matches an entry here is printed as "known" and does
// not fail the run; everything else does. When the app is fixed, the runner says the entry is no longer seen:
// delete it then. `node tools/test/run.cjs --strict` counts these as failures too.
//   suite: the suite that reports it · match: a regular expression on the problem line · why: the bug, in a line
// Keep `match` narrow (flow name + check), so a known bug can't hide a new one.
module.exports = [
  {
    suite: 'onboarding',
    match: /build steps is missing \/Setting doses for beginner\//,
    why: 'Building your plan says "Setting doses for advanceds" when a PAR-Q yes keeps the plan at Beginner (buildSteps uses d.level, not WBF.plan.levelFor).',
    since: '2026-10-02'
  },
  {
    suite: 'onboarding',
    match: /build steps should not show \/advanceds\/i/,
    why: 'Building your plan: "Setting doses for advanceds" (buildSteps adds an "s" to every level name).',
    since: '2026-10-02'
  },
  {
    suite: 'smoke',
    match: /^easier options in the sheet: tab in the sheet of an easier option \([^)]*\): got "video"/,
    why: 'A move opened from "Easier options" inside an exercise sheet has dead Muscle and How-to tabs: openSheet() closes the old sheet, whose onClose sets XS = null after exerciseSheet() already set the new XS (js/app.js exerciseSheet/openSheet).',
    since: '2026-10-02'
  },
  {
    suite: 'paywall',
    match: /^trial: days left: paywall during the trial should not show Start my 7-day free trial/,
    why: 'Me > See membership during a running trial still offers "Start my 7-day free trial", and tapping it says "Your 7-day free trial has started" (SCREENS.pay only tells ended from not ended).',
    since: '2026-10-02'
  },
  {
    suite: 'client',
    match: /^long titles fit the screen: (session|finish) screen with a long title: sideways scroll/,
    why: 'A session title with one long word (Dutch "Bovenlichaamskrachttraining") does not wrap: the session and finish screens scroll sideways and cut it off (.wd-title and the finish heading need overflow-wrap: anywhere).',
    since: '2026-10-02'
  },
  {
    suite: 'hosted',
    match: /^a new deploy reaches the phone: two reloads after the new service worker took over, the phone still runs the old js\/app\.js/,
    why: 'sw.js fills the new cache with cache.addAll(SHELL), and refreshes with fetch(req); both go through the browser\'s HTTP cache (Pages sends max-age=600). A phone that opened the app in the 10 minutes before a push stores the OLD files under the new VERSION and shows them (files can mix versions) until a refresh after those 10 minutes. Fix: addAll(SHELL.map((u) => new Request(u, { cache: \'reload\' }))) and fetch(req, { cache: \'no-cache\' }).',
    since: '2026-10-02'
  }
];
