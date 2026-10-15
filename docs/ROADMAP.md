# Portfolio improvement roadmap

An unchecked item is planned work, not a completed capability.

## First: make the demo reliable

- [ ] **Restore map imagery.** Choose a provider, confirm its access requirements, configure it, and provide correct attribution. Verify actual tile images in the browser in day and night modes; HTTP 200 alone is insufficient. The map must show streets instead of API-key warnings.
- [ ] **Make setup reproducible.** Verify the README in a clean environment, document supported runtimes, and separate app dependencies from optional data tooling where useful. A new user should be able to start the demo from documented commands.
- [ ] **Explain model availability.** Distinguish missing generated data from a backend connection problem, and show recovery instructions. Verify model mode enables with valid output.
- [ ] **Handle data and network failures.** Show readable errors for unavailable APIs, malformed responses, and failed map requests. A failed request should not silently leave a blank screen.

## Next: make results understandable and checkable

- [ ] **Document data provenance.** Record sources, dates, preparation steps, and which values are mock or derived. Verify the complete generation process from its required inputs.
- [ ] **Evaluate forecasting.** Define an appropriate time-based evaluation, compare with a simple baseline, and report limitations. Claim accuracy only after measuring it.
- [ ] **Add focused automated checks.** Cover meaningful API behaviour, missing data, JSON serialization, and key frontend flows; add CI for appropriate checks.
- [ ] **Review usability.** Verify legends, controls, keyboard access, and layouts at common screen sizes.

## Then: prepare a portfolio release

- [ ] Confirm the hackathon submission commit and tag it `hackathon-final`.
- [ ] Create the personal fork once forking is permitted.
- [x] Document individual hackathon contributions and retain team credit.
- [ ] Resolve permission and visibility for a public portfolio version.
- [ ] Capture screenshots after the important flows work.
- [ ] Deploy a reproducible demo and document configuration and limitations.
- [ ] Write a before-and-after account linking each improvement to its implementation and validation.
