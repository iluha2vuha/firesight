import { useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import PremisesLayer from './PremisesLayer';
import EventLayer from './EventLayer';
import RiskLayer from './RiskLayer';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Approximate navigation extent; ward-data coverage remains Glasgow.
const SCOTLAND_BOUNDS = [[54.5, -8.8], [61.1, -0.4]];
const GLASGOW_BOUNDS = [[55.765, -4.43], [55.928, -4.065]];

function MapViewport({ features, panelOpen, dockHeight, overviewRequest }) {
  const map = useMap();
  const viewOptions = useCallback(() => {
    const wide = window.matchMedia('(min-width:801px)').matches;
    const sidebarWidth = window.matchMedia('(min-width:1650px)').matches ? 390 : 350;
    return {
      paddingTopLeft:[panelOpen && wide ? sidebarWidth + 48 : 24, dockHeight + 36],
      paddingBottomRight:[24, 40], animate:false,
    };
  }, [panelOpen, dockHeight]);
  const fitView = useCallback(() => {
    const collection = { type:'FeatureCollection', features };
    const bounds = features.length ? L.geoJSON(collection).getBounds() : L.latLngBounds(GLASGOW_BOUNDS);
    map.fitBounds(bounds, { ...viewOptions(), maxZoom:11 });
  }, [map, features, viewOptions]);

  useEffect(() => {
    const resize = () => {
      map.invalidateSize();
      map.setMinZoom(Math.max(5, map.getBoundsZoom(SCOTLAND_BOUNDS)));
      fitView();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, fitView]);

  useEffect(() => { fitView(); }, [fitView, overviewRequest]);

  return null;
}

export default function RiskMap({ overviewRequest, panelOpen, dockHeight, features, timeFrame, nightMode, showWards, showPremises, showEvents, premises, selectedId, onSelect, highlightedBand }) {
  return <div className={`risk-map-container${nightMode ? ' night-mode' : ''}`}>
    <MapContainer bounds={GLASGOW_BOUNDS} className="leaflet-map" zoomControl={false} maxBounds={SCOTLAND_BOUNDS} maxBoundsViscosity={1} minZoom={5}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={19} noWrap referrerPolicy="strict-origin-when-cross-origin"/>
      {showWards && <RiskLayer features={features} timeFrame={timeFrame} selectedId={selectedId} onSelect={onSelect} highlightedBand={highlightedBand}/>}
      {showPremises && <PremisesLayer premises={premises} dockHeight={dockHeight}/>}
      {showEvents && <EventLayer dockHeight={dockHeight}/>}
      <MapViewport features={features} panelOpen={panelOpen} dockHeight={dockHeight} overviewRequest={overviewRequest}/>
    </MapContainer>
  </div>;
}
