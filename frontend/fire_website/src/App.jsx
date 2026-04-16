import { useState } from 'react';
import './App.css';
import RiskMap from './components/Map/RiskMap';

const TIME_FRAME_OPTIONS = ['Current', 'In 6 months', 'In 1 year', 'In 1.5 years'];

function App() {
  const [timeFrame, setTimeFrame] = useState(TIME_FRAME_OPTIONS[0]);

  return (
    <div className="app-container">
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
        <span className="app-header-badge">Live forecast</span>
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
                {option}
              </option>
            ))}
          </select>
        </div>

        <RiskMap timeFrame={timeFrame} />
      </main>
    </div>
  );
}

export default App;
