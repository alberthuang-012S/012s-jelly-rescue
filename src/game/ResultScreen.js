export class ResultScreen {
  constructor({ onReplay, onNext, onHome }) {
    this.screen = document.querySelector('#result-screen');
    this.gameover = document.querySelector('#gameover-screen');
    this.onReplay = onReplay;
    this.onNext = onNext;
    this.onHome = onHome;
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
  }

  showGameOver(result) {
    this.hide();
    document.querySelector('#gameover-score').textContent = result.score.toLocaleString();
    document.querySelector('#gameover-rescued').textContent = `${result.rescuedCount} 人`;
    document.querySelector('#gameover-max-combo').textContent = result.maxCombo;
    this.gameover.classList.remove('is-hidden');
  }
}
