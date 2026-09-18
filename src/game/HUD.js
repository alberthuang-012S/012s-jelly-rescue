import { CONDITION_LABELS, STATES } from './constants.js';
import { clamp, formatClock, formatScore } from './utils.js';

const ACTIVE_EVENT_STATES = [STATES.WARNING, STATES.HELP, STATES.CRITICAL];
const INDICATOR_STATE_PRIORITY = Object.freeze({
  [STATES.CRITICAL]: 0,
  [STATES.HELP]: 1,
  [STATES.WARNING]: 2
});
const INDICATOR_ARROWS = Object.freeze({ up: '▲', down: '▼', left: '◀', right: '▶' });
const INDICATOR_STATE_LABELS = Object.freeze({
  [STATES.WARNING]: '預警',
  [STATES.HELP]: '求救',
  [STATES.CRITICAL]: '緊急'
});

export class HUD {
  constructor() {
    this.elements = {
      score: document.querySelector('#hud-score'),
      combo: document.querySelector('#hud-combo'),
      timer: document.querySelector('#hud-timer'),
      lives: document.querySelector('#hud-lives'),
      stageName: document.querySelector('#hud-stage-name'),
      objective: document.querySelector('#hud-objective'),
      target: document.querySelector('#target-callout'),
      targetName: document.querySelector('#target-name'),
      targetDistance: document.querySelector('#target-distance'),
      action: document.querySelector('#action-button'),
      tutorialGuide: document.querySelector('#tutorial-guide'),
      tutorialStep: document.querySelector('#tutorial-guide-step'),
      tutorialHints: [...document.querySelectorAll('[data-tutorial-hint]')],
      rescueIndicators: document.querySelector('#rescue-indicator-region')
    };
    this.lastObjective = '';
    this.lastLives = -1;
    this.lastSelectedItem = '';
    this.lastTutorialStep = '';
    this.lastTutorialFocus = '';
    this.lastTutorialActive = false;
    this.activeToast = null;
    this.activeToastTimer = null;
    this.activeToastRemovalTimer = null;
    this.indicatorNodes = new Map();
  }

  update(game) {
    const stage = game.stageManager.getStage();
    const { score, combo } = game;
    this.elements.score.textContent = formatScore(game.scoreManager.score);
    this.elements.combo.textContent = combo.combo ? `x${combo.getMultiplier().toFixed(1)}` : '—';
    this.elements.timer.textContent = formatClock(game.stageManager.getRemaining());
    this.elements.stageName.textContent = stage.name.toUpperCase();
    if (this.lastLives !== game.lives) {
      const hearts = [0, 1, 2].map((index) => {
        const heart = document.createElement('span');
        heart.className = `heart ${index < game.lives ? '' : 'is-empty'}`;
        heart.textContent = '♥';
        return heart;
      });
      this.elements.lives.replaceChildren(...hearts);
      this.lastLives = game.lives;
    }
    const target = game.interactionSystem.currentTarget;
    if (target) {
      this.elements.target.classList.remove('is-hidden');
      this.elements.action.classList.remove('is-hidden');
      this.elements.targetName.textContent = target.name;
      this.elements.targetDistance.textContent = target.state === STATES.CRITICAL ? '快受不了了' : '進入救援範圍';
    } else {
      this.elements.target.classList.add('is-hidden');
      this.elements.action.classList.add('is-hidden');
    }
    const tutorialObjective = game.tutorialDirector?.getObjective?.(game);
    const objective = game.debug.showRadius
      ? 'DEBUG · 互動半徑已顯示'
      : tutorialObjective || (target
        ? `靠近 ${target.name} · 選對道具`
        : game.stageManager.getPhase() === 'intro'
          ? '巡邏中 · 優先留意黃色預警'
          : '巡邏中 · 觀察路線與求救泡泡');
    if (objective !== this.lastObjective) {
      this.elements.objective.textContent = objective;
      this.lastObjective = objective;
    }
    this.updateTutorialGuide(game);
    this.updateTutorialItemFocus(game);
    if (this.lastSelectedItem !== game.itemSystem.selectedId) this.updateItems(game.itemSystem.selectedId);
  }

