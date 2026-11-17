# Roadmap V3.3 UI corrections (2026-11-18)

- Six public delivery stages remain in **one horizontal row**. The stage count and minimum width are derived from the actual `stages` array, not a hard-coded five-column grid. Published is the rightmost stage, reachable by horizontal scroll and the board navigation controls.
- The Vue Flow graph is driven by `publicSnapshot.relations`. Four `contains` edges are approved *organizational grouping* of public project entries under PROTORHEXIS. They do **not** claim runtime API integration, authority delegation, dependencies, or product release qualification. Future integration edges still require independently reviewed technical sources.
- The user-provided symbol+English lockup replaces the old header icon plus HTML brand text. Original SVG vectors remain inline and inherit `currentColor` controlled by CSS, including hover and mobile size. The text `ENGINEERING INTERFACE` is no longer rendered in the header.
- Tests cover row positioning and rightmost scrolling on desktop/mobile, four visible Vue Flow paths, sanitized public evidence constraints, and the CSS-colored inline SVG.
- Public roadmap release CI is required on the exact final website PR source revision. TALOS/MAXWELL/THOULESS/TESSERACT product Git branches and HOLDs are outside this change.
