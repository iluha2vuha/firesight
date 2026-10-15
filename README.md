# FireSight

**A fire-prevention planning dashboard for Glasgow.**

FireSight brings together geographic risk indicators, historical fire trends, and premises information to help explore where prevention activity could be prioritised. It was developed by Team 7 at **J.P. Morgan's Code for Good hackathon in April 2026**, where the team placed **second**.

This repository is Illia Zakharov's portfolio edition of the [original team project](https://github.com/cfgglasgow26/Team-7), retaining the team's history and credit. The original repository is private and requires permission to view.

## Features

- **Ward priorities:** search and rank Glasgow's 23 wards, select one from the list or map, and inspect its score and annual projections.
- **Map controls:** a compact floating dock groups ward scores, optional example layers, Current / Year 1–3 and the score legend. Hover or focus a legend category to highlight matching wards.
- **Map navigation:** ward selection, source changes and panels preserve your zoom and position. Wards / All wards returns to the Glasgow overview. Navigation is bounded to an approximate Scotland extent; data coverage remains Glasgow.
- **Workspace settings:** start in Mock, switch to Model in Settings, and choose dark or light appearance. The sidebar closes with × or Escape; Data and Settings sit at the bottom of the navigation rail.
- **Mock examples:** independently show 10 high-risk premises and four archived event examples. Both layers are hidden by default and excluded from Model mode.
- **Planning suggestions:** Mock returns written examples. Model generates suggestions for the selected ward and timeframe through OpenAI, with visible errors and retry controls.

## Scores and projections

| Output | Meaning |
| --- | --- |
| Current score | A relative 0–100 indicator. Model uses the mean DataZone score for the ward's assigned SIMD decile; Mock uses sample scores. |
| Future score | Current score plus 4, 8 or 12 points for Years 1–3, capped at 100. These are fixed scenario adjustments. |
| Annual projection | Model's projected dwelling-fire count for each of three years after the 2009/10–2022/23 training period. Current displays Year 1. |
| Projection range | An indicative residual-based range for Year 1 only. |

The score and incident count are separate outputs. Model's annual projections come from a recency-weighted linear trend over 14 historical observations; they are not refreshed rolling forecasts. Mock's legacy monthly forecasts are not displayed as annual results.

Ward scores use a deprivation-decile proxy: each ward receives the mean score of Glasgow DataZones in its assigned decile. Scores provide relative area comparisons; annual projections describe historical fire trends.

## Technology

| Component | Technologies and role |
| --- | --- |
| Frontend | React, Vite, Leaflet, and React Leaflet for the dashboard and geographic layers. |
| Backend | Python and FastAPI for risk data, forecasts, GeoJSON, and explanations. |
| Data pipeline | pandas and NumPy for processing SIMD indicators and historical fire statistics. |
| Risk model | Weighted DataZone indicators and linear trends in historical ward fire counts. |
| Planning suggestions | Mock uses template examples. Model generates suggestions through the OpenAI API for the selected ward and timeframe, with explicit API errors and no sample fallback. |

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
| `OPENAI_API_KEY` | `backend/.env` | Required for Model suggestions; Mock uses built-in examples without a key. |
| `OPENAI_MODEL` | `backend/.env` | Optional model selection; defaults to `gpt-4o-mini`. `gpt-6-luna` is also supported and has been tested locally. |
| `VITE_BACKEND_URL` | `frontend/fire_website/.env.local` | Backend address; defaults to `http://localhost:8000`. |
| `VITE_MAP_TILE_URL` | `frontend/fire_website/.env.local` | Optional light raster basemap URL; defaults to standard OpenStreetMap tiles. |
| `VITE_MAP_ATTRIBUTION` | `frontend/fire_website/.env.local` | Attribution HTML required by a custom tile provider; defaults to OpenStreetMap credit. |

Model scores and forecasts work without an OpenAI key. For generated suggestions, copy `backend/.env.example` to `backend/.env`, set `OPENAI_API_KEY`, and optionally set `OPENAI_MODEL=gpt-6-luna`. Restart the backend after configuration changes. Missing credentials, quota/rate limits, timeouts and provider errors are reported; scores and projections remain available. The integration uses the [official OpenAI Python SDK](https://developers.openai.com/api/reference/python).

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

## Portfolio improvements

The team baseline is preserved at commit `c85ae93` under the [`team-baseline` tag](https://github.com/iluha2vuha/firesight/tree/team-baseline). The portfolio edition builds on this snapshot, with the original team repository retained separately.

The improvements on `main` include:

- Restored OpenStreetMap imagery with light/dark styling and configurable tile providers.
- Corrected forecast coverage to exactly match all 23 Glasgow wards, including North East, and fixed identifiers for 746 DataZones.
- Unified annual timeframe controls and separated model incident projections from fixed score scenarios.
- Rebuilt the dashboard around a searchable ward list, map selection, a compact filter dock and dismissible panels.
- Separated demonstration premises and events from Model outputs.
- Added validated API responses, cancellation, request deadlines, retries and protection against stale data.
- Split template suggestions from live OpenAI generation, added source/ward/period checks, and fixed GPT-6 Luna request compatibility.
- Added regression tests and checked the main workflow, themes, keyboard controls and responsive layouts in the browser.

Changes are developed on feature branches and merged through pull requests. API credentials are configured locally and excluded from Git.

## Checks

From the repository root, with the Python environment active:

```bash
python -m unittest discover -s backend -p 'test_*.py'
```

From `frontend/fire_website`:

```bash
npm test
npm run lint
npm run build
```

The suites contain 18 backend tests and 15 frontend tests. Backend suggestion tests mock OpenAI and require no API key. Live GPT-6 Luna generation has also been checked separately. The commands above run all automated checks locally.

See the [roadmap](docs/ROADMAP.md) for future enhancements.

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
