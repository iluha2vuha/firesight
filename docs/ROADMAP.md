# Portfolio improvement roadmap

Checked items describe completed work. Unchecked items remain planned.

## Completed

- [x] Preserve `c85ae93` as the agreed team baseline and retain the original team history and credit.
- [x] Establish a separate public repository with team agreement.
- [x] Restore map imagery with OpenStreetMap, attribution and light/dark styling.
- [x] Correct forecast coverage to all 23 Glasgow wards and preserve unique DataZone identifiers.
- [x] Use Current / Year 1–3 consistently and separate fixed score scenarios from annual incident projections.
- [x] Rebuild the ward ranking, search, map selection, settings and dismissible sidebar workflow.
- [x] Keep premises and archived events in Mock; exclude them from Model.
- [x] Validate API data and distinguish loading, empty, malformed and offline states, with deadlines and retry recovery.
- [x] Separate Mock templates from OpenAI generation, validate response context and verify live GPT-6 Luna generation.
- [x] Add focused regression checks: 18 backend tests and 15 frontend tests, plus lint and production build checks.
- [x] Check the main workflow, both modes/themes, keyboard interactions and common viewport sizes in the browser.
- [x] Add legend category highlighting and preserve map position during normal interactions.
- [x] Document the personal continuation separately from the hackathon contributions.

## Remaining

- [ ] Verify installation from a clean environment and review application versus optional data-tooling dependencies.
- [ ] Record complete dataset provenance, licences, releases, preparation checks and refresh instructions.
- [ ] Replace the ward deprivation-decile proxy with a justified geographic DataZone-to-ward aggregation.
- [ ] Evaluate forecasts with time-based backtesting, a simple baseline and measured range coverage.
- [ ] Review missing annual observations and geographic boundary changes before extending the model.
- [ ] Migrate legacy `forecast_6mo` / `12mo` / `18mo` API fields through a documented compatibility plan.
- [ ] Remove unused legacy frontend components after the redesigned workflow is settled.
- [ ] Add CI for the existing tests, lint and production build.
- [ ] Review production CORS, rate limits, configuration, credentials, map-tile capacity and data refresh before deployment.
- [ ] Deploy a reproducible demo and add current screenshots to the public README.
- [ ] Recover the exact hackathon demo commit if possible; keep it distinct from the agreed baseline.
