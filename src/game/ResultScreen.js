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

  showResult(result, stage, hasNext) {
    this.hide();
    document.querySelector('#result-kicker').textContent = `${stage.name.toUpperCase()} · STAGE CLEAR`;
    document.querySelector('#result-summary').textContent = result.rescuedCount ? `今天有 ${result.rescuedCount} 位居民，因為你重新露出了笑容。` : '熟悉路線後，再試一次會更順手。';
    document.querySelector('#result-score').textContent = result.score.toLocaleString();
    document.querySelector('#result-grade').innerHTML = `${result.grade}<br /><small>WORK</small>`;
    document.querySelector('#result-rescued').textContent = `${result.rescuedCount} 人`;
    document.querySelector('#result-average').textContent = `${result.averageResponseTime.toFixed(1)} 秒`;
    document.querySelector('#result-ppa').textContent = `${result.ppaSuccess} 次`;
    document.querySelector('#result-nap').textContent = `${result.napSuccess} 次`;
    document.querySelector('#result-max-combo').textContent = result.maxCombo;
    document.querySelector('#result-wrong').textContent = `${result.wrongItemCount} 次`;
    const next = document.querySelector('#result-next');
    next.classList.toggle('is-hidden', !hasNext);
    this.screen.classList.remove('is-hidden');
  }

  showGameOver(result) {
    this.hide();
    document.querySelector('#gameover-score').textContent = result.score.toLocaleString();
    document.querySelector('#gameover-rescued').textContent = `${result.rescuedCount} 人`;
    document.querySelector('#gameover-average').textContent = `${result.averageResponseTime.toFixed(1)} 秒`;
    document.querySelector('#gameover-max-combo').textContent = result.maxCombo;
    document.querySelector('#gameover-ppa').textContent = `${result.ppaSuccess} 次`;
    document.querySelector('#gameover-nap').textContent = `${result.napSuccess} 次`;
    this.gameover.classList.remove('is-hidden');
  }
}
