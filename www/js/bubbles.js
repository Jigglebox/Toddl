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
  function spawnBubble(yFactor) {
    if (!stage || bubbles.length >= MAX_BUBBLES) return;

    var rect = stage.getBoundingClientRect();
    var size = Math.round(Math.min(rect.width, rect.height) * (0.24 + Math.random() * 0.10));
    size = Math.max(size, 96);   // never smaller than a comfortable toddler target

    var theme = nextTheme();
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.width = size + 'px';
    el.style.height = size + 'px';

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

    // A few soap droplets scatter and fall
    var drops = 5 + Math.floor(Math.random() * 3);
    for (var i = 0; i < drops; i++) {
      var angle = (i / drops) * Math.PI * 2 + Math.random() * 0.7;
      var dist = bubble.size * (0.5 + Math.random() * 0.45);
      var d = document.createElement('div');
      d.className = 'pop-droplet';
      var ds = 6 + Math.random() * 8;
      d.style.width = ds + 'px';
      d.style.height = ds + 'px';
      d.style.left = (cx - ds / 2) + 'px';
      d.style.top = (cy - ds / 2) + 'px';
      d.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      d.style.setProperty('--dy', (Math.sin(angle) * dist * 0.6 + bubble.size * 0.35) + 'px');
      layer.appendChild(d);
      window.setTimeout(remove.bind(null, d), 900);
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

  /* ---------- Galaxy night ----------
     Popping the moon bubble melts the day sky into deep space: a
     fiery ring nebula swirling around a dark void with a blazing
     star at its heart, built from parallax layers. Tilting the
     phone (or moving a finger) shifts the layers at different
     depths, so it feels like looking around inside the galaxy. */

  var gxLayers = null;      // { stars, far, near, core }
  var parallax = {
    x: 0, y: 0,             // smoothed position actually rendered
    tx: 0, ty: 0,           // target from sensor / pointer
    baseBeta: null, baseGamma: null,
    hasSensor: false
  };

  function makeCloud(parent, opts) {
    var cloud = document.createElement('div');
    cloud.className = 'gx-cloud';
    cloud.style.width = opts.w + 'vmax';
    cloud.style.height = opts.h + 'vmax';
    // Center-relative: works both inside the 0-size rings (50% = 0)
    // and when placed directly on a full-size layer.
    cloud.style.left = 'calc(50% + ' + opts.x + 'vmax)';
    cloud.style.top = 'calc(46% + ' + opts.y + 'vmax)';
    cloud.style.background = 'radial-gradient(closest-side, ' +
      opts.inner + ' 0%, ' + opts.outer + ' 55%, transparent 100%)';
    cloud.style.transform = 'translate(-50%, -50%) rotate(' + opts.rot + 'deg)';
    cloud.style.opacity = opts.opacity;
    parent.appendChild(cloud);
  }

  // A ring of stretched luminous clouds around the void. Tangential
  // rotation makes overlapping blobs read as swirling arms of gas.
  function buildRing(ring, radius, palette, scale) {
    var n = palette.length;
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var r = radius * (0.85 + Math.random() * 0.35);
      makeCloud(ring, {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        w: (26 + Math.random() * 16) * scale,
        h: (10 + Math.random() * 6) * scale,
        rot: angle * 180 / Math.PI + 90 + (Math.random() * 24 - 12),
        inner: palette[i][0],
        outer: palette[i][1],
        opacity: 0.75 + Math.random() * 0.25
      });
    }
  }

  function enterGalaxy() {
    if (galaxyOn || !stage) return;
    galaxyOn = true;

    ToddlAudio.nightChime();

    galaxyEl = document.createElement('div');
    galaxyEl.className = 'galaxy';

    gxLayers = {
      stars: document.createElement('div'),
      far: document.createElement('div'),
      near: document.createElement('div'),
      core: document.createElement('div')
    };
    gxLayers.stars.className = 'gx-layer';
    gxLayers.far.className = 'gx-layer';
    gxLayers.near.className = 'gx-layer';
    gxLayers.core.className = 'gx-layer';

    // --- Star field (deepest layer) ---
    for (var i = 0; i < 80; i++) {
      var star = document.createElement('div');
      star.className = 'gx-star';
      var s = 1.5 + Math.random() * 2.8;
      star.style.width = s + 'px';
      star.style.height = s + 'px';
      star.style.left = (Math.random() * 100) + '%';
      star.style.top = (Math.random() * 100) + '%';
      star.style.setProperty('--tw', (2 + Math.random() * 4) + 's');
      star.style.animationDelay = (-Math.random() * 6) + 's';
      var kind = Math.random();
      if (kind < 0.12) star.classList.add('gx-star-bright');
      else if (kind < 0.24) star.classList.add('gx-star-warm');
      else if (kind < 0.36) star.classList.add('gx-star-cool');
      gxLayers.stars.appendChild(star);
    }

    // --- Far layer: cool outer arms + corner dust like deep space ---
    var ringB = document.createElement('div');
    ringB.className = 'gx-ring gx-ring-b';
    buildRing(ringB, 30, [
      ['rgba(56, 168, 190, 0.50)', 'rgba(38, 110, 150, 0.22)'],
      ['rgba(90, 110, 205, 0.42)', 'rgba(60, 70, 160, 0.18)'],
      ['rgba(150, 80, 190, 0.38)', 'rgba(100, 50, 150, 0.16)'],
      ['rgba(66, 150, 200, 0.35)', 'rgba(40, 90, 150, 0.15)'],
      ['rgba(180, 100, 170, 0.32)', 'rgba(120, 60, 130, 0.14)']
    ], 1.35);
    gxLayers.far.appendChild(ringB);
    // Big slow dust banks in the corners
    makeCloud(gxLayers.far, {
      x: -34, y: 26, w: 60, h: 34, rot: -18, opacity: 0.8,
      inner: 'rgba(196, 110, 60, 0.30)', outer: 'rgba(120, 60, 50, 0.12)'
    });
    makeCloud(gxLayers.far, {
      x: -30, y: -26, w: 52, h: 30, rot: 22, opacity: 0.75,
      inner: 'rgba(60, 180, 190, 0.26)', outer: 'rgba(40, 110, 140, 0.10)'
    });

    // --- Near layer: the fiery ring itself ---
    var ringA = document.createElement('div');
    ringA.className = 'gx-ring';
    buildRing(ringA, 21, [
      ['rgba(255, 150, 70, 0.85)', 'rgba(214, 90, 50, 0.35)'],
      ['rgba(232, 90, 70, 0.80)', 'rgba(170, 50, 60, 0.32)'],
      ['rgba(255, 196, 110, 0.80)', 'rgba(220, 130, 60, 0.32)'],
      ['rgba(214, 70, 110, 0.70)', 'rgba(150, 40, 90, 0.28)'],
      ['rgba(255, 130, 60, 0.80)', 'rgba(200, 80, 40, 0.32)'],
      ['rgba(240, 110, 80, 0.75)', 'rgba(180, 60, 60, 0.30)'],
      ['rgba(255, 170, 90, 0.78)', 'rgba(210, 110, 50, 0.30)']
    ], 1);
    // Small white-hot clouds hugging the void's edge: the burning
    // inner rim that makes the dark heart read as a hole in fire.
    buildRing(ringA, 12.5, [
      ['rgba(255, 222, 160, 0.85)', 'rgba(255, 150, 80, 0.30)'],
      ['rgba(255, 200, 130, 0.80)', 'rgba(230, 120, 60, 0.28)'],
      ['rgba(255, 235, 190, 0.75)', 'rgba(255, 170, 90, 0.26)'],
      ['rgba(255, 190, 110, 0.80)', 'rgba(220, 110, 50, 0.28)']
    ], 0.55);
    gxLayers.near.appendChild(ringA);

    // --- Core layer: the void, the blazing star, the moon ---
    var voidEl = document.createElement('div');
    voidEl.className = 'gx-void';
    gxLayers.core.appendChild(voidEl);
    var sunglow = document.createElement('div');
    sunglow.className = 'gx-sunglow';
    gxLayers.core.appendChild(sunglow);
    var sun = document.createElement('div');
    sun.className = 'gx-sun';
    gxLayers.core.appendChild(sun);
    var moon = document.createElement('div');
    moon.className = 'gx-moon';
    moon.textContent = '\u{1F319}';
    gxLayers.core.appendChild(moon);

    galaxyEl.appendChild(gxLayers.stars);
    galaxyEl.appendChild(gxLayers.far);
    galaxyEl.appendChild(gxLayers.near);
    galaxyEl.appendChild(gxLayers.core);

    // The galaxy sits above the day scenery, below the bubbles.
    stage.insertBefore(galaxyEl, layer);

    // A special moment deserves a full stretch of night play.
    popCount = 0;
    if (window.ToddlFlow && ToddlFlow.extend) ToddlFlow.extend();

    cometTimer = window.setInterval(spawnComet, 6500);
    window.setTimeout(spawnComet, 2200);

    startParallax();
  }

  function spawnComet() {
    if (!gxLayers) return;
    var comet = document.createElement('div');
    comet.className = 'gx-comet';
    comet.style.left = (30 + Math.random() * 60) + '%';
    comet.style.top = (5 + Math.random() * 35) + '%';
    gxLayers.stars.appendChild(comet);
    window.setTimeout(function () { remove(comet); }, 1800);
  }

  /* ---------- Parallax: look around the galaxy ---------- */

  function clampUnit(v) {
    return Math.max(-1, Math.min(1, v));
  }

  function handleOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    parallax.hasSensor = true;

    // Map device tilt into screen axes, accounting for landscape.
    var angle = 0;
    if (window.screen && window.screen.orientation &&
        typeof window.screen.orientation.angle === 'number') {
      angle = window.screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
      angle = window.orientation;
    }
    var sx, sy;
    if (angle === 90)       { sx = e.beta;   sy = -e.gamma; }
    else if (angle === -90 || angle === 270) { sx = -e.beta; sy = e.gamma; }
    else if (angle === 180) { sx = -e.gamma; sy = -e.beta; }
    else                    { sx = e.gamma;  sy = e.beta; }

    // The angle the phone is held at right now is "center".
    if (parallax.baseBeta === null) {
      parallax.baseBeta = sy;
      parallax.baseGamma = sx;
    }
    // Slowly re-center so an odd resting angle recovers over time.
    parallax.baseGamma += (sx - parallax.baseGamma) * 0.002;
    parallax.baseBeta += (sy - parallax.baseBeta) * 0.002;

    parallax.tx = clampUnit((sx - parallax.baseGamma) / 22);
    parallax.ty = clampUnit((sy - parallax.baseBeta) / 22);
  }

  function handlePointerParallax(e) {
    if (parallax.hasSensor || !stage) return;   // real tilt wins
    var rect = stage.getBoundingClientRect();
    parallax.tx = clampUnit((e.clientX / rect.width - 0.5) * 1.6);
    parallax.ty = clampUnit((e.clientY / rect.height - 0.5) * 1.6);
  }

  function startParallax() {
    parallax.x = 0; parallax.y = 0;
    parallax.tx = 0; parallax.ty = 0;
    parallax.baseBeta = null; parallax.baseGamma = null;
    parallax.hasSensor = false;

    // iOS requires an explicit permission request from a user gesture —
    // and the moon pop that opened the galaxy is exactly that gesture.
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }).catch(function () { /* fall back to pointer parallax */ });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (e) { /* fall back to pointer parallax */ }

    stage.addEventListener('pointermove', handlePointerParallax);
  }

  function stopParallax() {
    window.removeEventListener('deviceorientation', handleOrientation);
    if (stage) stage.removeEventListener('pointermove', handlePointerParallax);
  }

  // Called every frame from tick() while the galaxy is up. Layers
  // translate by different amounts — depth you can feel — plus a slow
  // automatic drift so the sky feels dimensional even untouched.
  function renderParallax(t) {
    if (!gxLayers) return;
    parallax.x += (parallax.tx - parallax.x) * 0.055;
    parallax.y += (parallax.ty - parallax.y) * 0.055;

    var driftX = Math.sin(t * 0.00006) * 0.18;
    var driftY = Math.cos(t * 0.000043) * 0.14;
    var px = parallax.x + driftX;
    var py = parallax.y + driftY;

    gxLayers.stars.style.transform =
      'translate3d(' + (px * 8) + 'px,' + (py * 6) + 'px,0)';
    gxLayers.far.style.transform =
      'translate3d(' + (px * 20) + 'px,' + (py * 15) + 'px,0)';
    gxLayers.near.style.transform =
      'translate3d(' + (px * 36) + 'px,' + (py * 27) + 'px,0)';
    gxLayers.core.style.transform =
      'translate3d(' + (px * 52) + 'px,' + (py * 38) + 'px,0)';
  }

  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
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
    if (galaxyOn) renderParallax(t);
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
    stopParallax();
    if (stage) stage.innerHTML = '';
    bubbles = [];
    stage = null;
    layer = null;
    galaxyEl = null;
    gxLayers = null;
    galaxyOn = false;
  }

  window.ToddlBubbles = { start: start, stop: stop };
})();
