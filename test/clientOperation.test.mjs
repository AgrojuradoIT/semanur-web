import assert from 'node:assert/strict';
import test from 'node:test';

import { createClientOperationTracker } from '../src/shared/utils/clientOperation.js';

test('retains a key for an unchanged retry and rotates it for a changed intent', () => {
  const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
  const tracker = createClientOperationTracker(() => ids.shift());

  const first = tracker.idFor({ amount: 10, destination: 7 });
  const retry = tracker.idFor({ amount: 10, destination: 7 });
  const changed = tracker.idFor({ amount: 11, destination: 7 });

  assert.equal(retry, first);
  assert.notEqual(changed, first);
});

test('reset starts a new operation even when the payload is identical', () => {
  let sequence = 0;
  const tracker = createClientOperationTracker(() => `operation-${++sequence}`);
  const payload = { description: 'same intent' };

  const first = tracker.idFor(payload);
  tracker.reset();

  assert.notEqual(tracker.idFor(payload), first);
});
