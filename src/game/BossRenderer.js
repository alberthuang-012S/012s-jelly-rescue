import { COMBAT_CONFIG as C } from './BossConfig.js';
import { drawText, clamp } from './utils.js';
import { alienEnemyFrame, alienBossFrame } from './AlienArt.js';

function oval(ctx, x, y, rx, ry, fill, stroke = '#30254f', width = 2.5) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function star(ctx, x, y, size) {
  ctx.fillStyle = '#ffe5a0'; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4; const r = i % 2 ? size * .32 : size;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}

// Presentation only: all positions, states and clocks come from combat.
export class BossRenderer {
  setArt(art) { this.art = art; }
  ready(image) { return Boolean(image?.complete && image.naturalWidth); }
  sprite(ctx, image, frame, size, x, y, width, height) {
    ctx.drawImage(image, frame % 3 * size, Math.floor(frame / 3) * size, size, size, x, y, width, height);
  }
  atmosphere(ctx, combat) {
    const { width, height } = combat.stage.world; const t = combat.visualTime;
    if (!this.hasNightMap) {
      ctx.fillStyle = 'rgba(35, 24, 93, .29)'; ctx.fillRect(0, 0, width, height);
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, 'rgba(151,113,255,.28)'); sky.addColorStop(1, 'rgba(65,59,139,.04)');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    }
    this.ufo(ctx, width * .75 + Math.sin(t * .2) * 15, 100, .7, true);
    for (let i = 0; i < 22; i++) {
      const x = 45 + (i * 137) % (width - 90); const y = 110 + (i * 211) % (height - 210);
      ctx.globalAlpha = .35 + Math.sin(t * 1.5 + i) * .2;
      star(ctx, x, y + Math.sin(t + i) * 6, i % 3 ? 3 : 6);
    }
    ctx.globalAlpha = 1;
  }
  ufo(ctx, x, y, scale = 1, beam = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    if (beam) {
      const light = ctx.createLinearGradient(0, 0, 0, 240);
      light.addColorStop(0, 'rgba(222,193,255,.4)'); light.addColorStop(1, 'rgba(222,193,255,0)');
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-100, 240); ctx.lineTo(100, 240); ctx.lineTo(12, 4); ctx.fill();
    }
    if (this.ready(this.art?.boss)) {
      this.sprite(ctx, this.art.boss, 5, 384, -60, -42, 120, 100);
      ctx.restore(); return;
    }
    oval(ctx, 0, -9, 27, 22, '#bcf0f9'); oval(ctx, 0, 4, 49, 13, '#a18acb');
    for (const x of [-29, 0, 29]) oval(ctx, x, 6, 5, 3, '#fff0ad', null);
    ctx.restore();
  }
  monster(ctx, enemy, t, { boss = false, scale = 1, dizzy = false } = {}) {
    if (this.drawArtMonster(ctx, enemy, t, {boss, scale, dizzy})) return;
    const size = boss ? 3.8 : 1;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    oval(ctx, 0, 18, 26 * size * scale, 7 * size * scale, 'rgba(26,20,57,.2)', null);
    ctx.translate(0, -18 * size + Math.sin(t * 3) * 3);
    ctx.scale(size * scale, size * scale);
    if (dizzy) ctx.rotate(Math.sin(t * 7) * .2);
    else if (enemy.hitFlash > 0) ctx.translate(Math.sin(enemy.hitFlash * 80) * 2, 0);
    if (boss && enemy.phase === 3) oval(ctx, 0, 0, 32, 32, 'rgba(185,128,255,.18)', null);
    if (enemy.type === 'mosquitoBubble') {
      oval(ctx, 0, 0, 32, 34, 'rgba(208,171,255,.18)', '#ddc4ff', 1);
      for (const side of [-1, 1]) oval(ctx, side * 29, 11, 7, 7, '#d4b4efaa', '#f0deff', 1.3);
    }
    const flap = Math.sin(t * (enemy.state === 'TELEGRAPH' ? 60 : 26)) * 4;
    for (const side of [-1, 1]) {
      oval(ctx, side * 26, -16, 18, 8 + flap * .3, '#e9e6ff', '#9586be', 1.3);
      if (boss) oval(ctx, side * 23, -3, 14, 6 - flap * .2, '#c8dcff', '#9586be', 1.2);
      ctx.strokeStyle = '#5a4679'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(side * 10, -23); ctx.quadraticCurveTo(side * 17, -43, side * 22, -34); ctx.stroke();
      oval(ctx, side * 22, -34, 3.5, 3.5, '#f6d994', '#5a4679', 1.2);
      oval(ctx, side * 12, 23, 5, 7, '#8271b5', '#42325d', 1.5);
    }
    const color = enemy.type === 'mosquitoBubble' ? '#aca2ef' : enemy.type === 'mosquitoCharger' ? '#9b80e3' : '#8596df';
    const body = ctx.createRadialGradient(-9, -12, 2, 0, 0, 32);
    body.addColorStop(0, enemy.hitFlash > 0 ? '#ffffff' : '#e2ceff'); body.addColorStop(.55, boss ? '#b69de9' : color); body.addColorStop(1, '#6b559f');
    oval(ctx, 0, 0, 25, 28, body, '#42315e', 2);
    if (enemy.type === 'mosquitoCharger') {
      ctx.strokeStyle = '#ffe5a0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(0, -20); ctx.lineTo(8, -25); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      oval(ctx, side * 10, -8, 9, 11, '#fffaf4', '#51416a', 1.2);
      oval(ctx, side * 9, -7, 4.5, 6.5, '#302846', null);
      oval(ctx, side * 9 - 1, -10, 2, 2.6, '#ffffff', null);
      oval(ctx, side * 18, 4, 4, 2, '#e4a6dc', null);
      if (boss && enemy.phase === 3) {
        ctx.strokeStyle = '#42315e'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(side * 4, -17); ctx.lineTo(side * 17, -21); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#4d3b6b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(1, 14, 9, 10); ctx.stroke();
    ctx.strokeStyle = '#dfb3df'; ctx.lineWidth = 3; ctx.stroke();
    if (boss) {
      const open = enemy.coreOpen;
      ctx.shadowColor = '#f4d6ff'; ctx.shadowBlur = open ? 20 : 0;
      oval(ctx, 0, 19, 10, 8, open ? '#fff6ff' : '#62517f', open ? '#d9a5ff' : '#aa8fc7', 2.5);
      ctx.shadowBlur = 0;
      if (open) star(ctx, 0, 19, 7);
    } else {
      for (let i = 0; i < enemy.def.hp; i++) oval(ctx, (i - (enemy.def.hp - 1) / 2) * 8, 36, 2.5, 2.5, i < enemy.hp ? '#f5eaff' : '#645c7c', null);
    }
    if (dizzy) for (let i = 0; i < 3; i++) star(ctx, Math.cos(t * 3 + i * 2.1) * 32, -40 + Math.sin(t * 3 + i * 2.1) * 5, 4);
    ctx.restore();
  }
  drawArtMonster(ctx, enemy, t, {boss, scale, dizzy}) {
    const image = boss ? this.art?.boss : this.art?.enemies;
    if (!this.ready(image)) return false;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    const size = boss ? 3.8 : 1;
    oval(ctx, 0, 18, 26 * size * scale, 7 * size * scale, 'rgba(26,20,57,.2)', null);
    ctx.scale(scale, scale);
    if (boss && enemy.phase === 3) oval(ctx, 0, -85, 110, 125, 'rgba(185,128,255,.13)', null);
    ctx.translate(0, Math.sin(t * 3) * 3);
    if (dizzy) ctx.rotate(Math.sin(t * 7) * .1);
    if (enemy.hitFlash > 0) ctx.filter = 'brightness(1.7)';
    if (boss) {
      const frame = alienBossFrame(enemy, t, dizzy);
      this.sprite(ctx, image, frame, 384, -160, -258, 320, 320);
      ctx.filter = 'none';
      if (!dizzy) {
        const open = enemy.coreOpen;
        ctx.shadowColor = '#bdfcf3'; ctx.shadowBlur = open ? 22 : 0;
        const coreY = -258 + 302 * 320 / 384;
        oval(ctx, 0, coreY, 16, 18, open ? '#eafffa' : '#403657', open ? '#91e8dc' : '#b6a0db', 2);
        if (open) star(ctx, 0, coreY, 13);
        ctx.shadowBlur = 0;
      }
    } else {
      const frame = alienEnemyFrame(enemy, t);
      this.sprite(ctx, image, frame, 256, -54, -83, 108, 108);
      ctx.filter = 'none';
      for (let i = 0; i < enemy.def.hp; i++) oval(ctx, (i - (enemy.def.hp - 1) / 2) * 8, 34, 2.5, 2.5, i < enemy.hp ? '#f5eaff' : '#645c7c', null);
    }
    if (dizzy) for (let i=0;i<3;i++) star(ctx, Math.cos(t*3+i*2.1)*105, -220+Math.sin(t*3+i*2.1)*12, 12);
    ctx.restore(); return true;
  }
  telegraph(ctx, enemy) {
    if (enemy.state !== 'TELEGRAPH') return;
    const length = enemy.def ? enemy.def.dashSpeed * enemy.def.dashTime : 235;
    const end = { x: enemy.x + enemy.direction.x * length, y: enemy.y + enemy.direction.y * length };
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,221,146,.25)'; ctx.lineWidth = enemy.radius * 2;
    ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.strokeStyle = '#ffe4ad'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.stroke(); ctx.restore();
  }
  corePickup(ctx, drop, t) {
    ctx.save(); ctx.translate(drop.x, drop.y);
    oval(ctx, 0, 9, 30, 10, 'rgba(173,244,229,.28)', '#c1fff0', 1.5);
    ctx.shadowColor = '#debdff'; ctx.shadowBlur = 18;
    const y = -30 + Math.sin(t * 3) * 4;
    if (this.ready(this.art?.core)) ctx.drawImage(this.art.core, -36, y - 36, 72, 72);
    else { oval(ctx, 0, y, 23, 25, '#b7a3ec', '#fff3d5', 3); star(ctx, 0, y, 14); }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) star(ctx, Math.cos(t + i * 2.1) * 38, y + Math.sin(t + i * 2.1) * 22, 4);
    ctx.restore();
  }
  draw(ctx, combat, player, showRadius) {
    const t = combat.visualTime;
    for (const e of combat.targets) this.telegraph(ctx, e);
    const entities = [...combat.director.enemies.filter(e => e.alive), player];
    if (combat.state === 'BOSS' && combat.boss) entities.push(combat.boss);
    if (combat.state === 'COLLECT' && combat.coreDrop && !combat.coreDrop.collected) this.corePickup(ctx, combat.coreDrop, t);
    entities.sort((a, b) => a.y - b.y).forEach(e => {
      if (e === player) {
        ctx.save(); if (combat.invulnerability > 0 && Math.floor(t * 12) % 2) ctx.globalAlpha = .4;
        player.draw(ctx); ctx.restore();
      } else this.monster(ctx, e, t, { boss: e === combat.boss });
    });
    for (const p of combat.projectiles) {
      ctx.save(); ctx.shadowColor = '#d9a0ff'; ctx.shadowBlur = 10;
      oval(ctx, p.x, p.y, p.radius, p.radius, 'rgba(201,154,255,.48)', '#f4dcff', 2.5);
      oval(ctx, p.x - 4, p.y - 5, 3, 4, '#ffffff', null); ctx.restore();
    }
    for (const p of combat.pulses) {
      const progress = 1 - p.life / .35;
      ctx.save(); ctx.globalAlpha = (1 - progress) * (p.strong ? .85 : .45);
      ctx.strokeStyle = '#f8edff'; ctx.lineWidth = 5; ctx.shadowColor = '#c49aff'; ctx.shadowBlur = 18;
      oval(ctx, p.x, p.y, C.range * progress, C.range * progress, 'rgba(198,143,255,.12)', '#e0bcff', 5);
      for (let i = 0; i < 8; i++) star(ctx, p.x + Math.cos(i * Math.PI / 4) * C.range * progress, p.y + Math.sin(i * Math.PI / 4) * C.range * progress, 5);
      ctx.restore();
    }
    if (combat.state === 'ARRIVAL') {
      const elapsed = C.arrivalDuration - combat.timer;
      oval(ctx, combat.boss.x, combat.boss.y, 100, 32, `rgba(25,17,61,${Math.min(.35, elapsed * .2)})`, null);
      if (elapsed > 1.3) {
        const y = combat.boss.y - (1 - clamp((elapsed - 1.3) / 1.3, 0, 1)) * 650;
        this.monster(ctx, { ...combat.boss, y }, t, { boss: true });
      }
    }
    if (combat.state === 'VICTORY') {
      const elapsed = C.victoryDuration - combat.timer;
      const scale = Math.max(.23, 1 - elapsed * .6);
      const y = combat.boss.y - Math.max(0, elapsed - 2.6) * 130;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - elapsed / 1.3);
      oval(ctx, combat.boss.x, combat.boss.y, 70 + elapsed * 220, 70 + elapsed * 220, '#f6e9ff', '#cc9bff', 8); ctx.restore();
      if (elapsed < 4.8) this.monster(ctx, { ...combat.boss, y }, t, { boss: true, scale, dizzy: true });
      if (elapsed > 1.7) this.ufo(ctx, combat.boss.x, combat.boss.y - 230 - Math.max(0, elapsed - 4.4) * 160, 1, true);
    }
    if (showRadius) { ctx.save(); ctx.setLineDash([6, 5]); oval(ctx, player.x, player.y, C.range, C.range, 'transparent', '#fff2b1', 2); ctx.restore(); }
    if (combat.blockedTime > 0) drawText(ctx, 'CORE CLOSED', player.x, player.y - 78, { size: 14, color: '#f5eaff' });
  }
}
