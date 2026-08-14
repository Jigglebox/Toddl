/* ============================================================
   Colors — a sorting tray. Two glazed bowls, each a different
   muted color, and a small scatter of matching balls that bob
   gently in place. The child drags each ball into the bowl of
   the same color; the bowl gives a happy little wobble.

   Montessori notes:
     - two categories only (classic first sorting work)
     - color is the single isolated property (all items are
       the same simple ball shape)
     - self-correcting: the wrong bowl just lets the ball
       drift back out — nothing buzzes or flashes
   ============================================================ */

(function () {
  'use strict';

  var COLORS = [
    { name: 'red',    fill: '#d99a90', edge: '#c07d72', deep: '#b06a60' },
    { name: 'blue',   fill: '#93aec9', edge: '#7492ad', deep: '#64829d' },
    { name: 'yellow', fill: '#e3cd8c', edge: '#c9ad5e', deep: '#b99d4e' },
    { name: 'green',  fill: '#a3bd8e', edge: '#87a371', deep: '#779361' }
  ];

  var ITEMS_PER_COLOR = 2;
  var ROUNDS_PER_VISIT = 2;   // after this many sorts, flow to the next game
  var uid = 0;

  var stage = null;
  var layer = null;
  var bowls = [];
  var items = [];
  var roundTimer = null;
  var roundsDone = 0;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  // A glazed ceramic bowl: back rim, body with vertical shading,
  // bright front rim, and a soft inner shadow that gives it depth.
  function makeBowlSvg(color, width) {
    var id = 'bowl' + (uid++);
    var svg = svgEl('svg', { viewBox: '0 0 100 62', width: width });
    svg.style.overflow = 'visible';

    var defs = svgEl('defs', {});
    var grad = svgEl('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color.fill }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color.deep }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Inside of the bowl, visible above the front lip
    svg.appendChild(svgEl('ellipse', {
      cx: 50, cy: 10, rx: 46, ry: 9, fill: color.deep, opacity: 0.85
    }));
    // Body
    svg.appendChild(svgEl('path', {
      d: 'M4 10 L96 10 A46 46 0 0 1 50 58 A46 46 0 0 1 4 10 Z',
      fill: 'url(#' + id + 'g)',
      stroke: color.edge, 'stroke-width': 2.5, 'stroke-linejoin': 'round'
    }));
    // Front lip highlight
    svg.appendChild(svgEl('path', {
      d: 'M4 10 A46 9 0 0 0 96 10 A46 12 0 0 1 4 10 Z',
      fill: 'rgba(255,255,255,0.30)'
    }));
    // Soft sheen on the belly
    svg.appendChild(svgEl('ellipse', {
      cx: 32, cy: 30, rx: 12, ry: 16, fill: 'rgba(255,255,255,0.18)',
      transform: 'rotate(-24 32 30)'
    }));
    return svg;
  }

  function makeBallSvg(color, size) {
    var id = 'ball' + (uid++);
    var svg = svgEl('svg', { viewBox: '0 0 100 100', width: size, height: size });
    var defs = svgEl('defs', {});
    var grad = svgEl('radialGradient', { id: id + 'g', cx: '36%', cy: '30%', r: '75%' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.9 }));
    grad.appendChild(svgEl('stop', { offset: '28%', 'stop-color': color.fill }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color.deep }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('circle', {
      cx: 50, cy: 50, r: 44, fill: 'url(#' + id + 'g)',
      stroke: color.edge, 'stroke-width': 3
    }));
    return svg;
  }

  function layoutRound() {
    var rect = stage.getBoundingClientRect();
    layer.innerHTML = '';
    bowls = [];
    items = [];

    var pair = shuffle(COLORS.slice()).slice(0, 2);
    // Cap by height too so bowls never spill off short landscape screens.
    var bowlWidth = Math.min(rect.width * 0.34, 220, rect.height * 0.42);
    var bowlY = rect.height * 0.72;

    pair.forEach(function (color, idx) {
      var x = rect.width * (idx === 0 ? 0.28 : 0.72);
      var el = document.createElement('div');
      el.className = 'color-bowl';
      el.dataset.color = color.name;
      el.style.left = x + 'px';
      el.style.top = bowlY + 'px';
      el.style.width = bowlWidth + 'px';
      el.appendChild(makeBowlSvg(color, bowlWidth));
      layer.appendChild(el);
      bowls.push({ color: color, el: el, x: x, y: bowlY + bowlWidth * 0.18, width: bowlWidth });
    });

    var ballSize = Math.max(64, Math.min(rect.width, rect.height) * 0.14);
    var spots = [];
    pair.forEach(function (color) {
      for (var i = 0; i < ITEMS_PER_COLOR; i++) spots.push(color);
    });
    shuffle(spots);

    spots.forEach(function (color, idx) {
      var cols = spots.length;
      var x = rect.width * ((idx + 1) / (cols + 1));
      var y = rect.height * (0.22 + (idx % 2) * 0.14);
      var el = document.createElement('div');
      el.className = 'color-item';
      el.dataset.color = color.name;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      var inner = document.createElement('div');
      inner.className = 'ball-inner';
      inner.appendChild(makeBallSvg(color, ballSize));
      el.appendChild(inner);
      layer.appendChild(el);
      var item = { color: color, el: el, homeX: x, homeY: y, size: ballSize, sorted: false };
      attachDrag(item);
      items.push(item);
    });
  }

  function bowlAt(x, y) {
    for (var i = 0; i < bowls.length; i++) {
      var b = bowls[i];
      var dx = x - b.x;
      var dy = y - b.y;
      if (Math.abs(dx) < b.width * 0.55 && Math.abs(dy) < b.width * 0.45) return b;
    }
    return null;
  }

  function attachDrag(item) {
    var el = item.el;
    var dragging = false;
    var offsetX = 0, offsetY = 0;

    el.addEventListener('pointerdown', function (e) {
      if (item.sorted) return;
      e.preventDefault();
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.remove('is-returning');
      el.classList.add('is-dragging');
      var rect = stage.getBoundingClientRect();
      offsetX = (e.clientX - rect.left) - parseFloat(el.style.left);
      offsetY = (e.clientY - rect.top) - parseFloat(el.style.top);
      ToddlAudio.tap();
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = stage.getBoundingClientRect();
      el.style.left = ((e.clientX - rect.left) - offsetX) + 'px';
      el.style.top = ((e.clientY - rect.top) - offsetY) + 'px';
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');

      var x = parseFloat(el.style.left);
      var y = parseFloat(el.style.top);
      var bowl = bowlAt(x, y);

      if (bowl && bowl.color.name === item.color.name) {
        item.sorted = true;
        el.classList.add('is-sinking');
        el.style.left = bowl.x + 'px';
        el.style.top = (bowl.y + item.size * 0.1) + 'px';
        // The bowl wobbles happily as it catches the ball.
        bowl.el.classList.remove('is-catching');
        void bowl.el.offsetWidth;         // restart the animation
        bowl.el.classList.add('is-catching');
        ToddlAudio.place();
        ToddlAudio.say(item.color.name);
        checkRound();
      } else {
        el.classList.add('is-returning');
        el.style.left = item.homeX + 'px';
        el.style.top = item.homeY + 'px';
        if (bowl) ToddlAudio.drift();   // wrong bowl: just a soft slide home
      }
    }

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  function checkRound() {
    var done = items.every(function (i) { return i.sorted; });
    if (!done) return;
    ToddlAudio.chime();
    roundsDone++;
    roundTimer = window.setTimeout(function () {
      if (!stage) return;
      if (roundsDone >= ROUNDS_PER_VISIT && window.ToddlFlow) {
        ToddlFlow.next();
        return;
      }
      layoutRound();
    }, 1600);
  }

  function start(stageEl) {
    stage = stageEl;
    stage.innerHTML = '';
    roundsDone = 0;
    ToddlScenery.build(stage, {
      sun: { x: '84%', y: '10%', size: '22vmin',
             color: 'rgba(236, 217, 160, 0.5)', halo: 'rgba(236, 217, 160, 0.2)' },
      clouds: 2,
      cloudTint: 0.5,
      hills: { front: 'rgba(230, 184, 176, 0.22)', back: 'rgba(236, 217, 160, 0.20)',
               height: '14%' }
    });
    layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    stage.appendChild(layer);
    window.requestAnimationFrame(layoutRound);
  }

  function stop() {
    if (roundTimer) { window.clearTimeout(roundTimer); roundTimer = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    layer = null;
    bowls = [];
    items = [];
  }

  window.ToddlColors = { start: start, stop: stop };
})();
