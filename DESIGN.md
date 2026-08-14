# Toddl — Design Document

Calm, Montessori-inspired games for toddlers (roughly ages 1–3), built as a
mobile-first web app.

## Design philosophy: low stimulation, high engagement

Most toddler apps compete for attention with saturation, speed, and noise.
Toddl goes the other way. Engagement comes from *agency* — the child causes
every single thing that happens on screen — not from spectacle.

**The rules everything follows:**

1. **The child drives.** Nothing important happens without a touch. There are
   no autoplaying sequences, no characters demanding attention, no cut-scenes.
2. **Slow, trackable motion.** Bubbles rise at ~20 px/second. Animations use
   long, gentle easing. A two-year-old's visual tracking gets time to work.
3. **Muted palette.** A warm cream ground (`#faf6ef`) with desaturated sage,
   dusty blue, blush, butter, and lilac. No pure primaries, no flashing, no
   rapid color changes.
4. **Quiet audio.** All sound effects are synthesized soft sine/triangle
   tones on a pentatonic scale (so overlapping notes always harmonize),
   played at low gain. Instead of a looping music track, a generative
   music-box lullaby plays single soft bell notes that wander the
   pentatonic scale every few seconds — never a beat, never a repeat,
   always consonant (toggleable in the grown-ups panel). Every spoken
   word ships as a pre-recorded natural voice clip (calm neural TTS,
   loudness-normalized, slightly slowed) so the voice is warm and
   identical on every device — system speech synthesis is only a
   fallback, with the most natural available voice auto-selected.
5. **No fail states, ever.** A shape dropped in the wrong place drifts calmly
   back — a soft downward tone, never a buzzer. Montessori materials are
   self-correcting; the material itself shows the answer.
6. **No scores, timers, streaks, levels, ads, or purchases.** Nothing that
   manufactures urgency or compulsion. Rounds simply and quietly renew.
7. **One skill per activity** (Montessori "isolation of difficulty"): each
   game isolates a single property — object names, shape, color, or number.
8. **Big and forgiving.** Minimum ~96 px touch targets, generous snap radii
   (~55% of piece size), whole-element hit areas.
9. **A living world, softly.** Every scene has layered scenery — a
   breathing sun-glow, clouds that take minutes to cross the sky, rolling
   hills — and every touchable thing idles with a slow bob or sway. Alive
   enough to be mesmerizing, never fast enough to distract from the
   child's own actions.
10. **Play flows by itself, always.** When an activity reaches a natural
    resting point (eight bubbles popped, two puzzles done, two sorts
    done, the garden fully bloomed), the next activity gently crossfades
    in — bubbles → shapes → colors → garden → bubbles. And if a child
    just pokes around without finishing anything, a 70-second visit
    timer rotates play anyway, so there is *always* something new to do
    with no menu and no parent needed. Inter-round pauses are short
    (~1.6s) so the screen is never idle. The home screen still allows
    jumping straight to any activity.
11. **Landscape, on a lap.** Toddlers don't hold phones; they set them
    down. The native apps lock to landscape, the PWA manifest requests
    it, and in a portrait browser a calm "turn me sideways" screen shows
    instead of a broken layout.

## The four activities

### 1. Bubbles — vocabulary & cause-and-effect
Large iridescent soap bubbles (up to 7 at a time, replenished within half a
second of every pop) drift slowly up the screen, each carrying a familiar
object: dog, cat, apple, moon, boat… Tap a bubble and it pops softly with a
ripple and droplets; the object springs free with its written and spoken
name.

**The moon secret:** popping the moon bubble opens a full **360° window
into space**. The night sky is a panoramic skybox painted onto a canvas in
saturated, additive color over true black — cinematic deep space, not a
pastel painting — holding four distinct vistas: the fiery ring nebula
(turbulent magenta/orange/gold gas glowing from within around a dark void,
with a blazing cross-flare star at its heart), towering magenta-purple
pillars crowned with newborn stars, a cyan veil wrapped around a burning
star cluster, and a distant tilted spiral galaxy — plus a milky band,
~900 painted stars, twinkling overlay stars, and shooting stars.

