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

  /* ---------- Speech ---------- */

  var speaking = false;

  function say(word, opts) {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    opts = opts || {};
    // Don't queue up a backlog when a toddler taps rapidly.
    if (speaking && !opts.interrupt) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(word);
      u.rate = 0.75;   // slow and clear for young ears
      u.pitch = 1.1;
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
