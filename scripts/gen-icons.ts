// Generate PWA icon PNGs from public/icons/icon.svg.
//   npx tsx scripts/gen-icons.ts
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS = join(__dirname, '..', 'public', 'icons');

async function main() {
  const svg = await readFile(join(ICONS, 'icon.svg'));

  // Standard "any" icons.
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(join(ICONS, `icon-${size}.png`));
  }

  // Maskable icon: shrink the mark to ~78% inside the safe zone on an ink field.
  const inner = Math.round(512 * 0.78);
  const padded = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#1c1a17' },
  })
    .composite([{ input: padded, gravity: 'centre' }])
    .png()
    .toFile(join(ICONS, 'icon-maskable-512.png'));

  // Apple touch icon (iOS uses 180×180; it applies its own rounding mask).
  await sharp(svg).resize(180, 180).png().toFile(join(ICONS, 'apple-touch-icon.png'));

  // Favicon.
  await sharp(svg).resize(32, 32).png().toFile(join(ICONS, '..', 'favicon.png'));

  await writeFile(join(ICONS, '.gitkeep'), '');
  console.log('✓ Generated PWA icons in public/icons/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
