/* ============================================================
   Garden — a dawn meadow with five soil mounds, and a garden
   that comes alive as the child tends it.

   Planting (counting): tap a bare mound and water patters onto
   it, then it grows as many flowers as its number — the first
   mound planted grows ONE, the next TWO, up to FIVE — each
   flower popping up as Toddl counts it aloud: "one… two…
   three…". A little marker with the numeral plants itself in
   the soil when the count is done. Tap a planted mound and
   Toddl counts its flowers again, each one bobbing as it's
   counted.

   Playing (imagination): every flower is alive. Tap one and it
   boings and sings a bell note (low on the left, high on the
   right — the whole garden is an instrument). Brush a finger
   through the flowers and they lean and spring back like wind
   through a meadow, chiming as you pass. Butterflies arrive as
   the garden fills and drift from flower to flower; tap one and
   it flutters off to find another. When all fifteen flowers are
   up, the whole garden ripples in a rising glissando, and play
   continues until the child wanders off — then the next
   activity drifts in.

   Montessori notes:
     - real quantity: the numeral, the spoken word, and the
       number of flowers always agree (one-to-one counting)
     - recount on demand — the child can check the count
     - self-directed open play once the counting is done; no
       goals, no fail states, nothing to get wrong
   ============================================================ */

(function () {
  'use strict';

  var PALETTES = [
    { petal: '#c5b6d4', deep: '#a08fb8', center: '#e3cd8c' },
    { petal: '#e6b8b0', deep: '#c9857c', center: '#ecd9a0' },
    { petal: '#a8bfd4', deep: '#7f9db8', center: '#ecd9a0' },
    { petal: '#ecd9a0', deep: '#d4b96a', center: '#cf9188' },
    { petal: '#dfaec6', deep: '#c489a8', center: '#e3cd8c' }
  ];
  var HEADS = ['daisy', 'tulip', 'aster'];
  var NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five'];
  var MOUNDS = 5;
  var COUNT_STEP_MS = 720;    // one counted flower per step
  var PLAY_BUDGET = 28;       // garden-play touches after full bloom
  var IDLE_MS = 15000;        // quiet garden after full bloom -> move on
  var BUTTERFLY_HUES = [0, 300, 110, 40];

  var stage = null;
  var layer = null;
  var geo = null;
  var mounds = [];
  var flowers = [];
  var butterflies = [];
  var planted = 0;
  var busy = false;
  var fullBloom = false;
  var interactions = 0;
  var leaving = false;
  var timers = [];
  var idleTimer = null;
  var rafId = null;
  var brushing = {};          // pointerId -> { x, brushed }

  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function stageXY(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ---------- drawing ---------- */

  function makeSoilSvg() {
    var svg = svgEl('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none' });
    svg.appendChild(svgEl('path', {
      d: 'M2 39 Q5 5 50 3 Q95 5 98 39 Z', fill: '#c3b494'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M14 30 Q20 10 50 9 Q72 10 80 20 Q60 14 46 16 Q26 18 14 30 Z',
      fill: 'rgba(255,255,255,0.16)'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M2 39 Q50 33 98 39 Z', fill: 'rgba(120, 100, 70, 0.18)'
    }));
    return svg;
  }

  // One flower as a single SVG: a 100x100 head on top of a stem
  // `stemUnits` long (same units), with a leaf partway down.
  function makeFlowerSvg(type, pal, stemUnits) {
    var h = 100 + stemUnits;
    var svg = svgEl('svg', { viewBox: '0 0 100 ' + h });
    svg.style.overflow = 'visible';

    svg.appendChild(svgEl('path', {
      d: 'M50 92 C47 ' + (100 + stemUnits * 0.4) + ' 53 ' +
         (100 + stemUnits * 0.7) + ' 50 ' + h,
      stroke: '#93aa81', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none'
    }));
    var ly = 100 + stemUnits * 0.55;
    svg.appendChild(svgEl('path', {
      d: 'M50 ' + ly + ' q-26 -6 -30 -28 q24 4 30 28', fill: '#b7c9a8'
    }));

    var i, rad;
    if (type === 'tulip') {
      svg.appendChild(svgEl('path', {
        d: 'M26 30 Q22 82 50 88 Q78 82 74 30 Q66 46 60 50 L50 24 L40 50 Q34 46 26 30 Z',
        fill: pal.petal, stroke: pal.deep, 'stroke-width': 2.5, 'stroke-linejoin': 'round'
      }));
      svg.appendChild(svgEl('path', {
        d: 'M36 52 Q36 76 50 80 Q42 70 42 54 Z', fill: 'rgba(255,255,255,0.35)'
      }));
    } else if (type === 'aster') {
      for (i = 0; i < 8; i++) {
        svg.appendChild(svgEl('ellipse', {
          cx: 50, cy: 26, rx: 10, ry: 22, fill: pal.petal,
          stroke: pal.deep, 'stroke-width': 1.5,
          transform: 'rotate(' + (i * 45) + ' 50 50)'
        }));
      }
      svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 14, fill: pal.center }));
      svg.appendChild(svgEl('circle', { cx: 46, cy: 46, r: 4.5, fill: 'rgba(255,255,255,0.55)' }));
    } else {
      for (i = 0; i < 5; i++) {
        rad = (i * 72 - 90) * Math.PI / 180;
        svg.appendChild(svgEl('circle', {
          cx: 50 + Math.cos(rad) * 24, cy: 50 + Math.sin(rad) * 24, r: 19,
          fill: pal.petal, stroke: pal.deep, 'stroke-width': 1.5
        }));
        svg.appendChild(svgEl('circle', {
          cx: 50 + Math.cos(rad) * 22, cy: 50 + Math.sin(rad) * 22, r: 9,
          fill: 'rgba(255,255,255,0.28)'
        }));
      }
      svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 15, fill: pal.center }));
      svg.appendChild(svgEl('circle', { cx: 46, cy: 46, r: 5, fill: 'rgba(255,255,255,0.55)' }));
    }
    return svg;
  }

  /* ---------- layout ---------- */

  function layoutGarden() {
    var rect = stage.getBoundingClientRect();
    layer.innerHTML = '';
    mounds = [];
    flowers = [];
    butterflies = [];
    planted = 0;
    busy = false;
    fullBloom = false;
    interactions = 0;
    leaving = false;
    if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = null; }

    var W = rect.width, H = rect.height;
    var spacing = W / MOUNDS;
    geo = {
      W: W, H: H,
      mw: Math.min(spacing * 0.8, 190),
      mh: Math.min(spacing * 0.8, 190) * 0.3,
      hs: Math.max(38, Math.min(spacing * 0.34, H * 0.15, 78)),
      moundY: H * 0.86
    };

    var looks = shuffle(PALETTES.slice());
    for (var i = 0; i < MOUNDS; i++) {
      var x = spacing * (i + 0.5);
      var el = document.createElement('div');
      el.className = 'g-mound';
      el.style.left = x + 'px';
      el.style.top = geo.moundY + 'px';
      el.style.width = geo.mw + 'px';
      el.style.height = (geo.mh * 2.2) + 'px';

      var soil = document.createElement('div');
      soil.className = 'g-soil';
      soil.style.height = geo.mh + 'px';
      soil.appendChild(makeSoilSvg());
      el.appendChild(soil);

      // Three seeds peek out of a bare mound, nodding: "plant me".
      var seeds = document.createElement('div');
      seeds.className = 'g-seeds';
      seeds.style.bottom = (geo.mh * 0.78) + 'px';
      for (var s = 0; s < 3; s++) {
        var seed = document.createElement('span');
        seed.style.animationDelay = (s * 0.18 + i * 0.3) + 's';
        seeds.appendChild(seed);
      }
      el.appendChild(seeds);
      layer.appendChild(el);

      var mound = {
        el: el, x: x, topY: geo.moundY + geo.mh * 1.1 - geo.mh,
        planted: false, n: 0, flowers: [],
        palette: looks[i], head: HEADS[i % HEADS.length]
      };
      attachMound(mound);
      mounds.push(mound);
    }
  }

  /* ---------- planting & counting ---------- */

  function attachMound(mound) {
    mound.el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (busy) { wiggle(mound.el); return; }
      if (!mound.planted) plant(mound);
      else recount(mound);
      noteInteraction();
    });
  }

  function wiggle(el) {
    el.classList.remove('is-wiggle');
    void el.offsetWidth;
    el.classList.add('is-wiggle');
    ToddlAudio.tap();
  }

  function plant(mound) {
    busy = true;
    planted++;
    mound.planted = true;
    mound.n = planted;
    mound.el.classList.add('is-planted');

    rainOn(mound);
    ToddlAudio.drip();

    var n = mound.n;
    var step = n > 1 ? Math.min(28, (geo.mw * 0.78) / (n - 1)) : 0;
    for (var k = 0; k < n; k++) {
      var off = (k - (n - 1) / 2) * step;
      var edge = n > 1 ? Math.abs(off) / ((n - 1) / 2 * step) : 0;
      var stemH = geo.H * (0.23 + (1 - edge) * 0.11) + (Math.random() - 0.5) * geo.H * 0.03;
      var baseY = mound.topY + geo.mh * 0.35 + (k % 2 ? geo.mh * 0.18 : 0);
      mound.flowers.push(makeFlower(mound, mound.x + off, baseY, stemH, off * 0.32));
    }

    for (var c = 0; c < n; c++) {
      later(countStep(mound, c, true), 520 + c * COUNT_STEP_MS);
    }
    later(function () {
      if (!stage) return;
      busy = false;
      plantMarker(mound);
      if (window.ToddlFlow) ToddlFlow.extend();
      if (planted === 2 || planted === 4) addButterfly();
      if (planted === MOUNDS) later(bloomFinale, 700);
    }, 520 + (n - 1) * COUNT_STEP_MS + 480);
  }

  function recount(mound) {
    busy = true;
    for (var c = 0; c < mound.n; c++) {
      later(countStep(mound, c, false), 60 + c * COUNT_STEP_MS);
    }
    later(function () { busy = false; }, 60 + (mound.n - 1) * COUNT_STEP_MS + 480);
  }

  // Count the c-th flower of a mound: grow it (when planting) or bob
  // it (when recounting), ring a rising note, and say the number.
  function countStep(mound, c, growing) {
    return function () {
      if (!stage) return;
      var f = mound.flowers[c];
      if (growing) f.el.classList.add('is-grown');
      else boing(f);
      ToddlAudio.countNote(c);
      ToddlAudio.say(NUMBER_WORDS[c], { interrupt: true });
      showCount(mound, c + 1);
    };
  }

  var countLabel = null;

  function showCount(mound, count) {
    // one count bubble at a time, anywhere in the garden
    if (countLabel && countLabel.parentNode) countLabel.parentNode.removeChild(countLabel);
    var top = Infinity;
    mound.flowers.forEach(function (f) { top = Math.min(top, f.hy - geo.hs * 0.5); });
    var label = document.createElement('div');
    label.className = 'count-label';
    label.textContent = String(count);
    label.style.left = mound.x + 'px';
    label.style.top = Math.max(geo.H * 0.13, top - geo.hs * 0.75) + 'px';
    layer.appendChild(label);
    countLabel = label;
    later(function () {
      if (label.parentNode) label.parentNode.removeChild(label);
    }, 1900);
  }

  function rainOn(mound) {
    for (var d = 0; d < 7; d++) {
      var drop = document.createElement('span');
      drop.className = 'g-drop';
      drop.style.left = (mound.x + (Math.random() - 0.5) * geo.mw * 0.6) + 'px';
      drop.style.top = (mound.topY - geo.H * 0.2) + 'px';
      drop.style.setProperty('--fall', (geo.H * 0.2) + 'px');
      drop.style.animationDelay = (d * 0.06) + 's';
      layer.appendChild(drop);
      later((function (el) {
        return function () { if (el.parentNode) el.parentNode.removeChild(el); };
      })(drop), 900);
    }
  }

  function plantMarker(mound) {
    var m = document.createElement('div');
    m.className = 'g-marker';
    // planted front-and-center in its own mound, like a seed label
    m.style.left = mound.x + 'px';
    m.style.top = (mound.topY + geo.mh * 1.05) + 'px';
    m.style.fontSize = Math.max(16, geo.hs * 0.42) + 'px';
    m.style.setProperty('--sign', mound.palette.petal);
    var sign = document.createElement('span');
    sign.className = 'g-marker-sign';
    sign.textContent = String(mound.n);
    var stick = document.createElement('span');
    stick.className = 'g-marker-stick';
    m.appendChild(sign);
    m.appendChild(stick);
    layer.appendChild(m);
  }

  /* ---------- flowers ---------- */

  function makeFlower(mound, x, baseY, stemH, fanDeg) {
    var hs = geo.hs;
    var el = document.createElement('div');
    el.className = 'g-flower';
    el.style.left = x + 'px';
    el.style.top = baseY + 'px';
    el.style.width = hs + 'px';
    el.style.height = (hs + stemH) + 'px';
    el.style.zIndex = String(Math.round(baseY));
    el.style.transform = 'translate(-50%, -100%) rotate(' + fanDeg + 'deg)';

    var grow = document.createElement('div');
    grow.className = 'g-grow';
    var sway = document.createElement('div');
    sway.className = 'g-sway';
    sway.style.animationDuration = (4.5 + Math.random() * 2.5) + 's';
    sway.style.animationDelay = (-Math.random() * 5) + 's';
    var lean = document.createElement('div');
    lean.className = 'g-lean';
    lean.appendChild(makeFlowerSvg(mound.head, mound.palette, stemH / hs * 100));
    sway.appendChild(lean);
    grow.appendChild(sway);
    el.appendChild(grow);
    layer.appendChild(el);

    var fan = fanDeg * Math.PI / 180;
    var reach = stemH + hs * 0.5;
    var f = {
      el: el, lean: lean, mound: mound,
      hx: x + Math.sin(fan) * reach,
      hy: baseY - Math.cos(fan) * reach,
      cool: 0
    };
    f.note = Math.round(f.hx / geo.W * 9);
    flowers.push(f);

    el.addEventListener('pointerdown', function (e) {
      if (!el.classList.contains('is-grown')) return;
      e.preventDefault();
      boing(f);
      f.cool = Date.now() + 400;
      ToddlAudio.flowerNote(f.note);
      petalPuff(f);
      noteInteraction();
    });
    return f;
  }

  function boing(f) {
    f.lean.classList.remove('is-boing');
    void f.lean.offsetWidth;
    f.lean.classList.add('is-boing');
  }

  function petalPuff(f) {
    for (var p = 0; p < 4; p++) {
      var pet = document.createElement('span');
      pet.className = 'g-petal';
      pet.style.left = f.hx + 'px';
      pet.style.top = f.hy + 'px';
      pet.style.background = f.mound.palette.petal;
      pet.style.setProperty('--dx', ((Math.random() - 0.5) * geo.hs * 2.2) + 'px');
      pet.style.setProperty('--dy', (geo.hs * (0.6 + Math.random() * 1.2)) + 'px');
      pet.style.setProperty('--rot', ((Math.random() - 0.5) * 540) + 'deg');
      layer.appendChild(pet);
      later((function (el) {
        return function () { if (el.parentNode) el.parentNode.removeChild(el); };
      })(pet), 1700);
    }
  }

  // A finger brushing through the meadow: every flower it passes
  // leans away from the motion and springs back, chiming softly.
  function brushAt(pt, dir) {
    var now = Date.now();
    var hit = false;
    var reach = geo.hs * 0.75;
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i];
      if (f.cool > now || !f.el.classList.contains('is-grown')) continue;
      var dx = pt.x - f.hx, dy = pt.y - f.hy;
      if (dx * dx + dy * dy > reach * reach) continue;
      f.cool = now + 450;
      f.lean.style.setProperty('--lean', (dir * 16) + 'deg');
      f.lean.classList.add('is-brushed');
      later((function (lean) {
        return function () { lean.classList.remove('is-brushed'); };
      })(f.lean), 160);
      ToddlAudio.flowerNote(f.note, true);
      hit = true;
    }
    return hit;
  }

  function onStageDown(e) {
    var pt = stageXY(e);
    brushing[e.pointerId] = { x: pt.x, brushed: false };
  }

  function onStageMove(e) {
    var b = brushing[e.pointerId];
    if (!b || !geo) return;
    var pt = stageXY(e);
    var dx = pt.x - b.x;
    if (Math.abs(dx) < 2) return;
    if (brushAt(pt, dx > 0 ? 1 : -1)) b.brushed = true;
    b.x = pt.x;
  }

  function onStageUp(e) {
    var b = brushing[e.pointerId];
    delete brushing[e.pointerId];
    if (b && b.brushed) noteInteraction();
  }

  /* ---------- butterflies ---------- */

  function grownFlowers() {
    return flowers.filter(function (f) { return f.el.classList.contains('is-grown'); });
  }

  function addButterfly() {
    if (!stage || butterflies.length >= 3) return;
    var targets = grownFlowers();
    if (!targets.length) return;
    var el = document.createElement('div');
    el.className = 'g-butterfly';
    el.style.fontSize = Math.max(30, geo.hs * 0.85) + 'px';
    var wings = document.createElement('span');
    wings.className = 'g-wings';
    wings.textContent = '\u{1F98B}';
    wings.style.filter = 'hue-rotate(' + BUTTERFLY_HUES[butterflies.length % BUTTERFLY_HUES.length] + 'deg)';
    el.appendChild(wings);
    layer.appendChild(el);

    var fromLeft = Math.random() < 0.5;
    var b = {
      el: el, x: fromLeft ? -60 : geo.W + 60, y: geo.H * (0.2 + Math.random() * 0.15),
      flying: false, perch: null, restUntil: 0
    };
    butterflies.push(b);
    flyTo(b, targets[Math.floor(Math.random() * targets.length)], geo.H * 0.12);

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (b.flying) return;
      // Shoo! Off it flutters, looping high, to find another flower.
      var others = grownFlowers().filter(function (f) { return f !== b.perch; });
      if (!others.length) return;
      flyTo(b, others[Math.floor(Math.random() * others.length)], geo.H * 0.3);
      ToddlAudio.flowerNote(8);
      later(function () { ToddlAudio.flowerNote(9); }, 120);
      noteInteraction();
    });
  }

  function flyTo(b, flower, arc) {
    b.fromX = b.x; b.fromY = b.y;
    b.perch = flower;
    b.toX = flower.hx;
    b.toY = flower.hy - geo.hs * 0.42;
    var dist = Math.sqrt(Math.pow(b.toX - b.fromX, 2) + Math.pow(b.toY - b.fromY, 2));
    b.t0 = performance.now();
    b.dur = 1400 + dist * 3.2;
    b.arc = arc;
    b.flying = true;
    b.el.classList.remove('is-landed');
  }

  function tickButterflies(now) {
    for (var i = 0; i < butterflies.length; i++) {
      var b = butterflies[i];
      if (b.flying) {
        var p = Math.min(1, (now - b.t0) / b.dur);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        b.x = b.fromX + (b.toX - b.fromX) * e + Math.sin(now / 160) * 6 * (1 - p);
        b.y = b.fromY + (b.toY - b.fromY) * e - Math.sin(Math.PI * p) * b.arc +
              Math.sin(now / 110) * 5 * (1 - p);
        if (p >= 1) {
          b.flying = false;
          b.x = b.toX; b.y = b.toY;
          b.restUntil = now + 4000 + Math.random() * 5000;
          b.el.classList.add('is-landed');
        }
      } else if (now > b.restUntil) {
        var others = grownFlowers().filter(function (f) { return f !== b.perch; });
        if (others.length) flyTo(b, others[Math.floor(Math.random() * others.length)], geo.H * 0.1);
      }
      b.el.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px) translate(-50%, -70%)';
    }
    rafId = window.requestAnimationFrame(tickButterflies);
  }

  /* ---------- full bloom & moving on ---------- */

  function bloomFinale() {
    if (!stage) return;
    fullBloom = true;
    ToddlAudio.chime();
    addButterfly();
    // The whole garden ripples, left to right, in a rising glissando.
    var row = flowers.slice().sort(function (a, b) { return a.hx - b.hx; });
    row.forEach(function (f, i) {
      later(function () {
        if (!stage) return;
        boing(f);
        ToddlAudio.flowerNote(f.note, true);
      }, 900 + i * 90);
    });
    if (window.ToddlFlow) ToddlFlow.extend();
    armIdle();
  }

  function noteInteraction() {
    if (!fullBloom || leaving) return;
    interactions++;
    if (window.ToddlFlow) ToddlFlow.extend();
    armIdle();
    if (interactions >= PLAY_BUDGET) {
      leaving = true;
      later(moveOn, 2200);
    }
  }

  function armIdle() {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(moveOn, IDLE_MS);
  }

  function moveOn() {
    if (!stage) return;
    if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = null; }
    if (window.ToddlFlow) { ToddlFlow.next(); return; }
    layoutGarden();
  }

  /* ---------- lifecycle ---------- */

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
    brushing = {};
    stage.addEventListener('pointerdown', onStageDown);
    stage.addEventListener('pointermove', onStageMove);
    stage.addEventListener('pointerup', onStageUp);
    stage.addEventListener('pointercancel', onStageUp);
    window.requestAnimationFrame(layoutGarden);
    rafId = window.requestAnimationFrame(tickButterflies);
  }

  function stop() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = null; }
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    if (stage) {
      stage.removeEventListener('pointerdown', onStageDown);
      stage.removeEventListener('pointermove', onStageMove);
      stage.removeEventListener('pointerup', onStageUp);
      stage.removeEventListener('pointercancel', onStageUp);
      stage.innerHTML = '';
    }
    stage = null;
    layer = null;
    mounds = [];
    flowers = [];
    butterflies = [];
    brushing = {};
    planted = 0;
    busy = false;
    fullBloom = false;
  }

  window.ToddlGarden = { start: start, stop: stop };
})();
