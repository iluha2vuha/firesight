// src/components/Dashboard/TopRiskAreas.jsx
import './TopRiskAreas.css';

const TopRiskAreas = () => {
  const areas = [
    { name: 'Central District', risk: 92 },
    { name: 'Old Town', risk: 85 },
    { name: 'Riverside', risk: 78 },
  ];

  return (
    <div className="top-areas">
      <h3>Top Risk Areas</h3>
      <ul>
        {areas.map((a) => (
          <li key={a.name}>
            <span>{a.name}</span>
            <span className="risk-score">{a.risk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopRiskAreas;
