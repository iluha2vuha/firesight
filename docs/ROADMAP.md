# Portfolio improvement roadmap

An unchecked item is planned work, not a completed capability.

## First: make the demo reliable

- [x] **Restore map imagery.** Replaced CARTO's key-gated tiles with standard OpenStreetMap tiles, retained attribution and night styling, and added provider configuration. Verified streets and place labels in the browser in both day and night modes; the frontend build and component lint check passed.
- [ ] **Make setup reproducible.** Verify the README in a clean environment, document supported runtimes, and separate app dependencies from optional data tooling where useful. A new user should be able to start the demo from documented commands.
- [ ] **Explain model availability.** Distinguish missing generated data from a backend connection problem, and show recovery instructions. Verify model mode enables with valid output.
- [ ] **Handle data and network failures.** Show readable errors for unavailable APIs, malformed responses, and failed map requests. A failed request should not silently leave a blank screen.

## Next: make results understandable and checkable

- [ ] **Document data provenance.** Record sources, dates, preparation steps, and which values are mock or derived. Verify the complete generation process from its required inputs.
- [x] **Correct forecast horizon labels.** Model views and explanations describe the three annual projections as Years 1, 2 and 3. Existing CSV/API field names are retained for compatibility; Mock mode keeps its sample month-based units.
- [ ] **Evaluate forecasting.** Define an appropriate time-based evaluation, compare with a simple baseline, and report limitations. Claim accuracy only after measuring it.
- [ ] **Add focused automated checks.** Cover meaningful API behaviour, missing data, JSON serialization, and key frontend flows; add CI for appropriate checks.
- [ ] **Review usability.** Verify legends, controls, keyboard access, and layouts at common screen sizes.

## Then: prepare a portfolio release

- [x] Select and preserve `c85ae93` as the team baseline after comparing it with `a34243c`.
- [ ] Identify the exact hackathon demo commit if it can be recovered; keep it distinct from the selected baseline.
- [x] Create a standalone personal repository, retaining team credit, history, and the baseline tag.
- [x] Document individual hackathon contributions and retain team credit.
- [x] Confirm team agreement and establish the public portfolio repository.
- [ ] Capture screenshots after the important flows work.
- [ ] Deploy a reproducible demo and document configuration and limitations.
- [ ] Write a before-and-after account linking each improvement to its implementation and validation.
