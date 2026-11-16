# Public Engineering Workstation V2 — Design Contract

## Intent

The public engineering area is a dense, full-width workstation, not a blog, landing page, internal admin panel, or fictional status dashboard. Preserve the PROTORHEXIS brand and the Industrial Avant UI design language while leaving the forthcoming institutional website's glass-and-motion aesthetic independent.

## Three primary views

| Surface | URL | Primary question | Interactions | Must never imply |
| --- | --- | --- | --- | --- |
| Gantt schedule | `/roadmap/` | When is a work package planned and what does it depend on? | Per-project grouping, collapse/expand, search, schedule zoom, temporal window movement, details | Release date commitment |
| Release board | `/roadmap/board/` | What publicly reviewed delivery stage is a deliverable in? | Status columns, filters, card inspector, stage counts | An internal issue being closed means released |
| Activity timeline | `/roadmap/evidence/` | What actually changed, when and on what public evidence? | Chronological listing, event kinds, project filters, provenance detail | A synthetic/example event is a genuine verification |

Secondary system map: `/roadmap/systems/`, not a fourth competing tracking view.

## Layout

- Desktop: Header + view navigation + command toolbar, then `project index | full-width working view | inspector`, plus a compact status strip.
- No general `max-width` container on the engineering working surface.
- Gantt and Kanban use horizontal scrolling when content extends beyond the viewport; do not shrink time scale or card content into unreadability.
- On narrow screens, project index becomes a horizontally scrollable strip and inspector becomes a drawer. Accessibility and focus remain meaningful without animation.

## Visual rules

- Background `#0D0D0F`; surface `#161618`; elevated `#1E1E22`; field `#252528`; structural line `#2A2A2E`; interactive signal `#FF453A`.
- Red marks the current view, selection, focused path, or critical marker. Red is **not** the default fill for all cards or progress bars.
- No hard-offset shadows and no soft shadows on engineering pages. Boundaries use lines, opaque surfaces, typography, spacing.
- Components respect `prefers-reduced-motion` and visible keyboard focus. Text labels convey state without relying on color.
- Space Mono used for structural IDs, headings and time axis; Inter used for prose and dense reading. Fallback fonts remain usable.

## Publication rules

Demo fixtures include fabricated project names, work items, dates, stages and events. They serve only to inspect presentation/interaction, and **must not** be reported as engineering facts. Future public snapshots require explicit approved fields, review, lineage and a distinction between plan windows, verified progress and release commitments. Prevent private GitHub tokens and private data from entering a browser bundle.

## Release gates

Do not enable Pages, merge into `main`, or run Actions based solely on source/static checks. First conduct a real Node/Astro production build plus browser QA, accessibility checks and public-data review.
