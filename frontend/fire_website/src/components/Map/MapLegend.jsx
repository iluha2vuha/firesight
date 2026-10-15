import { useEffect, useState } from 'react';
import { scoreColor } from '../../utils/wards';

const BANDS = [
  { id:'high', label:'Higher', range:'75–100', score:75 },
  { id:'medium', label:'Medium', range:'40–74', score:40 },
  { id:'low', label:'Lower', range:'0–39', score:0 },
];

function WardBands({ timeFrame, onHighlightBand }) {
  const [hoveredBand, setHoveredBand] = useState(null);
  const [focusedBand, setFocusedBand] = useState(null);
  const activeBand = hoveredBand ?? focusedBand;

  useEffect(() => {
    onHighlightBand(activeBand);
    return () => onHighlightBand(null);
  }, [activeBand, onHighlightBand]);

  return <><strong>{timeFrame === 'Current' ? 'Current score' : 'Scenario score'}</strong>
      <div className="legend-bands">{BANDS.map((band) => <button
        key={band.id} type="button" className={activeBand === band.id ? 'active' : ''}
        aria-label={`Highlight ${band.label.toLowerCase()}-score wards (${band.range})`}
        onMouseEnter={() => setHoveredBand(band.id)} onMouseLeave={() => setHoveredBand(null)}
        onFocus={() => setFocusedBand(band.id)} onBlur={() => setFocusedBand(null)}
      ><i style={{background:scoreColor(band.score)}}/>{band.label}<small>{band.range}</small></button>)}</div>
    </>;
}

export default function MapLegend({ timeFrame, showWards, showPremises, showEvents, onHighlightBand }) {
  return <div className="map-legend" aria-label="Map legend">
    {showWards && <WardBands timeFrame={timeFrame} onHighlightBand={onHighlightBand}/>}
    {showEvents && <div className="events-legend"><i/>Event examples</div>}
    {showPremises && <div className="premises-legend"><i/>High-risk premises examples</div>}
  </div>;
}
