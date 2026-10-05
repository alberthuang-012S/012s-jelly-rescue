import { GRAVITY_CONFIG as C, gravityDevicePosition } from './GravityConfig.js';
import { clamp, drawText } from './utils.js';
import { GRAVITY_ART, GRAVITY_CORE_ANCHORS, gravityEnemyFrame, gravityBossFrame } from './GravityArt.js';

const INK = '#283c62';
function ellipse(ctx, x, y, rx, ry, fill, stroke = INK, line = 2.2) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function plate(ctx, x, y, w, h, r, fill, stroke = INK, line = 2.2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function spark(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, r = i % 2 ? size * .3 : size;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath(); ctx.fillStyle = '#ffebb0'; ctx.fill();
}
function crystal(ctx, x, y, size, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * .1);
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .65, -size * .25);
  ctx.lineTo(size * .5, size * .55); ctx.lineTo(0, size); ctx.lineTo(-size * .5, size * .55); ctx.lineTo(-size * .65, -size * .25); ctx.closePath();
  ctx.fillStyle = '#9e9de7'; ctx.strokeStyle = '#edebff'; ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.lineTo(size * .65, -size * .25); ctx.closePath();
  ctx.fillStyle = '#d4ebff'; ctx.fill(); spark(ctx, -size * .2, -size * .25, size * .3); ctx.restore();
}

