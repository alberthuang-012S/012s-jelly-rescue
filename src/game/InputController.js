import { normalize } from './utils.js';

const KEY_VECTORS = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

export class InputController {
  constructor({ onAction, onItemSelect, onItemToggle }) {
    this.keys = new Set();
    this.touchDirections = new Set();
    this.onAction = onAction;
    this.onItemSelect = onItemSelect;
    this.onItemToggle = onItemToggle;
    this.enabled = true;
    this.boundKeyDown = (event) => this.handleKeyDown(event);
    this.boundKeyUp = (event) => this.handleKeyUp(event);
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });
    window.addEventListener('keyup', this.boundKeyUp, { passive: false });
    this.bindTouchControls();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.touchDirections.clear();
    }
  }

  handleKeyDown(event) {
    if (!this.enabled) return;
    if (KEY_VECTORS[event.code]) {
      event.preventDefault();
      this.keys.add(event.code);
    }
    if (event.code === 'KeyE' || event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) this.onAction?.();
    }
    if (event.code === 'Digit1') this.onItemSelect?.('PPA');
    if (event.code === 'Digit2') this.onItemSelect?.('NAP');
    if (event.code === 'KeyQ') {
      event.preventDefault();
      if (!event.repeat) this.onItemToggle?.();
    }
  }

  handleKeyUp(event) {
    if (KEY_VECTORS[event.code]) {
      event.preventDefault();
      this.keys.delete(event.code);
    }
  }

  bindTouchControls() {
    document.querySelectorAll('[data-dir]').forEach((button) => {
      const direction = button.dataset.dir;
      const press = (event) => {
        event.preventDefault();
        if (!this.enabled) return;
        this.touchDirections.add(direction);
        button.classList.add('is-pressed');
      };
      const release = (event) => {
        event.preventDefault();
        this.touchDirections.delete(direction);
        button.classList.remove('is-pressed');
      };
      button.addEventListener('pointerdown', press, { passive: false });
      button.addEventListener('pointerup', release, { passive: false });
      button.addEventListener('pointercancel', release, { passive: false });
      button.addEventListener('pointerleave', release, { passive: false });
    });
    document.querySelectorAll('[data-action="use"]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (this.enabled) this.onAction?.();
      }, { passive: false });
      button.addEventListener('keydown', (event) => {
        if ((event.code === 'Enter' || event.code === 'Space') && this.enabled) {
          event.preventDefault();
          this.onAction?.();
        }
      });
    });
    document.querySelectorAll('[data-item]').forEach((button) => {
      button.addEventListener('click', () => {
        if (this.enabled) this.onItemSelect?.(button.dataset.item);
      });
    });
  }

  getMovementVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    for (const key of this.keys) {
      const vector = KEY_VECTORS[key];
      if (vector) {
        x += vector.x;
        y += vector.y;
      }
    }
    if (this.touchDirections.has('left')) x -= 1;
    if (this.touchDirections.has('right')) x += 1;
    if (this.touchDirections.has('up')) y -= 1;
    if (this.touchDirections.has('down')) y += 1;
    return normalize(x, y);
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
