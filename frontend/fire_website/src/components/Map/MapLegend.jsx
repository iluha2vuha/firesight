import './Map.css';

const MapLegend = () => {
  return (
    <div className="map-legend">
      <h4>Risk Factor (Demand)</h4>
      <p className="legend-subtitle">
        Showing aggregated risk by area.
      </p>
      
      <div className="legend-item">
        <div className="color-box risk-high"></div>
        <span>High Risk (75 - 100)</span>
      </div>
      <div className="legend-item">
        <div className="color-box risk-medium"></div>
        <span>Medium Risk (40 - 74)</span>
      </div>
      <div className="legend-item">
        <div className="color-box risk-low"></div>
        <span>Low Risk (0 - 39)</span>
      </div>
    </div>
  );
};

export default MapLegend;