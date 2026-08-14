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

  // First interaction anywhere unlocks audio (mobile autoplay policy).
  document.addEventListener('pointerdown', function unlockOnce() {
    ToddlAudio.unlock();
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
