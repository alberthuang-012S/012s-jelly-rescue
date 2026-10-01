import { COMBAT_CONFIG as C, MOSQUITO_BOSS_CONFIG as B } from './BossConfig.js';
import { formatClock, formatScore } from './utils.js';

export class BossStageUI {
  constructor(game) {
    this.game = game;
    this.hud = document.querySelector('#boss-hud');
    this.banner = document.querySelector('#boss-banner');
    this.result = document.querySelector('#boss-result');
    this.development = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    game.gameShell.dataset.bossDebug = String(this.development);
    document.querySelector('#special-start').addEventListener('click', () => game.startStage('alienMosquito'));
    document.querySelector('#boss-replay').addEventListener('click', () => game.startStage('alienMosquito'));
    document.querySelector('#boss-home').addEventListener('click', () => game.showHome());
  }
  setMode(active) {
    this.game.gameShell.classList.toggle('is-boss-stage', active);
    this.hud.classList.toggle('is-hidden', !active);
    this.banner.classList.add('is-hidden'); this.result.classList.add('is-hidden');
    document.querySelector('[data-item="PPA"] .item-info small').textContent = active ? '能量脈衝' : '皮膚照顧';
  }
  update() {
    const game = this.game; const c = game.bossCombat;
    if (!c) return;
    this.hud.classList.toggle('is-hidden', c.state === 'VICTORY');
    const e = game.hud.elements;
    e.score.textContent = formatScore(c.score.score);
    e.timer.textContent = formatClock(c.elapsed); e.timerLabel.textContent = '挑戰時間';
    e.brandTitle.textContent = 'SPECIAL STAGE'; e.stageName.textContent = '異星蚊災';
    e.action.classList.remove('is-hidden');
    const paused = c.frozen || game.backgroundPaused || game.isExitConfirmOpen;
    const ready = !paused && c.cooldown <= 0 && Boolean(c.findTarget());
    e.action.classList.toggle('is-action-ready', ready);
    e.action.setAttribute('aria-disabled', paused ? 'true' : 'false');
    e.action.dataset.state = paused ? 'paused' : ready ? 'ready' : 'idle';
    document.querySelector('#boss-wave').textContent = c.wave <= 3 && ['WAVE', 'WAVE_CLEAR'].includes(c.state) ? `WAVE ${c.wave} / 3` : 'BOSS';
    const bar = document.querySelector('#boss-health');
    bar.classList.toggle('is-hidden', !c.boss);
    const hp = c.boss?.hp ?? B.hp;
    document.querySelector('#boss-health-fill').style.width = `${hp / B.hp * 100}%`;
    bar.setAttribute('aria-valuenow', hp);
    document.querySelector('#boss-health-number').textContent = `${hp} / ${B.hp}`;
    document.querySelector('#boss-core-hint').textContent = c.state === 'VICTORY' ? 'PPA 能量淨化完成！' : c.boss
      ? c.boss.coreOpen ? '核心亮起！靠近使用 PPA' : '閃避預告衝刺，等待核心亮起'
      : '靠近蚊群，按使用釋放 PPA 能量';
    let title = ''; let subtitle = '';
    if (c.state === 'WAVE_CLEAR') title = 'WAVE CLEAR';
    if (c.state === 'ARRIVAL') {
      const elapsed = C.arrivalDuration - c.timer;
      title = elapsed < 2.6 ? 'WARNING' : '異星嗡嗡王';
      subtitle = elapsed < 2.6 ? '偵測到大型生命體！' : 'MOSQUITO KING';
    }
    if (c.state === 'BOSS' && c.boss.state === 'SUMMON') { title = `PHASE ${c.boss.phase}`; subtitle = '保持距離，準備閃避！'; }
    if (c.state === 'VICTORY') {
      title = c.timer > 1.3 ? '嗡……下次不敢了……！' : 'SPECIAL STAGE CLEAR';
      subtitle = c.timer > 1.3 ? 'MINI MOSQUITO KING' : 'Jelly Park 恢復平靜';
    }
    this.banner.classList.toggle('is-hidden', !title);
    this.banner.classList.toggle('is-victory', c.state === 'VICTORY');
    this.banner.querySelector('strong').textContent = title;
    this.banner.querySelector('span').textContent = subtitle;
  }
  showResult(won) {
    const c = this.game.bossCombat; const r = c.score.result(c.clearTime ?? c.elapsed);
    document.querySelector('#boss-result-title').textContent = won ? '異星蚊災討伐成功！' : '休息一下，再來挑戰';
    document.querySelector('#boss-result-kicker').textContent = won ? 'SPECIAL STAGE CLEAR' : 'SPECIAL STAGE · GAME OVER';
    document.querySelector('#boss-result-score').textContent = r.score.toLocaleString();
    const values = [formatClock(r.clearTime), r.defeatedEnemies, r.damageTaken, r.ppaHits, r.bossHits];
    this.result.querySelectorAll('[data-boss-stat]').forEach((node, i) => { node.textContent = values[i]; });
    document.querySelector('#boss-result-time-label').textContent = won ? 'CLEAR TIME' : 'TIME SURVIVED';
    document.querySelector('#boss-score-note').textContent = won
      ? `Boss 擊退 +1500 · 通關 +500${r.bossDamageTaken === 0 ? ' · Boss 戰無傷 +500' : ''}`
      : '閃過衝刺，再趁核心亮起時靠近使用 PPA。';
    this.result.classList.remove('is-hidden'); this.result.scrollTop = 0;
    document.querySelector('#boss-replay').focus({ preventScroll: true });
  }
}
