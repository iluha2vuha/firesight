// src/components/Dashboard/Dashboard.jsx
import { useEffect, useState } from 'react';
import './Dashboard.css';
import RiskTrends from './RiskTrends';
import TopRiskAreas from './TopRiskAreas';
import ActionRecommendations from './ActionRecommendations';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const apiUrl = '[localhost](http://localhost:5000/api/fire-risk-summary)';
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error('Error fetching dashboard data:', err));
  }, []);

  return (
    <div className="dashboard">
      <h2>Fire Risk Dashboard</h2>
      {summary ? (
        <>
          <div className="dashboard-summary">
            <div className="summary-card">
              <h3>Total Regions</h3>
              <p>{summary.totalRegions}</p>
            </div>
            <div className="summary-card high">
              <h3>High Risk Areas</h3>
              <p>{summary.highRiskAreas}</p>
            </div>
            <div className="summary-card medium">
              <h3>Medium Risk Areas</h3>
              <p>{summary.mediumRiskAreas}</p>
            </div>
            <div className="summary-card low">
              <h3>Low Risk Areas</h3>
              <p>{summary.lowRiskAreas}</p>
            </div>
          </div>

          <div className="dashboard-charts">
            <RiskTrends />
            <TopRiskAreas />
          </div>

          <ActionRecommendations actions={summary.recommendedActions} />
        </>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
};

export default Dashboard;
