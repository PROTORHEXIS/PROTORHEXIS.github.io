/**
 * Reviewed-public-data disclosure. Two interaction modes:
 * hover is transient; click/keyboard activation is pinned.
 * A short closing phase retains <details open> long enough to animate the
 * contents out without interrupting clicks or keyboard focus elsewhere.
 */
const headerNotice = document.querySelector<HTMLDetailsElement>('.ws-header-notice');
if (headerNotice) {
  const notice = headerNotice;
  const trigger = notice.querySelector<HTMLElement>('summary');
  if (trigger) {
    type Mode = 'closed' | 'hover' | 'pinned' | 'closing';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const CLOSE_MS = 150;
    let pinned = false;
    let closeTimer: number | undefined;

    function cancelPendingClose() {
      if (closeTimer !== undefined) {
        window.clearTimeout(closeTimer);
        closeTimer = undefined;
      }
    }

    function setMode(mode: Mode) {
      notice.open = mode !== 'closed';
      notice.dataset.mode = mode;
    }

    function open(mode: 'hover' | 'pinned') {
      cancelPendingClose();
      pinned = mode === 'pinned';
      setMode(mode);
    }

    function dismiss() {
      cancelPendingClose();
      pinned = false;
      if (!notice.open) {
        setMode('closed');
        return;
      }
      if (reduceMotion.matches) {
        setMode('closed');
        return;
      }
      // Animate the popover out before finally clearing the native open state.
      setMode('closing');
      closeTimer = window.setTimeout(() => {
        closeTimer = undefined;
        if (notice.dataset.mode === 'closing') setMode('closed');
      }, CLOSE_MS);
    }

    setMode(notice.open ? 'pinned' : 'closed');
    pinned = notice.open;

    notice.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (!pinned) open('hover');
    });

    notice.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (!pinned) dismiss();
    });

    trigger.addEventListener('click', event => {
      event.preventDefault(); // Keep native toggle from undoing hover -> pin.
      if (pinned) dismiss();
      else open('pinned');
    });

    document.addEventListener('pointerdown', event => {
      if (notice.open && !notice.contains(event.target as Node)) dismiss();
    }, {capture: true});

    document.addEventListener('focusin', event => {
      if (pinned && !notice.contains(event.target as Node)) dismiss();
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !notice.open) return;
      const restoreFocus = notice.contains(document.activeElement);
      event.preventDefault();
      dismiss();
      if (restoreFocus) trigger.focus();
    });
  }
}
