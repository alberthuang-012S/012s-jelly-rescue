import { ENDLESS_STAGE } from './EndlessStage.js';
import { NPC_ROLE_DEFS } from './NPCRoleDefinitions.js';

export const ENDLESS_SAVE_KEY = 'jellyRescue.endless.v2';
const clone = (value) => JSON.parse(JSON.stringify(value));
export function seededRandom(seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  random.getState = () => state;
  random.setState = (value) => { state = value >>> 0; };
  return random;
}
export function createEndlessStage(seed) {
  const random = seededRandom(seed);
  const points = ENDLESS_STAGE.spawnPoints.map((point) => ({ ...point }));
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }
  return { ...ENDLESS_STAGE, spawnPoints: points, endless: { continuous: true, seed: seed >>> 0 } };
}
export function createEndlessRun(seed = Math.floor(Math.random() * 4294967296)) {
  return { seed: seed >>> 0, lives: 3, status: 'ready', snapshot: null,
    practice: false, healedMilestones: 0, unlocked: false };
}
export function healEndlessRun(run, rescuedCount) {
  const milestones = Math.floor(rescuedCount / 20);
  const gained = Math.max(0, milestones - run.healedMilestones);
  run.healedMilestones = milestones;
  const before = run.lives;
  run.lives = Math.min(3, run.lives + gained);
  return run.lives - before;
}
function validBest(best) {
  return best && ['survivedMs', 'score', 'rescuedCount'].every((key) =>
    Number.isSafeInteger(best[key]) && best[key] >= 0);
}
export function validEndlessRun(run) {
  return run && Number.isInteger(run.seed) && run.seed >= 0 && run.seed <= 0xffffffff
    && Number.isInteger(run.lives) && run.lives >= 1 && run.lives <= 3
    && typeof run.practice === 'boolean' && typeof run.unlocked === 'boolean'
    && Number.isSafeInteger(run.healedMilestones) && run.healedMilestones >= 0
    && ['ready', 'playing'].includes(run.status)
    && (run.status !== 'playing' || validSnapshot(run.snapshot));
}
function validScore(score) {
  return score && ['score', 'rescuedCount', 'failedCount', 'ppaSuccess', 'napSuccess', 'wrongItemCount'].every((key) => Number.isSafeInteger(score[key]) && score[key] >= 0)
    && Number.isFinite(score.distanceTravelled) && score.distanceTravelled >= 0
    && (score.fastestResponseTime === null || (Number.isFinite(score.fastestResponseTime) && score.fastestResponseTime >= 0))
    && score.itemSuccess && ['PPA', 'NAP', 'DDM', 'SSW'].every((key) => Number.isSafeInteger(score.itemSuccess[key]) && score.itemSuccess[key] >= 0)
    && Array.isArray(score.responseTimes) && score.responseTimes.every((time) => Number.isFinite(time) && time >= 0);
}
function validSnapshot(snapshot) {
  return snapshot && Number.isFinite(snapshot.elapsed) && snapshot.elapsed >= 0
    && snapshot.player && Number.isFinite(snapshot.player.x) && Number.isFinite(snapshot.player.y)
    && ['radius', 'speed', 'distanceTravelled'].every((key) => Number.isFinite(snapshot.player[key]) && snapshot.player[key] >= 0)
    && validScore(snapshot.score)
    && snapshot.combo && Number.isSafeInteger(snapshot.combo.combo) && snapshot.combo.combo >= 0
    && Number.isSafeInteger(snapshot.combo.maxCombo) && snapshot.combo.maxCombo >= snapshot.combo.combo
    && snapshot.director && Number.isFinite(snapshot.director.nextEventAt)
    && Number.isFinite(snapshot.director.nextSpawnAt) && Number.isSafeInteger(snapshot.director.nextNpcId)
    && Number.isInteger(snapshot.randomState)
    && ['PPA', 'NAP', 'DDM', 'SSW'].includes(snapshot.selectedItem)
    && Array.isArray(snapshot.npcs) && snapshot.npcs.length <= 16
    && snapshot.npcs.every((npc) => typeof npc.id === 'string' && Object.hasOwn(NPC_ROLE_DEFS, npc.role)
      && Number.isFinite(npc.x) && Number.isFinite(npc.y)
      && ['NORMAL', 'WARNING', 'HELP', 'CRITICAL', 'RESCUED', 'FAILED'].includes(npc.state)
      && ['tolerance', 'maxTolerance', 'warningTimer', 'nextEventAt', 'departAt'].every((key) => Number.isFinite(npc[key]))
      && Array.isArray(npc.path) && npc.path.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      && Object.values(npc).every((value) => typeof value !== 'number' || Number.isFinite(value)));
}
export class EndlessStore {
  constructor({ storage = null } = {}) { this.storage = storage; this.memory = { run: null, best: null }; this.writeFailed = false; }
  getStorage() {
    try { return this.storage ?? (typeof window === 'undefined' ? null : window.localStorage); }
    catch { return null; }
  }
  load() {
    if (this.writeFailed) return clone(this.memory);
    try {
      const raw = this.getStorage()?.getItem(ENDLESS_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memory = { run: validEndlessRun(parsed.run) ? parsed.run : null, best: validBest(parsed.best) ? parsed.best : null };
      }
    } catch { /* Storage can be unavailable; keep this session's progress. */ }
    return clone(this.memory);
  }
  save(run) {
    this.memory.run = run && run.status !== 'over' ? clone(run) : null;
    this.persist();
  }
  persist() {
    try {
      const storage = this.getStorage();
      if (!storage) { this.writeFailed = true; return; }
      storage.setItem(ENDLESS_SAVE_KEY, JSON.stringify(this.memory));
      this.writeFailed = false;
    } catch { this.writeFailed = true; }
  }
  updateBest(seconds, score, rescuedCount, practice = false) {
    const survivedMs = Math.round(seconds * 1000);
    const previous = this.load().best;
    const isNewBest = !practice && (!previous || survivedMs > previous.survivedMs
      || (survivedMs === previous.survivedMs && score > previous.score));
    if (isNewBest) { this.memory.best = { survivedMs, score, rescuedCount }; this.persist(); }
    return { best: clone(this.memory.best), isNewBest };
  }
}