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
  constructor({ onAction, onItemSelect, onItemToggle, onEscape }) {
    this.keys = new Set();
    this.activeDirectionPointers = new Map();
    this.onAction = onAction;
    this.onItemSelect = onItemSelect;
    this.onItemToggle = onItemToggle;
    this.onEscape = onEscape;
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
      this.clearDirectionPointers();
    }
  }

  handleKeyDown(event) {
    if (event.code === 'Escape') {
      event.preventDefault();
      this.onEscape?.();
      return;
    }
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
        this.activeDirectionPointers.set(event.pointerId, direction);
        this.updateDirectionButtonState(direction);
        if (button.setPointerCapture) {
          try {
            button.setPointerCapture(event.pointerId);
          } catch (_error) {
            // Pointer capture is an enhancement; the pointer events still work
            // on browsers that do not expose it for this control.
          }
        }
      };
      const release = (event) => {
        event.preventDefault();
        this.releaseDirectionPointer(event.pointerId, direction);
      };
      button.addEventListener('pointerdown', press, { passive: false });
      button.addEventListener('pointerup', release, { passive: false });
      button.addEventListener('pointercancel', release, { passive: false });
      button.addEventListener('lostpointercapture', release, { passive: false });
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
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (this.enabled) this.onItemSelect?.(button.dataset.item);
      }, { passive: false });
    });
  }

  releaseDirectionPointer(pointerId, direction = null) {
    const activeDirection = this.activeDirectionPointers.get(pointerId);
    if (!activeDirection) return;
    this.activeDirectionPointers.delete(pointerId);
    this.updateDirectionButtonState(direction || activeDirection);
  }

  updateDirectionButtonState(direction) {
    const isPressed = [...this.activeDirectionPointers.values()].includes(direction);
    document.querySelectorAll(`[data-dir="${direction}"]`).forEach((button) => {
      button.classList.toggle('is-pressed', isPressed);
    });
  }

  clearDirectionPointers() {
    const directions = new Set(this.activeDirectionPointers.values());
    this.activeDirectionPointers.clear();
    directions.forEach((direction) => this.updateDirectionButtonState(direction));
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
    for (const direction of this.activeDirectionPointers.values()) {
      if (direction === 'left') x -= 1;
      if (direction === 'right') x += 1;
      if (direction === 'up') y -= 1;
      if (direction === 'down') y += 1;
    }
    return normalize(x, y);
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
