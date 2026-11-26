# V2.6 · Timeline, frozen Gantt label layer, and system graph

Status: candidate. No claim of actual PROTORHEXIS architecture topology.

## Evidence timeline

The event arrow now lives inside `.event-body` and is anchored relative to the card. The event grid has exactly three tracks (date, marker, content). A fourth external arrow track previously interacted badly with the three-track mobile rule and caused inconsistent row height/spacing. The arrow is kept visible on narrow screens.

## Gantt frozen labels and opaque shield

One CSS variable `--gantt-label-width` determines four correlated positions: `.gantt-head-name`, `.gantt-item-name`, `.gantt-label-mask`, and the left edge/width of `.gantt-dependency-layer`. JS measures the complete title strings of the full task set in the current language rather than measuring clipped DOM boxes. Desktop: 190–420 px. Narrow screens ≤740 px: cap at 36% of viewport (floor 108 px), ellipsize labels. This is a display width, not a change to the data or timeline dates.

The mask is an opaque sticky continuous column drawn beneath all label controls and above task bars/edges. It prevents colored bars and dependency paths from appearing through 1 px inter-row seams while horizontally panning. It does not capture pointer input.

## Diagram technology selection

- Astro: official Vue islands integration, no built-in full node/edge directed-graph runtime. Astro stays as the static site and Vue hydration boundary.
- PrimeVue OrganizationChart: table-based organization hierarchy with collapsible parent-child relationships and templated nodes. Insufficient for general many-to-many dependencies and graph pan/zoom interactions. Also would require a broad PrimeVue adoption for a single chart.
- Vue Flow (`@vue-flow/core` 1.x): dedicated typed nodes/edges, handles, pan/zoom, custom node rendering; a more suitable basis for future verified directed graphs. Chosen for a bounded, read-only proof of visualization. No Dagre/ELK is added while real topology is unavailable.

The demo illustrates PROTORHEXIS organizational grouping to TALOS, MAXWELL, THOULESS and TESSERACT. Edges DO NOT claim real software dependencies. The graph is loaded via dynamic `import()` only after Astro/Vue hydration finishes to avoid the V2.4 black-screen regression. A semantic fallback list remains available if the module fails to load. The inspector and program rail keep existing behavior.

## Verification

Use the [current build and validation commands](../README.md#build-and-validation); the historical version-specific checks have been retired. Chromium E2E must verify both breakpoints, all four routes, scroll mask geometry, event arrow contained, graph node+edge count and selection, and no page errors. Screenshots at 390 px and 1440 px are required. Merge/deploy only after PR checks pass.

### V2.6 browser-reported repairs

The first candidate proved 5 nodes and 4 edges rendered, but node clicks were intercepted by the Vue Flow pane when both dragging and node selection were disabled. Node container and button pointer events are explicitly re-enabled without permitting graph editing. The first candidate also clipped horizontally positioned nodes on a 390 px viewport. A mobile vertical graph layout is now used and the graph remounts/fits on media query changes; Playwright asserts every mobile node stays within the viewport.
