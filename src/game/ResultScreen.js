export class ResultScreen {
  constructor({ onReplay, onNext, onHome, evolutionStore, onEvolve }) {
    this.screen = document.querySelector('#result-screen');
    this.gameover = document.querySelector('#gameover-screen');
    this.onReplay = onReplay;
    this.onNext = onNext;
    this.onHome = onHome;
    this.evolutionStore = evolutionStore;
    this.onEvolve = onEvolve;
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'evolution-dialog';
    this.dialog.setAttribute('aria-labelledby', 'evolution-dialog-title');
    this.dialog.setAttribute('aria-describedby', 'evolution-dialog-description');
    this.dialog.addEventListener('cancel', (event) => event.preventDefault());
    document.body.append(this.dialog);
    const guard = (callback) => () => {
      if (!this.dialog.open && !this.evolutionStore.state.capsule) callback?.();
    };
    this.onReplay = guard(onReplay);
    this.onNext = guard(onNext);
    this.onHome = guard(onHome);
    document.querySelector('#result-replay').addEventListener('click', () => this.onReplay?.());
    document.querySelector('#result-next').addEventListener('click', () => this.onNext?.());
    document.querySelector('#result-home').addEventListener('click', () => this.onHome?.());
    document.querySelector('#gameover-replay').addEventListener('click', () => this.onReplay?.());
    document.querySelector('#gameover-home').addEventListener('click', () => this.onHome?.());
  }

  hide() {
    this.dialog.close();
    this.screen.classList.add('is-hidden');
    this.gameover.classList.add('is-hidden');
  }

  openDialog({ title, description, visual, buttonText, onClick }) {
    this.dialog.innerHTML = `
      <div class="evolution-dialog-art">${visual}</div>
      <span class="evolution-dialog-kicker">PNN+3 · JELLY EVOLUTION</span>
      <h2 id="evolution-dialog-title">${title}</h2>
      <p id="evolution-dialog-description" aria-live="polite">${description}</p>
      <button class="primary-button evolution-dialog-action" type="button">${buttonText}</button>`;
    const button = this.dialog.querySelector('button');
    button.addEventListener('click', () => onClick(button));
    if (!this.dialog.open) this.dialog.showModal();
    button.focus();
  }

  showReward(onContinue) {
    this.openDialog({
      title: '獲得 PNN+3 膠囊！',
      description: '成功救援第 2 位居民！<br>膠囊已收好，巡邏結算時就能進化成人型水母。',
      visual: '<span class="reward-rays" aria-hidden="true">✦</span><span class="reward-capsule" aria-label="PNN+3 膠囊">PNN+3</span>',
      buttonText: '收下膠囊，繼續救援',
      onClick: () => { this.dialog.close(); onContinue(); }
    });
  }

  requireEvolution(screen) {
    this.openDialog({
      title: '小水母，準備進化！',
      description: '服用 PNN+3 膠囊，進化成人型水母。<br>移動速度永久提升 25%，完成進化後即可繼續。',
      visual: '<img class="evolution-character" src="./reference/runtime/jelly-home.webp" alt="小水母"><span class="reward-capsule reward-capsule-small" aria-hidden="true">PNN+3</span>',
      buttonText: '服用 PNN+3・開始進化',
      onClick: async (button) => {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = '正在進化…';
        try {
          if (!await this.onEvolve()) throw new Error('Evolution incomplete');
          const image = this.dialog.querySelector('img');
          image.src = './reference/jelly-anthropomorphic-home.png';
          image.alt = '人型水母';
          await image.decode().catch(() => {});
          this.dialog.querySelector('.reward-capsule').remove();
          this.dialog.querySelector('.evolution-dialog-art').classList.add('is-evolving');
          this.dialog.querySelector('h2').textContent = '進化成功！人型水母';
          this.dialog.querySelector('p').textContent = '移動速度永久 +25%，一起展開下一次救援！';
          await new Promise(resolve => setTimeout(resolve, 1200));
          this.showEvolution(screen);
          button.textContent = '太棒了，查看結算';
          button.disabled = false;
          // Replace the action so further clicks cannot consume another capsule.
          const done = button.cloneNode(true);
          button.replaceWith(done);
          done.addEventListener('click', () => {
            this.dialog.close();
            screen.querySelector('.result-actions button:not(.is-hidden)')?.focus();
          });
          done.focus();
        } catch {
          button.disabled = false;
          button.textContent = '重試進化';
          this.dialog.querySelector('p').textContent = '進化尚未完成，請再試一次。膠囊進度已保留。';
        }
      }
    });
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
      </div>`;
    if (capsule) this.requireEvolution(screen);
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
