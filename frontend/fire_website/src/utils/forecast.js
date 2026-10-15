const MONTHS_BY_TIMEFRAME = {
  Current: 6,
  'In 6 months': 6,
  'In 1 year': 12,
  'In 1.5 years': 18,
};

const finiteOrNull = (value) => Number.isFinite(value) ? value : null;

export const selectForecast = (prediction = {}, timeFrame = 'Current') => {
  const months = MONTHS_BY_TIMEFRAME[timeFrame] ?? 6;

  return {
    months,
    value: finiteOrNull(prediction?.[`forecast_${months}mo`]),
    // The API's interval and trend describe the six-month forecast only.
    lower: months === 6 ? finiteOrNull(prediction?.forecast_lower) : null,
    upper: months === 6 ? finiteOrNull(prediction?.forecast_upper) : null,
    trend: months === 6 ? finiteOrNull(prediction?.trend_pct) : null,
  };
};
