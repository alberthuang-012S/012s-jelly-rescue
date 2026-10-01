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
    const core=CORE_CATALOG[0],unlocked=this.store.has(core.id);
    document.querySelector('#core-entry').classList.toggle('is-locked',!unlocked);
    document.querySelector('#core-entry-image').hidden=!unlocked;
    document.querySelector('#core-entry-unknown').hidden=unlocked;
    document.querySelector('#core-entry-name').textContent=unlocked?core.name:'未發現的核心';
    document.querySelector('#core-entry-description').textContent=unlocked?core.description:'擊敗「異星蚊災」Boss 後，靠近並撿取掉落的核心。';
    document.querySelector('#core-entry-status').textContent=unlocked
      ?this.store.persisted?'已收集':'已收集 · 本次遊玩':'尚未收集';
  }
  open() {
    this.refresh();this.lastTrigger=document.activeElement;
    if(!this.dialog.open)this.dialog.showModal();
  }
  showReward(reward) {
    document.querySelector('#boss-core-reward').classList.toggle('is-hidden',!reward);
    if(reward)document.querySelector('#boss-core-reward-status').textContent=
      `${reward.newlyUnlocked?'新核心已收錄圖鑑':'圖鑑中已收藏'}${reward.persisted?'':'（本次遊玩）'}`;
    this.refresh();
  }
}
