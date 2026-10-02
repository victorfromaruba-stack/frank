# Writing poses and animations

The 2D engine (`js/figure.js`) solves every frame; the 3D coach (`js/figure3d.js`)
puts body parts on the same joints. Get the 2D pose right and the 3D follows.

## Coordinates

- x points where the figure faces, y points up, the floor is y = 0.
- A standing figure is about 97 units tall. Bone lengths (`H.L`): torso 30,
  head 11 above the shoulders (radius 6.2), upper arm 15.5, forearm 14.5,
  thigh 24, shin 23, foot 8 (heel 2.4 behind the ankle). The ankle sits 2.5
  above the floor when the foot is flat.
- Angles: 0 points down, 90 forward, 180 up, -90 back.
- Figures face right when upright. Lying on the back: head to the left.
  Lying face down: head to the right. Keep this, or the spine curve bends the
  wrong way.

## A pose

```js
{ p: [x, y],          // pelvis (hip joint)
  t: 180,             // torso angle, or s: [x, y] to aim the shoulders at a point
  h: 180,             // head angle (default: same as the torso)
  sp: 0,              // spine curve: + rounds the back, - arches it
  aN: [upper, lower], // near arm as two angles (a free limb)
  aF: { ik: [x, y], b: [bx, by] }, // far arm planted at a point; b = way the elbow points
  lN: { ik: [x, y] }, lF: ...,     // legs the same way; knees default forward, elbows back
  fN: 90, hN: 90 }    // optional foot / hand angles
```

`v: 'f'` draws the figure from the front: limb angles become relative to the
torso and the far side mirrors the near side (jumping jacks, side lunge, side
plank, wall slide).

## Animations

```js
anim: { k: [poseA, poseB, ...], d: [secondsAtoB, secondsBtoC, ...], h: [holdAtA, holdAtB, ...] }
```

- The last pose moves back to the first. `wrap: true` jumps instead (circles).
- `lin: true` moves at a constant speed (circles); otherwise each move eases.
- Holds (planks, stretches): two almost identical poses, `breathe(P, dy)`.
- A free limb in one pose and a planted one in the next is fine: the engine
  converts and blends them.
- Exercise-level options passed to the animation: `props` (box, pad, wedge,
  wall, table), `hold` (`db: 'both'|'near'|'far'`, `rings: true`), `cam`
  (`{ yaw, pitch }` for the 3D camera), `focus` (the annotated joint).

## Helpers in `js/exercises.js`

| Helper | Gives |
|---|---|
| `stand(o)` | standing, feet planted, arms by the sides |
| `supine(o)` / `prone(o)` | lying on the back / front |
| `quad(o)` | hands and knees |
| `plank(anchor, shoulderY, o)` | a straight body from a planted ankle to shoulders at height y |
| `kneel(knee, shoulderY, o)` | the same from a planted knee |
| `breathe(P, dy)` | a hold that moves a little |
| `H.line`, `H.ang` | body-line maths and the angle between two points |

## Checking

- `tools/sheet.html?from=0&to=12` shows 2D key poses; `tools/sheet3d.html?ids=a,b`
  shows 3D ones. Serve the folder first.
- Look for: feet or hands below the floor, limbs through the body, a knee bending
  backwards (flip `b`), a label covering the figure (change `focus.at`).
