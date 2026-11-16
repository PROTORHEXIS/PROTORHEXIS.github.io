# Engineering Workstation V2.2 — Continuous Surface

## Scope

This is a **public Roadmap variant** based on the Industrial Avant UI design language. It does not modify TALOS UI canonical authority. Page width remains fully responsive and not constrained to an editorial max-width. Source data stays synthetic, visibly flagged, and not a release claim.

## Curvature

Use a consistent hierarchy rather than applying a large radius everywhere:

| Layer | Radius | Application |
|---|---:|---|
| App-level floating stage | 24px token | Reserved for larger overlay/stage use |
| Primary panes | 18px | Project rail, Gantt/board workspace, inspector |
| Functional surfaces | 14px | Search, segmented control, cards, warning blocks |
| Compact controls | 11px | Tabs, buttons, project rows |
| Micro affordances | 8px | Icon surface, small tokens, counts |
| Semantic pill | 999px | Status chips and compact counters |

`corner-shape:squircle` is used as a progressive enhancement only in browsers that support it. The standard `border-radius` values remain readable, stable fallbacks for Firefox and Safari. No SVG masking or JS shape reconstruction is used.

## Component distribution

- **Gantt / Schedule**: main default workspace, grid rails are still straight for precision; duration bars use capsule ends, with active red as a focus signal.
- **Release Board**: each stage has its own rounded lane shell. Cards use smaller nested radii. No drag-and-drop implication in a read-only public page.
- **Activity / Evidence**: chronological ordering preserved; the stream fills the width of its central pane, with selection state using border and surface changes.
- **System map**: cards share the same language but the map is informational only until real relationships are approved for public disclosure.
- **Inspector**: persistent desktop pane; on smaller screens a rounded drawer with scrim, dismiss by Escape/close/scrim; restore trigger focus.

## Interaction and motion

- Hover is ~140–150ms and limited to border/fill/1px displacement. No glow, looping effects, hard/soft shadows.
- Icon priority remains `line-md` > `material-symbols` > `fluent`, using the locally bundled Iconify compile-time system.
- Reduced-motion preference disables decorative displacement and transitions.

## Quality gate

Run `npm run check:fixtures` and `npm run check:style`. A supported Node.js runtime and an actual Astro build/browser pass are still required before merging and deployment. The reference HTML in the release package is visual-only, not a substitute for running Vue.
