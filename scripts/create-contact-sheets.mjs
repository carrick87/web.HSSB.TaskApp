import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = '/opt/cursor/artifacts/final';
const OUTPUT_DIR = '/opt/cursor/artifacts/final';

const VIEWPORT_GROUPS = {
  'desktop': ['desktop-1920', 'desktop-1366'],
  'tablet': ['tablet-820'],
  'phone-light': ['phone-430', 'phone-390', 'phone-375', 'phone-412', 'phone-360'],
  'phone-dark': ['phone-430-dark', 'phone-390-dark', 'phone-375-dark', 'phone-412-dark', 'phone-360-dark'],
};

async function createContactSheet(groupName, viewports, pages) {
  const images = [];
  
  for (const vp of viewports) {
    for (const page of pages) {
      const filename = `admin-${page}-${vp}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      if (fs.existsSync(filepath)) {
        images.push(filepath);
      }
    }
  }

  if (images.length === 0) {
    console.log(`No images found for ${groupName}`);
    return;
  }

  const cols = Math.min(4, images.length);
  const rows = Math.ceil(images.length / cols);
  
  const thumbWidth = groupName.includes('desktop') ? 480 : 
                     groupName.includes('tablet') ? 400 : 200;
  const thumbHeight = groupName.includes('desktop') ? 270 : 
                      groupName.includes('tablet') ? 520 : 430;

  const composites = [];
  for (let i = 0; i < images.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    composites.push({
      input: await sharp(images[i])
        .resize(thumbWidth, thumbHeight, { fit: 'contain', background: '#f5f5f5' })
        .toBuffer(),
      left: col * (thumbWidth + 10) + 10,
      top: row * (thumbHeight + 10) + 10,
    });
  }

  const outputWidth = cols * (thumbWidth + 10) + 10;
  const outputHeight = rows * (thumbHeight + 10) + 10;

  await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 3,
      background: '#ffffff'
    }
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUTPUT_DIR, `contact-sheet-${groupName}.png`));

  console.log(`Created contact-sheet-${groupName}.png with ${images.length} images`);
}

const samplePages = ['dashboard', 'pmMyTasks', 'leaderboard', 'profile'];

for (const [groupName, viewports] of Object.entries(VIEWPORT_GROUPS)) {
  await createContactSheet(groupName, viewports, samplePages);
}

console.log('Done creating contact sheets');
