// This script generates simple PNG icons for the extension
// Run with: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple 1x1 blue PNG as base64 for each size
// In production, you'd use proper icon design tools

const sizes = [16, 32, 48, 128];
const iconDir = path.join(__dirname, 'icons');

// Create a simple HTML file that will display the icons
// For now, create placeholder files
sizes.forEach(size => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.19)}" fill="url(#grad)"/>
  <path d="${generateHousePath(size)}" fill="white"/>
</svg>`;

  fs.writeFileSync(path.join(iconDir, `icon${size}.svg`), svgContent);
  console.log(`Created icon${size}.svg`);
});

function generateHousePath(size) {
  const scale = size / 128;
  const cx = 64 * scale;
  const top = 28 * scale;
  const left = 28 * scale;
  const right = 100 * scale;
  const roofBottom = 56 * scale;
  const bottom = 100 * scale;
  const doorLeft = 48 * scale;
  const doorRight = 80 * scale;
  const doorTop = 76 * scale;

  return `M${cx} ${top}L${left} ${roofBottom}v${(bottom - roofBottom) * 0.88}a${4 * scale} ${4 * scale} 0 00${4 * scale} ${4 * scale}h${24 * scale}V${doorTop}h${16 * scale}v${bottom - doorTop + 4 * scale}h${24 * scale}a${4 * scale} ${4 * scale} 0 00${4 * scale}-${4 * scale}V${roofBottom}L${cx} ${top}z`;
}

console.log('Icons generated! Note: Chrome requires PNG icons.');
console.log('For production, convert these SVGs to PNGs using a tool like Inkscape or an online converter.');
