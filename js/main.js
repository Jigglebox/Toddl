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

  var activeGame = null;
  var btnHome = document.getElementById('btn-home');

  /* ---------- Screen switching ---------- */

  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('is-active', screens[i].id === id);
    }
  }

  function openGame(name) {
    var game = GAMES[name];
    if (!game) return;
    closeGame();
    showScreen('screen-' + name);
    btnHome.hidden = false;
    game.module().start(document.getElementById(game.stage));
    activeGame = name;
  }

  function closeGame() {
    if (!activeGame) return;
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
