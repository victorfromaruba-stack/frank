// media: the exercise videos in js/media.js. Frank's own clip is tagged Frank; a clip made by AI (ai: true) says
// "AI demo" wherever it shows (the exercise sheet with its note, the player, Next, the plan cards, the welcome screen)
// and "AI" on its still in the lists, and is never tagged Frank. Frank's explanation on YouTube (howto) plays inside
// the How-to tab, and nothing loads from YouTube before a tap on play. The suite serves its own js/media.js, so it
// runs before any real clip is in the repo: every move gets an AI clip but plank, which gets one of Frank's, and the
// push-up gets Frank's YouTube video.
'use strict';
const L = require('./lib.cjs');
const { app } = L;

// a 32 x 24 clip (VP8, half a second) and its still: the tags are what's tested, not the picture
const CLIP = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIMEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggH27AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiEB/QAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYhUimXGb/BiTZyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhA7msoDgibCBILqBGJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYhUimXGb/BiTWfIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDAuNTAwMDAwMDAwAB9DtnXS54EAo7aBAACAkAIAnQEqIAAYAABHCIWFiIWEiAICAnWqAgf5Fd5g/v7I9PhtVZW3/2M3/0Zv/ozf1lCjlYEA+gCxAQABEBAAGAAYWC/0AAhwABxTu2uRu4+zgQC3iveBAfGCAZ/wgQM=', 'base64');
const STILL = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAYACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkKKKKzPOCiiigAooooAKKKKAP/9k=', 'base64');
const FRANKS = 'plank', EXPLAINED = 'push-up', YT = 'qaFrank-123';
const MEDIA = "(function (W) { 'use strict'; W.WBF.MEDIA = {}; Object.keys(W.WBF.EX).forEach(function (id) {" +
  " W.WBF.MEDIA[id] = id === '" + FRANKS + "' ? { video: 'media/qa-frank.mp4', poster: 'media/qa-frank.jpg' }" +
  " : { video: 'media/qa-ai-' + id + '.mp4', poster: 'media/qa-ai-' + id + '.jpg', ai: true }; });" +
  " W.WBF.MEDIA['" + EXPLAINED + "'].howto = 'https://youtu.be/" + YT + "'; })(window);";

// a page with this suite's js/media.js and clips; o as t.page's, plus hash
async function open(t, o = {}) {
  const p = await t.page(Object.assign({}, o, { go: false }));
  await p.route('**/js/media.js', (r) => r.fulfill({ contentType: 'application/javascript', body: MEDIA }));
  await p.route('**/media/qa-*', (r) => {
    const still = /\.jpg$/.test(r.request().url());
    return r.fulfill({ contentType: still ? 'image/jpeg' : 'video/webm', body: still ? STILL : CLIP });
  });
  await p.goto(p.srv.home + 'index.html' + (o.hash ? '#' + o.hash : ''));
  await L.settle(p);
  return p;
}

// Every clip and still on the screen (and the open sheet), checked: an AI one carries its tag, inside the picture
// and clear of the other things on it (a badge, How to, Turn); Frank's carries none. Returns what's wrong, and how
// many clips and stills it saw.
function audit(p) {
  return p.evaluate((franks) => {
    const bad = [], seen = { clips: 0, stills: 0 };
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    document.querySelectorAll('[data-fig], [data-thumb]').forEach((el) => {
      if (!el.isConnected || !el.checkVisibility()) return;
      const thumb = el.hasAttribute('data-thumb'), id = el.getAttribute(thumb ? 'data-thumb' : 'data-fig');
      const shows = el.querySelector(thumb ? ':scope > img' : ':scope > video');
      if (!shows) return;
      seen[thumb ? 'stills' : 'clips']++;
      const tag = el.querySelector(':scope > .ai-tag'), where = id + (thumb ? ' (a still in a list)' : ' (a clip)');
      if (id === franks) { if (tag) bad.push(where + ": Frank's own, with an AI tag"); return; }
      if (!tag) return bad.push(where + ': made by AI, with no tag');
      const want = thumb ? 'AI' : 'AI demo';
      if (tag.textContent !== want) bad.push(where + ': the tag says "' + tag.textContent + '", not "' + want + '"');
      if (!tag.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) bad.push(where + ': the tag is hidden');
      const box = el.getBoundingClientRect(), r = tag.getBoundingClientRect();
      if (r.width < 1 || r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) bad.push(where + ': the tag is not inside the picture');
      const host = el.closest('.media, .pc-media, .pl-media') || el.parentElement;
      host.querySelectorAll('.pc-badge, .howto, .tags-on .tag, .turn').forEach((o) => {
        if (o.checkVisibility() && hit(r, o.getBoundingClientRect())) bad.push(where + ': the tag covers ' + (o.textContent.trim() || o.getAttribute('aria-label') || o.className));
      });
    });
    return { bad, seen };
  }, FRANKS);
}
async function audited(t, p, label, want = {}) {
  const a = await audit(p);
  for (const b of a.bad) t.fail(label + ': ' + b);
  if (want.clips) t.check(a.seen.clips >= want.clips, label + ': ' + a.seen.clips + ' clip(s) shown, expected ' + want.clips + ' or more');
  if (want.stills) t.check(a.seen.stills >= want.stills, label + ': ' + a.seen.stills + ' still(s) in the lists, expected ' + want.stills + ' or more');
  await t.look(p, label);
}
const sheetTags = (p) => p.evaluate(() => [(document.querySelector('#overlay .tags-on') || {}).textContent || '',
  (document.querySelector('#overlay .ai-note') || {}).textContent || '', !!document.querySelector('#overlay #xs-media video')]);

