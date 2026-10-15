export const FORECAST_PERIODS = ['Year 1', 'Year 2', 'Year 3'];
export const TIME_FRAME_OPTIONS = ['Current', ...FORECAST_PERIODS];
const periodNumber = (timeFrame) => Math.max(1, FORECAST_PERIODS.indexOf(timeFrame) + 1);
const finiteOrNull = (value) => Number.isFinite(value) ? value : null;

export const timeframeLabel = (timeFrame) => TIME_FRAME_OPTIONS.includes(timeFrame) ? timeFrame : 'Current';
export const timeframeMonths = (timeFrame) => timeFrame === 'Current' ? 1 : periodNumber(timeFrame) * 12;

export const selectForecast = (prediction = {}, timeFrame = 'Current', dataSource = 'model') => {
  const period = periodNumber(timeFrame);
  const isModel = dataSource === 'model';
  return {
    months: period * 12,
    label: `Year ${period}`,
    // Model's legacy API names hold annual values. Mock's legacy fields really
    // are sample month-based values, so they must not be shown as annual counts.
    value: finiteOrNull(prediction?.[isModel ? `forecast_${period * 6}mo` : `forecast_year_${period}`]),
    lower: isModel && period === 1 ? finiteOrNull(prediction?.forecast_lower) : null,
    upper: isModel && period === 1 ? finiteOrNull(prediction?.forecast_upper) : null,
    trend: isModel && period === 1 ? finiteOrNull(prediction?.trend_pct) : null,
  };
};
