import assert from 'node:assert/strict';
import test from 'node:test';
import { selectForecast } from './forecast.js';

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
