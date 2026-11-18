# Roadmap V3.4 — Sidebar UI and focused controls

The four canonical views move into the **existing left project rail**, above a separate project filter group. Desktop uses vertical links with `aria-current=page`; mobile uses a native disclosure selector above the project chip scroller. Top horizontal view tabs and their overflow-arrow control are removed, leaving the familiar four public URLs unchanged.

The previous full-width `VERIFIED PUBLIC RECORDS` notice is replaced by a compact, accessible disclosure inside the global workstation header. The full bilingual caveat remains readable by opening that disclosure. A hidden page heading retains screen-reader structure while the visual page number/title/explanation boilerplate is removed; search and Gantt controls remain available in a compact toolbar.

The double focus outline was caused by a parent `.ws-search:focus-within` indicator plus the generic `input:focus-visible` rule. The inner searchbox outline is now suppressed only when it has the accessible parent focus border; other links, buttons and month fields retain visible focus indication.

Existing public data and product release gates are untouched by this UI subchange.
