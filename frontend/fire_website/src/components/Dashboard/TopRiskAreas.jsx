// src/components/Dashboard/TopRiskAreas.jsx
import { useEffect, useState } from 'react';
import { selectForecast } from '../../utils/forecast';
import './TopRiskAreas.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TopRiskAreas = ({ dataSource = 'mock', timeFrame = 'Current', refreshKey = 0 }) => {
  const [areas, setAreas]         = useState([]);
  const [aiById, setAiById]       = useState({});
  const [loadingById, setLoadingById] = useState({});
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const fetchAreas = async () => {
      setStatus('loading');
      setAreas([]);
      setAiById({});
      setLoadingById({});
      try {
        if (dataSource === 'model') {
          const res  = await fetch(`${BACKEND_URL}/api/zones/top?n=5`, { signal: controller.signal });
          if (!res.ok) throw new Error('Could not load rankings');
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error('Invalid rankings response');
          if (cancelled) return;
          setAreas(data.map((z) => ({
            id:       z.zoneid,
            mode:     'zone',
            name:     `Data zone ${z.zoneid}`,
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
          const res  = await fetch(`${BACKEND_URL}/api/strategic/wards`, { signal: controller.signal });
          if (!res.ok) throw new Error('Could not load rankings');
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error('Invalid rankings response');
          if (cancelled) return;
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
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) {
          setAreas([]);
          setStatus('error');
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [dataSource, attempt, refreshKey]);

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
      {status === 'loading' ? (
        <p className="top-areas-loading" role="status">Loading…</p>
      ) : status === 'error' ? (
        <div role="alert">
          <p className="top-areas-loading">Could not load risk rankings. Check that the backend is running.</p>
          <button className="top-area-ai-btn" onClick={() => setAttempt((value) => value + 1)}>
            Retry rankings
          </button>
        </div>
      ) : areas.length === 0 ? (
        <p className="top-areas-loading" role="status">No risk areas available.</p>
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
