/* Wellness by Frank: Frank's own exercise videos.
   When a clip is listed here, the app shows it in place of the 3D coach (Video tab, player).
   How to add one: film it (docs/FILMING-GUIDE.md), run tools/media/process.sh on it, put the
   files in media/ and add a line below, for example:
     'squat': { video: 'media/squat.mp4', poster: 'media/squat.jpg', howto: 'media/squat-howto.mp4' },
   howto (optional) is a longer explained version for the How-to tab; it can also be a YouTube link. */
(function (W) {
  'use strict';
  W.WBF.MEDIA = {
  };
})(window);
