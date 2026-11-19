# Roadmap V3.5 / continuous surface and inspector preview

Scope: public-workstation UI only, continuing Draft PR #18. **NO MERGE / NO DEPLOY** pending owner review.

The three outer surfaces form a continuous edge-to-edge workstation: left project rail touches the left side of the workspace, main panel is directly adjacent, and inspector touches the right side when open. Only the outer panes lose corner radii, gaps and inset padding. All internal card, navigation-button, tool, popover and form radii are retained.

The inspector starts *closed and truly unselected*, not prepopulated with the first public record. The right wall carries a slim vertical rounded tab with a left arrow. Hover changes opacity; click opens the inspector with a width + opacity transition on desktop and sliding drawer on narrow devices. The tab moves with the inspector boundary and switches to a right arrow when open. Manual opening without selection shows only a centered bilingual instruction: **请选择一个项目以显示内容**. Selecting an actual work record or a system graph node auto-opens its details. Closing preserves a previously selected item so reopening restores it.

The mobile inspector keeps its existing scrim, Escape dismissal and keyboard focus behavior. Reduced-motion users get the same controls without transitions. Existing disclosure hover/pin animation, Gantt height fix and public-data/release Gate protections remain unchanged.

## Icon/handle reference refinement (2026-11-19)

The supplied screenshot established a **left-only rounded rectangular silhouette**, not a required final color or full-size dimension. After owner review, the visible tab was reduced from 29×220px to **29×44px (20% of its former painted area)**, while retaining an invisible **44×44px** button hit target for accessibility. Use the site's graphite `#29262a` fill and warm-red `#ff8a81` icon, with a slightly warmer dark hover surface and left-only 11px corner rounding. This applies on desktop and mobile. The center uses the locally bundled static Iconify `material-symbols:keyboard-double-arrow-left-rounded`; the same SVG rotates 180° for the open state. Hover still changes opacity and reduced-motion remains supported.

The **Gantt project group** disclosure arrow uses locally bundled static `material-symbols:keyboard-arrow-right` (a >-shaped chevron). No dynamic line-md icon or forced Vue remount remains for this location. CSS rotates it by 90° on expand and returns it to its original rightward direction on collapse. All other icons, dependency path arrowheads, group row geometry and public-data contracts remain unchanged. Reduced-motion turns off transitions, not the orientation of the icons.
