export class ResultScreen {
  constructor({ onReplay, onNext, onHome, evolutionStore, onEvolve }) {
    this.screen = document.querySelector('#result-screen');
    this.gameover = document.querySelector('#gameover-screen');
    this.onReplay = onReplay;
    this.onNext = onNext;
    this.onHome = onHome;
    this.evolutionStore = evolutionStore;
    this.onEvolve = onEvolve;
    document.querySelector('#result-replay').addEventListener('click', () => this.onReplay?.());
    document.querySelector('#result-next').addEventListener('click', () => this.onNext?.());
    document.querySelector('#result-home').addEventListener('click', () => this.onHome?.());
    document.querySelector('#gameover-replay').addEventListener('click', () => this.onReplay?.());
    document.querySelector('#gameover-home').addEventListener('click', () => this.onHome?.());
  }

  hide() {
    this.screen.classList.add('is-hidden');
    this.gameover.classList.add('is-hidden');
  }

  showEvolution(screen) {
    let panel = screen.querySelector('.evolution-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'evolution-panel';
      screen.querySelector('.result-actions').before(panel);
    }
    panel.classList.remove('is-evolving');
    const { capsule, evolved } = this.evolutionStore.state;
    panel.innerHTML = `
      <img class="evolution-character" src="${evolved ? './reference/jelly-anthropomorphic-home.png' : './reference/runtime/jelly-home.webp'}" alt="${evolved ? '人型水母' : '小水母'}" />
      <div class="evolution-copy" aria-live="polite">
        <strong>${evolved ? '人型水母' : capsule ? '獲得 PNN+3 膠囊' : '小水母'}</strong>
        <p>${evolved ? '移動速度永久 +25%' : capsule ? '服用膠囊，進化成人型水母，移動速度永久 +25%。' : '在山區成功救援第 2 位居民，即可獲得進化膠囊。'}</p>
        ${capsule ? '<button class="secondary-button evolution-consume" type="button"><span class="capsule-icon" aria-hidden="true"></span>服用 PNN+3・進化</button>' : ''}
      </div>`;
    panel.querySelector('.evolution-consume')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = '正在進化…';
      const navigation = [...screen.querySelectorAll('.result-actions button')];
      navigation.forEach((item) => { item.disabled = true; });
      try {
        if (await this.onEvolve()) {
          this.showEvolution(screen);
          panel.classList.remove('is-evolving');
          void panel.offsetWidth;
          panel.classList.add('is-evolving');
          panel.querySelector('strong').textContent = '進化成功！人型水母';
        }
      } finally {
        navigation.forEach((item) => { item.disabled = false; });
      }
    });
  }

  showResult(result, stage, hasNext, nextLabel = '前往下一站') {
    this.hide();
    const isTutorial = stage.id === 'tutorial';
    document.querySelector('#result-kicker').textContent = isTutorial
      ? 'JELLY TRAINING · TRAINING COMPLETE'
      : `${stage.name.toUpperCase()} · STAGE CLEAR`;
    document.querySelector('#result-title').textContent = isTutorial ? '教學完成' : '巡邏完成！';
    const summary = isTutorial
      ? (result.tutorialComplete
        ? '你已學會移動、辨認症狀，並完成兩次基礎救援。'
        : '先熟悉移動與道具對應，再試一次教學會更順手。')
      : result.rescuedCount
        ? `本次成功幫助 ${result.rescuedCount} 位居民${result.isNewBest ? '，並刷新個人最佳紀錄！' : '。'}`
        : result.isNewBest
          ? '本次完成巡邏，並建立個人最佳紀錄！'
          : '熟悉路線後，再試一次會更順手。';
    document.querySelector('#result-summary').textContent = summary;
    document.querySelector('#result-score').textContent = result.score.toLocaleString();
    document.querySelector('#result-personal-best').textContent = isTutorial || !Number.isFinite(result.bestScore)
      ? '—'
      : result.bestScore.toLocaleString();
    document.querySelector('#result-personal-best-card')?.classList.toggle('is-hidden', isTutorial);
    const newBest = document.querySelector('#result-new-best');
    newBest?.classList.toggle('is-hidden', isTutorial || !result.isNewBest);
    newBest?.setAttribute('aria-hidden', isTutorial || !result.isNewBest ? 'true' : 'false');
    document.querySelector('#result-performance-score').textContent = isTutorial
      ? 'TRAINING COMPLETE'
      : `${Math.round(result.performanceScore)}`;
    document.querySelector('#result-grade').innerHTML = isTutorial
      ? '教學完成'
      : `${result.grade}<br /><small>GRADE</small>`;
    document.querySelector('#result-grade').classList.toggle('result-grade-training', isTutorial);
    document.querySelector('#result-accuracy').textContent = isTutorial
      ? '道具準確率 —'
      : `道具準確率 ${Math.round(result.toolAccuracy * 100)}%`;
    document.querySelector('#result-rescued').textContent = `${result.rescuedCount} 人`;
    document.querySelector('#result-max-combo').textContent = result.maxCombo;
    const next = document.querySelector('#result-next');
    const nextText = next.querySelector('span');
    if (nextText) nextText.textContent = nextLabel;
    next.classList.toggle('is-hidden', !hasNext);
    this.screen.classList.remove('is-hidden');
    this.showEvolution(this.screen);
  }

  showGameOver(result) {
    this.hide();
    document.querySelector('#gameover-score').textContent = result.score.toLocaleString();
    document.querySelector('#gameover-rescued').textContent = `${result.rescuedCount} 人`;
    document.querySelector('#gameover-max-combo').textContent = result.maxCombo;
    this.gameover.classList.remove('is-hidden');
    this.showEvolution(this.gameover);
  }
}
