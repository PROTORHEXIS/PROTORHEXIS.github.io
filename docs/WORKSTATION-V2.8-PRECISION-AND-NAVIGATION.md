# V2.8 — Dependency terminal geometry, timeline isolation and public site entry policy

## Root cause and implementation

1. **Single dependency routing.** The released B algorithm is the sole supported router as of V2.9. Forward links retain a shared source-side trunk. Overlapping dates use compact top/bottom edge exits and obstacle-aware corridors. No internal graph data is fetched.
2. **Arrow endpoint.** The last segment of each SVG edge uses `stroke-linecap: butt`, avoiding the circular cap protrusion at `marker-end`. `markerUnits=userSpaceOnUse`, `refX=8` exactly matches the triangle tip x=8, and the geometric path terminates 6px left of the successor's bar start. Only the separate optimized source trunk may use round caps; it has no arrow.
3. **Timeline hover isolation.** Replace the motion-wrapped entire event row with an ordinary button; apply a CSS hover scale only to `.event-body`. Dates, axis dots and row layout are not transformed. Reduced-motion turns this off.
4. **Logo asset.** `public/brand/mark.svg` is a neutral, temporary SVG placeholder. The user-provided official PROTORHEXIS mark can replace the file in place (retain its path and a `viewBox`); it is not presented as the official visual identity.
5. **No entry to the unfinished institutional homepage.** The top-left brand is intentionally static, not a link. The workstation footer and 404 page do not contain links to `/`. The root URL remains reachable directly and still provides navigation *outward* to the published engineering roadmap.

## Qualification

- Historical V2.8 validation covered the then-current router and demo fixture. Use `npm run check:gantt` and the [current validation commands](../README.md#build-and-validation) for the current implementation.
- Playwright desktop and mobile: actual Astro + Vue hydration; production routing; check source trunk count, arrow marker/tip alignment and stroke cap; hover card without moving the date or timeline axis; accessible non-link logo SVG loading.
- Keep draft until candidate GitHub CI and Chromium screenshots pass. Only then merge to deploy. The unrelated Pages Jekyll workflow may fail but is not the Astro release workflow.
