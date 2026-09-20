# Sung piano-note clips (www/audio/notes/*.mp3)

Eight letter names sung at each piano key's pitch, plus eight
"<letter> chord" phrases (used when several keys are pressed at once),
generated offline:

1. Piper TTS (en-us-lessac-medium, the app's voice) speaks each
   phrase — "See.", "Dee.", … and "See chord.", "Dee chord.", … —
   with `--length_scale 1.6 --noise_scale 0.4` for a sung, sustained
   feel. Note: this model outputs **16 kHz** WAV; always read the
   sample rate from the header rather than assuming 22050.
2. The clip's median fundamental (f0) is measured with a frame-based
   autocorrelation script (numpy) with parabolic peak refinement and a
   sub-harmonic check to avoid octave errors.
3. ffmpeg shifts the clip toward its target note with
   `asetrate=SR*R,aresample=SR,atempo=sqrt(1/R),atempo=sqrt(1/R)`
   where R = target_f0 / measured_f0 and SR is the source rate.
   Because spoken phrases carry intonation, a single pass can land
   off-pitch — so the *output* is re-measured in a narrow band around
   the target (±1.35×, which removes octave ambiguity) and R is
   corrected iteratively until the clip is within ±40 cents.
   Targets are C3–B3 plus C4 (130.81, 146.83, 164.81, 174.61, 196.00,
   220.00, 246.94, 261.63 Hz) — one octave below the piano tones
   (C4–C5), a natural voice range in perfect octave harmony with the
   keys. High C reuses the C source shifted an octave further.
4. Silence-trim both ends, tail fade (`areverse,afade=t=in,areverse` —
   a plain `afade=t=out` without `st` silences everything after `d`!),
   small pad, loudness-normalize (I=-19, TP=-2), 48 kHz mono MP3.
