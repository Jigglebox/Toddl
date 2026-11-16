/* ============================================================
   Garden — a seasonal vegetable patch and a watering can.

   Five beds across the bottom, each with a seedling. A watering
   can floats at the left, glowing softly. Touch anywhere and the
   can flies to the finger and pours; drag it over a bed and the
   water lands on the soil. Beside each bed a little droplet
   gauge fills to show how much water that bed has had, and the
   plant grows the whole time it's being watered — the sprout
   stretches, leaves unfurl one by one, fruit buds appear, swell,
   and ripen. When a bed's droplet is full, the crop ripens with
   a bounce and a sparkle, Toddl says its number ("one… two…")
   and then its name ("tomato"), and the number stays above it.

   Every bed needs a different amount of water, and the thirstier
   the bed, the bigger the plant grows — so the child learns that
   patience makes bigger things.

   The crops change with the season — spring strawberries and
   peas, summer tomatoes and corn, autumn pumpkins and apples,
   winter cabbages and oranges — and so does the sky: blossom
   petals drift in spring, leaves fall in autumn, snow in winter.
   Each visit moves one season along.

   Montessori notes:
     - counting 1–5 by completion: the numbers arrive in order no
       matter which bed the child waters first
     - real cause and effect: growth happens only while water is
       actually landing on the bed
     - vocabulary: tap a ripe crop and Toddl names it
     - no fail states: water on the path just soaks in
   ============================================================ */

