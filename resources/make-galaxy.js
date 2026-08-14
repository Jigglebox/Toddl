/* Builds the galaxy night sky from real astrophotography.
   Personal-use build.

   Sources (Unsplash astrophotography, via the makccr/wallpapers
   GitHub archive, wallpapers/space/):
     - aldebaran-s-qtRF_RxCA o0: North America + Pelican Nebula,
       5303x3971 — THE scene. One continuous cloudscape fills the
       whole sky.
     - aldebaran-s-uXchDIKs4qI: Orion Nebula, 2406x2411 — a single
       landmark placed once in the sky, a discoverable heart.

   The sky is one unified scene: the backdrop is the full nebula
   graded to a violet base; the foreground depth layer is THE SAME
   image converted to luminance-alpha so its own brightest gas
   drifts in front at a different parallax rate. Nothing is collaged
   from mismatched pieces.

   Run: node resources/make-galaxy.js <dir with source jpgs>
   Writes: www/img/galaxy/{scene.webp, sceneglow.webp, orion.webp} */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('usage: node resources/make-galaxy.js <source dir>');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'www', 'img', 'galaxy');
fs.mkdirSync(outDir, { recursive: true });

const SCENE_SRC = 'aldebaran-s-qtRF_RxCAo0-unsplash.jpg';
const ORION_SRC = 'aldebaran-s-uXchDIKs4qI-unsplash.jpg';

// Violet base like the reference wallpapers: luminance-preserving
// purple tint over the original, stars stay white-hot.
const PURPLE = { r: 172, g: 108, b: 255 };

async function grade(input, height, tintAmount, saturation) {
  const base = await sharp(input)
    .resize({ height })
    .modulate({ saturation })
    .toBuffer();
  const purple = await sharp(base)
    .tint(PURPLE)
    .ensureAlpha(tintAmount)
    .png()
    .toBuffer();
  return sharp(base)
    .composite([{ input: purple, blend: 'over' }])
    .modulate({ saturation: 1.12 })
    .toBuffer();
}

// Luminance-derived alpha with soft edge fades — for layers that
// float in front of the scene.
async function toAlpha(rgb, w, h, boost, offset, outFile) {
  const lum = await sharp(rgb).greyscale().linear(boost, offset).toBuffer();
  const rgba = await sharp(rgb).joinChannel(lum).png().toBuffer();
  const fadeX = Buffer.from(
    '<svg width="' + w + '" height="' + h + '"><defs>' +
    '<linearGradient id="e" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="white" stop-opacity="0"/>' +
    '<stop offset="12%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="88%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#e)"/></svg>');
  const fadeY = Buffer.from(
    '<svg width="' + w + '" height="' + h + '"><defs>' +
    '<linearGradient id="e" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="white" stop-opacity="0"/>' +
    '<stop offset="14%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="86%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#e)"/></svg>');
  await sharp(rgba)
    .composite([
      { input: fadeX, blend: 'dest-in' },
      { input: fadeY, blend: 'dest-in' }
    ])
    .webp({ quality: 80, alphaQuality: 70 })
    .toFile(outFile);
}

function report(f) {
  console.log(f, Math.round(fs.statSync(path.join(outDir, f)).size / 1024) + 'KB');
}

(async () => {
  // --- THE scene: opaque backdrop, the whole sky ---
  const sceneRgb = await grade(path.join(srcDir, SCENE_SRC), 2000, 0.55, 1.35);
  await sharp(sceneRgb)
    .webp({ quality: 82 })
    .toFile(path.join(outDir, 'scene.webp'));
  report('scene.webp');

  // --- The same scene's brightest gas as a floating front layer ---
  const glowRgb = await grade(path.join(srcDir, SCENE_SRC), 1300, 0.5, 1.4);
  const glowMeta = await sharp(glowRgb).metadata();
  // steep alpha curve: only the bright cloud structures survive
  await toAlpha(glowRgb, glowMeta.width, glowMeta.height, 3.2, -60,
    path.join(outDir, 'sceneglow.webp'));
  report('sceneglow.webp');

  // --- Orion: one landmark, already pink/purple, floats in front ---
  const orionRgb = await grade(path.join(srcDir, ORION_SRC), 1100, 0.25, 1.3);
  const orionMeta = await sharp(orionRgb).metadata();
  await toAlpha(orionRgb, orionMeta.width, orionMeta.height, 2.6, 4,
    path.join(outDir, 'orion.webp'));
  report('orion.webp');
})();
