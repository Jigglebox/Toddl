/* ============================================================
   Toddl audio — everything is synthesized with WebAudio so the
   app ships zero sound assets and every tone can be kept soft.
   Design rules:
     - quiet by default (master gain 0.35)
     - sine/triangle voices only, long gentle releases
     - pentatonic scale so overlapping tones never clash
   ============================================================ */

(function () {
  'use strict';

  var ctx = null;
  var master = null;
  var unlocked = false;

  var settings = {
    sound: true,
    voice: true
  };

  // C-major pentatonic across two octaves — any random pair is consonant.
  var PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0,
                    523.25, 587.33, 659.25, 783.99, 880.0];

  function loadSettings() {
    try {
      var raw = localStorage.getItem('toddl-settings');
      if (raw) {
        var saved = JSON.parse(raw);
        if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
        if (typeof saved.voice === 'boolean') settings.voice = saved.voice;
      }
    } catch (e) { /* first run or private mode — defaults are fine */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem('toddl-settings', JSON.stringify(settings));
    } catch (e) { /* private mode — settings just won't persist */ }
  }

  function ensureContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // Must be called from a user gesture once (iOS/Android autoplay policy).
  function unlock() {
    if (unlocked) return;
    if (ensureContext()) unlocked = true;
    preloadClips();
  }

  function tone(freq, opts) {
    if (!settings.sound || !ensureContext()) return;
    opts = opts || {};
    var t0 = ctx.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.6;
    var vol = opts.vol || 0.5;

    var osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur);
    }

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* ---------- Named cues ---------- */

  // Soft "blip" for a bubble pop: a quick airy tone that slides up.
  function pop() {
    var base = PENTATONIC[Math.floor(Math.random() * 5) + 3];
    tone(base, { type: 'sine', dur: 0.35, vol: 0.5, glideTo: base * 1.5 });
  }

  // A single calm note, e.g. picking up a piece.
  function tap() {
    tone(PENTATONIC[2], { type: 'triangle', dur: 0.25, vol: 0.3 });
  }

  // Two rising notes: something settled into its place.
  function place() {
    tone(392.0, { dur: 0.4, vol: 0.45 });
    tone(523.25, { dur: 0.55, vol: 0.4, delay: 0.12 });
  }

  // Gentle downward slide: not-quite, piece drifting home. Never harsh.
  function drift() {
    tone(329.63, { type: 'triangle', dur: 0.5, vol: 0.22, glideTo: 261.63 });
  }

  // Slow three-note arpeggio for finishing a round.
  function chime() {
    tone(523.25, { dur: 0.7, vol: 0.4 });
    tone(659.25, { dur: 0.7, vol: 0.38, delay: 0.22 });
    tone(783.99, { dur: 0.9, vol: 0.36, delay: 0.44 });
  }

  // One note per count, stepping up the pentatonic scale.
  function countNote(index) {
    var freq = PENTATONIC[Math.min(index, PENTATONIC.length - 1)];
    tone(freq, { dur: 0.55, vol: 0.45 });
  }

  /* ---------- Spoken words ----------
     Every word in the app ships as a pre-recorded natural voice
     clip (audio/words/*.mp3) — calm, warm, and consistent on
     every device. System speech synthesis is only a fallback
     for words that have no clip. */

  var WORD_CLIPS = [
    'dog', 'cat', 'bird', 'fish', 'turtle', 'apple', 'banana',
    'strawberry', 'flower', 'tree', 'star', 'moon', 'car', 'boat',
    'teddy-bear', 'ball', 'circle', 'square', 'triangle', 'heart',
    'red', 'blue', 'yellow', 'green', 'one', 'two', 'three', 'four',
    'five'
  ];

  var clipCache = {};
  var currentClip = null;
  var speaking = false;

  function slugFor(word) {
    return String(word).toLowerCase().trim().replace(/\s+/g, '-');
  }

  function clipFor(word) {
    var slug = slugFor(word);
    if (WORD_CLIPS.indexOf(slug) === -1) return null;
    if (!clipCache[slug]) {
      var audio = new Audio('audio/words/' + slug + '.mp3');
      audio.preload = 'auto';
      clipCache[slug] = audio;
    }
    return clipCache[slug];
  }

  // Warm the cache so first taps don't wait on disk/network.
  function preloadClips() {
    for (var i = 0; i < WORD_CLIPS.length; i++) clipFor(WORD_CLIPS[i]);
  }

  function say(word, opts) {
    if (!settings.voice) return;
    opts = opts || {};
    // Don't queue up a backlog when a toddler taps rapidly.
    if (speaking && !opts.interrupt) return;

    var clip = clipFor(word);
    if (clip) {
      try {
        if (currentClip && !currentClip.paused) {
          currentClip.pause();
          currentClip.currentTime = 0;
        }
        currentClip = clip;
        clip.currentTime = 0;
        clip.volume = 0.9;
        speaking = true;
        clip.onended = function () { speaking = false; };
        clip.onerror = function () { speaking = false; };
        var p = clip.play();
        if (p && p.catch) {
          p.catch(function () {
            // Autoplay policy or decode hiccup — fall back to TTS.
            speaking = false;
            sayWithTts(word, opts);
          });
        }
      } catch (e) {
        speaking = false;
        sayWithTts(word, opts);
      }
      return;
    }
    sayWithTts(word, opts);
  }

  /* System speech-synthesis fallback: pick the most natural voice
     available, and avoid the settings that make TTS sound robotic
     (over-slow rate, raised pitch, default low-quality voice). */

  var pickedVoice;   // undefined = not looked up yet, null = none found

  function pickVoice() {
    if (pickedVoice !== undefined) return pickedVoice;
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;   // not loaded yet — retry next call

    var best = null;
    var bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      if (v.lang && v.lang.toLowerCase().indexOf('en') !== 0) continue;
      var name = (v.name || '').toLowerCase();
      var score = 0;
      // Neural/premium voices advertise themselves in the name.
      if (name.indexOf('natural') !== -1) score += 8;
      if (name.indexOf('neural') !== -1) score += 8;
      if (name.indexOf('premium') !== -1) score += 6;
      if (name.indexOf('enhanced') !== -1) score += 6;
      // Known-good defaults per platform.
      if (name.indexOf('samantha') !== -1) score += 5;   // iOS/macOS
      if (name.indexOf('google') !== -1) score += 4;     // Android/Chrome
      if (name.indexOf('serena') !== -1 || name.indexOf('karen') !== -1) score += 3;
      if (v.localService) score += 2;                    // no network lag
      if (v.default) score += 1;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    pickedVoice = best;
    return best;
  }

  if ('speechSynthesis' in window) {
    // Voice lists load asynchronously; re-pick when they arrive.
    window.speechSynthesis.onvoiceschanged = function () {
      pickedVoice = undefined;
    };
  }

  function sayWithTts(word, opts) {
    if (!('speechSynthesis' in window)) return;
    opts = opts || {};
    if (speaking && !opts.interrupt) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(word);
      var voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 0.9;    // near-natural pace; over-slowing sounds robotic
      u.pitch = 1.0;
      u.volume = 0.9;
      u.onstart = function () { speaking = true; };
      u.onend = function () { speaking = false; };
      u.onerror = function () { speaking = false; };
      window.speechSynthesis.speak(u);
    } catch (e) { speaking = false; }
  }

  loadSettings();

  window.ToddlAudio = {
    unlock: unlock,
    pop: pop,
    tap: tap,
    place: place,
    drift: drift,
    chime: chime,
    countNote: countNote,
    say: say,
    getSetting: function (key) { return settings[key]; },
    setSetting: function (key, value) {
      settings[key] = value;
      saveSettings();
    }
  };
})();
