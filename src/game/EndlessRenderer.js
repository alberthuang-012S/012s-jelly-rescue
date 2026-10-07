// Static scenery is painted once into WorldRenderer's cached canvas.
// Sports markings, plaza mosaics and garden paths remain walkable surfaces.
const C = Object.freeze({
  ink: '#355363', grass: '#84bc83', grassLight: '#a0cb92', leaf: '#47845e',
  cream: '#fff2d4', paving: '#e7d6b5', joint: '#d6c19e', rose: '#d88485',
  blue: '#77b7bc', wood: '#a77d59', shadow: '#365d5930'
});
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function polygon(ctx, points, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function label(ctx, text, x, y, size = 16, color = C.ink) {
  ctx.fillStyle = color; ctx.font = 'bold ' + size + 'px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}
function hash(x, y) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}
function tree(ctx, x, y, variant = 0) {
  ellipse(ctx, x + 8, y + 29, 37, 12, C.shadow);
  rect(ctx, x - 8, y, 16, 41, '#815f4a');
  rect(ctx, x - 6, y + 2, 5, 35, '#b3946b');
  polygon(ctx, [[x - 3, y + 12], [x - 21, y], [x - 17, y - 5], [x + 2, y + 4]], '#815f4a');
  const colors = variant ? ['#588867', '#679a73', '#81ad7f', '#a4c78e'] : ['#3c765a', '#488764', '#5b9b6d', '#85b677'];
  for (let dy = -48; dy <= 12; dy += 6) for (let dx = -42; dx <= 42; dx += 6) {
    const radius = (dx * dx / 1700 + (dy + 17) * (dy + 17) / 940);
    if (radius > 1 + (hash(dx + x, dy + y) % 3) * .025) continue;
    const edge = radius > .78;
    const shade = edge ? 0 : dx < 0 && dy < -18 ? 2 + (hash(dx, dy) % 5 === 0 ? 1 : 0) : 1 + (hash(dx, dy) % 4 === 0 ? 1 : 0);
    rect(ctx, x + dx, y + dy, 6, 6, colors[shade]);
  }
  for (let i = 0; i < 4; i++) rect(ctx, x - 25 + i * 7, y - 28 - i % 2 * 8, 8, 4, colors[3]);
}
function flowers(ctx, x, y, w, h, pink = false) {
  rect(ctx, x + 4, y + 5, w, h, C.shadow);
  rect(ctx, x - 3, y - 3, w + 6, h + 6, '#b49476');
  rect(ctx, x - 1, y - 1, w + 2, h + 2, '#f5dfb8');
  rect(ctx, x, y, w, h, '#567e58');
  for (let row = 8; row < h; row += 13) for (let col = 8; col < w - 3; col += 14) {
    const color = (col + row) % 3 ? (pink ? '#eaa4af' : '#c9a6db') : '#fff0b2';
    rect(ctx, x + col, y + row, 3, 7, '#87b37b');
    rect(ctx, x + col - 3, y + row - 2, 9, 3, color);
    rect(ctx, x + col, y + row - 5, 3, 9, color);
    rect(ctx, x + col, y + row - 2, 3, 3, '#f7d277');
  }
}
function pot(ctx, x, y, color = '#dda18e') {
  ellipse(ctx, x + 3, y + 10, 15, 5, C.shadow);
  polygon(ctx, [[x - 11, y - 3], [x + 11, y - 3], [x + 8, y + 13], [x - 8, y + 13]], color);
  rect(ctx, x - 13, y - 5, 26, 5, '#f0c0a0');
  for (const [dx, dy] of [[-7, -12], [3, -17], [10, -8], [-2, -6]]) {
    rect(ctx, x + dx - 6, y + dy, 12, 7, '#5d9362'); rect(ctx, x + dx - 3, y + dy, 7, 3, '#9abd79');
  }
}
function bench(ctx, b) {
  const { x, y, width: w, height: h } = b;
  rect(ctx, x + 5, y + 7, w, h, C.shadow);
  rect(ctx, x + 9, y + 10, 8, h + 10, '#506777'); rect(ctx, x + w - 17, y + 10, 8, h + 10, '#506777');
  rect(ctx, x, y, w, h, '#745d4d');
  for (let row = 2; row < h; row += 7) {
    rect(ctx, x + 2, y + row, w - 4, 5, '#b58d61');
    rect(ctx, x + 4, y + row, w - 8, 2, '#d4b282');
  }
  for (const dx of [12, w - 14]) rect(ctx, x + dx, y + 4, 3, 3, '#746657');
}
function lamp(ctx, x, y) {
  ellipse(ctx, x + 6, y + 15, 15, 5, C.shadow);
  rect(ctx, x - 4, y - 42, 8, 61, '#4f6873'); rect(ctx, x - 8, y + 16, 16, 5, '#4f6873');
  rect(ctx, x - 10, y - 62, 20, 24, '#3e5b68'); rect(ctx, x - 7, y - 58, 14, 16, '#f9df9d');
  rect(ctx, x - 1, y - 58, 3, 16, '#d9bb78');
  polygon(ctx, [[x - 14, y - 63], [x, y - 71], [x + 14, y - 63]], '#4f6873');
}
function paving(ctx, x, y, w, h) {
  rect(ctx, x, y, w, h, '#b49c7f');
  rect(ctx, x + 4, y + 4, w - 8, h - 8, '#f2e2c1');
  rect(ctx, x + 9, y + 9, w - 18, h - 18, C.paving);
  ctx.save();ctx.beginPath();ctx.rect(x + 9, y + 9, w - 18, h - 18);ctx.clip();
  for (let row = 0; row * 24 < h; row++) for (let col = -1; col * 32 < w; col++) {
    const tx = x + col * 32 + (row % 2 ? 16 : 0), ty = y + row * 24;
    rect(ctx, tx, ty, 31, 23, hash(col, row) % 7 ? C.paving : '#ebdcbe');
    rect(ctx, tx, ty + 22, 31, 1, C.joint); rect(ctx, tx + 30, ty, 1, 23, C.joint);
    rect(ctx, tx + 3, ty + 2, 23, 1, '#f3e5c9');
  }
  ctx.restore();
}
function windowPane(ctx, x, y, w, h) {
  rect(ctx, x - 3, y - 3, w + 6, h + 6, '#816f64'); rect(ctx, x, y, w, h, '#7cbbc4');
  polygon(ctx, [[x + 3, y + 3], [x + w - 3, y + 3], [x + 3, y + h - 5]], '#a3d2d0');
  rect(ctx, x + w / 2 - 2, y, 4, h, C.cream); rect(ctx, x, y + h / 2 - 1, w, 3, C.cream);
  rect(ctx, x - 6, y + h + 1, w + 12, 5, '#cfb99a');
}
function building(ctx, b, cafe) {
  const { x, y, width: w, height: h } = b;
  const roof = cafe ? ['#8e625e', '#b7726d', '#cf8d81', '#e2a090'] : ['#5e7479', '#7d989a', '#96aeaa', '#bad0b9'];
  rect(ctx, x + 9, y + 10, w + 3, h + 5, C.shadow);
  rect(ctx, x, y, w, h, '#b29c84');rect(ctx, x + 3, y + 3, w - 6, h - 6, '#f2e4c5');
  rect(ctx, x + w - 16, y + 3, 13, h - 6, '#d2bea0');
  for (let row = 40; row < h - 6; row += 15) for (let col = 6; col < w - 18; col += 23) {
    if (hash(col, row) % 3 === 0) rect(ctx, x + col, y + row, 17, 1, '#dcccad');
  }
  polygon(ctx, [[x - 10, y + 13], [x + 9, y - 42], [x + w - 9, y - 42], [x + w + 10, y + 13]], roof[0]);
  for (let row = 0; row < 6; row++) {
    const inset = 8 - row * 3;
    rect(ctx, x + inset, y - 38 + row * 8, w - inset * 2, 7, roof[1 + row % 2]);
    for (let col = x + inset + 7; col < x + w - inset; col += 18) rect(ctx, col, y - 37 + row * 8, 2, 6, roof[0]);
  }
  rect(ctx, x + 6, y - 45, w - 12, 5, roof[3]);
  rect(ctx, x - 12, y + 10, w + 24, 6, roof[0]); rect(ctx, x - 8, y + 11, w + 16, 2, roof[3]);
  rect(ctx, x + w - 42, y - 58, 18, 24, '#d1b59e');rect(ctx, x + w - 45, y - 59, 24, 5, '#efe0c2');
  windowPane(ctx, x + 13, y + 58, 67, 47);
  rect(ctx, x + 101, y + 54, 36, 66, '#7e7770'); rect(ctx, x + 105, y + 58, 28, 58, '#b0bda9');
  rect(ctx, x + 108, y + 61, 22, 24, '#90c1c6');rect(ctx, x + 128, y + 95, 3, 3, '#f7dfad');
  rect(ctx, x + 97, y + h - 6, 45, 6, '#d6c1a0'); rect(ctx, x + 91, y + h, 55, 5, '#f2dfbb');
  const awning = cafe ? '#d59193' : '#a0b3cf';
  rect(ctx, x + 8, y + 43, 81, 13, '#685954');
  polygon(ctx, [[x + 8, y + 37], [x + 89, y + 37], [x + 95, y + 54], [x + 2, y + 54]], awning);
  for (let i = 0; i < 6; i++) {
    rect(ctx, x + 3 + i * 15, y + 52, 14, 7, i % 2 ? '#fff1d6' : awning);
  }
  rect(ctx, x + 22, y + 20, w - 44, 18, '#baa185');rect(ctx, x + 24, y + 21, w - 48, 14, '#fff0cf');
  label(ctx, cafe ? '廣場咖啡' : '花日子', x + w / 2, y + 32, 13);
  pot(ctx, x + 8, y + h - 10);pot(ctx, x + w - 10, y + h - 10, '#a898bd');
  if (cafe) {
    // Tiny cup decal and a menu board are outside the main rescue lanes.
    rect(ctx, x + 43, y + 75, 17, 14, '#fff3d4');rect(ctx, x + 60, y + 78, 5, 8, '#fff3d4');
    rect(ctx, x + 62, y + 80, 2, 4, '#8fc3c7');rect(ctx, x + 42, y + 90, 24, 3, '#f8e4bf');
    rect(ctx, x + 20, y + h + 9, 27, 32, '#a27d5a');rect(ctx, x + 23, y + h + 12, 21, 25, '#45686a');
    for (let row = 0; row < 3; row++)rect(ctx, x + 27, y + h + 17 + row * 6, 13, 2, '#cdd9b5');
  } else {
    flowers(ctx, x + 24, y + h + 9, 98, 20, true);
  }
}
function cafeTerrace(ctx) {
  rect(ctx, 89, 376, 98, 18, '#ceb899');rect(ctx, 92, 378, 92, 14, '#dfc9a5');
  ellipse(ctx, 137, 360, 24, 10, C.shadow);
  rect(ctx, 134, 339, 6, 25, '#8a7057');ellipse(ctx, 137, 336, 24, 9, '#a77e5f');ellipse(ctx, 135, 332, 24, 9, '#e3c28d');
  for (const x of [103, 165]) { rect(ctx, x - 8, 334, 16, 15, '#aa8865');rect(ctx, x - 8, 334, 16, 3, '#e4c598');rect(ctx, x - 5, 348, 3, 11, '#8c745a');rect(ctx, x + 3, 348, 3, 11, '#8c745a'); }
  rect(ctx, 132, 325, 7, 7, '#fff3d5');rect(ctx, 142, 327, 4, 4, '#f0b5a3');
}
function court(ctx) {
  rect(ctx, 104, 717, 147, 143, '#b6977b');rect(ctx, 108, 721, 139, 135, '#6dafa6');
  rect(ctx, 112, 725, 131, 127, '#7fbdb0');rect(ctx, 116, 729, 123, 119, '#8bc5b3');
  ctx.strokeStyle = '#e9f2d2'; ctx.lineWidth = 3;ctx.strokeRect(122, 735, 111, 110);
  ctx.beginPath();ctx.moveTo(122, 790);ctx.lineTo(233, 790);ctx.stroke();
  ctx.beginPath();ctx.arc(177.5, 790, 24, 0, Math.PI * 2);ctx.stroke();
  ctx.strokeRect(153, 735, 49, 22);ctx.strokeRect(153, 823, 49, 22);
  rect(ctx, 174, 702, 6, 25, '#536f77');rect(ctx, 152, 701, 49, 21, '#586f78');
  rect(ctx, 156, 704, 41, 14, '#eee9d5');rect(ctx, 170, 706, 14, 9, '#be9980');
  rect(ctx, 164, 719, 27, 4, '#cd946c');rect(ctx, 168, 723, 18, 6, '#efe2c4');
  rect(ctx, 118, 866, 119, 17, '#eee0ba');label(ctx, 'SPORTS', 177, 878, 11, '#628479');
}
function garden(ctx) {
  rect(ctx, 574, 719, 91, 139, '#bca888');rect(ctx, 578, 723, 83, 131, '#efe1bf');
  flowers(ctx, 583, 731, 73, 32, true);flowers(ctx, 583, 815, 73, 32);
  for (let y = 774; y < 808; y += 12) for(let x = 585; x < 654; x += 19)rect(ctx, x, y, 16, 10, '#ddc9a9');
  rect(ctx, 594, 778, 48, 22, '#d4c69f');label(ctx, 'FLOWER', 619, 793, 10, '#7b8767');
}
function emblem(ctx) {
  ellipse(ctx, 384, 655, 101, 101, '#b7b49b');
  ellipse(ctx, 384, 655, 96, 96, '#f4e9cd');ellipse(ctx, 384, 655, 89, 89, '#d5d6bc');
  ellipse(ctx, 384, 655, 80, 80, '#e9e3c6');
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    rect(ctx, 382 + Math.cos(angle) * 88, 653 + Math.sin(angle) * 88, 4, 4, '#829d94');
  }
  polygon(ctx, [[384, 598], [442, 655], [384, 713], [326, 655]], '#acc4b5');
  polygon(ctx, [[384, 607], [433, 655], [384, 704], [335, 655]], '#d6e2cd');
  rect(ctx, 371, 620, 26, 70, '#8fb6aa');rect(ctx, 349, 642, 70, 26, '#8fb6aa');
  rect(ctx, 375, 624, 8, 61, '#bed5bd');rect(ctx, 353, 646, 62, 6, '#bed5bd');
}
function gate(ctx) {
  for (const x of [287, 471]) {
    rect(ctx, x, 1020, 10, 71, '#8e755d');rect(ctx, x - 3, 1020, 16, 6, '#d1b58a');
    pot(ctx, x + 5, 1100);
  }
  rect(ctx, 282, 1018, 204, 10, '#91735a');rect(ctx, 285, 1018, 198, 3, '#ddbf90');
  rect(ctx, 310, 1008, 149, 34, '#967d62');rect(ctx, 314, 1011, 141, 26, '#fff0cc');
  label(ctx, '中央廣場 · 入口', 384, 1031, 14);
}
export function drawEndlessPlaza(ctx, stage) {
  ctx.save();ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, 768, 1152, C.grass);
  for (let y = 12; y < 1152; y += 19) for (let x = 8; x < 768; x += 23) {
    const jitter = hash(x,y);
    if (jitter % 3)rect(ctx, x + jitter % 9, y + jitter % 6, 3, 2, jitter % 5 ? '#95c58b' : '#6fa978');
    if (jitter % 17 === 0)rect(ctx, x + 5, y + 5, 2, 4, '#bad39b');
  }
  // The border reads as a town garden; the central approach remains open.
  for (const x of [12, 734]) {
    rect(ctx, x, 52, 22, 1048, '#66996e');
    for(let y = 58; y < 1100; y += 16)rect(ctx, x + 3, y, 16, 9, '#75a779');
  }
  for (let x = 48; x < 720; x += 34) {
    if (x > 298 && x < 466)continue;
    rect(ctx, x, 79, 5, 24, '#bda987');rect(ctx, x - 11, 88, 28, 4, '#e4d4b1');
  }
  paving(ctx, 82, 366, 604, 579);
  paving(ctx, 328, 303, 112, 736);
  paving(ctx, 44, 592, 680, 104);
  // Repaint the plaza interior so crossing seams do not cut through the square.
  paving(ctx, 88, 372, 592, 567);
  emblem(ctx);
  court(ctx);garden(ctx);
  building(ctx, stage.obstacles[0], true);building(ctx, stage.obstacles[1], false);
  cafeTerrace(ctx);
  for(const b of stage.obstacles.filter((prop) => prop.kind === 'bench'))bench(ctx,b);
  for (const y of [143, 434, 706, 1016]) { tree(ctx, 35, y); tree(ctx, 733, y, 1); }
  for(const [x,y,v]of [[261,267,0],[507,267,1],[239,1058,0],[529,1058,1]])tree(ctx,x,y,v);
  for(const [x,y]of [[75,520],[694,520],[249,963],[519,963]])lamp(ctx,x,y);
  flowers(ctx, 86, 1029, 104, 34, true);flowers(ctx, 578, 1029, 104, 34);
  flowers(ctx, 306, 215, 155, 30, true);
  // A low sign keeps the title readable while leaving the northern path clear.
  rect(ctx, 248, 108, 278, 59, C.shadow);rect(ctx, 244, 102, 280, 60, '#9a8265');
  rect(ctx, 248, 106, 272, 51, '#fff0cf');rect(ctx, 252, 110, 264, 3, '#e7cf9e');
  rect(ctx, 262, 162, 8, 21, '#a58a68');rect(ctx, 498, 162, 8, 21, '#a58a68');
  label(ctx, '救援中央廣場', 384, 139, 23);
  label(ctx, 'JELLY RESCUE CENTRAL', 384, 196, 11, '#527865');
  gate(ctx);
  ctx.restore();
}
