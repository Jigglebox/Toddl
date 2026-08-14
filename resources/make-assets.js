/* Rasterizes the SVG sources into the PNGs @capacitor/assets expects:
     resources/icon-only.png        1024x1024 (full icon)
     resources/icon-foreground.png  1024x1024 (Android adaptive foreground)
     resources/icon-background.png  1024x1024 (Android adaptive background)
     resources/splash.png           2732x2732
     resources/splash-dark.png      2732x2732
   Run: node resources/make-assets.js && npx capacitor-assets generate */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const R = __dirname;
const iconSvg = fs.readFileSync(path.join(R, 'icon.svg'));

// Android adaptive icons crop to a centered circle ~66% of the canvas,
// so the foreground artwork is the icon scaled down onto a transparent pad.
const FG_SCALE = 0.62;

const splashSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">' +
  '<rect width="2732" height="2732" fill="#faf6ef"/>' +
  '<circle cx="1240" cy="1300" r="330" fill="#a8bfd4" opacity="0.6"/>' +
  '<circle cx="1610" cy="1540" r="190" fill="#b7c9a8" opacity="0.65"/>' +
  '<circle cx="1600" cy="1090" r="125" fill="#e6b8b0" opacity="0.65"/>' +
  '<path d="M1055 1170 q46 -95 142 -121" fill="none" stroke="#ffffff" stroke-width="48" stroke-linecap="round" opacity="0.9"/>' +
  '</svg>'
);

(async () => {
  await sharp(iconSvg).resize(1024, 1024).png()
    .toFile(path.join(R, 'icon-only.png'));

  const fgSize = Math.round(1024 * FG_SCALE);
  const fg = await sharp(iconSvg).resize(fgSize, fgSize).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fg, gravity: 'centre' }]).png()
    .toFile(path.join(R, 'icon-foreground.png'));

  await sharp({ create: { width: 1024, height: 1024, channels: 4,
      background: '#faf6ef' } }).png()
    .toFile(path.join(R, 'icon-background.png'));

  await sharp(splashSvg).resize(2732, 2732).png()
    .toFile(path.join(R, 'splash.png'));
  // Toddl keeps its calm cream splash in dark mode too — no jarring flips.
  fs.copyFileSync(path.join(R, 'splash.png'), path.join(R, 'splash-dark.png'));

  console.log('resource PNGs written');
})();
