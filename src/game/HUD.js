import { CONDITION_LABELS, ITEMS, STATES } from './constants.js';
import { formatClock, formatScore } from './utils.js';

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
      tutorialHints: [...document.querySelectorAll('[data-tutorial-hint]')]
    };
    this.lastObjective = '';
    this.lastLives = -1;
    this.lastSelectedItem = '';
    this.lastTutorialStep = '';
    this.activeToast = null;
    this.activeToastTimer = null;
    this.activeToastRemovalTimer = null;
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
    if (this.lastSelectedItem !== game.itemSystem.selectedId) this.updateItems(game.itemSystem.selectedId);
  }

  updateTutorialGuide(game) {
    const guide = this.elements.tutorialGuide;
    if (!guide) return;
    const tutorial = game.tutorialDirector;
    const visible = Boolean(tutorial && game.state === 'playing');
    guide.classList.toggle('is-hidden', !visible);
    if (!visible) {
      this.lastTutorialStep = '';
      return;
    }
    if (tutorial.step === this.lastTutorialStep) return;

    const stepMap = {
      move: { label: '1 / 3', active: ['move'] },
      'first-rescue': { label: '2 / 3', active: ['itch', 'action'] },
      'second-rescue': { label: '3 / 3', active: ['soreness', 'action'] },
      complete: { label: '✓', active: ['move', 'itch', 'soreness', 'action'] }
    };
    const step = stepMap[tutorial.step] || stepMap.move;
    guide.dataset.step = tutorial.step;
    this.elements.tutorialStep.textContent = step.label;
    this.elements.tutorialHints.forEach((hint) => {
      hint.classList.toggle('is-active', step.active.includes(hint.dataset.tutorialHint));
    });
    this.lastTutorialStep = tutorial.step;
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
