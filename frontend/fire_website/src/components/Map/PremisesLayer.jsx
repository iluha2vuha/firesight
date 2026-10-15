import { Marker, Pane, Popup } from 'react-leaflet';
import L from 'leaflet';

const premisesIcon = L.divIcon({ className: 'premises-marker', html: '<span></span>', iconSize: [16,16], iconAnchor:[8,8] });
export default function PremisesLayer({ premises }) {
  return <Pane name="premisesMarkersPane" style={{zIndex:520}}>{premises.filter((p) => p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180).map((p) => <Marker key={p.id} position={[Number(p.lat),Number(p.lng)]} icon={premisesIcon} title={`Example: ${p.name}`}>
    <Popup maxHeight={230} autoPanPadding={[15, 60]}><div className="premises-popup"><span className="source-tag">ILLUSTRATIVE PREMISES</span><h3>{p.name}</h3><p>{p.premises_type}</p><dl><div><dt>Sample score</dt><dd>{p.risk_score} / 100</dd></div><div><dt>Example priority</dt><dd>{p.inspection_priority}</dd></div></dl><p>{p.recommended_intervention}</p><p className="small-copy">Authored example, not a verified building risk assessment or live inspection record.</p></div></Popup>
  </Marker>)}</Pane>;
}
