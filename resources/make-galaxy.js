/* Prepares the galaxy skybox photos from real James Webb Space
   Telescope imagery (NASA/ESA/CSA/STScI — public domain).

   Source files (2800px versions) come from the WebbCompare project's
   mirror of the official STScI releases:
     https://github.com/JohnEdChristensen/WebbCompare  (img/webb/*)

   Each photo gets a saturation/contrast lift for that cinematic
   deep-space look and a radial fade to pure black baked into its
   edges, so it composites seamlessly over the starfield canvas.

   Run: node resources/make-galaxy.js <dir-with-source-images>
   Writes: www/img/galaxy/*.jpg */

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

function vignette(w, h, innerPct) {
  // Radial falloff plus hard linear fades on every edge: photos must
  // dissolve into black long before their rectangle ends, so no seam
  // is ever visible against the starfield.
  return Buffer.from(
    '<svg width="' + w + '" height="' + h + '">' +
    '<defs>' +
    '<radialGradient id="v" cx="50%" cy="50%" r="72%">' +
    '<stop offset="' + innerPct + '%" stop-color="black" stop-opacity="0"/>' +
    '<stop offset="88%" stop-color="black" stop-opacity="0.55"/>' +
    '<stop offset="100%" stop-color="black" stop-opacity="1"/>' +
    '</radialGradient>' +
    '<linearGradient id="hx" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="black" stop-opacity="1"/>' +
    '<stop offset="14%" stop-color="black" stop-opacity="0"/>' +
    '<stop offset="86%" stop-color="black" stop-opacity="0"/>' +
    '<stop offset="100%" stop-color="black" stop-opacity="1"/>' +
    '</linearGradient>' +
    '<linearGradient id="hy" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="black" stop-opacity="1"/>' +
    '<stop offset="16%" stop-color="black" stop-opacity="0"/>' +
    '<stop offset="84%" stop-color="black" stop-opacity="0"/>' +
    '<stop offset="100%" stop-color="black" stop-opacity="1"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#v)"/>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#hx)"/>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#hy)"/>' +
    '</svg>'
  );
}

// Webb's palette skews amber/rust; Toddl's galaxy wants a purple base
// like the classic M78 look. Each photo is blended with a luminance-
// preserving purple tint — stars stay white-hot, the gas goes violet.
const PURPLE = { r: 168, g: 105, b: 255 };

const JOBS = [
  // The home vista: Cosmic Cliffs of the Carina Nebula
  { src: 'carina_2800.jpg', out: 'carina.jpg', height: 1500,
    saturation: 1.4, brightness: 1.02, inner: 58, tint: 0.58 },
  // The showstopper: Tarantula Nebula star nursery
  { src: 'tarantula_2800.png', out: 'tarantula.jpg', height: 1500,
    saturation: 1.5, brightness: 1.0, inner: 55, tint: 0.48 },
  // Southern Ring planetary nebula
  { src: 'southern_nebula_2800.jpg', out: 'ring.jpg', height: 1300,
    saturation: 1.45, brightness: 1.0, inner: 50, tint: 0.5 },
  // Stephan's Quintet: five galaxies dancing
  { src: 'stephans_quintet_2800.jpg', out: 'quintet.jpg', height: 1400,
    saturation: 1.4, brightness: 1.0, inner: 52, tint: 0.5 }
];

(async () => {
  for (const job of JOBS) {
    const input = path.join(srcDir, job.src);
    const meta = await sharp(input).metadata();
    const scale = job.height / meta.height;
    const w = Math.round(meta.width * scale);

    const base = await sharp(input)
      .resize({ height: job.height })
      .modulate({ saturation: job.saturation, brightness: job.brightness })
      .toBuffer();

    // Purple layer: same image recolored by luminance, laid over the
    // original at partial opacity so hints of the source hues survive.
    const purple = await sharp(base)
      .tint(PURPLE)
      .ensureAlpha(job.tint)
      .png()
      .toBuffer();

    await sharp(base)
      .composite([
        { input: purple, blend: 'over' },
        { input: vignette(w, job.height, job.inner), blend: 'over' }
      ])
      .modulate({ saturation: 1.15 })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toFile(path.join(outDir, job.out));
    const kb = Math.round(fs.statSync(path.join(outDir, job.out)).size / 1024);
    console.log(job.out, w + 'x' + job.height, kb + 'KB');
  }
})();
