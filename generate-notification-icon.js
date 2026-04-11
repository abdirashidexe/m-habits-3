const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const SIZE = 96;
const outDir = path.join(__dirname, 'assets', 'images');
const outPath = path.join(outDir, 'notification-icon.png');

fs.mkdirSync(outDir, { recursive: true });

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Crescent: white disk with a slightly smaller disk subtracted (destination-out)
const cx = 40;
const cy = 48;
const outerR = 36;

ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
ctx.fill();

ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(cx + 16, cy, 30, 0, Math.PI * 2);
ctx.fill();

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log('Wrote', outPath, `(${SIZE}x${SIZE} PNG, transparent background)`);
