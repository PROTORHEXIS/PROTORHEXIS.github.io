# V2.8 — Dependency terminal geometry, timeline isolation and public site entry policy

## Root cause and implementation

1. **A / B differentiation.** V2.7 optimized routes were partly geometry-aware but often looked like A with rounded corners. V2.8 renders one explicit source-side trunk for multiple edges (rather than repainting coincident segments), and assigns deterministic source-to-target routing lanes in the middle of available horizontal space, shifting lanes away from intervening task rectangles. A remains the near-source orthogonal baseline. Both operate solely on synthetic public fixtures; no internal graph data is fetched.
2. **Arrow endpoint.** The last segment of each SVG edge uses `stroke-linecap: butt`, avoiding the circular cap protrusion at `marker-end`. `markerUnits=userSpaceOnUse`, `refX=8` exactly matches the triangle tip x=8, and the geometric path terminates 6px left of the successor's bar start. Only the separate optimized source trunk may use round caps; it has no arrow.
3. **Timeline hover isolation.** Replace the motion-wrapped entire event row with an ordinary button; apply a CSS hover scale only to `.event-body`. Dates, axis dots and row layout are not transformed. Reduced-motion turns this off.
4. **Logo asset.** `public/brand/mark.svg` is a neutral, temporary SVG placeholder. The user-provided official PROTORHEXIS mark can replace the file in place (retain its path and a `viewBox`); it is not presented as the official visual identity.
5. **No entry to the unfinished institutional homepage.** The top-left brand is intentionally static, not a link. The workstation footer and 404 page do not contain links to `/`. The root URL remains reachable directly and still provides navigation *outward* to the published engineering roadmap.

## Qualification

- Local source/calendar/geometry checks, and `check:v28` (positive marker tangent, no round cap, separated B lanes, one shared trunk per source, home entry policy, DEMO provenance).
- Playwright desktop and mobile: actual Astro + Vue hydration; A/B selection and refresh persistence; check source trunk count, arrow marker/tip alignment and stroke cap; hover card without moving the date or timeline axis; accessible non-link logo SVG loading.
- Keep draft until candidate GitHub CI and Chromium screenshots pass. Only then merge to deploy. The unrelated Pages Jekyll workflow may fail but is not the Astro release workflow.
