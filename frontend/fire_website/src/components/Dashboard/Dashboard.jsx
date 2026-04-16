// src/components/Dashboard/Dashboard.jsx
import { useEffect, useState } from 'react';
import './Dashboard.css';
import TopRiskAreas from './TopRiskAreas';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const Dashboard = ({ dataSource = 'mock' }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setSummary({
        totalRegions: data.wards_loaded ?? 0,
        zonesLoaded: data.zones_loaded ?? 0,
      }))
      .catch((err) => console.error('Error fetching dashboard data:', err));
  }, []);

  return (
    <div className="dashboard">
      <h2>Fire Risk Dashboard</h2>
      {summary ? (
        <>
          <div className="dashboard-summary">
            <div className="summary-card">
              <h3>Wards</h3>
              <p>{summary.totalRegions}</p>
            </div>
            <div className="summary-card">
              <h3>DataZones</h3>
              <p>{summary.zonesLoaded}</p>
            </div>
          </div>

          <div className="dashboard-charts">
            <TopRiskAreas dataSource={dataSource} />
          </div>
        </>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
};

export default Dashboard;
