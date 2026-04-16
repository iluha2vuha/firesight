import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import EventLayer from './EventLayer';
import MapLegend from './MapLegend';
import FutureBuildingsLayer from './FutureBuildingsLayer';
import PremisesLayer from './PremisesLayer';
import RiskLayer from './RiskLayer';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const RiskMap = ({ timeFrame, dataSource = 'mock', nightMode = false }) => {
  const [hoveredRiskBand, setHoveredRiskBand] = useState(null);
  const [showPremises, setShowPremises] = useState(false);
  const [showFutureBuildings, setShowFutureBuildings] = useState(true);
  const glasgowCenter = [55.8642, -4.2518];

  return (
    <div className={`risk-map-container ${nightMode ? 'night-mode' : ''}`}>
      <MapLegend
        hoveredRiskBand={hoveredRiskBand}
        onRiskBandHover={setHoveredRiskBand}
      />

      <div className="map-controls">
        <div className="map-controls-stack">
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showFutureBuildings}
              onChange={(e) => setShowFutureBuildings(e.target.checked)}
            />
            <span>Show Future Builds</span>
          </label>

          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showPremises}
              onChange={(e) => setShowPremises(e.target.checked)}
            />
            <span>Show High-Risk Premises</span>
          </label>
        </div>
      </div>

      <MapContainer
        center={glasgowCenter}
        zoom={12}
        className="risk-map-container"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            nightMode
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          }
        />

        <RiskLayer timeFrame={timeFrame} hoveredRiskBand={hoveredRiskBand} dataSource={dataSource} />
        {showFutureBuildings && <FutureBuildingsLayer timeFrame={timeFrame} focus="city-centre" />}
        {showPremises && <PremisesLayer timeFrame={timeFrame} focus="city-centre" riskBandFilter="high" />}
        <EventLayer timeFrame={timeFrame} />
      </MapContainer>
    </div>
  );
};

export default RiskMap;
