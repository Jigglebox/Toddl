/* ============================================================
   Colors — a sorting tray. Two bowls, each a different muted
   color, and a small scatter of matching balls. The child
   drags each ball into the bowl of the same color.

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
    { name: 'red',    fill: '#d99a90', edge: '#c07d72' },
    { name: 'blue',   fill: '#93aec9', edge: '#7492ad' },
    { name: 'yellow', fill: '#e3cd8c', edge: '#c9ad5e' },
    { name: 'green',  fill: '#a3bd8e', edge: '#87a371' }
  ];

  var ITEMS_PER_COLOR = 3;

  var stage = null;
  var bowls = [];      // { color, el, x, y, width }
  var items = [];      // { color, el, homeX, homeY, sorted }
  var roundTimer = null;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function makeBowlSvg(color, width) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 60');
    svg.setAttribute('width', width);
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 8 L96 8 A46 46 0 0 1 50 56 A46 46 0 0 1 4 8 Z');
    path.setAttribute('fill', color.fill);
    path.setAttribute('stroke', color.edge);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  function makeBallSvg(color, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '44');
    circle.setAttribute('fill', color.fill);
    circle.setAttribute('stroke', color.edge);
    circle.setAttribute('stroke-width', '4');
    var shine = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    shine.setAttribute('cx', '36');
    shine.setAttribute('cy', '32');
    shine.setAttribute('rx', '13');
    shine.setAttribute('ry', '9');
    shine.setAttribute('fill', 'rgba(255,255,255,0.55)');
    svg.appendChild(circle);
    svg.appendChild(shine);
    return svg;
  }

  function layoutRound() {
    var rect = stage.getBoundingClientRect();
    stage.innerHTML = '';
    bowls = [];
    items = [];

    var pair = shuffle(COLORS.slice()).slice(0, 2);
    var bowlWidth = Math.min(rect.width * 0.34, 220);
    var bowlY = rect.height * 0.72;

    pair.forEach(function (color, idx) {
      var x = rect.width * (idx === 0 ? 0.28 : 0.72);
      var el = document.createElement('div');
      el.className = 'color-bowl';
      el.style.left = x + 'px';
      el.style.top = bowlY + 'px';
      el.style.width = bowlWidth + 'px';
      el.appendChild(makeBowlSvg(color, bowlWidth));
      stage.appendChild(el);
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
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.appendChild(makeBallSvg(color, ballSize));
      stage.appendChild(el);
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
    roundTimer = window.setTimeout(function () {
      if (stage) layoutRound();
    }, 2400);
  }

  function start(stageEl) {
    stage = stageEl;
    window.requestAnimationFrame(layoutRound);
  }

  function stop() {
    if (roundTimer) { window.clearTimeout(roundTimer); roundTimer = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    bowls = [];
    items = [];
  }

  window.ToddlColors = { start: start, stop: stop };
})();
