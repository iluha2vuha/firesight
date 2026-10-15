import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import PremisesLayer from './PremisesLayer';
import RiskLayer from './RiskLayer';
import MapLegend from './MapLegend';
import Icon from '../Planning/Icon';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const GLASGOW_BOUNDS = [[55.765, -4.43], [55.928, -4.065]];

function MapTools({ features, selectedId }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const ward = features.find((f) => f.properties.ward_id === selectedId);
    if (ward) map.fitBounds(L.geoJSON(ward).getBounds(), { padding: [55, 55], maxZoom: 13, animate: false });
  }, [map, selectedId, features]);
  return <div className="map-tools"><button aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}><Icon name="plus"/></button><button aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}><Icon name="minus"/></button><button aria-label="Show all Glasgow wards" title="Show all Glasgow wards" onClick={() => map.fitBounds(GLASGOW_BOUNDS, { padding: [15, 15], animate: false })}><Icon name="crosshair"/></button></div>;
}

export default function RiskMap({ features, timeFrame, nightMode, showWards, showPremises, premises, selectedId, onSelect }) {
  return <div className={`risk-map-container${nightMode ? ' night-mode' : ''}`}>
    <MapContainer bounds={GLASGOW_BOUNDS} className="leaflet-map" zoomControl={false}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={19} referrerPolicy="strict-origin-when-cross-origin"/>
      {showWards && <RiskLayer features={features} timeFrame={timeFrame} selectedId={selectedId} onSelect={onSelect}/>}
      {showPremises && <PremisesLayer premises={premises}/>}
      <MapTools features={features} selectedId={selectedId}/>
    </MapContainer>
    {(showWards || showPremises) && <MapLegend timeFrame={timeFrame} showWards={showWards} showPremises={showPremises}/>}
  </div>;
}
