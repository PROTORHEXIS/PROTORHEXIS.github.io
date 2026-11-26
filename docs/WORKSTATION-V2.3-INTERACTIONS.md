# Roadmap V2.3 — Interactive planning workbench

Scope: visual/prototype only. No backend mutation, publication of factual milestones, or production release. Built atop V2.2 continuous-surface styling; no change to canonical TALOS design authority.

## Schedule interaction contract

1. **Horizontal panning**: pointer drag on empty timeline track; does not drag task bars or write task dates. Native scrolling remains available for trackpads, keyboard users and touch devices. Pointer capture is cleared on pointerup/pointercancel/lostpointercapture.
2. **Calendar windows**: presets 6/12/24 inclusive months; custom start/end months (max 36, end >= start). Month or quarter granularity changes axis labels, not the underlying task dates. Previous/next shifts by half of the current window. Reset returns to synthetic fixture origin (`2026-11` to `2027-10`).
3. **Range geometry**: date arithmetic uses UTC and inclusive task end dates. Time-bars are clipped to the viewport; off-range bars and their dependency paths are omitted. Quarter ticks align with natural calendar-quarter boundaries, including partial first/last quarters.
4. **Dependencies**: display toggle defaults to on. Orthogonal connectors represent directed `depId -> itemId` relationships from fixtures. Paths recalculate on calendar changes, search/project filtering, group collapse, and viewport width changes. An edge is only shown if both endpoint tasks are visible in the same filtered data scope and time range. Hovering or selecting an endpoint highlights the related connectors. Connections do not imply a release commitment, a critical path or a validated dependency.
5. **Inspector**: predecessors and successors are accessible buttons. Clicking a dependency selects the corresponding task, removes filters that hide it, expands its group, and scrolls the Gantt viewport to the task if necessary. Inspector navigation does not mutate fixtures.
6. **Responsiveness and accessibility**: fixed-width axis remains scrollable; inspector is an overlay drawer on smaller screens. Buttons have focus rings; reduced-motion CSS removes decorative movement; all connections are additionally represented as text buttons for non-visual access.

## Non-goals / limitations

- This is a **read-only public projection**, not an internal editable project-management UI: no moving bars, changing dates, changing dependencies or updating statuses by dragging.
- No critical-path computation, baseline comparisons, resource leveling or production release-state assertions.
- No server APIs or private GitHub repository access.
- The synthetic reference line is a fixed snapshot date `2026-11-16`; it is not a live clock.
- Window navigation intentionally does not update the browser URL or persisted user preferences yet.
- Mouse/pen background panning does not override native touch scrolling.

## Verification performed in assistant environment

- `npm run check:fixtures`: PASS.
- `npm run check:style`: PASS.
- `npm run check:gantt`: PASS (month conversion, incomplete quarters, interval clipping, cross-group edges, invalid ranges and collapsed/missing dependencies).
- Global `tsc --strict --noEmit` on isolated pure calendar module: PASS.
- Vue script syntax transpilation with global TypeScript: PASS.
- Vue template tag structure and CSS parsing: PASS.
- **Full Astro build / real Vue hydration / browser interaction: NOT VERIFIED**. The environment cannot resolve npm registry, and browser navigation was blocked by administrator policy. Confirm locally under Node >=22.23.4. The static standalone visual HTML is not a substitute for a compiled Vue test.

## Local acceptance checklist

```powershell
npm install
npm run build
npm run check:roadmap
npm run check:site
npm run check:fonts
npm run check:gantt
npm run build
npm run dev
```

In the browser check: month/quarter; each preset; valid/invalid custom ranges; horizontal pan with mouse, touch swipe, wheel/trackpad and keyboard; on/off dependencies; project filter; collapse; inspector predecessor and successor navigation; close drawer with Escape; and reduced motion. Test narrow widths (~390px), a standard laptop (~1366px) and a wide monitor (~2560px). No GitHub Actions or public deployment is required for local tests.
