---
name: frank-coach-video
description: Realistic AI exercise demo videos for Wellness by Frank, made with Google's Veo 3.1 Fast and Gemini's image model (tools/media/ai/ and the Coach video workflow), to replace the 3D cartoon coach in every move's demo, labelled AI demo (Frank's own videos explain the moves on YouTube, in the How-to tab). Use it whenever someone wants better, realistic or modern exercise demos, AI video, new coach renders or coach photos, says the 3D coach looks fake, glitchy, low-poly or childish, or wants to replace the 3D coach. Also use it whenever you touch tools/media/ai/, .github/workflows/coach-video.yml, the coach-video branch, GEMINI_API_KEY or a js/media.js line with ai: true, and before any paid Veo or Gemini image call, even if nobody says "Veo" or "AI".
metadata:
  owner: victor
  version: "1.0"
---
# Wellness by Frank: AI coach videos

Victor finds the 3D coach (Quaternius low-poly models, posed by hand-keyed keyframes) glitchy,
fake and childish. The fix: a realistic demo clip per move, made by AI and labelled as AI in
the app. Victor decided on 4 October 2026 that the AI demos stay: Frank doesn't film loops, he
explains each move in a video on YouTube, which the app plays inside the How-to tab (`howto` in
`js/media.js`). The app plays a clip in place of the 3D coach when `js/media.js` lists one, so
the AI clips use that slot and the same processing as any clip (`docs/FILMING-GUIDE.md`,
`tools/media/process.sh`).

Everything is in `tools/media/ai/`. Plain Node 22 scripts, no npm packages; ffmpeg for the
review and the processing. Each script explains itself at its top.

## The plan

1. **Two coaches**, both made up: a woman and a man, fit but realistic, in Frank's green top and
   black shorts, plain trainers, in a bright studio like the app's. The design step makes two
   looks of each (front, side and 45 degrees). Victor picks one look per coach.
2. **A start pose per move**: the picked coach in the move's start position, framed as the shot
   list says (45°, Side or Front). Two candidates; Victor picks one.
3. **A clip per start pose**: Veo 3.1 Fast animates it, 8 seconds, 16:9, 720p. The start pose is
   the first and the last frame, so the clip ends where it starts and loops.
4. **Review**: a sheet with each take, its frames and the move's cues. Frank looks at the form.
   Whoever says yes approves the take (`approved.json`).
5. **Into the app**: approved takes become `media/<id>.mp4` and `media/<id>.jpg` through
   `process.sh`, with a `js/media.js` line marked `ai: true`, which the app tags AI demo.
6. **Frank explains a move on YouTube**: the link goes in the move's `howto`; the AI demo stays.

A person decides between steps 1, 2 and 3, so each runs as its own request.

## What it costs

Prices from Google's pricing page on 3 October 2026 (`PRICES` in `lib.mjs`; check them before a
big batch).

| What | Price | Pilot |
|---|---|---|
| A photo (coach look or start pose), Gemini 3.1 Flash Image at 1K | $0.067, plus a $0.01 allowance for the prompt, the reference photos and the model's thinking: about $0.08 | 12 looks + 12 start poses: $1.85 |
| A clip, Veo 3.1 Fast | $0.10 a second at 720p ($0.12 at 1080p): $0.80 for 8 s | 6 clips: $4.80 |
| The pilot | | about $6.65, in three runs |
| All 80 moves, one coach, one take each | 2 start poses and 1 clip a move | about $76; with retakes, plan on $100 |

The brief guessed $0.04 a photo: that was Gemini 2.5 Flash Image, which Google shut down on
2 October 2026. Its successor costs $0.067. A video Veo blocks costs nothing, and the model's
draft images aren't charged.

The money guard, in every script:

- **Every run prints its estimated cost first**, before anything is sent.
- **It refuses a plan over budget.** The budget is $5 per run unless raised on purpose:
  `--budget 12`, or `"budget": 12` in a request file. Ask Victor before raising it.
