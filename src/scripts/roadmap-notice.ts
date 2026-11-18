/**
 * Navbar disclosure has two deliberate interaction modes:
 * - Pointer-hover: transient; closes when the pointer leaves both trigger and panel.
 * - Click/keyboard activation: pinned; closes on outside pointer interaction,
 *   moving keyboard focus outside, Escape or activating the trigger again.
 *
 * Keep the native <details>/<summary> for accessible semantics and script-failure
 * fallback. The summary's native click toggle is suppressed only after binding,
 * so a hovered disclosure can be promoted to pinned without closing.
 */
const notice = document.querySelector<HTMLDetailsElement>('.ws-header-notice');
if (notice) {
  const trigger = notice.querySelector<HTMLElement>('summary');
  if (trigger) {
    let pinned = false;
    let hovered = false;

    function sync(mode: 'closed' | 'hover' | 'pinned') {
      notice!.open = mode !== 'closed';
      notice!.dataset.mode = mode;
    }
    function dismiss() {
      pinned = false;
      hovered = false;
      sync('closed');
    }

    notice.dataset.mode = notice.open ? 'pinned' : 'closed';

    notice.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovered = true;
      if (!pinned) sync('hover');
    });
    notice.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovered = false;
      if (!pinned) sync('closed');
    });

    trigger.addEventListener('click', event => {
      event.preventDefault(); // Do not let the native summary toggle undo pinned state.
      if (pinned) {
        dismiss();
      } else {
        pinned = true;
        sync('pinned');
      }
    });

    document.addEventListener('pointerdown', event => {
      if (!notice.contains(event.target as Node) && notice.open) dismiss();
    }, {capture: true});

    document.addEventListener('focusin', event => {
      if (pinned && !notice.contains(event.target as Node)) dismiss();
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !notice.open) return;
      const hadInternalFocus = notice.contains(document.activeElement);
      event.preventDefault();
      dismiss();
      if (hadInternalFocus) trigger.focus();
    });
  }
}
