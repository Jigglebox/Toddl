/* ============================================================
   Bubbles — large iridescent soap bubbles drift up a soft
   morning sky, each carrying a familiar object. Tap one: it
   pops with a ripple and a few tiny droplets, and the object
   springs free with its written + spoken name.

   Montessori notes:
     - one action (tap), immediate visible cause-and-effect
     - real-world vocabulary, one word at a time
     - at most 4 bubbles on screen, moving on slow compound
       sway paths the child's eyes can track and predict
   ============================================================ */

(function () {
  'use strict';

  var THEMES = [
    { emoji: '\u{1F436}', word: 'dog' },
    { emoji: '\u{1F431}', word: 'cat' },
    { emoji: '\u{1F425}', word: 'bird' },
    { emoji: '\u{1F41F}', word: 'fish' },
    { emoji: '\u{1F422}', word: 'turtle' },
    { emoji: '\u{1F34E}', word: 'apple' },
    { emoji: '\u{1F34C}', word: 'banana' },
    { emoji: '\u{1F353}', word: 'strawberry' },
    { emoji: '\u{1F33C}', word: 'flower' },
    { emoji: '\u{1F333}', word: 'tree' },
    { emoji: '\u{2B50}',  word: 'star' },
    { emoji: '\u{1F319}', word: 'moon' },
    { emoji: '\u{1F697}', word: 'car' },
    { emoji: '\u{1F6A2}', word: 'boat' },
    { emoji: '\u{1F9F8}', word: 'teddy bear' },
    { emoji: '\u{26BD}',  word: 'ball' }
  ];

  var MAX_BUBBLES = 7;
  var SPAWN_EVERY_MS = 1500;
  var POPS_PER_VISIT = 8;    // after this many pops, flow to the next game

  var stage = null;
  var layer = null;      // bubbles render above the scenery
  var bubbles = [];
  var rafId = null;
  var spawnTimer = null;
  var flowTimer = null;
  var lastTime = 0;
  var themeBag = [];
  var popCount = 0;
  var galaxyOn = false;
  var galaxyEl = null;
  var cometTimer = null;

  // Deal themes from a shuffled bag so vocabulary rotates evenly.
  function nextTheme() {
    if (themeBag.length === 0) {
      themeBag = THEMES.slice();
      for (var i = themeBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = themeBag[i]; themeBag[i] = themeBag[j]; themeBag[j] = tmp;
      }
    }
    return themeBag.pop();
  }

  // yFactor (0..1) places a bubble mid-screen; omitted = below the bottom
  // edge. The first few bubbles seed on-screen so play can start instantly.
  // Soft pastel tints wash over the soap film so every bubble is its
  // own color. rgba strings keep the glassy highlights underneath.
  var BUBBLE_TINTS = [
    'rgba(230, 140, 170, 0.45)',   // rose
    'rgba(120, 170, 235, 0.45)',   // sky blue
    'rgba(140, 210, 160, 0.42)',   // mint
    'rgba(240, 200, 110, 0.45)',   // gold
    'rgba(190, 150, 240, 0.45)',   // violet
    'rgba(130, 210, 220, 0.42)',   // aqua
    'rgba(255, 255, 255, 0.0)'     // classic clear
  ];

  function spawnBubble(yFactor) {
    if (!stage || bubbles.length >= MAX_BUBBLES) return;

    var rect = stage.getBoundingClientRect();
    // A real mix of sizes: little ones, big slow ones.
    var size = Math.round(Math.min(rect.width, rect.height) * (0.18 + Math.random() * 0.20));
    size = Math.max(size, 84);   // never smaller than a comfortable toddler target

    var theme = nextTheme();
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    if (galaxyOn) el.classList.add('is-space');

    var tint = BUBBLE_TINTS[Math.floor(Math.random() * BUBBLE_TINTS.length)];
    var tintEl = document.createElement('div');
    tintEl.className = 'bubble-tint';
    tintEl.style.background =
      'radial-gradient(circle at 62% 68%, transparent 30%, ' + tint + ' 90%)';
    el.appendChild(tintEl);

    var content = document.createElement('div');
    content.className = 'bubble-content';
    content.style.fontSize = Math.round(size * 0.46) + 'px';
    content.textContent = theme.emoji;
    el.appendChild(content);

    var bubble = {
      el: el,
      theme: theme,
      size: size,
      x: 20 + Math.random() * (rect.width - size - 40),
      y: typeof yFactor === 'number'
        ? (rect.height - size) * yFactor
        : rect.height + size,
      speed: 16 + Math.random() * 9,           // px per second — very slow
      // Two stacked sine sways at different frequencies read as a
      // natural wander instead of a metronome wiggle.
      swayPhase1: Math.random() * Math.PI * 2,
      swayPhase2: Math.random() * Math.PI * 2,
      swayAmp1: 10 + Math.random() * 10,
      swayAmp2: 4 + Math.random() * 5,
      breathePhase: Math.random() * Math.PI * 2,
      popped: false
    };

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      popBubble(bubble);
    });

    layer.appendChild(el);
    render(bubble, 0);
    bubbles.push(bubble);
  }

  function render(bubble, t) {
    var sway = Math.sin(bubble.swayPhase1 + t * 0.00042) * bubble.swayAmp1 +
               Math.sin(bubble.swayPhase2 + t * 0.00113) * bubble.swayAmp2;
    bubble.el.style.transform =
      'translate(' + (bubble.x + sway) + 'px,' + bubble.y + 'px)';
    if (!bubble.popped) {
      // Films breathe: a barely-there pulse in size keeps them alive.
      bubble.el.style.scale = String(1 + Math.sin(bubble.breathePhase + t * 0.0011) * 0.018);
    }
  }

  function popBubble(bubble) {
    if (bubble.popped) return;
    bubble.popped = true;

    ToddlAudio.pop();
    ToddlAudio.say(bubble.theme.word);

    bubble.el.style.scale = '';
    bubble.el.classList.add('is-popping');

    var cx = bubble.x + bubble.size / 2;
    var cy = bubble.y + bubble.size / 2;

    // Ripple ring where the film burst
    var ring = document.createElement('div');
    ring.className = 'pop-ring';
    ring.style.width = bubble.size + 'px';
    ring.style.height = bubble.size + 'px';
    ring.style.left = bubble.x + 'px';
    ring.style.top = bubble.y + 'px';
    layer.appendChild(ring);
    window.setTimeout(function () { remove(ring); }, 950);

    // The bubble bursts into a handful of tiny bubbles that scatter
    // and tumble all the way down to the ground.
    var rect = stage.getBoundingClientRect();
    var minis = 9 + Math.floor(Math.random() * 5);
    for (var i = 0; i < minis; i++) {
      var m = document.createElement('div');
      m.className = 'mini-bubble';
      var ms = 8 + Math.random() * Math.max(10, bubble.size * 0.16);
      m.style.width = ms + 'px';
      m.style.height = ms + 'px';
      m.style.left = (cx - ms / 2 + (Math.random() - 0.5) * bubble.size * 0.5) + 'px';
      m.style.top = (cy - ms / 2 + (Math.random() - 0.5) * bubble.size * 0.3) + 'px';
      var fall = rect.height - cy + 20;
      m.style.setProperty('--dx', ((Math.random() - 0.5) * bubble.size * 1.6) + 'px');
      m.style.setProperty('--fall', fall + 'px');
      m.style.setProperty('--rot', (Math.random() * 240 - 120) + 'deg');
      var dur = 1.1 + Math.random() * 0.9;
      m.style.animationDuration = dur + 's';
      m.style.animationDelay = (Math.random() * 0.12) + 's';
      layer.appendChild(m);
      window.setTimeout(remove.bind(null, m), (dur + 0.3) * 1000);
    }

    // The object springs free with its name
    var reveal = document.createElement('div');
    reveal.className = 'pop-reveal';
    var emoji = document.createElement('div');
    emoji.className = 'pop-reveal-emoji';
    emoji.style.fontSize = Math.round(bubble.size * 0.5) + 'px';
    emoji.textContent = bubble.theme.emoji;
    var word = document.createElement('div');
    word.className = 'pop-reveal-word';
    word.style.fontSize = Math.max(18, Math.round(bubble.size * 0.16)) + 'px';
    word.textContent = bubble.theme.word;
    reveal.appendChild(emoji);
    reveal.appendChild(word);
    reveal.style.left = (bubble.x + bubble.size * 0.12) + 'px';
    reveal.style.top = (bubble.y + bubble.size * 0.15) + 'px';
    layer.appendChild(reveal);

    window.setTimeout(function () { remove(bubble.el); }, 550);
    window.setTimeout(function () { remove(reveal); }, 2500);

    var idx = bubbles.indexOf(bubble);
    if (idx !== -1) bubbles.splice(idx, 1);

    // A fresh bubble drifts in almost immediately — the sky never empties.
    window.setTimeout(function () { spawnBubble(); }, 500);

    // Popping the moon turns the whole sky into a swirling galaxy night.
    if (bubble.theme.word === 'moon') enterGalaxy();

    // Enough popping for one visit — let the reveal finish, then
    // drift on to the next activity.
    popCount++;
    if (popCount >= POPS_PER_VISIT && !flowTimer && window.ToddlFlow) {
      flowTimer = window.setTimeout(function () { ToddlFlow.next(); }, 1600);
    }
  }

  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  /* ---------- Galaxy night: a 360° window into space ----------
     Popping the moon bubble opens a spherical night sky built from
     real JWST photography, split across four depth layers that pan
     at different rates as the view moves — far stars crawl, the
     nebula band glides, near wisps sweep past — so the sky pops out
     in real parallax 3D. The gyroscope (via ToddlMotion) drives the
     view: turn the phone to look anywhere — full 360° around and
     ~±60° up and down into more nebula above and below. */

  var pano = {
    dispW: 0,                 // one full 360° in display px
    dispH: 0,                 // full vertical field (~2.6 screens)
    extraY: 0,
    pxPerRad: 0,
    pxPerRadY: 0,
    layers: [],               // { el, f } — f is the parallax rate
    midLayer: null,
    // smoothed / target master pan
    x: 0, y: 0, targetX: 0, targetY: 0,
    azBase: null,             // gyro azimuth when the galaxy opened
    manualAz: 0, manualEl: 0, // drag-to-look state (no-gyro fallback)
    dragging: false,
    dragLastX: 0, dragLastY: 0,
    lastInputAt: 0,
    sensorLive: false
  };

  /* ----- building the layered sky ----- */

  function makeLayer(f, period) {
    var el = document.createElement('div');
    el.className = 'gx-depth';
    pano.layers.push({ el: el, f: f, period: period });
    return el;
  }

  function addImg(parent, file, x, y, w, opts) {
    opts = opts || {};
    var img = document.createElement('img');
    img.className = 'gx-photo';
    img.src = 'img/galaxy/' + file;
    img.decoding = 'async';
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    img.style.width = w + 'px';
    var t = '';
    if (opts.flip) t += ' scaleX(-1)';
    if (opts.rot) t += ' rotate(' + opts.rot + 'deg)';
    if (t) img.style.transform = t;
    if (img.complete) img.classList.add('is-ready');
    else img.onload = function () { img.classList.add('is-ready'); };
    parent.appendChild(img);
    return img;
  }

  function enterGalaxy() {
    if (galaxyOn || !stage) return;
    galaxyOn = true;

    ToddlAudio.nightChime();

    var rect = stage.getBoundingClientRect();
    pano.dispW = Math.round(rect.width * 4);        // 4 screens = 360°
    pano.dispH = Math.round(rect.height * 2.6);     // tall: look up & down
    pano.extraY = pano.dispH - rect.height;
    pano.pxPerRad = pano.dispW / (Math.PI * 2);
    pano.pxPerRadY = (pano.extraY / 2) / 1.05;      // ±60° of tilt
    pano.layers = [];

    galaxyEl = document.createElement('div');
    galaxyEl.className = 'galaxy';

    var W = pano.dispW, H = pano.dispH;

    // --- Layer 0 (deepest): Webb's First Deep Field — thousands of
    // real galaxies as the backdrop, mirror-tiled for a seamless wrap,
    // crawling slowest of all ---
    var dfw = Math.round(H * (1568 / 1600));
    var starsLayer = makeLayer(0.72, dfw * 2);
    var dfTiles = Math.ceil((dfw * 2 + rect.width) / dfw) + 1;
    for (var di = 0; di < dfTiles; di++) {
      var df = addImg(starsLayer, 'deepfield.jpg', di * dfw, 0, dfw,
        { flip: di % 2 === 1 });
      df.style.height = H + 'px';
    }

    // --- Layer 1: vast blurred nebula haze filling the whole sphere.
    // Mirror-tiled (A, flipped A, A, …) at natural aspect; its wrap
    // period is one mirror pair. ---
    var hw = Math.round(H * (2048 / 1440));
    var hazeLayer = makeLayer(0.85, hw * 2);
    var hazeTiles = Math.ceil((hw * 2 + rect.width) / hw) + 1;
    for (var hi = 0; hi < hazeTiles; hi++) {
      addImg(hazeLayer, 'haze.webp', hi * hw, 0, hw, { flip: hi % 2 === 1 })
        .style.height = H + 'px';
    }

    // --- Layer 2: the main nebula band — the four JWST vistas plus
    // bridging wisps between them, one continuous cloud complex ---
    var midLayer = makeLayer(1.0, W);
    pano.midLayer = midLayer;
    var photos = [
      { file: 'carina.webp',    at: 0.125, h: 0.42, aspect: 2589 / 1500 },
      { file: 'tarantula.webp', at: 0.375, h: 0.44, aspect: 2593 / 1500 },
      { file: 'quintet.webp',   at: 0.625, h: 0.36, aspect: 1461 / 1400 },
      { file: 'ring.webp',      at: 0.875, h: 0.33, aspect: 1396 / 1300 }
    ];
    var bridges = [
      { file: 'wisp-b.webp', at: 0.0,   h: 0.26, aspect: 760 / 537, flip: true,  rot: 8,   dy: -0.06 },
      { file: 'wisp-a.webp', at: 0.25,  h: 0.28, aspect: 760 / 524, flip: false, rot: -6,  dy: 0.05 },
      { file: 'wisp-b.webp', at: 0.5,   h: 0.27, aspect: 760 / 537, flip: false, rot: 174, dy: 0.04 },
      { file: 'wisp-a.webp', at: 0.75,  h: 0.26, aspect: 760 / 524, flip: true,  rot: 186, dy: -0.05 },
      // vertical reach: wisps above and below the band
      { file: 'wisp-c.webp', at: 0.18,  h: 0.2,  aspect: 760 / 766, flip: false, rot: 24,  dy: -0.3 },
      { file: 'wisp-d.webp', at: 0.55,  h: 0.2,  aspect: 760 / 705, flip: true,  rot: -18, dy: 0.3 },
      { file: 'wisp-d.webp', at: 0.3,   h: 0.18, aspect: 760 / 705, flip: false, rot: 150, dy: 0.28 },
      { file: 'wisp-c.webp', at: 0.8,   h: 0.19, aspect: 760 / 766, flip: true,  rot: -140, dy: -0.28 }
    ];
    function placeMid(spec, shift) {
      var h = H * spec.h;
      var w = h * spec.aspect;
      var cy = H * (0.5 + (spec.dy || 0));
      var img = addImg(midLayer, spec.file,
        W * spec.at - w / 2 + shift, cy - h / 2, w,
        { flip: spec.flip, rot: spec.rot });
      img.style.height = h + 'px';
    }
    for (var pi = 0; pi < photos.length; pi++) {
      placeMid(photos[pi], 0);
      placeMid(photos[pi], W);
    }
    for (var bi2 = 0; bi2 < bridges.length; bi2++) {
      placeMid(bridges[bi2], 0);
      placeMid(bridges[bi2], W);
    }

    // moon + twinkling stars ride the mid layer
    var moon = addOverlay(midLayer, 'gx-moon', W * 0.125 + rect.width * 0.34,
      H * 0.30);
    moon.textContent = '\u{1F319}';
    for (var i = 0; i < 34; i++) {
      var tx = Math.random() * W;
      var ty = Math.random() * H;
      makeTwinkle(midLayer, tx, ty);
      makeTwinkle(midLayer, tx + W, ty);
    }

    // --- Layer 3 (nearest): crisp wisps that sweep past fastest —
    // the "you could touch it" layer ---
    var nearLayer = makeLayer(1.18, W);
    var nears = [
      { file: 'wisp-a.webp', at: 0.06, h: 0.34, aspect: 760 / 524, flip: false, rot: -10, dy: 0.18 },
      { file: 'wisp-b.webp', at: 0.32, h: 0.36, aspect: 760 / 537, flip: true,  rot: 12,  dy: -0.16 },
      { file: 'wisp-c.webp', at: 0.56, h: 0.3,  aspect: 760 / 766, flip: false, rot: -20, dy: 0.2 },
      { file: 'wisp-a.webp', at: 0.7,  h: 0.32, aspect: 760 / 524, flip: true,  rot: 168, dy: -0.2 },
      { file: 'wisp-d.webp', at: 0.9,  h: 0.3,  aspect: 760 / 705, flip: false, rot: 14,  dy: 0.16 }
    ];
    function placeNear(spec, shift) {
      var h = H * spec.h;
      var w = h * spec.aspect;
      var cy = H * (0.5 + spec.dy);
      var img = addImg(nearLayer, spec.file,
        W * spec.at - w / 2 + shift, cy - h / 2, w,
        { flip: spec.flip, rot: spec.rot });
      img.style.height = h + 'px';
      img.classList.add('gx-near');
    }
    for (var ni = 0; ni < nears.length; ni++) {
      placeNear(nears[ni], 0);
      placeNear(nears[ni], W);
    }

    for (var li = 0; li < pano.layers.length; li++) {
      galaxyEl.appendChild(pano.layers[li].el);
    }

    // The galaxy sits above the day scenery, below the bubbles.
    stage.insertBefore(galaxyEl, layer);

    // Start the view centered on the Carina vista.
    var motionNow = window.ToddlMotion ? ToddlMotion.get() : { azimuth: 0 };
    pano.azBase = motionNow.azimuth;
    pano.manualAz = 0;
    pano.manualEl = 0;
    pano.targetX = W * 0.125 - rect.width / 2 + W;   // keep positive
    pano.targetY = pano.extraY / 2;
    pano.x = pano.targetX;
    pano.y = pano.targetY;
    pano.lastInputAt = 0;
    pano.sensorLive = false;

    // Every bubble suits up: tiny astronaut helmets for the void.
    for (var bl = 0; bl < bubbles.length; bl++) {
      bubbles[bl].el.classList.add('is-space');
    }

    // The music-box gives way to something vast and slow.
    ToddlAudio.setNightMode(true);

    // A special moment deserves a full stretch of night play.
    popCount = 0;
    if (window.ToddlFlow && ToddlFlow.extend) ToddlFlow.extend();

    cometTimer = window.setInterval(spawnComet, 6500);
    window.setTimeout(spawnComet, 2200);

    startParallax();
  }

  function addOverlay(parent, className, x, y) {
    var el = document.createElement('div');
    el.className = className;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    parent.appendChild(el);
    return el;
  }

  function makeTwinkle(parent, x, y) {
    var star = document.createElement('div');
    star.className = 'gx-star';
    var s = 2 + Math.random() * 3;
    star.style.width = s + 'px';
    star.style.height = s + 'px';
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    star.style.setProperty('--tw', (2 + Math.random() * 4) + 's');
    star.style.animationDelay = (-Math.random() * 6) + 's';
    var kind = Math.random();
    if (kind < 0.25) star.classList.add('gx-star-bright');
    else if (kind < 0.5) star.classList.add('gx-star-warm');
    else if (kind < 0.75) star.classList.add('gx-star-cool');
    parent.appendChild(star);
  }

  function spawnComet() {
    if (!galaxyEl) return;
    var comet = document.createElement('div');
    comet.className = 'gx-comet';
    comet.style.left = (30 + Math.random() * 60) + '%';
    comet.style.top = (5 + Math.random() * 35) + '%';
    galaxyEl.appendChild(comet);
    window.setTimeout(function () { remove(comet); }, 1800);
  }

  /* ----- drag-to-look fallback (only when no gyroscope) ----- */

  function panoPointerDown(e) {
    if (pano.sensorLive) return;
    pano.dragging = true;
    pano.dragLastX = e.clientX;
    pano.dragLastY = e.clientY;
  }

  function panoPointerMove(e) {
    if (!pano.dragging || pano.sensorLive) return;
    pano.manualAz += (e.clientX - pano.dragLastX) * -1.4 / pano.pxPerRad;
    pano.manualEl += (e.clientY - pano.dragLastY) * 1.2 / pano.pxPerRadY;
    pano.manualEl = Math.max(-1.05, Math.min(1.05, pano.manualEl));
    pano.dragLastX = e.clientX;
    pano.dragLastY = e.clientY;
    pano.lastInputAt = Date.now();
  }

  function panoPointerUp() {
    pano.dragging = false;
  }

  function startParallax() {
    // Ask again from this gesture in case the first request was missed.
    if (window.ToddlMotion) ToddlMotion.request();
    stage.addEventListener('pointerdown', panoPointerDown);
    stage.addEventListener('pointermove', panoPointerMove);
    stage.addEventListener('pointerup', panoPointerUp);
    stage.addEventListener('pointercancel', panoPointerUp);
  }

  function stopParallax() {
    if (stage) {
      stage.removeEventListener('pointerdown', panoPointerDown);
      stage.removeEventListener('pointermove', panoPointerMove);
      stage.removeEventListener('pointerup', panoPointerUp);
      stage.removeEventListener('pointercancel', panoPointerUp);
    }
    pano.layers = [];
    pano.midLayer = null;
    pano.dragging = false;
  }

  // Called every frame while the galaxy is up.
  function renderPano(t, dt) {
    if (!pano.layers.length) return;

    var az, el;
    var m = window.ToddlMotion ? ToddlMotion.get() : { active: false };
    if (m.active) {
      // The phone is the window: turn it, the sky answers.
      pano.sensorLive = true;
      az = m.azimuth - pano.azBase;
      el = m.elevation;
    } else {
      // No gyroscope: finger-look, and a slow self-turn when idle.
      if (!pano.dragging && Date.now() - pano.lastInputAt > 4000) {
        pano.manualAz += dt * (Math.PI * 2) / 240;
      }
      az = pano.manualAz;
      el = pano.manualEl;
    }

    // Home vista center minus half a screen lands at 0; keep positive
    // with a +dispW bias, then add the live view angle.
    pano.targetX = pano.dispW + az * pano.pxPerRad;
    pano.targetY = Math.max(0, Math.min(pano.extraY,
      pano.extraY / 2 - el * pano.pxPerRadY));

    pano.x += (pano.targetX - pano.x) * 0.09;
    pano.y += (pano.targetY - pano.y) * 0.09;

    // Per-layer parallax: each depth pans at its own rate; every
    // layer's content repeats with period dispW, so wrap per layer.
    for (var i = 0; i < pano.layers.length; i++) {
      var L = pano.layers[i];
      var period = L.period || pano.dispW;
      var lx = (pano.x * L.f) % period;
      if (lx < 0) lx += period;
      var ly = pano.y * L.f + (pano.extraY * (1 - L.f)) / 2;
      L.el.style.transform =
        'translate3d(' + (-lx) + 'px,' + (-ly) + 'px,0)';
    }
  }

  function tick(t) {
    if (!lastTime) lastTime = t;
    var dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;

    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.y -= b.speed * dt;
      if (b.y < -b.size * 1.5) {
        // Drifted off the top unpopped — quietly recycle it.
        remove(b.el);
        bubbles.splice(i, 1);
      } else {
        render(b, t);
      }
    }
    if (galaxyOn) renderPano(t, dt);
    rafId = window.requestAnimationFrame(tick);
  }

  function start(stageEl) {
    stage = stageEl;
    stage.innerHTML = '';
    ToddlScenery.build(stage, {
      sun: { x: '80%', y: '14%', size: '30vmin',
             color: 'rgba(250, 246, 239, 0.95)', halo: 'rgba(236, 217, 160, 0.30)' },
      clouds: 3,
      cloudTint: 0.65,
      shimmer: true
    });
    layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    stage.appendChild(layer);

    bubbles = [];
    lastTime = 0;
    popCount = 0;
    ['carina.webp', 'tarantula.webp', 'quintet.webp', 'ring.webp',
     'haze.webp', 'wisp-a.webp', 'wisp-b.webp', 'wisp-c.webp',
     'wisp-d.webp', 'deepfield.jpg'].forEach(function (name) {
      new Image().src = 'img/galaxy/' + name;
    });
    spawnBubble(0.12);
    spawnBubble(0.32);
    spawnBubble(0.52);
    spawnBubble(0.72);
    spawnBubble(0.92);
    spawnTimer = window.setInterval(function () { spawnBubble(); }, SPAWN_EVERY_MS);
    rafId = window.requestAnimationFrame(tick);
  }

  function stop() {
    if (spawnTimer) { window.clearInterval(spawnTimer); spawnTimer = null; }
    if (flowTimer) { window.clearTimeout(flowTimer); flowTimer = null; }
    if (cometTimer) { window.clearInterval(cometTimer); cometTimer = null; }
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    ToddlAudio.setNightMode(false);
    stopParallax();
    if (stage) stage.innerHTML = '';
    bubbles = [];
    stage = null;
    layer = null;
    galaxyEl = null;
    galaxyOn = false;
  }

  window.ToddlBubbles = { start: start, stop: stop };
})();
