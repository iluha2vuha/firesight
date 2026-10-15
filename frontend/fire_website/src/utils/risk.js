const TIMEFRAME_INCREMENTS = {
  Current: 0,
  'In 6 months': 4,
  'In 1 year': 8,
  'In 1.5 years': 12,
};

// Future views are scenarios based on the API's current score, not incident forecasts.
export const riskForTimeframe = (baseRisk, timeFrame = 'Current') => (
  Math.max(0, Math.min(100, baseRisk + (TIMEFRAME_INCREMENTS[timeFrame] ?? 0)))
);
