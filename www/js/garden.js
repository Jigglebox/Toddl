/* ============================================================
   Garden — a walk along a garden path, one bed at a time.

   Only ONE bed is ever on screen. Its seeds show how many
   flowers it wants: one seed in the first bed, two in the next,
   up to five. Each tap on the bed grows one flower while Toddl
   counts it aloud — "one… two… three…" — and the butterfly
   friend flutters over to land on the flower just counted.
   When every seed has bloomed, the bed's number sign pops up,
   the child can play for a moment (tap a flower and it sings,
   brush a finger through them and they sway and chime, tap the
   bed to count again), and then the view glides along the path
   to the next bed. After the fifth bed, the next activity
   drifts in.

   Montessori notes:
     - isolation: one quantity at a time, never more than five
       flowers on screen
     - one tap = one flower = one number (one-to-one counting),
       and the seeds make the goal visible without instructions
     - the numeral appears only once the quantity is built
     - no fail states: extra taps on a full bed just recount it
   ============================================================ */

(function () {
  'use strict';

  var PALETTES = [
    { petal: '#e6b8b0', deep: '#c9857c', center: '#ecd9a0' },
    { petal: '#a8bfd4', deep: '#7f9db8', center: '#ecd9a0' },
    { petal: '#ecd9a0', deep: '#d4b96a', center: '#cf9188' },
    { petal: '#c5b6d4', deep: '#a08fb8', center: '#e3cd8c' },
    { petal: '#dfaec6', deep: '#c489a8', center: '#e3cd8c' }
  ];
  var HEADS = ['daisy', 'tulip', 'aster'];
  var NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five'];
  var BEDS = 5;
  var TAP_GAP_MS = 450;       // one new flower at most this often
  var COUNT_STEP_MS = 720;    // recount pace
  var LINGER_MS = 4500;       // play time on a full bed before gliding on
  var LINGER_MAX_MS = 12000;  // ...extended by play, but not forever
  var GLIDE_MS = 1800;
  var END_IDLE_MS = 8000;     // after the last bed: quiet -> move on
  var END_BUDGET = 14;        // ...or this many more touches

  var stage = null;
  var world = null;
  var overlay = null;
  var geo = null;
  var beds = [];
  var index = 0;
  var phase = 'counting';     // counting | full | gliding | done
  var lastGrowAt = 0;
  var recounting = false;
  var fullAt = 0;
  var glideTimer = null;
  var endTimer = null;
  var endTouches = 0;
  var leaving = false;
  var countLabel = null;
  var butterfly = null;
  var timers = [];
  var rafId = null;
  var brushing = {};

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

  // World x of the current view's left edge.
  function offset() { return index * geo.W; }

  function stageXY(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ---------- drawing ---------- */

  function makeSoilSvg() {
    var svg = svgEl('svg', { viewBox: '0 0 100 30', preserveAspectRatio: 'none' });
    svg.appendChild(svgEl('path', {
      d: 'M1 29 Q4 3 50 2 Q96 3 99 29 Z', fill: '#c3b494'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M12 22 Q20 7 50 6 Q74 7 84 14 Q60 10 46 11 Q24 13 12 22 Z',
      fill: 'rgba(255,255,255,0.16)'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M1 29 Q50 24 99 29 Z', fill: 'rgba(120, 100, 70, 0.18)'
    }));
    return svg;
  }

  // A flower as one SVG: a 100x100 head over a stem `stemUnits`
  // long (same units), with one leaf.
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

  /* ---------- layout: five beds along one long path ---------- */

  function layoutGarden() {
    var rect = stage.getBoundingClientRect();
    var W = rect.width, H = rect.height;
    geo = {
      W: W, H: H,
      bw: Math.min(W * 0.5, 440),
      bh: Math.max(26, H * 0.09),
      hs: Math.max(40, Math.min(H * 0.17, 74)),
      soilY: H * 0.9          // bottom edge of the soil
    };
    geo.soilTop = geo.soilY - geo.bh;

    world.innerHTML = '';
    world.style.transition = 'none';
    world.style.transform = 'translateX(0)';
    beds = [];
    index = 0;
    phase = 'counting';

    // stepping stones: the path from one bed to the next
    for (var sx = 0; sx < geo.W * BEDS; sx += geo.W * 0.09) {
      var local = sx % geo.W;
      var nHere = Math.floor(sx / geo.W) + 1;
      if (Math.abs(local - geo.W / 2) < bedWidth(nHere) / 2 + geo.W * 0.05) continue;
      if (sx < geo.W / 2 || sx > geo.W * (BEDS - 0.5)) continue;
      var st = document.createElement('span');
      st.className = 'g-stone';
      st.style.left = sx + 'px';
      st.style.top = (geo.soilY - geo.bh * 0.2) + 'px';
      world.appendChild(st);
    }

    var looks = shuffle(PALETTES.slice());
    for (var i = 0; i < BEDS; i++) beds.push(makeBed(i, looks[i], HEADS[i % HEADS.length]));
  }

  // Beds grow wider with their number: a small bed for one flower,
  // the full bed for five.
  function bedWidth(n) {
    return geo.bw * (0.42 + 0.58 * (n - 1) / (BEDS - 1));
  }

  function makeBed(i, palette, head) {
    var n = i + 1;
    var x = geo.W * (i + 0.5);
    var bw = bedWidth(n);
    var el = document.createElement('div');
    el.className = 'g-bed';
    el.style.left = x + 'px';
    el.style.top = (geo.soilY - geo.bh * 1.9) + 'px';
    el.style.width = bw + 'px';
    el.style.height = (geo.bh * 1.9) + 'px';
    var soil = document.createElement('div');
    soil.className = 'g-soil';
    soil.style.height = geo.bh + 'px';
    soil.appendChild(makeSoilSvg());
    el.appendChild(soil);
    world.appendChild(el);

    var bed = { i: i, n: n, x: x, bw: bw, el: el, palette: palette, head: head,
                spots: [], flowers: [], grown: 0, sign: null };

    var gap = n > 1 ? Math.min(bw * 0.78 / (n - 1), geo.hs * 1.45) : 0;
    for (var k = 0; k < n; k++) {
      var fx = x + (k - (n - 1) / 2) * gap;
      var seed = document.createElement('span');
      seed.className = 'g-seed';
      seed.style.left = fx + 'px';
      seed.style.top = (geo.soilTop + geo.bh * 0.22) + 'px';
      seed.style.animationDelay = (k * 0.2) + 's';
      world.appendChild(seed);
      bed.spots.push({ x: fx, seed: seed });
    }

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (bed.i !== index) return;
      tapBed(bed);
    });
    return bed;
  }

  /* ---------- counting ---------- */

  function tapBed(bed) {
    if (phase === 'gliding' || leaving) return;
    if (bed.grown < bed.n) {
      var now = Date.now();
      if (now - lastGrowAt < TAP_GAP_MS) return;
      lastGrowAt = now;
      growNext(bed);
    } else if (!recounting) {
      recount(bed);
      touched();
    }
  }

  function growNext(bed) {
    var k = bed.grown;
    var spot = bed.spots[k];
    bed.grown++;
    spot.seed.classList.add('is-sprouted');

    var center = k - (bed.n - 1) / 2;
    var middle = bed.n > 1 ? 1 - Math.abs(center) / ((bed.n - 1) / 2) : 1;
    var stemH = geo.H * (0.3 + middle * 0.05);
    var f = makeFlower(bed, spot.x, geo.soilTop + geo.bh * 0.3, stemH, center * 3);
    bed.flowers.push(f);
    // let the element land in the DOM first so the growth animates
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { f.el.classList.add('is-grown'); });
    });

    ToddlAudio.countNote(k);
    ToddlAudio.say(NUMBER_WORDS[k], { interrupt: true });
    showCount(f, k + 1);
    later(function () { if (stage) landOn(f); }, 350);

    if (bed.grown === bed.n) {
      phase = 'full';
      later(function () { if (stage) completeBed(bed); }, 800);
    }
  }

  function recount(bed) {
    recounting = true;
    bed.flowers.forEach(function (f, c) {
      later(function () {
        if (!stage) return;
        boing(f);
        ToddlAudio.countNote(c);
        ToddlAudio.say(NUMBER_WORDS[c], { interrupt: true });
        showCount(f, c + 1);
      }, 60 + c * COUNT_STEP_MS);
    });
    later(function () { recounting = false; }, 60 + (bed.n - 1) * COUNT_STEP_MS + 480);
  }

  // One count bubble at a time, always in the same calm spot.
  function showCount(f, count) {
    if (countLabel && countLabel.parentNode) countLabel.parentNode.removeChild(countLabel);
    var label = document.createElement('div');
    label.className = 'count-label';
    label.textContent = String(count);
    label.style.left = (geo.W / 2) + 'px';
    label.style.top = (geo.H * 0.17) + 'px';
    overlay.appendChild(label);
    countLabel = label;
    later(function () {
      if (label.parentNode) label.parentNode.removeChild(label);
    }, 1900);
  }

  function completeBed(bed) {
    var sign = document.createElement('div');
    sign.className = 'g-marker';
    sign.style.left = (bed.x + bed.bw / 2 + geo.hs * 0.2) + 'px';
    sign.style.top = (geo.soilY - geo.bh * 0.05) + 'px';
    sign.style.fontSize = Math.max(18, geo.hs * 0.5) + 'px';
    sign.style.setProperty('--sign', bed.palette.petal);
    var face = document.createElement('span');
    face.className = 'g-marker-sign';
    face.textContent = String(bed.n);
    var stick = document.createElement('span');
    stick.className = 'g-marker-stick';
    sign.appendChild(face);
    sign.appendChild(stick);
    world.appendChild(sign);
    bed.sign = sign;
    ToddlAudio.chime();
    if (window.ToddlFlow) ToddlFlow.extend();

    fullAt = Date.now();
    if (bed.i === BEDS - 1) finale(bed);
    else armGlide(LINGER_MS);
  }

  // Play on a full bed pushes the glide back a little — up to a cap,
  // so the walk always continues.
  function armGlide(ms) {
    if (glideTimer) window.clearTimeout(glideTimer);
    var cap = fullAt + LINGER_MAX_MS - Date.now();
    glideTimer = window.setTimeout(glideNext, Math.max(600, Math.min(ms, cap)));
  }

  function glideNext() {
    glideTimer = null;
    if (!stage || phase !== 'full') return;
    phase = 'gliding';
    if (countLabel && countLabel.parentNode) countLabel.parentNode.removeChild(countLabel);
    index++;
    world.style.transition = 'transform ' + GLIDE_MS + 'ms cubic-bezier(0.45, 0, 0.25, 1)';
    world.style.transform = 'translateX(' + (-offset()) + 'px)';
    // the butterfly friend flies along to wait at the next bed
    restAtBed(beds[index], GLIDE_MS + 300, geo.H * 0.18);
    later(function () {
      if (!stage) return;
      phase = 'counting';
      lastGrowAt = 0;
    }, GLIDE_MS);
  }

  /* ---------- the last bed ---------- */

  function finale(bed) {
    phase = 'done';
    bed.flowers.forEach(function (f, i) {
      later(function () {
        if (!stage) return;
        boing(f);
        ToddlAudio.flowerNote(f.note, true);
      }, 700 + i * 140);
    });
    armEnd();
  }

  function touched() {
    if (phase === 'full') armGlide(LINGER_MS);
    if (phase === 'done' && !leaving) {
      endTouches++;
      armEnd();
      if (endTouches >= END_BUDGET) {
        leaving = true;
        later(moveOn, 2000);
      }
    }
  }

  function armEnd() {
    if (endTimer) window.clearTimeout(endTimer);
    endTimer = window.setTimeout(moveOn, END_IDLE_MS);
  }

  function moveOn() {
    if (!stage) return;
    if (endTimer) { window.clearTimeout(endTimer); endTimer = null; }
    if (window.ToddlFlow) { ToddlFlow.next(); return; }
    restart();
  }

  /* ---------- flowers ---------- */

  function makeFlower(bed, x, baseY, stemH, fanDeg) {
    var hs = geo.hs;
    var el = document.createElement('div');
    el.className = 'g-flower';
    el.style.left = x + 'px';
    el.style.top = baseY + 'px';
    el.style.width = hs + 'px';
    el.style.height = (hs + stemH) + 'px';
    el.style.transform = 'translate(-50%, -100%) rotate(' + fanDeg + 'deg)';

    var grow = document.createElement('div');
    grow.className = 'g-grow';
    var sway = document.createElement('div');
    sway.className = 'g-sway';
    sway.style.animationDuration = (4.5 + Math.random() * 2.5) + 's';
    sway.style.animationDelay = (-Math.random() * 5) + 's';
    var lean = document.createElement('div');
    lean.className = 'g-lean';
    lean.appendChild(makeFlowerSvg(bed.head, bed.palette, stemH / hs * 100));
    sway.appendChild(lean);
    grow.appendChild(sway);
    el.appendChild(grow);
    world.appendChild(el);

    var fan = fanDeg * Math.PI / 180;
    var reach = stemH + hs * 0.5;
    var f = {
      el: el, lean: lean, bed: bed, cool: 0,
      hx: x + Math.sin(fan) * reach,          // world coords
      hy: baseY - Math.cos(fan) * reach
    };
    f.note = Math.round(((f.hx - bed.x) / bed.bw + 0.5) * 7) + 1;

    el.addEventListener('pointerdown', function (e) {
      if (bed.i !== index || phase === 'gliding') return;
      e.preventDefault();
      boing(f);
      f.cool = Date.now() + 400;
      ToddlAudio.flowerNote(f.note);
      touched();
    });
    return f;
  }

  function boing(f) {
    f.lean.classList.remove('is-boing');
    void f.lean.offsetWidth;
    f.lean.classList.add('is-boing');
  }

  // A finger brushing through the bed: flowers lean away from the
  // motion and spring back, chiming softly as it passes.
  function brushAt(pt, dir) {
    if (phase === 'gliding' || !beds[index]) return false;
    var now = Date.now();
    var hit = false;
    var reach = geo.hs * 0.8;
    var wx = pt.x + offset();
    var fl = beds[index].flowers;
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i];
      if (f.cool > now) continue;
      var dx = wx - f.hx, dy = pt.y - f.hy;
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
    brushing[e.pointerId] = { x: stageXY(e).x, brushed: false };
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
    if (b && b.brushed) touched();
  }

  /* ---------- the butterfly friend ---------- */

  function makeButterfly() {
    var el = document.createElement('div');
    el.className = 'g-butterfly';
    el.style.fontSize = Math.max(30, geo.hs * 0.8) + 'px';
    var wings = document.createElement('span');
    wings.className = 'g-wings';
    wings.textContent = '\u{1F98B}';
    el.appendChild(wings);
    overlay.appendChild(el);
    butterfly = { el: el, x: -60, y: geo.H * 0.3, flying: false, perch: null };

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (butterfly.flying || phase === 'gliding') return;
      // Off it flutters, looping, to another flower in this bed.
      var fl = beds[index].flowers.filter(function (f) { return f !== butterfly.perch; });
      if (fl.length) landOn(fl[Math.floor(Math.random() * fl.length)], geo.H * 0.25);
      else restAtBed(beds[index], 1400, geo.H * 0.2);
      ToddlAudio.flowerNote(7);
      later(function () { ToddlAudio.flowerNote(9); }, 120);
      touched();
    });
  }

  function landOn(f, arc) {
    flyTo(f.hx - offset(), f.hy - geo.hs * 0.42, arc || geo.H * 0.08, null);
    butterfly.perch = f;
  }

  // Wait on the soil at the left end of a bed (bed is the current one).
  function restAtBed(bed, dur, arc) {
    flyTo(bed.x - bed.bw * 0.5 + geo.hs * 0.25 - offset(), geo.soilTop - 2, arc, dur);
    butterfly.perch = null;
  }

  function flyTo(x, y, arc, dur) {
    var b = butterfly;
    b.fromX = b.x; b.fromY = b.y;
    b.toX = x; b.toY = y;
    var dist = Math.sqrt(Math.pow(x - b.x, 2) + Math.pow(y - b.y, 2));
    b.t0 = performance.now();
    b.dur = dur || Math.min(1500, 700 + dist * 2.2);
    b.arc = arc;
    b.flying = true;
    b.el.classList.remove('is-landed');
  }

  function tick(now) {
    var b = butterfly;
    if (b && b.flying) {
      var p = Math.min(1, (now - b.t0) / b.dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      b.x = b.fromX + (b.toX - b.fromX) * e + Math.sin(now / 160) * 5 * (1 - p);
      b.y = b.fromY + (b.toY - b.fromY) * e - Math.sin(Math.PI * p) * b.arc +
            Math.sin(now / 110) * 4 * (1 - p);
      if (p >= 1) {
        b.flying = false;
        b.x = b.toX; b.y = b.toY;
        b.el.classList.add('is-landed');
      }
    }
    if (b) b.el.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px) translate(-50%, -70%)';
    rafId = window.requestAnimationFrame(tick);
  }

  /* ---------- lifecycle ---------- */

  function restart() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (glideTimer) { window.clearTimeout(glideTimer); glideTimer = null; }
    if (endTimer) { window.clearTimeout(endTimer); endTimer = null; }
    overlay.innerHTML = '';
    countLabel = null;
    recounting = false;
    leaving = false;
    endTouches = 0;
    lastGrowAt = 0;
    layoutGarden();
    makeButterfly();
    restAtBed(beds[0], 1600, geo.H * 0.15);
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
    world = document.createElement('div');
    world.className = 'g-world';
    stage.appendChild(world);
    overlay = document.createElement('div');
    overlay.className = 'g-overlay';
    stage.appendChild(overlay);
    brushing = {};
    stage.addEventListener('pointerdown', onStageDown);
    stage.addEventListener('pointermove', onStageMove);
    stage.addEventListener('pointerup', onStageUp);
    stage.addEventListener('pointercancel', onStageUp);
    window.requestAnimationFrame(function () { if (stage) restart(); });
    rafId = window.requestAnimationFrame(tick);
  }

  function stop() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (glideTimer) { window.clearTimeout(glideTimer); glideTimer = null; }
    if (endTimer) { window.clearTimeout(endTimer); endTimer = null; }
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    if (stage) {
      stage.removeEventListener('pointerdown', onStageDown);
      stage.removeEventListener('pointermove', onStageMove);
      stage.removeEventListener('pointerup', onStageUp);
      stage.removeEventListener('pointercancel', onStageUp);
      stage.innerHTML = '';
    }
    stage = null;
    world = null;
    overlay = null;
    beds = [];
    butterfly = null;
    countLabel = null;
    brushing = {};
  }

  window.ToddlGarden = { start: start, stop: stop };
})();
