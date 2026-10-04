/* Wellness by Frank: the exercise videos.
   A move listed here shows its video in place of the 3D coach (the Video tab, the player, the lists).
   The demos are made by AI (tools/media/ai/, the frank-coach-video skill): process.mjs there puts
   each approved one in media/ and prints its line, for example:
     'squat': { video: 'media/squat.mp4', poster: 'media/squat.jpg', ai: true, howto: 'https://youtu.be/VIDEO_ID' },
   ai: true: the app tags the video "AI demo" wherever it shows, never "Frank".
   frank: true in its place: a loop Frank filmed himself (tools/media/process.sh), tagged "Frank".
   Every video needs one of the two (the static suite checks it); a line with neither shows as AI.
   howto: Frank explaining the move, a YouTube link (docs/FILMING-GUIDE.md): the How-to tab plays it
   inside the app after a tap. It can also be a file in media/. A move with only Frank's video:
     'squat': { howto: 'https://youtu.be/VIDEO_ID' },
   Offline, or when a video or still doesn't load, the move shows the 3D coach. */
(function (W) {
  'use strict';
  W.WBF.MEDIA = {
    'squat': { video: 'media/squat.mp4', poster: 'media/squat.jpg', ai: true },
    'push-up': { video: 'media/push-up.mp4', poster: 'media/push-up.jpg', ai: true },
    'plank': { video: 'media/plank.mp4', poster: 'media/plank.jpg', ai: true },
    'arm-circles': { video: 'media/arm-circles.mp4', poster: 'media/arm-circles.jpg', ai: true },
    'box-squat': { video: 'media/box-squat.mp4', poster: 'media/box-squat.jpg', ai: true },
    'cat-cow': { video: 'media/cat-cow.mp4', poster: 'media/cat-cow.jpg', ai: true },
    'march': { video: 'media/march.mp4', poster: 'media/march.jpg', ai: true },
    'hip-hinge': { video: 'media/hip-hinge.mp4', poster: 'media/hip-hinge.jpg', ai: true },
    'mountain-climber': { video: 'media/mountain-climber.mp4', poster: 'media/mountain-climber.jpg', ai: true },
    'leg-swings': { video: 'media/leg-swings.mp4', poster: 'media/leg-swings.jpg', ai: true },
    'forward-fold': { video: 'media/forward-fold.mp4', poster: 'media/forward-fold.jpg', ai: true },
    'cobra': { video: 'media/cobra.mp4', poster: 'media/cobra.jpg', ai: true },
    'hip-flexor-stretch': { video: 'media/hip-flexor-stretch.mp4', poster: 'media/hip-flexor-stretch.jpg', ai: true },
  };
})(window);
