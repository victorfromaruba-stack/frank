// The words sent to the models. Built from the move's own text in js/exercises.js, its line in the shot list
// (docs/FILMING-GUIDE.md) and the brief in coaches.json, so a fix to a move's text or camera reaches its prompt.
// They describe what a good demo looks like; the review sheet checks the result against the same cues.
//
// Gemini's image model reads like a person, so the photo prompts also list the mistakes to avoid. Veo follows a
// description better than a "don't", so the video prompt names only what should happen.
import { coachBook } from './lib.mjs';

// The move's text talks to the member ("your heels"); the prompts describe the coach.
export const third = (s) => String(s)
  .replace(/\byourself\b/gi, 'themselves').replace(/\byour\b/gi, 'the').replace(/\byou're\b/gi, 'they are')
  .replace(/\byou\b/gi, 'they');
const sentences = (s) => String(s).match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) || [];
// The set-up text also offers easier versions and stand-ins ("Low impact: step one foot out", "Two full shopping
// bags work too"). The demo shows the main version, so those sentences go.
const OPTION = /\b(easier|low impact|work too|if you need|if needed|cushion|to make it)\b|^check\b/i;
export const mainVersion = (s) => sentences(s).filter((x) => !OPTION.test(x)).join(' ');
// A clip shows one side and loops, so "then switch sides" and "put the weights down" go from its steps.
const noSwitch = (steps) => steps.flatMap(sentences).filter((x) => !/\bswitch\b|\bput the weights down\b/i.test(x));

// Start positions written out for the pilot moves, where the set-up text alone leaves the pose open. Other moves
// use their set-up text; add a line here when a move's start poses keep coming out wrong.
export const START = {
  squat: 'standing tall at the top of the squat: feet a little wider than the hips, toes turned slightly out, weight over the whole foot, arms relaxed by the sides, chest up, looking ahead',
  'push-up': 'at the top of the push-up: arms straight, hands flat on the floor a little wider than the shoulders and under the chest, fingers spread and pointing forward, the body one straight line from head to heels, balanced on the toes, neck long, looking at the floor just ahead of the hands',
  plank: 'in a forearm plank: forearms flat on the floor, elbows under the shoulders, hands relaxed, legs straight and back, feet together on the toes, the body one straight line from head to heels, neck long, looking at the floor'
};
const startOf = (m) => START[m.id] || third(mainVersion(m.setup)) + (m.kind === 'hold' ? ' Show the held position: ' + third(noSwitch(m.steps).slice(0, 2).join(' ')) : '');

// Where the camera stands: the shot list's Camera column. FILMING-GUIDE.md: "45° means the phone stands between your
// front and your side". All views see the right side, which is the side that works in a one-sided move.
export const CAMERA = {
  '45°': 'a three-quarter view: the camera stands 45 degrees off the person\'s front, toward their right side, so the front and the right side of the body both show',
  Side: 'a side view: the camera is at a right angle to the body and sees the person\'s right side',
  Front: 'a front view: the camera faces the person\'s front'
};
// Which way the body points in the frame, as the app's 3D coach does: upright facing right, on the back head left,
// on the front or on the hands head right.
function facing(m) {
  if (m.camera === 'Front') return 'The person faces the camera.';
  if (m.pos === 'supine') return 'Lying on the back, the head is toward the left edge of the frame and the feet toward the right.';
  if (m.wide) return 'The head is toward the right edge of the frame.';
  return 'The person faces toward the right of the frame.';
}
const FRAMING = 'The camera is level at hip height, about 3.5 metres away, with a natural 35 mm lens. The whole body is in the frame with about a hand\'s width of space above the head and below the feet, and the person is in the middle of the frame.';

// Kit named in the move (eq in js/exercises.js) and the shot list's set-up.
const KIT = {
  chair: 'a sturdy plain wooden chair without arms, standing firmly on the floor',
  table: 'a sturdy plain wooden table that can\'t tip',
  db: 'plain black dumbbells with no logos',
  rings: 'a pair of wooden gymnastic rings on straps that hang from above the frame',
  wedge: 'a plain grey slant board under the heels',
  pad: 'a plain grey foam balance pad on the floor',
  load: 'a heavy plain black dumbbell in each hand'
};
function kit(m) {
  const things = m.eq.map((k) => KIT[k] || k);
  if (m.place === 'At a wall') things.push('a plain wall in the same off-white as the backdrop');
  return things.length ? 'In the picture: ' + things.join('; ') + '. Nothing else.' : 'No equipment: only the coach on the studio floor.';
}

const REAL_PHOTO = 'It must look like a real photo of a real person, not a 3D render, a game character or an illustration: natural skin, ' +
  'natural fabric folds, correct anatomy (two arms, two legs, five fingers on each hand, natural joints), and hands and feet in full, ' +
  'flat contact with the floor where they rest on it. No text, no logos, no watermark, no mirror, no other people.';

