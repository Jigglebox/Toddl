/* ============================================================
   Shapes — a classic Montessori form puzzle. Three chunky
   pastel shapes sit at the bottom; matching dashed outlines
   wait above. The child drags each shape home.

   Montessori notes:
     - self-correcting: a shape only settles into its own
       outline; a miss just drifts gently back, no error sound
     - isolated difficulty: only 3 pieces per round
     - shape names are spoken on pickup and on placement
   ============================================================ */

(function () {
  'use strict';

  var SHAPES = [
    { name: 'circle',   fill: '#a8bfd4', edge: '#7f9db8' },
    { name: 'square',   fill: '#b7c9a8', edge: '#93aa81' },
    { name: 'triangle', fill: '#e6b8b0', edge: '#cf9188' },
    { name: 'star',     fill: '#ecd9a0', edge: '#d4b96a' },
    { name: 'heart',    fill: '#c5b6d4', edge: '#a08fb8' }
  ];

  var PIECES_PER_ROUND = 3;
  var ROUNDS_PER_VISIT = 2;   // after this many puzzles, flow to the next game

  var stage = null;
  var board = null;
  var round = [];        // { shape, slotEl, pieceEl, homeX, homeY, slotX, slotY, placed }
  var roundTimer = null;
  var roundsDone = 0;

  /* ---------- SVG geometry ---------- */

  function shapePath(name) {
    switch (name) {
      case 'circle':
        return 'M50 6 A44 44 0 1 1 49.9 6 Z';
      case 'square':
        return 'M12 12 H88 V88 H12 Z';
      case 'triangle':
        return 'M50 10 L92 86 L8 86 Z';
      case 'star':
        return 'M50 6 L61 38 L95 38 L68 58 L78 92 L50 71 L22 92 L32 58 L5 38 L39 38 Z';
      case 'heart':
        return 'M50 88 C20 64 8 46 8 32 C8 18 19 10 30 10 C40 10 47 16 50 24 ' +
               'C53 16 60 10 70 10 C81 10 92 18 92 32 C92 46 80 64 50 88 Z';
    }
    return '';
  }

  function makeShapeSvg(name, size, className, fill, edge) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', shapePath(name));
    path.setAttribute('class', className);
    if (fill) path.setAttribute('fill', fill);
    if (edge) {
      path.setAttribute('stroke', edge);
      path.setAttribute('stroke-width', '4');
    }
    svg.appendChild(path);
    return svg;
  }

  /* ---------- Round setup ---------- */

  function pickShapes() {
    var pool = SHAPES.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, PIECES_PER_ROUND);
  }

  function layoutRound() {
    var rect = board.getBoundingClientRect();
    var size = Math.round(Math.min(rect.width / 3.6, rect.height / 4.2));
    size = Math.max(size, 84);

    var picked = pickShapes();

    // Slots evenly spaced across the upper third; pieces across the
    // bottom in a different (shuffled) order so it isn't a 1:1 copy.
    var order = picked.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    round = picked.map(function (shape, idx) {
      var col = (idx + 1) / (PIECES_PER_ROUND + 1);
      var slotX = rect.width * col;
      var slotY = rect.height * 0.28;

      var homeIdx = order.indexOf(shape);
      var homeX = rect.width * ((homeIdx + 1) / (PIECES_PER_ROUND + 1));
      var homeY = rect.height * 0.78;

      var slotEl = document.createElement('div');
      slotEl.className = 'shape-slot';
      slotEl.style.left = slotX + 'px';
      slotEl.style.top = slotY + 'px';
      slotEl.appendChild(makeShapeSvg(shape.name, size, 'slot-outline'));
      board.appendChild(slotEl);

      var pieceEl = document.createElement('div');
      pieceEl.className = 'shape-piece';
      pieceEl.style.left = homeX + 'px';
      pieceEl.style.top = homeY + 'px';
      var pieceInner = document.createElement('div');
      pieceInner.className = 'piece-inner';
      pieceInner.appendChild(makeShapeSvg(shape.name, size, 'piece-fill', shape.fill, shape.edge));
      pieceEl.appendChild(pieceInner);
      board.appendChild(pieceEl);

      var entry = {
        shape: shape, slotEl: slotEl, pieceEl: pieceEl,
        homeX: homeX, homeY: homeY, slotX: slotX, slotY: slotY,
        size: size, placed: false
      };
      attachDrag(entry);
      return entry;
    });
  }

  /* ---------- Dragging ---------- */

  function attachDrag(entry) {
    var el = entry.pieceEl;
    var dragging = false;
    var offsetX = 0, offsetY = 0;

    el.addEventListener('pointerdown', function (e) {
      if (entry.placed) return;
      e.preventDefault();
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.remove('is-returning', 'is-snapping');
      el.classList.add('is-dragging');
      var rect = board.getBoundingClientRect();
      offsetX = (e.clientX - rect.left) - parseFloat(el.style.left);
      offsetY = (e.clientY - rect.top) - parseFloat(el.style.top);
      ToddlAudio.tap();
      ToddlAudio.say(entry.shape.name);
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = board.getBoundingClientRect();
      var x = (e.clientX - rect.left) - offsetX;
      var y = (e.clientY - rect.top) - offsetY;
      el.style.left = x + 'px';
      el.style.top = y + 'px';

      // The matching outline beckons softly as the shape gets close.
      var dx = x - entry.slotX;
      var dy = y - entry.slotY;
      var near = Math.sqrt(dx * dx + dy * dy) < entry.size * 0.9;
      entry.slotEl.classList.toggle('is-near', near);
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      entry.slotEl.classList.remove('is-near');

      var x = parseFloat(el.style.left);
      var y = parseFloat(el.style.top);
      var dx = x - entry.slotX;
      var dy = y - entry.slotY;
      var snapRadius = entry.size * 0.55;   // generous for small hands

      if (Math.sqrt(dx * dx + dy * dy) < snapRadius) {
        entry.placed = true;
        el.classList.add('is-snapping', 'is-placed');
        el.style.left = entry.slotX + 'px';
        el.style.top = entry.slotY + 'px';
        entry.slotEl.classList.add('is-filled');
        ToddlAudio.place();
        checkRound();
      } else {
        // Not home yet: drift gently back. No penalty, no harsh sound.
        el.classList.add('is-returning');
        el.style.left = entry.homeX + 'px';
        el.style.top = entry.homeY + 'px';
        ToddlAudio.drift();
      }
    }

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  /* ---------- Round completion ---------- */

  function checkRound() {
    var allPlaced = round.every(function (r) { return r.placed; });
    if (!allPlaced) return;

    ToddlAudio.chime();
    scatterStars();
    roundsDone++;

    roundTimer = window.setTimeout(function () {
      if (!board) return;
      if (roundsDone >= ROUNDS_PER_VISIT && window.ToddlFlow) {
        ToddlFlow.next();
        return;
      }
      board.innerHTML = '';
      layoutRound();
    }, 2600);
  }

  function scatterStars() {
    var rect = board.getBoundingClientRect();
    for (var i = 0; i < 5; i++) {
      var star = document.createElement('div');
      star.className = 'calm-star';
      star.style.left = (rect.width * (0.2 + Math.random() * 0.6)) + 'px';
      star.style.top = (rect.height * (0.35 + Math.random() * 0.3)) + 'px';
      star.style.animationDelay = (i * 0.18) + 's';
      star.appendChild(makeShapeSvg('star', 26 + Math.round(Math.random() * 14)));
      board.appendChild(star);
    }
  }

  /* ---------- Lifecycle ---------- */

  function start(stageEl) {
    stage = stageEl;
    stage.innerHTML = '';
    roundsDone = 0;
    ToddlScenery.build(stage, {
      sun: { x: '16%', y: '12%', size: '24vmin',
             color: 'rgba(236, 217, 160, 0.55)', halo: 'rgba(236, 217, 160, 0.22)' },
      clouds: 2,
      cloudTint: 0.55,
      hills: { front: 'rgba(183, 201, 168, 0.35)', back: 'rgba(183, 201, 168, 0.20)',
               height: '16%' }
    });
    board = document.createElement('div');
    board.className = 'shape-board';
    stage.appendChild(board);
    // Wait a frame so the board has real dimensions.
    window.requestAnimationFrame(layoutRound);
  }

  function stop() {
    if (roundTimer) { window.clearTimeout(roundTimer); roundTimer = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    board = null;
    round = [];
  }

  window.ToddlShapes = { start: start, stop: stop };
})();
