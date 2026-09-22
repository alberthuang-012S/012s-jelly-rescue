import test from 'node:test';
import assert from 'node:assert/strict';
import { EvolutionStore, EVOLUTION_STORAGE_KEY } from '../src/game/EvolutionStore.js';

test('mountain second rescue awards once; consumption and reload persist evolution', () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
  const store = new EvolutionStore(storage);
  assert.deepEqual(store.state, { capsule: false, evolved: false });
  assert.equal(store.consume(), false);
  assert.equal(store.award('tutorial', 2), false);
  assert.equal(store.award('park', 2), false);
  assert.equal(store.award('mountain', 1), false);
  assert.equal(store.award('mountain', 2), true);
  assert.equal(store.award('mountain', 2), false);
  const reloaded = new EvolutionStore(storage);
  assert.deepEqual(reloaded.state, { capsule: true, evolved: false });
  assert.equal(reloaded.consume(), true);
  assert.equal(reloaded.consume(), false);
  const evolved = new EvolutionStore(storage);
  assert.deepEqual(evolved.state, { capsule: false, evolved: true });
  assert.equal(evolved.award('mountain', 2), false);
  assert.equal(JSON.parse(records.get(EVOLUTION_STORAGE_KEY)).evolved, true);
});

test('corrupt and unavailable storage do not prevent session progression', () => {
  for (const storage of [null, { getItem: () => '{bad', setItem() { throw Error('blocked'); } },
    { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }]) {
    const store = new EvolutionStore(storage);
    assert.equal(store.award('mountain', 2), true);
    assert.equal(store.consume(), true);
    assert.equal(store.award('mountain', 2), false);
  }
});
