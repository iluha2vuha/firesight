# FireSight

**A fire-prevention planning dashboard for Glasgow.**

FireSight brings together geographic risk indicators, historical fire trends, and premises information to help explore where prevention activity could be prioritised. It was developed by Team 7 at **J.P. Morgan's Code for Good hackathon in April 2026**, where the team placed **second**.

This repository is Illia Zakharov's personal continuation of the [original team project](https://github.com/cfgglasgow26/Team-7), retaining its history and team credit. The original repository is private and requires permission to view.

## Features

- **Ward priorities:** search a ranked ward list and select a ward to inspect its map outline, score, context and projection chart.
- **Forecast views:** compare current indicators with Year 1, Year 2, and Year 3 projections. The same whole-year scenario controls are used in both modes; annual incident forecasts are provided by Model mode.
- **Planning guidance:** load optional generated or built-in suggestions from the ward detail panel.
- **Mock examples:** independently show high-risk city-centre premises and archived demo events, both hidden by default and available only in Mock.
- **Workspace settings:** start in Mock and switch to Model or dark/light appearance in Settings. A compact floating dock centres over the map space beside the sidebar and contains the active data source, layer controls, Current / Year 1–3 and score legend. The left sidebar floats over the full-width map and can be closed with × or Escape; reopen it from the rail or by selecting a ward. Wards and All wards return to the full Glasgow overview; selection highlights a ward while preserving city context. Map navigation is bounded to the Scotland region; scroll/pinch or keyboard shortcuts control zoom, and Wards/All wards reset the view; risk-data coverage remains Glasgow.

In Model mode, the ward map starts from the existing model score (the mean DataZone score for the ward's SIMD decile). Future model views add 4, 8, or 12 risk points for Years 1, 2, or 3, capped at 100. These are scenario adjustments; incident forecasts are shown separately as annual counts for each projected year, rather than cumulative totals. These historical projections follow the 2009/10–2022/23 training data and are not refreshed rolling forecasts. Mock mode provides illustrative scores with the same annual scenario controls. Its legacy sample monthly forecasts are not displayed as annual data.

FireSight is a student prototype for exploring prevention planning. Its scores and forecasts have not been validated for operational use and do not determine whether a building is safe.

## Technology

| Component | Technologies and role |
| --- | --- |
| Frontend | React, Vite, Leaflet, and React Leaflet for the dashboard and geographic layers. |
| Backend | Python and FastAPI for risk data, forecasts, GeoJSON, and explanations. |
| Data pipeline | pandas and NumPy for processing SIMD indicators and historical fire statistics. |
| Risk model | Weighted DataZone indicators and linear trends in historical ward fire counts. |
| Optional explanations | OpenAI API, with built-in explanations when unavailable. |

## Run locally

Use Python 3.12 and Node.js compatible with Vite 8: Node 20.19+ in the 20.x series, or Node 22.12 and later. You also need Git and npm.

```bash
git clone https://github.com/iluha2vuha/firesight.git
cd firesight
```

### Backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Leave the server running. Its health endpoint is at <http://127.0.0.1:8000/api/health>, and interactive API documentation is at <http://127.0.0.1:8000/docs>.

The activation command above is for macOS and Linux. On Windows, activate the environment using `.venv\Scripts\Activate.ps1` in PowerShell.

### Frontend

Open a second terminal in the repository root:

```bash
cd frontend/fire_website
npm ci
npm run dev
```

Open the address Vite prints, normally <http://localhost:5173>. Keep both servers running while using the app; press `Ctrl+C` in each terminal to stop them.

### Configuration

| Variable | File | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | `backend/.env` | Optional key for generated explanations. Without it, the backend uses built-in explanations. |
| `OPENAI_MODEL` | `backend/.env` | Optional model selection; defaults to `gpt-4o-mini`. |
| `VITE_BACKEND_URL` | `frontend/fire_website/.env.local` | Backend address; defaults to `http://localhost:8000`. |
| `VITE_EVENTS_API_URL` | `frontend/fire_website/.env.local` | Optional events endpoint; the app uses sample events if unavailable. |
| `VITE_MAP_TILE_URL` | `frontend/fire_website/.env.local` | Optional light raster basemap URL; defaults to standard OpenStreetMap tiles. |
| `VITE_MAP_ATTRIBUTION` | `frontend/fire_website/.env.local` | Attribution HTML required by a custom tile provider; defaults to OpenStreetMap credit. |

Example settings are provided in `backend/.env.example` and `frontend/fire_website/.env.example`. Keep credentials out of Git, and keep the OpenAI key on the backend: frontend `VITE_` variables are visible to the browser.

The basemap uses standard OpenStreetMap tiles without an API key. Night mode styles the same tiles locally while preserving the risk-overlay colours. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): retain visible attribution, allow normal browser caching and referrer headers, and do not bulk-download or prefetch tiles. The service is best-effort; review provider capacity before a wider deployment.

### Model data

Generated model output is included under `data-pipeline/output/`. The backend loads it at startup when the required Python dependencies are installed. Check `/api/status` for model availability.

To regenerate the output, activate the virtual environment and run from the repository root:

```bash
cd data-pipeline
python run_model.py
```

The runner expects these source files under `data-pipeline/raw/`:

- `simd2020.csv`
- `simd2020_indicators.xlsx`
- `fire_statistics_scotland.csv`

It writes `output/glasgowzones.csv` and `output/glasgow_ward_forecasts.csv`. Restart the backend and refresh the frontend after regenerating them.

## Team work and individual contributions

The hackathon prototype was built collaboratively by Team 7. The original commit history and hackathon notice are retained, and the [team repository](https://github.com/cfgglasgow26/Team-7) remains linked as the source of that work.

**Illia Zakharov's hackathon contributions:**

- Co-developed the FireSight idea with teammates for prioritising fire-prevention work across Glasgow.
- Developed FastAPI endpoints serving risk scores, forecasts, and GeoJSON for 23 Glasgow wards to the interactive map.
- Processed model outputs for the API and fixed non-finite values that caused JSON serialization failures.

## Baseline and continued development

The agreed team baseline is preserved at commit `c85ae93` under the [`team-baseline` tag](https://github.com/iluha2vuha/firesight/tree/team-baseline). Continued development takes place on `portfolio/improvements`.

**Improvements since the baseline:** restored the basemap by replacing CARTO's key-gated tiles with standard OpenStreetMap tiles, preserving day/night styling and adding configuration for alternative providers. The map was checked visually in both modes.

The [improvement roadmap](docs/ROADMAP.md) tracks the planned work on reliability, data reproducibility, model evaluation, testing, and deployment.

## Repository layout

```text
backend/                 FastAPI application, demo data, and API documentation
frontend/fire_website/   React/Vite dashboard and map components
data-pipeline/           Source datasets, modelling scripts, and generated output
docs/ROADMAP.md          Improvement roadmap
requirements.txt        Python dependencies
```

## Original hackathon notice

The code ("Code") in this repository was created solely by the student teams during a coding competition hosted by JPMorgan Chase Bank, N.A. ("JPMC"). JPMC did not create or contribute to the development of the Code. This Code is provided AS IS and JPMC makes no warranty of any kind, express or implied, as to the Code, including but not limited to, merchantability, satisfactory quality, non-infringement, title or fitness for a particular purpose or use.
