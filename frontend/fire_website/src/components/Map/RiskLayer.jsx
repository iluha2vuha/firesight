import { GeoJSON } from 'react-leaflet';
import { displayedScore, scoreColor } from '../../utils/wards';

export default function RiskLayer({ features, timeFrame, selectedId, onSelect }) {
  return <GeoJSON
    key={`${timeFrame}-${features.map((f) => `${f.properties.ward_id}:${f.properties.risk_score}`).join(',')}`}
    data={{ type: 'FeatureCollection', features }}
    style={(feature) => {
      const selected = feature.properties.ward_id === selectedId;
      return { fillColor: scoreColor(displayedScore(feature, timeFrame)), fillOpacity: selected ? 0.6 : 0.23, color: selected ? '#e2f4ef' : '#a2acb5', weight: selected ? 2.5 : 1, opacity: selected ? 1 : 0.65 };
    }}
    onEachFeature={(feature, layer) => {
      layer.bindTooltip(feature.properties.ward_name, { sticky: true, className: 'ward-tooltip' });
      layer.on('click', () => onSelect(feature.properties.ward_id));
      layer.on('add', () => {
        const element = layer.getElement();
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `Select ${feature.properties.ward_name} ward`);
        element.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(feature.properties.ward_id);
          }
        });
      });
    }}
  />;
}
