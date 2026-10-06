import {CORE_CATALOG} from './CoreCollectionStore.js';

export class CoreCollectionUI {
  constructor(store) {
    this.store=store;this.dialog=document.querySelector('#core-collection-dialog');
    document.querySelectorAll('[data-open-collection]').forEach(button=>button.addEventListener('click',()=>this.open()));
    document.querySelector('#core-collection-close').addEventListener('click',()=>this.dialog.close());
    this.dialog.addEventListener('close',()=>this.lastTrigger?.focus({preventScroll:true}));
    this.refresh();
  }
  refresh() {
    const count=CORE_CATALOG.filter(core=>this.store.has(core.id)).length;
    document.querySelector('#core-collection-count').textContent=`${count} / ${CORE_CATALOG.length}`;
    document.querySelector('#core-collection-progress').textContent=`已收集 ${count} / ${CORE_CATALOG.length}`;
    CORE_CATALOG.forEach(core=>{
      const prefix=core.entryId,unlocked=this.store.has(core.id);
      document.querySelector(`#${prefix}`).classList.toggle('is-locked',!unlocked);
      document.querySelector(`#${prefix}-image`).hidden=!unlocked;
      document.querySelector(`#${prefix}-unknown`).hidden=unlocked;
      document.querySelector(`#${prefix}-name`).textContent=unlocked?core.name:'未發現的核心';
      document.querySelector(`#${prefix}-description`).textContent=unlocked?core.description
        :`擊敗「${core.stageTitle}」Boss 後，靠近並撿取掉落的核心。`;
      document.querySelector(`#${prefix}-status`).textContent=unlocked
        ?this.store.persisted?'已收集':'已收集 · 本次遊玩':'尚未收集';
    });
  }
  open() {
    this.refresh();this.lastTrigger=document.activeElement;
    if(!this.dialog.open)this.dialog.showModal();
  }
  showReward(reward) {
    document.querySelector('#boss-core-reward').classList.toggle('is-hidden',!reward);
    if(reward){
      const card=document.querySelector('#boss-core-reward');
      const source=card.querySelector('source');
      source.srcset=`./reference/runtime/${reward.core.image}.${reward.core.format || 'webp'}`;
      source.type=reward.core.format==='svg'?'image/svg+xml':'image/webp';
      const img=card.querySelector('img');img.src=`./reference/runtime/${reward.core.image}.${reward.core.format || 'png'}`;img.alt=reward.core.name;
      card.querySelector('strong').textContent=reward.core.name;
      document.querySelector('#boss-core-reward-status').textContent=
        `${reward.newlyUnlocked?'新核心已收錄圖鑑':'圖鑑中已收藏'}${reward.persisted?'':'（本次遊玩）'}`;
    }
    this.refresh();
  }
}
