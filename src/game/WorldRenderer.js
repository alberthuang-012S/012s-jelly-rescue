import { drawText } from './utils.js';

const PARK_DESIGN_WIDTH = 1024;
const PARK_DESIGN_HEIGHT = 1536;

const MAP = Object.freeze({
  ink: '#24324a',
  grass: '#78b874',
  grassDeep: '#3d765b',
  grassHighlight: '#c1dd91',
  roadShadow: '#8b7558',
  road: '#d0b57b',
  roadLight: '#e3c990',
  waterDeep: '#2b6f9f',
  water: '#3ea9c8',
  waterLight: '#75d2dc',
  foam: '#b1e8df',
  cream: '#fff2d0',
  wood: '#8b5c3c',
  woodLight: '#b98057',
  leaf: '#3d765b',
  coral: '#f47c8d',
  lavender: '#8272db',
  yellow: '#ffd687',
  rock: '#718c8a',
  rockLight: '#a7b6a5'
});

export class WorldRenderer {
  constructor() {
    this.parkImage = null;
    this.mountainImage = null;
  }

  setParkImage(image) {
    this.parkImage = image;
  }

  setMountainImage(image) {
    this.mountainImage = image;
  }

  draw(ctx, stage, now) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (stage.id === 'mountain') this.drawMountainBackground(ctx, stage, now);
    else this.drawPark(ctx, stage, now);
  }

  drawPark(ctx, stage, now) {
    const { width, height } = stage.world;
    if (this.parkImage?.complete && this.parkImage.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.parkImage, 0, 0, this.parkImage.naturalWidth, this.parkImage.naturalHeight, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // Keep the hand-drawn fallback aligned with the portrait artwork while
    // the approved map asset is loading or unavailable.
    ctx.save();
    ctx.scale(width / PARK_DESIGN_WIDTH, height / PARK_DESIGN_HEIGHT);
    ctx.fillStyle = MAP.grass;
    ctx.fillRect(0, 0, PARK_DESIGN_WIDTH, PARK_DESIGN_HEIGHT);
    this.drawGrassTexture(ctx, PARK_DESIGN_WIDTH, PARK_DESIGN_HEIGHT, MAP.grassDeep);
    this.drawParkBorder(ctx, PARK_DESIGN_WIDTH, PARK_DESIGN_HEIGHT);

    // The park uses one broad central route and two relaxed side loops. The
    // layout is intentionally open so the full portrait map stays readable on
    // phones and the player can always route around a landmark.
    this.drawCobblePath(ctx, [
      [512, 1435], [512, 1240], [512, 1060], [512, 900],
      [330, 900], [250, 760], [250, 620], [350, 520],
      [512, 520], [512, 340], [512, 130]
    ], 150);
    this.drawCobblePath(ctx, [
      [512, 1050], [420, 1040], [310, 980], [215, 875],
      [185, 745], [240, 610], [350, 530], [450, 570], [512, 620]
    ], 116);
    this.drawCobblePath(ctx, [
      [512, 1050], [604, 1040], [714, 980], [809, 875],
      [839, 745], [784, 610], [674, 530], [574, 570], [512, 620]
    ], 116);
    this.drawCobblePath(ctx, [
      [512, 520], [415, 470], [345, 385], [375, 285],
      [512, 250], [649, 285], [679, 385], [609, 470]
    ], 96);

    this.drawParkPlaza(ctx, 345, 575, 334, 320);
    this.drawPond(ctx, 70, 220, 240, 160);
    this.drawFountain(ctx, 390, 675, 244, 155, now);
    this.drawPicnic(ctx, 770, 380);
    this.drawPicnic(ctx, 770, 490, true);
    this.drawPlayground(ctx, 700, 1110);
    this.drawFlowerBed(ctx, 128, 500, 126);
    this.drawFlowerBed(ctx, 704, 700, 116);
    this.drawFlowerBed(ctx, 330, 1135, 126);
    this.drawParkGate(ctx, 470, 1435);
    this.drawLamp(ctx, 342, 610);
    this.drawLamp(ctx, 682, 610);
    this.drawLamp(ctx, 610, 1010);

    this.drawTrees(ctx, [
      [90, 455], [115, 890], [95, 1235], [255, 1395],
      [340, 125], [690, 125], [925, 250], [920, 730],
      [930, 1010], [885, 1395], [110, 1115]
    ]);
    this.drawTrees(ctx, [[332, 450], [692, 450], [270, 1080], [760, 930], [570, 1190]], true);

    this.drawBench(ctx, 318, 620, 0);
    this.drawBench(ctx, 706, 620, 0);
    this.drawBench(ctx, 320, 1010, -0.08);
    this.drawMapLabel(ctx, '公園入口', 512, 1490);
    this.drawMapLabel(ctx, '樹蔭草地', 215, 445);
    this.drawMapLabel(ctx, '中央噴水池', 512, 610);
    this.drawMapLabel(ctx, '野餐區', 790, 300);
    this.drawMapLabel(ctx, '遊戲區', 765, 1035);
    ctx.restore();
  }

  drawMountainBackground(ctx, stage, now) {
    const { width, height } = stage.world;
    if (this.mountainImage?.complete && this.mountainImage.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.mountainImage, 0, 0, this.mountainImage.naturalWidth, this.mountainImage.naturalHeight, 0, 0, width, height);
      ctx.restore();
      return;
    }

    this.drawMountainBackdrop(ctx, width, height);

    // Fallback art mirrors the portrait asset: one broad central route, two
    // relaxed side loops, and only a few edge obstacles.
    this.drawCobblePath(ctx, [
      [512, 1410], [512, 1190], [512, 1010], [512, 820],
      [512, 650], [512, 470], [512, 290], [512, 120]
    ], 150);
    this.drawCobblePath(ctx, [
      [512, 1080], [390, 1050], [260, 970], [175, 835],
      [190, 700], [295, 585], [410, 570], [512, 630]
    ], 120);
    this.drawCobblePath(ctx, [
      [512, 1080], [634, 1050], [764, 970], [849, 835],
      [834, 700], [729, 585], [614, 570], [512, 630]
    ], 120);

    this.drawAlpineLedge(ctx, 26, 230, 208, 230, 0);
    this.drawAlpineLedge(ctx, 790, 280, 208, 240, 1);
    this.drawAlpineLedge(ctx, 15, 1320, 210, 185, 2);
    this.drawAlpineLedge(ctx, 799, 1320, 210, 185, 3);
    this.drawRestPlatform(ctx, 367, 700);
    this.drawTrailhead(ctx, 512, 1370);
    this.drawLookout(ctx, 397, 42, now);

    this.drawPines(ctx, [
      [72, 300], [150, 330], [214, 270], [94, 620], [115, 1110],
      [210, 1160], [812, 330], [884, 380], [952, 300], [910, 1080],
      [820, 1160], [330, 150], [690, 150]
    ]);
    this.drawPines(ctx, [[70, 1435], [160, 1390], [230, 1450], [794, 1450], [875, 1390], [955, 1435]], true);
    this.drawFlowerBed(ctx, 275, 870, 96);
    this.drawFlowerBed(ctx, 653, 870, 96);
    this.drawCrystalCluster(ctx, 116, 520);
    this.drawCrystalCluster(ctx, 908, 520, true);
  }

  drawMountainForeground(ctx, stage, _now, { roofOpacity = 1 } = {}) {
    if (stage.id !== 'mountain' || !stage.pavilionRoof?.length) return;
    const opacity = Math.max(0, Math.min(1, roofOpacity));
    if (this.mountainImage?.complete && this.mountainImage.naturalWidth) {
      const bounds = stage.pavilionRoofBounds;
      ctx.save();
      ctx.globalAlpha = opacity;
      this.clipPolygon(ctx, stage.pavilionRoof);
      if (bounds) {
        const sourceScaleX = this.mountainImage.naturalWidth / stage.world.width;
        const sourceScaleY = this.mountainImage.naturalHeight / stage.world.height;
        ctx.drawImage(
          this.mountainImage,
          bounds.x * sourceScaleX,
          bounds.y * sourceScaleY,
          bounds.width * sourceScaleX,
          bounds.height * sourceScaleY,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height
        );
      } else {
        ctx.drawImage(
          this.mountainImage,
          0,
          0,
          this.mountainImage.naturalWidth,
          this.mountainImage.naturalHeight,
          0,
          0,
          stage.world.width,
          stage.world.height
        );
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    this.drawPavilionRoof(ctx, stage.pavilionRoof);
    ctx.restore();
  }

  clipPolygon(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.closePath();
    ctx.clip();
  }

  drawPavilionRoof(ctx, points) {
    this.fillPolygon(ctx, points.map(({ x, y }) => [x, y]), '#173a76', MAP.ink, 5);
    this.fillPolygon(ctx, [
      [points[0].x + 8, points[0].y - 2],
      [points[1].x, points[1].y + 8],
      [points[2].x - 8, points[2].y - 2],
      [points[4].x, points[4].y - 4]
    ], '#2789c8', null, 0);
    ctx.save();
    ctx.fillStyle = '#72d6ff';
    ctx.fillRect(points[1].x - 40, points[1].y + 20, 80, 5);
    ctx.fillRect(points[1].x - 58, points[1].y + 36, 116, 5);
    ctx.restore();
  }

  drawMountainBackdrop(ctx, width, height) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#8ed9ef');
    sky.addColorStop(0.24, '#bce7e8');
    sky.addColorStop(0.25, '#83bd83');
    sky.addColorStop(1, '#6cae73');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    this.drawMountainSilhouettes(ctx, width);
    ctx.fillStyle = 'rgba(255, 242, 208, .16)';
    ctx.fillRect(0, 238, width, 5);
    this.drawGrassTexture(ctx, width, height, '#3d765b');
    this.drawPixelCloud(ctx, 105, 88, 0.85);
    this.drawPixelCloud(ctx, 850, 110, 0.9);
    this.drawPixelCloud(ctx, 940, 260, 0.6);
  }

  drawMountainTerraces(ctx) {
    this.drawAlpineLedge(ctx, 82, 650, 520, 270, 0);
    this.drawAlpineLedge(ctx, 248, 328, 510, 340, 1);
    this.drawAlpineLedge(ctx, 600, 420, 520, 280, 2);
    this.drawAlpineLedge(ctx, 1005, 250, 475, 335, 3);
    this.drawAlpineLedge(ctx, 505, 58, 650, 305, 4);
  }

  drawAlpineLedge(ctx, x, y, width, height, variant = 0) {
    const top = [
      [x + 24, y], [x + width - 38, y], [x + width, y + 26],
      [x + width - 10, y + height - 36], [x + width - 54, y + height],
      [x + 38, y + height], [x, y + height - 28], [x + 8, y + 30]
    ];
    const face = top.map(([pointX, pointY]) => [pointX + 3, pointY + 24]);
    const topColors = ['#78b874', '#6fb583', '#83bd88', '#7cad80', '#8bc58f'];
    const faceColors = ['#647d82', '#5f7a84', '#6d8586', '#66787f', '#72868a'];
    this.fillPolygon(ctx, face, faceColors[variant % faceColors.length], MAP.ink, 5);
    this.fillPolygon(ctx, top, topColors[variant % topColors.length], MAP.ink, 5);
    ctx.save();
    ctx.fillStyle = MAP.grassHighlight;
    ctx.fillRect(x + 30, y + 10, Math.min(110, width - 70), 6);
    ctx.fillRect(x + width - 150, y + height - 28, 80, 5);
    ctx.fillStyle = 'rgba(36, 50, 74, .28)';
    for (let rock = 0; rock < 4; rock += 1) {
      ctx.fillRect(x + 44 + rock * Math.max(34, (width - 120) / 4), y + height + 7, 15, 8);
    }
    ctx.restore();
  }

  drawStoneSteps(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .28)';
    ctx.fillRect(x + 8, y + 9, width, height);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#e5cf9d';
    ctx.fillRect(x + 7, y + 7, width - 14, height - 14);
    ctx.strokeStyle = '#9b815e';
    ctx.lineWidth = 4;
    for (let stepY = y + 18; stepY < y + height - 8; stepY += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 7, stepY);
      ctx.lineTo(x + width - 7, stepY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTrailhead(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(x - 118, y + 40, 236, 12);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x - 108, y - 2, 28, 48);
    ctx.fillRect(x + 80, y - 2, 28, 48);
    ctx.fillStyle = MAP.cream;
    ctx.fillRect(x - 101, y + 5, 14, 34);
    ctx.fillRect(x + 87, y + 5, 14, 34);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(x - 80, y + 10, 160, 8);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 18, y - 32, 7, 39);
    this.fillPolygon(ctx, [[x + 25, y - 31], [x + 66, y - 20], [x + 25, y - 9]], MAP.coral, null, 0);
    ctx.restore();
  }

  drawCrystalCluster(ctx, x, y, alternate = false) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .24)';
    ctx.fillRect(x - 28, y + 20, 58, 8);
    const first = alternate ? '#8ea1ff' : '#8b79e7';
    const second = alternate ? '#bce8ff' : '#b28ff4';
    this.fillPolygon(ctx, [[x - 25, y + 18], [x - 12, y - 28], [x + 2, y + 18]], first, MAP.ink, 3);
    this.fillPolygon(ctx, [[x - 4, y + 18], [x + 12, y - 43], [x + 27, y + 18]], second, MAP.ink, 3);
    ctx.fillStyle = '#edf5ff';
    ctx.fillRect(x + 8, y - 34, 5, 16);
    ctx.restore();
  }

  drawPixelCloud(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255, 255, 255, .84)';
    ctx.fillRect(0, 12, 86, 17);
    ctx.fillRect(14, 3, 25, 20);
    ctx.fillRect(34, -5, 25, 27);
    ctx.fillRect(58, 7, 24, 21);
    ctx.fillStyle = 'rgba(205, 240, 244, .9)';
    ctx.fillRect(10, 27, 70, 5);
    ctx.restore();
  }

  drawGrassTexture(ctx, width, height, color) {
    ctx.save();
    ctx.fillStyle = color;
    for (let y = 18; y < height; y += 32) {
      for (let x = 16 + ((y / 32) % 2) * 16; x < width; x += 32) {
        ctx.globalAlpha = 0.13;
        ctx.fillRect(x, y, 3, 2);
        if ((x + y) % 96 === 0) ctx.fillRect(x + 7, y + 7, 2, 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  drawParkBorder(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(36, 50, 74, .18)';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.strokeStyle = 'rgba(255, 242, 208, .2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, width - 56, height - 56);
    ctx.restore();
  }

  drawParkPlaza(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 242, 208, .32)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = MAP.roadLight;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 8, y + 8, width - 16, height - 16);
    ctx.strokeStyle = 'rgba(139, 117, 88, .35)';
    ctx.setLineDash([12, 12]);
    ctx.strokeRect(x + 20, y + 20, width - 40, height - 40);
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawCobblePath(ctx, points, width) {
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = MAP.roadShadow;
    ctx.lineWidth = width + 14;
    this.strokePolyline(ctx, points);
    ctx.strokeStyle = MAP.road;
    ctx.lineWidth = width;
    this.strokePolyline(ctx, points);
    ctx.strokeStyle = MAP.roadLight;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 18]);
    this.strokePolyline(ctx, points);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(139, 117, 88, .42)';
    for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
      const [x1, y1] = points[segmentIndex];
      const [x2, y2] = points[segmentIndex + 1];
      const length = Math.hypot(x2 - x1, y2 - y1);
      for (let distance = 18; distance < length - 8; distance += 34) {
        const ratio = distance / length;
        const x = Math.round(x1 + (x2 - x1) * ratio);
        const y = Math.round(y1 + (y2 - y1) * ratio);
        ctx.fillRect(x - 2, y - 1, 5, 3);
      }
    }
    ctx.restore();
  }

  strokePolyline(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.stroke();
  }

  drawPond(ctx, x, y, width, height) {
    const outer = [
      [x + 26, y], [x + width - 30, y], [x + width, y + 24],
      [x + width, y + height - 24], [x + width - 30, y + height],
      [x + 28, y + height], [x, y + height - 26], [x, y + 26]
    ];
    const inner = outer.map(([px, py]) => [
      px + (px < x + width / 2 ? 10 : -10),
      py + (py < y + height / 2 ? 10 : -10)
    ]);
    this.fillPolygon(ctx, outer, MAP.ink, MAP.ink, 0);
    this.fillPolygon(ctx, inner, MAP.water, MAP.waterDeep, 4);
    ctx.save();
    ctx.fillStyle = MAP.waterLight;
    ctx.fillRect(x + 32, y + 31, 42, 5);
    ctx.fillRect(x + 126, y + 82, 54, 5);
    ctx.fillStyle = MAP.foam;
    ctx.fillRect(x + 78, y + 47, 17, 3);
    ctx.fillRect(x + 169, y + 98, 14, 3);
    ctx.restore();
  }

  drawFountain(ctx, x, y, width, height, now) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(x + 12, y + height + 9, width - 24, 10);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = MAP.water;
    ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
    ctx.fillStyle = MAP.waterLight;
    ctx.fillRect(x + 23, y + 23, width - 46, 4);
    ctx.fillStyle = MAP.roadLight;
    ctx.fillRect(x + 76, y + 42, 98, 63);
    ctx.strokeStyle = MAP.roadShadow;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 76, y + 42, 98, 63);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(x + 111, y + 26, 28, 16);
    ctx.fillStyle = MAP.cream;
    for (let index = 0; index < 5; index += 1) {
      const waveX = x + 86 + index * 31;
      const waveY = y + 20 + Math.round(Math.sin(now * 0.003 + index) * 3);
      ctx.fillRect(waveX, waveY, 10, 3);
      ctx.fillRect(waveX + 6, waveY + 5, 8, 3);
    }
    ctx.restore();
  }

  drawTrees(ctx, trees, small = false) {
    trees.forEach(([x, y], index) => this.drawTree(ctx, x, y, small ? 0.72 : 0.94 + (index % 3) * 0.08));
  }

  drawTree(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(-29, 22, 58, 8);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(-7, -5, 14, 39);
    this.fillPolygon(ctx, [
      [-31, -14], [-23, -37], [-12, -37], [-3, -61],
      [11, -61], [20, -39], [31, -39], [39, -14]
    ], '#2f765e', MAP.ink, 3);
    this.fillPolygon(ctx, [
      [-25, -19], [-16, -42], [-5, -42], [2, -56],
      [14, -42], [25, -42], [32, -19]
    ], MAP.leaf, MAP.ink, 2);
    ctx.fillStyle = MAP.grassHighlight;
    ctx.fillRect(-9, -48, 10, 5);
    ctx.fillRect(9, -31, 8, 4);
    ctx.restore();
  }

  drawBench(ctx, x, y, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(-38, 15, 76, 7);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(-42, -22, 84, 15);
    ctx.fillRect(-34, -2, 68, 14);
    ctx.fillStyle = MAP.woodLight;
    ctx.fillRect(-38, -19, 76, 9);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(-30, 12, 8, 21);
    ctx.fillRect(22, 12, 8, 21);
    ctx.restore();
  }

  drawPicnic(ctx, x, y, alternate = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(36, 50, 74, .16)';
    ctx.fillRect(-52, 29, 104, 8);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(-58, -22, 116, 54);
    ctx.fillStyle = alternate ? '#8fb6d2' : '#f1a3a1';
    ctx.fillRect(-52, -16, 104, 42);
    ctx.fillStyle = alternate ? '#c6e5f0' : MAP.yellow;
    ctx.fillRect(-45, -10, 28, 28);
    ctx.fillRect(-4, -10, 28, 28);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(28, -4, 13, 27);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(31, -13, 8, 8);
    ctx.restore();
  }

  drawPlayground(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .18)';
    ctx.fillRect(x + 8, y + 8, 230, 120);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, 230, 120);
    ctx.fillStyle = '#f2c882';
    ctx.fillRect(x + 7, y + 7, 216, 106);
    ctx.fillStyle = '#f5e2b2';
    ctx.fillRect(x + 22, y + 22, 66, 62);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 49, y + 20, 8, 66);
    ctx.fillRect(x + 113, y + 20, 8, 66);
    ctx.fillStyle = MAP.lavender;
    ctx.fillRect(x + 49, y + 20, 72, 10);
    ctx.fillStyle = MAP.waterDeep;
    ctx.fillRect(x + 146, y + 20, 10, 70);
    ctx.fillRect(x + 185, y + 20, 10, 70);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(x + 146, y + 20, 49, 9);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 159, y + 30, 24, 7);
    ctx.restore();
  }

  drawFlowerBed(ctx, x, y, width) {
    ctx.save();
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, width, 50);
    ctx.fillStyle = MAP.leaf;
    ctx.fillRect(x + 5, y + 5, width - 10, 40);
    const colors = [MAP.coral, MAP.yellow, MAP.lavender, MAP.cream];
    for (let index = 0; index < 10; index += 1) {
      const flowerX = x + 13 + (index * 31) % Math.max(20, width - 22);
      const flowerY = y + 13 + (index % 2) * 15;
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(flowerX, flowerY, 7, 7);
      ctx.fillRect(flowerX - 3, flowerY + 2, 13, 3);
      ctx.fillStyle = MAP.grassHighlight;
      ctx.fillRect(flowerX + 2, flowerY + 8, 3, 9);
    }
    ctx.restore();
  }

  drawFence(ctx, x, y, length, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(0, 0, length, 7);
    ctx.fillRect(0, 18, length, 6);
    for (let post = 0; post <= length; post += 34) {
      ctx.fillRect(post, -7, 7, 34);
      ctx.fillStyle = MAP.cream;
      ctx.fillRect(post + 2, -3, 3, 24);
      ctx.fillStyle = MAP.ink;
    }
    ctx.restore();
  }

  drawLamp(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .18)';
    ctx.fillRect(x - 17, y + 35, 34, 6);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x - 3, y - 5, 6, 42);
    ctx.fillRect(x - 12, y - 10, 24, 7);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(x - 8, y - 25, 16, 16);
    ctx.fillStyle = MAP.cream;
    ctx.fillRect(x - 4, y - 21, 8, 8);
    ctx.restore();
  }

  drawParkGate(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y - 34, 12, 68);
    ctx.fillRect(x + 72, y - 34, 12, 68);
    ctx.fillRect(x, y - 34, 84, 9);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 12, y - 26, 60, 5);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(x + 31, y - 54, 24, 20);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x + 37, y - 49, 12, 9);
    ctx.restore();
  }

  drawMountainSilhouettes(ctx, width) {
    this.fillPolygon(ctx, [
      [0, 300], [150, 145], [250, 225], [420, 46], [630, 255],
      [820, 92], [1030, 280], [1260, 112], [1490, 300], [width, 135],
      [width, 0], [0, 0]
    ], '#8ec5df', null, 0);
    this.fillPolygon(ctx, [
      [0, 385], [220, 255], [420, 350], [650, 185], [880, 365],
      [1110, 215], [1350, 380], [width, 235], [width, 0], [0, 0]
    ], '#6f9fbd', null, 0);
    ctx.fillStyle = '#eff7f2';
    ctx.fillRect(395, 92, 44, 9);
    ctx.fillRect(407, 80, 22, 12);
    ctx.fillRect(793, 130, 42, 8);
    ctx.fillRect(804, 118, 21, 12);
    ctx.fillRect(1248, 150, 42, 8);
    ctx.fillRect(1259, 138, 20, 12);
  }

  drawMountainStream(ctx) {
    const stream = [
      [405, 230], [445, 315], [382, 405], [430, 500],
      [365, 590], [414, 690], [350, 790], [390, 900], [365, 1000]
    ];
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = MAP.waterDeep;
    ctx.lineWidth = 54;
    this.strokePolyline(ctx, stream);
    ctx.strokeStyle = MAP.water;
    ctx.lineWidth = 34;
    this.strokePolyline(ctx, stream);
    ctx.strokeStyle = MAP.waterLight;
    ctx.lineWidth = 5;
    ctx.setLineDash([22, 28]);
    this.strokePolyline(ctx, stream);
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawPines(ctx, pines, small = false) {
    pines.forEach(([x, y], index) => this.drawPine(ctx, x, y, small ? 0.65 : 0.78 + (index % 3) * 0.1));
  }

  drawPine(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(36, 50, 74, .18)';
    ctx.fillRect(-28, 28, 56, 7);
    ctx.fillStyle = '#6f5849';
    ctx.fillRect(-5, 0, 10, 36);
    this.fillPolygon(ctx, [
      [0, -70], [-31, -4], [-19, -4], [-40, 22],
      [40, 22], [19, -4], [31, -4]
    ], '#286d68', MAP.ink, 3);
    ctx.fillStyle = '#5d9b7d';
    ctx.fillRect(-7, -51, 14, 8);
    ctx.fillRect(-17, -27, 14, 7);
    ctx.restore();
  }

  drawRestPlatform(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(x + 12, y + 104, 286, 13);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, 290, 105);
    ctx.fillStyle = '#d5bb8b';
    ctx.fillRect(x + 7, y + 7, 276, 91);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(x + 24, y + 28, 242, 12);
    ctx.fillRect(x + 24, y + 66, 242, 12);
    ctx.fillStyle = MAP.woodLight;
    for (let plank = 0; plank < 6; plank += 1) ctx.fillRect(x + 24 + plank * 40, y + 42, 27, 8);
    this.drawBench(ctx, x + 74, y + 53, 0);
    this.drawBench(ctx, x + 210, y + 53, 0);
    ctx.restore();
  }

  drawCliffRocks(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(x + 8, y + 10, width, height);
    this.fillPolygon(ctx, [
      [x, y + height], [x + 18, y + 28], [x + width * 0.32, y],
      [x + width * 0.65, y + 18], [x + width - 8, y + 48], [x + width, y + height]
    ], MAP.rock, MAP.ink, 5);
    this.fillPolygon(ctx, [
      [x + width * 0.28, y + 12], [x + width * 0.52, y + 28],
      [x + width * 0.38, y + 52], [x + width * 0.2, y + 42]
    ], MAP.rockLight, null, 0);
    ctx.fillStyle = MAP.grassHighlight;
    ctx.fillRect(x + width * 0.72, y + height - 18, 22, 5);
    ctx.restore();
  }

  drawCamp(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .16)';
    ctx.fillRect(x - 8, y + 40, 82, 7);
    this.fillPolygon(ctx, [[x, y + 35], [x + 28, y], [x + 58, y + 35]], MAP.ink, null, 0);
    this.fillPolygon(ctx, [[x + 8, y + 31], [x + 28, y + 7], [x + 48, y + 31]], '#f3b189', null, 0);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 64, y + 25, 8, 8);
    ctx.fillStyle = MAP.yellow;
    ctx.fillRect(x + 63, y + 15, 10, 10);
    ctx.restore();
  }

  drawBridge(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = MAP.woodLight;
    for (let plank = 0; plank < width; plank += 15) ctx.fillRect(x + plank + 3, y + 5, 9, height - 10);
    ctx.fillStyle = MAP.wood;
    ctx.fillRect(x, y - 5, width, 5);
    ctx.fillRect(x, y + height, width, 5);
    ctx.restore();
  }

  drawLookout(ctx, x, y, now) {
    ctx.save();
    ctx.fillStyle = 'rgba(36, 50, 74, .2)';
    ctx.fillRect(x - 4, y + 145, 250, 12);
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y + 55, 230, 90);
    ctx.fillStyle = '#dfbd7f';
    ctx.fillRect(x + 7, y + 62, 216, 76);
    ctx.fillStyle = '#f3dfaa';
    ctx.fillRect(x + 50, y + 76, 132, 38);
    ctx.fillStyle = MAP.coral;
    ctx.fillRect(x + 42, y + 29, 7, 70);
    ctx.fillRect(x + 181, y + 29, 7, 70);
    ctx.fillStyle = MAP.cream;
    ctx.fillRect(x + 44, y + 40, 142, 6);
    ctx.fillStyle = MAP.coral;
    const flagY = y + 12 + Math.round(Math.sin(now * 0.002) * 3);
    this.fillPolygon(ctx, [[x + 48, flagY], [x + 108, flagY + 12], [x + 48, flagY + 24]], MAP.coral, null, 0);
    ctx.restore();
  }

  drawTrailSign(ctx, x, y, label) {
    ctx.save();
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x, y, 7, 62);
    ctx.fillStyle = MAP.cream;
    ctx.fillRect(x - 34, y - 25, 104, 31);
    ctx.strokeStyle = '#5686c5';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 34, y - 25, 104, 31);
    drawText(ctx, label, x + 18, y - 9, { size: 8, color: MAP.ink, weight: 900 });
    ctx.restore();
  }

  drawMapLabel(ctx, label, x, y) {
    ctx.save();
    ctx.fillStyle = MAP.ink;
    ctx.fillRect(x - 58, y - 13, 116, 26);
    ctx.fillStyle = MAP.cream;
    ctx.fillRect(x - 54, y - 9, 108, 18);
    drawText(ctx, label, x, y + 1, { size: 9, color: MAP.ink, weight: 900 });
    ctx.restore();
  }

  fillPolygon(ctx, points, fill, stroke, lineWidth = 0) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke && lineWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }
}
