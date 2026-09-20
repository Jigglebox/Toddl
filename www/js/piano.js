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

  var stage = null;
  var keysEl = null;
  var flowTimer = null;
  var notesPlayed = 0;
  var activePointers = {};    // pointerId -> true while a finger is down
  var pending = null;         // { entries: [{key, el, pointerId}], timer }

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

    // enough free play for one visit — drift onward
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
  }

  function stop() {
    if (flowTimer) { window.clearTimeout(flowTimer); flowTimer = null; }
    if (pending) { window.clearTimeout(pending.timer); pending = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    keysEl = null;
    activePointers = {};
  }

  window.ToddlPiano = { start: start, stop: stop };
})();
