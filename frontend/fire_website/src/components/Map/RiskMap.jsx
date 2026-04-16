import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import EventLayer from './EventLayer';
import MapLegend from './MapLegend';
import RiskLayer from './RiskLayer';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const RiskMap = ({ timeFrame, dataSource = 'mock' }) => {
  const [hoveredRiskBand, setHoveredRiskBand] = useState(null);
  const glasgowCenter = [55.8642, -4.2518];

  return (
    <div className="risk-map-container">
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
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <RiskLayer timeFrame={timeFrame} hoveredRiskBand={hoveredRiskBand} dataSource={dataSource} />
        <EventLayer timeFrame={timeFrame} />
      </MapContainer>
    </div>
  );
};

export default RiskMap;
