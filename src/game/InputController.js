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

const MOBILE_CONTROL_STORAGE_KEY = 'jelly-rescue-mobile-controls';

export class InputController {
  constructor({ onAction, onItemSelect, onItemToggle, onEscape, onSuspend }) {
    this.keys = new Set();
    this.activeDirectionPointers = new Map();
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
    this.mobileControlMode = 'buttons';
    this.onAction = onAction;
    this.onItemSelect = onItemSelect;
    this.onItemToggle = onItemToggle;
    this.onEscape = onEscape;
    this.onSuspend = onSuspend;
    this.enabled = true;
    this.boundKeyDown = (event) => this.handleKeyDown(event);
    this.boundKeyUp = (event) => this.handleKeyUp(event);
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });
    window.addEventListener('keyup', this.boundKeyUp, { passive: false });
    this.boundSuspend = () => { this.reset(); this.onSuspend?.(); };
    this.boundVisibility = () => { if (document.hidden) this.boundSuspend(); };
    window.addEventListener('blur', this.boundSuspend);
    document.addEventListener('visibilitychange', this.boundVisibility);
    this.boundResize = () => this.reset();
    window.addEventListener('resize', this.boundResize);
    this.bindTouchControls();
    this.bindMobileControlMode();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  handleKeyDown(event) {
    if (event.defaultPrevented) return;
    const target = event.target?.closest?.('button, [role="button"], a, input, textarea, select, [contenteditable]');
    if (target?.matches('input, textarea, select, [contenteditable]')) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.onEscape?.();
      return;
    }
    if (!this.enabled) return;
    if (target && (event.code === 'Enter' || event.code === 'Space')) {
      if (target.matches('[data-action="use"], [data-item]')) {
        event.preventDefault();
        if (!event.repeat) {
          if (target.dataset.item) this.onItemSelect?.(target.dataset.item);
          else this.onAction?.();
        }
      }
      return;
    }
    if (KEY_VECTORS[event.code]) {
      event.preventDefault();
      this.keys.add(event.code);
    }
    if (event.code === 'KeyE' || event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) this.onAction?.();
    }
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
        if (!this.enabled || this.mobileControlMode !== 'buttons') return;
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
      button.addEventListener('click', (event) => {
        if (event.detail === 0 && this.enabled) this.onAction?.();
      });
    });
    document.querySelectorAll('[data-item]').forEach((button) => {
      button.addEventListener('click', (event) => {
        if (event.detail === 0 && this.enabled) this.onItemSelect?.(button.dataset.item);
      });
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

  bindMobileControlMode() {
    this.mobileControls = document.querySelector('.mobile-dpad');
    this.mobileControlToggle = document.getElementById('mobile-control-toggle');
    this.joystick = document.getElementById('mobile-joystick');
    try {
      this.mobileControlMode = window.localStorage.getItem(MOBILE_CONTROL_STORAGE_KEY) === 'ring' ? 'ring' : 'buttons';
    } catch (_error) {
      // Controls still work when browser storage is unavailable.
    }
    this.setMobileControlMode(this.mobileControlMode);
    this.mobileControlToggle?.addEventListener('click', () => {
      if (!this.enabled) return;
      this.setMobileControlMode(this.mobileControlMode === 'buttons' ? 'ring' : 'buttons');
      try {
        window.localStorage.setItem(MOBILE_CONTROL_STORAGE_KEY, this.mobileControlMode);
      } catch (_error) {
        // The selected mode remains usable for this session.
      }
    });
    this.joystick?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!this.enabled || this.mobileControlMode !== 'ring' || this.joystickPointerId !== null) return;
      this.joystickPointerId = event.pointerId;
      try { this.joystick.setPointerCapture(event.pointerId); } catch (_error) { /* Window listeners provide a release fallback. */ }
      this.updateJoystick(event);
    }, { passive: false });
    this.boundJoystickMove = (event) => {
      if (event.pointerId !== this.joystickPointerId) return;
      event.preventDefault();
      this.updateJoystick(event);
    };
    this.boundJoystickRelease = (event) => {
      if (event.pointerId === this.joystickPointerId) this.clearJoystick();
    };
    window.addEventListener('pointermove', this.boundJoystickMove, { passive: false });
    window.addEventListener('pointerup', this.boundJoystickRelease);
    window.addEventListener('pointercancel', this.boundJoystickRelease);
    this.joystick?.addEventListener('lostpointercapture', this.boundJoystickRelease);
  }

  setMobileControlMode(mode) {
    this.reset();
    this.mobileControlMode = mode === 'ring' ? 'ring' : 'buttons';
    const isRing = this.mobileControlMode === 'ring';
    if (this.mobileControls) this.mobileControls.dataset.controlMode = this.mobileControlMode;
    this.mobileControls?.querySelectorAll('[data-dir], .mobile-dpad-center').forEach((element) => { element.hidden = isRing; });
    if (this.joystick) this.joystick.hidden = !isRing;
    if (this.mobileControlToggle) {
      this.mobileControlToggle.textContent = isRing ? '切換方向鍵' : '切換圓環';
      this.mobileControlToggle.setAttribute('aria-label', isRing ? '切換為上下左右方向鍵' : '切換為圓環操作');
      this.mobileControlToggle.setAttribute('aria-pressed', String(isRing));
    }
  }

  updateJoystick(event) {
    const rect = this.joystick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * .3;
    if (!radius) { this.clearJoystick(); return; }
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y);
    const scale = distance > radius ? radius / distance : 1;
    this.joystickVector = distance > radius * .18 ? normalize(x, y) : { x: 0, y: 0 };
    this.joystick.style.setProperty('--joystick-x', `${x * scale}px`);
    this.joystick.style.setProperty('--joystick-y', `${y * scale}px`);
    this.joystick.classList.toggle('is-pressed', distance > radius * .18);
  }

  clearJoystick() {
    const pointerId = this.joystickPointerId;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
    this.joystick?.style.setProperty('--joystick-x', '0px');
    this.joystick?.style.setProperty('--joystick-y', '0px');
    this.joystick?.classList.remove('is-pressed');
    if (pointerId !== null && this.joystick?.hasPointerCapture?.(pointerId)) this.joystick.releasePointerCapture(pointerId);
  }

  reset() {
    this.keys.clear();
    this.clearDirectionPointers();
    this.clearJoystick();
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
    return normalize(x + this.joystickVector.x, y + this.joystickVector.y);
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundSuspend);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('pointermove', this.boundJoystickMove);
    window.removeEventListener('pointerup', this.boundJoystickRelease);
    window.removeEventListener('pointercancel', this.boundJoystickRelease);
    this.joystick?.removeEventListener('lostpointercapture', this.boundJoystickRelease);
    this.reset();
  }
}
