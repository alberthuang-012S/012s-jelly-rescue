import { drawText, roundedRect } from './utils.js';

const INK = '#334b65';
function panel(ctx, x, y, width, height, fill, radius = 12) {
  ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  roundedRect(ctx, x, y, width, height, radius); ctx.fill(); ctx.stroke();
}
function line(ctx, points, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function tree(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(41,74,71,.12)'; ctx.beginPath(); ctx.ellipse(3, 27, 28, 8, 0, 0, Math.PI * 2); ctx.fill();
  panel(ctx, -5, 0, 10, 25, '#bfa283', 3);
  for (const [dx, dy, radius, color] of [[-12, -7, 20, '#8cc2a1'], [13, -9, 22, '#94c9a7'], [0, -25, 24, '#a8d4b1']]) {
    ctx.fillStyle = color; ctx.strokeStyle = '#568473'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dx, dy, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function flower(ctx, x, y, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.26) * 5, y + Math.sin(i * 1.26) * 5, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff0b8'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
}

export function drawLifestyleMap(ctx, stage) {
  const { width, height } = stage.world;
  const sports = stage.theme === 'sports';
  ctx.save(); ctx.fillStyle = sports ? '#c3dfba' : '#d9e5cd'; ctx.fillRect(0, 0, width, height);
  for (let y = 25; y < height; y += 42) for (let x = 22; x < width; x += 46) {
    ctx.fillStyle = ((x + y) % 3) ? '#b8d7b6' : '#e3ead2';
    ctx.fillRect(x + Math.sin(y) * 9, y, 3, 6);
  }
  // Clear central avenue and cross links keep every activity zone accessible.
  if (sports) {
    line(ctx, [[310, 1030], [310, 160], [455, 160], [455, 1030], [310, 1030]], '#9caab3', 87);
    line(ctx, [[310, 1030], [310, 160], [455, 160], [455, 1030], [310, 1030]], '#d3ada0', 79);
    line(ctx, [[310, 1030], [310, 160], [455, 160], [455, 1030], [310, 1030]], '#f7e9d5', 2);
  }
  line(ctx, [[384, 1110], [384, 185]], '#c1b8a3', 143);
  line(ctx, [[384, 1110], [384, 185]], '#f2e7cf', 135);
  for (const y of [565, 895]) {
    line(ctx, [[60, y], [705, y]], '#c1b8a3', 75);
    line(ctx, [[60, y], [705, y]], '#f2e7cf', 67);
  }
  if (!sports) {
    panel(ctx, 275, 395, 218, 455, '#f5ead7', 35);
    for (let y = 215; y < 1100; y += 36) {
      line(ctx, [[335, y], [430, y]], '#ddd1bb', 1);
      ctx.fillStyle = '#ddd1bb'; ctx.fillRect(381, y, 1, 36);
    }
    panel(ctx, 90, 180, 588, 140, '#e8e6d1', 35);
    for (let x = 110; x < 665; x += 40) flower(ctx, x, 195, x % 80 ? '#bdaddc' : '#e7abc4');
  }
  for (const landmark of stage.landmarks) drawLandmark(ctx, landmark);
  // Decorative borders have no invisible collision walls.
  for (const x of [30, width - 30]) for (let y = 160; y < 1140; y += 150) tree(ctx, x, y, .7);
  for (const [x, y] of [[140, 1050], [640, 1090], [140, 210], [650, 200]]) tree(ctx, x, y);
  panel(ctx, 290, 1077, 190, 39, '#fff5df', 10);
  drawText(ctx, sports ? 'SPORTS · 入口' : 'CITY PLAZA · 入口', 385, 1096, { size: 16, color: INK });
  ctx.restore();
}

function drawLandmark(ctx, landmark) {
  const { x, y, width: w, height: h, kind, color, label } = landmark;
  ctx.save();
  if (['cafe', 'flowerShop', 'clothes'].includes(kind)) {
    ctx.fillStyle = 'rgba(55,67,78,.13)'; roundedRect(ctx, x + 8, y + 9, w, h, 10); ctx.fill();
    panel(ctx, x, y, w, h, '#fff1db');
    panel(ctx, x - 5, y - 12, w + 10, 33, color, 7);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 ? color : '#fff3de'; ctx.fillRect(x + i * w / 6, y + 23, w / 6, 14);
    }
    panel(ctx, x + 14, y + 43, w * .38, h - 54, '#b8d8df', 5);
    line(ctx, [[x + 14 + w * .19, y + 44], [x + 14 + w * .19, y + h - 12]], '#fff3de', 3);
    panel(ctx, x + w * .65, y + 44, w * .22, h - 44, '#c9b7a0', 4);
    drawText(ctx, label, x + w / 2, y + 5, { size: 18, color: INK });
    if (kind === 'flowerShop') for (let i = 0; i < 4; i += 1) flower(ctx, x + 15 + i * 22, y + h - 10, '#dfa8c8');
  } else if (kind === 'flowers') {
    panel(ctx, x, y, w, h, color, 25);
    line(ctx, [[x + 80, y + h], [x + 80, y + 25], [x + w - 80, y + 25], [x + w - 80, y + h]], '#a6bdab', 9);
    for (let i = 0; i < 10; i += 1) flower(ctx, x + 65 + i * 50, y + 20, i % 2 ? '#e7abc4' : '#b8a5dc');
    drawText(ctx, label, x + w / 2, y + 66, { size: 21, color: INK });
  } else if (kind === 'court') {
    panel(ctx, x, y, w, h, color, 10);
    ctx.strokeStyle = '#fdf5df'; ctx.lineWidth = 3; ctx.strokeRect(x + 14, y + 34, w - 28, h - 48);
    line(ctx, [[x + 14, y + h / 2], [x + w - 14, y + h / 2]], '#fdf5df', 3);
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 32, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(x + w / 2 - 33, y + 34, 66, 54); ctx.strokeRect(x + w / 2 - 33, y + h - 68, 66, 54);
    panel(ctx, x + w / 2 - 17, y + 26, 34, 5, '#eee3c8', 2);
    drawText(ctx, label, x + w / 2, y + 15, { size: 16, color: INK });
  } else if (kind === 'skate') {
    panel(ctx, x, y, w, h, color, 18);
    panel(ctx, x + 22, y + 45, w - 44, 66, '#d9dfea', 22);
    line(ctx, [[x + 26, y + 95], [x + 70, y + 76], [x + w - 70, y + 76], [x + w - 26, y + 95]], '#94a8bf', 4);
    line(ctx, [[x + 35, y + 218], [x + w - 35, y + 218]], '#90a1b9', 6);
    line(ctx, [[x + 55, y + 220], [x + 55, y + 239]], '#90a1b9', 4);
    drawText(ctx, label, x + w / 2, y + 22, { size: 16, color: INK });
  } else if (kind === 'fitness' || kind === 'grass') {
    panel(ctx, x, y, w, h, color, 22);
    drawText(ctx, label, x + w / 2, y + 20, { size: 16, color: INK });
    if (kind === 'grass') {
      panel(ctx, x + 30, y + 65, 100, 55, '#f5e4c6', 10);
      for (let i = 0; i < 5; i += 1) flower(ctx, x + 30 + i * 36, y + h - 32, '#e4afc6');
    } else line(ctx, [[x + 75, y + 80], [x + 75, y + 165], [x + 140, y + 165]], '#9fa7b5', 5);
  } else {
    panel(ctx, x, y, w, h, color, kind === 'table' ? 19 : 7);
    if (kind === 'bench') for (let i = 1; i < 4; i += 1) line(ctx, [[x + 8, y + i * 8], [x + w - 8, y + i * 8]], '#b59778', 2);
    if (kind === 'water') { ctx.fillStyle = '#e6f3f3'; ctx.fillRect(x + 12, y + 9, 26, 22); }
    if (label) drawText(ctx, label, x + w / 2, y + h / 2, { size: 15, color: INK });
  }
  ctx.restore();
}
