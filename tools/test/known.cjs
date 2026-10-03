// App bugs the suites already know about. A problem that matches an entry here is printed as "known" and does
// not fail the run; everything else does. When the app is fixed, the runner says the entry is no longer seen:
// delete it then. `node tools/test/run.cjs --strict` counts these as failures too.
//   suite: the suite that reports it · match: a regular expression on the problem line · why: the bug, in a line
// Keep `match` narrow (flow name + check), so a known bug can't hide a new one.
module.exports = [
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
  }
];
