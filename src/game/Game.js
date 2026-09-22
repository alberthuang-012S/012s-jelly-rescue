import { CONDITIONS, ITEMS, STATES, VIEWPORT } from './constants.js';
import { ComboManager } from './ComboManager.js';
import { EventDirector } from './EventDirector.js?mountain-pavilion-dialogue-v2';
import { HUD } from './HUD.js';
import { InputController } from './InputController.js?input-controls-v1';
import { InteractionSystem } from './InteractionSystem.js';
import { ItemSystem } from './ItemSystem.js';
import { Player } from './Player.js';
import { PersonalBestStore } from './PersonalBestStore.js?result-best-v1';
import { ResultScreen } from './ResultScreen.js?result-best-v1';
import { ScoreManager } from './ScoreManager.js';
import { StageManager } from './StageManager.js?v=mountain-pavilion-dialogue-v2';
import { TutorialDirector } from './TutorialDirector.js?mountain-pavilion-dialogue-v2';
import { WorldRenderer } from './WorldRenderer.js?v=mountain-pavilion-dialogue-v2';
import { clamp, drawText, formatClock, lerp } from './utils.js';

const ASSET_PATHS = Object.freeze({
  player: [
    './reference/jelly-anthropomorphic-player-walk.png',
    './reference/jelly-anthropomorphic-player.png',
    './reference/runtime/jelly-player.webp',
    './reference/world-jelly-player-hq.png'
  ],
  playerFallback: './reference/player-jelly-preferred.png',
  npc: [
    './reference/runtime/npc-sprites.webp',
    './reference/generated-npcs-hiker-elder-child-hq.png'
  ],
  ppa: [
    './reference/runtime/ppa-plus-one.webp',
    './reference/ppa-plus-one.png'
  ],
  nap: [
    './reference/runtime/nap-plus-one.webp',
    './reference/nap-plus-one.png'
  ],
  home: [
    './reference/jelly-anthropomorphic-home.png',
    './reference/runtime/jelly-home.webp',
    './reference/world-jelly-front-hq.png'
  ],
  park: [
    './reference/generated-park-open-portrait-hq.webp',
    './reference/generated-park-open-portrait-hq.png'
  ],
  mountain: [
    './reference/generated-mountain-open-portrait-hq.webp',
    './reference/generated-mountain-open-portrait-hq.png'
  ]
});

const HOME_STAGE_CONTENT = Object.freeze({
  tutorial: {
    tone: 'tutorial',
    kicker: '新手教學',
    title: 'JELLY TRAINING',
    description: '學習移動、辨認居民狀況，以及 PPA+1 / NAP+1 的使用方式。',
    meta: ['無時間限制', '初次遊玩推薦'],
    artLabel: 'JELLY TRAINING',
    preview: ASSET_PATHS.park[0],
    fallback: ASSET_PATHS.park[1],
    alt: 'Jelly Park 教學預覽'
  },
  park: {
    tone: 'park',
    kicker: '城市公園',
    title: 'JELLY PARK',
    description: '在寬闊步道間快速發現居民狀況，練習判斷與救援速度。',
    meta: ['1 分鐘', '反應型關卡'],
    artLabel: 'JELLY PARK',
    preview: ASSET_PATHS.park[0],
    fallback: ASSET_PATHS.park[1],
    alt: 'Jelly Park 城市公園地圖預覽'
  },
  mountain: {
    tone: 'mountain',
    kicker: '山谷巡邏',
    title: 'JELLY MOUNTAIN',
    description: '面對較遠的救援目標，判斷先後順序並規劃移動路線。',
    meta: ['1 分鐘', '路線型關卡'],
    artLabel: 'JELLY MOUNTAIN',
    preview: ASSET_PATHS.mountain[0],
    fallback: ASSET_PATHS.mountain[1],
    alt: 'Jelly Mountain 山谷地圖預覽'
  }
});

const ASSET_REPORT_ENABLED = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  && new URLSearchParams(window.location.search).has('assetReport');
const assetReport = [];

const TUTORIAL_DEBUG_CONDITION = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('tutorialCondition')?.toLowerCase()
  : '';

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function getResourceEntry(source) {
  if (typeof performance === 'undefined' || !performance.getEntriesByName) return null;
  const absoluteSource = new URL(source, window.location.href).href;
  const entries = performance.getEntriesByName(absoluteSource);
  return entries[entries.length - 1] || null;
}

