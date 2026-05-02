# TESTING

This repo should use a layered testing strategy. Do not default every feature to the same kind of test.

## Principles
- Prefer the cheapest test that can reliably catch the regression you care about.
- Test logic separately from browser behavior whenever possible.
- Use real browser tests for user-visible editor interactions, async UI states, and network-driven flows.
- Keep full-page end-to-end coverage narrow and intentional. Most features do not need a full app-level test.

## Test Types
### Vitest
Use Vitest for:
- Pure functions and deterministic transforms
- Schema/default logic
- Editor state transitions that can be asserted without a real browser
- Helper modules with mocked network or storage dependencies

Good examples:
- A command sets the right node attrs
- A helper derives the right payload from user input
- Upload logic sets `data-uploading: "true"` before the request resolves

### Cypress Harness Tests
Use Cypress against a dedicated harness page for:
- Real Tiptap editor interactions
- Node insertion flows
- Loading, optimistic, and error UI states
- File uploads, drag/drop, and keyboard-driven editor behavior
- Cases where the browser DOM and timing matter

This should be the default browser-level pattern for complex editor features.

For Kairos-hosted editor routes, use the Cypress project in `../kairos/tests` instead of Playwright or ad hoc browser automation. Run focused one-shot specs through `yarn test:cypress --spec <path>`. For headed visual inspection, use `yarn test:cypress:headed --config specPattern=<path>` so the Cypress app stays open.

Guidelines:
- Prefer a minimal dedicated page under `app/` that isolates the feature under test
- Reuse the real command/helper path wherever possible
- For non-LLM detector behavior, use deterministic browser hooks like `window.__LIFEMAP_MOCK_LOCATION_DETECTOR__` so tests assert editor integration and tagging timing without depending on model download/runtime variance
- Use real fixtures for files, not synthetic placeholders, when the file type matters
- Delay/stub network responses so transient UI states are observable
- Assert on stable selectors or explicit UI states instead of layout details

Good examples:
- An image upload inserts a real image node and shows the loading spinner while the request is in flight
- A slash-menu action inserts the expected block in a real editor instance
- A drag interaction updates the node in the way a user would observe

### Full App E2E
Use Cypress on the real app route for:
- Critical user journeys
- High-risk integrations between multiple subsystems
- Features where the harness would miss important app wiring

Keep these few in number because they are slower and more brittle.

Good examples:
- A core authoring flow on a real `/q/:slug` page
- A persisted editor change that survives reload
- A mission-critical publish/save/share flow

## Recommended Feature Coverage
For most interactive features:
1. Add or update a Vitest test for the core state/logic contract
2. Add a Cypress harness test for the user-visible behavior
3. Only add a full app e2e if the feature is critical or known to be integration-sensitive

## What To Avoid
- Do not use full app e2e for every feature
- Do not assert fragile pixel/layout details unless visual layout is the feature
- Do not depend on unrelated app boot paths when a harness page can isolate the behavior
- Do not skip fast logic tests just because a browser test exists

## Current Example
Image upload spinner coverage should follow this pattern:
- Vitest: verify upload placeholder attrs are inserted and cleared correctly
- Cypress harness: verify a real editor instance inserts an image node and shows the upload spinner while the request is delayed
- Full app e2e: optional, only after the real page route is stable enough to justify the extra maintenance
