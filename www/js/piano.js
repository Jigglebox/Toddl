/* ============================================================
   Piano — eight big white keys, C to C, each wearing its letter.
   Press a key: it dips, a warm piano note sounds, and a little
   lettered note floats up from the key in its color.

   Montessori notes:
     - letters + pitch paired: the child sees "C" as the key sounds
     - free play, no sequence to follow, no wrong keys
     - chords welcome: every finger plays (full multi-touch),
       and sliding a finger across the keys plays a glissando;
       several fingers together float one "C Chord" label
     - Boomwhacker-style color coding, muted to Toddl's palette
   ============================================================ */

(function () {
  'use strict';

  var KEYS = [
    { letter: 'C', freq: 261.63, color: '#e2a49c', deep: '#c9857c' },
    { letter: 'D', freq: 293.66, color: '#e8c193', deep: '#cda265' },
    { letter: 'E', freq: 329.63, color: '#ecd9a0', deep: '#d4b96a' },
    { letter: 'F', freq: 349.23, color: '#b7c9a8', deep: '#93aa81' },
    { letter: 'G', freq: 392.00, color: '#a8bfd4', deep: '#7f9db8' },
    { letter: 'A', freq: 440.00, color: '#c5b6d4', deep: '#a08fb8' },
    { letter: 'B', freq: 493.88, color: '#dfaec6', deep: '#c489a8' },
    { letter: 'C', freq: 523.25, color: '#e2a49c', deep: '#c9857c' }
  ];

  var NOTES_PER_VISIT = 26;   // free play, then flow onward

  var GATHER_MS = 90;         // presses closer than this may be a chord

  /* ---------- Follow-the-glow songs ----------
     One key at a time wears a soft pulsing glow: the next note of a
     song the child (and parent) will recognize. Press it and the glow
     hops to the following note — press anything else and the piano
     just plays as always, the glow waiting patiently. No instruction,
     no failure: the hint is simply the brightest thing to poke, and
     poking it in order happens to play a real song. Key indices are
     0..7 over C D E F G A B C. */
  var SONGS = [
    { name: 'Twinkle Twinkle Little Star',
      steps: [0, 0, 4, 4, 5, 5, 4,  3, 3, 2, 2, 1, 1, 0,
              4, 4, 3, 3, 2, 2, 1,  4, 4, 3, 3, 2, 2, 1,
              0, 0, 4, 4, 5, 5, 4,  3, 3, 2, 2, 1, 1, 0] },
    { name: 'Mary Had a Little Lamb',
      steps: [2, 1, 0, 1, 2, 2, 2,  1, 1, 1,  2, 4, 4,
              2, 1, 0, 1, 2, 2, 2, 2,  1, 1, 2, 1, 0] },
    { name: 'Row Row Row Your Boat',
      steps: [0, 0, 0, 1, 2,  2, 1, 2, 3, 4,
              7, 7, 7, 4, 4, 4, 2, 2, 2, 0, 0, 0,  4, 3, 2, 1, 0] },
    // kept well away from Twinkle in the running order — it's the
    // same melody, and back-to-back they sound like a repeat
    { name: 'The ABC Song',
      steps: [0, 0, 4, 4, 5, 5, 4,  3, 3, 2, 2, 1, 1, 1, 1, 0,
              4, 4, 3, 2, 2, 1,  4, 4, 4, 3, 2, 2, 1,
              0, 0, 4, 4, 5, 5, 4,  3, 3, 2, 2, 1, 1, 0] },
    { name: 'Hot Cross Buns',
      steps: [2, 1, 0,  2, 1, 0,  0, 0, 0, 0, 1, 1, 1, 1,  2, 1, 0] },
    { name: 'London Bridge',
      steps: [4, 5, 4, 3, 2, 3, 4,  1, 2, 3,  2, 3, 4,
              4, 5, 4, 3, 2, 3, 4,  1, 4, 2, 0] },
    { name: 'Old MacDonald',
      steps: [0, 0, 0, 4, 5, 5, 4,  2, 2, 1, 1, 0,
              4, 0, 0, 0, 4, 5, 5, 4,  2, 2, 1, 1, 0] }
  ];

  var stage = null;
  var keysEl = null;
  var keyEls = [];
  var flowTimer = null;
  var notesPlayed = 0;
  var activePointers = {};    // pointerId -> true while a finger is down
  var pending = null;         // { entries: [{key, el, pointerId}], timer }
  var song = null;
  var songPos = 0;
  var songTimer = null;
  var lastSongIndex = -1;

  function clearHint() {
    keyEls.forEach(function (el) {
      el.classList.remove('is-hint');
      var sh = el.querySelector('.key-shimmer');
      if (sh) sh.parentNode.removeChild(sh);
    });
  }

  // Sunlight on scales under water: a slow wandering caustic light
  // plus a scatter of little glints, each twinkling to its own beat.
  // Rebuilt fresh for every note so the sparkle never repeats itself.
  function makeShimmer(el) {
    var sh = document.createElement('div');
    sh.className = 'key-shimmer';
    for (var i = 0; i < 14; i++) {
      var g = document.createElement('span');
      g.className = 'key-glint';
      g.style.left = (5 + Math.random() * 90) + '%';
      g.style.top = (5 + Math.random() * 90) + '%';
      var s = 5 + Math.random() * 11;
      g.style.width = s + 'px';
      g.style.height = s + 'px';
      g.style.setProperty('--rot', Math.floor(Math.random() * 90) + 'deg');
      g.style.animationDuration = (0.8 + Math.random() * 1.1) + 's';
      g.style.animationDelay = (-Math.random() * 2) + 's';
      var tint = Math.random();
      g.style.color = tint < 0.5 ? '#fff3d4'
                    : tint < 0.8 ? '#d7efff' : '#ffdfef';
      sh.appendChild(g);
    }
    el.appendChild(sh);
  }

  function showHint() {
    if (!song || !stage) return;
    clearHint();
    var el = keyEls[song.steps[songPos]];
    el.classList.add('is-hint');
    makeShimmer(el);
  }

  // A fresh visit starts on a random song; finishing one moves to the
  // NEXT song in the list (wrapping), so a child who plays through
  // gets a tour of the whole songbook, never a repeat.
  function startSong(idx) {
    if (typeof idx !== 'number') {
      do { idx = Math.floor(Math.random() * SONGS.length); }
      while (SONGS.length > 1 && idx === lastSongIndex);
    }
    lastSongIndex = idx;
    song = SONGS[idx];
    songPos = 0;

    // A soft title pill so grown-ups know which tune the glow spells.
    var title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = '♪ ' + song.name;
    stage.appendChild(title);
    window.setTimeout(function () {
      if (title.parentNode) title.parentNode.removeChild(title);
    }, 3200);

    showHint();
  }

  function songComplete() {
    song = null;
    clearHint();
    ToddlAudio.chime();
    // A little scatter of notes dances up from the keyboard.
    for (var i = 0; i < 4; i++) {
      var k = KEYS[Math.floor(Math.random() * KEYS.length)];
      var el = keyEls[Math.floor(Math.random() * keyEls.length)];
      var rect = el.getBoundingClientRect();
      var stageRect = stage.getBoundingClientRect();
      window.setTimeout(function (k, x, y) {
        return function () {
          if (stage) spawnFloat('♪', k.color, x, y, false);
        };
      }(k, rect.left - stageRect.left + rect.width / 2,
           rect.top - stageRect.top - 8), i * 160);
    }
    songTimer = window.setTimeout(function () {
      startSong((lastSongIndex + 1) % SONGS.length);
    }, 2800);
  }

  function playKey(key, el, pointerId) {
    var now = Date.now();
    if (now - (key.lastPlayed || 0) < 130) return;   // per-key debounce
    key.lastPlayed = now;

    // the tone and the key dip are instant — only the float waits
    // a beat to see whether more fingers make it a chord
    ToddlAudio.pianoNote(key.freq);
    el.classList.remove('is-down');
    void el.offsetWidth;
    el.classList.add('is-down');
    window.setTimeout(function () { el.classList.remove('is-down'); }, 160);

    if (!pending) {
      pending = { entries: [] };
      pending.timer = window.setTimeout(flushNotes, GATHER_MS);
    }
    pending.entries.push({ key: key, el: el, pointerId: pointerId });

    if (song && keyEls[song.steps[songPos]] === el) {
      // The glowing key! The song advances, and following it keeps
      // the visit alive — guided play should never be cut short.
      songPos++;
      clearHint();
      if (window.ToddlFlow) ToddlFlow.extend();
      if (songPos >= song.steps.length) {
        songComplete();
      } else {
        if (songTimer) window.clearTimeout(songTimer);
        songTimer = window.setTimeout(showHint, 420);
      }
      return;
    }

    // Free-play poking (off the song): enough of it and play
    // simply drifts onward to the next activity.
    notesPlayed++;
    if (notesPlayed >= NOTES_PER_VISIT && !flowTimer && window.ToddlFlow) {
      flowTimer = window.setTimeout(function () { ToddlFlow.next(); }, 2200);
    }
  }

  function flushNotes() {
    if (!pending || !stage) { pending = null; return; }
    var entries = pending.entries;
    pending = null;

    // a chord is several *different fingers* inside the window —
    // one finger sliding across keys (glissando) stays a melody
    var fingers = {};
    entries.forEach(function (en) { fingers[en.pointerId] = true; });
    var isChord = entries.length >= 2 && Object.keys(fingers).length >= 2;

    if (isChord) {
      // named from the lowest note, as chords are
      var root = entries[0];
      var left = Infinity, right = -Infinity, top = Infinity;
      entries.forEach(function (en) {
        if (en.key.freq < root.key.freq) root = en;
        var r = en.el.getBoundingClientRect();
        if (r.left < left) left = r.left;
        if (r.right > right) right = r.right;
        if (r.top < top) top = r.top;
      });
      var stageRect = stage.getBoundingClientRect();
      spawnFloat('♪ ' + root.key.letter + ' Chord', root.key.color,
        (left + right) / 2 - stageRect.left, top - stageRect.top - 8, true);
    } else {
      entries.forEach(function (en) {
        var rect = en.el.getBoundingClientRect();
        var stageRect = stage.getBoundingClientRect();
        spawnFloat('♪ ' + en.key.letter, en.key.color,
          rect.left - stageRect.left + rect.width / 2,
          rect.top - stageRect.top - 8, false);
      });
    }
  }

  function spawnFloat(text, color, x, y, isChord) {
    var float = document.createElement('div');
    float.className = isChord ? 'float-note is-chord' : 'float-note';
    float.style.left = x + 'px';
    float.style.top = y + 'px';
    float.style.background = color;
    float.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
    float.textContent = text;
    stage.appendChild(float);
    window.setTimeout(function () {
      if (float.parentNode) float.parentNode.removeChild(float);
    }, 1900);
  }

  function buildPiano() {
    var lid = document.createElement('div');
    lid.className = 'piano-lid';
    stage.appendChild(lid);

    keysEl = document.createElement('div');
    keysEl.className = 'piano-keys';
    stage.appendChild(keysEl);
    keyEls = [];

    KEYS.forEach(function (key) {
      var el = document.createElement('div');
      el.className = 'piano-key';
      el.style.setProperty('--key-color', key.color);
      el.style.setProperty('--key-deep', key.deep);

      var label = document.createElement('div');
      label.className = 'piano-key-label';
      label.textContent = key.letter;
      el.appendChild(label);

      el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        activePointers[e.pointerId] = true;
        // touch pointers implicitly capture; release so a sliding
        // finger can enter the neighbouring keys (glissando!)
        try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
        playKey(key, el, e.pointerId);
      });

      el.addEventListener('pointerenter', function (e) {
        if (activePointers[e.pointerId]) playKey(key, el, e.pointerId);
      });

      keysEl.appendChild(el);
      keyEls.push(el);
    });

    function lift(e) { delete activePointers[e.pointerId]; }
    stage.addEventListener('pointerup', lift);
    stage.addEventListener('pointercancel', lift);
  }

  function start(stageEl) {
    stage = stageEl;
    stage.innerHTML = '';
    notesPlayed = 0;
    activePointers = {};
    ToddlScenery.build(stage, {
      sun: { x: '14%', y: '14%', size: '24vmin',
             color: 'rgba(236, 217, 160, 0.55)', halo: 'rgba(236, 217, 160, 0.22)' },
      clouds: 2,
      cloudTint: 0.6
    });
    buildPiano();
    startSong();
  }

  function stop() {
    if (flowTimer) { window.clearTimeout(flowTimer); flowTimer = null; }
    if (pending) { window.clearTimeout(pending.timer); pending = null; }
    if (songTimer) { window.clearTimeout(songTimer); songTimer = null; }
    song = null;
    if (stage) stage.innerHTML = '';
    stage = null;
    keysEl = null;
    keyEls = [];
    activePointers = {};
  }

  window.ToddlPiano = { start: start, stop: stop };
})();
