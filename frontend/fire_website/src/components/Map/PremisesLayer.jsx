import { Marker, Pane, Popup } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { timeframeMonths } from '../../utils/forecast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';


const premisesIcon = L.divIcon({
  className: 'premises-marker-icon-root',
  html: `<div class="premises-marker-dot" aria-hidden="true"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10]
});

const parsePressureMonths = (futurePressure) => {
  const timeframe = futurePressure?.timeframe;
  if (!timeframe || typeof timeframe !== 'string') return null;
  const match = timeframe.match(/(\d+)\s*month/i);
  if (match) return Number(match[1]);
  const yearMatch = timeframe.match(/(\d+)\s*year/i);
  if (yearMatch) return Number(yearMatch[1]) * 12;
  return null;
};

const isValidLatLng = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const PremisesLayer = ({ timeFrame = 'Current', dataSource = 'mock', focus = 'city-centre', riskBandFilter = 'high' }) => {
  const [premises, setPremises] = useState([]);
  const [aiById, setAiById] = useState({});
  const [aiLoadingById, setAiLoadingById] = useState({});

  useEffect(() => {
    let cancelled = false;

    const fetchPremises = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/premises?focus=${encodeURIComponent(focus)}`
        );
        if (!response.ok) throw new Error('Failed to fetch premises');
        const payload = await response.json();
        if (!cancelled) setPremises(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) setPremises([]);
      }
    };

    fetchPremises();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  const filteredPremises = useMemo(() => {
    const months = timeframeMonths(timeFrame, dataSource);

    return premises
      .filter((p) => isValidLatLng(Number(p.lat), Number(p.lng)))
      .filter((p) => {
        if (!riskBandFilter) return true;
        return String(p.risk_band ?? '').toLowerCase() === String(riskBandFilter).toLowerCase();
      })
      .filter((p) => {
        const pressureMonths = parsePressureMonths(p.future_pressure);
        if (!pressureMonths) return true;
        return pressureMonths <= months;
      });
  }, [premises, riskBandFilter, timeFrame, dataSource]);

  const explainPremises = async (premisesId) => {
    if (!premisesId) return;

    setAiLoadingById((prev) => ({ ...prev, [premisesId]: true }));
    setAiById((prev) => ({
      ...prev,
      [premisesId]: {
        ...(prev[premisesId] ?? {}),
        error: null
      }
    }));

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/explain?mode=premises&id=${encodeURIComponent(premisesId)}`
      );
      if (!response.ok) throw new Error('Explain request failed');
      const payload = await response.json();
      setAiById((prev) => ({
        ...prev,
        [premisesId]: {
          source: payload?.source ?? '',
          text: payload?.text ?? ''
        }
      }));
    } catch {
      setAiById((prev) => ({
        ...prev,
        [premisesId]: {
          source: '',
          text: '',
          error: 'Could not load the AI overview right now. Please try again.'
        }
      }));
    } finally {
      setAiLoadingById((prev) => ({ ...prev, [premisesId]: false }));
    }
  };

  return (
    <Pane name="premisesMarkersPane" style={{ zIndex: 520 }}>
      {filteredPremises.map((p) => (
        <Marker
          key={p.id}
          position={[Number(p.lat), Number(p.lng)]}
          icon={premisesIcon}
          eventHandlers={{
            mouseover: (e) => e.target.openPopup(),
            click: (e) => e.target.openPopup()
          }}
        >
          <Popup offset={[0, -8]} closeButton={false}>
            <div className="event-popup">
              <div className="event-popup-header">
                <h3>{p.name ?? 'Premises'}</h3>
                <span className="event-risk-tag">{p.inspection_priority ?? 'Priority'}</span>
              </div>

              <div className="event-popup-grid">
                <p>
                  <span>Type</span>
                  <strong>{p.premises_type ?? 'n/a'}</strong>
                </p>
                <p>
                  <span>Risk score</span>
                  <strong>{p.risk_score ?? 'n/a'}</strong>
                </p>
                <p>
                  <span>Primary risk</span>
                  <strong>{p.primary_risk_type ?? 'n/a'}</strong>
                </p>
              </div>

              {Array.isArray(p.drivers) && p.drivers.length > 0 && (
                <p className="event-popup-note">
                  <strong>Drivers:</strong> {p.drivers.join(', ')}
                </p>
              )}

              {p.recommended_intervention && (
                <p className="event-popup-note">
                  <strong>Recommended:</strong> {p.recommended_intervention}
                </p>
              )}

              <div className="popup-ai">
                <div className="popup-ai-row">
                  <button
                    type="button"
                    className="popup-ai-button"
                    onClick={() => explainPremises(p.id)}
                    disabled={!!aiLoadingById[p.id]}
                  >
                    {aiLoadingById[p.id] ? 'Generating…' : 'AI Actionable Next Steps'}
                  </button>
                  <span className="popup-ai-meta">
                    {aiById[p.id]?.source ? `Source: ${aiById[p.id].source}` : ''}
                  </span>
                </div>

                <div className="popup-ai-text">
                  {aiById[p.id]?.error
                    ? aiById[p.id].error
                    : aiById[p.id]?.text
                      ? aiById[p.id].text
                      : 'Click for AI-powered protection and capacity planning recommendations.'}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </Pane>
  );
};

export default PremisesLayer;

