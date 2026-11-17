# Roadmap Workstation V2.7 — Gantt arrow routing comparison

**Scope:** Visual-only repair of synthetic Gantt dependencies; no actual release or engineering assertions.

## A — Classic / 直角

Routes a normal separated dependency as a clean `H → V → H` orthogonal elbow. When the predecessor ends after the successor begins (overlapping planning windows), a direct elbow would have to **enter the target from the right**, turning its arrowhead backward. A instead routes through the row gutter: `H(out) → V(gutter) → H(left of target) → V(target row) → H(right into target)`. No path reverses its terminal direction.

## B — Routed / 避让 (default)

Uses the same safe terminal direction with additional deterministic channels, staggered entries when several edges arrive at one item, intermediate-row obstacle avoidance and modest rounded corners. This is a route geometry change, not a purely cosmetic theme. Both modes are available in the right side of Gantt controls, with `aria-pressed` state and persisted choice in local storage. Both are read-only. The dependency visibility switch remains independent.

## Invariants

- Terminal arrow is always a positive-X approach, at **6 px before the target bar's left edge**, with an auto-oriented 8px arrow marker.
- Collapsed source/target groups and dependencies outside the calendar window are omitted.
- Selection and hover only change emphasis, not route geometry.
- Route mode toggling does not change bar positions, time window, scroll or label width.
- Avoid duplicate marker endpoints, backward terminal segments and self-links. `prefers-reduced-motion` disables selector transitions.
- All values remain **SYNTHETIC DEMO**; no user-modifiable planning data or repository integrations.

## Verification

`npm run check:v27` validates source, route geometry and regressions. Playwright checks both modes at 1440×900 and 390×844 with full Astro/Vue hydration, arrowhead terminal tangent using `SVGPathElement.getPointAtLength`, target alignment, choice persistence and A/B screenshots. Existing multi-route browser tests still apply. No source merge unless the exact candidate's browser build passes.
