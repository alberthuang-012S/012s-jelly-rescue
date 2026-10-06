import { COMBAT_CONFIG as C, MOSQUITO_BOSS_CONFIG as B } from './BossConfig.js';
import { formatClock, formatScore } from './utils.js';
import { BOSS_STAGE_CONTENT } from './BossStageContent.js';

export class BossStageUI {
  constructor(game) {
    this.game = game;
    this.copy = BOSS_STAGE_CONTENT.alienMosquito;
    this.hud = document.querySelector('#boss-hud');
    this.banner = document.querySelector('#boss-banner');
    this.result = document.querySelector('#boss-result');
    this.development = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    game.gameShell.dataset.bossDebug = String(this.development);
    document.querySelector('#special-start').addEventListener('click', () => game.startStage('alienMosquito'));
    document.querySelector('#gravity-start').addEventListener('click', () => game.startStage('gravityOverload'));
    document.querySelector('#pigment-start').addEventListener('click', () => game.startStage('pigmentBloom'));
    document.querySelector('#boss-replay').addEventListener('click', () => game.startStage(game.selectedStage));
    document.querySelector('#boss-home').addEventListener('click', () => game.showHome());
    this.result.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...this.result.querySelectorAll('button, summary')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  setMode(active) {
    this.copy = BOSS_STAGE_CONTENT[this.game.selectedStage] || BOSS_STAGE_CONTENT.alienMosquito;
    const copy = this.copy;
    this.game.gameShell.dataset.bossItem = active ? copy.item : '';
    this.result.dataset.encounter = active ? this.game.selectedStage : '';
    document.querySelector('#boss-health').setAttribute('aria-label', `${copy.boss} HP`);
    document.querySelector('.boss-health-label span').textContent = `${copy.boss} · ${copy.bossEnglish}`;
    document.querySelector('.boss-result-stage').innerHTML = `${copy.title} <span>${copy.english}</span>`;
    document.querySelector('#boss-defeated-label').textContent = copy.defeated;
    document.querySelector('#boss-item-hit-label').textContent = `${copy.item} 命中`;
    this.game.gameShell.classList.toggle('is-boss-stage', active);
    this.game.gameShell.classList.remove('is-core-collecting');
    this.hud.classList.toggle('is-hidden', !active);
    this.banner.classList.add('is-hidden'); this.result.classList.add('is-hidden');
    document.querySelector('[data-item="PPA"] .item-info small').textContent = active && copy.item === 'PPA' ? '能量脈衝' : '皮膚照顧';
    document.querySelector('[data-item="NAP"] .item-info small').textContent = active && copy.item === 'NAP' ? '舒緩共鳴' : '痠痛舒緩';
    document.querySelector('[data-item="DDM"] .item-info small').textContent = active && copy.item === 'DDM' ? '光采脈衝' : '黑色素';
  }
  update() {
    const game = this.game; const c = game.bossCombat;
    if (!c) return;
    const collecting = c.state === 'COLLECT';
    game.gameShell.classList.toggle('is-core-collecting', collecting);
    this.hud.classList.toggle('is-hidden', c.state === 'VICTORY');
    const e = game.hud.elements;
    e.score.textContent = formatScore(c.score.score);
    e.timer.textContent = formatClock(c.elapsed); e.timerLabel.textContent = '挑戰時間';
    e.brandTitle.textContent = 'SPECIAL STAGE'; e.stageName.textContent = this.copy.title;
    e.action.classList.toggle('is-hidden', collecting);
    const paused = c.frozen || collecting || game.backgroundPaused || game.isExitConfirmOpen;
    const ready = !paused && c.cooldown <= 0 && Boolean(c.findTarget());
    e.action.classList.toggle('is-action-ready', ready);
    e.action.setAttribute('aria-disabled', paused ? 'true' : 'false');
    e.action.dataset.state = paused ? 'paused' : ready ? 'ready' : 'idle';
    document.querySelector('#boss-wave').textContent = collecting ? `討伐成功 · 收集${this.copy.coreName}` : c.wave <= 3 && ['WAVE', 'WAVE_CLEAR'].includes(c.state) ? `WAVE ${c.wave} / 3` : 'BOSS';
    const bar = document.querySelector('#boss-health');
    bar.classList.toggle('is-hidden', !c.boss || collecting);
    const hp = c.boss?.hp ?? B.hp;
    document.querySelector('#boss-health-fill').style.width = `${hp / B.hp * 100}%`;
    bar.setAttribute('aria-valuenow', hp);
    document.querySelector('#boss-health-number').textContent = `${hp} / ${B.hp}`;
    document.querySelector('#boss-core-hint').textContent = c.state === 'VICTORY' ? `${this.copy.item} 能量淨化完成！` : c.boss
      ? c.boss.coreOpen ? this.copy.openHint || (this.copy.item === 'NAP' ? '核心亮起！保持距離使用 NAP' : `核心亮起！靠近使用 ${this.copy.item}`) : this.copy.closedHint
      : this.copy.objective;
    if (c.state === 'BOSS' && ['SHIELD', 'SHIELD_WARN', 'SHIELD_BUILD'].includes(c.boss.state)) {
      document.querySelector('#boss-core-hint').textContent = `DDM 清除護盾墨晶 · 剩餘 ${c.attackContext.shields()} 顆`;
    }
    if (collecting) {
      const dx = c.coreDrop.x - c.player.x, dy = c.coreDrop.y - c.player.y;
      const direction = `${Math.abs(dx) > 25 ? dx > 0 ? '右' : '左' : ''}${Math.abs(dy) > 25 ? dy > 0 ? '下' : '上' : ''}`;
      document.querySelector('#boss-core-hint').textContent = `往${direction || '前'}靠近發光核心，即可收集`;
    }
    let title = ''; let subtitle = '';
    if (c.state === 'WAVE_CLEAR') title = 'WAVE CLEAR';
    if (c.state === 'ARRIVAL') {
      const elapsed = C.arrivalDuration - c.timer;
      title = elapsed < 2.6 ? 'WARNING' : this.copy.boss;
      subtitle = elapsed < 2.6 ? '偵測到大型生命體！' : this.copy.arrival || this.copy.bossEnglish;
    }
    if (c.state === 'BOSS' && c.boss.state === 'SUMMON') { title = `PHASE ${c.boss.phase}`; subtitle = '保持距離，準備閃避！'; }
    if (c.state === 'VICTORY') {
      title = c.timer > 1.3 ? this.copy.escape : 'SPECIAL STAGE CLEAR';
      subtitle = c.timer > 1.3 ? this.copy.mini : this.copy.peaceful;
    }
    this.banner.classList.toggle('is-hidden', !title);
    this.banner.classList.toggle('is-victory', c.state === 'VICTORY');
    this.banner.querySelector('strong').textContent = title;
    this.banner.querySelector('span').textContent = subtitle;
  }
  showResult(won) {
    const c = this.game.bossCombat; const r = c.score.result(c.clearTime ?? c.elapsed);
    this.result.dataset.outcome = won ? 'success' : 'failure';
    document.querySelector('#boss-result-title').textContent = won ? '討伐成功！' : '先休息一下吧';
    document.querySelector('#boss-result-kicker').textContent = won ? '討伐完成 · STAGE CLEAR' : '挑戰結束 · GAME OVER';
    document.querySelector('#boss-result-description').textContent = won ? this.copy.success : this.copy.failure;
    document.querySelector('#boss-failure-guide').classList.toggle('is-hidden', won);
    document.querySelector('#boss-result-progress').textContent = c.boss
      ? `挑戰進度：Boss 第 ${c.boss.phase} 階段 · 剩餘 ${c.boss.hp} / ${B.hp} 生命`
      : `挑戰進度：第 ${c.wave} / 3 波${this.copy.enemies}`;
    document.querySelector('#boss-result-tip').textContent = c.boss
      ? this.copy.bossTips[c.boss.phase - 1] : this.copy.waveTips[c.wave - 1];
    document.querySelector('#boss-result-core-note').classList.remove('is-hidden');
    document.querySelector('#boss-result-core-note').textContent = this.game.coreCollectionStore.has(this.copy.coreId)
      ? '本次未取得核心；圖鑑保留先前的收藏。'
      : '本次未取得核心。擊敗 Boss 後，記得撿取掉落的核心。';
    document.querySelector('#boss-replay').textContent = won ? '再玩一次' : '重新挑戰';
    document.querySelector('#boss-result-score').textContent = r.score.toLocaleString();
    const values = [formatClock(r.clearTime), r.defeatedEnemies, r.damageTaken, r[this.copy.hitMetric], r.bossHits];
    this.result.querySelectorAll('[data-boss-stat]').forEach((node, i) => { node.textContent = values[i]; });
    document.querySelector('#boss-result-time-label').textContent = won ? '討伐時間' : '挑戰時間';
    document.querySelector('#boss-score-note').textContent = won
      ? `${this.copy.item === 'DDM' ? `墨晶清除 ${r.crystalsCleared} 顆 · ` : ''}Boss 擊退 +1500 · 通關 +500${r.bossDamageTaken === 0 ? ' · Boss 戰無傷 +500' : ''}`
      : this.copy.bossTips[0];
    document.querySelector('#boss-result-details').open = false;
    this.result.classList.remove('is-hidden'); this.result.scrollTop = 0;
    this.result.querySelector('.boss-result-body').scrollTop = 0;
    document.querySelector('#boss-replay').focus({ preventScroll: true });
  }
}
