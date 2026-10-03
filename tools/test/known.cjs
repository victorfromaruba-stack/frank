// App bugs the suites already know about. A problem that matches an entry here is printed as "known" and does
// not fail the run; everything else does. When the app is fixed, the runner says the entry is no longer seen:
// delete it then. `node tools/test/run.cjs --strict` counts these as failures too.
//   suite: the suite that reports it · match: a regular expression on the problem line · why: the bug, in a line
// Keep `match` narrow (flow name + check), so a known bug can't hide a new one.
module.exports = [
];
