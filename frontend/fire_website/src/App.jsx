import './App.css';
import RiskMap from './components/Map/RiskMap';
import { useState } from 'react';

const TIME_FRAME_OPTIONS = [
  'Current',
  'In 6 months',
  'In 1 year',
  'In 1.5 years'
];

function App() {
  const [timeFrame, setTimeFrame] = useState(TIME_FRAME_OPTIONS[0]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.8 5.3 7 8.1 7 11.6a5 5 0 0010 0c0-3.4-1.7-6.3-5-9.6z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M12 8.2c-1.3 1.9-1.8 3.2-1.8 4.7a1.8 1.8 0 003.6 0c0-1.5-.5-2.8-1.8-4.7z"
                fill="#ffd3d3"
              />
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
