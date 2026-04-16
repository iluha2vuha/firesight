import { Marker, Pane, Popup } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';

const DEFAULT_EVENTS_API_URL = 'http://localhost:5000/api/events';

/** Only show “big” events (major crowd / demand signal). */
const MIN_ATTENDANCE = 1000;

const eventAlertIcon = L.divIcon({
  className: 'event-marker-icon-root',
  html: `
    <div class="event-marker-badge" aria-hidden="true">
      <span class="event-marker-excl">!</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -22]
});

const FALLBACK_EVENTS = [
  {
    id: 'evt-1',
    name: 'Glasgow City Marathon Expo',
    location: 'SEC Glasgow',
    date: '2026-04-28',
    estimatedAttendance: 11000,
    lat: 55.8591,
    lng: -4.2887
  },
  {
    id: 'evt-2',
    name: 'Summer Riverside Festival',
    location: 'Glasgow Green',
    date: '2026-07-12',
    estimatedAttendance: 18000,
    lat: 55.8517,
    lng: -4.2369
  },
  {
    id: 'evt-3',
    name: 'Innovation and Tech Summit',
    location: 'Scottish Event Campus',
    date: '2026-10-06',
    estimatedAttendance: 7000,
    lat: 55.8598,
    lng: -4.288
  },
  {
    id: 'evt-4',
    name: 'Winter Market Launch',
    location: 'George Square',
    date: '2026-12-02',
    estimatedAttendance: 9500,
    lat: 55.8612,
    lng: -4.2518
  }
];

const TIMEFRAME_TO_MONTHS = {
  Current: 1,
  'In 6 months': 6,
  'In 1 year': 12,
  'In 1.5 years': 18
};

const addMonths = (date, months) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

const normalizeEvent = (event, idx) => {
  const lat = Number(event.lat ?? event.latitude ?? event.coordinates?.lat);
  const lng = Number(event.lng ?? event.longitude ?? event.coordinates?.lng);
  const date = event.date ?? event.eventDate ?? event.startDate;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !date) {
    return null;
  }

  return {
    id: event.id ?? `event-${idx}`,
    name: event.name ?? event.title ?? 'Unnamed event',
    location: event.location ?? event.venue ?? 'Location pending',
    date,
    estimatedAttendance: Number(
      event.estimatedAttendance ?? event.attendance ?? event.expectedAttendance ?? 0
    ),
    lat,
    lng
  };
};

const EventLayer = ({ timeFrame }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const response = await fetch(
          import.meta.env.VITE_EVENTS_API_URL || DEFAULT_EVENTS_API_URL
        );
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const payload = await response.json();
        const rawEvents = Array.isArray(payload) ? payload : payload.events ?? [];
        const parsedEvents = rawEvents
          .map((event, idx) => normalizeEvent(event, idx))
          .filter(Boolean)
          .filter((e) => e.estimatedAttendance > MIN_ATTENDANCE);

        if (!cancelled) {
          setEvents(
            parsedEvents.length > 0 ? parsedEvents : FALLBACK_EVENTS.filter((e) => e.estimatedAttendance > MIN_ATTENDANCE)
          );
        }
      } catch {
        if (!cancelled) {
          setEvents(FALLBACK_EVENTS.filter((e) => e.estimatedAttendance > MIN_ATTENDANCE));
        }
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const months = TIMEFRAME_TO_MONTHS[timeFrame] ?? 1;
    const now = new Date();
    const endDate = addMonths(now, months);

    return events.filter((event) => {
      if (event.estimatedAttendance <= MIN_ATTENDANCE) return false;
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= endDate;
    });
  }, [events, timeFrame]);

  return (
    <Pane name="eventMarkersPane" style={{ zIndex: 550 }}>
      {filteredEvents.map((event) => (
        <Marker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={eventAlertIcon}
          eventHandlers={{
            mouseover: (e) => {
              e.target.openPopup();
            },
            click: (e) => {
              e.target.openPopup();
            }
          }}
        >
          <Popup offset={[0, -8]} closeButton={false}>
            <div className="event-popup">
              <div className="event-popup-header">
                <h3>{event.name}</h3>
                <span className="event-risk-tag">Higher fire risk</span>
              </div>

              <div className="event-popup-grid">
                <p>
                  <span>Location</span>
                  <strong>{event.location}</strong>
                </p>
                <p>
                  <span>Date</span>
                  <strong>{new Date(event.date).toLocaleDateString()}</strong>
                </p>
                <p>
                  <span>Estimated Attendance</span>
                  <strong>{event.estimatedAttendance.toLocaleString()}</strong>
                </p>
              </div>

              <p className="event-popup-note">
                Event demand may increase fire risk for this area in the selected timeframe.
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </Pane>
  );
};

export default EventLayer;
