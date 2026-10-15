import assert from 'node:assert/strict';
import test from 'node:test';
import { selectForecast, timeframeLabel, timeframeMonths } from './forecast.js';

const linn = {
  forecast_6mo: 30,
  forecast_12mo: 29,
  forecast_18mo: 28,
  forecast_lower: 11,
  forecast_upper: 49,
  trend_pct: -16.7,
};

test('uses the selected horizon instead of repeating the six-month ward forecast', () => {
  assert.equal(selectForecast(linn, 'Current').value, 30);
  assert.equal(selectForecast(linn, 'In 6 months').value, 30);
  assert.equal(selectForecast(linn, 'In 1 year').value, 29);
  assert.equal(selectForecast(linn, 'In 1.5 years').value, 28);
});

test('does not attach the six-month interval or trend to a longer forecast', () => {
  assert.equal(selectForecast(linn, 'Current').lower, 11);
  assert.equal(selectForecast(linn, 'Current').upper, 49);
  assert.equal(selectForecast(linn, 'Current').trend, -16.7);
  for (const timeFrame of ['In 1 year', 'In 1.5 years']) {
    const forecast = selectForecast(linn, timeFrame);
    assert.equal(forecast.lower, null);
    assert.equal(forecast.upper, null);
    assert.equal(forecast.trend, null);
  }
});

test('keeps a missing horizon unavailable even when another horizon has data', () => {
  const incomplete = { ...linn, forecast_18mo: null };
  assert.equal(selectForecast(incomplete, 'In 1.5 years').value, null);
  assert.equal(selectForecast(incomplete, 'In 1.5 years').months, 18);
  assert.equal(selectForecast(null, 'In 1 year').value, null);
});

test('distinguishes a valid zero forecast from missing or invalid data', () => {
  assert.equal(selectForecast({ forecast_12mo: 0 }, 'In 1 year').value, 0);
  assert.equal(selectForecast({ forecast_12mo: NaN }, 'In 1 year').value, null);
  assert.equal(selectForecast({ forecast_12mo: Infinity }, 'In 1 year').value, null);
});


test('labels the model outputs as three separate annual counts', () => {
  for (const [timeFrame, year, value] of [
    ['Current', 1, 30],
    ['In 6 months', 1, 30],
    ['In 1 year', 2, 29],
    ['In 1.5 years', 3, 28],
  ]) {
    const forecast = selectForecast(linn, timeFrame, 'model');
    assert.equal(forecast.label, `Year ${year}`);
    assert.equal(forecast.months, year * 12);
    assert.equal(forecast.value, value);
    if (year > 1) {
      assert.equal(forecast.lower, null);
      assert.equal(forecast.upper, null);
      assert.equal(forecast.trend, null);
    }
  }
});

test('uses annual control labels and calendar windows for Model mode only', () => {
  assert.equal(timeframeLabel('Current', 'model'), 'Current');
  for (const [timeFrame, year] of [
    ['In 6 months', 1], ['In 1 year', 2], ['In 1.5 years', 3],
  ]) {
    assert.equal(timeframeLabel(timeFrame, 'model'), `Year ${year}`);
    assert.equal(timeframeMonths(timeFrame, 'model'), year * 12);
    assert.equal(timeframeLabel(timeFrame, 'mock'), timeFrame);
    assert.equal(timeframeMonths(timeFrame, 'mock'), year * 6);
    assert.equal(selectForecast(linn, timeFrame, 'mock').label, `${year * 6}-month`);
  }
});
