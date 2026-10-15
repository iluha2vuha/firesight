import assert from 'node:assert/strict';
import test from 'node:test';
import { selectForecast, timeframeLabel, timeframeMonths, TIME_FRAME_OPTIONS, FORECAST_PERIODS } from './forecast.js';

const linn = { forecast_6mo:30, forecast_12mo:29, forecast_18mo:28, forecast_lower:11, forecast_upper:49, trend_pct:-16.7 };

test('the shared controls contain only Current and whole-year periods', () => {
  assert.deepEqual(TIME_FRAME_OPTIONS, ['Current','Year 1','Year 2','Year 3']);
  for (const period of TIME_FRAME_OPTIONS) assert.equal(timeframeLabel(period), period);
  assert.equal(timeframeLabel('In 1.5 years'), 'Current');
  assert.deepEqual(FORECAST_PERIODS, TIME_FRAME_OPTIONS.slice(1));
});
test('model outputs retain their values at the correct annual horizon', () => {
  assert.equal(selectForecast(linn,'Current','model').value,30);
  for (const [index, period] of FORECAST_PERIODS.entries()) {
    const forecast = selectForecast(linn,period,'model');
    assert.equal(forecast.label,period);
    assert.equal(forecast.value,30-index);
    assert.equal(forecast.months,(index+1)*12);
    assert.equal(timeframeMonths(period),(index+1)*12);
  }
});
test('only the first annual model period has its interval and trend', () => {
  const first = selectForecast(linn,'Year 1','model');
  assert.equal(first.lower,11);
  assert.equal(first.upper,49);
  assert.equal(first.trend,-16.7);
  for (const period of ['Year 2','Year 3']) {
    const forecast = selectForecast(linn,period,'model');
    assert.equal(forecast.lower,null);
    assert.equal(forecast.upper,null);
    assert.equal(forecast.trend,null);
  }
});
test('Mock never relabels sample monthly data as an annual forecast', () => {
  for (const period of TIME_FRAME_OPTIONS) {
    const forecast = selectForecast(linn,period,'mock');
    assert.equal(forecast.value,null);
    assert.equal(forecast.lower,null);
    assert.equal(forecast.upper,null);
    assert.equal(forecast.trend,null);
  }
});
test('a missing annual horizon stays unavailable even if another has data', () => {
  assert.equal(selectForecast({...linn,forecast_18mo:null},'Year 3','model').value,null);
  assert.equal(selectForecast(null,'Year 2','model').value,null);
});
test('valid zero and invalid forecast values remain distinct', () => {
  assert.equal(selectForecast({forecast_12mo:0},'Year 2','model').value,0);
  assert.equal(selectForecast({forecast_12mo:NaN},'Year 2','model').value,null);
  assert.equal(selectForecast({forecast_12mo:Infinity},'Year 2','model').value,null);
});
