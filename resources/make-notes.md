# Sung piano-note clips (www/audio/notes/*.mp3)

Eight letter names sung at each piano key's pitch, generated offline:

1. Piper TTS (en-us-lessac-medium, the app's voice) speaks each letter
   name — "See.", "Dee.", "Ee.", "Eff.", "Gee.", "Ay.", "Bee." — with
   `--length_scale 1.6 --noise_scale 0.4` for a sung, sustained feel.
2. Each clip's fundamental pitch (f0) is measured with a short
   autocorrelation script (numpy) over the voiced middle of the clip.
3. ffmpeg shifts each clip to its target note with
   `asetrate=22050*R,aresample=22050,atempo=sqrt(1/R),atempo=sqrt(1/R)`
   where R = target_f0 / measured_f0. Targets are C3–B3 plus C4
   (130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63 Hz)
   — one octave below the piano tones (C4–C5), a natural voice range
   in perfect octave harmony with the keys. High C reuses the C clip
   shifted an octave further.
4. Silence-trim, fade tail, loudness-normalize (I=-19), 48k mono MP3.