function loadImage(source, { fetchPriority = 'auto', assetName = source } = {}) {
  return new Promise((resolve) => {
    const loadStart = now();
    const image = new Image();
    let settled = false;
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = fetchPriority;
    const finish = async (loaded) => {
      if (settled) return;
      settled = true;
      const downloadComplete = now();
      let decodeComplete = downloadComplete;
      let decodeSucceeded = false;
      if (loaded && typeof image.decode === 'function') {
        try {
          await image.decode();
          decodeSucceeded = true;
          decodeComplete = now();
        } catch {
          decodeComplete = now();
        }
      }
      const resource = getResourceEntry(image.currentSrc || image.src);
      if (ASSET_REPORT_ENABLED) {
        assetReport.push({
          asset: assetName,
          format: source.split('.').pop().toUpperCase(),
          bytes: resource?.encodedBodySize || resource?.transferSize || null,
          loadStart: Math.round(loadStart),
          downloadMs: Math.round(downloadComplete - loadStart),
          decodeMs: Math.round(decodeComplete - downloadComplete),
          totalMs: Math.round(decodeComplete - loadStart),
          cacheHit: resource ? resource.transferSize === 0 : null,
          decoded: loaded && (decodeSucceeded || typeof image.decode !== 'function')
        });
      }
      resolve(image);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = source;
  });
}

async function loadImageWithFallback(sources, { assetName, ...options } = {}) {
  const candidates = Array.isArray(sources) ? sources : [sources];
  let lastImage = null;
  for (const source of candidates) {
    const image = await loadImage(source, { ...options, assetName: assetName || source });
    lastImage = image;
    if (image.naturalWidth) return image;
  }
  return lastImage;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
    this.homeStageFeatured = document.querySelector('#home-featured-stage');
    this.homeStageKicker = document.querySelector('#home-stage-kicker');
    this.homeStageTitle = document.querySelector('#home-stage-title');
    this.homeStageDescription = document.querySelector('#home-stage-description');
    this.homeStageMeta = document.querySelector('#home-stage-meta');
    this.homeStageArtLabel = document.querySelector('#home-stage-art-label');
    this.homeStagePreviewSource = document.querySelector('#home-stage-preview-source');
    this.homeStagePreview = document.querySelector('#home-stage-preview');
    this.startButton = document.querySelector('#start-button');
    this.rotateOverlay = document.querySelector('#rotate-overlay');
    this.loadingOverlay = document.querySelector('#loading-overlay');
    this.loadingTitle = document.querySelector('#loading-title');
    this.loadingProgressBar = document.querySelector('#loading-progress-bar');
    this.loadingProgressText = document.querySelector('#loading-progress-text');
    this.tutorialModal = document.querySelector('#tutorial-modal');
    this.tutorialModalStep = document.querySelector('#tutorial-modal-step');
    this.tutorialModalTitle = document.querySelector('#tutorial-modal-title');
    this.tutorialModalIcon = document.querySelector('#tutorial-modal-icon');
    this.tutorialModalVisualLabel = document.querySelector('#tutorial-modal-visual-label');
    this.tutorialModalBody = document.querySelector('#tutorial-modal-body');
    this.tutorialModalHint = document.querySelector('#tutorial-modal-hint');
    this.tutorialModalFlow = document.querySelector('#tutorial-modal-flow');
    this.tutorialModalItem = document.querySelector('#tutorial-modal-item');
    this.tutorialModalPrimary = document.querySelector('#tutorial-modal-primary');
    this.tutorialModalSecondary = document.querySelector('#tutorial-modal-secondary');
    this.tutorialModalTertiary = document.querySelector('#tutorial-modal-tertiary');
    this.exitStageButton = document.querySelector('#exit-stage-button');
    this.exitConfirmModal = document.querySelector('#exit-confirm-modal');
    this.exitConfirmBody = document.querySelector('#exit-confirm-body');
    this.exitConfirmPrimary = document.querySelector('#exit-confirm-primary');
    this.exitConfirmSecondary = document.querySelector('#exit-confirm-secondary');
    this.selectedStage = 'tutorial';
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
    this.pavilionRoofOpacity = 1;
    this.playerAssetPromise = null;
    this.npcAssetPromise = null;
    this.itemAssetPromises = new Map();
    this.stageMapPromises = new Map();
    this.loadingToken = 0;
    this.eventDirector = null;
    this.tutorialDirector = null;
    this.isTutorialModalOpen = false;
    this.tutorialModalMode = '';
    this.isExitConfirmOpen = false;
    this.exitPreviousTutorialMode = '';
    this.tutorialTransitionTimer = null;
    this.tutorialDebugCondition = TUTORIAL_DEBUG_CONDITION === 'itch'
      ? CONDITIONS.ITCH
      : TUTORIAL_DEBUG_CONDITION === 'soreness'
        ? CONDITIONS.SORENESS
        : null;
    this.homeStageTransitionTimer = null;
    if (ASSET_REPORT_ENABLED) window.__jellyAssetReport = assetReport;

    this.stageManager = new StageManager();
    this.itemSystem = new ItemSystem();
    this.scoreManager = new ScoreManager();
    this.personalBestStore = new PersonalBestStore();
    this.combo = new ComboManager();
    this.interactionSystem = new InteractionSystem(84);
    this.worldRenderer = new WorldRenderer();
    this.hud = new HUD();
    this.input = new InputController({
      onAction: () => this.tryAction(),
      onItemSelect: (itemId) => this.selectItem(itemId),
      onItemToggle: () => this.toggleItem(),
      onEscape: () => this.handleEscape()
    });
    this.player = new Player(null);
    this.resultScreen = new ResultScreen({
      onReplay: () => this.startStage(this.selectedStage),
      onNext: () => this.startStage(this.getNextStageId()),
      onHome: () => this.showHome()
    });

    this.bindHome();
    this.updateHomeSelection();
    this.bindDebug();
    this.bindTutorialModal();
    this.bindExitConfirmation();
    this.bindResponsiveLayout();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  isTutorial() {
    return this.selectedStage === 'tutorial';
  }

  getNextStageId() {
    if (this.selectedStage === 'tutorial') return 'park';
    if (this.selectedStage === 'park') return 'mountain';
    return 'park';
  }

  getNextStageLabel() {
    if (this.selectedStage === 'tutorial') return '開始 Jelly Park';
    if (this.selectedStage === 'park') return '前往 Jelly Mountain';
    return '回到 Jelly Park';
  }

  updateHomeSelection() {
    const content = HOME_STAGE_CONTENT[this.selectedStage] || HOME_STAGE_CONTENT.tutorial;
    const stageChanged = this.homeStageFeatured?.dataset.stage && this.homeStageFeatured.dataset.stage !== this.selectedStage;
    this.homeStageCards.forEach((item) => {
      const selected = item.dataset.stageSelect === this.selectedStage;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    this.homeScreen.dataset.stageTone = content.tone;
    if (this.homeStageFeatured) {
      this.homeStageFeatured.dataset.stage = this.selectedStage;
      if (stageChanged) {
        window.clearTimeout(this.homeStageTransitionTimer);
        this.homeStageFeatured.classList.add('is-changing');
        this.homeStageTransitionTimer = window.setTimeout(() => {
          this.homeStageFeatured?.classList.remove('is-changing');
        }, 280);
      }
    }
    if (this.homeStageKicker) this.homeStageKicker.textContent = content.kicker;
    if (this.homeStageTitle) this.homeStageTitle.textContent = content.title;
    if (this.homeStageDescription) this.homeStageDescription.textContent = content.description;
    if (this.homeStageMeta) {
      this.homeStageMeta.replaceChildren(...content.meta.map((label) => {
        const item = document.createElement('span');
        item.textContent = label;
        return item;
      }));
    }
    if (this.homeStageArtLabel) this.homeStageArtLabel.textContent = content.artLabel;
    if (this.homeStagePreviewSource) this.homeStagePreviewSource.srcset = content.preview;
    if (this.homeStagePreview) {
      this.homeStagePreview.src = content.fallback;
      this.homeStagePreview.alt = content.alt;
      this.homeStagePreview.loading = this.selectedStage === 'mountain' ? 'lazy' : 'eager';
      this.homeStagePreview.fetchPriority = this.selectedStage === 'mountain' ? 'low' : 'high';
    }
    const label = this.startButton.querySelector('span');
    if (label) label.textContent = this.isTutorial() ? '開始教學' : '開始巡邏';
  }

  ensurePlayerAsset() {
    if (this.playerAssetPromise) return this.playerAssetPromise;
    this.playerAssetPromise = loadImageWithFallback(ASSET_PATHS.player, {
      fetchPriority: 'high',
      assetName: 'Player sprite'
    }).then(async (worldJelly) => {
      if (worldJelly?.naturalWidth) {
        this.spriteImage = worldJelly;
        const isWalkingGrid = worldJelly.naturalHeight > worldJelly.naturalWidth;
        this.playerSpriteSheet = isWalkingGrid
          ? {
            frameWidth: worldJelly.naturalWidth / 3,
            frameHeight: worldJelly.naturalHeight / 4,
            frameCount: 3,
            directionRows: { down: 0, left: 1, right: 2, up: 3 },
            destinationWidth: 84,
            destinationHeight: 92,
            anchorOffset: 58
          }
          : {
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
        const rawSprite = await loadImage(ASSET_PATHS.playerFallback, {
          fetchPriority: 'high',
          assetName: 'Player fallback'
        });
        this.spriteImage = await removeSpriteBackground(rawSprite);
        this.playerSpriteSheet = null;
        this.player.spriteSheet = null;
      }
      this.player.spriteImage = this.spriteImage;
      return this.spriteImage;
    });
    return this.playerAssetPromise;
  }

  ensureNpcAsset() {
    if (this.npcAssetPromise) return this.npcAssetPromise;
    this.npcAssetPromise = loadImageWithFallback(ASSET_PATHS.npc, {
      fetchPriority: 'high',
      assetName: 'NPC sprite'
    }).then((npcSprite) => {
      this.npcSpriteImage = npcSprite?.naturalWidth ? npcSprite : null;
      this.npcSpriteSheet = this.npcSpriteImage ? {
        frameWidth: this.npcSpriteImage.naturalWidth / 3,
        frameHeight: this.npcSpriteImage.naturalHeight,
        frameCount: 3
      } : null;
      this.npcs.forEach((npc) => {
        npc.spriteImage = this.npcSpriteImage;
        npc.spriteSheet = this.npcSpriteSheet;
      });
      return this.npcSpriteImage;
    });
    return this.npcAssetPromise;
  }

  ensureItemAsset(itemId) {
    if (this.itemAssetPromises.has(itemId)) return this.itemAssetPromises.get(itemId);
    const assetName = itemId === 'PPA' ? 'PPA+1' : 'NAP+1';
    const itemPromise = loadImageWithFallback(ASSET_PATHS[itemId === 'PPA' ? 'ppa' : 'nap'], {
      fetchPriority: 'high',
      assetName
    });
    this.itemAssetPromises.set(itemId, itemPromise);
    return itemPromise;
  }

  loadCriticalAssets(stageId, onProgress = () => {}) {
    const criticalTasks = [
      ['Stage map', this.ensureStageMap(stageId, { fetchPriority: 'high' })],
      ['Player', this.ensurePlayerAsset()],
      ['NPC', this.ensureNpcAsset()],
      ['PPA+1', this.ensureItemAsset('PPA')],
      ['NAP+1', this.ensureItemAsset('NAP')]
    ];
    let completed = 0;
    onProgress(0, '準備巡邏素材');
    const result = Promise.all(criticalTasks.map(([label, task]) => task.then((value) => {
      completed += 1;
      onProgress(completed / criticalTasks.length, `${label} ready`);
      return value;
    })));
    return result.then((assets) => {
      if (ASSET_REPORT_ENABLED) console.table(assetReport);
      return assets;
    });
  }

  showLoading(stage) {
    this.loadingTitle.textContent = `載入${stage.name}…`;
    this.loadingOverlay.classList.remove('is-hidden');
    this.loadingOverlay.setAttribute('aria-hidden', 'false');
    this.updateLoading(0, '準備巡邏素材');
  }

  updateLoading(progress, label) {
    const percent = Math.round(clamp(progress, 0, 1) * 100);
    this.loadingProgressBar.style.width = `${percent}%`;
    this.loadingProgressText.textContent = `${label} · ${percent}%`;
  }

  hideLoading() {
    this.loadingOverlay.classList.add('is-hidden');
    this.loadingOverlay.setAttribute('aria-hidden', 'true');
  }

  scheduleNextStagePreload(stageId) {
    const nextStageId = stageId === 'park' ? 'mountain' : 'park';
    const preload = () => {
      if (this.state === 'playing' && this.selectedStage === stageId) {
        this.ensureStageMap(nextStageId, { fetchPriority: 'low' });
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preload, { timeout: 2500 });
    } else {
      window.setTimeout(preload, 900);
    }
  }

  ensureStageMap(stageId, { fetchPriority = 'high' } = {}) {
    const mapId = stageId === 'mountain' ? 'mountain' : 'park';
    if (this.stageMapPromises.has(mapId)) return this.stageMapPromises.get(mapId);
    const mapPromise = loadImageWithFallback(ASSET_PATHS[mapId], {
      fetchPriority,
      assetName: `${mapId} map`
    }).then((mapImage) => {
      if (!mapImage.naturalWidth) return mapImage;
      if (mapId === 'mountain') {
        this.worldRenderer.setMountainImage(mapImage);
      } else {
        this.worldRenderer.setParkImage(mapImage);
      }
      return mapImage;
    });
    this.stageMapPromises.set(mapId, mapPromise);
    return mapPromise;
  }

  bindHome() {
    this.homeStageCards.forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedStage = card.dataset.stageSelect;
        this.updateHomeSelection();
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

  bindTutorialModal() {
    if (!this.tutorialModalPrimary) return;
    this.tutorialModalPrimary.addEventListener('click', () => this.handleTutorialModalAction('primary'));
    this.tutorialModalSecondary?.addEventListener('click', () => this.handleTutorialModalAction('secondary'));
    this.tutorialModalTertiary?.addEventListener('click', () => this.handleTutorialModalAction('tertiary'));
  }

  bindExitConfirmation() {
    this.exitStageButton?.addEventListener('click', () => this.openExitConfirmation());
    this.exitConfirmPrimary?.addEventListener('click', () => this.confirmExit());
    this.exitConfirmSecondary?.addEventListener('click', () => this.closeExitConfirmation());
  }

  handleEscape() {
    if (this.isExitConfirmOpen) {
      this.closeExitConfirmation();
      return;
    }
    if (this.state === 'playing') this.openExitConfirmation();
  }

  openExitConfirmation() {
    if (this.state !== 'playing' || this.isExitConfirmOpen) return;
    if (this.isTutorial() && (this.tutorialModalMode === 'complete' || this.tutorialDirector?.isComplete?.())) return;

    this.isExitConfirmOpen = true;
    this.exitPreviousTutorialMode = this.isTutorialModalOpen ? this.tutorialModalMode : '';
    this.input.setEnabled(false);
    this.gameShell.classList.add('is-exit-confirm-open');
    if (this.isTutorialModalOpen) {
      this.tutorialModal?.classList.add('is-hidden');
      this.tutorialModal?.setAttribute('aria-hidden', 'true');
    }
    if (this.exitConfirmBody) {
      this.exitConfirmBody.textContent = this.isTutorial()
        ? '目前的教學進度將會重新開始。'
        : '目前的巡邏進度將不會保留。';
    }
    this.exitConfirmModal?.classList.remove('is-hidden');
    this.exitConfirmModal?.setAttribute('aria-hidden', 'false');
    this.hud.update(this);
    window.requestAnimationFrame(() => this.exitConfirmPrimary?.focus());
  }

  closeExitConfirmation({ resume = true } = {}) {
    if (!this.isExitConfirmOpen) return;
    const restoreTutorialModal = resume
      && this.state === 'playing'
      && Boolean(this.exitPreviousTutorialMode);
    this.isExitConfirmOpen = false;
    this.gameShell.classList.remove('is-exit-confirm-open');
    this.exitConfirmModal?.classList.add('is-hidden');
    this.exitConfirmModal?.setAttribute('aria-hidden', 'true');
    if (restoreTutorialModal) {
      this.tutorialModal?.classList.remove('is-hidden');
      this.tutorialModal?.setAttribute('aria-hidden', 'false');
      this.input.setEnabled(false);
    } else if (resume && this.state === 'playing') {
      this.input.setEnabled(true);
    }
    this.exitPreviousTutorialMode = '';
    this.hud.update(this);
    window.requestAnimationFrame(() => {
      if (restoreTutorialModal) this.tutorialModalPrimary?.focus();
      else if (resume) this.exitStageButton?.focus();
    });
  }

  confirmExit() {
    if (!this.isExitConfirmOpen) return;
    this.closeExitConfirmation({ resume: false });
    this.showHome();
  }

  getTutorialModalCopy(mode) {
    const isMobile = this.layoutMode !== 'desktop';
    const copy = {
      move: {
        step: 'STEP 1 / 4',
        title: '先試著移動',
        icon: '↕',
        visual: '移動',
        body: isMobile
          ? '這裡沒有時間限制，可以慢慢操作。\n\n使用左下方方向控制移動小水母。\n先移動一小段，熟悉操作。'
          : '這裡沒有時間限制，可以慢慢操作。\n\n使用 WASD 或方向鍵移動小水母。\n先移動一小段，熟悉操作。',
        hint: isMobile ? '移動控制在畫面左下方。' : 'WASD / 方向鍵',
        primary: '開始練習'
      },
      itch: {
        step: 'STEP 2 / 4',
        title: '居民覺得癢',
        icon: '✦ 癢',
        visual: '好癢！',
        item: 'PPA',
        body: '癢 → PPA+1\n看到居民說「好癢！」時，選擇 PPA+1。',
        flow: ['① 找到居民', '② 選擇 PPA+1', '③ 靠近並使用'],
        hint: isMobile
          ? '靠近後按下方「使用」。'
          : '點選 PPA+1 · 靠近後按 E / SPACE 使用',
        primary: '開始第一次救援'
      },
      soreness: {
        step: 'STEP 3 / 4',
        title: '這次是痠痛',
        icon: '↯ 痠痛',
        visual: '痠痛不太舒服……',
        item: 'NAP',
        body: '痠痛 → NAP+1\n看到居民說「痠痛不太舒服……」時，改用 NAP+1。',
        flow: ['① 觀察居民 Bubble', '② 切換 NAP+1', '③ 靠近並使用'],
        hint: isMobile
          ? '直接點選下方 NAP+1，再按「使用」。'
          : 'Q = 快速切換 · 點選 NAP+1 · 靠近後按 E / SPACE',
        primary: '開始第二次救援'
      },
      'final-check': {
        step: 'STEP 4 / 4',
        title: '最後試一次',
        icon: '?',
        visual: '自己判斷',
        body: '這次不告訴你要使用哪個道具。\n觀察居民的狀況，再自己選擇。',
        flow: ['✦ 癢', '↯ 痠痛'],
        hint: isMobile ? '兩個道具都可以自由選擇。' : '觀察 Bubble，再選擇正確道具。',
        primary: '開始最後練習'
      },
      complete: {
        step: 'COMPLETE',
        title: '教學完成',
        icon: '✓',
        visual: '準備出發',
        body: '準備好開始第一次正式巡邏了。',
        products: [
          { condition: '✦ 癢', itemId: 'PPA', itemLabel: 'PPA+1' },
          { condition: '↯ 痠痛', itemId: 'NAP', itemLabel: 'NAP+1' }
        ],
        hint: '看到居民求救 → 判斷狀況 → 選擇正確道具 → 靠近並使用',
        primary: '前往 Jelly Park',
        secondary: '再練習一次',
        tertiary: '回主選單'
      }
    };
    return copy[mode] || copy.move;
  }

  renderTutorialModal(mode) {
    const copy = this.getTutorialModalCopy(mode);
    this.tutorialModal.dataset.mode = mode;
    this.tutorialModalStep.textContent = copy.step;
    this.tutorialModalTitle.textContent = copy.title;
    this.tutorialModalIcon.textContent = copy.icon;
    this.tutorialModalVisualLabel.textContent = copy.visual || '';
    this.tutorialModalVisualLabel.classList.toggle('is-hidden', !copy.visual);
    this.tutorialModalBody.textContent = copy.body;
    this.tutorialModalHint.textContent = copy.hint;
    const flowItems = copy.products?.length
      ? copy.products.map(({ condition, itemId, itemLabel }) => {
        const item = document.createElement('span');
        item.className = 'tutorial-modal-product';
        const source = document.querySelector(`[data-item="${itemId}"] img`);
        const image = document.createElement('img');
        image.src = source?.currentSrc || source?.src || '';
        image.alt = itemLabel;
        const labels = document.createElement('span');
        const conditionLabel = document.createElement('b');
        conditionLabel.textContent = condition;
        const itemLabelNode = document.createElement('small');
        itemLabelNode.textContent = itemLabel;
        labels.append(conditionLabel, itemLabelNode);
        item.append(image, labels);
        return item;
      })
      : (copy.flow || []).map((label) => {
        const item = document.createElement('span');
        item.textContent = label;
        return item;
      });
    this.tutorialModalFlow.replaceChildren(...flowItems);
    this.tutorialModalFlow.classList.toggle('is-hidden', !flowItems.length);
    this.tutorialModalFlow.classList.toggle('is-product-map', Boolean(copy.products?.length));
    const itemImage = copy.item
      ? document.querySelector(`[data-item="${copy.item}"] img`)
      : null;
    if (itemImage) {
      this.tutorialModalItem.src = itemImage.currentSrc || itemImage.src;
      this.tutorialModalItem.alt = copy.item === 'PPA' ? 'PPA+1' : 'NAP+1';
      this.tutorialModalItem.classList.remove('is-hidden');
    } else {
      this.tutorialModalItem.removeAttribute('src');
      this.tutorialModalItem.alt = '';
      this.tutorialModalItem.classList.add('is-hidden');
    }
    this.tutorialModalPrimary.textContent = copy.primary;
    this.tutorialModalSecondary.textContent = copy.secondary || '';
    this.tutorialModalSecondary.classList.toggle('is-hidden', !copy.secondary);
    this.tutorialModalTertiary.textContent = copy.tertiary || '';
    this.tutorialModalTertiary.classList.toggle('is-hidden', !copy.tertiary);
  }

  openTutorialModal(mode) {
    if (!this.tutorialModal || !this.isTutorial()) return;
    this.isTutorialModalOpen = true;
    this.tutorialModalMode = mode;
    this.input.setEnabled(false);
    this.gameShell.classList.add('is-tutorial-modal-open');
    this.renderTutorialModal(mode);
    this.tutorialModal.classList.remove('is-hidden');
    this.tutorialModal.setAttribute('aria-hidden', 'false');
    this.hud.update(this);
    window.requestAnimationFrame(() => this.tutorialModalPrimary.focus());
  }

  closeTutorialModal({ enableInput = true } = {}) {
    this.isTutorialModalOpen = false;
    this.tutorialModalMode = '';
    this.gameShell.classList.remove('is-tutorial-modal-open');
    this.tutorialModal?.classList.add('is-hidden');
    this.tutorialModal?.setAttribute('aria-hidden', 'true');
    if (enableInput && this.state === 'playing' && this.isTutorial()) this.input.setEnabled(true);
  }

  beginTutorialRescue() {
    this.closeTutorialModal({ enableInput: false });
    this.tutorialDirector?.beginRescue(this.stageManager.elapsed, this.npcs, this.player);
    this.input.setEnabled(true);
    this.hud.update(this);
  }

  handleTutorialModalAction(action) {
    if (!this.isTutorialModalOpen) return;
    if (this.tutorialModalMode === 'move' && action === 'primary') {
      this.closeTutorialModal();
      return;
    }
    if (this.tutorialModalMode === 'itch' && action === 'primary') {
      this.beginTutorialRescue();
      return;
    }
    if (this.tutorialModalMode === 'soreness' && action === 'primary') {
      this.beginTutorialRescue();
      return;
    }
    if (this.tutorialModalMode === 'final-check' && action === 'primary') {
      this.beginTutorialRescue();
      return;
    }
    if (this.tutorialModalMode === 'complete') {
      if (action === 'primary') this.startStage('park');
      if (action === 'secondary') this.startStage('tutorial');
      if (action === 'tertiary') this.showHome();
    }
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

  async startStage(stageId) {
    window.clearTimeout(this.tutorialTransitionTimer);
    this.tutorialTransitionTimer = null;
    this.closeExitConfirmation({ resume: false });
    this.closeTutorialModal({ enableInput: false });
    this.selectedStage = stageId;
    this.updateHomeSelection();
    const loadingToken = ++this.loadingToken;
    const stage = this.stageManager.start(stageId);
    this.state = 'loading';
    this.lives = 3;
    this.npcs = [];
    this.particles = [];
    this.floaters = [];
    this.scoreManager.reset();
    this.combo.reset();
    this.itemSystem.reset();
    this.interactionSystem.currentTarget = null;
    this.player.reset(stage.start);
    this.cameraState = null;
    this.pavilionRoofOpacity = 1;
    this.lastDistanceSample = 0;
    const directorCallbacks = {
      onFailure: (npc) => this.handleFailure(npc),
      onStateChange: (npc, state) => this.handleNPCStateChange(npc, state),
      onEvent: (npc) => this.handleEventStart(npc),
      onSpawn: (npc) => {
        npc.spriteImage = this.npcSpriteImage;
        npc.spriteSheet = this.npcSpriteSheet;
      },
      getPlayer: () => this.player
    };
    this.eventDirector = null;
    this.tutorialDirector = null;
    if (this.isTutorial()) {
      this.tutorialDirector = new TutorialDirector(stage, {
        ...directorCallbacks,
        getFinalCondition: () => this.tutorialDebugCondition,
        onStep: (step, npc) => this.handleTutorialStep(step, npc)
      });
    } else {
      this.eventDirector = new EventDirector(stage, directorCallbacks);
      this.eventDirector.seed(this.npcs);
    }
    this.hud.update(this);
    this.input.setEnabled(false);
    this.resultScreen.hide();
    this.homeScreen.classList.add('is-hidden');
    this.gameShell.classList.remove('is-hidden');
    this.debug.open = false;
    document.querySelector('#debug-panel').classList.add('is-hidden');
    this.updateOrientation?.();
    this.resetAppScroll();
    this.showLoading(stage);

    const loadStartedAt = now();
    try {
      await this.loadCriticalAssets(stageId, (progress, label) => {
        if (loadingToken === this.loadingToken) this.updateLoading(progress, label);
      });
    } catch (error) {
      console.error('Critical asset loading failed; using available fallbacks.', error);
    }
    const minimumLoadingTime = 180;
    const remainingLoadingTime = minimumLoadingTime - (now() - loadStartedAt);
    if (remainingLoadingTime > 0) await wait(remainingLoadingTime);
    if (loadingToken !== this.loadingToken) return;

    this.state = 'playing';
    this.hud.updateItems(this.itemSystem.selectedId);
    this.hideLoading();
    if (this.isTutorial()) {
      this.openTutorialModal('move');
    } else {
      this.input.setEnabled(true);
    }
    this.scheduleNextStagePreload(stageId);
  }

  showHome() {
    this.loadingToken += 1;
    window.clearTimeout(this.tutorialTransitionTimer);
    this.tutorialTransitionTimer = null;
    this.closeExitConfirmation({ resume: false });
    this.closeTutorialModal({ enableInput: false });
    this.state = 'home';
    this.input.setEnabled(false);
    this.hideLoading();
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.hide();
    this.homeScreen.classList.remove('is-hidden');
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  selectItem(itemId) {
    this.itemSystem.select(itemId);
    this.hud.updateItems(this.itemSystem.selectedId);
  }

  toggleItem() {
    if (this.state !== 'playing') return;
    this.itemSystem.toggle();
    this.hud.updateItems(this.itemSystem.selectedId);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    if (this.isTutorialModalOpen || this.isExitConfirmOpen) return;
    const stage = this.stageManager.getStage();
    this.stageManager.update(dt);
    this.player.update(dt, this.input, stage);
    if (!this.isTutorial()) {
      this.scoreManager.addDistance(Math.max(0, this.player.distanceTravelled - this.lastDistanceSample));
    }
    this.lastDistanceSample = this.player.distanceTravelled;
    if (this.tutorialDirector) {
      this.tutorialDirector.update(dt, this.stageManager.elapsed, this.npcs, this.player);
    } else {
      this.eventDirector?.update(dt, this.stageManager.elapsed, this.npcs);
    }
    if (this.isTutorialModalOpen || this.isExitConfirmOpen) {
      this.hud.update(this);
      return;
    }
    for (const npc of this.npcs) npc.update(dt, stage, this.stageManager.elapsed);
    this.updatePavilionRoof(dt, stage);
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
      this.hud.showActionFeedback();
      return;
    }
    if (this.itemSystem.isCorrect(target.condition)) {
      if (this.isTutorial()) {
        target.rescue(this.stageManager.elapsed);
        this.createRescueParticles(target, target.condition);
        return;
      }
      const responseTime = target.getResponseTime(this.stageManager.elapsed);
      const comboCount = this.combo.registerSuccess();
      const scored = this.scoreManager.recordRescue(responseTime, target.condition, this.combo.getMultiplier());
      target.rescue(this.stageManager.elapsed);
      this.createRescueParticles(target, target.condition);
      const rating = responseTime <= 3 ? 'PERFECT' : responseTime <= 5 ? 'FAST' : 'GOOD';
      const comboText = comboCount >= 2 ? ` · ${comboCount} COMBO` : '';
      this.addFloater(target.x, target.y - 82, `${rating} · +${scored.points}`, '#fff0b7');
      if (comboText) this.addFloater(target.x, target.y - 112, `${comboCount} COMBO`, '#dff8e9');
    } else {
      if (this.isTutorial()) {
        const isFinalCheck = this.tutorialDirector?.step === 'final-check';
        const wrongAttempts = isFinalCheck
          ? this.tutorialDirector.recordFinalWrongItem()
          : 0;
        const correctItemId = target.condition === CONDITIONS.ITCH ? ITEMS.PPA.id : ITEMS.NAP.id;
        const dialogue = isFinalCheck
          ? wrongAttempts >= 2
            ? target.condition === CONDITIONS.ITCH
              ? '想想看：「癢」要用哪一個？'
              : '想想看：「痠痛」要用哪一個？'
            : '再想想看……'
          : '好像不是這個……';
        target.showDialogue(dialogue, isFinalCheck ? 1.35 : 1.15);
        this.hud.flashItemFeedback(
          this.itemSystem.selectedId,
          isFinalCheck && wrongAttempts < 2 ? null : correctItemId
        );
        return;
      }
      this.scoreManager.recordWrongItem();
      this.combo.break();
      this.createMistakeParticles(target);
      target.showDialogue('好像不是這個……', 1.15);
      const correctItemId = target.condition === CONDITIONS.ITCH ? ITEMS.PPA.id : ITEMS.NAP.id;
      this.hud.flashItemFeedback(this.itemSystem.selectedId, correctItemId);
    }
  }

  showTutorialFeedback(text, color, delay, callback) {
    window.clearTimeout(this.tutorialTransitionTimer);
    this.addFloater(this.player.x, this.player.y - 84, text, color, {
      duration: Math.max(0.8, delay / 1000),
      size: 14
    });
    this.tutorialTransitionTimer = window.setTimeout(() => {
      this.tutorialTransitionTimer = null;
      if (this.state === 'playing' && this.isTutorial()) callback?.();
    }, delay);
  }

  handleTutorialStep(step) {
    if (this.state !== 'playing') return;
    if (step === 'first-rescue') {
      this.showTutorialFeedback('✓ 移動完成', '#fff0b7', 700, () => this.openTutorialModal('itch'));
    }
    if (step === 'second-rescue') {
      this.showTutorialFeedback('✓ 救援成功', '#dff8e9', 700, () => this.openTutorialModal('soreness'));
    }
    if (step === 'final-check') this.openTutorialModal('final-check');
    if (step === 'complete') {
      this.showTutorialFeedback('✓ 判斷正確', '#dff8e9', 800, () => this.openTutorialModal('complete'));
    }
  }

  handleNPCStateChange(_npc, _state) {
    // NPC status bubbles are the primary event communication layer. The HUD
    // only keeps score, time, lives, indicators, and the current action state.
  }

  handleEventStart(_npc) {}

  handleFailure(npc) {
    if (this.state !== 'playing') return;
    // The onboarding stage is intentionally forgiving. A malformed/debug
    // failure must never turn a learning mistake into a Game Over.
    if (this.isTutorial()) return;
    this.scoreManager.recordFailure();
    this.combo.break();
    if (!this.debug.infiniteLife) this.lives = Math.max(0, this.lives - 1);
    this.createMistakeParticles(npc);
    if (!this.debug.infiniteLife) {
      this.hud.flashLifeLost();
    }
    if (this.lives <= 0) this.finishGameOver();
  }

  finishStage() {
    if (this.state !== 'playing') return;
    if (this.isTutorial()) {
      this.openTutorialModal('complete');
      return;
    }
    this.closeTutorialModal({ enableInput: false });
    this.state = 'result';
    this.input.setEnabled(false);
    const result = this.scoreManager.getResult(this.combo.maxCombo);
    result.maxCombo = this.combo.maxCombo;
    result.grade = this.scoreManager.getGrade(this.combo.maxCombo);
    Object.assign(result, this.personalBestStore.update(this.selectedStage, result.score));
    result.tutorialComplete = this.tutorialDirector?.isComplete() || false;
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.showResult(
      result,
      this.stageManager.getStage(),
      this.selectedStage !== 'mountain',
      this.getNextStageLabel()
    );
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  finishGameOver() {
    if (this.state !== 'playing') return;
    this.closeTutorialModal({ enableInput: false });
    this.state = 'gameover';
    this.input.setEnabled(false);
    const result = this.scoreManager.getResult(this.combo.maxCombo);
    result.maxCombo = this.combo.maxCombo;
    this.gameShell.classList.add('is-hidden');
    this.resultScreen.showGameOver(result);
    this.updateOrientation?.();
    this.resetAppScroll();
  }

  handleDebug(action, button) {
    if (this.state !== 'playing') return;
    if (this.isTutorial() && ['itch', 'soreness', 'clear', 'tolerance'].includes(action)) return;
    if (action === 'itch' || action === 'soreness') {
      const condition = action === 'itch' ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
      const stage = this.stageManager.getStage();
      const npc = this.npcs.find((candidate) => candidate.canReceiveEvent(this.stageManager.elapsed)) || this.eventDirector.spawn(this.npcs);
      npc.role = 'elder';
      npc.radius = 19;
      npc.path = [];
      npc.wanderTarget = null;
      npc.placeAt({ x: this.player.x, y: this.player.y }, stage);
      npc.zone = stage.zones.find((zone) => this.player.x >= zone.x && this.player.x <= zone.x + zone.width && this.player.y >= zone.y && this.player.y <= zone.y + zone.height)?.id || stage.zones[0].id;
      const triggered = npc.startEvent(condition, this.eventDirector.getTolerance(this.stageManager.elapsed), this.eventDirector.getWarningDuration(this.stageManager.elapsed), this.stageManager.elapsed);
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

  addFloater(x, y, text, color, { duration = 1.15, size = null } = {}) {
    this.floaters.push({ x, y, text, color, life: duration, maxLife: duration, size });
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

  isInsidePavilion(entity, stage) {
    const interior = stage?.pavilionInterior;
    if (stage?.id !== 'mountain' || !interior || !entity) return false;
    return entity.x >= interior.x
      && entity.x <= interior.x + interior.width
      && entity.y >= interior.y
      && entity.y <= interior.y + interior.height;
  }

  updatePavilionRoof(dt, stage) {
    if (stage?.id !== 'mountain') {
      this.pavilionRoofOpacity = 1;
      return;
    }
    const playerInsidePavilion = this.isInsidePavilion(this.player, stage);
    const activeRescueNpcInsidePavilion = this.npcs.some((npc) => (
      npc.active
      && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state)
      && this.isInsidePavilion(npc, stage)
    ));
    const normalNpcInsidePavilion = this.npcs.some((npc) => (
      npc.active
      && npc.state === STATES.NORMAL
      && this.isInsidePavilion(npc, stage)
    ));
    // A normal passer-by should remain visible while crossing the deck, but
    // the roof should still read as a foreground object. Rescue states get
    // the stronger fade so the resident and its dialogue are immediately
    // readable; normal traffic only uses a lighter pass-through fade.
    const targetOpacity = playerInsidePavilion || activeRescueNpcInsidePavilion
      ? 0.55
      : normalNpcInsidePavilion
        ? 0.72
        : 1;
    const blend = 1 - Math.exp(-Math.max(0, dt) / 0.08);
    this.pavilionRoofOpacity = lerp(this.pavilionRoofOpacity, targetOpacity, blend);
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

  getVisibleWorldBounds(stage, camera) {
    const scale = Math.max(0.001, camera.scale || 1);
    const left = camera.mode === 'fit'
      ? -camera.x / scale
      : camera.x;
    const top = camera.mode === 'fit'
      ? -camera.y / scale
      : camera.y;
    const right = camera.mode === 'fit'
      ? (this.viewport.width - camera.x) / scale
      : camera.x + this.viewport.width / scale;
    const bottom = camera.mode === 'fit'
      ? (this.viewport.height - camera.y) / scale
      : camera.y + this.viewport.height / scale;
    return {
      left: clamp(left, 0, stage.world.width),
      right: clamp(right, 0, stage.world.width),
      top: clamp(top, 0, stage.world.height),
      bottom: clamp(bottom, 0, stage.world.height)
    };
  }

  render(now = performance.now()) {
    if (this.state !== 'playing') return;
    const stage = this.stageManager.getStage();
    const camera = this.getCamera(stage);
    const visibleBounds = this.getVisibleWorldBounds(stage, camera);
    this.hud.updateRescueIndicators(this, camera);
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
    const drawableNpcs = this.npcs.filter((npc) => npc.active);
    const entities = [...drawableNpcs, this.player].sort((a, b) => a.y - b.y);
    for (const entity of entities) {
      if (entity === this.player) entity.draw(ctx);
      else entity.draw(ctx, now, {
        debugRadius: this.debug.showRadius,
        cameraScale: camera.scale,
        compactStatusBubble: this.layoutMode !== 'desktop',
        visibleBounds,
        // Mountain's pavilion roof is a foreground occluder. Keep NPC bodies
        // behind it, but render their rescue dialogue in the dedicated layer
        // below so the roof never hides the information needed to help them.
        drawStatusBubble: stage.id !== 'mountain'
      });
    }
    if (this.debug.showRadius) {
      ctx.save(); ctx.strokeStyle = 'rgba(255, 235, 163, .35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.interactionSystem.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    this.worldRenderer.drawMountainForeground(ctx, stage, now, {
      roofOpacity: this.pavilionRoofOpacity
    });
    if (stage.id === 'mountain') {
      for (const npc of drawableNpcs) {
        if (!npc.hasStatusBubble()) continue;
        npc.drawStatus(ctx, now, {
          cameraScale: camera.scale,
          compactStatusBubble: this.layoutMode !== 'desktop',
          visibleBounds
        });
      }
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
      ctx.save(); ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1); drawText(ctx, floater.text, floater.x, floater.y, { size: floater.size || (floater.text.length > 5 ? 10 : 17), color: floater.color, weight: 900 }); ctx.restore();
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