module.exports = {
  name: 'media',
  about: 'exercise videos (its own js/media.js: an AI clip for every move but one of Frank\'s, and Frank\'s YouTube video for one): the exercise sheet tags Frank\'s clip Frank, an AI clip "AI demo" with a note and never Frank, the Muscle tab keeps the 3D muscles, How-to plays the clip in slow motion, or Frank\'s YouTube video in the app after a tap (nothing from YouTube before it; offline, a toast); every clip and still on the welcome screen, the Plan, a workout, the player and Next (a member\'s plan, and Frank\'s session with an AI clip and then his own) carries its tag, inside the picture and clear of the badges and buttons',
  async run(t) {
    await t.flow('the exercise sheet', async () => {
      const p = await open(t, { state: L.member(), hash: 'ex.squat' });
      await p.waitForSelector('#overlay .xs h2');
      const [tags, note, video] = await sheetTags(p);
      t.check(video, 'squat: the Video tab plays the clip');
      t.check(!/Frank/.test(tags), 'squat, an AI clip: tagged "' + tags + '", never Frank');
      t.equal(note, 'Made by AI, not filmed.', 'squat: the note under an AI clip');
      await audited(t, p, 'sheet: an AI clip', { clips: 1 });
      const shown = () => p.evaluate(() => { const v = document.querySelector('#overlay #xs-media video');
        return [!!v, v ? v.playbackRate : 0, document.querySelectorAll('#overlay #xs-media .ai-tag').length, !!document.querySelector('#overlay .ai-note'),
          (document.querySelector('#overlay .tags-on') || {}).textContent || '']; });
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="muscle"]');
      t.equal(await shown(), [false, 0, 0, false, ''], 'squat, Muscle tab: the 3D muscles, no AI tag or note [clip, speed, tags, note, tag row]');
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="howto"]');
      t.equal(await shown(), [true, 0.55, 1, true, 'Slow motion'], 'squat, How-to without a video of Frank: the AI clip in slow motion, tagged, with the note [clip, speed, tags, note, tag row]');
      await audited(t, p, 'sheet: How-to, an AI clip in slow motion', { clips: 1 });
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="video"]');
      await audited(t, p, 'sheet: back on the Video tab', { clips: 1 });
      t.step("Frank's own clip");
      await app.tap(p, '#overlay .xs-foot [data-act="close"]');
      await p.evaluate((id) => { location.hash = '#ex.' + id; }, FRANKS);
      await p.waitForFunction((n) => { const h = document.querySelector('#overlay .xs h2'); return h && h.textContent === n; }, await p.evaluate((id) => WBF.EX[id].name, FRANKS));
      const [ftags, fnote, fvideo] = await sheetTags(p);
      t.equal([fvideo, ftags, fnote], [true, 'Frank', ''], "plank, Frank's own clip [clip, tags, note]");
      await audited(t, p, "sheet: Frank's clip", { clips: 1 });
    });

    await t.flow("Frank's video from YouTube in the How-to tab", async () => {
      const p = await open(t, { state: L.member(), hash: 'ex.' + EXPLAINED, allow: /^https:\/\/www\.youtube-nocookie\.com\// });
      const asked = [];
      p.on('request', (r) => { if (/youtube|ytimg|googlevideo/.test(r.url())) asked.push(r.url()); });
      await p.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>YouTube stand-in</title>' }));
      await p.waitForSelector('#overlay .xs h2');
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="howto"]');
      const panel = () => p.evaluate(() => {
        const box = document.querySelector('#overlay #xs-media [data-yt]'), out = document.querySelector('#overlay .yt-out');
        return [box ? box.getAttribute('data-yt') : '', box ? (box.querySelector('.yt-play') || {}).textContent || '' : '', !!document.querySelector('#overlay iframe'),
          out ? out.getAttribute('href') : '', !!document.querySelector('#overlay .ai-note'), (document.querySelector('#overlay .tags-on') || {}).textContent || ''];
      });
      t.equal(await panel(), [YT, 'Watch Frank explain it', false, 'https://www.youtube.com/watch?v=' + YT, false, ''],
        "How-to with Frank's YouTube video: the panel, no player yet [video id, button, player, Open in YouTube, AI note, tag row]");
      t.equal(asked, [], 'nothing loads from YouTube before the tap');
      t.equal(await p.locator('#overlay [data-act="turn"]').isVisible(), false, "no Turn button over Frank's YouTube panel");
      await t.look(p, "How-to: Frank's video before the tap");
      t.step('play');
      await app.tap(p, '#overlay [data-act="yt-play"]');
      const frame = await p.locator('#overlay #xs-media iframe').evaluate((f) => [f.getAttribute('src'), f.getAttribute('title'), f.hasAttribute('allowfullscreen')]).catch(() => []);
      t.equal(frame, ['https://www.youtube-nocookie.com/embed/' + YT + '?autoplay=1&playsinline=1&rel=0', 'Frank explains ' + await p.evaluate((id) => WBF.EX[id].name, EXPLAINED), true],
        "the tap opens YouTube's privacy-enhanced player in the app [src, title, full screen]");
      await p.waitForTimeout(300);
      t.check(asked.some((u) => u.startsWith('https://www.youtube-nocookie.com/embed/' + YT)), 'the player loads after the tap');
      t.step('back to the Video tab');
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="video"]');
      t.equal(await p.locator('#overlay iframe').count(), 0, "the Video tab: YouTube's player is gone (it stops)");
      await audited(t, p, "sheet: the AI clip of a move Frank explains", { clips: 1 });
      t.step('offline');
      await p.context().setOffline(true);
      await app.tap(p, '#overlay [data-act="xs-tab"][data-v="howto"]');
      const n = (await app.toasts(p)).length;
      await app.tap(p, '#overlay [data-act="yt-play"]');
      await p.waitForFunction((k) => window.__qa.toasts.length > k, n, { timeout: 3000 }).catch(() => null);
      t.equal([(await app.toasts(p)).slice(n).join(' | '), await p.locator('#overlay iframe').count()], ["Frank's video needs the internet.", 0], 'offline: a tap on play [toast, player]');
      await p.context().setOffline(false);
    });

    await t.flow('the welcome screen, the Plan, a workout, the player', async () => {
      const w = await open(t);
      await audited(t, w, 'welcome screen', { clips: 1 });
      const p = await open(t, { state: L.member() });
      await app.waitTitle(p, 'Plan');
      await audited(t, p, 'Plan', { clips: 1 });
      await app.tap(p, '[data-act="open-day"][data-day="1"]', { nth: 0 });
      await p.waitForSelector('.wd-title');
      await audited(t, p, 'a workout', { stills: 2 });
      await app.tap(p, '[data-act="start"]');
      await app.waitTitle(p, 'Workout');
      await audited(t, p, 'player: get ready, Next', { clips: 1 });
      await app.tap(p, '[data-act="pl-skip"]');
      await p.waitForSelector('.pl-name h1');
      await audited(t, p, 'player: a move', { clips: 1 });
    });

    await t.flow("a session from Frank: an AI clip, then Frank's", async () => {
      // squat (an AI clip), then plank (Frank's own): the plan card, Next, the moves
      const sp = L.spec({ i: 'qa-media', t: 'Clips test', x: [['squat', 3], [FRANKS, 10]], rs: 15 });
      const p = await open(t, { state: L.state({ profile: L.profile(), access: { client: true }, inbox: [sp] }) });
      t.has(await app.text(p), 'Clips test', "the Plan: Frank's session");
      await audited(t, p, "Plan: Frank's session", { clips: 1 });
      await app.tap(p, '[data-act="start-coach"][data-id="qa-media"]');
      await app.waitTitle(p, 'Workout');
      await audited(t, p, 'player: get ready, Next is an AI clip', { clips: 1 });
      await app.tap(p, '[data-act="pl-skip"]');
      await p.waitForSelector('.pl-name h1');
      t.equal(await p.locator('.pl-name h1').textContent(), 'Squat', 'the first move');
      await audited(t, p, 'player: an AI clip', { clips: 1 });
      await app.tap(p, '[data-act="pl-done"]');
      await p.waitForSelector('.pl-rest');
      await audited(t, p, "player: rest, Next is Frank's clip", { clips: 1 });
      await app.tap(p, '[data-act="pl-skip"]');
      await p.waitForSelector('.pl-name h1');
      t.equal(await p.locator('.pl-name h1').textContent(), await p.evaluate((id) => WBF.EX[id].name, FRANKS), 'the second move');
      await audited(t, p, "player: Frank's clip", { clips: 1 });
    });
  }
};
