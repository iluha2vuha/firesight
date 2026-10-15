import { riskForTimeframe } from './risk.js';

export const scoreBand = (score) => score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';
export const scoreColor = (score) => ({ high: '#ef6461', medium: '#f2c94c', low: '#52b56b' }[scoreBand(score)]);
export const bandLabel = (score) => ({ high: 'Higher', medium: 'Medium', low: 'Lower' }[scoreBand(score)]);

export const rankedWards = (features = [], search = '') => {
  const query = search.trim().toLowerCase();
  return features.filter((feature) => {
    const p = feature.properties;
    return Number.isFinite(p?.risk_score)
      && `${p.ward_name} ${p.ward_id}`.toLowerCase().includes(query);
  }).sort((a, b) => b.properties.risk_score - a.properties.risk_score
    || a.properties.ward_name.localeCompare(b.properties.ward_name));
};

export const displayedScore = (feature, timeFrame) => (
  riskForTimeframe(feature.properties.risk_score, timeFrame)
);
