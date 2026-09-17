import { CONDITIONS, STATES, VIEWPORT } from './constants.js';
import { ComboManager } from './ComboManager.js';
import { EventDirector } from './EventDirector.js';
import { HUD } from './HUD.js';
import { InputController } from './InputController.js';
import { InteractionSystem } from './InteractionSystem.js';
import { ItemSystem } from './ItemSystem.js';
import { Player } from './Player.js';
import { ResultScreen } from './ResultScreen.js';
import { ScoreManager } from './ScoreManager.js';
import { StageManager } from './StageManager.js?v=camera-polish-1';
import { WorldRenderer } from './WorldRenderer.js?v=camera-polish-1';
import { clamp, drawText, formatClock, lerp } from './utils.js';

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(image);
    image.src = source;
  });
}

async function removeSpriteBackground(image) {
  if (!image?.naturalWidth) return image;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = pixels;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isNeutralBackground = (index) => {
    const r = data[index]; const g = data[index + 1]; const b = data[index + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return spread < 8 && r > 90 && r < 242;
  };
  const add = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const position = y * width + x;
    if (visited[position]) return;
    const index = position * 4;
    if (!isNeutralBackground(index)) return;
    visited[position] = 1;
    queue.push(position);
  };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { add(0, y); add(width - 1, y); }
  for (let head = 0; head < queue.length; head += 1) {
    const position = queue[head];
    const x = position % width;
    const y = Math.floor(position / width);
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    neighbors.forEach(([nx, ny]) => add(nx, ny));
  }
  for (let position = 0; position < visited.length; position += 1) {
    if (visited[position]) data[position * 4 + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  const cleaned = new Image();
  cleaned.src = canvas.toDataURL('image/png');
  await new Promise((resolve) => { cleaned.onload = resolve; cleaned.onerror = resolve; });
  return cleaned;
}

export class Game {
  constructor() {
    this.canvas = document.querySelector('#game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.appShell = document.querySelector('#app');
    this.homeScreen = document.querySelector('#home-screen');
    this.gameShell = document.querySelector('#game-shell');
    this.homeStageCards = [...document.querySelectorAll('[data-stage-select]')];
    this.startButton = document.querySelector('#start-button');
    this.rotateOverlay = document.querySelector('#rotate-overlay');
    this.selectedStage = 'park';
    this.state = 'home';
    this.lives = 3;
    this.npcs = [];
    this.particles = [];
    this.floaters = [];
    this.lastTimestamp = 0;
    this.lastDistanceSample = 0;
    this.debug = { open: false, infiniteLife: false, showRadius: false };
    this.spriteImage = null;
    this.playerSpriteSheet = null;
    this.npcSpriteImage = null;
    this.npcSpriteSheet = null;
    this.viewport = { ...VIEWPORT };
    this.displaySize = { ...VIEWPORT };
    this.pixelRatio = 1;
    this.cameraMode = 'fit';
    this.layoutMode = 'desktop';
    this.cameraState = null;

    this.stageManager = new StageManager();
    this.itemSystem = new ItemSystem();
    this.scoreManager = new ScoreManager();
    this.combo = new ComboManager();
    this.interactionSystem = new InteractionSystem(84);
    this.worldRenderer = new WorldRenderer();
    this.hud = new HUD();
    this.input = new InputController({
      onAction: () => this.tryAction(),
      onItemSelect: (itemId) => this.selectItem(itemId)
    });
    this.player = new Player(null);
    this.resultScreen = new ResultScreen({
      onReplay: () => this.startStage(this.selectedStage),
      onNext: () => this.startStage(this.selectedStage === 'park' ? 'mountain' : 'park'),
      onHome: () => this.showHome()
    });

    this.bindHome();
    this.bindDebug();
    this.bindResponsiveLayout();
    this.preloadAssets();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  async preloadAssets() {
    const worldJelly = await loadImage('./reference/world-jelly-player-hq.png');
    if (worldJelly.naturalWidth) {
      this.spriteImage = worldJelly;
      this.playerSpriteSheet = {
        frameWidth: worldJelly.naturalWidth / 4,
        frameHeight: worldJelly.naturalHeight,
        frameCount: 4,
        directionFrames: { down: 0, left: 1, right: 2, up: 3 },
        sourceY: Math.round(worldJelly.naturalHeight * 0.06),
        sourceHeight: Math.round(worldJelly.naturalHeight * 0.88),
        destinationWidth: 84,
        destinationHeight: 92,
        anchorOffset: 58
      };
      this.player.spriteSheet = this.playerSpriteSheet;
    } else {
      const rawSprite = await loadImage('./reference/player-jelly-preferred.png');
      this.spriteImage = await removeSpriteBackground(rawSprite);
      this.playerSpriteSheet = null;
      this.player.spriteSheet = null;
    }
    this.player.spriteImage = this.spriteImage;
    this.npcSpriteImage = await loadImage('./reference/generated-npcs-hiker-elder-child-hq.png');
    if (!this.npcSpriteImage.naturalWidth) this.npcSpriteImage = null;
    if (this.npcSpriteImage) {
      this.npcSpriteSheet = {
        frameWidth: this.npcSpriteImage.naturalWidth / 3,
        frameHeight: this.npcSpriteImage.naturalHeight,
        frameCount: 3
      };
    }
    this.npcs.forEach((npc) => {
      npc.spriteImage = this.npcSpriteImage;
      npc.spriteSheet = this.npcSpriteSheet;
    });
    const parkMap = await loadImage('./reference/generated-park-open-portrait-hq.png');
    if (parkMap.naturalWidth) this.worldRenderer.setParkImage(parkMap);
    const mountainMap = await loadImage('./reference/generated-mountain-open-portrait-hq.png');
    if (mountainMap.naturalWidth) this.worldRenderer.setMountainImage(mountainMap);
    const worldFront = await loadImage('./reference/world-jelly-front-hq.png');
    const homeCharacter = document.querySelector('.home-character-crop');
    if (homeCharacter && worldFront.src) homeCharacter.style.backgroundImage = `url("${worldFront.src}")`;
  }

  bindHome() {
    this.homeStageCards.forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedStage = card.dataset.stageSelect;
        this.homeStageCards.forEach((item) => {
          const selected = item === card;
          item.classList.toggle('is-selected', selected);
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
      });
    });
    this.startButton.addEventListener('click', () => this.startStage(this.selectedStage));
  }

  bindDebug() {
    const toggle = () => {
      this.debug.open = !this.debug.open;
      document.querySelector('#debug-panel').classList.toggle('is-hidden', !this.debug.open);
    };
    document.querySelector('#debug-toggle').addEventListener('click', toggle);
    document.querySelector('#debug-close').addEventListener('click', toggle);
    document.querySelectorAll('[data-debug]').forEach((button) => {
      button.addEventListener('click', () => this.handleDebug(button.dataset.debug, button));
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'F2' || event.code === 'Backquote') {
        event.preventDefault();
        toggle();
      }
    });
  }

  bindResponsiveLayout() {
    const update = () => {
      this.resizeCanvas();
      // Portrait play is supported directly; keep the overlay hidden instead of blocking the game.
      this.rotateOverlay.classList.add('is-hidden');
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    this.updateOrientation = update;
    this.resizeCanvas();
  }

  resizeCanvas() {
    const frame = document.querySelector('.game-frame');
    const canvasRect = this.canvas.getBoundingClientRect();
    const frameWidth = Math.round(canvasRect.width || frame?.clientWidth || window.innerWidth);
    const frameHeight = Math.round(canvasRect.height || frame?.clientHeight || window.innerHeight);
    const isPortraitPhone = frameHeight > frameWidth && frameWidth < 760;
    this.layoutMode = isPortraitPhone ? 'mobile-portrait' : frameWidth < 760 ? 'mobile-landscape' : 'desktop';
    this.cameraMode = isPortraitPhone ? 'fit' : 'follow';
    // Gameplay remains in world coordinates, while the render viewport tracks
    // the actual CSS box. This prevents a 960x540 canvas from being stretched
    // into a large desktop frame before the DPR is applied.
    this.viewport = { width: frameWidth, height: frameHeight };
    this.displaySize = { width: frameWidth, height: frameHeight };
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
    const bufferWidth = Math.max(1, Math.round(this.displaySize.width * this.pixelRatio));
    const bufferHeight = Math.max(1, Math.round(this.displaySize.height * this.pixelRatio));
    if (this.canvas.width !== bufferWidth || this.canvas.height !== bufferHeight) {
      this.canvas.width = bufferWidth;
      this.canvas.height = bufferHeight;
    }
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.cameraState = null;
  }

  resetAppScroll() {
    this.appShell?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    this.homeScreen.scrollTop = 0;
    this.resultScreen.screen.scrollTop = 0;
  }

  startStage(stageId) {
    this.selectedStage = stageId;
    const stage = this.stageManager.start(stageId);
    this.state = 'playing';
    this.lives = 3;
    this.npcs = [];
    this.particles = [];
    this.floaters = [];
    this.scoreManager.reset();
    this.combo.reset();
    this.itemSystem.reset();
    this.player.reset(stage.start);
    this.cameraState = null;
    this.lastDistanceSample = 0;
    this.eventDirector = new EventDirector(stage, {
      onFailure: (npc) => this.handleFailure(npc),
      onStateChange: (npc, state) => this.handleNPCStateChange(npc, state),
      onEvent: (npc) => this.handleEventStart(npc),
      onSpawn: (npc) => {
        npc.spriteImage = this.npcSpriteImage;
        npc.spriteSheet = this.npcSpriteSheet;
      }
    });
    this.eventDirector.seed(this.npcs);
    this.input.setEnabled(true);
    this.resultScreen.hide();
    this.homeScreen.classList.add('is-hidden');
    this.gameShell.classList.remove('is-hidden');
    this.debug.open = false;
    document.querySelector('#debug-panel').classList.add('is-hidden');
    this.hud.updateItems(this.itemSystem.selectedId);
    this.hud.showToast(`${stage.name} 開始`, 'info', '先觀察預警，再選擇正確道具。');
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  showHome() {
    this.state = 'home';
    this.input.setEnabled(false);
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.hide();
    this.homeScreen.classList.remove('is-hidden');
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  selectItem(itemId) {
    this.itemSystem.select(itemId);
    this.hud.updateItems(this.itemSystem.selectedId);
    if (this.state === 'playing') {
      const item = this.itemSystem.getSelected();
      this.hud.showToast(`${item.label} 已選取`, 'info', `${item.short} · 靠近求救居民後按 E 使用`);
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;
    const stage = this.stageManager.getStage();
    this.stageManager.update(dt);
    this.player.update(dt, this.input, stage);
    this.scoreManager.addDistance(Math.max(0, this.player.distanceTravelled - this.lastDistanceSample));
    this.lastDistanceSample = this.player.distanceTravelled;
    this.eventDirector.update(dt, this.stageManager.elapsed, this.npcs);
    for (const npc of this.npcs) npc.update(dt, stage, this.stageManager.elapsed);
    this.interactionSystem.findTarget(this.player, this.npcs);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.hud.update(this);
    if (this.stageManager.status === 'complete') this.finishStage();
  }

  tryAction() {
    if (this.state !== 'playing') return;
    const target = this.interactionSystem.currentTarget;
    if (!target) {
      this.hud.showToast('再靠近一點', 'info', '需要進入居民的救援範圍。');
      return;
    }
    if (this.itemSystem.isCorrect(target.condition)) {
      const responseTime = target.getResponseTime(this.stageManager.elapsed);
      const comboCount = this.combo.registerSuccess();
      const scored = this.scoreManager.recordRescue(responseTime, target.condition, this.combo.getMultiplier());
      target.rescue(this.stageManager.elapsed);
      this.createRescueParticles(target, target.condition);
      this.addFloater(target.x, target.y - 82, `+${scored.points}`, '#fff0b7');
      const rating = responseTime <= 3 ? 'PERFECT!' : responseTime <= 5 ? 'FAST!' : 'GOOD!';
      const comboText = comboCount >= 2 ? ` · ${comboCount} COMBO` : '';
      this.hud.showToast(rating, 'success', `+${scored.points} 分${comboText}`);
    } else {
      this.scoreManager.recordWrongItem();
      this.combo.break();
      target.penalizeWrongItem();
      this.createMistakeParticles(target);
      this.addFloater(target.x, target.y - 82, '好像不是這個……', '#ffd1b0');
      this.hud.showToast('好像不是這個……', 'danger', '耐受值繼續下降，換一個道具試試。');
    }
  }

  handleNPCStateChange(npc, state) {
    if (this.state !== 'playing') return;
    if (state === STATES.HELP) {
      this.hud.showToast('求救訊號！', 'info', `${npc.name} 需要 ${npc.condition === CONDITIONS.ITCH ? 'PPA+1' : 'NAP+1'}`);
    }
    if (state === STATES.CRITICAL) {
      this.hud.showToast('快受不了了！', 'danger', '先救最近的居民。');
    }
  }

  handleEventStart(npc) {
    if (this.stageManager.elapsed < 7) return;
    const conditionText = npc.condition === CONDITIONS.ITCH ? '癢' : '痠痛';
    this.addFloater(npc.x, npc.y - 90, conditionText, npc.condition === CONDITIONS.ITCH ? '#ffe09a' : '#a8deff');
  }

  handleFailure(npc) {
    if (this.state !== 'playing') return;
    this.scoreManager.recordFailure();
    this.combo.break();
    if (!this.debug.infiniteLife) this.lives = Math.max(0, this.lives - 1);
    this.createMistakeParticles(npc);
    this.hud.showToast('居民離開了……', 'danger', this.debug.infiniteLife ? '無限生命模式：仍可繼續巡邏。' : '生命 -1 · Combo 已中斷');
    if (this.lives <= 0) this.finishGameOver();
  }

  finishStage() {
    if (this.state !== 'playing') return;
    this.state = 'result';
    this.input.setEnabled(false);
    const result = this.scoreManager.getResult();
    result.maxCombo = this.combo.maxCombo;
    result.grade = this.scoreManager.getGrade();
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.showResult(result, this.stageManager.getStage(), this.selectedStage === 'park');
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  finishGameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.input.setEnabled(false);
    const result = this.scoreManager.getResult();
    result.maxCombo = this.combo.maxCombo;
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.showGameOver(result);
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  handleDebug(action, button) {
    if (this.state !== 'playing') return;
    if (action === 'itch' || action === 'soreness') {
      const condition = action === 'itch' ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
      const stage = this.stageManager.getStage();
      const npc = this.npcs.find((candidate) => candidate.canReceiveEvent(this.stageManager.elapsed)) || this.eventDirector.spawn(this.npcs);
      npc.role = 'elder';
      npc.path = [];
      npc.wanderTarget = null;
      npc.x = clamp(this.player.x + 58, 35, stage.world.width - 35);
      npc.y = clamp(this.player.y, 45, stage.world.height - 35);
      npc.zone = stage.zones.find((zone) => this.player.x >= zone.x && this.player.x <= zone.x + zone.width && this.player.y >= zone.y && this.player.y <= zone.y + zone.height)?.id || stage.zones[0].id;
      const triggered = npc.startEvent(condition, this.eventDirector.getTolerance(this.stageManager.elapsed), this.eventDirector.getWarningDuration(this.stageManager.elapsed));
      this.eventDirector.callbacks.onEvent?.(npc, condition);
      this.hud.showToast(triggered ? `${condition} 已強制觸發` : '目前沒有可用 NPC', triggered ? 'success' : 'danger');
    }
    if (action === 'clear') {
      this.npcs.forEach((npc) => {
        if ([STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state)) {
          npc.state = STATES.NORMAL; npc.condition = null; npc.tolerance = 0; npc.nextEventAt = this.stageManager.elapsed + 2;
        }
      });
      this.hud.showToast('事件已清除', 'info');
    }
    if (action === 'tolerance') {
      const activeEvent = this.npcs.find((npc) => [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state));
      if (activeEvent) {
        activeEvent.tolerance = Math.min(activeEvent.tolerance, 3);
        activeEvent.maxTolerance = Math.max(activeEvent.maxTolerance, 3);
        this.hud.showToast('耐受值已設為 3 秒', 'info', '方便快速驗證救援流程。');
      } else {
        this.hud.showToast('目前沒有進行中的事件', 'danger');
      }
    }
    if (action === 'life') {
      this.debug.infiniteLife = !this.debug.infiniteLife;
      button.textContent = `無限生命：${this.debug.infiniteLife ? 'ON' : 'OFF'}`;
    }
    if (action === 'radius') {
      this.debug.showRadius = !this.debug.showRadius;
      button.textContent = `互動半徑：${this.debug.showRadius ? 'ON' : 'OFF'}`;
    }
    if (action === 'stage') this.startStage(this.selectedStage === 'park' ? 'mountain' : 'park');
  }

  createRescueParticles(npc, condition) {
    const colors = condition === CONDITIONS.ITCH ? ['#fff1b1', '#e3b9ff', '#d0f5e5'] : ['#b7e4ff', '#d6c5ff', '#fff1c1'];
    for (let index = 0; index < 13; index += 1) {
      const angle = (Math.PI * 2 * index) / 13;
      this.particles.push({ x: npc.x, y: npc.y - 8, vx: Math.cos(angle) * (20 + Math.random() * 26), vy: Math.sin(angle) * (20 + Math.random() * 26) - 16, life: 0.9 + Math.random() * 0.3, maxLife: 1.2, size: 2 + Math.random() * 4, color: colors[index % colors.length], shape: 'spark' });
    }
  }

  createMistakeParticles(npc) {
    for (let index = 0; index < 8; index += 1) {
      this.particles.push({ x: npc.x, y: npc.y - 12, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 30, life: .65, maxLife: .65, size: 3 + Math.random() * 3, color: '#ffad93', shape: 'dot' });
    }
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.15, maxLife: 1.15 });
  }

  updateParticles(dt) {
    this.particles.forEach((particle) => {
      particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 28 * dt;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updateFloaters(dt) {
    this.floaters.forEach((floater) => { floater.life -= dt; floater.y -= 18 * dt; });
    this.floaters = this.floaters.filter((floater) => floater.life > 0);
  }

  getCamera(stage) {
    if (this.cameraMode === 'fit') {
      const scale = Math.min(
        this.viewport.width / stage.world.width,
        this.viewport.height / stage.world.height
      );
      return {
        mode: 'fit',
        x: (this.viewport.width - stage.world.width * scale) / 2,
        y: (this.viewport.height - stage.world.height * scale) / 2,
        scale
      };
    }

    // Landscape keeps the portrait world readable as a normal RPG slice. The
    // width-driven zoom fills the desktop frame without stretching the map,
    // while the minimum keeps smaller landscape devices from feeling distant.
    const scale = Math.max(1.45, this.viewport.width / (stage.world.width * 0.98));
    const visibleWidth = this.viewport.width / scale;
    const visibleHeight = this.viewport.height / scale;
    const targetX = clamp(
      this.player.x - visibleWidth / 2,
      0,
      Math.max(0, stage.world.width - visibleWidth)
    );
    const targetY = clamp(
      this.player.y - visibleHeight / 2,
      0,
      Math.max(0, stage.world.height - visibleHeight)
    );
    const previous = this.cameraState;
    const scaleChanged = !previous || Math.abs(previous.scale - scale) > 0.01;
    if (scaleChanged || previous.mode !== 'follow') {
      this.cameraState = { mode: 'follow', x: targetX, y: targetY, scale };
    } else {
      // Smooth follow avoids a visible snap when the player crosses a zone or
      // when a long diagonal route changes the camera's target.
      const followBlend = 0.18;
      this.cameraState.x = lerp(previous.x, targetX, followBlend);
      this.cameraState.y = lerp(previous.y, targetY, followBlend);
    }
    return { ...this.cameraState };
  }

  render(now = performance.now()) {
    if (this.state !== 'playing') return;
    const stage = this.stageManager.getStage();
    const camera = this.getCamera(stage);
    const ctx = this.ctx;
    const pixelRatio = this.pixelRatio || 1;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.fillStyle = stage.id === 'mountain' ? '#78ad83' : '#83c77f';
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.save();
    if (camera.mode === 'fit') {
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.scale, camera.scale);
    } else {
      ctx.translate(-camera.x * camera.scale, -camera.y * camera.scale);
      ctx.scale(camera.scale, camera.scale);
    }
    this.worldRenderer.draw(ctx, stage, now);
    const target = this.interactionSystem.currentTarget;
    if (target) {
      ctx.save(); ctx.strokeStyle = 'rgba(255, 235, 163, .38)'; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y - 4); ctx.lineTo(target.x, target.y - 4); ctx.stroke(); ctx.restore();
    }
    const entities = [...this.npcs.filter((npc) => npc.active), this.player].sort((a, b) => a.y - b.y);
    for (const entity of entities) {
      if (entity === this.player) entity.draw(ctx);
      else entity.draw(ctx, now, {
        debugRadius: this.debug.showRadius,
        cameraScale: camera.scale,
        compactStatusBubble: this.layoutMode !== 'desktop'
      });
    }
    if (this.debug.showRadius) {
      ctx.save(); ctx.strokeStyle = 'rgba(255, 235, 163, .35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.interactionSystem.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    this.renderParticles(ctx);
    this.renderFloaters(ctx);
    ctx.restore();
  }

  renderParticles(ctx) {
    this.particles.forEach((particle) => {
      ctx.save(); ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color;
      if (particle.shape === 'spark') {
        ctx.translate(particle.x, particle.y); ctx.rotate(particle.life * 5); ctx.beginPath(); ctx.moveTo(0, -particle.size * 2); ctx.lineTo(particle.size, 0); ctx.lineTo(0, particle.size * 2); ctx.lineTo(-particle.size, 0); ctx.closePath(); ctx.fill();
      } else { ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
  }

  renderFloaters(ctx) {
    this.floaters.forEach((floater) => {
      ctx.save(); ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1); drawText(ctx, floater.text, floater.x, floater.y, { size: floater.text.length > 5 ? 10 : 17, color: floater.color, weight: 900 }); ctx.restore();
    });
  }

  loop(timestamp) {
    const dt = this.lastTimestamp ? Math.min(0.05, (timestamp - this.lastTimestamp) / 1000) : 0;
    this.lastTimestamp = timestamp;
    this.update(dt);
    this.render(timestamp);
    requestAnimationFrame(this.loop);
  }
}
