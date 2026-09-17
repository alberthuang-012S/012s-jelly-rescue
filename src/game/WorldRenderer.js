import { PALETTE } from './constants.js';
import { drawText, roundedRect } from './utils.js';

export class WorldRenderer {
  draw(ctx, stage, now) {
    if (stage.id === 'mountain') this.drawMountain(ctx, stage, now);
    else this.drawPark(ctx, stage, now);
  }

  drawPark(ctx, stage, now) {
    const { width, height } = stage.world;
    ctx.fillStyle = '#8bd0a6';
    ctx.fillRect(0, 0, width, height);
    this.drawGrassTexture(ctx, width, height, '#76bd98');
    ctx.fillStyle = '#e9d3a1';
    roundedRect(ctx, -20, 386, width + 40, 146, 48); ctx.fill();
    roundedRect(ctx, 270, 215, 120, 560, 38); ctx.fill();
    roundedRect(ctx, 1000, 382, 470, 118, 38); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundedRect(ctx, -20, 399, width + 40, 12, 5); ctx.fill();
    roundedRect(ctx, 283, 229, 12, 530, 5); ctx.fill();
    this.drawPond(ctx, 55, 105, 230, 135);
    this.drawFountain(ctx, 675, 350, 250, 150, now);
    this.drawTrees(ctx, [[112, 275], [185, 740], [340, 110], [500, 125], [1190, 115], [1430, 120], [1500, 720], [1040, 750], [105, 680]]);
    this.drawTrees(ctx, [[430, 745], [580, 760], [1470, 565]], true);
    this.drawBench(ctx, 430, 370, 0.95);
    this.drawBench(ctx, 1040, 550, -0.1);
    this.drawPicnic(ctx, 1090, 185);
    this.drawPicnic(ctx, 1245, 255, true);
    this.drawPlayground(ctx, 1180, 640);
    this.drawFlowerBed(ctx, 420, 225, 90);
    this.drawFlowerBed(ctx, 970, 170, 80);
    this.drawSign(ctx, 170, 350, 'JELLY PARK');
    this.drawMapLabel(ctx, '公園入口', 115, 550);
    this.drawMapLabel(ctx, '樹蔭草地', 430, 115);
    this.drawMapLabel(ctx, '中央噴水池', 800, 314);
    this.drawMapLabel(ctx, '野餐區', 1190, 105);
    this.drawMapLabel(ctx, '遊戲區', 1300, 860);
    this.drawPathDashes(ctx, 80, 455, 1450, 455, '#d0b77f');
    this.drawPathDashes(ctx, 80, 640, 1450, 640, '#d0b77f');
  }

