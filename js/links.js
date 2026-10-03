/* Wellness by Frank: links to one move or one workout, for Frank to send. #ex.<move> opens that move's sheet (Video,
   Muscle, How-to) over the Plan; #w.<workout> opens a workout from the catalogue over the screen that is showing, and
   Back goes back there. The names are the ids in js/exercises.js and js/programs.js: #ex.goblet-squat, #w.desk-reset.
   A module: it plugs into js/app.js through WBF.ext and changes none of the app's screens (.claude/skills/frank-module). */
(function (W) {
  'use strict';
  var WBF = W.WBF = W.WBF || {};
  (WBF.ext = WBF.ext || []).push(function links(app) {
    var has = function (list, id) { return Object.prototype.hasOwnProperty.call(list, id); };
    // link: the address after '#'. Not during a workout: a link never ends one
    function open(link) {
      var m = /^(ex|w)\.([a-z0-9-]+)$/.exec(link);
      if (!m || !has(m[1] === 'ex' ? WBF.EX : WBF.WORKOUT, m[2]) || app.cur().name === 'player') return false;
      if (m[1] === 'w') { app.go('workout', { id: m[2] }); return true; }
      app.tab('plan');              // a sheet is dark: over the Plan, never over a light screen (Welcome, the onboarding)
      app.sheet(m[2]);
      return true;
    }
    app.on('boot', open);           // the app opened with the link
    app.on('hash', open);           // the link opened in a tab that has the app already
  });
})(window);
