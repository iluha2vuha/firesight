import { selectForecast } from '../../utils/forecast';

export default function ForecastChart({ prediction, dataSource }) {
  const periods = ['In 6 months', 'In 1 year', 'In 1.5 years'];
  const forecasts = periods.map((period) => selectForecast(prediction, period, dataSource));
  if (forecasts.some((forecast) => forecast.value == null)) {
    return <p className="empty-note">Forecast data is unavailable for this ward.</p>;
  }
  const ceiling = Math.max(10, Math.ceil(Math.max(...forecasts.map((f) => f.value)) / 10) * 10);
  return (
    <div className="forecast-chart">
      <svg viewBox="0 0 300 130" role="img" aria-label={forecasts.map((f) => `${f.label}: ${f.value} incidents`).join(', ')}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}>
          <line x1="29" y1={102 - fraction * 82} x2="290" y2={102 - fraction * 82} className="chart-grid"/>
          <text x="20" y={106 - fraction * 82} textAnchor="end" className="chart-axis">{ceiling * fraction}</text>
        </g>)}
        {forecasts.map((forecast, index) => {
          const height = forecast.value / ceiling * 82;
          const x = 56 + index * 88;
          return <g key={forecast.label}>
            <rect x={x} y={102 - height} width="43" height={height} rx="3" className="chart-bar"/>
            <text x={x + 21.5} y={96 - height} textAnchor="middle" className="chart-value">{forecast.value}</text>
            <text x={x + 21.5} y="124" textAnchor="middle" className="chart-axis">{forecast.label}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}
