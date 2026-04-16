import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import EventLayer from './EventLayer';
import MapLegend from './MapLegend';
import PremisesLayer from './PremisesLayer';
import RiskLayer from './RiskLayer';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const RiskMap = ({
  timeFrame,
  dataSource = 'mock',
  nightMode = false,
  showPremises = true,
}) => {
  const [hoveredRiskBand, setHoveredRiskBand] = useState(null);
  const glasgowCenter = [55.8642, -4.2518];

  return (
    <div className={`risk-map-container ${nightMode ? 'night-mode' : ''}`}>
      <MapLegend
        hoveredRiskBand={hoveredRiskBand}
        onRiskBandHover={setHoveredRiskBand}
      />

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
        {showPremises && <PremisesLayer timeFrame={timeFrame} focus="city-centre" riskBandFilter="high" />}
        <EventLayer timeFrame={timeFrame} />
      </MapContainer>
    </div>
  );
};

export default RiskMap;