  drawMountain(ctx, stage, now) {
    const { width, height } = stage.world;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#9bd6e0'); sky.addColorStop(0.55, '#7eb89c'); sky.addColorStop(1, '#6b9a78');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    this.drawMountainSilhouettes(ctx, width, height);
    this.drawGrassTexture(ctx, width, height, '#588c76');
    ctx.fillStyle = '#d5bc8c';
    ctx.beginPath();
    ctx.moveTo(80, 910); ctx.quadraticCurveTo(300, 760, 475, 645); ctx.quadraticCurveTo(650, 540, 845, 510); ctx.quadraticCurveTo(1050, 460, 1235, 330); ctx.quadraticCurveTo(1410, 205, 1630, 135);
    ctx.lineTo(1700, 250); ctx.quadraticCurveTo(1430, 390, 1270, 490); ctx.quadraticCurveTo(1040, 630, 860, 660); ctx.quadraticCurveTo(620, 695, 490, 800); ctx.quadraticCurveTo(290, 950, 80, 970); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 243, 194, .45)'; ctx.lineWidth = 14; ctx.stroke();
    ctx.strokeStyle = '#b49770'; ctx.lineWidth = 2; ctx.setLineDash([12, 12]); ctx.stroke(); ctx.setLineDash([]);
    this.drawPines(ctx, [[150, 700], [235, 625], [315, 300], [420, 190], [555, 255], [660, 330], [710, 780], [850, 300], [970, 245], [1100, 280], [1260, 580], [1460, 430], [1600, 390]]);
    this.drawPines(ctx, [[110, 910], [250, 790], [600, 810], [1000, 840], [1450, 720]], true);
    this.drawRestPlatform(ctx, 650, 410);
    this.drawCliffRocks(ctx, 355, 230, 180, 110);
    this.drawCliffRocks(ctx, 1040, 700, 260, 125);
    this.drawLookout(ctx, 1310, 100, now);
    this.drawTrailSign(ctx, 260, 735, 'FOREST TRAIL');
    this.drawTrailSign(ctx, 1040, 400, 'ROCK SLOPE');
    this.drawMapLabel(ctx, '登山口', 105, 865);
    this.drawMapLabel(ctx, '森林步道', 445, 375);
    this.drawMapLabel(ctx, '休息平台', 760, 445);
    this.drawMapLabel(ctx, '岩石坡', 1090, 350);
    this.drawMapLabel(ctx, '山頂觀景台', 1440, 92);
  }

  drawGrassTexture(ctx, width, height, color) {
    ctx.save();
    ctx.fillStyle = color;
    for (let y = 26; y < height; y += 42) {
      for (let x = 18 + ((y / 42) % 2) * 18; x < width; x += 52) {
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, 2, 2);
        ctx.fillRect(x + 11, y + 8, 2, 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  drawPond(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = '#59bfc9'; ctx.strokeStyle = '#e5d5aa'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = 2;
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath(); ctx.ellipse(x + 56 + index * 50, y + 60 + (index % 2) * 20, 24, 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  drawFountain(ctx, x, y, width, height, now) {
    ctx.save();
    ctx.fillStyle = '#58b9c5'; ctx.strokeStyle = '#e6d6a6'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9b778'; roundedRect(ctx, x + 76, y + 34, 98, 70, 18); ctx.fill();
    ctx.fillStyle = '#f2d28e'; ctx.beginPath(); ctx.arc(x + 125, y + 34, 25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(244, 252, 255, .8)'; ctx.lineWidth = 3;
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath(); ctx.moveTo(x + 125, y + 35); ctx.quadraticCurveTo(x + 95 + index * 15, y + 8 + Math.sin(now * 0.003 + index) * 5, x + 68 + index * 28, y + 28); ctx.stroke();
    }
    ctx.restore();
  }

  drawTrees(ctx, trees, small = false) {
    trees.forEach(([x, y], index) => this.drawTree(ctx, x, y, small ? 0.72 : 1 + (index % 3) * 0.08));
  }

  drawTree(ctx, x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(25, 64, 63, .2)'; ctx.beginPath(); ctx.ellipse(0, 20, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#805f4b'; roundedRect(ctx, -7, -8, 14, 42, 6); ctx.fill();
    ctx.fillStyle = '#4f9a78'; ctx.beginPath(); ctx.arc(-16, -24, 24, 0, Math.PI * 2); ctx.arc(14, -24, 27, 0, Math.PI * 2); ctx.arc(0, -48, 29, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#76b58c'; ctx.beginPath(); ctx.arc(-7, -55, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawBench(ctx, x, y, rotation = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    ctx.fillStyle = 'rgba(36, 62, 67, .18)'; ctx.fillRect(-35, 9, 70, 7);
    ctx.fillStyle = '#9b6c4c'; roundedRect(ctx, -38, -3, 76, 14, 5); ctx.fill();
    ctx.fillStyle = '#b98057'; roundedRect(ctx, -36, -19, 72, 12, 4); ctx.fill();
    ctx.strokeStyle = '#584d52'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-25, 9); ctx.lineTo(-25, 25); ctx.moveTo(25, 9); ctx.lineTo(25, 25); ctx.stroke(); ctx.restore();
  }

  drawPicnic(ctx, x, y, alternate = false) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(36, 62, 67, .15)'; ctx.beginPath(); ctx.ellipse(0, 20, 68, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alternate ? '#7ba6c4' : '#e7a984'; ctx.beginPath(); ctx.ellipse(0, 0, 58, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5e50'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-48, 30); ctx.moveTo(40, 0); ctx.lineTo(48, 30); ctx.stroke();
    ctx.fillStyle = '#f5d788'; ctx.beginPath(); ctx.arc(-16, -4, 5, 0, Math.PI * 2); ctx.arc(8, 1, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawPlayground(ctx, x, y) {
    ctx.save(); ctx.fillStyle = '#db967b'; roundedRect(ctx, x, y, 230, 120, 22); ctx.fill();
    ctx.fillStyle = '#efc777'; roundedRect(ctx, x + 27, y + 20, 64, 64, 12); ctx.fill();
    ctx.strokeStyle = '#5b7892'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 50, y + 78); ctx.lineTo(x + 50, y + 18); ctx.lineTo(x + 115, y + 18); ctx.lineTo(x + 115, y + 78); ctx.stroke();
    ctx.strokeStyle = '#9a5f70'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 155, y + 10); ctx.lineTo(x + 155, y + 90); ctx.moveTo(x + 190, y + 10); ctx.lineTo(x + 190, y + 90); ctx.stroke();
    ctx.strokeStyle = '#f5e2b2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 155, y + 20); ctx.lineTo(x + 190, y + 20); ctx.moveTo(x + 155, y + 45); ctx.lineTo(x + 190, y + 45); ctx.stroke(); ctx.restore();
  }

  drawFlowerBed(ctx, x, y, width) {
    ctx.save(); ctx.fillStyle = '#6c9f76'; roundedRect(ctx, x, y, width, 46, 16); ctx.fill();
    const colors = ['#ee9eac', '#f5cf78', '#b899dd', '#f2f2df'];
    for (let index = 0; index < 9; index += 1) { ctx.fillStyle = colors[index % colors.length]; ctx.beginPath(); ctx.arc(x + 12 + (index * 29) % (width - 15), y + 16 + (index % 2) * 14, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  drawSign(ctx, x, y, label) {
    ctx.save(); ctx.fillStyle = '#78634e'; ctx.fillRect(x, y, 7, 64); ctx.fillStyle = '#f2d48d'; roundedRect(ctx, x - 42, y - 26, 92, 33, 8); ctx.fill(); drawText(ctx, label, x + 4, y - 9, { size: 8, color: '#4f5661', weight: 900 }); ctx.restore();
  }

  drawPathDashes(ctx, x1, y1, x2, y2, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.lineWidth = 4; ctx.setLineDash([22, 22]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }

  drawMountainSilhouettes(ctx, width, height) {
    ctx.save(); ctx.fillStyle = 'rgba(61, 114, 116, .3)'; ctx.beginPath(); ctx.moveTo(0, 330); ctx.lineTo(240, 80); ctx.lineTo(430, 280); ctx.lineTo(660, 40); ctx.lineTo(900, 300); ctx.lineTo(1130, 110); ctx.lineTo(1450, 330); ctx.lineTo(width, 145); ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(47, 96, 101, .22)'; ctx.beginPath(); ctx.moveTo(0, 410); ctx.lineTo(250, 230); ctx.lineTo(470, 375); ctx.lineTo(720, 175); ctx.lineTo(1050, 390); ctx.lineTo(1290, 215); ctx.lineTo(width, 380); ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawPines(ctx, pines, small = false) { pines.forEach(([x, y], index) => this.drawPine(ctx, x, y, small ? 0.65 : 0.8 + (index % 3) * 0.1)); }

  drawPine(ctx, x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(28, 69, 70, .2)'; ctx.beginPath(); ctx.ellipse(0, 27, 30, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6f5849'; ctx.fillRect(-5, 0, 10, 35); ctx.fillStyle = '#286d68'; ctx.beginPath(); ctx.moveTo(0, -65); ctx.lineTo(-29, 0); ctx.lineTo(29, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-38, 19); ctx.lineTo(38, 19); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5d9b7d'; ctx.beginPath(); ctx.moveTo(-2, -56); ctx.lineTo(-9, -37); ctx.lineTo(6, -37); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawRestPlatform(ctx, x, y) {
    ctx.save(); ctx.fillStyle = 'rgba(38, 65, 61, .18)'; ctx.beginPath(); ctx.ellipse(x + 145, y + 115, 170, 25, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d5bb8b'; roundedRect(ctx, x, y, 290, 105, 28); ctx.fill(); ctx.strokeStyle = '#b8996d'; ctx.lineWidth = 4; ctx.stroke(); this.drawBench(ctx, x + 76, y + 53, 0); this.drawBench(ctx, x + 210, y + 53, 0); ctx.restore();
  }

  drawCliffRocks(ctx, x, y, width, height) {
    ctx.save(); ctx.fillStyle = '#718c8a'; ctx.strokeStyle = '#577370'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + 18, y + 28); ctx.lineTo(x + width * .32, y); ctx.lineTo(x + width * .65, y + 18); ctx.lineTo(x + width - 8, y + 48); ctx.lineTo(x + width, y + height); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(229, 224, 189, .32)'; ctx.beginPath(); ctx.moveTo(x + width * .3, y + 10); ctx.lineTo(x + width * .55, y + 29); ctx.lineTo(x + width * .38, y + 48); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawLookout(ctx, x, y, now) {
    ctx.save(); ctx.fillStyle = 'rgba(35, 59, 62, .18)'; ctx.beginPath(); ctx.ellipse(x + 115, y + 155, 150, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#dfbd7f'; ctx.strokeStyle = '#ae8e5b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x + 115, y + 120, 140, 55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f3dfaa'; ctx.beginPath(); ctx.arc(x + 115, y + 110, 54, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e58e7c'; ctx.fillRect(x + 40, y + 35, 7, 70); ctx.fillRect(x + 185, y + 35, 7, 70); ctx.strokeStyle = '#f5e3b1'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 42, y + 46); ctx.lineTo(x + 190, y + 46); ctx.stroke(); ctx.fillStyle = '#f18f79'; ctx.beginPath(); ctx.moveTo(x + 47, y + 35); ctx.lineTo(x + 107, y + 14 + Math.sin(now * .002) * 3); ctx.lineTo(x + 47, y + 5); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawTrailSign(ctx, x, y, label) {
    ctx.save(); ctx.fillStyle = '#705444'; ctx.fillRect(x, y, 6, 62); ctx.fillStyle = '#e6c98e'; roundedRect(ctx, x - 34, y - 25, 104, 31, 6); ctx.fill(); drawText(ctx, label, x + 18, y - 9, { size: 8, color: '#51606a', weight: 900 }); ctx.restore();
  }

  drawMapLabel(ctx, label, x, y) {
    ctx.save(); ctx.fillStyle = 'rgba(20, 40, 61, .28)'; roundedRect(ctx, x - 52, y - 10, 104, 22, 11); ctx.fill(); drawText(ctx, label, x, y + 1, { size: 10, color: 'rgba(255, 249, 225, .82)', weight: 800 }); ctx.restore();
  }
}

