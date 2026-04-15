import { MapContainer, TileLayer } from 'react-leaflet';
import RiskLayer from './RiskLayer';
import MapLegend from './MapLegend';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const RiskMap = ({ timeFrame }) => {
  const [hoveredRiskBand, setHoveredRiskBand] = useState(null);

  // Glasgow Coordinates: Latitude, Longitude
  const glasgowCenter = [55.8642, -4.2518];

  return (
    <div className="risk-map-container">
      {/* Our custom legend sits above the map */}
      <MapLegend
        hoveredRiskBand={hoveredRiskBand}
        onRiskBandHover={setHoveredRiskBand}
      />

      <MapContainer 
        center={glasgowCenter} 
        zoom={13} 
        className="risk-map-container"
        zoomControl={false} // Optional: Hides default zoom controls if you want to build custom ones in MapControls.jsx
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
          // Note: Using CartoDB basemap for a cleaner, professional look compared to default OSM
        />
        
        {/* Render our polygons on top of the tile layer */}
        <RiskLayer timeFrame={timeFrame} hoveredRiskBand={hoveredRiskBand} />

      </MapContainer>
    </div>
  );
};

export default RiskMap;