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
     slowly counter-rotating spiral nebula, dozens of twinkling
     stars, a glowing moon, and the occasional shooting star. The
     bubbles keep drifting through it, lit against the dark. */

  function enterGalaxy() {
    if (galaxyOn || !stage) return;
    galaxyOn = true;

    ToddlAudio.nightChime();

    galaxyEl = document.createElement('div');
    galaxyEl.className = 'galaxy';

    var swirlA = document.createElement('div');
    swirlA.className = 'gx-swirl gx-swirl-a';
    galaxyEl.appendChild(swirlA);
    var swirlB = document.createElement('div');
    swirlB.className = 'gx-swirl gx-swirl-b';
    galaxyEl.appendChild(swirlB);

    var core = document.createElement('div');
    core.className = 'gx-core';
    galaxyEl.appendChild(core);

    for (var i = 0; i < 60; i++) {
      var star = document.createElement('div');
      star.className = 'gx-star';
      var s = 1.5 + Math.random() * 2.8;
      star.style.width = s + 'px';
      star.style.height = s + 'px';
      star.style.left = (Math.random() * 100) + '%';
      star.style.top = (Math.random() * 100) + '%';
      star.style.setProperty('--tw', (2 + Math.random() * 4) + 's');
      star.style.animationDelay = (-Math.random() * 6) + 's';
      if (Math.random() < 0.15) star.classList.add('gx-star-bright');
      galaxyEl.appendChild(star);
    }

    var moon = document.createElement('div');
    moon.className = 'gx-moon';
    moon.textContent = '\u{1F319}';
    galaxyEl.appendChild(moon);

    // The galaxy sits above the day scenery, below the bubbles.
    stage.insertBefore(galaxyEl, layer);

    // A special moment deserves a full stretch of night play.
    popCount = 0;
    if (window.ToddlFlow && ToddlFlow.extend) ToddlFlow.extend();

    cometTimer = window.setInterval(spawnComet, 6500);
    window.setTimeout(spawnComet, 2200);
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
    if (stage) stage.innerHTML = '';
    bubbles = [];
    stage = null;
    layer = null;
    galaxyEl = null;
    galaxyOn = false;
  }

  window.ToddlBubbles = { start: start, stop: stop };
})();
