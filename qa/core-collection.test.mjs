import test from 'node:test';
import assert from 'node:assert/strict';
import {CoreCollectionStore,CORE_COLLECTION_KEY} from '../src/game/CoreCollectionStore.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
test('only a completed alien stage awards one core; replay and reload retain the same collection',()=>{
  const storage=memory(),store=new CoreCollectionStore(storage);
  assert.equal(store.awardClear('alienMosquito',false),null);
  assert.equal(store.awardClear('park',true),null);assert.equal(store.unlocked.size,0);
  const first=store.awardClear('alienMosquito',true);
  assert.equal(first.newlyUnlocked,true);assert.equal(first.persisted,true);
  assert.equal(store.awardClear('alienMosquito',true).newlyUnlocked,false);
  const reload=new CoreCollectionStore(storage);assert.equal(reload.has('itchCore'),true);assert.equal(reload.unlocked.size,1);
  assert.deepEqual(JSON.parse(storage.getItem(CORE_COLLECTION_KEY)).unlocked,['itchCore']);
});
test('corrupt, incompatible and unknown records cannot unlock noncatalog entries',()=>{
  for(const saved of ['bad-json','{"version":2,"unlocked":["itchCore"]}','{"version":1,"unlocked":true}']){
    const store=new CoreCollectionStore({getItem:()=>saved});assert.equal(store.unlocked.size,0);
  }
  const store=new CoreCollectionStore({getItem:()=>'{"version":1,"unlocked":["itchCore","unknown","itchCore"]}'});
  assert.equal(store.unlocked.size,1);assert.equal(store.has('unknown'),false);
});
test('unavailable storage retains session collection and explicitly reports unsaved progress',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  const store=new CoreCollectionStore(storage),reward=store.awardClear('alienMosquito',true);
  assert.equal(reward.persisted,false);assert.equal(store.has('itchCore'),true);
  assert.equal(store.awardClear('alienMosquito',true).newlyUnlocked,false);
  assert.equal(new CoreCollectionStore(null).awardClear('alienMosquito',true).persisted,false);
});
