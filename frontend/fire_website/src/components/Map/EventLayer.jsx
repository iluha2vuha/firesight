import { Marker, Pane, Popup } from 'react-leaflet';
import L from 'leaflet';

// Original hackathon examples. These are not a calendar of scheduled events.
const EXAMPLE_EVENTS = [
  { id:'evt-1', name:'Glasgow City Marathon Expo', location:'SEC Glasgow', date:'2026-04-28', attendance:11000, lat:55.8591, lng:-4.2887 },
  { id:'evt-2', name:'Summer Riverside Festival', location:'Glasgow Green', date:'2026-07-12', attendance:18000, lat:55.8517, lng:-4.2369 },
  { id:'evt-3', name:'Innovation and Tech Summit', location:'Scottish Event Campus', date:'2026-10-06', attendance:7000, lat:55.8598, lng:-4.288 },
  { id:'evt-4', name:'Winter Market Launch', location:'George Square', date:'2026-12-02', attendance:9500, lat:55.8612, lng:-4.2518 },
];
const icon = L.divIcon({ className:'example-event-marker', html:'<span></span>', iconSize:[16,16], iconAnchor:[8,8] });
const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }).format(new Date(`${value}T12:00:00Z`));

export default function EventLayer({ dockHeight }) {
  return <Pane name="eventMarkersPane" style={{zIndex:530}}>
    {EXAMPLE_EVENTS.map((event) => <Marker key={event.id} position={[event.lat,event.lng]} icon={icon} title={`Event example: ${event.name}`}>
      <Popup maxHeight={190} autoPanPaddingTopLeft={[16,dockHeight + 44]} autoPanPaddingBottomRight={[16,80]}>
        <div className="premises-popup">
          <span className="source-tag">Sample event</span>
          <h3>{event.name}</h3>
          <p>{event.location}</p>
          <dl><div><dt>Demo date</dt><dd>{formatDate(event.date)}</dd></div><div><dt>Example attendance</dt><dd>{event.attendance.toLocaleString('en-GB')}</dd></div></dl>
          <p className="small-copy">Archived hackathon example, not a verified scheduled event. These markers are independent of the ward timeframe and do not change model scores.</p>
        </div>
      </Popup>
    </Marker>)}
  </Pane>;
}
