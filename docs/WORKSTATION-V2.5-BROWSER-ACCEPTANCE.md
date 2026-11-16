# V2.5 — UI continuity & browser release gate

## Scope

- Preserve full-width graphite/red Continuous Surface UI and restrained Motion for Vue.
- Add an actionable horizontally-scrolling tab hint on narrow viewports.
- Add native-scrolling board stage navigation (previous / next buttons and responsive progress).
- Reduce non-selected Gantt dependency line opacity without hiding selected dependencies.
- Preserve V2.4 body Teleport hydration guard; synthetic DEMO data remains `noindex`.

## Browser acceptance (new blocking gate)

`npm run build` must precede `npm run test:e2e`. The Playwright config launches **Astro's real production preview** on 127.0.0.1:4321 and loads all four public routes at desktop and mobile viewport sizes.

Requirements: the Astro SSR island must fully hydrate; `.ws-root` and `.workbench` must remain visible; no uncaught page errors; the DEMO/noindex contract holds. Also exercise custom-range popover clipping/Escape, scrolling stage controls, mobile overflow-tab control and inspector focus/scroll restoration.

CI: install Chromium only (`npx playwright install --with-deps chromium`). Keep Playwright screenshot/trace evidence for seven days. These checks run **before** `actions/upload-pages-artifact`, blocking deployment if they fail.

## Boundaries

- Static-only site, no live/internal repository data access; dates still synthetic examples.
- The visual screenshot inspection is complementary to E2E; test logs must never claim every visual issue is ruled out.
- Re-render and screenshot evidence from CI are candidate-specific; do not use old build artifacts as release proof.
