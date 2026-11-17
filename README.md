# PROTORHEXIS Public Roadmap — Engineering Workstation V2.3 (Gantt Interaction)

Framework: Astro 7 + Vue 3 + TypeScript + unplugin-icons. Static output with canonical URLs for GitHub Pages (`protorhexis.com`).

## Site structure

- `/` — institutional site **under construction**, with engineering-page links. It is deliberately not styled as the eventual institutional homepage.
- `/roadmap/` — full-width **Gantt schedule**. Tasks are grouped by project; controls offer project filtering, search, zoom, date shifting, expand/collapse, and click-through detail inspector. A planning window is **not** a release commitment.
- `/roadmap/board/` — **release-stage Kanban**. Cards are grouped by publication phase, not raw Issue state; selecting a card opens the inspector. This is a read-only public view, not a workflow editing interface.
- `/roadmap/evidence/` — **activity and evidence timeline**. Events are ordered chronologically, filtered by type, with details and provenance state. No synthetic event is evidence.
- `/roadmap/systems/` — secondary **system overview**.

### Design direction

Workstation-style, dense, full-width horizontal layout with a fixed project index, central visualization, and detail inspector (drawer on smaller screens). Derived from `talos-knowledge/talos/ui-system/industrial-avant-ui/` with site-specific override **NO HARD SHADOWS**. Base colors `#0D0D0F`, `#161618`, `#1E1E22`, `#252528`; accent `#FF453A`; Space Mono + Inter fallbacks; reduced-motion support and keyboard-focus affordances.


## V2.2 visual revision — Modern SaaS / Continuous Surface

This release **preserves the V2.1 layout and functionality** and adds a dedicated public-roadmap styling layer in `src/styles/workstation-refinements.css`. Visual changes:

- Keep the entire workstation full-bleed; no blog-width wrapper and no oversized marketing hero.
- Replace hard edge-to-edge splits with a narrow 9–14px gutter and individually rounded project rail, Gantt workspace, and inspector.
- Use nested, continuous corner hierarchy: large panels 18px, cards/controls 14px, compact controls 11px, labels 8px; `corner-shape: squircle` only as supported browser progressive enhancement. Standard `border-radius` is the fallback in unsupported engines.
- Red remains an active/focus signal; no soft shadows, hard shadows, glow, glassy data cards, or continuously moving decorative effects.
- Gantt bars use rounded capsule ends, board columns have rounded lane shells, cards have gentler active feedback, and evidence events span the available work area instead of a centered narrow column.
- Small-screen inspector gets a dismissible scrim, Escape shortcut, and keyboard focus restoration.
- Styling changes are Roadmap-site-local. They **do not** amend the Industrial Avant UI canonical specification.

The stand-alone `V2.3-visual-preview.html` is a visual-only HTML rendition, **not** a compiled Astro/Vue browser test. It includes clearly identified invented fixtures.

### Verification

```powershell
npm install
npm run check:fixtures
npm run check:style
npm run check:gantt
npm run build
npm run dev
```

The three `check:` scripts run without npm dependencies (the Gantt checker uses Node type-stripping). The Astro build must be checked on a supported Node.js environment (>=22.23.4). Until that succeeds, treat this as a source candidate, not a production-ready build.

## V2.3 interaction revision

Full-width schedule gains **pointer panning on the empty track**, **6/12/24-month and custom month windows**, **month/quarter calendar-aware ticks**, **filtered dependency connectors**, and **bidirectional inspector task navigation**. This is a read-only public UI; dragging does not edit dates or dependencies. The selected bar or inspector dependency can be followed without losing the current project context.

- Calculations live in `src/lib/gantt.ts` and are checked independently using `npm run check:gantt`.
- The dependency overlay honors collapsed groups and hidden tasks; it never draws cross-filter phantom connections.
- Visual rules from V2.2 remain active, including continuous corners and **no shadows**.
- All displayed task dates and events are **fictional UI fixtures**.
- The included `V2.3-visual-preview.html` is a **static visual reference**, not the compiled interactive app.

See [`docs/WORKSTATION-V2.3-INTERACTIONS.md`](docs/WORKSTATION-V2.3-INTERACTIONS.md) for acceptance tests and known limitations.

## Critical disclosure

`src/data/workstation-demo.ts` is **entirely invented**, including all dates, statuses, tasks and events. An always-visible "DEMONSTRATION DATA" label is included; **do not mistake the preview for actual project progress**.

Before any actual public release, replace the fixture with a **reviewed public feed**, implement a strict publication allowlist and provenance verification, and verify the domain/Pages configuration. Never fetch private repository API tokens, GitHub credentials, or private Issue bodies in client-side JavaScript.

## Local development

Requires Node.js `>=22.23.4` (Node 24 LTS recommended):

```bash
npm install
npm run check:fixtures
npm run check:style
npm run dev
npm run build
npm run preview
```

`dist/` is the pre-built static site. Do not put it in the source PR or trigger GitHub Actions until deployment authorization and a successful build/test review.

## Build verification

Source structure and fixture validation can be checked statically. This environment does not have registry access or Astro dependencies, so **npm build has not been verified here**. Run `npm install && npm run check:fixtures && npm run build` under a supported Node version in your own environment before merging; commit the locally generated `package-lock.json` for reproducible subsequent `npm ci` builds.

## GitHub deployment policy

Do not merge, deploy, or enable Actions automatically. The organization repository is `PROTORHEXIS/PROTORHEXIS.github.io`; use the existing `feat/astro-vue-engineering-roadmap-v0` branch for a Draft PR after completing local verification.

## Iconify policy (approved by site owner)

Priority: **Material Line Icons (`line-md`)** for animated interaction feedback; **Material Symbols (`material-symbols`)** for static semantics, missing icons and reduced-motion fallbacks; **Fluent UI System Icons (`fluent`)** only for specialty affordances. Other starred collections remain allowed only for specific, meaningful tasks rather than general UI controls. The primary workstation still has no hard-offset shadows.

Implementation uses `unplugin-icons` with locally installed `@iconify-json/{line-md,material-symbols,fluent}` and `compiler: 'vue3'`. This is **build-time icon generation, not runtime Iconify API fetching**. `EngineeringIcon.vue` centralizes the semantic mapping. Animated line icons are one-shot feedback; do not add `*-loop` to ordinary buttons or put animations on continuously visible data tables. Reduced-motion users receive non-animated Material Symbols equivalents for animated icons.

Important: replacing an animated SVG with a static SVG on client mount is a client-side accessibility fallback; validate this behavior in a real browser, including Chrome/Edge and Safari, before final signoff.

Local validation on Windows after Node update:

```powershell
npm install
npm run check:fixtures
npm run build
npm run dev
```

This package has not passed a full `npm install` / Astro build in the assistant runtime (registry unavailable). The repository source branch is not modified by this local artifact; no merge/deploy/Actions occurred.


## V2.8 — Precision and navigation

- One production Gantt routing algorithm: shared trunks for forward links and compact edge exits with obstacle-aware channels for overlapping schedules.
- Terminal arrowhead aligns exactly with the SVG path endpoint; dependency branches use butt caps.
- Event hover animates the event card only, without moving timeline dates or axis markers.
- Brand image is a replaceable placeholder at `public/brand/mark.svg`.
- Internal links to the unfinished institutional homepage (`/`) are removed; direct URL still serves its construction screen.
- `npm run check:v28` and Chromium E2E tests protect these invariants.
