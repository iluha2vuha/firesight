// These values are also used by the existing mock-data controls.
const PERIOD_BY_TIMEFRAME = {
  Current: 1,
  'In 6 months': 1,
  'In 1 year': 2,
  'In 1.5 years': 3,
};

const finiteOrNull = (value) => Number.isFinite(value) ? value : null;

export const timeframeLabel = (timeFrame, dataSource = 'mock') => {
  if (timeFrame === 'Current' || dataSource !== 'model') return timeFrame;
  return `Year ${PERIOD_BY_TIMEFRAME[timeFrame] ?? 1}`;
};

export const timeframeMonths = (timeFrame, dataSource = 'mock') => (
  timeFrame === 'Current' ? 1
    : (PERIOD_BY_TIMEFRAME[timeFrame] ?? 1) * (dataSource === 'model' ? 12 : 6)
);

export const selectForecast = (prediction = {}, timeFrame = 'Current', dataSource = 'mock') => {
  const period = PERIOD_BY_TIMEFRAME[timeFrame] ?? 1;
  const isAnnual = dataSource === 'model';
  const months = period * (isAnnual ? 12 : 6);

  return {
    months,
    label: isAnnual ? `Year ${period}` : `${months}-month`,
    // Model CSV/API field names are legacy: 6mo/12mo/18mo hold the next three
    // annual projections. Keep compatibility while displaying their actual units.
    value: finiteOrNull(prediction?.[`forecast_${period * 6}mo`]),
    // The interval and trend describe only the first projected period.
    lower: period === 1 ? finiteOrNull(prediction?.forecast_lower) : null,
    upper: period === 1 ? finiteOrNull(prediction?.forecast_upper) : null,
    trend: period === 1 ? finiteOrNull(prediction?.trend_pct) : null,
  };
};
