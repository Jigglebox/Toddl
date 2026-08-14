/* ============================================================
   Toddl app shell — screen navigation, the grown-ups gate,
   and global guards that keep a toddler safely inside the app
   (no zooming, scrolling, long-press menus, or double-tap).
   ============================================================ */

(function () {
  'use strict';

  var GAMES = {
    bubbles: { module: function () { return window.ToddlBubbles; }, stage: 'stage-bubbles' },
    shapes:  { module: function () { return window.ToddlShapes; },  stage: 'stage-shapes' },
    colors:  { module: function () { return window.ToddlColors; },  stage: 'stage-colors' },
    garden:  { module: function () { return window.ToddlGarden; },  stage: 'stage-garden' }
  };

  // The order games flow through when the child just keeps playing.
  var GAME_ORDER = ['bubbles', 'shapes', 'colors', 'garden'];

  // No visit ever outstays its welcome: even if the child just pokes
  // around without finishing anything, the next activity arrives.
  var VISIT_MS = 70000;

  var activeGame = null;
  var btnHome = document.getElementById('btn-home');
  var leaveTimer = null;
  var visitTimer = null;

  /* ---------- Screen switching ---------- */

  function showScreen(id, crossfade) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      var s = screens[i];
      if (s.id === id) {
        s.classList.remove('is-leaving');
        s.classList.add('is-active');
      } else if (crossfade && s.classList.contains('is-active')) {
        // Keep the old screen visible while it fades under the new one.
        s.classList.remove('is-active');
        s.classList.add('is-leaving');
      } else {
        s.classList.remove('is-active', 'is-leaving');
      }
    }
    if (leaveTimer) window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(function () {
      var leaving = document.querySelectorAll('.screen.is-leaving');
      for (var j = 0; j < leaving.length; j++) {
        leaving[j].classList.remove('is-leaving');
      }
    }, 750);
  }

  function armVisitTimer() {
    if (visitTimer) window.clearTimeout(visitTimer);
    visitTimer = window.setTimeout(function () {
      visitTimer = null;
      if (activeGame) window.ToddlFlow.next();
    }, VISIT_MS);
  }

  function clearVisitTimer() {
    if (visitTimer) { window.clearTimeout(visitTimer); visitTimer = null; }
  }

  function openGame(name, crossfade) {
    var game = GAMES[name];
    if (!game) return;
    closeGame();
    showScreen('screen-' + name, crossfade);
    btnHome.hidden = false;
    game.module().start(document.getElementById(game.stage));
    activeGame = name;
    armVisitTimer();
  }

  /* ---------- Seamless flow ----------
     When a game reaches a natural resting point (enough bubbles
     popped, a couple of puzzles done, the garden fully bloomed),
     it calls ToddlFlow.next() and the next activity gently
     crossfades in. The child never has to find a menu — play
     simply continues. */

  window.ToddlFlow = {
    next: function () {
      if (!activeGame) return;
      var idx = GAME_ORDER.indexOf(activeGame);
      var nextName = GAME_ORDER[(idx + 1) % GAME_ORDER.length];
      openGame(nextName, true);
    },
    // A game can ask for more time when something special is happening
    // (e.g. the galaxy sky) so the moment isn't cut short.
    extend: function () {
      if (activeGame) armVisitTimer();
    }
  };

  function closeGame() {
    if (!activeGame) return;
    clearVisitTimer();
    GAMES[activeGame].module().stop();
    activeGame = null;
  }

  function goHome() {
    closeGame();
    btnHome.hidden = true;
    showScreen('screen-home');
  }

  var cards = document.querySelectorAll('.game-card');
  for (var i = 0; i < cards.length; i++) {
    (function (card) {
      card.addEventListener('click', function () {
        ToddlAudio.unlock();
        ToddlAudio.tap();
        openGame(card.getAttribute('data-game'));
      });
    })(cards[i]);
  }

  btnHome.addEventListener('click', goHome);

  /* ---------- Grown-ups gate (press and hold 2 seconds) ----------
     A toddler taps; only a grown-up will read "hold" and keep a
     finger down. Simple, no reading of numbers required. */

  var parentsBtn = document.getElementById('btn-parents');
  var holdTimer = null;

  function startHold(e) {
    e.preventDefault();
    parentsBtn.classList.add('is-holding');
    holdTimer = window.setTimeout(function () {
      parentsBtn.classList.remove('is-holding');
      openParents();
    }, 2000);
  }

  function cancelHold() {
    parentsBtn.classList.remove('is-holding');
    if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; }
  }

  parentsBtn.addEventListener('pointerdown', startHold);
  parentsBtn.addEventListener('pointerup', cancelHold);
  parentsBtn.addEventListener('pointercancel', cancelHold);
  parentsBtn.addEventListener('pointerleave', cancelHold);

  function openParents() {
    syncToggle('toggle-sound', ToddlAudio.getSetting('sound'));
    syncToggle('toggle-voice', ToddlAudio.getSetting('voice'));
    syncToggle('toggle-music', ToddlAudio.getSetting('music'));
    showScreen('screen-parents');
  }

  function syncToggle(id, value) {
    document.getElementById(id).setAttribute('aria-checked', value ? 'true' : 'false');
  }

  function wireToggle(id, key) {
    var el = document.getElementById(id);
    el.addEventListener('click', function () {
      var next = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', next ? 'true' : 'false');
      ToddlAudio.setSetting(key, next);
      if (next && key === 'sound') ToddlAudio.tap();
    });
  }

  wireToggle('toggle-sound', 'sound');
  wireToggle('toggle-voice', 'voice');
  wireToggle('toggle-music', 'music');

  document.getElementById('btn-parents-done').addEventListener('click', goHome);

  /* ---------- Toddler-proofing ---------- */

  // Block long-press context menus, double-tap zoom, and pinch zoom.
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  /* ---------- Device motion service ----------
     One app-wide gyroscope reader. iOS only grants motion access when
     requested during a clean user gesture, so we ask on the very first
     tap (and again on later taps until granted). The galaxy reads the
     accumulated view direction from here every frame. */

  window.ToddlMotion = (function () {
    var accAz = 0;          // continuous azimuth, radians (multi-turn safe)
    var elev = 0;           // elevation relative to how the phone is held
    var lastAz = null;
    var baseEl = null;
    var active = false;     // true once real sensor events arrive
    var attached = false;
    var granted = false;

    function wrapPi(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    // W3C deviceorientation angles (Z-X'-Y'' intrinsic) → the direction
    // the user is looking (out of the back of the screen).
    function viewDirection(alpha, beta, gamma) {
      var d = Math.PI / 180;
      var cX = Math.cos(beta * d), sX = Math.sin(beta * d);
      var cY = Math.cos(gamma * d), sY = Math.sin(gamma * d);
      var cZ = Math.cos(alpha * d), sZ = Math.sin(alpha * d);
      var zx = cY * sZ * sX + cZ * sY;
      var zy = sZ * sY - cZ * cY * sX;
      var zz = cX * cY;
      return {
        az: Math.atan2(-zx, -zy),
        el: Math.asin(Math.max(-1, Math.min(1, -zz)))
      };
    }

    function handle(e) {
      if (e.beta == null || e.gamma == null) return;
      var v = viewDirection(e.alpha || 0, e.beta, e.gamma);
      if (lastAz === null) {
        lastAz = v.az;
        baseEl = v.el;
        return;
      }
      accAz += wrapPi(v.az - lastAz);
      lastAz = v.az;
      elev = v.el - baseEl;
      active = true;
    }

    function attach() {
      if (attached) return;
      attached = true;
      window.addEventListener('deviceorientation', handle);
    }

    function request() {
      if (granted) return;
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then(function (state) {
            if (state === 'granted') { granted = true; attach(); }
          }).catch(function () { /* keep drag fallback */ });
        } else {
          granted = true;
          attach();
        }
      } catch (e) { /* keep drag fallback */ }
    }

    return {
      request: request,
      get: function () {
        return { azimuth: accAz, elevation: elev, active: active };
      }
    };
  })();

  // First interaction anywhere unlocks audio (mobile autoplay policy)
  // and is the cleanest possible gesture to request motion access.
  document.addEventListener('pointerdown', function unlockOnce() {
    ToddlAudio.unlock();
    window.ToddlMotion.request();
    document.removeEventListener('pointerdown', unlockOnce);
  });

  // Keep game layouts sane if the device rotates mid-game.
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!activeGame) return;
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (!activeGame) return;
      var game = GAMES[activeGame];
      game.module().stop();
      game.module().start(document.getElementById(game.stage));
    }, 300);
  });

  /* ---------- Offline support ---------- */

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        // Offline caching is a nice-to-have; the app works without it.
      });
    });
  }
})();
