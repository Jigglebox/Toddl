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

function alphaVignette(w, h, innerPct) {
  // White-with-gradient-opacity mask, applied dest-in: multiplies the
  // image's alpha so it dissolves to fully transparent at the edges.
  return Buffer.from(
    '<svg width="' + w + '" height="' + h + '">' +
    '<defs>' +
    '<radialGradient id="v" cx="50%" cy="50%" r="72%">' +
    '<stop offset="' + innerPct + '%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="88%" stop-color="white" stop-opacity="0.5"/>' +
    '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
    '</radialGradient>' +
    '</defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#v)"/>' +
    '</svg>'
  );
}

// RGB buffer -> WebP with luminance-derived alpha: bright nebula stays
// opaque, dim gas goes translucent, black space becomes fully
// transparent - composites over anything with no blend tricks.
async function toAlphaWebp(rgbBuffer, w, h, innerPct, outFile, seamlessX) {
  const lum = await sharp(rgbBuffer)
    .greyscale()
    .linear(2.4, 6)          // alpha boost: mid-bright is fully opaque
    .toBuffer();
  const rgba = await sharp(rgbBuffer)
    .joinChannel(lum)
    .png()
    .toBuffer();
  // Sequential dest-in composites multiply the masks: radial falloff
  // AND full fades on every straight edge — no seam can survive.
  const edgeX = Buffer.from(
    '<svg width="' + w + '" height="' + h + '"><defs>' +
    '<linearGradient id="e" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="white" stop-opacity="0"/>' +
    '<stop offset="16%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="84%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#e)"/></svg>');
  const edgeY = Buffer.from(
    '<svg width="' + w + '" height="' + h + '"><defs>' +
    '<linearGradient id="e" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="white" stop-opacity="0"/>' +
    '<stop offset="18%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="82%" stop-color="white" stop-opacity="1"/>' +
    '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#e)"/></svg>');
  // A horizontally-tiling image (the mirror-tiled haze) must keep
  // full alpha at its left/right edges or the tiling shows bands.
  var masks = seamlessX
    ? [{ input: edgeY, blend: 'dest-in' }]
    : [
        { input: alphaVignette(w, h, innerPct), blend: 'dest-in' },
        { input: edgeX, blend: 'dest-in' },
        { input: edgeY, blend: 'dest-in' }
      ];
  await sharp(rgba)
    .composite(masks)
    .webp({ quality: 80, alphaQuality: 65 })
    .toFile(outFile);
}

// Webb's palette skews amber/rust; Toddl's galaxy wants a purple base
// like the classic M78 look. Each photo is blended with a luminance-
// preserving purple tint — stars stay white-hot, the gas goes violet.
const PURPLE = { r: 168, g: 105, b: 255 };

const JOBS = [
  // The home vista: Cosmic Cliffs of the Carina Nebula
  { src: 'carina_2800.jpg', out: 'carina.webp', height: 1500,
    saturation: 1.4, brightness: 1.02, inner: 58, tint: 0.58 },
  // The showstopper: Tarantula Nebula star nursery
  { src: 'tarantula_2800.png', out: 'tarantula.webp', height: 1500,
    saturation: 1.5, brightness: 1.0, inner: 55, tint: 0.48 },
  // Southern Ring planetary nebula
  { src: 'southern_nebula_2800.jpg', out: 'ring.webp', height: 1300,
    saturation: 1.45, brightness: 1.0, inner: 50, tint: 0.5 },
  // Stephan's Quintet: five galaxies dancing
  { src: 'stephans_quintet_2800.jpg', out: 'quintet.webp', height: 1400,
    saturation: 1.4, brightness: 1.0, inner: 52, tint: 0.5 }
];

// Depth-layer extras built FROM the graded outputs:
//  - haze.jpg: the whole sky's far layer — hugely blurred nebula wash
//  - wisp-*.jpg: crisp fragments for the near "pops out at you" layer
//    and for bridging the gaps so the band reads as one nebula
async function makeDepthLayers() {
  const g = f => path.join(outDir, f);

  // The true background of the sky: Webb's First Deep Field —
  // thousands of real galaxies. Dimmed so it reads as distance,
  // opaque (it IS the backdrop), mirror-tiled at runtime.
  const dfBase = await sharp(path.join(srcDir, 'deep_field_2800.jpg'))
    .resize({ height: 1600 })
    .modulate({ saturation: 1.3, brightness: 0.72 })
    .toBuffer();
  const dfPurple = await sharp(dfBase)
    .tint(PURPLE)
    .ensureAlpha(0.45)
    .png()
    .toBuffer();
  await sharp(dfBase)
    .composite([{ input: dfPurple, blend: 'over' }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(g('deepfield.jpg'));
  console.log('deepfield.jpg',
    Math.round(fs.statSync(g('deepfield.jpg')).size / 1024) + 'KB');

  const hazeRgb = await sharp(g('tarantula.webp'))
    .flatten({ background: '#000000' })
    .resize(2048, 1440, { fit: 'cover' })
    .blur(46)
    .modulate({ brightness: 0.85, saturation: 1.2 })
    .toBuffer();
  await toAlphaWebp(hazeRgb, 2048, 1440, 55, g('haze.webp'), true);
  console.log('haze.webp 2048x1440',
    Math.round(fs.statSync(g('haze.webp')).size / 1024) + 'KB');

  const crops = [
    { src: 'carina.webp', out: 'wisp-a.webp', left: 0.30, top: 0.48, w: 0.42, h: 0.5 },
    { src: 'tarantula.webp', out: 'wisp-b.webp', left: 0.24, top: 0.2, w: 0.45, h: 0.55 },
    { src: 'ring.webp', out: 'wisp-c.webp', left: 0.2, top: 0.15, w: 0.6, h: 0.65 },
    { src: 'quintet.webp', out: 'wisp-d.webp', left: 0.15, top: 0.1, w: 0.62, h: 0.6 }
  ];
  for (const c of crops) {
    const meta = await sharp(g(c.src)).metadata();
    const region = {
      left: Math.round(meta.width * c.left),
      top: Math.round(meta.height * c.top),
      width: Math.round(meta.width * c.w),
      height: Math.round(meta.height * c.h)
    };
    const outW = 760;
    const outH = Math.round(outW * region.height / region.width);
    const rgb = await sharp(g(c.src))
      .flatten({ background: '#000000' })
      .extract(region)
      .resize(outW, outH)
      .toBuffer();
    await toAlphaWebp(rgb, outW, outH, 34, g(c.out));
    console.log(c.out, outW + 'x' + outH,
      Math.round(fs.statSync(g(c.out)).size / 1024) + 'KB');
  }
}

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

    const graded = await sharp(base)
      .composite([{ input: purple, blend: 'over' }])
      .modulate({ saturation: 1.15 })
      .toBuffer();
    await toAlphaWebp(graded, w, job.height, job.inner,
      path.join(outDir, job.out));
    const kb = Math.round(fs.statSync(path.join(outDir, job.out)).size / 1024);
    console.log(job.out, w + 'x' + job.height, kb + 'KB');
  }
  await makeDepthLayers();
})();
