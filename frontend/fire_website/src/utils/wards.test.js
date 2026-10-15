import test from 'node:test';
import assert from 'node:assert/strict';
import { rankedWards, displayedScore, scoreBand } from './wards.js';

const ward = (id, name, score) => ({ properties: { ward_id:id, ward_name:name, risk_score:score } });
test('ward priorities rank the same geographic units as the map and use stable tie breaks', () => {
  const input = [ward('linn','Linn',26), ward('north','North East',40), ward('govan','Govan',40)];
  assert.deepEqual(rankedWards(input).map((f) => f.properties.ward_id), ['govan','north','linn']);
  assert.equal(input[0].properties.ward_id, 'linn');
  assert.equal(displayedScore(input[0], 'In 1.5 years'), 38);
  assert.equal(rankedWards(input)[0].properties.risk_score, 40);
});
test('ward search supports names and identifiers, and missing scores are not treated as low risk', () => {
  const data = [ward('S13003133','North East',40), ward('missing','Unscored',null), ward('bad','Invalid',NaN)];
  assert.equal(rankedWards(data,' north EAST ').length,1);
  assert.equal(rankedWards(data,'S13003133').length,1);
  assert.equal(rankedWards(data).length,1);
  assert.equal(rankedWards(data,'no match').length,0);
});
test('display bands agree with the legend thresholds', () => {
  assert.equal(scoreBand(39),'low');
  assert.equal(scoreBand(40),'medium');
  assert.equal(scoreBand(74),'medium');
  assert.equal(scoreBand(75),'high');
});
