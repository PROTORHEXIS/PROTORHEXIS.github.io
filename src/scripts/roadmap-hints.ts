/** Accessibility-first overflow affordance for the horizontally scrollable view tabs.
 * No synthetic gestures: the native scroll remains the source of truth. */
const strip = document.querySelector<HTMLElement>('.ws-tabs');
const more = document.querySelector<HTMLButtonElement>('.ws-tabs-more');
if (strip && more) {
  const update = () => {
    const remaining = strip.scrollWidth - strip.clientWidth - strip.scrollLeft;
    const overflowing = strip.scrollWidth > strip.clientWidth + 4;
    more.hidden = !overflowing || remaining <= 4;
    more.disabled = more.hidden;
    strip.setAttribute('data-scrollable', overflowing ? 'true' : 'false');
  };
  more.addEventListener('click', () => {
    strip.scrollBy({
      left: Math.max(118, Math.min(190, strip.clientWidth * .62)),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });
  strip.addEventListener('scroll', update, { passive: true });
  const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
  resize?.observe(strip);
  window.addEventListener('resize', update, { passive: true });
  requestAnimationFrame(update);
}
