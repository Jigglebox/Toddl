# Toddl

Calm, Montessori-inspired games for toddlers (ages ~1–3). Low stimulation,
high engagement: slow motion, muted pastels, gentle synthesized sounds, no
scores, no timers, no ads, no fail states.

## Activities

| Game | What the child does | What it teaches |
|---|---|---|
| **Bubbles** | Taps big, slow bubbles to pop them and reveal an object with its spoken name | Vocabulary, cause-and-effect, tracking |
| **Shapes** | Drags chunky shapes into matching outlines | Shape recognition, drag control |
| **Colors** | Sorts colored balls into same-colored bowls | Color names, first categorization |
| **Garden** | Taps soil mounds to grow flowers while Toddl counts 1–5 | Counting, one-to-one correspondence |

See [DESIGN.md](DESIGN.md) for the full design rationale.

## Running it (web)

The game itself lives in `www/` with no build step. Serve it with any
static server:

```bash
npx serve www
# or
python3 -m http.server 8000 --directory www
```

Then open it on a phone or tablet (or a desktop browser's mobile emulation).
After the first visit it works fully offline, and it can be added to the
home screen as a fullscreen app.

## Building the native apps (iOS + Android)

The repo is also a [Capacitor](https://capacitorjs.com) project with
generated native shells:

- `ios/` — an Xcode project (`ios/App/App.xcworkspace`) for the App Store
- `android/` — an Android Studio / Gradle project for Google Play

```bash
npm install
npx cap sync
npx cap open ios       # on a Mac with Xcode
npx cap open android   # with Android Studio
```

GitHub Actions builds a debug APK and an unsigned release AAB on every
push, and compile-checks the iOS project. See **[BUILDING.md](BUILDING.md)**
for signing and store submission (including the Apple Kids Category and
Google Play Families policy steps).

## For grown-ups

Press and **hold** the "grown-ups" button on the home screen for two seconds
to open settings (toggle gentle sounds and spoken words).

## Tech

Plain HTML/CSS/JS. All art is inline SVG, all audio is WebAudio-synthesized
(soft pentatonic tones), words are spoken via the Web Speech API. A
cache-first service worker makes it an offline-capable PWA.
