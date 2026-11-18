# Site-wide orbital mask loading gate (2026-11-18)

**Source:** owner-uploaded `TALOS_Operations_Canvas_Demo_loading_orbital_mask_fixed (1).html`. The implementation preserves its core behavior (two diagonal full-viewport `clip-path:polygon(...)` slabs, dark seam guard, faint grid, cover/exit sequence) but replaces the page-specific TALOS title, ETA, tenant labels and simulated percentage with a **single shared PROTORHEXIS SVG logo above a thin progress bar**.

The source demo uses a GSAP CDN and a randomized 2.5–30-second synthetic progress plan. The public site uses native Web Animations API and **does not load GSAP** or fabricate numerical completion. While the browser is actually loading or Astro islands are hydrating, the progress bar is indeterminate; it becomes full only once the page is ready, then the diagonal mask exits. A bounded timeout and in-head watchdog prevent a broken asset from locking the site.

Integration is centralized in `BaseLayout.astro`, through `SiteLoadingGate.astro`, `site-loading.css` and `site-loading.ts`; home, 404 and the four roadmap views inherit it. Internal same-origin link clicks use a cover animation before browser navigation, and the destination's own mask reveals the ready page. External links, modified clicks, downloads, API links and same-page hash navigation are untouched. No client-side router, history rewrite, infinite loading loop, private repository source, cookie or new third-party dependency is introduced.

Accessibility: accessible progressbar with no fake `aria-valuenow`, `aria-hidden` when inactive, `aria-busy` only while active, reduced-motion support, back-forward cache recovery, and a 11-second emergency fail-safe.

Tests cover all six HTML routes, canonical 20-vector SVG geometry, visual order (logo over progress), readiness dismissal, internal navigation and reduced-motion behavior on desktop and mobile.
