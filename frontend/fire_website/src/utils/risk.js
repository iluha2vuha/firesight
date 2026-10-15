const TIMEFRAME_INCREMENTS = {
  Current: 0,
  'Year 1': 4,
  'Year 2': 8,
  'Year 3': 12,
};

// Future views are scenarios based on the API's current score, not incident forecasts.
export const riskForTimeframe = (baseRisk, timeFrame = 'Current') => (
  Math.max(0, Math.min(100, baseRisk + (TIMEFRAME_INCREMENTS[timeFrame] ?? 0)))
);
