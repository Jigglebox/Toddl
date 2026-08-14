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
    voice: true,
    music: true
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
        if (typeof saved.music === 'boolean') settings.music = saved.music;
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
    startMusic();
  }

  /* ---------- Lullaby ----------
     A generative music box: single soft bell notes wander up and
     down a pentatonic scale every few seconds, occasionally joined
     by a low harmonic. Never a loop, never a beat — just a slow,
     consonant sparkle underneath the play. */

  var MELODY = [261.63, 293.66, 329.63, 392.0, 440.0,
                523.25, 587.33, 659.25, 783.99, 880.0];
  var musicTimer = null;
  var melodyIndex = 4;
  var notesSinceHarmony = 0;

  function bellNote(freq, vol, delay) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (delay || 0);
    var partials = [
      { ratio: 1,    amp: 1.0 },
      { ratio: 2,    amp: 0.28 },
      { ratio: 2.98, amp: 0.08 }     // slightly inharmonic = music-box shimmer
    ];
    for (var i = 0; i < partials.length; i++) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * partials[i].ratio, t0);
      var gain = ctx.createGain();
      var peak = vol * partials[i].amp;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + 2.7);
    }
  }

  function scheduleNextNote() {
    if (!settings.music) { musicTimer = null; return; }
    var wait = 2000 + Math.random() * 1600;
    musicTimer = window.setTimeout(function () {
      if (!settings.music || !ctx) { musicTimer = null; return; }

      // Constrained random walk, gently pulled back toward the middle.
      var step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      if (melodyIndex < 3) step = Math.abs(step);
      if (melodyIndex > MELODY.length - 4) step = -Math.abs(step);
      melodyIndex = Math.max(0, Math.min(MELODY.length - 1, melodyIndex + step));

      bellNote(MELODY[melodyIndex], 0.10);

      // Every few notes, a low fifth hums along underneath.
      notesSinceHarmony++;
      if (notesSinceHarmony >= 3 + Math.floor(Math.random() * 3)) {
        notesSinceHarmony = 0;
        bellNote(MELODY[Math.max(0, melodyIndex - 3)] / 2, 0.05, 0.35);
      }

      scheduleNextNote();
    }, wait);
  }

  function startMusic() {
    if (musicTimer || !settings.music) return;
    if (!ensureContext()) return;
    scheduleNextNote();
  }

  function stopMusic() {
    if (musicTimer) { window.clearTimeout(musicTimer); musicTimer = null; }
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
      if (key === 'music') {
        if (value) startMusic(); else stopMusic();
      }
    }
  };
})();
