# Public notice interaction contract (preview candidate)

This version is **not deployed**. It is a UI-only candidate for owner review.

The reviewed-data `PARTIAL` notice has two modes without changing its bilingual content:

1. **Transient hover:** `pointerenter` of fine pointing device opens; moving from trigger to its panel (across the 8 px visual gap) retains it open; `pointerleave` of the whole notice closes it. Touch does not synthesize this state.
2. **Pinned click:** clicking or keyboard-activating the native summary pins the notice open. It remains open when the pointer leaves and closes on an outside pointerdown, focus move outside, Escape, or a second trigger activation.

`<details><summary>` remain native for semantics and script-failure fallback. The client script prevents native toggle only for the clicked summary once hydrated, preserving the hover→pinned transition. One source script is loaded by the shared EngineeringLayout across all four roadmap routes; the CSS remains isolated to workstation V3.4. No global loading or website data changes.

Playwright checks cover desktop hover + interstitial gap, pinned click, outside dismissal, click toggle, keyboard/ Escape, focus-out, and touchscreen click.

## Follow-up: animation and variable-height Gantt

The disclosure now animates in with opacity + a 7px upward offset, then out
with a 150ms opacity/5px upward exit. The closing state delays removal of
`details[open]` only until this short transition ends, and new hover events
cancel pending closing timers. Reduced-motion closes immediately.

An unrelated layout regression was identified from the user screenshot:
`.gantt-viewport` had `flex:1` and `min-height:485px`, producing an
apparently empty row underneath the last work item. The viewport now
uses intrinsic height when short, with a viewport-relative maximum only
for long lists. No work row heights or dependency layout calculations changed.
Testing covers one item, empty results, collapsed groups and long scroll.