- **It counts every call before sending it** and stops before the one that would pass the
  budget. A call counts at its full price once the API accepts it, so the count errs high.
- **A paid request is never sent twice by accident.** A retry happens only when the API says it
  did nothing (429, 500, 503).
- The estimate isn't the bill. Also set a budget alert on the Google Cloud billing account
  behind the key.

## The key

Veo has no free tier: the key needs a Google project with billing on.

- **On GitHub:** Settings > Secrets and variables > Actions > New repository secret, name
  `GEMINI_API_KEY`, the value from Google AI Studio (Get API key). The workflow fails at once,
  with that message, when it's missing.
- **On a computer or in a later session:** `export GEMINI_API_KEY=...` in the shell. Never in a
  file in the repo, never in a request file, never in a commit message or a chat.
- The scripts read it only when a paid call goes out, send it only in the `x-goog-api-key` header
  and only to the API's host, and print `***` in its place. A download that redirects to a
  storage host is followed by hand without the key (fetch on its own would pass it along).
- No key? `--dry-run` writes every request without sending it, and `test.mjs` runs everything
  against a local stand-in of the API.

## Running it on GitHub

`.github/workflows/coach-video.yml` runs the request files in `tools/media/ai/requests/` that a
push to the **coach-video** branch adds or changes. It never runs on `app`, the live site: the
job skips every other branch, also when started by hand. It checks the requests, the cost and
the key first, then makes what they ask, and keeps it all as the run's artifact
(`coach-video-<run id>-<attempt>`, kept 90 days). Nothing is committed by the workflow, so raw
takes never reach the repo. The run's page shows the estimate and what was made.

One-time setup:

1. The secret above.
2. The branch: `git push origin origin/app:refs/heads/coach-video` (once the commit with
   `tools/media/ai/` is on `app`). Agents prepare commits; Victor pushes, since a push to
   coach-video spends money. In a checkout others work in, use a worktree:
   `git fetch origin && git worktree add ../frank-coach-video coach-video`.
3. To start a run by hand (Actions > Coach video > Run workflow, branch coach-video), GitHub
   wants the workflow file on the default branch (`main`) too. Push runs don't need that.

A run: copy a file from `requests/examples/` to `requests/`, change it, commit, push. Only files
directly in `requests/` run; changing one runs it again (and costs again). A run stops after
90 minutes, so keep a request to about 40 clips.

