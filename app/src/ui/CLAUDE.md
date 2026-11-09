# app/src/ui

- Before asking for review, run axe (color-contrast, target-size) on every changed screen in light and dark. Tap targets are at least 44 pt and text meets WCAG AA contrast (NFR-10 in `docs/design/2026-11-06-mvp/02-requirements.md`).
- Every visible UI change gets before/after screenshots (light and dark) in the PR body.
- A test of a refresh-after-failure path makes the mocked Local copy reflect the change. A message about a removed row is held outside that row, so it doesn't vanish with it.