**Turning the phone actually looks around the sphere.** Device orientation
is converted to a true view direction (rotation matrix → azimuth +
elevation), so the sky pans exactly opposite the phone's motion, wraps
seamlessly through full 360° turns, and tilts up and down — like holding a
window into space. iOS motion permission is requested from the very pop
gesture that opens the night; without a gyroscope, dragging a finger pans
the view, and after four idle seconds the sky slowly revolves on its own
(a full turn in about four minutes). The bubbles keep drifting in front of
it all. It's the one deliberately awe-scaled moment in the app —
otherworldly, but still slow and quiet. The visit timer resets when it
triggers so the night gets a full stretch of play, and the next visit to
Bubbles dawns back to day.

- *Teaches:* object vocabulary, pointing/tapping precision, visual tracking,
  cause-and-effect.
- *Details:* themes are dealt from a shuffled bag so words rotate evenly;
  unpopped bubbles quietly recycle off the top; pop sound is a randomized
  pentatonic slide so repeated popping stays pleasant.

### 2. Shapes — form recognition (a digital form puzzle)
Three chunky pastel shapes sit at the bottom; matching dashed outlines wait
above. The child drags each shape into its outline. On pickup and placement
the shape's name is spoken.

- *Teaches:* shape recognition and names, drag control, visual matching.
- *Self-correction:* a miss drifts gently back to its start; a match snaps in
  with a two-note rising cue. Completing a round drifts a few soft stars up
  and lays out a new set of three (from circle, square, triangle, star, heart).

### 3. Colors — first sorting work
Two bowls in different muted colors, six matching balls scattered above.
The child drags each ball into the same-colored bowl, where it settles in
with the color spoken aloud.

- *Teaches:* color matching and names, categorization (the classic first
  Montessori sorting exercise: two categories, one isolated property —
  every item is the same ball shape, only color varies).
- *Colors used:* muted red, blue, yellow, green — a rotating random pair
  each round.

### 4. Garden — counting 1–5
Five soil mounds. Tap one and a flower grows slowly out of it while Toddl
counts aloud: "one… two…". Each tap = one flower = one number (one-to-one
correspondence). When all five bloom, a butterfly drifts across and the
garden quietly resets with new flower colors.

- *Teaches:* counting 1–5, one-to-one correspondence, patience (the growth
  animation takes 1.4 s and rewards watching).

## For grown-ups

A parent gate ("grown-ups — hold", press-and-hold 2 seconds — a gesture
toddlers don't sustain) opens a small panel with two toggles (gentle sounds,
spoken words) and a note encouraging co-play. Settings persist in
`localStorage`.

## Toddler-proofing

- Pinch-zoom, double-tap zoom, long-press menus, scrolling and text
  selection are all suppressed.
- `display: fullscreen` PWA manifest; parents can add to home screen and use
  the OS's Guided Access / app pinning for full lockdown.
- The home button on game screens is small and corner-placed so accidental
  exits are rare (deliberately not parent-gated so an older toddler can
  switch activities themselves).
- `prefers-reduced-motion` collapses all animation.

## Technical shape

- **Zero dependencies, no build step.** Plain HTML/CSS/JS with classic
  scripts. Serve the folder (or open over any static host) and it runs.
- **All art is inline SVG / CSS** and all sound effects are
  WebAudio-synthesized. The only binary assets are the ~29 spoken-word
  clips in `www/audio/words/` (≈0.8 MB total), generated offline with
  Piper neural TTS (`en-us-lessac-medium`, slowed ~15%, silence-trimmed,
  loudness-normalized to −20 LUFS). Regenerate or re-record them freely —
  the app just plays `<slug>.mp3` for each word, so a parent's own
  recorded voice works too.
- **Offline-first PWA:** a cache-first service worker precaches everything on
  first visit — important for the "toddler on a plane" use case.
- Each game is a self-contained module exposing `start(stageEl)` / `stop()`;
  the shell (`js/main.js`) owns navigation, the parent gate, audio unlock,
  and re-layout on rotation.

## Ideas for later

- Sound-matching game (tap the animal that made the sound) — Montessori
  sensorial/auditory work.
- Size grading (nesting circles, big-to-small) — the digital pink tower.
- A daily "quiet mode" schedule for parents (dimmer palette, no speech).
- Localization of the spoken/written vocabulary.
