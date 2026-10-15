import test from 'node:test';
import assert from 'node:assert/strict';
import { validWardData, validPremisesData, guidanceParagraphs } from './data.js';

const feature = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,0]]] },
  properties: { ward_id:'ward-1', ward_name:'Ward One', risk_score:40, data_source:'model' },
};
const collection = (features) => ({ type:'FeatureCollection', features });

test('ward responses distinguish valid empty data from malformed or wrong-source data', () => {
  assert.equal(validWardData(collection([]),'model'),true);
  assert.equal(validWardData(collection([feature]),'model'),true);
  assert.equal(validWardData(null,'model'),false);
  assert.equal(validWardData({features:[]},'model'),false);
  assert.equal(validWardData(collection([null]),'model'),false);
  assert.equal(validWardData(collection([feature]),'mock'),false);
  assert.equal(validWardData(collection([{...feature,type:'Unknown'}]),'model'),false);
  assert.equal(validWardData(collection([{...feature,properties:{...feature.properties,drivers:'Invalid context'}}]),'model'),false);
});
test('duplicate wards, unscored wards and invalid shapes do not reach the map', () => {
  assert.equal(validWardData(collection([feature,feature]),'model'),false);
  assert.equal(validWardData(collection([{...feature,properties:{...feature.properties,risk_score:null}}]),'model'),false);
  assert.equal(validWardData(collection([{...feature,geometry:null}]),'model'),false);
  assert.equal(validWardData(collection([{...feature,geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[2,2]]]}}]),'model'),false);
});
test('sample premises distinguish missing coordinates and malformed responses from empty data', () => {
  const p = {id:'example-1',name:'Example',lat:55.86,lng:-4.25,risk_score:88};
  assert.equal(validPremisesData([p]),true);
  assert.equal(validPremisesData([]),true);
  assert.equal(validPremisesData({}),false);
  assert.equal(validPremisesData([null]),false);
  assert.equal(validPremisesData([{...p,lat:null}]),false);
  assert.equal(validPremisesData([{...p,lng:200}]),false);
  assert.equal(validPremisesData([{...p,lat:''}]),false);
  assert.equal(validPremisesData([{...p,risk_score:null}]),false);
  assert.equal(validPremisesData([p,p]),false);
  assert.equal(validPremisesData([{...p,recommended_intervention:{}}]),false);
});
test('suggestions render as readable paragraphs without decorative bullet prefixes', () => {
  assert.deepEqual(guidanceParagraphs('• First action\n\n- Second action\n* Third action'), ['First action','Second action','Third action']);
  assert.deepEqual(guidanceParagraphs('  \n'), []);
  assert.deepEqual(guidanceParagraphs(null), []);
  assert.deepEqual(guidanceParagraphs('An ordinary paragraph.'), ['An ordinary paragraph.']);
  assert.deepEqual(guidanceParagraphs('-16.7% is the trend.'), ['-16.7% is the trend.']);
});
