# Roadmap V3.5 / continuous surface and inspector preview

Scope: public-workstation UI only, continuing Draft PR #18. **NO MERGE / NO DEPLOY** pending owner review.

The three outer surfaces form a continuous edge-to-edge workstation: left project rail touches the left side of the workspace, main panel is directly adjacent, and inspector touches the right side when open. Only the outer panes lose corner radii, gaps and inset padding. All internal card, navigation-button, tool, popover and form radii are retained.

The inspector starts *closed and truly unselected*, not prepopulated with the first public record. The right wall carries a slim vertical rounded tab with a left arrow. Hover changes opacity; click opens the inspector with a width + opacity transition on desktop and sliding drawer on narrow devices. The tab moves with the inspector boundary and switches to a right arrow when open. Manual opening without selection shows only a centered bilingual instruction: **请选择一个项目以显示内容**. Selecting an actual work record or a system graph node auto-opens its details. Closing preserves a previously selected item so reopening restores it.

The mobile inspector keeps its existing scrim, Escape dismissal and keyboard focus behavior. Reduced-motion users get the same controls without transitions. Existing disclosure hover/pin animation, Gantt height fix and public-data/release Gate protections remain unchanged.
