import { scoreColor } from '../../utils/wards';

export default function MapLegend({ timeFrame, showWards, showPremises, showEvents }) {
  return <div className="map-legend" aria-label="Map legend">
    {showWards && <><strong>{timeFrame === 'Current' ? 'Current score' : 'Scenario score'}</strong>
      <div className="legend-bands"><span><i style={{background:scoreColor(75)}}/>Higher <small>75–100</small></span><span><i style={{background:scoreColor(40)}}/>Medium <small>40–74</small></span><span><i style={{background:scoreColor(0)}}/>Lower <small>0–39</small></span></div>
    </>}
    {showEvents && <div className="events-legend"><i/>Event examples</div>}
    {showPremises && <div className="premises-legend"><i/>High-risk premises examples</div>}
  </div>;
}
