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
    garden:  { module: function () { return window.ToddlGarden; },  stage: 'stage-garden' },
    piano:   { module: function () { return window.ToddlPiano; },   stage: 'stage-piano' }
  };

  // The order games flow through when the child just keeps playing.
  var GAME_ORDER = ['bubbles', 'shapes', 'colors', 'garden', 'piano'];

  // Parents can drop games from the rotation (grown-ups panel).
  var rotation = { bubbles: true, shapes: true, colors: true, garden: true,
    piano: true };
  try {
    var savedRotation = JSON.parse(localStorage.getItem('toddl-rotation'));
    if (savedRotation) {
      GAME_ORDER.forEach(function (g) {
        if (typeof savedRotation[g] === 'boolean') rotation[g] = savedRotation[g];
      });
    }
  } catch (e) { /* defaults are fine */ }

  function saveRotation() {
    try {
      localStorage.setItem('toddl-rotation', JSON.stringify(rotation));
    } catch (e) { /* private mode */ }
  }

  // Two ways to play. Pick ONE game and it stays: a finished round
  // lingers a moment and then the game quietly resets itself, and a
  // long visit resets it too. Or Shuffle Play, which wanders between
  // whichever games the grown-ups left switched on, never repeating
  // the one just played.
  var mode = 'single';
  var VISIT_MS = 70000;          // shuffle: no visit outstays its welcome
  var STAY_RESET_MS = 120000;    // single game: a fresh round after this long
  var ROUND_LINGER_MS = 10000;   // single game: enjoy the finished round first
  var restartTimer = null;

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
      if (!activeGame) return;
      if (mode === 'shuffle') window.ToddlFlow.next();
      else restartGame();
    }, mode === 'shuffle' ? VISIT_MS : STAY_RESET_MS);
  }

  // The same game, fresh: the stage dips out for a beat and comes
  // back with a new round.
  function restartGame() {
    if (!activeGame) return;
    var name = activeGame;
    var stageEl = document.getElementById(GAMES[name].stage);
    stageEl.classList.add('is-resetting');
    window.setTimeout(function () {
      stageEl.classList.remove('is-resetting');
      if (activeGame !== name) return;
      openGame(name, false);
    }, 420);
  }

  function enabledGames() {
    var on = GAME_ORDER.filter(function (g) { return rotation[g]; });
    return on.length ? on : GAME_ORDER.slice();
  }

  function pickShuffle(exclude) {
    var pool = enabledGames().filter(function (g) { return g !== exclude; });
    if (!pool.length) pool = enabledGames();
    return pool[Math.floor(Math.random() * pool.length)];
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
      if (mode === 'single') {
        // Stay on this game: let the finished round be enjoyed, then reset.
        if (restartTimer) return;
        restartTimer = window.setTimeout(function () {
          restartTimer = null;
          restartGame();
        }, ROUND_LINGER_MS);
        return;
      }
      openGame(pickShuffle(activeGame), true);
    },
    mode: function () { return mode; },
    // A game can ask for more time when something special is happening
    // (e.g. the galaxy sky) so the moment isn't cut short.
    extend: function () {
      if (activeGame) armVisitTimer();
    }
  };

  function closeGame() {
    if (!activeGame) return;
    clearVisitTimer();
    if (restartTimer) { window.clearTimeout(restartTimer); restartTimer = null; }
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
      onTap(card, function () {
        ToddlAudio.unlock();
        ToddlAudio.tap();
        mode = 'single';
        openGame(card.getAttribute('data-game'));
      });
    })(cards[i]);
  }

  var btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
    onTap(btnShuffle, function () {
      ToddlAudio.unlock();
      ToddlAudio.chime();
      mode = 'shuffle';
      openGame(pickShuffle(null));
    });
  }

  // Buttons must not depend on synthesized clicks: with the global
  // touch-gesture swallow, iOS drops the click when a tapping finger
  // wobbles a few pixels — which silently killed the home button.
  // pointerup always fires; click stays as a desktop fallback behind
  // a duplicate guard.
  function onTap(el, fn) {
    var last = 0;
    function fire(e) {
      var now = Date.now();
      if (now - last < 500) return;
      last = now;
      fn(e);
    }
    el.addEventListener('pointerup', function (e) {
      if (e.isPrimary) fire(e);
    });
    el.addEventListener('click', fire);
  }

  onTap(btnHome, goHome);

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
    GAME_ORDER.forEach(function (g) {
      syncToggle('toggle-game-' + g, rotation[g]);
    });
    showScreen('screen-parents');
    checkForUpdate();
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

  GAME_ORDER.forEach(function (g) {
    var el = document.getElementById('toggle-game-' + g);
    el.addEventListener('click', function () {
      var next = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', next ? 'true' : 'false');
      rotation[g] = next;
      saveRotation();
    });
  });

  onTap(document.getElementById('btn-parents-done'), goHome);

  /* ---------- Grown-ups panel scrolling ----------
     The whole app suppresses native touch gestures, so the panel
     scrolls through its own pointer-drag code — deterministic on
     every device. Taps still click; real drags scroll and swallow
     the accidental click that would fire on release. */

  (function () {
    var panel = document.querySelector('.parents-panel');
    if (!panel) return;
    var tracking = false;
    var lastY = 0;
    var moved = 0;

    panel.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) return;
      tracking = true;
      lastY = e.clientY;
      moved = 0;
    });

    panel.addEventListener('pointermove', function (e) {
      if (!tracking || !e.isPrimary) return;
      var dy = e.clientY - lastY;
      lastY = e.clientY;
      moved += Math.abs(dy);
      panel.scrollTop -= dy;
      // Once this is clearly a drag, capture the pointer so one long
      // swipe keeps scrolling beyond the panel's edge. Capturing only
      // after movement means plain taps still click buttons normally
      // (capture would steal pointerup from them).
      if (moved > 8 && !panel.hasPointerCapture(e.pointerId)) {
        try { panel.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      }
    });

    var dragEndAt = 0;
    function endScroll() {
      if (tracking && moved > 12) dragEndAt = Date.now();
      tracking = false;
    }
    panel.addEventListener('pointerup', endScroll);
    panel.addEventListener('pointercancel', endScroll);

    // A drag that scrolled shouldn't also flip whatever toggle the
    // finger happened to lift from — swallow only the click that
    // immediately follows the drag, never a later deliberate tap.
    panel.addEventListener('click', function (e) {
      if (Date.now() - dragEndAt < 400) {
        e.stopPropagation();
        e.preventDefault();
      }
      moved = 0;
    }, true);

    // Desktop nicety: the wheel scrolls too.
    panel.addEventListener('wheel', function (e) {
      panel.scrollTop += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  })();

  /* ---------- Toddler-proofing ---------- */

  // Block long-press context menus, double-tap zoom, and pinch zoom.
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  // Toddlers rest extra fingers and palms on the glass. Swallow every
  // raw touch gesture at the document level (passive: false) so a
  // second finger can never scroll, rubber-band, or feed Safari a
  // navigation gesture — pointer events for the games still fire.
  // The one legitimate scroller is the grown-ups panel: touches that
  // start inside it keep their native scroll.
  document.addEventListener('touchmove', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.parents-panel')) return;
    e.preventDefault();
  }, { passive: false });

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

  /* ---------- Updates ----------
     Every build is stamped with its git sha (resources/stamp-version.sh,
     run by CI). The grown-ups panel compares the running stamp with the
     server's version.json; Update throws away the offline copy and
     reloads straight from the network — the same for the web app and
     the native shells, which load the live site. */

  var VERSION = (function () {
    var m = document.querySelector('meta[name="toddl-version"]');
    var v = m ? m.getAttribute('content') : '';
    return (!v || v.indexOf('__') === 0) ? 'dev' : v;
  })();
  var updateStatus = document.getElementById('update-status');
  var btnUpdate = document.getElementById('btn-update');

  function checkForUpdate() {
    if (!updateStatus) return;
    updateStatus.textContent = 'Checking for updates…';
    btnUpdate.classList.remove('is-ready');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var latest = j && j.version;
        if (latest && latest !== VERSION) {
          updateStatus.textContent = 'Update available: ' + latest + ' (you have ' + VERSION + ')';
          btnUpdate.classList.add('is-ready');
        } else {
          updateStatus.textContent = 'You have the latest version (' + VERSION + ')';
        }
      })
      .catch(function () {
        updateStatus.textContent = 'Offline — version ' + VERSION;
      });
  }

  function applyUpdate() {
    if (updateStatus) updateStatus.textContent = 'Updating…';
    var steps = [];
    if (window.caches) {
      steps.push(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }));
    }
    if (navigator.serviceWorker) {
      steps.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }));
    }
    Promise.all(steps).catch(function () { /* best effort */ }).then(function () {
      // a fresh address so the page itself is not served from any cache
      window.location.replace(window.location.pathname + '?u=' + Date.now());
    });
  }

  if (btnUpdate) onTap(btnUpdate, applyUpdate);

  // Back from an update: tidy the address again.
  if (/[?&]u=/.test(window.location.search) && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  /* ---------- Offline support ---------- */

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      // updateViaCache 'none': always look for a newer sw.js on the
      // network, so a new build is noticed within one launch
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {
        // Offline caching is a nice-to-have; the app works without it.
      });
    });
  }
})();