// All animation derives from simulation time. Artwork never determines hitboxes.
export class GravityRenderer {
  setArt(art) { this.art = art; }
  ready(image) { return Boolean(image?.complete && image.naturalWidth); }
  sprite(ctx, image, frame, size, x, y, width) {
    ctx.drawImage(image, frame % 3 * size, Math.floor(frame / 3) * size, size, size, x, y, width, width);
  }
  drawArtCreature(ctx, entity, t, boss, { scale = 1, light = false, artState = null }) {
    const image = this.art?.[boss ? 'boss' : GRAVITY_ART[entity.type]];
    if (!this.ready(image)) return false;
    this.motion ||= new WeakMap();
    const last = this.motion.get(entity);
    const moving = last?.time === t ? last.moving : last ? Math.hypot(entity.x - last.x, entity.y - last.y) > .01 : entity.type !== 'gravityHeavy';
    this.motion.set(entity, { x: entity.x, y: entity.y, time: t, moving });
    const frame = boss ? gravityBossFrame(entity, light) : gravityEnemyFrame({ ...entity, artState }, t, moving);
    const width = boss ? 240 : entity.type === 'gravityStomper' ? 128 : 108, cell = boss ? 384 : 256, ratio = width / cell;
    ctx.save(); ctx.translate(entity.x, entity.y); ctx.scale(scale, scale);
    ellipse(ctx, 0, 10, boss ? 67 : 30, boss ? 14 : 8, '#1a34523d', null);
    // Frame 3 faces the opposite windup. Feet remain registered at y=0.
    ctx.save(); if (boss && frame === 3) ctx.scale(-1, 1);
    this.sprite(ctx, image, frame, cell, -width / 2, -width * .9, width);
    ctx.restore();
    if (boss && entity.coreOpen && !light) {
      const anchor = GRAVITY_CORE_ANCHORS[frame];
      if (anchor) {
        const x = (anchor.x - cell / 2) * ratio, y = (anchor.y - cell * .9) * ratio;
        ctx.save(); ctx.translate(x, y); ctx.rotate(anchor.angle);
        ctx.shadowColor = '#b7f4ff'; ctx.shadowBlur = 17;
        ellipse(ctx, 0, 0, 21 * ratio + Math.sin(t * 6) * .5, 14 * ratio, '#f1ffff', '#a5e9ff', 2);
        spark(ctx, 0, 0, 7); ctx.restore();
      }
    } else if (!boss && entity.hp > 0) {
      for (let i = 0; i < entity.def.hp; i++) ellipse(ctx, (i - (entity.def.hp - 1) / 2) * 9, 17, 3, 3, i < entity.hp ? '#e5f9ff' : '#667388', null);
    }
    ctx.restore(); return true;
  }
  portrait(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hasArt = this.ready(this.art?.boss);
    const scale = hasArt ? .82 : .64;
    // Creature drawing is anchored at the feet; center its portrait body rather
    // than treating that foot anchor as the center of the preview canvas.
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 + (hasArt ? 84 : 72) * scale);
    ctx.scale(scale, scale);
    this.creature(ctx, { x: 0, y: 0, phase: 1, state: 'CHASE', coreOpen: false }, 0, true); ctx.restore();
  }
  atmosphere(ctx, combat) {
    const { width, height } = combat.stage.world;
    if (!this.hasGravityMap) { ctx.fillStyle = 'rgba(39,58,110,.18)'; ctx.fillRect(0, 0, width, height); }
    if (['COLLECT', 'CLEAR'].includes(combat.state)) return;
    const position = combat.devicePosition || gravityDevicePosition(combat.stage), t = combat.visualTime;
    const release = combat.state === 'VICTORY' ? clamp(1 - combat.timer / .9, 0, 1) : 0;
    if (release < 1) this.device(ctx, position, t, { alpha: 1 - release, scale: 1 - release * .2 });
    if (release > 0) {
      ctx.save(); ctx.globalAlpha *= release;
      this.corePickup(ctx, position, t); ctx.restore();
    }
  }
  device(ctx, { x, y }, t, { alpha = 1, scale = 1 } = {}) {
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
      if (this.ready(this.art?.device)) {
        ellipse(ctx, 0, 6, 32, 10, '#283c6244', null);
        ctx.drawImage(this.art.device, -68, -136 * .9, 136, 136);
        ctx.strokeStyle = '#a6e6ff88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 5, 39 + Math.sin(t * 2) * 3, 13, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore(); return;
      }
      ellipse(ctx, 0, 12, 31, 10, '#8898d080', '#d2edff', 2);
      plate(ctx, -22, -5, 44, 18, 7, '#526787');
      ellipse(ctx, 0, -8, 21, 7, '#bcdce8', '#d5f8ff', 2);
      crystal(ctx, 0, -27 + Math.sin(t * 2 + x) * 4, 12, t);
      ctx.strokeStyle = '#a6e6ff77'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 10, 45 + Math.sin(t) * 4, 15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  creature(ctx, entity, t, boss = false, { scale = 1, light = false, artState = null } = {}) {
    if (this.drawArtCreature(ctx, entity, t, boss, { scale, light, artState })) return;
    const size = boss ? 3.7 : 1.15;
    const stomp = entity.state === 'IMPACT', windup = entity.state === 'TELEGRAPH';
    const resting = entity.coreOpen || entity.state === 'RECOVER';
    const heavy = entity.type === 'gravityHeavy';
    const glove = entity.type === 'gravityStomper';
    ctx.save(); ctx.translate(entity.x, entity.y);
    ellipse(ctx, 0, 10, size * 27 * scale, size * 7 * scale, '#1a34523d', null);
    ctx.translate(0, (boss ? -72 : -28) + (resting ? Math.sin(t * 3) * 2 : Math.sin(t * 4) * 1.5));
    ctx.scale(size * scale, size * scale);
    if (stomp) ctx.scale(1.06, .92);
    if (entity.hitFlash > 0) ctx.translate(Math.sin(t * 70) * 1.3, 0);
    // Rounded gravity pack, padded shoulder bars, and paired suspended weights.
    plate(ctx, -29, -29, 58, 53, 13, '#6276a9');
    plate(ctx, -21, -24, 42, 41, 9, '#9fc1d4');
    for (const side of [-1, 1]) {
      ctx.strokeStyle = '#334c72'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(side * 21, -23); ctx.quadraticCurveTo(side * 40, -39, side * 38, -10); ctx.stroke();
      const weightY = light ? -30 - Math.sin(t * 3 + side) * 5 : windup ? -24 : -6;
      ellipse(ctx, side * 37, weightY, heavy ? 13 : 10, heavy ? 14 : 11,
        light ? '#c3eeff77' : boss && entity.phase === 3 ? '#ad9fe0' : '#6b81bd', light ? '#edfbff' : INK, 2);
      ellipse(ctx, side * 37 - 2, weightY - 3, 3, 3, light ? '#ffffff' : '#e0efff', null);
      plate(ctx, side * 12 - 8, 20, 16, 10, 5, '#45688c');
      plate(ctx, side * 12 - 8, 26, 16, 5, 2, '#9fccdd', INK, 1.5);
    }
    const body = ctx.createRadialGradient(-12, -14, 3, 0, 0, 37);
    body.addColorStop(0, entity.hitFlash > 0 ? '#ffffff' : '#f6ecd0');
    body.addColorStop(.6, '#ddc99e'); body.addColorStop(1, '#baa282');
    ellipse(ctx, 0, 0, 27, 29, body, INK, 2.5);
    plate(ctx, -23, -25, 46, 10, 5, boss ? '#7dbdc9' : heavy ? '#b6a3e6' : '#98b4d4', INK, 1.7);
    plate(ctx, -5, -27, 10, 13, 4, '#fff2ba', INK, 1.5);
    for (const side of [-1, 1]) {
      // Broad mittens lift before impact; no weapons or realistic injury art.
      const lifted = windup && (!boss || entity.phase !== 2 || side === (entity.attackIndex % 2 ? 1 : -1));
      const handY = lifted ? -20 : stomp ? 24 : 10;
      ellipse(ctx, side * 29, handY, glove || boss ? 12 : 9, glove || boss ? 13 : 10, '#81b9cc', INK, 2);
      plate(ctx, side * 29 - 7, handY + 5, 14, 6, 3, '#d4eef0', INK, 1.2);
      ellipse(ctx, side * 10, -7, 8, 10, '#fffef2', INK, 1.5);
      if (resting || light) {
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(side * 10, -5, 4, Math.PI, 0); ctx.stroke();
      } else {
        ellipse(ctx, side * 10, -6, 3.7, 5.4, '#273752', null);
        ellipse(ctx, side * 10 - 1, -8, 1.5, 2, '#ffffff', null);
      }
      ellipse(ctx, side * 19, 5, 4, 2, '#e79da6', null);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(-5, 6); ctx.quadraticCurveTo(0, resting || light ? 12 : 8, 5, 6); ctx.stroke();
    if (boss) {
      const open = entity.coreOpen;
      ctx.shadowColor = '#beeeff'; ctx.shadowBlur = open ? 17 : 0;
      plate(ctx, -11, 13, 22, 14, 6, open ? '#f4ffff' : '#4d6686', open ? '#b6eaff' : '#839cb5', 2);
      if (open) spark(ctx, 0, 20, 7);
      else { ctx.strokeStyle = '#9db3c7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 20); ctx.lineTo(5, 20); ctx.stroke(); }
      ctx.shadowBlur = 0;
      if (entity.phase === 3 && !light) for (const side of [-1, 1]) spark(ctx, side * 30, -34 + Math.sin(t * 7) * 3, 4);
    } else {
      if (heavy) crystal(ctx, 0, -39, 8, t);
      for (let i = 0; i < entity.def.hp; i++) ellipse(ctx, (i - (entity.def.hp - 1) / 2) * 8, 39, 2.5, 2.5, i < entity.hp ? '#e5f9ff' : '#667388', null);
    }
    ctx.restore();
  }
  zonePath(ctx, zone, radius) {
    ctx.beginPath();
    if (zone.shape === 'fan') { ctx.moveTo(zone.x, zone.y); ctx.arc(zone.x, zone.y, radius, zone.angle - zone.halfAngle, zone.angle + zone.halfAngle); ctx.closePath(); }
    else ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
  }
  ground(ctx, zone, t) {
    const warning = zone.state === 'WARNING'; const progress = clamp(zone.age / zone.warning, 0, 1);
    ctx.save();
    this.zonePath(ctx, zone, zone.radius);
    ctx.fillStyle = warning ? 'rgba(255,191,104,.27)' : 'rgba(255,215,140,.66)'; ctx.fill();
    ctx.strokeStyle = warning ? '#fff0b3' : '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
    if (warning) {
      ctx.setLineDash([8, 7]); ctx.strokeStyle = '#834361'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
      this.zonePath(ctx, zone, Math.max(2, zone.radius * (1 - progress)));
      ctx.strokeStyle = '#fff8df'; ctx.lineWidth = 3; ctx.stroke();
    } else for (let i = 0; i < 7; i++) {
      const a = zone.shape === 'fan' ? zone.angle - zone.halfAngle + i / 6 * zone.halfAngle * 2 : i * Math.PI * 2 / 7;
      spark(ctx, zone.x + Math.cos(a) * zone.radius * .7, zone.y + Math.sin(a) * zone.radius * .7, 8);
    }
    if (zone.kind === 'crystal') crystal(ctx, zone.x, zone.y - 18 + Math.sin(t * 3) * 3, 23, t);
    ctx.restore();
  }
  draw(ctx, combat, player, showRadius) {
    const t = combat.visualTime;
    if (this.combat !== combat) { this.combat = combat; this.previous = new Map(); this.defeated = []; this.motion = new WeakMap(); }
    // Keep a short seated defeat pose after the director removes a defeated mob.
    // This cache is presentation only and uses the paused simulation clock.
    for (const [entity, previous] of this.previous) {
      if (previous.alive && !entity.alive) this.defeated.push({ ...previous, hp: 0, state: 'DEFEATED', since: t });
    }
    this.previous = new Map(combat.director.enemies.map(e => [e, { x: e.x, y: e.y, type: e.type, def: e.def, alive: e.alive }]));
    this.defeated = this.defeated.filter(e => t - e.since < .5 && ['WAVE', 'WAVE_CLEAR', 'BOSS'].includes(combat.state));
    for (const zone of combat.ground.zones) this.ground(ctx, zone, t);
    if (combat.state === 'COLLECT' && combat.coreDrop && !combat.coreDrop.collected) this.corePickup(ctx, combat.coreDrop, t);
    const actors = [...combat.director.enemies.filter(e => e.alive), ...this.defeated, player];
    if (combat.state === 'BOSS') actors.push(combat.boss);
    for (const entity of actors.sort((a, b) => a.y - b.y)) {
      if (entity === player) {
        ctx.save(); if (combat.invulnerability > 0 && Math.floor(t * 12) % 2) ctx.globalAlpha = .4;
        player.draw(ctx); ctx.restore();
      } else {
        ctx.save();
        if (entity.since !== undefined) ctx.globalAlpha = 1 - (t - entity.since) / .5;
        // Heavy mobs stay in CHASE during crystal drops; read their live zone.
        let artState = null;
        if (entity.type === 'gravityHeavy' && entity.hp > 0) {
          const zone = combat.ground.zones.find(z => z.owner === entity.id && z.age < .35);
          artState = zone ? 'DROP' : entity.attackTimer < .25 ? 'TELEGRAPH' : null;
        }
        this.creature(ctx, entity, t, entity === combat.boss, { artState }); ctx.restore();
      }
    }
    for (const pulse of combat.pulses) {
      const progress = 1 - pulse.life / .35;
      const range = pulse.radius || C.range;
      ctx.save(); ctx.globalAlpha = (1 - progress) * .9; ctx.shadowColor = '#abefff'; ctx.shadowBlur = 15;
      ellipse(ctx, pulse.x, pulse.y, range * progress, range * progress, '#acdfff20', '#e9ffff', 5);
      ellipse(ctx, pulse.x, pulse.y, range * progress * .7, range * progress * .7, 'transparent', '#abaef2', 3);
      for (let i = 0; i < 8; i++) spark(ctx, pulse.x + Math.cos(i * Math.PI / 4) * range * progress, pulse.y + Math.sin(i * Math.PI / 4) * range * progress, 5);
      ctx.restore();
    }
    if (combat.state === 'ARRIVAL') {
      const elapsed = 4.4 - combat.timer;
      ellipse(ctx, combat.boss.x, combat.boss.y, 90, 27, '#21375244', null);
      if (elapsed > 1.3) this.creature(ctx, { ...combat.boss,
        y: combat.boss.y - (1 - clamp((elapsed - 1.3) / 1.3, 0, 1)) * 620 }, t, true);
    }
    if (combat.state === 'VICTORY') {
      const elapsed = C.victoryDuration - combat.timer;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - elapsed / 1.5);
      ellipse(ctx, combat.boss.x, combat.boss.y, 45 + elapsed * 200, 45 + elapsed * 200, '#eaffffbb', '#beeaff', 7); ctx.restore();
      const scale = Math.max(.28, 1 - Math.max(0, elapsed - .8) * .45);
      if (elapsed < 5.2) this.creature(ctx, { ...combat.boss, y: combat.boss.y - Math.max(0, elapsed - 2) * 110 }, t, true, { scale, light: true });
      for (let i = 0; i < 5; i++) {
        const rise = Math.max(0, elapsed - .7) * (38 + i * 8);
        ellipse(ctx, combat.boss.x + Math.sin(t + i) * 90, combat.boss.y - rise - i * 15, 10 + i * 3, 10 + i * 3, '#b9eaff55', '#edffff', 2);
      }
    }
    if (showRadius) { const range = combat.state === 'BOSS' ? C.bossRange : C.range; ctx.save(); ctx.setLineDash([6, 5]); ellipse(ctx, player.x, player.y, range, range, 'transparent', '#f6eeb9', 2); ctx.restore(); }
    if (combat.blockedTime > 0) drawText(ctx, 'CORE CLOSED', player.x, player.y - 78, { color: '#e4f6ff', size: 14 });
  }
  corePickup(ctx, drop, t) {
    ctx.save(); ctx.translate(drop.x, drop.y);
    ellipse(ctx, 0, 8, 30, 10, '#bcefff44', '#d8fcff', 2);
    const y = -32 + Math.sin(t * 3) * 4;
    ctx.shadowColor = '#a7efff'; ctx.shadowBlur = 16;
    if (this.ready(this.art?.core)) ctx.drawImage(this.art.core, -36, y - 36, 72, 72);
    else crystal(ctx, 0, y, 25, t);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) spark(ctx, Math.cos(t + i * 2.1) * 37, y + Math.sin(t + i * 2.1) * 22, 4);
    ctx.restore();
  }
}
