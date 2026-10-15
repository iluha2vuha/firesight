import { useEffect, useMemo, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import { selectForecast } from '../../utils/forecast';

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

const safeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const RiskLayer = ({ timeFrame = 'Current', hoveredRiskBand = null, dataSource = 'mock' }) => {
  const [geoData, setGeoData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setGeoData(null); // clear immediately so the old layer unmounts before new data arrives

    const fetchWards = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/strategic/wards.geojson?source=${dataSource}`
        );
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
  }, [dataSource]);

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
      weight: isBandMatch ? 1.8 : 1,
      opacity: isBandMatch ? 0.95 : 0.35,
      color: '#ffffff',
      fillOpacity: isBandMatch ? 0.42 : 0.12
    };
  };

  const onEachFeature = (feature, layer) => {
    if (!feature.properties) return;

    const p = feature.properties;
    const wardId = safeText(p.ward_id ?? p.id ?? '');
    const timeframeRisk = p.adjustedRiskFactor;
    const drivers = Array.isArray(p.drivers) ? p.drivers : [];
    const prediction = p.prediction ?? {};
    const baseRisk = p.risk_score ?? timeframeRisk;
    const forecast = selectForecast(prediction, timeFrame);
    const isModel = p.data_source === 'model';
    const modelComponents = p.model_components ?? null;

    const ciText = forecast.lower != null && forecast.upper != null
      ? ` <span class="popup-ci">(range ${forecast.lower}–${forecast.upper})</span>`
      : '';
    const trendHtml = forecast.trend != null
      ? `<p class="popup-row"><b>6-month trend:</b> ${forecast.trend}%</p>`
      : '';
    const forecastHtml = forecast.value != null
      ? `<p class="popup-row"><b>${forecast.months}-month forecast:</b> ${forecast.value} incidents${ciText}</p>${trendHtml}`
      : `<p class="popup-row popup-pending">⚠ ${forecast.months}-month forecast unavailable — incident data pending</p>`;

    const componentsBadge = isModel && modelComponents
      ? `<span class="popup-components-badge">${modelComponents}/5 data sources</span>`
      : '';

    const sourceBadge = `<span class="popup-source-badge popup-source-badge--${isModel ? 'model' : 'mock'}">${isModel ? 'Linear model' : 'Mock data'}</span>`;

    layer.bindPopup(`
      <div class="custom-popup" style="min-width: 220px;">
        <div class="popup-header">
          <h3>${p.ward_name ?? p.name ?? 'Unknown area'}</h3>
          ${sourceBadge}
          ${componentsBadge}
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
        ${forecastHtml}

        <div class="popup-card">
          <p><b>Primary Drivers:</b><br/> ${drivers.join(', ') || 'Risk drivers unavailable.'}</p>
        </div>

        <div class="popup-card action">
          <p><b>System Recommendation:</b><br/> Prioritise prevention review and targeted community safety activity for this ward.</p>
        </div>

        <div class="popup-ai">
          <div class="popup-ai-row">
            <button
              type="button"
              class="popup-ai-button"
              data-mode="ward"
              data-id="${wardId}"
            >
              AI Next Steps (6-month)
            </button>
            <span class="popup-ai-meta" data-ai-meta></span>
          </div>
          <div class="popup-ai-text" data-ai-text>
            Click for AI-powered prevention and capacity planning recommendations.
          </div>
        </div>
      </div>
    `);

    if (!layer.__aiExplainWired) {
      layer.__aiExplainWired = true;

      layer.on('popupopen', async (event) => {
        const popupEl = event.popup?.getElement?.();
        if (!popupEl) return;

        const btn = popupEl.querySelector('.popup-ai-button');
        const metaEl = popupEl.querySelector('[data-ai-meta]');
        const textEl = popupEl.querySelector('[data-ai-text]');
        if (!btn || !textEl) return;

        if (btn.dataset.wired === 'true') return;
        btn.dataset.wired = 'true';

        btn.addEventListener('click', async () => {
          const mode = btn.dataset.mode;
          const id = btn.dataset.id;
          if (!mode || !id) return;

          btn.disabled = true;
          btn.textContent = 'Generating…';
          if (metaEl) metaEl.textContent = '';
          textEl.textContent = 'Generating AI recommendations…';

          try {
            const response = await fetch(
              `${BACKEND_URL}/api/explain?mode=${encodeURIComponent(mode)}&id=${encodeURIComponent(id)}&source=${encodeURIComponent(dataSource)}`
            );
            if (!response.ok) throw new Error('Explain request failed');
            const payload = await response.json();

            const source = safeText(payload?.source || '');
            const text = safeText(payload?.text || 'No explanation returned.');
            if (metaEl) metaEl.textContent = source ? `Source: ${source}` : '';
            textEl.textContent = text;
          } catch {
            textEl.textContent =
              'Could not load the AI overview right now. Please try again.';
          } finally {
            btn.disabled = false;
            btn.textContent = 'AI Next Steps (6-month)';
          }
        });
      });
    }

    layer.on({
      mouseover: (event) => {
        const hoveredLayer = event.target;
        hoveredLayer.setStyle({
          weight: 2.6,
          color: '#ffffff',
          opacity: 1,
          fillOpacity: 0.52
        });
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
          key={`${timeFrame}-${dataSource}`}
          data={mapDataForTimeframe}
          style={styleRegion}
          onEachFeature={onEachFeature}
        />
      )}
    </>
  );
};

export default RiskLayer;
