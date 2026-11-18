# Public notice interaction contract (preview candidate)

This version is **not deployed**. It is a UI-only candidate for owner review.

The reviewed-data `PARTIAL` notice has two modes without changing its bilingual content:

1. **Transient hover:** `pointerenter` of fine pointing device opens; moving from trigger to its panel (across the 8 px visual gap) retains it open; `pointerleave` of the whole notice closes it. Touch does not synthesize this state.
2. **Pinned click:** clicking or keyboard-activating the native summary pins the notice open. It remains open when the pointer leaves and closes on an outside pointerdown, focus move outside, Escape, or a second trigger activation.

`<details><summary>` remain native for semantics and script-failure fallback. The client script prevents native toggle only for the clicked summary once hydrated, preserving the hover→pinned transition. One source script is loaded by the shared EngineeringLayout across all four roadmap routes; the CSS remains isolated to workstation V3.4. No global loading or website data changes.

Playwright checks cover desktop hover + interstitial gap, pinned click, outside dismissal, click toggle, keyboard/ Escape, focus-out, and touchscreen click.
