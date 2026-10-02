/* Wellness by Frank: beeps, the voice coach, vibration and keeping the screen on. */
(function (W) {
  'use strict';
  var ctx = null, voice = null, lock = null, wantLock = false;

  function audio() {
    if (!ctx) {
      var C = W.AudioContext || W.webkitAudioContext;
      if (C) { try { ctx = new C(); } catch (e) { ctx = null; } }
    }
    return ctx;
  }

  // Call from a tap: phones only allow sound after the person touches the page.
  function prime() {
    var c = audio();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { /* ignore */ } }
    if (W.speechSynthesis && !voice) pickVoice();
  }

  function beep(freq, dur, vol) {
    var c = audio();
    if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.22, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  function pickVoice() {
    try {
      var all = W.speechSynthesis.getVoices() || [];
      var en = all.filter(function (v) { return /^en[-_]/i.test(v.lang); });
      var pref = ['en-GB', 'en-US', 'en-AU', 'en-IE'];
      for (var i = 0; i < pref.length && !voice; i++) {
        voice = en.filter(function (v) { return v.lang.replace('_', '-') === pref[i] && v.localService; })[0] ||
                en.filter(function (v) { return v.lang.replace('_', '-') === pref[i]; })[0] || null;
      }
      if (!voice) voice = en[0] || null;
    } catch (e) { voice = null; }
  }
  if (W.speechSynthesis) {
    try { W.speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* older browsers */ }
  }

  function say(text) {
    if (!W.speechSynthesis || !text) return;
    try {
      W.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
      u.rate = 1.02;
      W.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function hush() { try { W.speechSynthesis && W.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  function requestLock() {
    if (!wantLock || lock || document.hidden || !navigator.wakeLock) return;
    try {
      navigator.wakeLock.request('screen').then(function (l) {
        lock = l;
        l.addEventListener('release', function () { lock = null; });
      }, function () { lock = null; });
    } catch (e) { lock = null; }
  }
  function awake(on) {
    wantLock = !!on;
    if (on) requestLock();
    else if (lock) { try { lock.release(); } catch (e) { /* ignore */ } lock = null; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) requestLock(); });

  W.WBF.sound = {
    prime: prime,
    tick: function () { beep(880, 0.12); },
    go: function () { beep(1320, 0.28, 0.26); },
    soft: function () { beep(660, 0.1, 0.12); },
    say: say, hush: hush, buzz: buzz, awake: awake
  };
})(window);