  updateTutorialGuide(game) {
    const guide = this.elements.tutorialGuide;
    if (!guide) return;
    const tutorial = game.tutorialDirector;
    const visible = Boolean(tutorial && game.state === 'playing' && !tutorial.isComplete());
    guide.classList.toggle('is-hidden', !visible);
    if (!visible) {
      this.lastTutorialStep = '';
      return;
    }
    if (tutorial.step === this.lastTutorialStep) return;

    const stepMap = {
      move: { label: '1 / 3', active: ['move'] },
      'first-rescue': { label: '2 / 3', active: ['itch'] },
      'second-rescue': { label: '3 / 3', active: ['soreness', 'toggle'] },
      complete: { label: '✓', active: [] }
    };
    const step = stepMap[tutorial.step] || stepMap.move;
    guide.dataset.step = tutorial.step;
    this.elements.tutorialStep.textContent = step.label;
    this.elements.tutorialHints.forEach((hint) => {
      hint.classList.toggle('is-hidden', !step.active.includes(hint.dataset.tutorialHint));
      hint.classList.toggle('is-active', step.active.includes(hint.dataset.tutorialHint));
    });
    this.lastTutorialStep = tutorial.step;
  }

  updateTutorialItemFocus(game) {
    const tutorial = game.tutorialDirector;
    const tutorialActive = Boolean(tutorial && game.state === 'playing' && !tutorial.isComplete());
    const focus = tutorialActive ? (tutorial.getItemFocus?.() || '') : '';
    if (focus === this.lastTutorialFocus && tutorialActive === this.lastTutorialActive) return;
    document.querySelectorAll('[data-item]').forEach((button) => {
      const isFocus = Boolean(focus) && button.dataset.item === focus;
      const isDimmed = Boolean(focus) && button.dataset.item !== focus;
      button.classList.toggle('is-tutorial-focus', isFocus);
      button.classList.toggle('is-tutorial-dimmed', isDimmed);
    });
    this.lastTutorialFocus = focus;
    this.lastTutorialActive = tutorialActive;
  }

  flashItemFeedback(wrongItemId, recommendedItemId) {
    const wrong = document.querySelector(`[data-item="${wrongItemId}"]`);
    const recommended = document.querySelector(`[data-item="${recommendedItemId}"]`);
    if (wrong) {
      wrong.classList.remove('is-item-error');
      void wrong.offsetWidth;
      wrong.classList.add('is-item-error');
      window.setTimeout(() => wrong.classList.remove('is-item-error'), 430);
    }
    if (recommended) {
      recommended.classList.remove('is-item-hint');
      void recommended.offsetWidth;
      recommended.classList.add('is-item-hint');
      window.setTimeout(() => recommended.classList.remove('is-item-hint'), 720);
    }
  }

  updateRescueIndicators(game, camera) {
    const region = this.elements.rescueIndicators;
    if (!region || !camera || game.state !== 'playing') return;
    const events = game.npcs
      .filter((npc) => npc.active && ACTIVE_EVENT_STATES.includes(npc.state))
      .filter((npc) => {
        if (camera.mode === 'fit') return false;
        const screenX = (npc.x - camera.x) * camera.scale;
        const screenY = (npc.y - camera.y) * camera.scale;
        return screenX < 0 || screenX > game.viewport.width || screenY < 0 || screenY > game.viewport.height;
      })
      .sort((a, b) => {
        const priorityDifference = INDICATOR_STATE_PRIORITY[a.state] - INDICATOR_STATE_PRIORITY[b.state];
        if (priorityDifference !== 0) return priorityDifference;
        const toleranceDifference = (a.tolerance ?? Infinity) - (b.tolerance ?? Infinity);
        if (Math.abs(toleranceDifference) > 0.001) return toleranceDifference;
        const aDistance = Math.hypot(a.x - game.player.x, a.y - game.player.y);
        const bDistance = Math.hypot(b.x - game.player.x, b.y - game.player.y);
        return aDistance - bDistance;
      })
      .slice(0, 2);

    const selectedIds = new Set(events.map((npc) => npc.id));
    this.indicatorNodes.forEach((node, id) => {
      if (!selectedIds.has(id)) node.classList.add('is-hidden');
    });
    region.classList.toggle('is-hidden', !events.length);
    events.forEach((npc) => {
      let node = this.indicatorNodes.get(npc.id);
      if (!node) {
        node = document.createElement('div');
        node.innerHTML = '<span class="rescue-indicator-arrow"></span><span class="rescue-indicator-label"></span>';
        region.appendChild(node);
        this.indicatorNodes.set(npc.id, node);
      }
      const conditionKey = npc.condition === 'ITCH' ? 'ITCH' : 'SORENESS';
      const condition = CONDITION_LABELS[conditionKey];
      const direction = this.getIndicatorDirection(game.player, npc);
      const position = this.getIndicatorPosition(game, camera, npc);
      node.className = `rescue-indicator rescue-indicator-${npc.state.toLowerCase()} rescue-indicator-${conditionKey.toLowerCase()}`;
      node.style.left = `${position.x}px`;
      node.style.top = `${position.y}px`;
      node.querySelector('.rescue-indicator-arrow').textContent = INDICATOR_ARROWS[direction];
      node.querySelector('.rescue-indicator-label').textContent = `${condition.icon} ${condition.short}`;
      node.setAttribute('aria-label', `${INDICATOR_STATE_LABELS[npc.state]}：${condition.short}，方向${direction}`);
    });
  }

