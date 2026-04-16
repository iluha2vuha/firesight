# FireSight Backend

This backend provides the demo API for FireSight. It intentionally focuses on
our backend-owned app flow only:

```text
1. Strategic ward-level overview across Glasgow
2. City Centre high-risk premises overlay
3. Human-readable explanations for selected wards or premises
```

The backend does not depend on Yehor's `data-pipeline/` output for the current
app flow. Yehor's files can stay in the repo, but this API is built from
backend-owned data files.

## Data Files

Strategic ward map:

```text
backend/data/glasgow_wards.geojson
```

This contains 23 official Glasgow ward polygons. The frontend uses the
`geometry` field to draw ward shapes and the `properties` field for scores,
drivers, and forecast-style fields.

City Centre premises overlay:

```text
backend/data/city_centre_premises.json
```

This contains prototype high-risk premises markers focused on Glasgow City
Centre, especially:

```text
Anderston/City/Yorkhill
Calton
Merchant City
George Square
Cowcaddens
Garnethill
Saltmarket
```

The premises layer demonstrates how the app could expand from area-level
planning into building-level prevention and inspection prioritisation.

## Running Locally

From the backend directory:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

Interactive FastAPI docs:

```text
http://127.0.0.1:8000/docs
```

## Frontend Contract

React should use these endpoints:

```text
GET http://localhost:8000/api/strategic/wards.geojson
GET http://localhost:8000/api/premises?focus=city-centre
GET http://localhost:8000/api/explain?mode=premises&id=P001
```

Suggested UI:

```text
Base layer: 23 ward polygons
Toggle: Show High-Risk Premises
Overlay: City Centre premises markers
Popup: score, premises type, inspection priority, drivers, recommended intervention
AI button: Explain this risk
```

## Endpoints

### `GET /api/health`

Returns backend status and loaded dataset counts.

Example:

```json
{
  "status": "ok",
  "wards_loaded": 23,
  "premises_loaded": 14,
  "prediction_model": "linear_trend_forecast"
}
```

### `GET /api/modes`

Returns the two frontend modes:

```text
strategic = ward-level planning map
premises = City Centre high-risk premises overlay
```

### `GET /api/strategic/wards`

Returns a compact list of 23 wards with:

```text
id
name
ward_id
ward_name
risk_score
risk_band
drivers
prediction
```

### `GET /api/strategic/wards.geojson`

Returns the full ward GeoJSON for the map.

Each ward feature includes:

```text
geometry
properties.ward_id
properties.ward_name
properties.risk_score
properties.risk_band
properties.drivers
properties.prediction
```

### `GET /api/strategic/wards/{ward_id}`

Returns one full ward GeoJSON feature.

Example:

```text
GET /api/strategic/wards/S13002976
```

### `GET /api/premises`

Returns City Centre premises markers.

Useful filters:

```text
GET /api/premises?focus=city-centre
GET /api/premises?ward_id=S13002976
GET /api/premises?risk_band=high
```

Each premises record includes:

```text
id
name
lat
lng
ward_id
ward_name
premises_type
primary_risk_type
risk_score
risk_band
inspection_priority
drivers
future_pressure
recommended_intervention
```

### `GET /api/premises/{premises_id}`

Returns one premises marker.

Example:

```text
GET /api/premises/P001
```

### `GET /api/explain`

Returns a human-readable explanation for a ward or premises.

Ward example:

```text
GET /api/explain?mode=ward&id=S13002976
```

Premises example:

```text
GET /api/explain?mode=premises&id=P001
```

Response shape:

```json
{
  "id": "P001",
  "mode": "premises",
  "source": "fallback",
  "text": "This premises is flagged as Priority 1 because it combines evacuation complexity, dense residential occupancy, and limited appliance access. City-centre demand and planned development pressure may affect prevention demand over the 6 months. This should be treated as a prevention-review and inspection-prioritisation signal, not an official safety judgement."
}
```

If `OPENAI_API_KEY` is available in `backend/.env`, the endpoint attempts to
use OpenAI. If the key is missing or the request fails, the backend returns a
safe fallback explanation.

Important wording rule:

```text
Never say a building is unsafe.
Say it is flagged for prevention review or inspection prioritisation.
```

## Compatibility Endpoints

These older routes still work so existing frontend code does not break:

```text
GET /api/wards
GET /api/wards.geojson
GET /api/wards/{ward_id}
GET /api/wards/{ward_id}/prediction
```

## Fire-Service Language Used

The backend data uses terms such as:

```text
prevention priority
premises risk profile
Home Fire Safety Visit
inspection priority
operational intelligence
mobilisation demand
evacuation complexity
high-risk premises
dwelling fire risk
false alarm demand
community safety intervention
```

These terms help the demo sound closer to a fire and rescue planning workflow
without claiming official operational certainty.
