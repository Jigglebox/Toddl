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

  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  /* ---------- Galaxy night: a 360° window into space ----------
     Popping the moon bubble opens a full panoramic skybox painted
     onto a canvas: the fiery ring nebula is only one of four vistas
     — turn the phone and towering magenta pillars, a cyan veil with
     a blazing star cluster, and a distant spiral galaxy wheel past.
     Device orientation is converted to a true view direction
     (azimuth + elevation), so the sky pans exactly opposite the
     phone's motion and wraps seamlessly through 360°. Saturated
     color composited additively over true black — deep space, not
     a pastel painting. */

  var PANO_W = 4096;          // canvas texture size
  var PANO_H = 1408;

  var pano = {
    windowEl: null,           // the panning wrapper
    dispW: 0,                 // displayed strip width (one full 360°)
    dispH: 0,
    extraY: 0,                // vertical pan range in px
    pxPerRad: 0,
    pxPerRadY: 0,
    // continuous (unwrapped) pan targets and smoothed values
    targetX: 0, targetY: 0,
    x: 0, y: 0,
    lastAz: null,
    hasSensor: false,
    dragging: false,
    dragLastX: 0, dragLastY: 0,
    lastInputAt: 0
  };

  /* ----- painting helpers (additive over black) ----- */

  function paintCloud(ctx, x, y, rx, ry, rot, stops) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(rx, ry);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintStar(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintFlare(ctx, x, y, len, alpha) {
    var g = ctx.createLinearGradient(x - len, y, x + len, y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,250,235,' + alpha + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - len, y - 1, len * 2, 2);
    var g2 = ctx.createLinearGradient(x, y - len * 0.55, x, y + len * 0.55);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.5, 'rgba(255,250,235,' + alpha + ')');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x - 1, y - len * 0.55, 2, len * 1.1);
  }

  function paintPanorama(ctx) {
    var W = PANO_W, H = PANO_H;

    // True black space with the faintest cold undertone
    ctx.fillStyle = '#010004';
    ctx.fillRect(0, 0, W, H);

    // Vast dim ambient patches so the black has body
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < 9; i++) {
      paintCloud(ctx, Math.random() * W, Math.random() * H,
        420 + Math.random() * 480, 260 + Math.random() * 260,
        Math.random() * Math.PI,
        [[0, 'rgba(24, 14, 58, 0.5)'], [1, 'rgba(0,0,0,0)']]);
    }

    // Everything luminous is additive from here on
    ctx.globalCompositeOperation = 'lighter';

    // A faint milky band ties the whole sphere together
    for (i = 0; i < 34; i++) {
      var bx = (i / 34) * W + Math.random() * 120;
      var by = H * 0.52 + Math.sin(i * 0.9) * H * 0.05 + (Math.random() - 0.5) * 60;
      paintCloud(ctx, bx, by, 260 + Math.random() * 200, 60 + Math.random() * 40,
        (Math.random() - 0.5) * 0.3,
        [[0, 'rgba(150, 170, 255, 0.07)'], [0.6, 'rgba(120, 130, 220, 0.04)'],
         [1, 'rgba(0,0,0,0)']]);
    }

    // ===== Vista 1 (12.5%): the fiery ring around the void =====
    var hx = W * 0.125, hy = H * 0.46;
    var ringR = H * 0.30;
    // Dense overlapping gas: dozens of small clouds stacking additively
    // read as continuous turbulent nebula, not separate blobs.
    var firePalette = [
      'rgba(255, 120, 30, A)', 'rgba(255, 40, 60, A)',
      'rgba(255, 200, 80, A)', 'rgba(255, 50, 160, A)',
      'rgba(230, 60, 90, A)', 'rgba(200, 60, 200, A)'
    ];
    // soft luminous bed under the gas so the ring glows from within
    paintCloud(ctx, hx, hy, ringR * 1.7, ringR * 1.25, 0,
      [[0, 'rgba(0,0,0,0)'], [0.45, 'rgba(255, 90, 60, 0.10)'],
       [0.72, 'rgba(255, 140, 60, 0.16)'], [1, 'rgba(0,0,0,0)']]);
    for (i = 0; i < 110; i++) {
      var a = Math.random() * Math.PI * 2;
      var rr = ringR * (0.72 + Math.random() * 0.55);
      var col = firePalette[Math.floor(Math.random() * firePalette.length)]
        .replace('A', (0.22 + Math.random() * 0.26).toFixed(2));
      paintCloud(ctx,
        hx + Math.cos(a) * rr + (Math.random() - 0.5) * 60,
        hy + Math.sin(a) * rr * 0.8 + (Math.random() - 0.5) * 40,
        60 + Math.random() * 110, 30 + Math.random() * 40,
        a + Math.PI / 2 + (Math.random() - 0.5) * 0.6,
        [[0, col], [1, 'rgba(0,0,0,0)']]);
    }
    // white-hot inner rim: fine bright wisps hugging the void
    for (i = 0; i < 40; i++) {
      a = Math.random() * Math.PI * 2;
      rr = ringR * (0.5 + Math.random() * 0.14);
      paintCloud(ctx,
        hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.8,
        36 + Math.random() * 40, 14 + Math.random() * 14,
        a + Math.PI / 2 + (Math.random() - 0.5) * 0.4,
        [[0, 'rgba(255, 226, 170, ' + (0.2 + Math.random() * 0.22).toFixed(2) + ')'],
         [1, 'rgba(0,0,0,0)']]);
    }
    // the dark void inside the ring
    ctx.globalCompositeOperation = 'source-over';
    paintCloud(ctx, hx, hy, ringR * 0.62, ringR * 0.52, 0,
      [[0, 'rgba(1, 0, 5, 0.94)'], [0.7, 'rgba(1, 0, 5, 0.55)'], [1, 'rgba(0,0,0,0)']]);
    ctx.globalCompositeOperation = 'lighter';
    // blazing heart
    paintStar(ctx, hx, hy, 120, 'rgba(255, 170, 90, 0.55)');
    paintStar(ctx, hx, hy, 34, 'rgba(255, 235, 200, 0.95)');
    paintStar(ctx, hx, hy, 10, 'rgba(255, 255, 250, 1)');
    paintFlare(ctx, hx, hy, 300, 0.7);

    // ===== Vista 2 (37.5%): towering magenta-purple pillars =====
    var px = W * 0.375, py = H * 0.52;
    paintCloud(ctx, px, py, 520, 360, 0,
      [[0, 'rgba(110, 30, 200, 0.30)'], [1, 'rgba(0,0,0,0)']]);
    var pillars = [
      { dx: -170, h: 400, w: 95,  c1: 'rgba(200, 50, 255, 0.55)', c2: 'rgba(110, 20, 210, 0.25)' },
      { dx: 30,   h: 520, w: 120, c1: 'rgba(255, 50, 200, 0.60)', c2: 'rgba(150, 30, 220, 0.28)' },
      { dx: 220,  h: 340, w: 85,  c1: 'rgba(170, 60, 255, 0.50)', c2: 'rgba(90, 30, 190, 0.24)' }
    ];
    for (i = 0; i < pillars.length; i++) {
      var p = pillars[i];
      // dense stacked wisps build a towering turbulent column
      for (var s = 0; s < 16; s++) {
        var f = s / 15;
        paintCloud(ctx, px + p.dx + (Math.random() - 0.5) * p.w * 0.7,
          py + p.h * 0.35 - p.h * f + (Math.random() - 0.5) * 30,
          p.w * (0.75 - f * 0.3) * (0.7 + Math.random() * 0.6),
          p.w * (0.5 - f * 0.15) * (0.7 + Math.random() * 0.6),
          (Math.random() - 0.5) * 0.8,
          [[0, p.c1.replace(/[\d.]+\)$/, (0.18 + Math.random() * 0.2).toFixed(2) + ')')],
           [0.6, p.c2], [1, 'rgba(0,0,0,0)']]);
      }
      // glowing crown where stars are being born
      paintStar(ctx, px + p.dx, py + p.h * 0.35 - p.h, 60, 'rgba(255, 220, 255, 0.5)');
      paintStar(ctx, px + p.dx, py + p.h * 0.35 - p.h, 16, 'rgba(255, 245, 255, 0.95)');
      // cyan rim light on one flank
      paintCloud(ctx, px + p.dx + p.w * 0.7, py + p.h * 0.1, 34, p.h * 0.32, 0.1,
        [[0, 'rgba(0, 220, 255, 0.30)'], [1, 'rgba(0,0,0,0)']]);
    }

    // ===== Vista 3 (62.5%): cyan veil + blazing star cluster =====
    var vx = W * 0.625, vy = H * 0.44;
    for (i = 0; i < 6; i++) {
      paintCloud(ctx, vx + (Math.random() - 0.5) * 700, vy + (Math.random() - 0.5) * 380,
        380 + Math.random() * 220, 90 + Math.random() * 70,
        (Math.random() - 0.5) * 0.5,
        [[0, 'rgba(0, 200, 255, 0.22)'], [0.6, 'rgba(40, 120, 230, 0.12)'],
         [1, 'rgba(0,0,0,0)']]);
    }
    paintCloud(ctx, vx + 180, vy - 40, 300, 160, -0.3,
      [[0, 'rgba(60, 255, 220, 0.16)'], [1, 'rgba(0,0,0,0)']]);
    // the cluster: dozens of tight diamonds around a burning core
    paintStar(ctx, vx + 60, vy + 20, 190, 'rgba(140, 230, 255, 0.30)');
    for (i = 0; i < 70; i++) {
      var ca = Math.random() * Math.PI * 2;
      var cr = Math.pow(Math.random(), 0.6) * 190;
      paintStar(ctx, vx + 60 + Math.cos(ca) * cr, vy + 20 + Math.sin(ca) * cr * 0.75,
        1.5 + Math.random() * 3.5,
        Math.random() < 0.7 ? 'rgba(230, 250, 255, 0.95)' : 'rgba(170, 220, 255, 0.9)');
    }
    paintStar(ctx, vx + 60, vy + 20, 26, 'rgba(240, 255, 255, 0.95)');
    paintFlare(ctx, vx + 60, vy + 20, 200, 0.55);

    // ===== Vista 4 (87.5%): a distant spiral galaxy, tilted =====
    var gx = W * 0.875, gy = H * 0.42;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(-0.5);
    ctx.scale(1, 0.42);
    paintStar(ctx, 0, 0, 200, 'rgba(255, 220, 180, 0.35)');
    paintStar(ctx, 0, 0, 60, 'rgba(255, 240, 220, 0.8)');
    for (var arm = 0; arm < 2; arm++) {
      for (i = 0; i < 26; i++) {
        var th = i * 0.24 + arm * Math.PI;
        var rad = 40 + i * 13;
        var cc = i % 3 === 0 ? 'rgba(255, 150, 200, 0.35)'
               : (i % 3 === 1 ? 'rgba(160, 190, 255, 0.38)' : 'rgba(220, 230, 255, 0.35)');
        paintCloud(ctx, Math.cos(th) * rad, Math.sin(th) * rad,
          46 + i * 2.2, 26 + i * 1.1, th + Math.PI / 2,
          [[0, cc], [1, 'rgba(0,0,0,0)']]);
      }
    }
    ctx.restore();
    // sparse deep field around it
    for (i = 0; i < 40; i++) {
      paintStar(ctx, gx + (Math.random() - 0.5) * 900, gy + (Math.random() - 0.5) * 700,
        0.8 + Math.random() * 1.6, 'rgba(220, 230, 255, 0.7)');
    }

    // ===== The whole sphere: stars everywhere =====
    for (i = 0; i < 900; i++) {
      var sx = Math.random() * W, sy = Math.random() * H;
      var sr = 0.5 + Math.pow(Math.random(), 2.2) * 1.9;
      var pick = Math.random();
      var col = pick < 0.6 ? 'rgba(255, 255, 255, 0.9)'
              : pick < 0.8 ? 'rgba(188, 216, 255, 0.9)'
              : pick < 0.95 ? 'rgba(255, 217, 168, 0.9)'
              : 'rgba(255, 180, 220, 0.9)';
      paintStar(ctx, sx, sy, sr, col);
    }
    // heroes: big glowing stars, a few with flares
    for (i = 0; i < 26; i++) {
      sx = Math.random() * W; sy = Math.random() * H;
      paintStar(ctx, sx, sy, 5 + Math.random() * 9, 'rgba(200, 225, 255, 0.55)');
      paintStar(ctx, sx, sy, 2, 'rgba(255, 255, 255, 1)');
      if (i < 8) paintFlare(ctx, sx, sy, 40 + Math.random() * 70, 0.5);
    }

    // Rich vignette top and bottom so the blacks stay deep
    ctx.globalCompositeOperation = 'source-over';
    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(0, 0, 2, 0.55)');
    vg.addColorStop(0.2, 'rgba(0,0,0,0)');
    vg.addColorStop(0.8, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0, 0, 2, 0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ----- building the 360° window ----- */

  function enterGalaxy() {
    if (galaxyOn || !stage) return;
    galaxyOn = true;

    ToddlAudio.nightChime();

    var rect = stage.getBoundingClientRect();
    pano.dispW = Math.round(rect.width * 4);       // 4 screens = full 360°
    pano.dispH = Math.round(rect.height * 1.45);
    pano.extraY = pano.dispH - rect.height;
    pano.pxPerRad = pano.dispW / (Math.PI * 2);
    pano.pxPerRadY = pano.extraY / 0.9;            // ~±26° of usable tilt

    galaxyEl = document.createElement('div');
    galaxyEl.className = 'galaxy';

    var win = document.createElement('div');
    win.className = 'gx-window';
    win.style.width = (pano.dispW * 2) + 'px';
    win.style.height = pano.dispH + 'px';
    pano.windowEl = win;

    // Paint the sky once, show it twice for a seamless wrap
    var canvas = document.createElement('canvas');
    canvas.width = PANO_W;
    canvas.height = PANO_H;
    paintPanorama(canvas.getContext('2d'));
    canvas.style.cssText = 'position:absolute;left:0;top:0;' +
      'width:' + pano.dispW + 'px;height:' + pano.dispH + 'px;';
    var canvasB = document.createElement('canvas');
    canvasB.width = PANO_W;
    canvasB.height = PANO_H;
    canvasB.getContext('2d').drawImage(canvas, 0, 0);
    canvasB.style.cssText = 'position:absolute;left:' + pano.dispW + 'px;top:0;' +
      'width:' + pano.dispW + 'px;height:' + pano.dispH + 'px;';
    win.appendChild(canvas);
    win.appendChild(canvasB);

    // Living overlays that pan with the sky: the breathing heart of
    // the ring vista, the moon, and twinkling stars
    var homeX = pano.dispW * 0.125;
    var homeY = pano.dispH * 0.46;
    addOverlay(win, 'gx-sunglow', homeX, homeY);
    addOverlay(win, 'gx-sun', homeX, homeY);
    var moon = addOverlay(win, 'gx-moon', homeX + rect.width * 0.34,
      pano.dispH * 0.18);
    moon.textContent = '\u{1F319}';

    for (var i = 0; i < 30; i++) {
      var tx = Math.random() * pano.dispW;
      var ty = Math.random() * pano.dispH;
      makeTwinkle(win, tx, ty);
      makeTwinkle(win, tx + pano.dispW, ty);   // copy for the wrap
    }

    galaxyEl.appendChild(win);

    // The galaxy sits above the day scenery, below the bubbles.
    stage.insertBefore(galaxyEl, layer);

    // Start the view centered on the fiery ring.
    pano.targetX = homeX - rect.width / 2 + pano.dispW;   // keep positive
    pano.targetY = pano.extraY / 2;
    pano.x = pano.targetX;
    pano.y = pano.targetY;
    pano.lastAz = null;
    pano.hasSensor = false;
    pano.lastInputAt = 0;

    // A special moment deserves a full stretch of night play.
    popCount = 0;
    if (window.ToddlFlow && ToddlFlow.extend) ToddlFlow.extend();

    cometTimer = window.setInterval(spawnComet, 6500);
    window.setTimeout(spawnComet, 2200);

    startParallax();
  }

  function addOverlay(win, className, x, y) {
    var el = document.createElement('div');
    el.className = className;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    win.appendChild(el);
    return el;
  }

  function makeTwinkle(win, x, y) {
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
    win.appendChild(star);
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

  /* ----- true view direction from device orientation ----- */

  function wrapPi(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  // W3C deviceorientation angles (Z-X'-Y'' intrinsic) → the direction
  // the user is looking (out of the back of the screen), as azimuth
  // and elevation in the world frame.
  function viewDirection(alpha, beta, gamma) {
    var d = Math.PI / 180;
    var cX = Math.cos(beta * d), sX = Math.sin(beta * d);
    var cY = Math.cos(gamma * d), sY = Math.sin(gamma * d);
    var cZ = Math.cos(alpha * d), sZ = Math.sin(alpha * d);
    // third column of R = Rz(alpha) Rx(beta) Ry(gamma): device z in world
    var zx = cY * sZ * sX + cZ * sY;
    var zy = sZ * sY - cZ * cY * sX;
    var zz = cX * cY;
    // looking direction is out of the back of the screen: -z
    var vx = -zx, vy = -zy, vz = -zz;
    return {
      az: Math.atan2(vx, vy),
      el: Math.asin(Math.max(-1, Math.min(1, vz)))
    };
  }

  function handleOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    pano.hasSensor = true;

    var view = viewDirection(e.alpha || 0, e.beta, e.gamma);

    // Accumulate azimuth continuously so 359°→0° never jumps, and
    // full turns keep going round and round.
    if (pano.lastAz === null) {
      pano.lastAz = view.az;
      pano.baseEl = view.el;
      return;
    }
    var dAz = wrapPi(view.az - pano.lastAz);
    pano.lastAz = view.az;
    // Turning the phone right pans the window right across the sky.
    pano.targetX += dAz * pano.pxPerRad;

    var relEl = view.el - pano.baseEl;
    pano.targetY = pano.extraY / 2 - relEl * pano.pxPerRadY;
    pano.targetY = Math.max(0, Math.min(pano.extraY, pano.targetY));
  }

  /* ----- drag-to-look fallback (no gyroscope) ----- */

  function panoPointerDown(e) {
    if (pano.hasSensor) return;
    pano.dragging = true;
    pano.dragLastX = e.clientX;
    pano.dragLastY = e.clientY;
  }

  function panoPointerMove(e) {
    if (!pano.dragging || pano.hasSensor) return;
    pano.targetX -= (e.clientX - pano.dragLastX) * 1.4;
    pano.targetY = Math.max(0, Math.min(pano.extraY,
      pano.targetY - (e.clientY - pano.dragLastY) * 1.4));
    pano.dragLastX = e.clientX;
    pano.dragLastY = e.clientY;
    pano.lastInputAt = Date.now();
  }

  function panoPointerUp() {
    pano.dragging = false;
  }

  function startParallax() {
    // iOS requires an explicit permission request from a user gesture —
    // and the moon pop that opened the galaxy is exactly that gesture.
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }).catch(function () { /* fall back to drag-to-look */ });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (err) { /* fall back to drag-to-look */ }

    stage.addEventListener('pointerdown', panoPointerDown);
    stage.addEventListener('pointermove', panoPointerMove);
    stage.addEventListener('pointerup', panoPointerUp);
    stage.addEventListener('pointercancel', panoPointerUp);
  }

  function stopParallax() {
    window.removeEventListener('deviceorientation', handleOrientation);
    if (stage) {
      stage.removeEventListener('pointerdown', panoPointerDown);
      stage.removeEventListener('pointermove', panoPointerMove);
      stage.removeEventListener('pointerup', panoPointerUp);
      stage.removeEventListener('pointercancel', panoPointerUp);
    }
    pano.windowEl = null;
    pano.dragging = false;
  }

  // Called every frame while the galaxy is up.
  function renderPano(t, dt) {
    if (!pano.windowEl) return;

    // With no gyroscope and no recent drag, the sky slowly revolves
    // on its own — the full 360° drifts past in about four minutes.
    if (!pano.hasSensor && !pano.dragging &&
        Date.now() - pano.lastInputAt > 4000) {
      pano.targetX += dt * pano.dispW / 240;
    }

    pano.x += (pano.targetX - pano.x) * 0.08;
    pano.y += (pano.targetY - pano.y) * 0.08;

    // Wrap both smoothed and target together so the lerp never sees
    // a seam. Keep values positive for clean modulo.
    if (pano.x > pano.dispW) {
      pano.x -= pano.dispW;
      pano.targetX -= pano.dispW;
    } else if (pano.x < 0) {
      pano.x += pano.dispW;
      pano.targetX += pano.dispW;
    }

    pano.windowEl.style.transform =
      'translate3d(' + (-pano.x) + 'px,' + (-pano.y) + 'px,0)';
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
    galaxyOn = false;
  }

  window.ToddlBubbles = { start: start, stop: stop };
})();
