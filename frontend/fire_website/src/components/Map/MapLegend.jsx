import './Map.css';

const MapLegend = () => {
  return (
    <div className="map-legend">
      <h4>Risk Factor (Demand)</h4>
      <p style={{fontSize: '11px', margin: '0 0 10px 0', color: '#666'}}>
        Showing aggregated risk by area.
      </p>
      
      <div className="legend-item">
        <div className="color-box" style={{ backgroundColor: '#d73027' }}></div>
        <span>High Risk (75 - 100)</span>
      </div>
      <div className="legend-item">
        <div className="color-box" style={{ backgroundColor: '#fdae61' }}></div>
        <span>Medium Risk (40 - 74)</span>
      </div>
      <div className="legend-item">
        <div className="color-box" style={{ backgroundColor: '#1a9850' }}></div>
        <span>Low Risk (0 - 39)</span>
      </div>
    </div>
  );
};

export default MapLegend;