  getIndicatorDirection(player, npc) {
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  getIndicatorPosition(game, camera, npc) {
    const width = game.viewport.width;
    const height = game.viewport.height;
    const isPortrait = game.layoutMode === 'mobile-portrait';
    const isLandscapePhone = game.layoutMode === 'mobile-landscape';
    const bounds = {
      left: isPortrait ? 24 : 28,
      right: width - (isPortrait ? 24 : 28),
      top: isPortrait ? 112 : isLandscapePhone ? 76 : 96,
      bottom: height - (isPortrait ? 180 : isLandscapePhone ? 84 : 106)
    };
    const scale = camera.scale || 1;
    const sourceX = clamp((game.player.x - camera.x) * scale, bounds.left, bounds.right);
    const sourceY = clamp((game.player.y - camera.y) * scale, bounds.top, bounds.bottom);
    const targetX = (npc.x - camera.x) * scale;
    const targetY = (npc.y - camera.y) * scale;
    const rayX = targetX - sourceX;
    const rayY = targetY - sourceY;
    let factor = Infinity;
    if (rayX > 0) factor = Math.min(factor, (bounds.right - sourceX) / rayX);
    if (rayX < 0) factor = Math.min(factor, (bounds.left - sourceX) / rayX);
    if (rayY > 0) factor = Math.min(factor, (bounds.bottom - sourceY) / rayY);
    if (rayY < 0) factor = Math.min(factor, (bounds.top - sourceY) / rayY);
    if (!Number.isFinite(factor) || factor < 0) factor = 1;
    return {
      x: clamp(sourceX + rayX * factor, bounds.left, bounds.right),
      y: clamp(sourceY + rayY * factor, bounds.top, bounds.bottom)
    };
  }

  updateItems(selectedId) {
    document.querySelectorAll('[data-item]').forEach((button) => {
      const isSelected = button.dataset.item === selectedId;
      button.classList.toggle('is-selected', isSelected);
      const status = button.querySelector('.item-status');
      if (status) status.textContent = isSelected ? 'SELECTED' : 'READY';
    });
    this.lastSelectedItem = selectedId;
  }

  showToast(message, type = 'info', detail = '') {
    const region = document.querySelector('#toast-region');
    if (!region) return;
    window.clearTimeout(this.activeToastTimer);
    window.clearTimeout(this.activeToastRemovalTimer);
    if (this.activeToast) {
      this.activeToast.remove();
      this.activeToast = null;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-mark">${type === 'success' ? '✦' : type === 'danger' ? '!' : '·'}</span><span><b>${message}</b>${detail ? `<small>${detail}</small>` : ''}</span>`;
    region.appendChild(toast);
    this.activeToast = toast;
    requestAnimationFrame(() => {
      if (this.activeToast === toast) toast.classList.add('is-visible');
    });
    this.activeToastTimer = window.setTimeout(() => {
      if (this.activeToast !== toast) return;
      toast.classList.remove('is-visible');
      this.activeToastRemovalTimer = window.setTimeout(() => {
        if (this.activeToast !== toast) return;
        toast.remove();
        this.activeToast = null;
        this.activeToastRemovalTimer = null;
      }, 260);
      this.activeToastTimer = null;
    }, 2300);
  }
}
