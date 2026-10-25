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

  /* kind:  bush  — stem, leaves, fruit hanging
            root  — leafy top, root pushes up out of the soil
            ground— a round crop sitting on the soil
            stalk — tall stalk with leaves, crop on top        */
  var CROPS = {
    spring: [
      { name: 'strawberry', kind: 'bush',   fruit: 'berry',   green: '#b9d08c', ripe: '#e0706c', leaf: '#8fb07a' },
      { name: 'pea',        kind: 'bush',   fruit: 'pod',     green: '#c3d79b', ripe: '#8fbf72', leaf: '#9cc188' },
      { name: 'radish',     kind: 'root',   fruit: 'round',   green: '#e9d6dc', ripe: '#e06a8c', leaf: '#93b67f' },
      { name: 'lettuce',    kind: 'ground', fruit: 'leafy',   green: '#c8dfa0', ripe: '#9fcf7a', leaf: '#8fc278' },
      { name: 'carrot',     kind: 'root',   fruit: 'taper',   green: '#f1cfa2', ripe: '#ec9544', leaf: '#86b26d' }
    ],
    summer: [
      { name: 'tomato',     kind: 'bush',   fruit: 'round',   green: '#b4d089', ripe: '#e46b55', leaf: '#86ad72' },
      { name: 'corn',       kind: 'stalk',  fruit: 'ear',     green: '#cfe09c', ripe: '#f3d35a', leaf: '#8fbd6e' },
      { name: 'watermelon', kind: 'ground', fruit: 'melon',   green: '#a9c98b', ripe: '#6fae5e', leaf: '#8ab873' },
      { name: 'blueberry',  kind: 'bush',   fruit: 'cluster', green: '#b7c9a0', ripe: '#6e7fc2', leaf: '#8fb37c' },
      { name: 'cucumber',   kind: 'bush',   fruit: 'pod',     green: '#bcd79a', ripe: '#6fa75a', leaf: '#8fbd77' }
    ],
    autumn: [
      { name: 'pumpkin',    kind: 'ground', fruit: 'pumpkin', green: '#c7cf90', ripe: '#ec9a46', leaf: '#9aab6a' },
      { name: 'apple',      kind: 'bush',   fruit: 'round',   green: '#bcd38f', ripe: '#d9605f', leaf: '#8fae6f' },
      { name: 'grapes',     kind: 'bush',   fruit: 'cluster', green: '#c2d6a1', ripe: '#9b7bc0', leaf: '#97b47a' },
      { name: 'beet',       kind: 'root',   fruit: 'round',   green: '#e3c6cf', ripe: '#b04a73', leaf: '#8fb17a' },
      { name: 'broccoli',   kind: 'stalk',  fruit: 'floret',  green: '#bfd7a3', ripe: '#6f9f5a', leaf: '#8fb77c' }
    ],
    winter: [
      { name: 'cabbage',    kind: 'ground', fruit: 'leafy',   green: '#cfe0bd', ripe: '#9cc49a', leaf: '#8fb594' },
      { name: 'orange',     kind: 'bush',   fruit: 'round',   green: '#c5d79f', ripe: '#f0a24a', leaf: '#7fa872' },
      { name: 'turnip',     kind: 'root',   fruit: 'round',   green: '#eadfe6', ripe: '#f2f0ee', leaf: '#93b687' },
      { name: 'leek',       kind: 'stalk',  fruit: 'leek',    green: '#dfe9c9', ripe: '#f4f6ec', leaf: '#8fb88a' },
      { name: 'kale',       kind: 'stalk',  fruit: 'ruffle',  green: '#bdd4ad', ripe: '#6f9d79', leaf: '#86ae82' }
    ]
  };

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
  var STAGES = [0.08, 0.3, 0.5, 0.62, 0.78, 0.9];   // growth pops
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

  // The can: 120 x 90 local units; the spout tip is at (4, 22).
  function makeCanSvg() {
    var svg = svgEl('svg', { viewBox: '0 0 120 90' });
    svg.style.overflow = 'visible';
    svg.appendChild(svgEl('path', {
      d: 'M44 30 Q44 10 65 10 Q86 10 86 30', stroke: '#8fa3b8', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M34 46 L8 18 L2 24 L30 60 Z', fill: '#9fb4c8', stroke: '#7d93a9', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }));
    svg.appendChild(svgEl('circle', { cx: 5, cy: 21, r: 7, fill: '#b7c8d8', stroke: '#7d93a9', 'stroke-width': 2 }));
    svg.appendChild(svgEl('rect', { x: 30, y: 30, width: 72, height: 55, rx: 10, fill: '#a9bfd3', stroke: '#7d93a9', 'stroke-width': 2.5 }));
    svg.appendChild(svgEl('rect', { x: 30, y: 30, width: 72, height: 12, rx: 6, fill: '#8ea6bd' }));
    svg.appendChild(svgEl('ellipse', { cx: 52, cy: 58, rx: 9, ry: 14, fill: 'rgba(255,255,255,0.28)' }));
    svg.appendChild(svgEl('path', {
      d: 'M102 42 Q116 50 102 72', stroke: '#8fa3b8', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
    }));
    return svg;
  }

  /* ---------- drawing: the crops ----------
     100 x 100 local units, ground at y = 100, centered at x = 50.
     Parts carry data-at (the water fraction that reveals them) so
     the plant can unfurl piece by piece as it is watered.        */

  function leafPath(x, y, len, angle, color, at) {
    var g = svgEl('g', { 'class': 'p-part p-leaf', 'data-at': at });
    g.style.transformOrigin = x + 'px ' + y + 'px';
    var p = svgEl('path', {
      d: 'M' + x + ' ' + y + ' q' + (len * 0.55) + ' ' + (-len * 0.22) + ' ' + len + ' ' + (-len * 0.28) +
         ' q' + (-len * 0.4) + ' ' + (len * 0.32) + ' ' + (-len) + ' ' + (len * 0.28) + ' Z',
      fill: color, transform: 'rotate(' + angle + ' ' + x + ' ' + y + ')'
    });
    g.appendChild(p);
    return g;
  }

  function fruitShapes(crop, cx, cy, r) {
    var out = [];
    function two(makeShape) {
      var greenEl = makeShape(crop.green);
      var ripeEl = makeShape(crop.ripe);
      ripeEl.setAttribute('class', 'p-ripe');
      out.push(greenEl, ripeEl);
    }
    switch (crop.fruit) {
      case 'berry':
        two(function (c) {
          return svgEl('path', {
            d: 'M' + cx + ' ' + (cy - r) + ' C' + (cx + r * 1.3) + ' ' + (cy - r) + ' ' + (cx + r * 1.1) + ' ' + (cy + r * 0.9) +
               ' ' + cx + ' ' + (cy + r * 1.25) + ' C' + (cx - r * 1.1) + ' ' + (cy + r * 0.9) + ' ' + (cx - r * 1.3) + ' ' + (cy - r) +
               ' ' + cx + ' ' + (cy - r) + ' Z', fill: c
          });
        });
        out.push(svgEl('path', { d: 'M' + (cx - r * 0.7) + ' ' + (cy - r * 0.8) + ' L' + cx + ' ' + (cy - r * 1.3) + ' L' + (cx + r * 0.7) + ' ' + (cy - r * 0.8) + ' Z', fill: crop.leaf }));
        break;
      case 'pod':
        two(function (c) {
          return svgEl('ellipse', { cx: cx, cy: cy, rx: r * 0.55, ry: r * 1.5, fill: c, transform: 'rotate(18 ' + cx + ' ' + cy + ')' });
        });
        break;
      case 'cluster':
        two(function (c) {
          var g = svgEl('g', {});
          var pts = [[0, -0.9], [-0.8, -0.2], [0.8, -0.2], [0, 0.5], [-0.5, 1.1], [0.5, 1.1]];
          for (var i = 0; i < pts.length; i++) {
            g.appendChild(svgEl('circle', { cx: cx + pts[i][0] * r * 0.8, cy: cy + pts[i][1] * r * 0.8, r: r * 0.55, fill: c }));
          }
          return g;
        });
        break;
      case 'taper':
        two(function (c) {
          return svgEl('path', {
            d: 'M' + (cx - r) + ' ' + (cy - r * 0.6) + ' Q' + cx + ' ' + (cy + r * 2.6) + ' ' + (cx + r) + ' ' + (cy - r * 0.6) +
               ' Q' + cx + ' ' + (cy - r * 1.1) + ' ' + (cx - r) + ' ' + (cy - r * 0.6) + ' Z', fill: c
          });
        });
        break;
      case 'melon':
        two(function (c) {
          var g = svgEl('g', {});
          g.appendChild(svgEl('ellipse', { cx: cx, cy: cy, rx: r * 1.3, ry: r, fill: c }));
          for (var i = -1; i <= 1; i++) {
            g.appendChild(svgEl('path', {
              d: 'M' + (cx + i * r * 0.5) + ' ' + (cy - r * 0.95) + ' q' + (r * 0.25) + ' ' + r + ' 0 ' + (r * 1.9),
              stroke: 'rgba(40,80,40,0.35)', 'stroke-width': r * 0.14, fill: 'none'
            }));
          }
          return g;
        });
        break;
      case 'pumpkin':
        two(function (c) {
          var g = svgEl('g', {});
          g.appendChild(svgEl('ellipse', { cx: cx - r * 0.75, cy: cy, rx: r * 0.7, ry: r * 0.95, fill: c }));
          g.appendChild(svgEl('ellipse', { cx: cx + r * 0.75, cy: cy, rx: r * 0.7, ry: r * 0.95, fill: c }));
          g.appendChild(svgEl('ellipse', { cx: cx, cy: cy, rx: r * 0.75, ry: r, fill: c }));
          g.appendChild(svgEl('ellipse', { cx: cx, cy: cy, rx: r * 0.3, ry: r * 0.9, fill: 'rgba(255,255,255,0.18)' }));
          return g;
        });
        out.push(svgEl('rect', { x: cx - r * 0.12, y: cy - r * 1.25, width: r * 0.24, height: r * 0.4, rx: r * 0.08, fill: '#8d9a62' }));
        break;
      case 'leafy':
        two(function (c) {
          var g = svgEl('g', {});
          for (var i = 0; i < 6; i++) {
            var a = i * 60;
            g.appendChild(svgEl('ellipse', {
              cx: cx, cy: cy - r * 0.45, rx: r * 0.5, ry: r * 0.95, fill: c,
              transform: 'rotate(' + a + ' ' + cx + ' ' + cy + ')', opacity: 0.9
            }));
          }
          g.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r * 0.6, fill: c }));
          return g;
        });
        break;
      case 'ear':
        two(function (c) {
          var g = svgEl('g', {});
          g.appendChild(svgEl('ellipse', { cx: cx, cy: cy, rx: r * 0.5, ry: r * 1.4, fill: c }));
          for (var i = -1; i <= 1; i++) {
            g.appendChild(svgEl('line', { x1: cx + i * r * 0.25, y1: cy - r * 1.1, x2: cx + i * r * 0.25, y2: cy + r * 1.1, stroke: 'rgba(120,100,40,0.25)', 'stroke-width': r * 0.08 }));
          }
          return g;
        });
        out.push(svgEl('path', { d: 'M' + (cx - r * 0.5) + ' ' + (cy + r * 0.6) + ' q' + (-r * 0.4) + ' ' + (-r * 1.6) + ' ' + (r * 0.6) + ' ' + (-r * 2.4) + ' q' + (-r * 0.2) + ' ' + (r * 1.2) + ' ' + (-r * 0.1) + ' ' + (r * 2.4) + ' Z', fill: crop.leaf, opacity: 0.85 }));
        break;
      case 'floret':
        two(function (c) {
          var g = svgEl('g', {});
          var pts = [[0, 0], [-0.9, 0.2], [0.9, 0.2], [-0.5, -0.7], [0.5, -0.7], [0, 0.8]];
          for (var i = 0; i < pts.length; i++) {
            g.appendChild(svgEl('circle', { cx: cx + pts[i][0] * r, cy: cy + pts[i][1] * r, r: r * 0.75, fill: c }));
          }
          return g;
        });
        break;
      case 'leek':
        two(function (c) {
          var g = svgEl('g', {});
          g.appendChild(svgEl('rect', { x: cx - r * 0.5, y: cy - r * 1.6, width: r, height: r * 3.2, rx: r * 0.3, fill: c }));
          g.appendChild(svgEl('rect', { x: cx - r * 0.5, y: cy - r * 1.6, width: r, height: r * 1.2, rx: r * 0.3, fill: crop.leaf, opacity: 0.7 }));
          return g;
        });
        break;
      case 'ruffle':
        two(function (c) {
          var g = svgEl('g', {});
          for (var i = 0; i < 5; i++) {
            g.appendChild(svgEl('ellipse', {
              cx: cx + (i - 2) * r * 0.55, cy: cy - Math.abs(i - 2) * r * 0.3, rx: r * 0.55, ry: r * 1.1, fill: c,
              transform: 'rotate(' + ((i - 2) * 22) + ' ' + (cx + (i - 2) * r * 0.55) + ' ' + cy + ')'
            }));
          }
          return g;
        });
        break;
      default: // round
        two(function (c) {
          var g = svgEl('g', {});
          g.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: c }));
          g.appendChild(svgEl('circle', { cx: cx - r * 0.3, cy: cy - r * 0.3, r: r * 0.3, fill: 'rgba(255,255,255,0.3)' }));
          return g;
        });
    }
    return out;
  }

  function fruitGroup(crop, cx, cy, r, at) {
    var g = svgEl('g', { 'class': 'p-part p-fruit', 'data-at': at });
    g.style.transformOrigin = cx + 'px ' + cy + 'px';
    var shapes = fruitShapes(crop, cx, cy, r);
    for (var i = 0; i < shapes.length; i++) g.appendChild(shapes[i]);
    return g;
  }

  function makePlantSvg(crop) {
    var svg = svgEl('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMax meet' });
    svg.style.overflow = 'visible';
    var stemColor = '#8aa86f';

    if (crop.kind === 'bush') {
      var stem = svgEl('path', { d: 'M50 100 C49 80 51 60 50 30', stroke: stemColor, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round', 'class': 'p-part p-stem', 'data-at': 0 });
      stem.style.transformOrigin = '50px 100px';
      svg.appendChild(stem);
      svg.appendChild(leafPath(50, 82, 26, 200, crop.leaf, STAGES[0]));
      svg.appendChild(leafPath(50, 66, 26, -20, crop.leaf, STAGES[1]));
      svg.appendChild(leafPath(50, 48, 24, 205, crop.leaf, STAGES[2]));
      svg.appendChild(leafPath(50, 34, 22, -25, crop.leaf, STAGES[2]));
      svg.appendChild(fruitGroup(crop, 36, 58, 8, STAGES[3]));
      svg.appendChild(fruitGroup(crop, 64, 72, 8, STAGES[4]));
      svg.appendChild(fruitGroup(crop, 54, 40, 8, STAGES[5]));
    } else if (crop.kind === 'stalk') {
      var st = svgEl('path', { d: 'M50 100 L50 18', stroke: stemColor, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', 'class': 'p-part p-stem', 'data-at': 0 });
      st.style.transformOrigin = '50px 100px';
      svg.appendChild(st);
      svg.appendChild(leafPath(50, 86, 34, 195, crop.leaf, STAGES[0]));
      svg.appendChild(leafPath(50, 70, 34, -15, crop.leaf, STAGES[1]));
      svg.appendChild(leafPath(50, 54, 30, 200, crop.leaf, STAGES[2]));
      svg.appendChild(leafPath(50, 40, 28, -20, crop.leaf, STAGES[3]));
      if (crop.fruit === 'ear') {
        svg.appendChild(fruitGroup(crop, 41, 52, 7, STAGES[4]));
        svg.appendChild(fruitGroup(crop, 60, 40, 7, STAGES[5]));
      } else {
        svg.appendChild(fruitGroup(crop, 50, 22, crop.fruit === 'leek' ? 6 : 11, STAGES[4]));
      }
    } else if (crop.kind === 'root') {
      var root = fruitGroup(crop, 50, 84, 12, STAGES[3]);
      root.setAttribute('class', 'p-part p-fruit p-root');
      root.style.transformOrigin = '50px 100px';
      svg.appendChild(root);
      var ang = [-70, -35, 0, 35, 70];
      for (var i = 0; i < ang.length; i++) {
        var lf = leafPath(50, 76, 30, -90 + ang[i], crop.leaf, STAGES[Math.min(i, 2)]);
        svg.appendChild(lf);
      }
    } else { // ground
      svg.appendChild(leafPath(50, 96, 34, 195, crop.leaf, STAGES[0]));
      svg.appendChild(leafPath(50, 96, 34, -15, crop.leaf, STAGES[1]));
      svg.appendChild(leafPath(50, 92, 28, 230, crop.leaf, STAGES[2]));
      svg.appendChild(leafPath(50, 92, 28, -50, crop.leaf, STAGES[2]));
      var body = fruitGroup(crop, 50, 72, 20, STAGES[3]);
      body.style.transformOrigin = '50px 96px';
      svg.appendChild(body);
    }
    return svg;
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
      plantH: H * 0.58,
      canW: Math.max(84, Math.min(W * 0.14, 130))
    };
    geo.soilTop = geo.soilY - geo.bh;
    geo.plantW = Math.min(geo.bw * 1.05, geo.plantH * 1.1);
    // the 100-unit crop drawing is fitted bottom-center into the box
    geo.plantUnit = Math.min(geo.plantW, geo.plantH) / 100;

    layer.innerHTML = '';
    beds = [];
    ripeCount = 0;
    done = false;
    leaving = false;
    endTouches = 0;

    var crops = shuffle(CROPS[season].slice());
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
    var size = 0.62 + (need - NEED_MIN) / (NEED_MAX - NEED_MIN) * 0.38;   // 0.62 .. 1

    var plant = document.createElement('div');
    plant.className = 'g-plant';
    plant.style.left = x + 'px';
    plant.style.top = (geo.soilTop + geo.bh * 0.25) + 'px';
    plant.style.width = geo.plantW + 'px';
    plant.style.height = geo.plantH + 'px';
    var inner = document.createElement('div');
    inner.className = 'g-plant-inner';
    inner.appendChild(makePlantSvg(crop));
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
      parts: Array.prototype.slice.call(inner.querySelectorAll('.p-part')),
      ripeEls: Array.prototype.slice.call(inner.querySelectorAll('.p-ripe')),
      gauge: gauge, gaugeFill: gsvg.fill,
      need: need, size: size, water: 0, stage: -1, ripe: false, number: 0
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
    var k = geo.canW / 120;
    el.style.width = geo.canW + 'px';
    el.style.height = (90 * k) + 'px';
    var float = document.createElement('div');
    float.className = 'g-can-float';
    var body = document.createElement('div');
    body.className = 'g-can-body';
    body.style.transformOrigin = (4 * k) + 'px ' + (22 * k) + 'px';
    body.appendChild(makeCanSvg());
    float.appendChild(body);
    el.appendChild(float);
    layer.appendChild(el);
    var c = {
      el: el, k: k,
      x: geo.W * 0.16, y: geo.H * 0.42,      // spout-tip position
      tx: 0, ty: 0, pouring: false, held: false
    };
    c.tx = c.x; c.ty = c.y;
    placeCan(c);
    return c;
  }

  function placeCan(c) {
    c.el.style.transform = 'translate(' + (c.x - 4 * c.k) + 'px,' + (c.y - 22 * c.k) + 'px)';
  }

  /* ---------- rendering a bed from its water level ---------- */

  function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }

  function renderBed(bed) {
    var w = bed.water;
    var s = bed.size * (0.14 + 0.86 * easeOut(w));
    bed.inner.style.transform = 'scale(' + s + ')';
    bed.wet.setAttribute('opacity', (w * 0.42).toFixed(3));
    bed.gaugeFill.setAttribute('y', (52 - 50 * w).toFixed(1));

    // fruit ripening: swell and turn from green to its real color
    var r = Math.max(0, Math.min(1, (w - STAGES[3]) / (1 - STAGES[3])));
    for (var i = 0; i < bed.ripeEls.length; i++) bed.ripeEls[i].style.opacity = r.toFixed(3);

    // parts unfurl at their water marks
    for (var p = 0; p < bed.parts.length; p++) {
      var part = bed.parts[p];
      var at = parseFloat(part.getAttribute('data-at'));
      var on = w >= at;
      if (on !== part.classList.contains('is-on')) part.classList.toggle('is-on', on);
    }
  }

  function water(bed, dt) {
    if (bed.ripe) return;
    var before = bed.water;
    bed.water = Math.min(1, bed.water + dt / bed.need);
    renderBed(bed);

    // each growth mark the water crosses: a little bounce and a note
    for (var i = 0; i < STAGES.length; i++) {
      if (before < STAGES[i] && bed.water >= STAGES[i]) {
        boing(bed);
        ToddlAudio.flowerNote(i + 1, true);
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

  // Where the crop's drawing actually ends, in stage px (the plant box
  // is taller than most crops, so the number must not float away).
  function plantTop(bed) {
    var bottom = geo.soilTop + geo.bh * 0.25;
    var topUnits = 0;
    try { topUnits = bed.inner.querySelector('svg').getBBox().y; } catch (e) { /* no bbox */ }
    return bottom - (100 - topUnits) * geo.plantUnit * bed.size;
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
