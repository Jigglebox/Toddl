/* ============================================================
   Garden — five little soil mounds. Tap a mound and a flower
   grows slowly out of it while Toddl counts: "one… two…".
   When all five bloom, a butterfly drifts across and the
   garden gently resets.

   Montessori notes:
     - counting 1–5 with one-to-one correspondence (each tap
       = one flower = one number)
     - slow growth animation rewards patience and watching
     - the reset is calm — no fanfare, just a fresh garden
   ============================================================ */

(function () {
  'use strict';

  var FLOWER_PALETTES = [
    { petal: '#c5b6d4', center: '#d4b96a' },
    { petal: '#e6b8b0', center: '#d4b96a' },
    { petal: '#a8bfd4', center: '#e3cd8c' },
    { petal: '#ecd9a0', center: '#cf9188' },
    { petal: '#b7c9a8', center: '#cf9188' }
  ];

  var NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five'];
  var MOUNDS = 5;

  var stage = null;
  var mounds = [];      // { el, bloomed }
  var bloomCount = 0;
  var timers = [];

  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }

  function makeMoundSvg(size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 140');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size * 1.4);

    var mound = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mound.setAttribute('d', 'M14 132 A36 22 0 0 1 86 132 Z');
    mound.setAttribute('fill', '#c3b494');
    svg.appendChild(mound);

    // The flower group starts scaled to zero at the soil line and
    // grows upward when bloomed.
    var flower = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    flower.setAttribute('class', 'flower');
    flower.setAttribute('transform-origin', '50 128');
    flower.style.transform = 'scale(0)';
    flower.style.transformOrigin = '50px 128px';
    flower.style.transition = 'transform 1.4s cubic-bezier(0.33, 0, 0.2, 1)';

    var palette = FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)];

    var stem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stem.setAttribute('d', 'M50 128 V52');
    stem.setAttribute('stroke', '#93aa81');
    stem.setAttribute('stroke-width', '6');
    stem.setAttribute('stroke-linecap', 'round');
    stem.setAttribute('fill', 'none');
    flower.appendChild(stem);

    var leaf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    leaf.setAttribute('d', 'M50 100 q-20 -6 -24 -24 q20 4 24 24');
    leaf.setAttribute('fill', '#b7c9a8');
    flower.appendChild(leaf);

    var petalAngles = [0, 72, 144, 216, 288];
    petalAngles.forEach(function (deg) {
      var petal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      var rad = (deg - 90) * Math.PI / 180;
      petal.setAttribute('cx', String(50 + Math.cos(rad) * 17));
      petal.setAttribute('cy', String(40 + Math.sin(rad) * 17));
      petal.setAttribute('r', '13');
      petal.setAttribute('fill', palette.petal);
      flower.appendChild(petal);
    });

    var center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    center.setAttribute('cx', '50');
    center.setAttribute('cy', '40');
    center.setAttribute('r', '10');
    center.setAttribute('fill', palette.center);
    flower.appendChild(center);

    svg.appendChild(flower);
    return svg;
  }

  function layoutGarden() {
    var rect = stage.getBoundingClientRect();
    stage.innerHTML = '';
    mounds = [];
    bloomCount = 0;

    var ground = document.createElement('div');
    ground.className = 'garden-ground';
    stage.appendChild(ground);

    var size = Math.max(72, Math.min(rect.width / (MOUNDS + 1.5), rect.height * 0.16));

    for (var i = 0; i < MOUNDS; i++) {
      var x = rect.width * ((i + 1) / (MOUNDS + 1));
      var y = rect.height * (0.78 + (i % 2) * 0.06);

      var el = document.createElement('div');
      el.className = 'garden-mound';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = size + 'px';
      el.style.height = (size * 1.4) + 'px';
      el.appendChild(makeMoundSvg(size));
      stage.appendChild(el);

      var mound = { el: el, bloomed: false, x: x, y: y, size: size };
      attachTap(mound);
      mounds.push(mound);
    }
  }

  function attachTap(mound) {
    mound.el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (mound.bloomed) return;
      mound.bloomed = true;
      bloomCount++;

      var flower = mound.el.querySelector('.flower');
      if (flower) flower.style.transform = 'scale(1)';

      var count = bloomCount;
      ToddlAudio.countNote(count - 1);
      ToddlAudio.say(NUMBER_WORDS[count - 1], { interrupt: true });
      showCount(mound, count);

      if (bloomCount === MOUNDS) {
        later(finishGarden, 1600);
      }
    });
  }

  function showCount(mound, count) {
    var label = document.createElement('div');
    label.className = 'count-label';
    label.textContent = String(count);
    label.style.left = mound.x + 'px';
    label.style.top = (mound.y - mound.size * 1.1) + 'px';
    stage.appendChild(label);
    later(function () {
      if (label.parentNode) label.parentNode.removeChild(label);
    }, 1900);
  }

  function finishGarden() {
    if (!stage) return;
    ToddlAudio.chime();
    flyButterfly();
    later(function () {
      if (stage) layoutGarden();
    }, 5200);
  }

  function flyButterfly() {
    var rect = stage.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'butterfly';
    el.style.fontSize = Math.max(40, rect.width * 0.07) + 'px';
    el.textContent = '\u{1F98B}';
    stage.appendChild(el);

    var startT = null;
    var duration = 4600;
    function step(t) {
      if (!startT) startT = t;
      var p = (t - startT) / duration;
      if (p > 1 || !el.parentNode) {
        if (el.parentNode) el.parentNode.removeChild(el);
        return;
      }
      var x = -80 + p * (rect.width + 160);
      var y = rect.height * 0.32 + Math.sin(p * Math.PI * 3) * rect.height * 0.08;
      el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function start(stageEl) {
    stage = stageEl;
    window.requestAnimationFrame(layoutGarden);
  }

  function stop() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (stage) stage.innerHTML = '';
    stage = null;
    mounds = [];
    bloomCount = 0;
  }

  window.ToddlGarden = { start: start, stop: stop };
})();
