import { useEffect, useMemo, useState } from 'react';
import { GeoJSON } from 'react-leaflet';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TIMEFRAME_ADJUSTMENTS = {
  Current: 0,
  'In 6 months': 4,
  'In 1 year': 8,
  'In 1.5 years': 12
};

const getRiskColor = (riskFactor) => {
  if (riskFactor >= 75) return '#d73027';
  if (riskFactor >= 40) return '#fdae61';
  return '#1a9850';
};

const getRiskBand = (riskFactor) => {
  if (riskFactor >= 75) return 'high';
  if (riskFactor >= 40) return 'medium';
  return 'low';
};

const RiskLayer = ({ timeFrame = 'Current', hoveredRiskBand = null }) => {
  const [geoData, setGeoData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWards = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/strategic/wards.geojson`);
        if (!response.ok) {
          throw new Error('Failed to fetch ward data');
        }

        const payload = await response.json();
        if (!cancelled) {
          setGeoData(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading ward data:', err);
          setError('Could not load Glasgow ward data from the backend.');
        }
      }
    };

    fetchWards();

    return () => {
      cancelled = true;
    };
  }, []);

  const mapDataForTimeframe = useMemo(() => {
    if (!geoData) return null;

    const adjustment = TIMEFRAME_ADJUSTMENTS[timeFrame] ?? 0;

    return {
      ...geoData,
      features: (geoData.features ?? []).map((feature) => {
        const baseRisk = Number(feature.properties?.risk_score ?? 0);
        const trendPct = Number(feature.properties?.prediction?.trend_pct ?? 0);
        const trendAdjustment = Math.round((trendPct / 10) * (adjustment / 4));
        const adjustedRiskFactor = Math.max(
          0,
          Math.min(100, baseRisk + adjustment + trendAdjustment)
        );

        return {
          ...feature,
          properties: {
            ...feature.properties,
            adjustedRiskFactor
          }
        };
      })
    };
  }, [geoData, timeFrame]);

  const styleRegion = (feature) => {
    const riskFactor = feature.properties.adjustedRiskFactor;
    const band = getRiskBand(riskFactor);
    const isBandMatch = !hoveredRiskBand || hoveredRiskBand === band;

    return {
      fillColor: getRiskColor(riskFactor),
      weight: isBandMatch ? 2.6 : 1,
      opacity: isBandMatch ? 1 : 0.55,
      color: isBandMatch ? '#0f172a' : 'white',
      fillOpacity: isBandMatch ? 0.9 : 0.28
    };
  };

  const onEachFeature = (feature, layer) => {
    if (!feature.properties) return;

    const p = feature.properties;
    const timeframeRisk = p.adjustedRiskFactor;
    const drivers = Array.isArray(p.drivers) ? p.drivers : [];
    const prediction = p.prediction ?? {};
    const baseRisk = p.risk_score ?? timeframeRisk;
    const forecast6 = prediction.forecast_6mo ?? 'n/a';
    const trendPct = prediction.trend_pct ?? 'n/a';

    layer.bindPopup(`
      <div class="custom-popup" style="min-width: 220px;">
        <div class="popup-header">
          <h3>${p.ward_name ?? p.name ?? 'Unknown area'}</h3>
        </div>

        <div class="popup-score">
          <span class="popup-score-value" style="color: ${getRiskColor(timeframeRisk)}">
            ${timeframeRisk}
          </span>
          <span class="popup-score-label">/ 100 Risk Score</span>
        </div>
        <p class="popup-timeframe"><b>Time frame:</b> ${timeFrame}</p>
        <p class="popup-row"><b>Ward ID:</b> ${p.ward_id ?? 'n/a'}</p>
        <p class="popup-row"><b>Current Score:</b> ${baseRisk}/100</p>
        <p class="popup-row"><b>6-month forecast:</b> ${forecast6} incidents</p>
        <p class="popup-row"><b>Trend:</b> ${trendPct}%</p>

        <div class="popup-card">
          <p><b>Primary Drivers:</b><br/> ${drivers.join(', ') || 'Risk drivers unavailable.'}</p>
        </div>

        <div class="popup-card action">
          <p><b>System Recommendation:</b><br/> Prioritise prevention review and targeted community safety activity for this ward.</p>
        </div>
      </div>
    `);

    layer.on({
      mouseover: (event) => {
        const hoveredLayer = event.target;
        hoveredLayer.setStyle({ weight: 3, color: '#333', fillOpacity: 0.9 });
      },
      mouseout: (event) => {
        layer.options.style = styleRegion(feature);
        event.target.setStyle(layer.options.style);
      }
    });
  };

  return (
    <>
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1100,
            background: 'white',
            color: '#a50f15',
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          {error}
        </div>
      )}

      {mapDataForTimeframe && (
        <GeoJSON
          key={timeFrame}
          data={mapDataForTimeframe}
          style={styleRegion}
          onEachFeature={onEachFeature}
        />
      )}
    </>
  );
};

export default RiskLayer;
