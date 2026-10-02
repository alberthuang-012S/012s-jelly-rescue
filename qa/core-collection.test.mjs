import test from 'node:test';
import assert from 'node:assert/strict';
import {CoreCollectionStore,CORE_COLLECTION_KEY} from '../src/game/CoreCollectionStore.js';
const pickup={id:'itchCore',collected:true};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
test('only a collected alien core awards one entry; replay and reload retain the same collection',()=>{
  const storage=memory(),store=new CoreCollectionStore(storage);
  assert.equal(store.collect('alienMosquito',{...pickup,collected:false}),null);
  assert.equal(store.collect('alienMosquito',null),null);
  assert.equal(store.collect('alienMosquito',{id:'unknown',collected:true}),null);
  assert.equal(store.collect('park',pickup),null);assert.equal(store.unlocked.size,0);
  const first=store.collect('alienMosquito',pickup);
  assert.equal(first.newlyUnlocked,true);assert.equal(first.persisted,true);
  assert.equal(store.collect('alienMosquito',pickup).newlyUnlocked,false);
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
  const store=new CoreCollectionStore(storage),reward=store.collect('alienMosquito',pickup);
  assert.equal(reward.persisted,false);assert.equal(store.has('itchCore'),true);
  assert.equal(store.collect('alienMosquito',pickup).newlyUnlocked,false);
  assert.equal(new CoreCollectionStore(null).collect('alienMosquito',pickup).persisted,false);
});

test('gravity collection preserves v1 itch records, rejects mismatched/uncollected cores and persists both',()=>{
  const storage=memory();storage.setItem(CORE_COLLECTION_KEY,JSON.stringify({version:1,unlocked:['itchCore']}));
  const store=new CoreCollectionStore(storage);
  assert.equal(store.has('itchCore'),true);assert.equal(store.has('gravityCore'),false);
  assert.equal(store.collect('gravityOverload',{id:'gravityCore',collected:false}),null);
  assert.equal(store.collect('alienMosquito',{id:'gravityCore',collected:true}),null);
  assert.equal(store.collect('gravityOverload',pickup),null);
  const drop={id:'gravityCore',collected:true};
  assert.equal(store.collect('gravityOverload',drop).newlyUnlocked,true);
  assert.equal(store.collect('gravityOverload',drop).newlyUnlocked,false);
  const reload=new CoreCollectionStore(storage);assert.deepEqual([...reload.unlocked],['itchCore','gravityCore']);
});
