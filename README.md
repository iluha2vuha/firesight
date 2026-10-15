# FireSight

A Glasgow fire-risk dashboard, originally developed by Team 7 at J.P. Morgan's Code for Good hackathon in April 2026, where the team placed second.

FireSight brings area risk indicators, historical fire trends, and prototype premises information into an interactive map to explore prioritising fire-prevention activity. It is a student prototype, not an operational fire-service system or an assessment of whether a building is safe.

## Project status

This repository continues the hackathon prototype as a personal portfolio project. Team work and subsequent personal improvements are credited separately.

- **Selected team baseline:** tag `team-baseline`, commit `c85ae93`, the latest team `main`. This is the starting point for improvements; the exact hackathon demo commit remains unconfirmed.
- **Development branch:** `portfolio/improvements`.
- **Personal repository:** [iluha2vuha/firesight](https://github.com/iluha2vuha/firesight), a public, standalone continuation retaining the original team history and credit.
- **Known issues:** CARTO tiles display an API-key warning, and model mode requires generated data files. See the [roadmap](docs/ROADMAP.md).

The preceding team commit, `a34243c`, was checked alongside the selected baseline. Both frontend production builds passed, but the older version returned HTTP 500 for the zone list, top-zone list, and individual-zone API requests with the committed model output loaded. The selected baseline passed those requests, plus the health, model-status, ward GeoJSON, premises, and built-in ward-explanation checks. These checks establish a starting point; they do not mean every application flow is bug-free.

## What the prototype includes

- A React and Leaflet map with risk indicators for 23 Glasgow wards.
- A ranked ward panel and a prototype City Centre premises overlay.
- Current, 6-month, 12-month, and 18-month views.
- Mock data and an optional model mode using generated pipeline output.
- A FastAPI backend with interactive API documentation.
- Optional AI-generated next steps, with built-in explanations when no OpenAI key is configured or a request fails.

The data pipeline combines SIMD indicators into weighted DataZone scores and fits linear trends to historical ward fire counts. These experimental outputs have not been validated for operational use; displaying a score or forecast does not establish predictive accuracy.

## Team work and my contribution

The hackathon prototype was built collaboratively. The [original team repository](https://github.com/cfgglasgow26/Team-7) and its commit history are retained as the source of that work. The repository currently requires access permission.

### Illia Zakharov — hackathon contribution

- Co-developed the FireSight idea with teammates for prioritising fire-prevention work across Glasgow.
- Developed FastAPI endpoints serving risk scores, forecasts, and GeoJSON for 23 Glasgow wards to the interactive map.
- Processed model outputs for the API and fixed non-finite values that caused JSON serialization failures.

### Continued personal development

The `portfolio/improvements` branch starts with project documentation, a preserved baseline, and an improvement roadmap. Application fixes, automated checks, and a deployed demo are planned work. Completed improvements will be recorded here with links to their commits or pull requests.

## Run locally

You need Python with `venv` support and Node.js compatible with Vite 8 (`20.19+` in the Node 20 series, or `22.12+`), with npm. Use two Terminal tabs and leave both servers running.

### 1. Backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install fastapi==0.115.0 "uvicorn[standard]==0.32.0" openai python-dotenv==1.0.1
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

On later runs, reuse `.venv` and skip its creation and the dependency installation.

- Health check: <http://127.0.0.1:8000/api/health>
- API documentation: <http://127.0.0.1:8000/docs>

### 2. Frontend

In another Terminal tab, starting from the repository root:

```bash
cd frontend/fire_website
npm ci
npm run dev
```

Open the address Vite prints, normally <http://localhost:5173>. On later runs, skip `npm ci` unless dependencies have changed. Press `Ctrl+C` in each tab to stop the servers.

### Configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | `backend/.env` | Optional AI explanations; built-in explanations work without it. |
| `OPENAI_MODEL` | `backend/.env` | Optional model selection; the current default is `gpt-4o-mini`. |
| `VITE_BACKEND_URL` | Frontend environment | Optional backend address; defaults to `http://localhost:8000`. |
| `VITE_EVENTS_API_URL` | Frontend environment | Optional external events endpoint; sample events are used if unavailable. |

The map currently requests CARTO basemap tiles without authentication. In the browser, these display **API KEY REQUIRED**. A successful HTTP response alone does not confirm usable imagery. Configuring a suitable basemap is the first planned application fix; the current code has no map-key environment variable.

Keep real credentials out of Git. Frontend variables are exposed to the browser, so never put an OpenAI key in a `VITE_` variable.

### Optional model mode

The mock-data demo does not require the pipeline. Model mode needs additional Python dependencies and these raw datasets under `data-pipeline/raw/`:

```text
simd2020.csv
simd2020_indicators.xlsx
fire_statistics_scotland.csv
```

With the virtual environment active, start from the root:

```bash
python -m pip install -r requirements.txt
cd data-pipeline
python run_model.py
```

This generates `output/glasgowzones.csv` and `output/glasgow_ward_forecasts.csv`. Restart the backend and refresh the frontend afterward. A complete, reproducible raw-data setup remains a roadmap item.

## Repository layout

```text
backend/                 FastAPI application, demo data, API documentation
frontend/fire_website/   React/Vite frontend and Leaflet map
data-pipeline/           Dataset preparation, modelling, generated output
docs/ROADMAP.md          Planned fixes and acceptance criteria
requirements.txt        Backend and data-pipeline Python dependencies
```

## Hackathon notice

The following notice is retained from the original repository:

The code ("Code") in this repository was created solely by the student teams during a coding competition hosted by JPMorgan Chase Bank, N.A. ("JPMC"). JPMC did not create or contribute to the development of the Code. This Code is provided AS IS and JPMC makes no warranty of any kind, express or implied, as to the Code, including but not limited to, merchantability, satisfactory quality, non-infringement, title or fitness for a particular purpose or use.
