import { PIGMENT_CONFIG as C } from './PigmentConfig.js';
import { COMBAT_CONFIG } from './BossConfig.js';
import { clamp, drawText } from './utils.js';
import { pigmentQueenFrame, pigmentEnemyFrame } from './PigmentArt.js';

const TAU = Math.PI * 2, INK = '#29243e';
function oval(ctx, x, y, rx, ry, fill, stroke = INK, line = 2) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU);
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function star(ctx, x, y, r, fill = '#fff2cb') {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = i % 2 ? r * .28 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function petal(ctx, x, y, width, length, angle, fill, edge = '#bbaddb') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-width, -length * .35, -width * .55, -length * .9, 0, -length);
  ctx.bezierCurveTo(width * .55, -length * .9, width, -length * .35, 0, 0);
  ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore();
}
function gem(ctx, x, y, size, glow = true) {
  ctx.save(); ctx.translate(x, y);
  if (glow) { ctx.shadowBlur = 15; ctx.shadowColor = '#d9c7ff'; }
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .63, -.15 * size); ctx.lineTo(size * .43, size * .63);
  ctx.lineTo(0, size); ctx.lineTo(-size * .43, size * .63); ctx.lineTo(-size * .63, -.15 * size); ctx.closePath();
  ctx.fillStyle = '#8b72bf'; ctx.strokeStyle = '#f0e6ff'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.lineTo(size * .63, -.15 * size); ctx.closePath();
  ctx.fillStyle = '#d8c7fa'; ctx.fill(); star(ctx, -size * .08, -size * .16, size * .35); ctx.restore();
}

