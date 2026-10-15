import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import EventLayer from './EventLayer';
import MapLegend from './MapLegend';
import PremisesLayer from './PremisesLayer';
import RiskLayer from './RiskLayer';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          maxZoom={19}
          referrerPolicy="strict-origin-when-cross-origin"
        />

        <RiskLayer timeFrame={timeFrame} hoveredRiskBand={hoveredRiskBand} dataSource={dataSource} />
        {showPremises && <PremisesLayer focus="city-centre" riskBandFilter="high" />}
        <EventLayer timeFrame={timeFrame} />
      </MapContainer>
    </div>
  );
};

export default RiskMap;
