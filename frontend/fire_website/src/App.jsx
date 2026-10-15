import { useEffect, useState } from 'react';
import './App.css';
import RiskMap from './components/Map/RiskMap';
import TopRiskAreas from './components/Dashboard/TopRiskAreas';
import { timeframeLabel } from './utils/forecast';

const TIME_FRAME_OPTIONS = ['Current', 'In 6 months', 'In 1 year', 'In 1.5 years'];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [timeFrame, setTimeFrame] = useState(TIME_FRAME_OPTIONS[0]);
  const [dataSource, setDataSource] = useState('mock');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [backendStatus, setBackendStatus] = useState('loading');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [showPremises, setShowPremises] = useState(true);
  const [nightMode, setNightMode] = useState(() => {
    try {
      const stored = window.localStorage.getItem('fireSightNightMode');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const checkStatus = async () => {
      setBackendStatus('loading');
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`, { signal: controller.signal });
        if (!response.ok) throw new Error('Backend unavailable');
        const data = await response.json();
        if (cancelled) return;
        setModelLoaded(data.model_loaded === true);
        setBackendStatus('ready');
      } catch {
        if (!cancelled) {
          setModelLoaded(false);
          setBackendStatus('error');
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [statusAttempt]);

  return (
    <div className={`app-container${nightMode ? ' night-mode' : ''}`}>
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12.4 2.2c-.4 2.1-1.8 3.4-3.1 4.7-1.8 1.8-3.6 3.7-3.6 6.8 0 3.3 2.6 6.1 6.3 6.1 3.8 0 6.3-2.8 6.3-6.2 0-4.2-2.8-7.6-5.9-11.4z"
                fill="url(#flameOuter)"
              />
              <path
                d="M12.2 8.1c-1 1.3-2.2 2.4-2.2 4.4 0 1.7 1.3 3.1 3.1 3.1 1.8 0 3.1-1.4 3.1-3.2 0-1.8-1.1-3.1-2.8-4.3-.4-.3-.8-.6-1.2-1z"
                fill="url(#flameInner)"
              />
              <path d="M16.8 4.2l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" fill="#fde68a" />
              <defs>
                <linearGradient id="flameOuter" x1="12" y1="2.2" x2="12" y2="19.8" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff7ed" />
                  <stop offset="0.5" stopColor="#fdba74" />
                  <stop offset="1" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="flameInner" x1="13.1" y1="8.1" x2="13.1" y2="15.6" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fef3c7" />
                  <stop offset="1" stopColor="#fb923c" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="app-header-text">
            <h1>FireSight: Glasgow Risk Predictor</h1>
            <p>Operational risk view for Glasgow regions</p>
          </div>
        </div>

        <div className="app-header-controls">
          <label className="header-toggle" title="Switch map to dark style">
            <input
              type="checkbox"
              checked={nightMode}
              onChange={(e) => {
                const next = e.target.checked;
                setNightMode(next);
                try {
                  window.localStorage.setItem('fireSightNightMode', String(next));
                } catch {
                  // ignore
                }
              }}
            />
            <span>Night mode</span>
          </label>

          <div className="data-source-toggle">
            <span className="data-source-label">Data source</span>
            <div className="data-source-buttons">
              <button
                className={`ds-btn ${dataSource === 'mock' ? 'ds-btn--active' : ''}`}
                onClick={() => setDataSource('mock')}
              >
                Mock
              </button>
              <button
                className={`ds-btn ${dataSource === 'model' ? 'ds-btn--active' : ''}`}
                onClick={() => setDataSource('model')}
                disabled={!modelLoaded}
                title={backendStatus === 'error' ? 'Backend unavailable — retry the connection' : backendStatus === 'loading' ? 'Checking model availability' : !modelLoaded ? 'Run the data pipeline first' : 'Switch to model output'}
              >
                Model
              </button>
            </div>
          </div>
          {backendStatus === 'error' && (
            <button className="ds-btn" onClick={() => setStatusAttempt((value) => value + 1)}>
              Retry connection
            </button>
          )}
          <span className="app-header-badge">
            {dataSource === 'model' ? 'Linear model' : 'Mock data'}
          </span>
        </div>
      </header>

      <main className="app-main">
        <div className="timeframe-control">
          <label htmlFor="timeframe-select">Time frame</label>
          <select
            id="timeframe-select"
            value={timeFrame}
            onChange={(event) => setTimeFrame(event.target.value)}
          >
            {TIME_FRAME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {timeframeLabel(option, dataSource)}
              </option>
            ))}
          </select>

          <div className="layer-toggles">
            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={showPremises}
                onChange={(e) => setShowPremises(e.target.checked)}
              />
              <span>High-risk premises</span>
            </label>
          </div>
        </div>

        <RiskMap
          key={statusAttempt}
          timeFrame={timeFrame}
          dataSource={dataSource}
          nightMode={nightMode}
          showPremises={showPremises}
        />

        <div className={`top-risk-panel${nightMode ? ' night-mode' : ''}`}>
          <TopRiskAreas dataSource={dataSource} timeFrame={timeFrame} refreshKey={statusAttempt} />
        </div>
      </main>
    </div>
  );
}

export default App;
