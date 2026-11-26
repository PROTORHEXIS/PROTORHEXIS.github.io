# Roadmap V2.4 — Layer & Motion Contract

## Fixed issues
- `gantt-custom` previously used a normal absolute-positioned form inside `.ws-primary[overflow:hidden]` and could be cropped; now a teleported fixed popover is viewport-positioned, escape/outside-click dismissible, and focusable.
- Explicit local layer ranks: grid 0, today line 1, dependency 2, task bars 3, frozen name column 4, group headings 5, header 6. Canvas isolation ensures drawing order is stable while scrolling.
- Mobile inspector is inert when closed, traps Tab while open, locks background scrolling, restores focus when dismissed; desktop inspector remains docked.

## Motion specification
- `motion-v` is the Vue component animation layer. Inspector content uses 160ms opacity/translate, board cards 140ms ≤2px lift, activity entries 140ms ≤2px translation.
- Native View Transition progressive enhancement: tabs fade 95/145ms without blocking navigation.
- Popover uses a 150ms CSS fade with a 5px translate; Iconify `line-md` animation priority unchanged.
- No continuous animation, no animation on Gantt viewport scroll/pan, no shadows.
- `prefers-reduced-motion` disables movement and page fade.

## Build/check commands
Use the [current build and validation commands](../README.md#build-and-validation).

## Public data
Synthetic fixture only, no internal source has been copied. This patch does not change release readiness or project evidence.
