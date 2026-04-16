import { Marker, Pane, Popup } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TIMEFRAME_TO_MONTHS = {
  Current: 1,
  'In 6 months': 6,
  'In 1 year': 12,
  'In 1.5 years': 18
};

const futureBuildIcon = L.divIcon({
  className: 'future-build-marker-icon-root',
  html: `
    <div class="future-build-marker-badge" aria-hidden="true">
      <svg
        class="future-build-marker-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5Z"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10 21v-6h4v6"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

const isValidLatLng = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

const addMonths = (date, months) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

const FutureBuildingsLayer = ({ timeFrame = 'Current', focus = 'city-centre' }) => {
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchBuildings = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/future-buildings?focus=${encodeURIComponent(focus)}`
        );
        if (!response.ok) throw new Error('Failed to fetch future buildings');
        const payload = await response.json();
        if (!cancelled) setBuildings(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) setBuildings([]);
      }
    };

    fetchBuildings();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  const filtered = useMemo(() => {
    const months = TIMEFRAME_TO_MONTHS[timeFrame] ?? 1;
    const now = new Date();
    const end = addMonths(now, months);

    return buildings
      .filter((b) => isValidLatLng(Number(b.lat), Number(b.lng)))
      .filter((b) => {
        const opening = parseIsoDate(b.expected_opening_date);
        if (!opening) return false;
        return opening >= now && opening <= end;
      });
  }, [buildings, timeFrame]);

  return (
    <Pane name="futureBuildingsPane" style={{ zIndex: 510 }}>
      {filtered.map((b) => (
        <Marker
          key={b.id}
          position={[Number(b.lat), Number(b.lng)]}
          icon={futureBuildIcon}
          eventHandlers={{
            mouseover: (e) => e.target.openPopup(),
            click: (e) => e.target.openPopup()
          }}
        >
          <Popup offset={[0, -8]} closeButton={false}>
            <div className="event-popup">
              <div className="event-popup-header">
                <h3>{b.name ?? 'Future building'}</h3>
                <span className="event-risk-tag">{b.status ?? 'planned'}</span>
              </div>

              <div className="event-popup-grid">
                <p>
                  <span>Type</span>
                  <strong>{b.premises_type ?? 'n/a'}</strong>
                </p>
                <p>
                  <span>Expected opening</span>
                  <strong>
                    {b.expected_opening_date
                      ? new Date(b.expected_opening_date).toLocaleDateString()
                      : 'n/a'}
                  </strong>
                </p>
              </div>

              {b.notes && <p className="event-popup-note">{b.notes}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </Pane>
  );
};

export default FutureBuildingsLayer;

