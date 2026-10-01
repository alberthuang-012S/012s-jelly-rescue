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
    this.result.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...this.result.querySelectorAll('button, summary')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  setMode(active) {
    this.game.gameShell.classList.toggle('is-boss-stage', active);
    this.game.gameShell.classList.remove('is-core-collecting');
    this.hud.classList.toggle('is-hidden', !active);
    this.banner.classList.add('is-hidden'); this.result.classList.add('is-hidden');
    document.querySelector('[data-item="PPA"] .item-info small').textContent = active ? '能量脈衝' : '皮膚照顧';
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
    e.brandTitle.textContent = 'SPECIAL STAGE'; e.stageName.textContent = '異星蚊災';
    e.action.classList.toggle('is-hidden', collecting);
    const paused = c.frozen || collecting || game.backgroundPaused || game.isExitConfirmOpen;
    const ready = !paused && c.cooldown <= 0 && Boolean(c.findTarget());
    e.action.classList.toggle('is-action-ready', ready);
    e.action.setAttribute('aria-disabled', paused ? 'true' : 'false');
    e.action.dataset.state = paused ? 'paused' : ready ? 'ready' : 'idle';
    document.querySelector('#boss-wave').textContent = collecting ? '討伐成功 · 收集癢癢核心' : c.wave <= 3 && ['WAVE', 'WAVE_CLEAR'].includes(c.state) ? `WAVE ${c.wave} / 3` : 'BOSS';
    const bar = document.querySelector('#boss-health');
    bar.classList.toggle('is-hidden', !c.boss || collecting);
    const hp = c.boss?.hp ?? B.hp;
    document.querySelector('#boss-health-fill').style.width = `${hp / B.hp * 100}%`;
    bar.setAttribute('aria-valuenow', hp);
    document.querySelector('#boss-health-number').textContent = `${hp} / ${B.hp}`;
    document.querySelector('#boss-core-hint').textContent = c.state === 'VICTORY' ? 'PPA 能量淨化完成！' : c.boss
      ? c.boss.coreOpen ? '核心亮起！靠近使用 PPA' : '閃避預告衝刺，等待核心亮起'
      : '靠近蚊群，按使用釋放 PPA 能量';
    if (collecting) {
      const dx = c.coreDrop.x - c.player.x, dy = c.coreDrop.y - c.player.y;
      const direction = `${Math.abs(dx) > 25 ? dx > 0 ? '右' : '左' : ''}${Math.abs(dy) > 25 ? dy > 0 ? '下' : '上' : ''}`;
      document.querySelector('#boss-core-hint').textContent = `往${direction || '前'}靠近發光核心，即可收集`;
    }
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
    this.result.dataset.outcome = won ? 'success' : 'failure';
    document.querySelector('#boss-result-title').textContent = won ? '討伐成功！' : '先休息一下吧';
    document.querySelector('#boss-result-kicker').textContent = won ? '討伐完成 · STAGE CLEAR' : '挑戰結束 · GAME OVER';
    document.querySelector('#boss-result-description').textContent = won
      ? '異星嗡嗡王已退散，公園恢復平靜。'
      : '小水母需要補充體力，再出發挑戰蚊災。';
    document.querySelector('#boss-failure-guide').classList.toggle('is-hidden', won);
    document.querySelector('#boss-result-progress').textContent = c.boss
      ? `挑戰進度：Boss 第 ${c.boss.phase} 階段 · 剩餘 ${c.boss.hp} / ${B.hp} 生命`
      : `挑戰進度：第 ${c.wave} / 3 波蚊群`;
    document.querySelector('#boss-result-tip').textContent = c.boss
      ? c.boss.phase === 3 ? '連續衝刺有兩次，等第二次結束、核心亮起再靠近。'
        : c.boss.phase === 2 ? '避開泡泡與召喚蚊群，核心亮起時再靠近。'
          : '先閃過衝刺，核心亮起時靠近使用 PPA。'
      : c.wave === 3 ? '先處理靠近的蚊子，留意遠處飛來的泡泡。'
        : c.wave === 2 ? '看到衝刺預告就先側移，停下後再靠近。'
          : '靠近小蚊子使用 PPA，命中後拉開距離，等脈衝恢復。';
    document.querySelector('#boss-result-core-note').textContent = this.game.coreCollectionStore.has('itchCore')
      ? '本次未取得核心；圖鑑保留先前的收藏。'
      : '本次未取得核心。擊敗 Boss 後，記得撿取掉落的核心。';
    document.querySelector('#boss-replay').textContent = won ? '再玩一次' : '重新挑戰';
    document.querySelector('#boss-result-score').textContent = r.score.toLocaleString();
    const values = [formatClock(r.clearTime), r.defeatedEnemies, r.damageTaken, r.ppaHits, r.bossHits];
    this.result.querySelectorAll('[data-boss-stat]').forEach((node, i) => { node.textContent = values[i]; });
    document.querySelector('#boss-result-time-label').textContent = won ? '討伐時間' : '挑戰時間';
    document.querySelector('#boss-score-note').textContent = won
      ? `Boss 擊退 +1500 · 通關 +500${r.bossDamageTaken === 0 ? ' · Boss 戰無傷 +500' : ''}`
      : '閃過衝刺，再趁核心亮起時靠近使用 PPA。';
    document.querySelector('#boss-result-details').open = false;
    this.result.classList.remove('is-hidden'); this.result.scrollTop = 0;
    this.result.querySelector('.boss-result-body').scrollTop = 0;
    document.querySelector('#boss-replay').focus({ preventScroll: true });
  }
}