**Google's daily limit on clips.** On 4 October 2026 the key's tier allowed about 16 Veo requests
a day (a filtered clip counts too): the rest got `429 RESOURCE_EXHAUSTED` ("You exceeded your
current quota"), which costs nothing, and sending them one at a time didn't help. The limit
resets at midnight Pacific time (07:00 UTC). So send at most about 15 clips a day; pictures have
their own, much higher limit. The project's limits are on AI Studio's rate-limit page
(https://aistudio.google.com/rate-limit); a higher tier (Tier 2 after $100 spent and 3 days)
raises them, or ask Google for more there. Only one run goes at a time: a second push waits, and
a third replaces the waiting one, so its request never runs. Push the next request once the
last one has started. A request file:

```json
{
  "about": "Pilot, part 3: one 8 s clip per picked start pose, and the review sheet.",
  "steps": ["clip", "review"],
  "coaches": ["f", "m"],
  "moves": ["squat", "push-up", "plank"],
  "takes": 1,
  "budget": 5
}
```

`steps`: design, keyframe, clip, review (review goes with clip). `moves`: ids, or a batch of the
shot list: `first-20`, `next-25`, `other-35`, `all`. More fields: `looks`, `candidates`,
`resolution` (`720p` or `1080p`), `parallel` (clips at once, 3; 1 when the key's rate limit is
low), `dryRun`, and the models (the top of `batch.mjs`).

To get the results: the run page > Artifacts, or `gh run download <run id> -D tools/media/ai/out`.

## Running it on a computer

Same scripts, with the key in the shell. A request file works here too:
`node tools/media/ai/batch.mjs tools/media/ai/requests/examples/pilot-1-coaches.json`.

| Step | Command | Makes |
|---|---|---|
| 1. Looks | `node tools/media/ai/design.mjs --coaches f,m --looks 2` | `out/<run>/coaches/<coach>/look-<n>/front.jpg, side.jpg, 45.jpg` |
| Pick a look | `node tools/media/ai/pick.mjs look f 2 --by Victor` | `tools/media/ai/coaches/f/` (commit it) |
| 2. Start poses | `node tools/media/ai/keyframe.mjs --moves squat,push-up,plank --candidates 2` | `out/<run>/keyframes/<coach>/<move>/1.jpg, 2.jpg` |
| Pick one | `node tools/media/ai/pick.mjs start squat f 1` | `tools/media/ai/keyframes/f/squat.jpg` (commit it) |
| A jump's pick, with room above the head | `node tools/media/ai/pick.mjs start burpee m 1 --wider 0.85` | the photo at 85% on the same frame, the studio extended around it, and `wider` in its `.json` |
| 3. Clips | `node tools/media/ai/clip.mjs --moves squat,push-up,plank` | `out/<run>/takes/<coach>/<move>/take-1.mp4` |
| 4. Review | `node tools/media/ai/review.mjs` | `out/<run>/review/index.html` and `sheet.png` |
| Approve | `node tools/media/ai/approve.mjs squat f take-1 --by Frank` | an entry in `tools/media/ai/approved.json` (commit it) |
| 5. Process | `node tools/media/ai/process.mjs` | `media/<id>.mp4`, `media/<id>.jpg` and the `js/media.js` lines |

- Every paid step takes `--dry-run`, `--budget`, `--coaches`. `pick`, `approve`, `review` and
  `process` take `--from <run folder or unzipped artifact>`; the default is the newest run in
  `out/` that has what they need.
- Without Node, a pick works by hand: put the look's three photos in
  `tools/media/ai/coaches/<coach>/` as `front.jpg`, `side.jpg`, `45.jpg`, or the start pose as
  `tools/media/ai/keyframes/<coach>/<move>.jpg`, and commit them on coach-video.
- A clip still being made when a run ends keeps its operation in its `.json`. Google keeps a
  video 2 days: `node tools/media/ai/clip.mjs --fetch --from <run folder>` gets it, at no cost.
- The words sent to the models are in `prompts.mjs` (built from `js/exercises.js` and the shot
  list) and `coaches.json` (the coaches and the studio). When a move's start poses keep coming
  out wrong, write its start position in `START` in `prompts.mjs`. The pilot moves have one, and
  so do the moves whose set-up text left the start open: the image model tends to draw the top of
  a bridge or a raise, or a squat or lunge halfway down, where the clip should start.
- A move that jumps needs room above the head, or the jump leaves the frame (day 2's jump squat).
  The image model draws a standing person top to bottom whatever the framing words say, so pick
  the start pose with `--wider` (0.85; 0.8 for a jump squat): the photo goes smaller on the same
  frame and the plain studio is extended around it. Look at the result before committing it: it
  suits the plain backdrop, not a picture with things near its edges.
- A start pose the image model won't draw (its answer has no picture) is left out with a warning,
  and the other start poses go on. Ask for that move again in a later request.

## The pilot

Three moves, squat (45°, reps), push-up (Side, reps) and plank (Side, a hold), with both
coaches. Three requests in `requests/examples/`, each under the $5 budget:

1. `pilot-1-coaches.json`: two looks per coach, $0.92. Victor picks a look per coach.
2. `pilot-2-start-poses.json`: two start poses per move and coach, $0.92. Victor picks.
3. `pilot-3-clips.json`: six clips and the review sheet, $4.80. Frank reviews.

Then decide: which coach the app uses (it plays one clip per move), whether the clips are good
enough to go on, and the label's words. The pilot (3 and 4 October 2026, $7.44): five good clips
after retakes (the audio filter, a shallow squat, a push-up whose legs glitched); Victor: the AI
demos stay, Frank explains the moves on YouTube. Still open: which coach, and the full set. Before running a request, run it with `--dry-run` and
read a body or two in `out/<run>/calls/`.

## Reviewing a take

Open `review/index.html` from the run (in the artifact: `<run>/review/index.html`). Each take
plays in a loop, with its start, middle and end frames, the picked start pose, Frank's cues,
the set-up, the steps and the mistakes. Two numbers are measured with ffmpeg, as hints: the loop
seam (SSIM of the first frame against the last; near 1 means the loop joins cleanly) and how
close the first frame is to the picked start pose. Watching decides.

Reject a take when any of these is true:

- **The form doesn't match every cue exactly**, at the start, in the middle and at the end. These
  clips teach a move in Frank's name. Victor decided on 4 October 2026 that a clip goes in once
  its form is checked against Frank's cues (by Claude or a person); Frank looks at each in the
  app, and one he doesn't like comes out (its line and its approval) or is made again.
- **Warped hands or feet:** fingers or toes that melt, merge, slide or change shape.
- **Extra or missing limbs**, even for one frame.
- **A wrong rep path:** a joint bending the wrong way, the wrong depth or line, reps that differ.
- **A jump in the loop:** watch the end run into the start a few times.
- **Text, a logo, a visible watermark**, another person, or a camera that moves.
- The face or clothes changing, or a look like a cartoon or a game.

Approve with who said yes: `node tools/media/ai/approve.mjs <move> <coach> <take> --by Frank`.

A take that is good but jumps in its last moments (pilot 3's push-up: the feet slid back into
place to meet the last frame) can loop earlier: find a frame after the last rep that matches the
first one (the frames every half second on the review sheet, or ffmpeg), and approve with
`--end <seconds>` at that frame. `process.mjs` cuts the clip just before it. Watch the cut loop a
few times before approving.
The approval holds the take's run and sha256, so only that exact file can be processed. Commit
`approved.json`. To take one back, delete its entry. A rejected take needs no record: make a new
take (`"takes": 2`, or the same request again).

## Into the app

`node tools/media/ai/process.mjs --from <run folder or artifact>` runs `tools/media/process.sh`
on every approved take: no sound (Veo always makes some), cropped as the shot list's set-up asks
(4:3 for standing moves, the whole 16:9 frame on the floor), compressed, a still for the lists,
and the last frame cut, since the loop's first frame follows it. It prints the lines:

```js
    'squat': { video: 'media/squat.mp4', poster: 'media/squat.jpg', ai: true },
```

It never writes `js/media.js` itself, and it refuses three things: a take nobody approved (or
that changed since), a move approved for both coaches without `--coach` (the app plays one clip
per move), and a move whose `js/media.js` line has `frank: true` (Frank's own clip) or a clip
line with neither `ai: true` nor `frank: true` (someone has to say whose it is).

### How the app shows an AI clip

A move whose `js/media.js` line has `ai: true` gets an "AI demo" tag on its video wherever it
plays (the exercise sheet, the workout player, Next, the plan cards, the welcome screen, a
workout), an "AI" tag on its still in the lists, and "Made by AI, not filmed." under it in the
exercise sheet. It never gets the "Frank" tag: only a line with `frank: true` does, and a clip
line with neither flag shows as AI (the static suite asks for one of the two on every clip).
The How-to tab plays Frank's YouTube video when the move's `howto` has one (a panel first:
nothing loads from YouTube until a tap), else the AI demo in slow motion, still tagged; a
`howto` that is neither a YouTube video nor a file in `media/` is left out. The Muscle tab keeps
the 3D muscles. Offline, or when a video or still doesn't load, the move shows the 3D coach
without the tag and the note (videos aren't kept offline); with reduced motion the decorative
clips (the welcome screen, the plan cards) stand still; the single-file builds show the coach.
`tools/test/media.cjs` checks all of it.

Adding the lines `process.mjs` prints: put them in `js/media.js`, keeping a move's `howto` if it
has one, bump `VERSION` in `sw.js` (`js/media.js` is cached), run the suites, look at the moves
in the app, and ship (frank-release). New words for the label go through frank-words first.

## Labelling AI demos honestly

- Every AI clip in the app says it's AI, wherever it plays.
- The coaches are made-up people. Never give the models a photo, a name or a description of a
  real person: not Frank, not a client.
- Store screenshots, posts and previews (frank-showcase) show an AI clip only with its label,
  never as Frank filming.
- Every Veo video and Gemini image carries Google's invisible SynthID watermark. Leave it.
- Frank works in the Netherlands: the EU's AI Act asks for realistic AI-made video of people to
  be disclosed as AI-made. The label does that.

## When Frank's video of a move is on YouTube

1. Put the link in the move's line in `js/media.js`: `howto: 'https://youtu.be/<id>'` (youtu.be,
   youtube.com/watch, shorts and embed links all work). The AI demo stays.
2. Bump `VERSION` in `sw.js` and ship it (frank-release). The How-to tab now shows his panel.

If Frank ever films a loop of his own: `tools/media/process.sh <clip> <id> <start> <end>` (with
`--wide` for floor moves) overwrites `media/<id>.mp4` and `media/<id>.jpg`; put `frank: true`
in place of `ai: true` on the move's line, delete the move's entries in `approved.json` (from then on `process.mjs`
refuses to put an AI clip there), bump `VERSION` and ship.

## Testing without a key

`node tools/media/ai/test.mjs` (about a minute, in a temporary folder; the repo doesn't change):
syntax; the 80 moves against the shot list and their prompts; the pilot's dry run, with every
body checked against the docs' shapes and the estimates; the budget and key guards; the whole
flow against `mock-server.mjs`, a local stand-in of the API (a busy answer tried again, the start
pose sent as the first and last frame, the operation polled until done, the download's redirect
followed without the key, a filtered and a failed clip, `--fetch`); the review sheet; approve and
process into a copy of the app (no sound, the crop, the line, the label warning, Frank's clip
left alone); the workflow's YAML and rules; and the key in no file or output. Without ffmpeg,
the review and processing parts say SKIP. `node tools/media/ai/mock-server.mjs` also runs on its
own, to try a script by hand against it.

## What was checked against Google's docs, and what wasn't

Read on 3 October 2026: ai.google.dev/gemini-api/docs/veo, /image-generation, /interactions,
/pricing and the API reference, plus Google's JS SDK 2.27 for what it sends.

Checked:

- **Veo:** `POST /v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning` with
  `instances[0]` (`prompt`, `image`, `lastFrame`, each `{"bytesBase64Encoded", "mimeType"}`, as
  Google's JS SDK sends them; the docs write `{"inlineData": {"mimeType", "data"}}`, which the API
  refused on 3 October 2026: "`inlineData` isn't supported by this model", a 400 at no cost)
  and `parameters` (`aspectRatio` 16:9 or 9:16, `resolution` 720p, 1080p or 4k, `durationSeconds`
  4, 6 or 8, 8 for 1080p, 4k or reference images, `personGeneration` "allow_adult", the only
  value for image-to-video and first-and-last frames, and in the EU). Up to 3 `referenceImages`
  with `referenceType` "asset". The answer's `name`; `GET /v1beta/<name>` until `done`; the video
  at `response.generateVideoResponse.generatedSamples[0].video.uri`, downloaded with the key
  header, following redirects. 24 fps, sound always on, SynthID, 11 s to 6 min, kept 2 days, a
  blocked video isn't charged. Pilot 3 (3 October 2026): Veo's audio filter refused 4 of 6 clips
  whose prompt asked for "soft breathing" ("an issue with the audio for your prompt", not
  charged), so the clip prompt now leaves breathing out (`noBreath` in `prompts.mjs`). A clip
  the filter refuses shows as `filtered` in `run.json`; run it again in a new request. The scripts send no `seed` or `generateAudio`: Google's SDK refuses
  both for the Gemini API (the Veo page mentions `seed` all the same).
- **Images:** the image docs now use the Interactions API: `POST /v1beta/interactions` with
  `model`, `input` (text and `{"type": "image", "mime_type", "data"}` items) and
  `response_format` (`{"type": "image", "aspect_ratio", "image_size", "mime_type": "image/jpeg"}`);
  the picture comes back in `steps`, a `model_output` step's `content`. `store: false` keeps it
  out of the 55-day log. Gemini 3.1 Flash Image keeps up to 4 photos of people consistent.
  `generateContent` "remains fully supported" (`--image-api generate-content`). Pilot runs 1 and
  2 (3 October 2026) confirmed the model name `gemini-3.1-flash-image` and the answer's shape.
- **Prices** as in the table above.

Not checked, because no call was made:

- That Veo takes the rest of the body as sent. One spot where Google's own sources differ: the
  docs' table writes `durationSeconds` as "8", the SDK sends the number 8, as the scripts do (a
  one-line change in `veoCall` in `lib.mjs` if a 400 names it). The picture's form has a switch
  too: `--veo-image-form inlineData`, or `"veoImageForm"` in a request file.
- That Veo takes a JPEG start pose as well as a PNG (the docs' examples use PNG; the image model
  sends JPEG).
- Whether the video link redirects to another host (handled either way), the rate limits for the
  key's tier, and how much the model's thinking adds to a photo's cost (the $0.01 allowance).
- Whether `referenceImages` can go with `image` and `lastFrame` in one request. The scripts don't
  send them: the start pose already carries the coach.

The first real run of each step is the check: run it small (one coach, one move), with the
budget as it is.

A known effect: `process.sh` writes 30 frames a second and Veo makes 24, so every fourth frame
shows twice. On slow, controlled moves it's hard to see.

## Files

| File | What |
|---|---|
| `tools/media/ai/lib.mjs` | the moves and the shot list, coaches, prices and the budget, the two APIs, the docs checks, ffmpeg and run folders |
| `tools/media/ai/calls.mjs` | the paid calls, with the dry run and the money guard around each |
| `tools/media/ai/prompts.mjs`, `coaches.json` | the words sent to the models; the coaches and the studio |
| `design.mjs`, `pick.mjs`, `keyframe.mjs`, `clip.mjs`, `review.mjs`, `approve.mjs`, `process.mjs` | the steps |
| `batch.mjs`, `requests/` | request files, run on GitHub or here; `requests/examples/` has the pilot |
| `approved.json`, `coaches/`, `keyframes/` | what people decided (commit them on coach-video) |
| `out/` | the runs: looks, start poses, raw takes, review sheets. Git ignores it |
| `mock-server.mjs`, `test.mjs` | the stand-in API and the tests |
| `.github/workflows/coach-video.yml` | the workflow |

## Never

- Print, log, commit or paste the key, or put it in a request file.
- Make a paid call to try something: `--dry-run` and `test.mjs` cost nothing.
- Raise a budget, switch to a bigger model (Veo 3.1 at $0.40 a second) or to 1080p for the whole
  set without Victor's yes.
- Run the workflow on `app`, or push to `app` from this work. Agents commit; Victor pushes.
- Commit `out/`, raw takes, or anything but the picks, `approved.json` and processed clips.
- Label an AI clip "Frank", or show one anywhere without its tag.
- Replace Frank's own clip with an AI one.
- Give a model a real person's photo or name.
- Approve a take whose form nobody checked against Frank's cues.
