/* ============================================================
   Scenery — layered, slowly-moving backdrops shared by the
   games. Everything drifts on multi-minute timescales: alive
   enough to feel like a place, never busy enough to distract
   from the child's own actions.
   ============================================================ */

(function () {
  'use strict';

  function el(tag, className, styles) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (styles) {
      for (var key in styles) node.style[key] = styles[key];
    }
    return node;
  }

  function makeCloudSvg(opacity) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 90');
    var blobs = [
      [60, 58, 42, 26], [105, 46, 40, 28], [148, 60, 38, 22], [95, 66, 60, 20]
    ];
    for (var i = 0; i < blobs.length; i++) {
      var e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      e.setAttribute('cx', blobs[i][0]);
      e.setAttribute('cy', blobs[i][1]);
      e.setAttribute('rx', blobs[i][2]);
      e.setAttribute('ry', blobs[i][3]);
      e.setAttribute('opacity', opacity);
      svg.appendChild(e);
    }
    return svg;
  }

  function makeHillsSvg(front, back) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 26');
    svg.setAttribute('preserveAspectRatio', 'none');

    var far = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    far.setAttribute('d', 'M0 26 L0 12 Q22 2 46 10 Q72 18 100 8 L100 26 Z');
    far.setAttribute('fill', back);
    svg.appendChild(far);

    var near = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    near.setAttribute('d', 'M0 26 L0 19 Q30 10 58 17 Q82 22 100 16 L100 26 Z');
    near.setAttribute('fill', front);
    svg.appendChild(near);

    return svg;
  }

  /* opts: {
       sun: {x: '78%', y: '12%', size: '26vmin', color: 'rgba(...)'},
       clouds: n,
       cloudTint: 0.5..0.9         (opacity of cloud white)
       hills: {front: '#..', back: '#..', height: '18%'},
       shimmer: true
     } */
  function build(stage, opts) {
    opts = opts || {};
    var scene = el('div', 'scene');

    if (opts.sun) {
      var s = opts.sun;
      scene.appendChild(el('div', 'scene-sun', {
        left: s.x, top: s.y,
        width: s.size, height: s.size,
        marginLeft: 'calc(' + s.size + ' / -2)',
        marginTop: 'calc(' + s.size + ' / -2)',
        background: 'radial-gradient(circle, ' + (s.color || 'rgba(236,217,160,0.9)') +
          ' 0%, ' + (s.halo || 'rgba(236,217,160,0.35)') + ' 45%, transparent 72%)'
      }));
    }

    var cloudCount = opts.clouds || 0;
    for (var i = 0; i < cloudCount; i++) {
      var width = 24 + Math.random() * 16;                  // vw
      var duration = 150 + Math.random() * 120;             // very slow: 2.5–4.5 min
      var cloud = el('div', 'scene-cloud', {
        top: (4 + Math.random() * 26) + '%',
        left: '0',
        width: width + 'vw',
        opacity: 0.6 + Math.random() * 0.3,
        animationDuration: duration + 's',
        animationDelay: (-Math.random() * duration) + 's'   // start mid-sky
      });
      cloud.appendChild(makeCloudSvg(opts.cloudTint || 0.7));
      scene.appendChild(cloud);
    }

    if (opts.hills) {
      var hills = el('div', 'scene-hills', { height: opts.hills.height || '18%' });
      hills.appendChild(makeHillsSvg(opts.hills.front, opts.hills.back));
      scene.appendChild(hills);
    }

    if (opts.shimmer) scene.appendChild(el('div', 'scene-shimmer'));

    stage.appendChild(scene);
    return scene;
  }

  window.ToddlScenery = { build: build };
})();
