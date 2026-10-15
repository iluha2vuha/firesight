const validPosition = (position) => Array.isArray(position) && position.length >= 2
  && Number.isFinite(position[0]) && Number.isFinite(position[1])
  && Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90;
const validRing = (ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(validPosition)
  && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
const validPolygon = (polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing);

export const validWardData = (data, source) => {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return false;
  const ids = new Set();
  return data.features.every((feature) => {
    const p = feature?.properties;
    const geometry = feature?.geometry;
    if (feature?.type !== 'Feature' || !p || typeof p.ward_id !== 'string' || !p.ward_id || ids.has(p.ward_id)
      || typeof p.ward_name !== 'string' || !p.ward_name
      || !Number.isFinite(p.risk_score) || p.risk_score < 0 || p.risk_score > 100
      || p.data_source !== source
      || (p.drivers != null && (!Array.isArray(p.drivers) || p.drivers.some((driver) => typeof driver !== 'string')))) return false;
    ids.add(p.ward_id);
    return geometry?.type === 'Polygon' ? validPolygon(geometry.coordinates)
      : geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)
        && geometry.coordinates.length > 0 && geometry.coordinates.every(validPolygon);
  });
};

export const validPremisesData = (data) => {
  if (!Array.isArray(data)) return false;
  const ids = new Set();
  return data.every((p) => {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id)
      || typeof p.name !== 'string' || !p.name || !validPosition([p.lng, p.lat])
      || !Number.isFinite(p.risk_score) || p.risk_score < 0 || p.risk_score > 100
      || ['premises_type', 'inspection_priority', 'recommended_intervention'].some((field) => p[field] != null && typeof p[field] !== 'string')) return false;
    ids.add(p.id);
    return true;
  });
};

export const guidanceParagraphs = (text) => typeof text === 'string'
  ? text.split(/\n+/).map((line) => line.replace(/^\s*(?:•\s*|[*–-]\s+)/, '').trim()).filter(Boolean) : [];
