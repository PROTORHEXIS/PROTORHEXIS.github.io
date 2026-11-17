# Roadmap V2.9 — Single production dependency router

Decision: retire route A and remove the A/B UI, persisted `localStorage` setting, A path generator, obsolete visual switch CSS and its associated comparison tests. The remaining algorithm derives from route B and does not expose mode selection.

## Screenshot-driven geometry correction

The V2.8 screenshot exposed two artifacts on overlapping demo dates: (1) a right-end dogleg from a predecessor bar, and (2) a long left-edge U-turn before entering a successor. In a finish-to-start representation, a successor whose planning bar starts to the left of the predecessor finish cannot be connected from its right end with a short forward-pointing arrow without a detour.

**Policy:** Normal non-overlapping successors keep the 22px shared right-hand exit trunk. Overlapping or very narrow-gap successors exit directly from the predecessor task's bottom or top edge at an x near the successor's left-entry lane. A deterministic bounded dynamic program chooses allowed x-lanes for each intermediate row while switching lanes only in the gutter between task bars. The path ends at x = successor.start - 6px, approached left-to-right. The first and last bends are rounded 5px and redundant collinear points are removed.

We intentionally do **not** invent new task dates to hide routing conflicts. The illustrated schedules remain synthetic demo fixtures. The single router is read-only and geometry is stable on hover or selection.

## Qualification

- Source tests assert the removal of A, UI switch, storage key and obsolete CSS.
- Chromium 1440×900 and 390×844 verifies: no opposite-end round trips, overlapping source bar-edge anchors, positive-X final arrow, all task bars remain clear on the example `TAL-02 > TES-02`, visibility toggle still works, four views hydrate without JavaScript errors.
- No merge/deploy unless exact PR head passes GitHub Actions and captured screenshots are visually reviewed.
