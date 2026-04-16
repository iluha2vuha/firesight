// src/components/Dashboard/TopRiskAreas.jsx
import { useEffect, useState } from 'react';
import './TopRiskAreas.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TopRiskAreas = ({ dataSource = 'mock' }) => {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        let items;
        if (dataSource === 'model') {
          const res = await fetch(`${BACKEND_URL}/api/zones/top?n=3`);
          const data = await res.json();
          items = data.map((z) => ({
            name: z.zonename || z.zoneid,
            risk: z.riskscore ?? 0,
          }));
        } else {
          const res = await fetch(`${BACKEND_URL}/api/strategic/wards`);
          const data = await res.json();
          items = data
            .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
            .slice(0, 3)
            .map((w) => ({ name: w.ward_name, risk: w.risk_score }));
        }
        setAreas(items);
      } catch {
        setAreas([]);
      }
    };

    fetchAreas();
  }, [dataSource]);

  return (
    <div className="top-areas">
      <h3>Top Risk Areas</h3>
      {areas.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#64748b' }}>Loading…</p>
      ) : (
        <ul>
          {areas.map((a) => (
            <li key={a.name}>
              <span>{a.name}</span>
              <span className="risk-score">{a.risk}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopRiskAreas;
