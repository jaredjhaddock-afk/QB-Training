import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReceiverNames, saveReceiverNames, normalizeReceiverName, validReceiverNames } from '../src/receiver-names.js';

import { labels as defaults } from '../src/football.js';
test('Team names support slot and back designations and normalize typed input', () => {
  assert.equal(normalizeReceiverName(' rb '), 'RB');
  assert.ok(validReceiverNames(['X', 'F', 'Y', 'Z', 'RB']));
  for (const invalid of [['X', 'H', 'Y', 'Z', 'H'], ['X', '', 'Y', 'Z', 'R'], ['X', 'H', 'Y', 'Z', '<b>'], ['X'], null]) {
    assert.equal(validReceiverNames(invalid), false);
  }
});
test('Stored team names survive reload without changing the defaults', () => {
  let value = null;
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  const names = ['X', 'F', 'Y', 'Z', 'RB'];
  assert.equal(saveReceiverNames(names, storage), true);
  assert.deepEqual(loadReceiverNames(defaults, storage), names);
  assert.deepEqual(defaults, ['X', 'F', 'Y', 'Z', 'H']);
});
test('Unavailable or corrupt browser storage leaves a usable playbook', () => {
  for (const value of ['broken JSON', '["X","X","Y","Z","R"]', '{"name":"X"}', '["<script>","F","Y","Z","R"]']) {
    assert.deepEqual(loadReceiverNames(defaults, { getItem: () => value }), defaults);
  }
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
  assert.deepEqual(loadReceiverNames(defaults, blocked), defaults);
  assert.equal(saveReceiverNames(defaults, blocked), false);
});
