/* ============================================================
   Piano — eight big white keys, C to C, each wearing its letter.
   Press a key: it dips, a warm piano note sounds, a little note
   floats up from the key, and a voice sings the letter at the
   matching pitch (one octave below the tone — perfect harmony).

   Montessori notes:
     - letters + pitch paired: the child hears that "C" IS a sound
     - free play, no sequence to follow, no wrong keys
     - chords welcome: every finger plays (full multi-touch),
       and sliding a finger across the keys plays a glissando
     - Boomwhacker-style color coding, muted to Toddl's palette
   ============================================================ */

(function () {
  'use strict';

  var KEYS = [
    { letter: 'C', clip: 'c',  freq: 261.63, color: '#e2a49c', deep: '#c9857c' },
    { letter: 'D', clip: 'd',  freq: 293.66, color: '#e8c193', deep: '#cda265' },
    { letter: 'E', clip: 'e',  freq: 329.63, color: '#ecd9a0', deep: '#d4b96a' },
    { letter: 'F', clip: 'f',  freq: 349.23, color: '#b7c9a8', deep: '#93aa81' },
    { letter: 'G', clip: 'g',  freq: 392.00, color: '#a8bfd4', deep: '#7f9db8' },
    { letter: 'A', clip: 'a',  freq: 440.00, color: '#c5b6d4', deep: '#a08fb8' },
    { letter: 'B', clip: 'b',  freq: 493.88, color: '#dfaec6', deep: '#c489a8' },
    { letter: 'C', clip: 'c5', freq: 523.25, color: '#e2a49c', deep: '#c9857c' }
  ];

  var NOTES_PER_VISIT = 26;   // free play, then flow onward

  var stage = null;
  var keysEl = null;
  var flowTimer = null;
  var notesPlayed = 0;
  var activePointers = {};    // pointerId -> true while a finger is down

  function playKey(key, el) {
    var now = Date.now();
    if (now - (key.lastPlayed || 0) < 130) return;   // per-key debounce
    key.lastPlayed = now;

    ToddlAudio.pianoNote(key.freq);
    ToddlAudio.singNote(key.clip);

    // dip the key
    el.classList.remove('is-down');
    void el.offsetWidth;
    el.classList.add('is-down');
    window.setTimeout(function () { el.classList.remove('is-down'); }, 160);

    // a little note floats up from the key
    var rect = el.getBoundingClientRect();
    var stageRect = stage.getBoundingClientRect();
    var float = document.createElement('div');
    float.className = 'float-note';
    float.style.left = (rect.left - stageRect.left + rect.width / 2) + 'px';
    float.style.top = (rect.top - stageRect.top - 8) + 'px';
    float.style.background = key.color;
    float.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
    float.textContent = '♪ ' + key.letter;
    stage.appendChild(float);
    window.setTimeout(function () {
      if (float.parentNode) float.parentNode.removeChild(float);
    }, 1900);

    // enough free play for one visit — drift onward
    notesPlayed++;
    if (notesPlayed >= NOTES_PER_VISIT && !flowTimer && window.ToddlFlow) {
      flowTimer = window.setTimeout(function () { ToddlFlow.next(); }, 2200);
    }
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
        playKey(key, el);
      });

      el.addEventListener('pointerenter', function (e) {
        if (activePointers[e.pointerId]) playKey(key, el);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    keysEl = null;
    activePointers = {};
  }

  window.ToddlPiano = { start: start, stop: stop };
})();