// Sprite poses use simulation time; procedural art remains the loading fallback.
// Simulation geometry owns collision and targeting.
export class PigmentRenderer {
  setArt(art) { this.art = art; }
  ready(image) { return Boolean(image?.complete && image.naturalWidth); }
  sprite(ctx, image, frame, cell, width) {
    ctx.drawImage(image, frame % 3 * cell, Math.floor(frame / 3) * cell, cell, cell,
      -width / 2, -Math.round(cell * .9) * width / cell, width, width);
  }
  artQueen(ctx, boss, t, scale, freed) {
    if (!this.ready(this.art?.queen)) return false;
    const frame = pigmentQueenFrame(boss, freed);
    ctx.save(); ctx.translate(boss.x, boss.y); ctx.scale(scale, scale);
    oval(ctx, 0, 6, 57, 13, '#211a3e55', null);
    ctx.translate(boss.hitFlash > 0 ? Math.sin(t * 80) * 3 : 0, Math.sin(t * 2.7) * 2);
    this.sprite(ctx, this.art.queen, frame, 384, 240);
    if (boss.coreOpen && !freed) {
      ctx.save(); ctx.globalAlpha = .5 + Math.sin(t * 7) * .15;
      ctx.shadowBlur = 16; ctx.shadowColor = '#f2dfff';
      oval(ctx, 0, -74, 15, 19, 'transparent', '#f9eaff', 2);
      ctx.restore();
    }
    if (['TELEGRAPH', 'SHIELD_WARN'].includes(boss.state)) {
      for (const side of [-1, 1]) star(ctx, side * 63, -145, 7 + Math.sin(t * 8) * 1.5, '#ffe3b4');
    }
    if (!freed && boss.phase > 1) {
      for (let i = 0; i < boss.phase - 1; i++) star(ctx, (i - (boss.phase - 2) / 2) * 18, -220, 4, '#ecceff');
    }
    ctx.restore(); return true;
  }
  artEnemy(ctx, e, t) {
    const frame = pigmentEnemyFrame(e);
    if (!this.ready(this.art?.enemies) || frame === null) return false;
    const defeated = e.hp <= 0, warning = e.state === 'TELEGRAPH';
    const hop = e.type === 'inkDrop' && e.state === 'DASH'
      ? Math.sin(clamp(1 - e.timer / e.def.dashTime, 0, 1) * Math.PI) * 17 : 0;
    ctx.save(); ctx.translate(e.x, e.y);
    oval(ctx, 0, 5, 24, 7, '#24203555', null);
    ctx.save();
    if (defeated) ctx.scale(1.12, .65);
    else if (warning) ctx.scale(1.06, .94);
    else if (e.state === 'CHASE') ctx.rotate(Math.sin(t * 6 + e.id) * .035);
    ctx.translate(e.hitFlash > 0 ? Math.sin(t * 80) * 3 : 0, -hop);
    if (e.type === 'inkRoller' && e.state === 'DASH' && !defeated) {
      ctx.translate(0, -34); ctx.rotate(t * 12); ctx.translate(0, 34);
    }
    if (e.hitFlash > 0) ctx.filter = 'brightness(1.7)';
    this.sprite(ctx, this.art.enemies, frame, 256, e.type === 'inkPlanter' ? 104 : 96);
    ctx.restore();
    if (warning) star(ctx, 0, -88, 7, '#ffe4b0');
    if (!defeated) for (let i = 0; i < e.def.hp; i++) oval(ctx, (i - (e.def.hp - 1) / 2) * 9, 15, 3, 3, i < e.hp ? '#f4e8ff' : '#595167', null);
    ctx.restore(); return true;
  }
  portrait(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hasArt = this.ready(this.art?.queen), scale = hasArt ? 1 : .95;
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 + (hasArt ? 104 : 90) * scale); ctx.scale(scale, scale);
    this.queen(ctx, { x: 0, y: 0, phase: 1, state: 'CHASE', coreOpen: false }, 0); ctx.restore();
  }
  atmosphere(ctx, combat) {
    const cleared = ['COLLECT', 'CLEAR'].includes(combat.state);
    const release = cleared ? 1 : combat.state === 'VICTORY' ? 1 - combat.timer / COMBAT_CONFIG.victoryDuration : 0;
    const hasMap = this.ready(this.art?.map);
    if (hasMap) {
      ctx.save(); ctx.globalAlpha = 1 - release;
      ctx.drawImage(this.art.map, 0, 0, combat.stage.world.width, combat.stage.world.height);
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(34,23,67,${.4 * (1 - release)})`;
      ctx.fillRect(0, 0, combat.stage.world.width, combat.stage.world.height);
    }
    ctx.save(); ctx.globalAlpha = .7 * (1 - release);
    for (const [x, y] of hasMap ? [] : [[280, 135], [495, 290], [90, 910], [680, 960]]) {
      for (let i = 0; i < 6; i++) petal(ctx, x, y, 13, 35, i * TAU / 6, '#352942');
      oval(ctx, x, y, 8, 8, '#a49bc7', '#d7cee9');
    }
    // Thin drifting wisps leave the ground, player and warnings unobscured.
    ctx.strokeStyle = '#afa0d633'; ctx.lineWidth = 9;
    for (let i = 0; i < 6; i++) {
      const x = 75 + i * 130, y = 200 + Math.sin(combat.visualTime * .4 + i) * 50 + i * 120;
      ctx.beginPath(); ctx.moveTo(x - 50, y); ctx.quadraticCurveTo(x, y - 20, x + 50, y); ctx.stroke();
    }
    ctx.restore();
  }
  queen(ctx, boss, t, scale = 1, freed = false) {
    if (this.artQueen(ctx, boss, t, scale, freed)) return;
    const open = boss.coreOpen || freed, warning = ['TELEGRAPH', 'SHIELD_WARN'].includes(boss.state);
    ctx.save(); ctx.translate(boss.x, boss.y);
    oval(ctx, 0, 5, 61 * scale, 17 * scale, '#211a3e55', null);
    ctx.scale(scale, scale); ctx.translate(0, Math.sin(t * 2.7) * 3);
    if (boss.hitFlash > 0) ctx.translate(Math.sin(t * 80) * 4, 0);
    const gradient = ctx.createLinearGradient(-50, -180, 50, 0);
    gradient.addColorStop(0, '#c1aedc'); gradient.addColorStop(.35, '#675087'); gradient.addColorStop(1, '#30223f');
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * .39;
      petal(ctx, 0, -86, 22, 100 + (boss.phase || 1) * 5, a, gradient);
    }
    for (let i = 0; i < 5; i++) petal(ctx, 0, -47, 30, 78, Math.PI + (i - 2) * .42, gradient);
    oval(ctx, -24, 2, 17, 8, '#97c8bf'); oval(ctx, 24, 2, 17, 8, '#97c8bf');
    oval(ctx, 0, -55, 42, 52, '#675880', '#d0bbdf', 2.5);
    oval(ctx, 0, -102, 44, 42, '#b2a0cc', INK, 3);
    // Crescent diadem and silver freckles belong to the character in every state.
    ctx.strokeStyle = '#f4e8bd'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -134, 18, .15, Math.PI - .15); ctx.stroke();
    gem(ctx, 0, -143, 11);
    for (const side of [-1, 1]) {
      oval(ctx, side * 18, -106, 11, 14, '#fff5f2', INK, 2);
      if (freed) {
        oval(ctx, side * 18, -104, 5, 7, '#30233e', null);
        oval(ctx, side * 21, -96, 4, 3, '#bce5ff', '#eefaff', 1);
        oval(ctx, side * 24, -89, 2.5, 4, '#bce5ff', null);
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(side * 10, -119); ctx.lineTo(side * 25, -114); ctx.stroke();
      }
      else if (open) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(side * 18, -102, 5, Math.PI, 0); ctx.stroke(); }
      else { oval(ctx, side * 18, -104, 5, 8, '#30233e', null); oval(ctx, side * 18 - 2, -108, 2, 3, '#ffffff', null); }
      oval(ctx, side * 31, -86, 7, 3, '#d1b1d9', null);
      for (let i = 0; i < 3; i++) oval(ctx, side * (23 + i * 5), -92 - i % 2 * 3, 1.4, 1.4, '#f9e7ff', null);
      const raised = freed ? -69 : warning ? -100 : open ? -54 : -73;
      petal(ctx, side * 35, -59, 13, freed ? 32 : 49, side * (freed ? -.65 : 1.1), '#8ebbb4');
      oval(ctx, side * (freed ? 12 : 51), raised, 12, 13, '#b4a0ca', INK);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-9, -83); ctx.quadraticCurveTo(0, freed ? -91 : open ? -70 : -78, 9, -83); ctx.stroke();
    gem(ctx, 0, -41, open ? 19 : 12, open);
    if (!open) {
      for (const side of [-1, 1]) petal(ctx, side * 12, -16, 20, 64, side * .35, '#443653');
      // The exposed socket stays dark while the flower shell is closed.
      oval(ctx, 0, -37, 11, 14, '#3a314d', '#aa97c4', 2);
    } else { ctx.shadowBlur = 20; ctx.shadowColor = '#f4edff'; star(ctx, 0, -41, 12); ctx.shadowBlur = 0; }
    if (warning) for (let i = 0; i < 3; i++) star(ctx, (i - 1) * 34, -180 - Math.sin(t * 7 + i) * 4, 5, '#f6d7ad');
    ctx.restore();
  }
  enemy(ctx, e, t) {
    if (this.artEnemy(ctx, e, t)) return;
    const roller = e.type === 'inkRoller', planter = e.type === 'inkPlanter', warning = e.state === 'TELEGRAPH';
    ctx.save(); ctx.translate(e.x, e.y);
    oval(ctx, 0, 5, 24, 7, '#24203555', null);
    const hop = e.state === 'DASH' && !roller ? Math.sin(clamp(1 - e.timer / e.def.dashTime, 0, 1) * Math.PI) * 17 : Math.sin(t * 5 + e.id) * 2;
    ctx.translate(0, -24 - hop);
    if (e.hitFlash > 0) ctx.translate(Math.sin(t * 80) * 3, 0);
    if (roller) {
      ctx.save(); if (e.state === 'DASH') ctx.rotate(t * 12);
      for (let i = 0; i < 5; i++) petal(ctx, 0, 0, 14, 35, i * TAU / 5, '#6b5b8b');
      ctx.restore();
    } else if (planter) {
      for (let i = 0; i < 3; i++) petal(ctx, 0, -12, 13, 36, (i - 1) * .6, '#736093');
      oval(ctx, 18, 7, 15, 17, '#879b94'); gem(ctx, 20, -5, 10, false);
    } else petal(ctx, 0, -15, 13, 25, -.35, '#a2c8b1');
    const body = ctx.createRadialGradient(-8, -10, 2, 0, 0, 33);
    body.addColorStop(0, e.hitFlash > 0 ? '#f4ecff' : '#aa92c6'); body.addColorStop(1, '#423553');
    oval(ctx, 0, 0, roller ? 26 : 22, warning ? 18 : 24, body, INK, 2.5);
    for (const side of [-1, 1]) {
      oval(ctx, side * 9, -4, 6, 8, '#fff7ec', INK, 1.3);
      oval(ctx, side * 9, -3, 2.7, 4, INK, null);
      oval(ctx, side * 10, 22, 9, 4, planter ? '#88af9f' : '#8273a2');
    }
    ctx.strokeStyle = '#f6e8ed'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(0, 8, 4, 0, Math.PI); ctx.stroke();
    if (warning) star(ctx, 0, -40, 8);
    for (let i = 0; i < e.def.hp; i++) oval(ctx, (i - (e.def.hp - 1) / 2) * 9, 37, 3, 3, i < e.hp ? '#f4e8ff' : '#595167', null);
    ctx.restore();
  }
  crystal(ctx, c, t) {
    ctx.save();
    const progress = clamp(c.age / C.crystalWarning, 0, 1);
    oval(ctx, c.x, c.y, c.radius, c.radius, c.active ? '#5d477b66' : '#f9dbae33', c.active ? '#d4b9fc' : '#ffe6b2', 3);
    if (!c.active) { ctx.setLineDash([5, 5]); oval(ctx, c.x, c.y, Math.max(2, c.radius * (1 - progress)), Math.max(2, c.radius * (1 - progress)), 'transparent', '#fff4d4', 2); ctx.setLineDash([]); }
    ctx.globalAlpha = .45 + progress * .55;
    const image = this.art?.[c.shield ? 'shield' : 'crystal'];
    if (this.ready(image)) {
      const width = c.shield ? 84 : 72;
      ctx.drawImage(image, c.x - width / 2, c.y - width * 230 / 256, width, width);
    } else {
      for (let i = 0; i < 4; i++) petal(ctx, c.x, c.y - 6, 9, 24, (i - 1.5) * .9, '#514064');
      gem(ctx, c.x, c.y - 23 + Math.sin(t * 2 + c.id) * 2, 19);
    }
    if (c.shield) { ctx.strokeStyle = '#e5d4fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y - 28, 26, Math.PI, TAU); ctx.stroke(); }
    ctx.restore();
  }
  corePickup(ctx, core, t) {
    ctx.save(); ctx.translate(core.x, core.y);
    oval(ctx, 0, 6, 32, 11, '#bcb0dc66', '#f0ddff', 2);
    const y = -30 + Math.sin(t * 3) * 4;
    if (this.ready(this.art?.core)) ctx.drawImage(this.art.core, -48, y - 48, 96, 96);
    else {
      for (let i = 0; i < 6; i++) petal(ctx, 0, y, 14, 34, i * TAU / 6, '#66517f', '#d8c8ef');
      gem(ctx, 0, y, 23);
    }
    for (let i = 0; i < 3; i++) star(ctx, Math.cos(t + i * 2.1) * 39, y + Math.sin(t + i * 2.1) * 30, 4);
    ctx.restore();
  }
  draw(ctx, combat, player, showRadius) {
    const t = combat.visualTime, boss = combat.boss;
    if (this.combat !== combat) { this.combat = combat; this.previous = new Map(); this.defeated = []; }
    for (const e of this.previous.values()) if (e.hp <= 0 && !this.defeated.some(d => d.entity === e)) this.defeated.push({ entity: e, at: t });
    this.previous = new Map(combat.director.enemies.map(e => [e.id, e]));
    this.defeated = this.defeated.filter(d => t - d.at < .45);
    for (const p of combat.petals) {
      ctx.save(); ctx.globalAlpha = p.life / 1.4;
      oval(ctx, p.x, p.y, 36, 14, '#d8ccee33', '#efe1fc', 2);
      for (let i = 0; i < 5; i++) petal(ctx, p.x + Math.cos(i * TAU / 5) * 20, p.y + Math.sin(i * TAU / 5) * 10, 5, 13, i, '#ccbae3');
      ctx.restore();
    }
    if (combat.state === 'BOSS' && ['TELEGRAPH', 'SHIELD_WARN'].includes(boss.state)) {
      const offsets = boss.shotOffsets;
      ctx.save(); ctx.setLineDash([8, 7]); ctx.strokeStyle = '#f7d9bbaa'; ctx.lineWidth = 3;
      for (const a of offsets) { ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(boss.x + Math.cos(boss.aim + a) * 230, boss.y + Math.sin(boss.aim + a) * 230); ctx.stroke(); }
      ctx.restore();
    }
    if (combat.state === 'BOSS') {
      ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = '#c2a7e3aa'; ctx.lineWidth = 2;
      for (const c of combat.crystals.filter(c => c.shield && c.alive)) {
        ctx.beginPath(); ctx.moveTo(boss.x, boss.y - (this.ready(this.art?.queen) ? 74 : 25)); ctx.lineTo(c.x, c.y - 20); ctx.stroke();
      }
      ctx.restore();
    }
    for (const c of combat.crystals) this.crystal(ctx, c, t);
    for (const d of this.defeated) {
      ctx.save(); ctx.globalAlpha = 1 - (t - d.at) / .45; this.enemy(ctx, d.entity, t); ctx.restore();
    }
    const actors = [...combat.director.enemies.filter(e => e.alive), player];
    if (combat.state === 'BOSS') actors.push(boss);
    for (const e of actors.sort((a, b) => a.y - b.y)) {
      if (e === player) { ctx.save(); if (combat.invulnerability > 0 && Math.floor(t * 12) % 2) ctx.globalAlpha = .4; player.draw(ctx); ctx.restore(); }
      else if (e === boss) this.queen(ctx, e, t);
      else this.enemy(ctx, e, t);
    }
    for (const p of combat.projectiles) { oval(ctx, p.x, p.y, p.radius, p.radius, '#483353', '#f1cfff', 3); star(ctx, p.x - 2, p.y - 3, 5, '#d6bfec'); }
    for (const p of combat.pulses) {
      const progress = 1 - p.life / .35;
      ctx.save(); ctx.globalAlpha = 1 - progress;
      oval(ctx, p.x, p.y, p.radius * progress, p.radius * progress, '#dfbfff18', '#f4e2ff', 4);
      for (let i = 0; i < 8; i++) star(ctx, p.x + Math.cos(i * TAU / 8) * p.radius * progress, p.y + Math.sin(i * TAU / 8) * p.radius * progress, 5);
      ctx.restore();
    }
    const target = combat.findTarget();
    if (target && !combat.frozen && combat.state !== 'COLLECT') {
      const radius = target === boss ? 65 : target.radius + 8;
      ctx.save(); ctx.strokeStyle = '#fff1be'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(target.x, target.y, radius, i * Math.PI / 2 + .1, i * Math.PI / 2 + .5); ctx.stroke(); }
      ctx.restore();
    }
    if (combat.state === 'ARRIVAL') {
      const elapsed = COMBAT_CONFIG.arrivalDuration - combat.timer;
      if (elapsed > 1) this.queen(ctx, boss, t, clamp((elapsed - 1) / 1.5, .05, 1));
    }
    if (combat.state === 'VICTORY') {
      const elapsed = COMBAT_CONFIG.victoryDuration - combat.timer;
      const scale = Math.max(.28, 1 - Math.max(0, elapsed - .7) * .4);
      this.queen(ctx, { ...boss, y: boss.y - Math.max(0, elapsed - 2) * 85 }, t, scale, true);
      ctx.save(); ctx.globalAlpha = clamp(1 - elapsed / 5.5, 0, 1);
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        petal(ctx, boss.x + Math.cos(a) * elapsed * 35, boss.y - 75 + Math.sin(a) * elapsed * 28, 8, 23, a + t, '#b39bc9');
      }
      ctx.restore();
    }
    if (combat.state === 'COLLECT' && combat.coreDrop && !combat.coreDrop.collected) this.corePickup(ctx, combat.coreDrop, t);
    if (showRadius) { ctx.save(); ctx.setLineDash([6, 5]); oval(ctx, player.x, player.y, C.bossRange, C.bossRange, 'transparent', '#fff1c4', 2); ctx.restore(); }
    if (combat.blockedTime > 0) drawText(ctx, '先清除護盾墨晶', player.x, player.y - 80, { color: '#f6e9ff', size: 15 });
  }
}