// Step 1, the design: three reference photos of one look (front, then side and 45° made from the front photo).
export function lookPrompt(coachId, view) {
  const book = coachBook(), c = book.coaches[coachId];
  const scene = `Place: ${book.studio}. Light: ${book.light}.`;
  if (view === 'front') {
    return [
      `A photorealistic full-length photo of ${c.person}.`,
      `Clothes: ${c.outfit}.`,
      'They stand relaxed and upright in a neutral pose: arms loosely by the sides, feet hip-width apart, weight even, looking into the camera.',
      'Camera: straight from the front, level at hip height, about 3.5 metres away, with a natural 35 mm lens. The whole body is in the frame, with space above the head and below the feet.',
      scene,
      'This photo is the reference for a fitness app\'s demonstration coach, so the face, body and clothes are clear and sharp.',
      REAL_PHOTO
    ].join('\n');
  }
  return [
    'The reference photos show the coach. Keep exactly that person: the same face, hair, body, skin tone and clothes, in the same studio and light.',
    'A photorealistic full-length photo of the same person seen ' + (view === 'side'
      ? 'exactly from the side: they face the right edge of the frame, so the camera sees their right side.'
      : 'from 45 degrees, halfway between their front and their right side (a three-quarter view); they look ahead, toward the right of the frame.'),
    'They stand relaxed and upright: arms loosely by the sides, feet hip-width apart.',
    'Camera: level at hip height, about 3.5 metres away, with a natural 35 mm lens. The whole body is in the frame, with space above the head and below the feet.',
    scene,
    REAL_PHOTO
  ].join('\n');
}

// Step 2, the start pose: the picked coach in the move's start position, framed as the shot list says.
export function startPrompt(coachId, m) {
  const book = coachBook(), c = book.coaches[coachId];
  return [
    'The reference photos show one person, the coach, from the front, the side and 45 degrees. Keep exactly that person: the same face, hair, body, skin tone and clothes.',
    `Make one photorealistic photo, landscape 16:9, for a fitness app's exercise demonstration: the coach in the start position of the exercise "${m.name}".`,
    `Start position: ${startOf(m)}`,
    m.oneSide ? 'The move is shown on the right side: the right arm or leg is the one that works.' : '',
    kit(m),
    `Correct form, as the trainer teaches it: ${m.cues.map(third).join(' ')}`,
    `Avoid these mistakes: ${m.mistakes.map(third).join(' ')}`,
    `Camera: ${CAMERA[m.camera]}. ${facing(m)} ${FRAMING}`,
    `Place: ${book.studio}. Light: ${book.light}.`,
    `Clothes: ${c.outfit}.`,
    REAL_PHOTO
  ].filter(Boolean).join('\n');
}

// Step 3, the clip: what happens between the first and the last frame, which are the same start position.
export const KIND = {
  reps: 'The coach does 3 to 4 slow, controlled reps at a coaching pace, each rep complete and smooth. After the last rep the coach returns exactly to the start position and stays still, matching the first frame.',
  hold: 'The coach holds this position steady and still for the whole clip, calm and in control. Only small, natural movements of the chest and back: the hands and feet stay exactly where they are.',
  rhythm: 'The coach keeps a steady, even rhythm at a coaching pace for the whole clip and is back in the start position at the very end, matching the first frame.',
  walk: 'The coach walks slowly with short, even steps: a few steps, a turn, and back to the starting spot, ending in the start position and facing the same way as in the first frame.'
};
// Veo makes sound with every clip, and on 3 October 2026 its audio filter refused 4 of the pilot's 6 clips ("an issue
// with the audio for your prompt", not charged) when the prompt asked for soft breathing. The app plays the clips
// without sound, so the clip prompt leaves breathing out altogether: no sound of it, and no step or cue about it.
export const noBreath = (lines) => lines.filter((x) => !/\bbreath/i.test(x));
export function clipPrompt(coachId, m) {
  const c = coachBook().coaches[coachId];
  const steps = noBreath(noSwitch(m.steps)), cues = noBreath(m.cues);
  return [
    `A realistic demonstration video for a fitness app. The coach in the first frame, a ${c.label} in ${c.wears}, performs the exercise "${m.name}" in a bright, minimal photo studio.`,
    `Camera: ${CAMERA[m.camera]}. The camera is on a tripod and never moves: no pan, no zoom, no cuts. The whole body stays in the frame.`,
    steps.length ? `The movement: ${third(steps.join(' '))}` : '',
    KIND[m.kind],
    m.oneSide ? 'Only the right side works, as in the first frame.' : '',
    cues.length ? `Form throughout: ${cues.map(third).join(' ')}` : '',
    'Natural, realistic human motion and anatomy: natural joint angles, hands and feet keep their shape, feet stay planted where the move needs them, steady balance.',
    'The first and the last frame show the same start position, so the clip loops smoothly.',
    'Sound: only a quiet, steady studio room tone. No voices, no music.'
  ].filter(Boolean).join(' ');
}
