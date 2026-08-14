/* ============================================================
   Garden — a dawn meadow with five little soil mounds. Tap a
   mound and a flower grows slowly out of it while Toddl
   counts: "one… two…". Bloomed flowers sway in the breeze.
   When all five bloom, a butterfly flutters across and the
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
  var layer = null;
  var mounds = [];
  var bloomCount = 0;
  var timers = [];

  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  function makeMoundSvg(size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 140');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size * 1.4);

    // Soil mound with a soft top highlight
    svg.appendChild(svgEl('path', {
      d: 'M14 132 A36 22 0 0 1 86 132 Z', fill: '#c3b494'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M24 126 A26 14 0 0 1 76 126 Z', fill: 'rgba(255,255,255,0.14)'
    }));

    // The flower grows from the soil line; a nested group sways.
    var flower = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    flower.setAttribute('class', 'flower');
    flower.style.transform = 'scale(0)';
    flower.style.transition = 'transform 1.5s cubic-bezier(0.34, 1.3, 0.5, 1)';

    var sway = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sway.setAttribute('class', 'flower-sway');

    var palette = FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)];

    sway.appendChild(svgEl('path', {
      d: 'M50 128 C50 104 48 82 50 52', stroke: '#93aa81',
      'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none'
    }));
    sway.appendChild(svgEl('path', {
      d: 'M50 100 q-20 -6 -24 -24 q20 4 24 24', fill: '#b7c9a8'
    }));
    sway.appendChild(svgEl('path', {
      d: 'M50 88 q20 -4 26 -20 q-20 0 -26 20', fill: 'rgba(183, 201, 168, 0.8)'
    }));

    var petalAngles = [0, 72, 144, 216, 288];
    petalAngles.forEach(function (deg) {
      var rad = (deg - 90) * Math.PI / 180;
      sway.appendChild(svgEl('circle', {
        cx: 50 + Math.cos(rad) * 17,
        cy: 40 + Math.sin(rad) * 17,
        r: 13, fill: palette.petal
      }));
      // A smaller bright core on each petal adds gentle depth
      sway.appendChild(svgEl('circle', {
        cx: 50 + Math.cos(rad) * 15,
        cy: 40 + Math.sin(rad) * 15,
        r: 7, fill: 'rgba(255,255,255,0.25)'
      }));
    });

    sway.appendChild(svgEl('circle', { cx: 50, cy: 40, r: 10, fill: palette.center }));
    sway.appendChild(svgEl('circle', { cx: 47, cy: 37, r: 3.5, fill: 'rgba(255,255,255,0.5)' }));

    flower.appendChild(sway);
    svg.appendChild(flower);
    return svg;
  }

  function layoutGarden() {
    var rect = stage.getBoundingClientRect();
    layer.innerHTML = '';
    mounds = [];
    bloomCount = 0;

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
      layer.appendChild(el);

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
      // Sway begins once the flower has finished growing.
      later(function () { mound.el.classList.add('is-bloomed'); }, 1500);

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
    layer.appendChild(label);
    later(function () {
      if (label.parentNode) label.parentNode.removeChild(label);
    }, 1900);
  }

  function finishGarden() {
    if (!stage) return;
    ToddlAudio.chime();
    flyButterfly();
    // The butterfly carries play onward to the next activity.
    later(function () {
      if (!stage) return;
      if (window.ToddlFlow) { ToddlFlow.next(); return; }
      layoutGarden();
    }, 5200);
  }

  function flyButterfly() {
    var rect = stage.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'butterfly';
    el.style.fontSize = Math.max(40, rect.width * 0.07) + 'px';
    var inner = document.createElement('span');
    inner.className = 'butterfly-inner';
    inner.textContent = '\u{1F98B}';
    el.appendChild(inner);
    layer.appendChild(el);

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
    stage.innerHTML = '';
    ToddlScenery.build(stage, {
      sun: { x: '76%', y: '16%', size: '34vmin',
             color: 'rgba(236, 217, 160, 0.85)', halo: 'rgba(230, 184, 176, 0.30)' },
      clouds: 3,
      cloudTint: 0.7,
      hills: { front: 'rgba(183, 201, 168, 0.55)', back: 'rgba(212, 185, 106, 0.28)',
               height: '34%' }
    });
    layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    stage.appendChild(layer);
    window.requestAnimationFrame(layoutGarden);
  }

  function stop() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (stage) stage.innerHTML = '';
    stage = null;
    layer = null;
    mounds = [];
    bloomCount = 0;
  }

  window.ToddlGarden = { start: start, stop: stop };
})();
