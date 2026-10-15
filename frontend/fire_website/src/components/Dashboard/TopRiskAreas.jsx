// src/components/Dashboard/TopRiskAreas.jsx
import { useEffect, useState } from 'react';
import { selectForecast } from '../../utils/forecast';
import './TopRiskAreas.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TopRiskAreas = ({ dataSource = 'mock', timeFrame = 'Current' }) => {
  const [areas, setAreas]         = useState([]);
  const [aiById, setAiById]       = useState({});
  const [loadingById, setLoadingById] = useState({});

  useEffect(() => {
    setAreas([]);
    setAiById({});
    const fetchAreas = async () => {
      try {
        if (dataSource === 'model') {
          const res  = await fetch(`${BACKEND_URL}/api/zones/top?n=5`);
          const data = await res.json();
          setAreas(data.map((z) => ({
            id:       z.zoneid,
            mode:     'zone',
            name:     z.zonename || z.zoneid,
            risk:     z.riskscore ?? 0,
            drivers:  Array.isArray(z.drivers) ? z.drivers : [],
            prediction: {
              forecast_6mo: z.forecast6mo,
              forecast_12mo: z.forecast12mo,
              forecast_18mo: z.forecast18mo,
              trend_pct: z.trendpct,
            },
          })));
        } else {
          const res  = await fetch(`${BACKEND_URL}/api/strategic/wards`);
          const data = await res.json();
          setAreas(
            data
              .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
              .slice(0, 5)
              .map((w) => ({
                id:       w.ward_id,
                mode:     'ward',
                name:     w.ward_name,
                risk:     w.risk_score,
                drivers:  Array.isArray(w.drivers) ? w.drivers : [],
                prediction: w.prediction,
              }))
          );
        }
      } catch {
        setAreas([]);
      }
    };
    fetchAreas();
  }, [dataSource]);

  const fetchAI = async (id, mode) => {
    setLoadingById((p) => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(
        `${BACKEND_URL}/api/explain?mode=${mode}&id=${encodeURIComponent(id)}&source=${dataSource}`
      );
      const data = await res.json();
      setAiById((p) => ({ ...p, [id]: data.text || 'No recommendation returned.' }));
    } catch {
      setAiById((p) => ({ ...p, [id]: 'Could not load recommendations right now.' }));
    } finally {
      setLoadingById((p) => ({ ...p, [id]: false }));
    }
  };

  const riskColor = (score) => {
    if (score >= 75) return '#ef4444';
    if (score >= 40) return '#f97316';
    return '#22c55e';
  };

  return (
    <div className="top-areas">
      <h3>Top Risk {dataSource === 'model' ? 'Zones' : 'Wards'}</h3>
      <p className="top-areas-context">
        Ranked by current risk · {selectForecast(null, timeFrame).months}-month outlook
      </p>
      {areas.length === 0 ? (
        <p className="top-areas-loading">Loading…</p>
      ) : (
        <ul>
          {areas.map((a) => {
            const forecast = selectForecast(a.prediction, timeFrame);
            return (
              <li key={a.id} className="top-area-item">
                <div className="top-area-header">
                  <span className="top-area-name">{a.name}</span>
                  <span className="top-area-score" style={{ color: riskColor(a.risk) }}>
                    {a.risk}
                  </span>
                </div>

                {a.drivers.length > 0 && (
                  <p className="top-area-drivers">{a.drivers.slice(0, 2).join(' · ')}</p>
                )}

                {forecast.value != null ? (
                  <p className="top-area-forecast">
                    {forecast.months}-month forecast: <strong>{forecast.value}</strong> incidents
                    {forecast.trend != null && (
                      <span className={`top-area-trend ${forecast.trend > 0 ? 'up' : forecast.trend < 0 ? 'down' : ''}`}>
                        {' '}({forecast.trend > 0 ? '+' : ''}{forecast.trend}%)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="top-area-forecast">{forecast.months}-month forecast unavailable</p>
                )}

                <button
                  className="top-area-ai-btn"
                  onClick={() => fetchAI(a.id, a.mode)}
                  disabled={!!loadingById[a.id]}
                >
                  {loadingById[a.id] ? 'Generating…' : 'AI Next Steps (6-month)'}
                </button>

                {aiById[a.id] && (
                  <div className="top-area-ai-text">{aiById[a.id]}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TopRiskAreas;
