import { endlessStandings, endlessRank, endlessTargetText } from './EndlessLeaderboard.js';
import { formatClock } from './utils.js';

const number = value => value.toLocaleString('zh-TW');
export class EndlessLeaderboardUI {
  constructor(store) {
    this.store = store;
    this.dialog = document.querySelector('#endless-leaderboard-dialog');
    this.body = document.querySelector('#endless-leaderboard-rows');
    this.dialog.querySelectorAll('[data-close-endless-leaderboard]').forEach(button =>
      button.addEventListener('click',()=>this.dialog.close()));
    this.dialog.addEventListener('close',()=>{
      if (this.trigger?.isConnected) this.trigger.focus({preventScroll:true});
    });
    // Keep keyboard navigation in the standings, including the scrollable
    // table, and block game/debug shortcuts behind the modal.
    this.dialog.addEventListener('keydown',event=>{
      event.stopPropagation();
      if (event.key==='Escape') { event.preventDefault();this.dialog.close();return; }
      if (event.key!=='Tab') return;
      const nodes=[...this.dialog.querySelectorAll('button, [tabindex="0"]')];
      const first=nodes[0],last=nodes.at(-1);
      if (event.shiftKey&&document.activeElement===first) { event.preventDefault();last.focus(); }
      else if (!event.shiftKey&&document.activeElement===last) { event.preventDefault();first.focus(); }
    });
    document.querySelector('#endless-leaderboard-open').addEventListener('click',event=>this.open(event.currentTarget));
  }
  open(trigger = document.activeElement) {
    const {best} = this.store.load();
    this.trigger = trigger;
    this.body.replaceChildren();
    for (const entry of endlessStandings(best)) {
      const row = document.createElement('tr');
      row.dataset.rank = entry.rank;
      row.dataset.id = entry.id;
      row.classList.toggle('is-player',entry.isPlayer);
      row.classList.toggle('is-podium',entry.rank<=3);
      const rank = document.createElement('td');
      rank.className = 'leaderboard-rank';
      rank.textContent = entry.rank<=3 ? ['🥇','🥈','🥉'][entry.rank-1] : String(entry.rank);
      rank.setAttribute('aria-label',`第 ${entry.rank} 名`);
      const name = document.createElement('th');
      name.scope = 'row';
      const challenger = document.createElement('span');
      challenger.className = 'leaderboard-challenger';
      const portrait = document.createElement('span');
      portrait.className = 'leaderboard-portrait';
      portrait.setAttribute('aria-hidden','true');
      if (entry.isPlayer) {
        const image = document.createElement('img');
        image.src = './reference/runtime/jelly-home.webp';
        image.alt = '';
        portrait.append(image);
      } else portrait.textContent = entry.icon;
      const copy = document.createElement('span');
      const label = document.createElement('b');
      label.textContent = entry.name;
      const detail = document.createElement('small');
      detail.textContent = entry.isPlayer ? '最佳紀錄' : `救援 ${entry.rescuedCount} 人`;
      copy.append(label,detail);challenger.append(portrait,copy);name.append(challenger);
      const time = document.createElement('td');
      time.className = 'leaderboard-time';
      time.textContent = formatClock(Math.floor(entry.survivedMs/1000));
      const score = document.createElement('td');
      score.className = 'leaderboard-score';
      score.textContent = number(entry.score);
      row.append(rank,name,time,score);this.body.append(row);
    }
    document.querySelector('#endless-leaderboard-summary').textContent = best
      ? `你的最佳紀錄：第 ${endlessRank(best)} 名${this.store.writeFailed?' · 本次遊玩':''}`
      : '完成首次挑戰，加入榜單。';
    document.querySelector('#endless-leaderboard-target').textContent = endlessTargetText(best);
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector('.leaderboard-table-scroll').scrollTop = 0;
    document.querySelector('#endless-leaderboard-close').focus({preventScroll:true});
  }
  renderResult(screen, current, {best,isNewBest,previousBest,practice}) {
    let panel = screen.querySelector('.endless-ranking-result');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'endless-ranking-result';
      panel.setAttribute('aria-label','廣場挑戰榜成績');
      screen.querySelector('.result-actions').before(panel);
    }
    panel.replaceChildren();
    panel.classList.remove('is-hidden','is-celebrating');
    const heading = document.createElement('strong');
    heading.className = 'endless-ranking-headline';
    const rank = endlessRank(current);
    const previousRank = previousBest ? endlessRank(previousBest) : null;
    const improved = !practice && isNewBest && previousRank!==null && rank<previousRank;
    heading.textContent = practice ? '練習局 · 不列入排行榜'
      : improved ? `↑ 名次提升！第 ${previousRank} 名 → 第 ${rank} 名`
        : isNewBest ? `★ 新紀錄！本次第 ${rank} 名` : `本次挑戰第 ${rank} 名`;
    const detail = document.createElement('p');
    detail.textContent = practice ? '使用 DEBUG 的挑戰不更新最佳名次。'
      : best ? `個人最佳：第 ${endlessRank(best)} 名` : '';
    const target = document.createElement('p');
    target.className = 'endless-ranking-target';
    target.textContent = endlessTargetText(current);
    target.hidden = practice;
    const button = document.createElement('button');
    button.id = 'endless-result-leaderboard';
    button.className = 'secondary-button';
    button.type = 'button';
    button.textContent = '查看廣場挑戰榜';
    button.addEventListener('click',()=>this.open(button));
    panel.append(heading,detail,target,button);
    if (!practice && isNewBest) {
      void panel.offsetWidth;
      panel.classList.add('is-celebrating');
    }
  }
  close() { this.dialog.close(); }
}
