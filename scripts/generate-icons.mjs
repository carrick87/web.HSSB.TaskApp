import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

mkdirSync(iconsDir, { recursive: true });

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0052CC"/>
  <text x="256" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="240" font-weight="700" fill="white">HS</text>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0052CC"/>
  <text x="256" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="200" font-weight="700" fill="white">HS</text>
</svg>`;

async function generateIcons() {
  const sizes = [192, 512];
  
  for (const size of sizes) {
    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}.png`));
    
    await sharp(Buffer.from(maskableSvg))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-maskable-${size}.png`));
    
    console.log(`Generated ${size}x${size} icons`);
  }

  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, 'apple-touch-icon.png'));
  
  console.log('Generated apple-touch-icon.png');

  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile(join(iconsDir, 'favicon-32x32.png'));
  
  await sharp(Buffer.from(iconSvg))
    .resize(16, 16)
    .png()
    .toFile(join(iconsDir, 'favicon-16x16.png'));
  
  console.log('Generated favicons');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