(function () {
  'use strict';

  var SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  /* The approved character set (resources/garden-characters): flat
     pastel kawaii sprites, one art style. Each season draws its five
     from these eleven, until more are made. */
  var SPRITES = {
    'watering-can': { w: 703, h: 618 },
    strawberry: { w: 541, h: 650, scale: 1.08 },
    pea:        { w: 332, h: 855, scale: 1.1 },
    lettuce:    { w: 754, h: 615, scale: 0.74 },   // wide: pack says 0.84
    carrot:     { w: 414, h: 813, scale: 1.1 },
    tomato:     { w: 533, h: 592, scale: 1.0 },
    blueberry:  { w: 574, h: 638, scale: 0.98 },
    pumpkin:    { w: 542, h: 632, scale: 1.0 },
    apple:      { w: 590, h: 692, scale: 1.02 },
    broccoli:   { w: 716, h: 720, scale: 0.8 },
    cabbage:    { w: 836, h: 703, scale: 0.66 },   // wide: pack says 0.8
    orange:     { w: 558, h: 643, scale: 0.98 }
  };
  var CROPS = {
    spring: ['strawberry', 'pea', 'lettuce', 'carrot', 'blueberry'],
    summer: ['tomato', 'blueberry', 'strawberry', 'pea', 'carrot'],
    autumn: ['pumpkin', 'apple', 'broccoli', 'carrot', 'cabbage'],
    winter: ['cabbage', 'orange', 'broccoli', 'apple', 'lettuce']
  };
  var CAN_TIP = { x: 0.105, y: 0.19 };     // the sprinkler rose, in sprite fractions
  var CROP_BASE_H = 0.30;                 // crop height = 0.30 x stage height x scale

  var SCENES = {
    spring: { sun: { x: '78%', y: '16%', size: '30vmin', color: 'rgba(250, 240, 190, 0.9)', halo: 'rgba(236, 217, 160, 0.3)' },
              clouds: 3, cloudTint: 0.75,
              hills: { front: 'rgba(168, 204, 150, 0.6)', back: 'rgba(196, 220, 170, 0.5)', height: '30%' },
              flakes: 'petal' },
    summer: { sun: { x: '74%', y: '14%', size: '40vmin', color: 'rgba(255, 236, 170, 0.95)', halo: 'rgba(255, 220, 150, 0.4)' },
              clouds: 1, cloudTint: 0.85,
              hills: { front: 'rgba(176, 196, 120, 0.6)', back: 'rgba(214, 206, 140, 0.45)', height: '30%' },
              flakes: null },
    autumn: { sun: { x: '80%', y: '20%', size: '32vmin', color: 'rgba(250, 210, 150, 0.9)', halo: 'rgba(240, 180, 120, 0.35)' },
              clouds: 2, cloudTint: 0.7,
              hills: { front: 'rgba(214, 176, 120, 0.6)', back: 'rgba(230, 196, 140, 0.5)', height: '30%' },
              flakes: 'leaf' },
    winter: { sun: { x: '76%', y: '18%', size: '28vmin', color: 'rgba(255, 255, 255, 0.9)', halo: 'rgba(220, 230, 240, 0.5)' },
              clouds: 2, cloudTint: 0.9,
              hills: { front: 'rgba(240, 244, 248, 0.95)', back: 'rgba(214, 224, 236, 0.9)', height: '30%' },
              flakes: 'snow' }
  };

  var NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five'];
  var BEDS = 5;
  var NEED_MIN = 1.6, NEED_MAX = 3.8;    // seconds of watering per bed
  var MARKS = [0.25, 0.5, 0.75];           // soft notes as it grows
  var DROP_EVERY_MS = 32;
  var END_IDLE_MS = 12000;
  var END_BUDGET = 10;

  // Start from the real season, then move along one each visit.
  var seasonIndex = (function () {
    var m = new Date().getMonth();          // 0 = Jan
    return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
  })();

  var stage = null;
  var layer = null;
  var geo = null;
  var season = null;
  var beds = [];
  var can = null;
  var pointerId = null;
  var ripeCount = 0;
  var done = false;
  var leaving = false;
  var endTouches = 0;
  var endTimer = null;
  var lastTouchAt = 0;
  var lastDropAt = 0;
  var lastT = 0;
  var rafId = null;
  var timers = [];

  function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }

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

  /* ---------- drawing: soil, gauge, can ---------- */

  function makeSoilSvg() {
    var svg = svgEl('svg', { viewBox: '0 0 100 30', preserveAspectRatio: 'none' });
    svg.appendChild(svgEl('path', { d: 'M1 29 Q4 3 50 2 Q96 3 99 29 Z', fill: '#c3b494' }));
    svg.appendChild(svgEl('path', {
      d: 'M12 22 Q20 7 50 6 Q74 7 84 14 Q60 10 46 11 Q24 13 12 22 Z', fill: 'rgba(255,255,255,0.16)'
    }));
    svg.appendChild(svgEl('path', { d: 'M1 29 Q50 24 99 29 Z', fill: 'rgba(120, 100, 70, 0.18)' }));
    // the wet sheen, revealed as the bed drinks
    svg.appendChild(svgEl('path', {
      d: 'M1 29 Q4 3 50 2 Q96 3 99 29 Z', fill: 'rgba(70, 90, 120, 0.45)', 'class': 'g-wet'
    }));
    return svg;
  }

  function makeGaugeSvg() {
    var svg = svgEl('svg', { viewBox: '0 0 40 52' });
    var id = 'gclip' + Math.floor(Math.random() * 1e9);
    var defs = svgEl('defs', {});
    var clip = svgEl('clipPath', { id: id });
    clip.appendChild(svgEl('path', { d: 'M20 3 C20 3 4 24 4 34 A16 16 0 0 0 36 34 C36 24 20 3 20 3 Z' }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    svg.appendChild(svgEl('path', {
      d: 'M20 3 C20 3 4 24 4 34 A16 16 0 0 0 36 34 C36 24 20 3 20 3 Z',
      fill: 'rgba(255,255,255,0.55)', stroke: '#7fa9cf', 'stroke-width': 2.5
    }));
    var fill = svgEl('rect', { x: 0, y: 52, width: 40, height: 52, fill: '#79b5e6', 'clip-path': 'url(#' + id + ')', 'class': 'g-gauge-fill' });
    svg.appendChild(fill);
    svg.appendChild(svgEl('ellipse', { cx: 14, cy: 36, rx: 3, ry: 5, fill: 'rgba(255,255,255,0.55)' }));
    return { svg: svg, fill: fill };
  }

  function sprite(name) {
    var img = document.createElement('img');
    img.className = 'g-sprite';
    img.src = 'img/garden/' + name + '.webp';
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    return img;
  }

  /* ---------- layout ---------- */

  function layoutGarden() {
    var rect = stage.getBoundingClientRect();
    var W = rect.width, H = rect.height;
    var spacing = W / BEDS;
    geo = {
      W: W, H: H,
      bw: Math.min(spacing * 0.86, 200),
      bh: Math.max(22, H * 0.08),
      soilY: H * 0.9,
      canW: Math.max(84, Math.min(W * 0.14, 130))
    };
    geo.soilTop = geo.soilY - geo.bh;

    layer.innerHTML = '';
    beds = [];
    ripeCount = 0;
    done = false;
    leaving = false;
    endTouches = 0;

    var crops = shuffle(CROPS[season].slice()).map(function (n) { return { name: n }; });
    for (var i = 0; i < BEDS; i++) beds.push(makeBed(i, crops[i], spacing * (i + 0.5)));

    can = makeCan();
  }

  function makeBed(i, crop, x) {
    var el = document.createElement('div');
    el.className = 'g-bed';
    el.style.left = x + 'px';
    el.style.top = geo.soilTop + 'px';
    el.style.width = geo.bw + 'px';
    el.style.height = geo.bh + 'px';
    el.appendChild(makeSoilSvg());
    layer.appendChild(el);

    var need = NEED_MIN + Math.random() * (NEED_MAX - NEED_MIN);
    var size = 0.78 + (need - NEED_MIN) / (NEED_MAX - NEED_MIN) * 0.42;   // 0.78 .. 1.2

    // full-grown height: the pack's base (0.30 x stage) x its per-crop
    // scale x this bed's thirst
    var sp = SPRITES[crop.name];
    // ...but never taller than the bed is wide-and-a-bit, nor wider than
    // the bed: on big screens the beds stop growing, so crops must too
    var fullH = Math.min(geo.H * CROP_BASE_H * (sp.scale || 1) * size, geo.bw * 1.25, geo.soilTop * 0.92);
    var fullW = fullH * sp.w / sp.h;
    if (fullW > geo.bw * 0.96) { fullW = geo.bw * 0.96; fullH = fullW * sp.h / sp.w; }
    var plant = document.createElement('div');
    plant.className = 'g-plant';
    plant.style.left = x + 'px';
    plant.style.top = (geo.soilTop + geo.bh * 0.3) + 'px';
    plant.style.width = fullW + 'px';
    plant.style.height = fullH + 'px';
    var inner = document.createElement('div');
    inner.className = 'g-plant-inner';
    inner.appendChild(sprite(crop.name));
    plant.appendChild(inner);
    layer.appendChild(plant);

    var gauge = document.createElement('div');
    gauge.className = 'g-gauge';
    gauge.style.left = (x + geo.bw * 0.46) + 'px';
    gauge.style.top = (geo.soilTop - 6) + 'px';
    var gsvg = makeGaugeSvg();
    gauge.appendChild(gsvg.svg);
    layer.appendChild(gauge);

    var bed = {
      i: i, crop: crop, x: x, el: el, plant: plant, inner: inner,
      wet: el.querySelector('.g-wet'),
      gauge: gauge, gaugeFill: gsvg.fill, fullH: fullH,
      need: need, size: size, water: 0, ripe: false, number: 0, happyUntil: 0
    };
    el.dataset.need = need.toFixed(2);
    el.dataset.size = size.toFixed(2);
    renderBed(bed);

    plant.addEventListener('pointerdown', function (e) {
      if (!bed.ripe || !e.isPrimary) return;
      boing(bed);
      ToddlAudio.flowerNote(2 + bed.i);
      ToddlAudio.say(bed.crop.name, { interrupt: true });
      touched();
    });
    return bed;
  }

  function makeCan() {
    var el = document.createElement('div');
    el.className = 'g-can is-idle is-glow';
    var sp = SPRITES['watering-can'];
    var canH = geo.canW * sp.h / sp.w;
    el.style.width = geo.canW + 'px';
    el.style.height = canH + 'px';
    var float = document.createElement('div');
    float.className = 'g-can-float';
    var body = document.createElement('div');
    body.className = 'g-can-body';
    var tipX = geo.canW * CAN_TIP.x, tipY = canH * CAN_TIP.y;
    body.style.transformOrigin = tipX + 'px ' + tipY + 'px';
    body.appendChild(sprite('watering-can'));
    float.appendChild(body);
    el.appendChild(float);
    layer.appendChild(el);
    var c = {
      el: el, tipX: tipX, tipY: tipY,
      x: geo.W * 0.16, y: geo.H * 0.42,      // spout-tip position
      tx: 0, ty: 0, pouring: false, held: false
    };
    c.tx = c.x; c.ty = c.y;
    placeCan(c);
    return c;
  }

  function placeCan(c) {
    c.el.style.transform = 'translate(' + (c.x - c.tipX) + 'px,' + (c.y - c.tipY) + 'px)';
  }

  /* ---------- rendering a bed from its water level ---------- */

  function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }

  // Small to big, smoothly, the whole time it's being watered.
  function renderBed(bed) {
    var w = bed.water;
    var s = 0.22 + 0.78 * easeOut(w);
    bed.inner.style.transform = 'scale(' + s + ')';
    bed.wet.setAttribute('opacity', (w * 0.42).toFixed(3));
    bed.gaugeFill.setAttribute('y', (52 - 50 * w).toFixed(1));
  }

  function water(bed, dt) {
    if (bed.ripe) return;
    var before = bed.water;
    bed.water = Math.min(1, bed.water + dt / bed.need);
    renderBed(bed);
    // happy to be watered: it wiggles as long as water is landing
    bed.happyUntil = Date.now() + 220;

    for (var i = 0; i < MARKS.length; i++) {
      if (before < MARKS[i] && bed.water >= MARKS[i]) {
        ToddlAudio.flowerNote(i + 2, true);
        if (window.ToddlFlow) ToddlFlow.extend();
      }
    }
    if (bed.water >= 1) ripen(bed);
  }

  function ripen(bed) {
    bed.ripe = true;
    ripeCount++;
    bed.number = ripeCount;
    bed.plant.classList.add('is-ripe');
    bed.gauge.classList.add('is-full');
    boing(bed);
    sparkle(bed);
    ToddlAudio.place();
    ToddlAudio.say(NUMBER_WORDS[ripeCount - 1], { interrupt: true });
    later(function () { if (stage) ToddlAudio.say(bed.crop.name, { interrupt: true }); }, 1000);

    var num = document.createElement('div');
    num.className = 'g-num';
    num.textContent = String(ripeCount);
    num.style.left = bed.x + 'px';
    var fs = Math.max(22, geo.H * 0.09);
    num.style.fontSize = fs + 'px';
    num.style.top = Math.max(fs, plantTop(bed) - fs * 1.15) + 'px';
    layer.appendChild(num);

    if (window.ToddlFlow) ToddlFlow.extend();
    if (ripeCount === BEDS) later(finale, 1200);
  }

  // Where the crop's picture currently ends, in stage px.
  function plantTop(bed) {
    var bottom = geo.soilTop + geo.bh * 0.3;
    return bottom - bed.fullH * (0.22 + 0.78 * easeOut(bed.water));
  }

  function boing(bed) {
    bed.plant.classList.remove('is-boing');
    void bed.plant.offsetWidth;
    bed.plant.classList.add('is-boing');
  }

  function sparkle(bed) {
    var top = (plantTop(bed) + geo.soilTop) / 2;
    for (var i = 0; i < 7; i++) {
      var sp = document.createElement('span');
      sp.className = 'g-spark';
      sp.style.left = (bed.x + (Math.random() - 0.5) * geo.bw * 0.9) + 'px';
      sp.style.top = (top + (Math.random() - 0.5) * (geo.soilTop - plantTop(bed)) * 0.9) + 'px';
      sp.style.animationDelay = (i * 0.06) + 's';
      layer.appendChild(sp);
      later((function (el) { return function () { if (el.parentNode) el.parentNode.removeChild(el); }; })(sp), 1300);
    }
  }

  function finale() {
    if (!stage) return;
    done = true;
    ToddlAudio.chime();
    beds.forEach(function (bed, i) {
      later(function () { if (stage) { boing(bed); ToddlAudio.flowerNote(i + 2, true); } }, 300 + i * 140);
    });
    armEnd();
  }

  function touched() {
    lastTouchAt = Date.now();
    if (!done || leaving) return;
    endTouches++;
    armEnd();
    if (endTouches >= END_BUDGET) { leaving = true; later(moveOn, 1800); }
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

  /* ---------- the watering can ---------- */

  function onDown(e) {
    if (!e.isPrimary || !can) return;
    e.preventDefault();
    pointerId = e.pointerId;
    var p = stageXY(e);
    can.tx = p.x; can.ty = p.y + 16;
    can.held = true;
    can.el.classList.remove('is-idle', 'is-glow');
    lastTouchAt = Date.now();
    if (done) touched();
  }

  function onMove(e) {
    if (e.pointerId !== pointerId || !can || !can.held) return;
    var p = stageXY(e);
    can.tx = p.x; can.ty = p.y + 16;
  }

  function onUp(e) {
    if (e.pointerId !== pointerId || !can) return;
    pointerId = null;
    can.held = false;
    can.el.classList.add('is-idle');
    stopPour();
  }

  function startPour() {
    if (can.pouring) return;
    can.pouring = true;
    can.el.classList.add('is-pouring');
    ToddlAudio.pourStart();
  }

  function stopPour() {
    if (!can.pouring) return;
    can.pouring = false;
    can.el.classList.remove('is-pouring');
    ToddlAudio.pourStop();
  }

  function bedUnder(x) {
    for (var i = 0; i < beds.length; i++) {
      if (Math.abs(x - beds[i].x) < geo.bw * 0.5) return beds[i];
    }
    return null;
  }

  function spawnDrop(x, y, landY) {
    var d = document.createElement('span');
    d.className = 'g-drop';
    var fall = Math.max(12, landY - y);
    d.style.left = (x + (Math.random() - 0.5) * 8) + 'px';
    d.style.top = y + 'px';
    d.style.setProperty('--fall', fall + 'px');
    var dur = 0.22 + fall / 900;
    d.style.animationDuration = dur + 's';
    layer.appendChild(d);
    later((function (el) { return function () { if (el.parentNode) el.parentNode.removeChild(el); }; })(d), dur * 1000 + 40);
  }

  function splash(x, y) {
    var s = document.createElement('span');
    s.className = 'g-splash';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    layer.appendChild(s);
    later(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 420);
  }

  function tick(t) {
    if (!lastT) lastT = t;
    var dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    if (!can) { rafId = window.requestAnimationFrame(tick); return; }

    // the can flies to the finger, then follows it closely
    var k = can.held ? 0.3 : 0.08;
    can.x += (can.tx - can.x) * k;
    can.y += (can.ty - can.y) * k;
    placeCan(can);

    if (can.held) {
      var near = Math.abs(can.x - can.tx) < 8 && Math.abs(can.y - can.ty) < 8;
      if (near) startPour(); else stopPour();
    }

    if (can.pouring) {
      // the water lands straight below the spout, on the soil line
      var landY = Math.max(can.y + 14, geo.soilTop + geo.bh * 0.3);
      var bed = bedUnder(can.x);
      if (bed) water(bed, dt);
      var now = Date.now();
      if (now - lastDropAt > DROP_EVERY_MS) {
        lastDropAt = now;
        spawnDrop(can.x, can.y, landY);
        if (Math.random() < 0.35) splash(can.x + (Math.random() - 0.5) * 10, landY);
      }
    }

    var nowMs = Date.now();
    for (var bi = 0; bi < beds.length; bi++) {
      var happy = nowMs < beds[bi].happyUntil;
      if (happy !== beds[bi].plant.classList.contains('is-happy')) {
        beds[bi].plant.classList.toggle('is-happy', happy);
      }
    }

    // a quiet garden: the can glows again as a gentle nudge
    if (!can.held && !can.el.classList.contains('is-glow') && Date.now() - lastTouchAt > 6000) {
      can.el.classList.add('is-glow');
    }
    rafId = window.requestAnimationFrame(tick);
  }

  /* ---------- season dressing ---------- */

  function dressSeason() {
    stage.dataset.season = season;
    var sc = SCENES[season];
    ToddlScenery.build(stage, { sun: sc.sun, clouds: sc.clouds, cloudTint: sc.cloudTint, hills: sc.hills });
    if (sc.flakes) {
      var fl = document.createElement('div');
      fl.className = 'g-flakes';
      for (var i = 0; i < 9; i++) {
        var f = document.createElement('span');
        f.className = 'g-flake g-flake-' + sc.flakes;
        f.style.left = (Math.random() * 100) + '%';
        var dur = 9 + Math.random() * 8;
        f.style.animationDuration = dur + 's, ' + (2.5 + Math.random() * 2) + 's';
        f.style.animationDelay = (-Math.random() * dur) + 's, ' + (-Math.random() * 3) + 's';
        f.style.setProperty('--size', (6 + Math.random() * 7) + 'px');
        fl.appendChild(f);
      }
      stage.appendChild(fl);
    }
    var title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = season.charAt(0).toUpperCase() + season.slice(1);
    stage.appendChild(title);
    later(function () { if (title.parentNode) title.parentNode.removeChild(title); }, 3200);
    later(function () { if (stage) ToddlAudio.say(season); }, 600);
  }

  /* ---------- lifecycle ---------- */

  function restart() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (endTimer) { window.clearTimeout(endTimer); endTimer = null; }
    pointerId = null;
    lastTouchAt = Date.now();
    layoutGarden();
  }

  function start(stageEl) {
    stage = stageEl;
    stage.innerHTML = '';
    season = SEASONS[seasonIndex % SEASONS.length];
    seasonIndex++;
    dressSeason();
    layer = document.createElement('div');
    layer.className = 'g-layer';
    stage.appendChild(layer);
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    lastT = 0;
    window.requestAnimationFrame(function () { if (stage) restart(); });
    rafId = window.requestAnimationFrame(tick);
  }

  function stop() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
    if (endTimer) { window.clearTimeout(endTimer); endTimer = null; }
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    ToddlAudio.pourStop();
    if (stage) {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      delete stage.dataset.season;
      stage.innerHTML = '';
    }
    stage = null;
    layer = null;
    beds = [];
    can = null;
    pointerId = null;
  }

  window.ToddlGarden = { start: start, stop: stop };
})();
