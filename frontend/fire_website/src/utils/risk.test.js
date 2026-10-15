import assert from 'node:assert/strict';
import test from 'node:test';
import { riskForTimeframe } from './risk.js';

test('starts with the API model score and applies only the fixed scenario increments', () => {
  // Linn has model score 26 and a declining incident forecast; that trend must
  // not subtract from the selected fixed risk increment.
  assert.equal(riskForTimeframe(26, 'Current'), 26);
  assert.equal(riskForTimeframe(26, 'In 6 months'), 30);
  assert.equal(riskForTimeframe(26, 'In 1 year'), 34);
  assert.equal(riskForTimeframe(26, 'In 1.5 years'), 38);
});

test('keeps risk scenarios on the 0–100 scale', () => {
  assert.equal(riskForTimeframe(95, 'In 1.5 years'), 100);
  assert.equal(riskForTimeframe(-1, 'Current'), 0);
});
