import { NPC } from './NPC.js?mountain-pavilion-dialogue-v2';
import { ITEMS } from './constants.js';
import { ENDLESS_ITEMS, ENDLESS_UNLOCK_AT, ENDLESS_HEAL_EVERY, ENDLESS_MOVEMENT_VERSION, safeEndlessPosition, assignEndlessPatrol } from './EndlessStage.js';
import { createEndlessRun, createEndlessStage, healEndlessRun, seededRandom, EndlessStore } from './EndlessRun.js';
import { TravelPlanner } from './TravelPlanner.js';
import { formatClock } from './utils.js';

const copy = (value) => JSON.parse(JSON.stringify(value));
const EXCLUDED = new Set(['spriteImage', 'spriteSheet', 'stateMachine', 'random', 'onFailure', 'onStateChange']);
const DIRECTOR_KEYS = ['nextNpcId', 'nextSpawnAt', 'nextEventAt', 'lastCondition', 'conditionStreak', 'introIndex', 'stageTime', 'fourItemsDispatched', 'pendingIntroductions'];
function dataOf(object) {
  return copy(Object.fromEntries(Object.entries(object).filter(([key, value]) => !EXCLUDED.has(key)
    && typeof value !== 'function' && (value === null || ['number', 'string', 'boolean', 'object'].includes(typeof value)))));
}
function restoreData(object, data) {
  for (const key of Object.keys(object)) {
    if (!EXCLUDED.has(key) && Object.hasOwn(data, key)) object[key] = copy(data[key]);
  }
}
export class EndlessMode {
  constructor(game) {
    this.game = game; this.store = new EndlessStore(); this.run = null;
    this.random = null; this.saveElapsed = 0;
    this.dialog = document.querySelector('#endless-dialog');
    this.dialog.addEventListener('cancel', (event) => event.preventDefault());
    document.querySelector('#endless-start').addEventListener('click', () => this.start());
    document.querySelector('#endless-resume').addEventListener('click', () => this.resume());
    window.addEventListener('pagehide', () => this.save());
    this.updateHome();
  }
  updateHome() {
    const { run, best } = this.store.load();
    const button = document.querySelector('#endless-resume');
    button.classList.toggle('is-hidden', !run);
    document.querySelector('.home-endless-panel').classList.toggle('has-saved-run', !!run);
    const start = document.querySelector('#endless-start');
    const label = document.createElement('span'); label.textContent = run ? '開始新局' : '開始無限挑戰';
    start.replaceChildren(label);
    if (!run) {
      const arrow = document.createElement('span'); arrow.className = 'button-arrow'; arrow.textContent = '→';
      start.append(arrow);
    }
    start.classList.toggle('primary-button', !run);
    start.classList.toggle('secondary-button', !!run);
    if (run) this.game.homeScreen.dataset.hasPlayed = 'true';
    if (run) button.textContent = `繼續救援 · ${formatClock(Math.floor(run.snapshot?.elapsed || 0))} · ${run.lives} 顆愛心${this.store.writeFailed ? '（本頁）' : ''}`;
    document.querySelector('#endless-best').textContent = best
      ? `最佳生存 ${formatClock(Math.floor(best.survivedMs / 1000))} · ${best.score.toLocaleString()} 分` : '挑戰你的第一個生存紀錄';
  }
  start() {
    if (this.game.state === 'loading') return;
    if (this.store.load().run) {
      this.showDialog('開始新的挑戰？', '開始新局會取代目前的續玩進度，個人最佳紀錄會保留。',
        '開始新局', () => this.newRun(), '保留進度', () => {});
    } else this.newRun();
  }
  newRun() {
    this.run = createEndlessRun(); this.store.save(this.run);
    return this.enter();
  }
  resume() {
    if (this.game.state === 'loading') return;
    const { run } = this.store.load();
    if (!run) return;
    this.run = run;
    return this.enter(run.snapshot);
  }
  async enter(snapshot = null) {
    const stage = createEndlessStage(this.run.seed);
    this.random = seededRandom(this.run.seed); this.saveElapsed = 0;
    await this.game.startStage(stage.id, { endlessStage: stage, endlessSnapshot: snapshot });
    if (this.game.state !== 'playing' || !this.run) return;
    this.run.status = 'playing'; this.save();
    if (this.store.writeFailed) this.game.hud.showToast('進度僅保留在此分頁');
  }
  restoreState(snapshot) {
    const game = this.game;
    if (snapshot) {
      const stage = game.stageManager.getStage();
      restoreData(game.player, snapshot.player);
      Object.assign(game.player, safeEndlessPosition(stage, game.player, game.player.radius));
      restoreData(game.scoreManager, snapshot.score);
      restoreData(game.combo, snapshot.combo);
      game.stageManager.elapsed = snapshot.elapsed;
      game.stageManager.status = 'playing';
      for (const key of DIRECTOR_KEYS) {
        if (Object.hasOwn(snapshot.director, key)) game.eventDirector[key] = copy(snapshot.director[key]);
      }
      game.npcs = snapshot.npcs.map((data) => {
        const npc = new NPC({ ...data, random: this.random });
        restoreData(npc, data);
        npc.departAt = data.departAt; npc.departing = !!data.departing;
        npc.radius = Math.max(25, npc.radius);
        Object.assign(npc, safeEndlessPosition(stage, npc, npc.radius));
        const planner = new TravelPlanner(stage, npc.radius);
        if (npc.wanderTarget && !planner.canOccupy(npc.wanderTarget)) npc.wanderTarget = null;
        const invalidPath = npc.path?.some((point) => !planner.canOccupy(point));
        if (!npc.departing && (snapshot.movementVersion !== ENDLESS_MOVEMENT_VERSION || invalidPath)) {
          assignEndlessPatrol(stage, npc);
          npc.wanderTarget = null;
        } else if (invalidPath) {
          npc.path = [{ x: 384, y: npc.y }, { x: 384, y: 1010 }];
          npc.pathIndex = 0;
        }
        npc.onFailure = (resident) => game.handleFailure(resident);
        npc.onStateChange = (resident, state) => game.handleNPCStateChange(resident, state);
        game.applyNpcAssets(npc);
        return npc;
      });
      // Constructors consume random values; restore the generator last.
      this.random.setState(snapshot.randomState);
      game.lastDistanceSample = game.player.distanceTravelled;
    }
    this.syncItems(false);
    if (snapshot) game.itemSystem.select(snapshot.selectedItem);
  }
  syncItems(notify = true) {
    const game = this.game;
    const unlocked = game.stageManager.elapsed >= ENDLESS_UNLOCK_AT;
    const newlyUnlocked = unlocked && !this.run.unlocked;
    this.run.unlocked = unlocked;
    const available = unlocked ? [...ENDLESS_ITEMS] : ['PPA', 'NAP'];
    if (game.itemSystem.availableIds.join() !== available.join()) {
      game.itemSystem.availableIds = available;
      if (!available.includes(game.itemSystem.selectedId)) game.itemSystem.select('PPA');
      game.hud.updateItems(game.itemSystem.selectedId, available);
    }
    this.updateItemLocks();
    if (notify && newlyUnlocked) game.hud.showToast('DDM、SSW 已解鎖！四種救援開始');
  }
  updateItemLocks() {
    const game = this.game;
    const countdown = Math.ceil(Math.max(0, ENDLESS_UNLOCK_AT - game.stageManager.elapsed));
    for (const id of ENDLESS_ITEMS) {
      const button = document.querySelector(`[data-item="${id}"]`);
      const locked = !game.itemSystem.availableIds.includes(id);
      button.classList.remove('is-hidden');
      button.classList.toggle('is-endless-locked', locked);
      button.disabled = locked;
      button.setAttribute('aria-label', `${ITEMS[id].label}${locked ? `，${countdown} 秒後解鎖` : ''}`);
      let label = button.querySelector('.endless-lock-label');
      if (!label) { label = document.createElement('span'); label.className = 'endless-lock-label'; button.append(label); }
      label.textContent = locked ? `${countdown}s 解鎖` : '';
    }
  }
  beforeUpdate() { if (this.run) this.syncItems(); }
  update(dt) {
    if (!this.run || this.game.state !== 'playing') return;
    const healed = healEndlessRun(this.run, this.game.scoreManager.rescuedCount);
    this.game.lives = this.run.lives;
    if (healed) {
      this.game.hud.showToast(`成功救援 ${ENDLESS_HEAL_EVERY} 人，愛心 +1`);
      this.game.hud.update(this.game);
    }
    this.saveElapsed += dt;
    if (this.saveElapsed >= 1 || healed) { this.save(); this.saveElapsed = 0; }
  }
  fail() {
    if (!this.run || this.game.state !== 'playing') return;
    const game = this.game;
    game.scoreManager.recordFailure(); game.combo.break();
    this.run.lives = Math.max(0, this.run.lives - 1);
    game.lives = this.run.lives;
    game.hud.flashLifeLost(); game.hud.update(game);
    if (!this.run.lives) this.finish();
    else this.save();
  }
  finish() {
    const game = this.game;
    this.run.status = 'over'; game.state = 'gameover'; game.input.setEnabled(false);
    const result = game.scoreManager.getResult(game.combo.maxCombo);
    const seconds = game.stageManager.elapsed;
    const record = this.store.updateBest(seconds, result.score, result.rescuedCount, this.run.practice);
    this.store.save(null);
    game.gameShell.classList.add('is-hidden');
    game.resultScreen.showGameOver(result, { ...game.stageManager.getStage(), availableItems: ENDLESS_ITEMS });
    const screen = game.resultScreen.gameover;
    screen.querySelector('#gameover-title').textContent = '無限救援挑戰結束';
    screen.querySelector('.result-kicker').textContent = 'ENDLESS RESCUE · SURVIVAL REPORT';
    screen.querySelector('.result-summary').textContent = `生存 ${formatClock(Math.floor(seconds))}，成功救援 ${result.rescuedCount} 人。`;
    let panel = screen.querySelector('.endless-result-record');
    if (!panel) { panel = document.createElement('p'); panel.className = 'endless-result-record'; screen.querySelector('.result-actions').before(panel); }
    const best = record.best;
    panel.textContent = this.run.practice ? '練習局：使用過 DEBUG，本局不登錄紀錄。'
      : best ? `${record.isNewBest ? '★ 新紀錄 · ' : ''}個人最佳生存 ${formatClock(Math.floor(best.survivedMs / 1000))} · ${best.score.toLocaleString()} 分 · ${best.rescuedCount} 人` : '';
    panel.classList.remove('is-hidden');
    game.updateOrientation?.(); game.resetAppScroll();
    screen.querySelector('#gameover-replay')?.focus({ preventScroll: true });
  }
  save() {
    if (!this.run || this.run.status === 'over') return;
    const game = this.game;
    if (this.run.status === 'playing' && game.state === 'playing') {
      this.run.snapshot = { movementVersion: ENDLESS_MOVEMENT_VERSION, elapsed: game.stageManager.elapsed, player: dataOf(game.player),
        score: dataOf(game.scoreManager), combo: dataOf(game.combo),
        selectedItem: game.itemSystem.selectedId, randomState: this.random.getState(),
        director: Object.fromEntries(DIRECTOR_KEYS.filter((key) => key in game.eventDirector).map((key) => [key, copy(game.eventDirector[key])])),
        npcs: game.npcs.filter((npc) => npc.active).map(dataOf) };
    }
    this.store.save(this.run);
  }
  leave() {
    this.save(); this.dialog.close(); this.run = null; this.random = null;
    for (const button of document.querySelectorAll('[data-item]')) {
      button.classList.remove('is-endless-locked');
      button.querySelector('.endless-lock-label')?.remove();
      button.removeAttribute('aria-label');
    }
    this.updateHome();
  }
  showDialog(title, description, primaryText, primaryAction, secondaryText, secondaryAction) {
    this.dialog.replaceChildren();
    const kicker = document.createElement('small'); kicker.textContent = 'ENDLESS RESCUE';
    const heading = document.createElement('h2'); heading.id = 'endless-dialog-title'; heading.textContent = title;
    const body = document.createElement('p'); body.id = 'endless-dialog-description'; body.textContent = description;
    const actions = document.createElement('div'); actions.className = 'endless-actions';
    const primary = document.createElement('button'); primary.type = 'button'; primary.className = 'primary-button'; primary.textContent = primaryText;
    const secondary = document.createElement('button'); secondary.type = 'button'; secondary.className = 'secondary-button'; secondary.textContent = secondaryText;
    primary.addEventListener('click', () => { this.dialog.close(); primaryAction(); }, { once: true });
    secondary.addEventListener('click', () => { this.dialog.close(); secondaryAction(); }, { once: true });
    actions.append(primary, secondary); this.dialog.append(kicker, heading, body, actions);
    if (!this.dialog.open) this.dialog.showModal();
    primary.focus();
  }
}