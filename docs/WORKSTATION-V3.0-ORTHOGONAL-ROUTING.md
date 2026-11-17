# V3.0 — fixed-port orthogonal dependency routing

Status: synthetic public UI / engineering preview. Does not describe confirmed product dependencies.

## Non-negotiable port geometry
- Every relation starts on the source bar's **rightmost side at its row center**.
- All relations from the same source share a single 14px, right-facing exit segment.
- Every relation enters the successor from the **left**, finishing with an eastbound segment.
- This holds even if the source schedule overlaps or ends after the target starts.
- Arrow marker has 8px of forward projection from the *actual stroke endpoint*; the tip is 6px before the target left edge. `markerUnits=userSpaceOnUse`, `refX=1`, tip coordinate at 9. The branch stroke is butt-capped.

## Router
A finite rectilinear visibility-grid Dijkstra search uses task bars padded by 7px horizontal, 19px vertical as obstacles. State includes last heading; cost is lexicographic `(number of turns, route length)`, not ordinary Euclidean or Manhattan path length alone.

To prevent the “globally fewest bends but chart-wide U-turn” failure, candidate cells are first searched within a 150px horizontal envelope of the source exit and target entry. Widen only if that envelope contains no feasible route (`240px`, `400px`, entire timeline fallback). The optimality claim is therefore **within the first feasible bounded search**, not unrestricted global bend optimality.

Intermediate corners are rounded by at most 4px only AFTER the collision-free route is calculated. Consecutive collinear segments are removed before styling.

## Runtime
Route geometry recomputes on date, visibility, bar width or layout changes. Hover and focus only update emphasis and must not rerun the pathfinder. No A/B switch and no browser-stored routing preference.

## Regression gates
- Source right-face port and shared exit; target left-face tip with 8px arrow projection.
- Last tangent has positive X direction.
- No unrelated-bar collisions.
- Two-bend forward case, overlap case with four total turns (one exit + three in branch), bounded cross-program route.
- Desktop/mobile Chromium, SSR hydration, scrolling, and visibility toggle.
