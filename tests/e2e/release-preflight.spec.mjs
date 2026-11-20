import { test, expect } from '@playwright/test';

/*
 * Dedicated release-preflight suite for the regressions reported in V3.6.1–V3.6.4.
 * Intentional negative control injects +56px into CSS in a test-only page,
 * proving that the browser geometry check would detect the original bug.
 * This never writes to the public source or approved data snapshot.
 */
async function geometry(page) {
  return page.evaluate(() => {
    const box = selector => document.querySelector(selector)?.getBoundingClientRect() ?? null;
    const view = document.querySelector('.gantt-viewport');
    const canvas = view.querySelector('.gantt-canvas');
    const mask = canvas.querySelector('.gantt-label-mask');
    const rect = mask.getBoundingClientRect();
    const pseudo = getComputedStyle(mask, '::after');
    const maskStyle = getComputedStyle(mask);
    const last = canvas.querySelector('.gantt-row:last-of-type');
    const canvasRect = canvas.getBoundingClientRect();
    const viewRect = view.getBoundingClientRect();
    const pane = box('.ws-primary'), legend = box('.ws-chart-foot');
    return {
      maskTop: rect.top + Number.parseFloat(pseudo.top),
      maskBottom: rect.top + Number.parseFloat(pseudo.top) + Number.parseFloat(pseudo.height),
      maskHeight: Number.parseFloat(pseudo.height),
      maskWidth: Number.parseFloat(pseudo.width),
      maskLeft: rect.left, stickyTop: maskStyle.top,
      labelWidth: box('.gantt-head-name')?.width,
      labelLeft: box('.gantt-head-name')?.left,
      canvasTop: canvasRect.top, canvasBottom: canvasRect.bottom, canvasHeight: canvasRect.height,
      lastBottom: last?.getBoundingClientRect().bottom ?? null,
      rows: canvas.querySelectorAll('.gantt-row').length,
      viewportTop: viewRect.top, viewportBottom: viewRect.bottom, viewportLeft: viewRect.left,
      viewportHeight: viewRect.height,
      scrollTop: view.scrollTop, scrollLeft: view.scrollLeft,
      scrollHeight: view.scrollHeight, clientHeight: view.clientHeight,
      paneBottom: pane.bottom, legendTop: legend.top, legendBottom: legend.bottom,
      rootHeight: box('.ws-root').height,
      documentHeight: document.documentElement.scrollHeight,
      browserHeight: window.innerHeight
    };
  });
}
const closeEnough = (a, b, tolerance = 2.5) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tolerance);

function assertRealRows(g) {
  expect(g.stickyTop).toBe('auto');
  expect(g.maskHeight).toBeGreaterThan(0);
  closeEnough(g.maskTop, g.canvasTop);
  closeEnough(g.maskHeight, g.canvasHeight);
  closeEnough(g.maskBottom, g.canvasBottom);
  if (g.rows > 0) closeEnough(g.lastBottom, g.canvasBottom);
  closeEnough(g.paneBottom, g.legendBottom, 3.5);
  closeEnough(g.viewportBottom, g.legendTop, 3.5);
}

test('release-preflight: single-task mask has zero phantom pixels and a +56px mutation is detected', async ({ page }) => {
  await page.goto('/roadmap/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const search = page.locator('.ws-header .ws-search input');
  await search.fill('TAL-PROGRESS-001');
  await expect(page.locator('.gantt-row')).toHaveCount(1);
  const original = await geometry(page);
  assertRealRows(original);
  expect(original.maskHeight).toBeLessThan(200);
  expect(original.viewportBottom - original.canvasBottom).toBeGreaterThan(30);

  // Fault-injection control: the exact V3.6.3 duplicate-header-height bug.
  await page.locator('.gantt-canvas').evaluate(canvas => {
    canvas.style.setProperty('--gantt-masked-height',
      String(Math.round(canvas.getBoundingClientRect().height) + 56) + 'px');
  });
  const mutated = await geometry(page);
  expect(mutated.maskBottom - mutated.canvasBottom).toBeGreaterThan(52);
  expect(mutated.maskBottom - mutated.canvasBottom).toBeLessThan(60);
  await page.locator('.gantt-canvas').evaluate(canvas =>
    canvas.style.removeProperty('--gantt-masked-height'));
  assertRealRows(await geometry(page));
  await page.screenshot({
    path: 'test-results/preflight-single-' + test.info().project.name + '.png',
    animations: 'disabled'
  });

  // Follow-up states once showed a phantom tail under the final row.
  await page.locator('.gantt-group').first().click();
  await expect(page.locator('.gantt-row')).toHaveCount(0);
  const folded = await geometry(page);
  expect(folded.maskBottom - folded.canvasBottom).toBeLessThanOrEqual(3);
  closeEnough(folded.paneBottom, folded.legendBottom, 3.5);
  await search.fill('UNKNOWN_RECORD_PREDEPLOY_000');
  await expect(page.locator('.ws-no-results')).toBeVisible();
  const empty = await geometry(page);
  expect(empty.maskBottom - empty.canvasBottom).toBeLessThanOrEqual(3);
  closeEnough(empty.paneBottom, empty.legendBottom, 3.5);
});

test('release-preflight: all-program frozen left column and legend survive double-axis scrolling', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto('/roadmap/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect.poll(() => page.locator('.gantt-row').count()).toBeGreaterThan(4);
  const viewport = page.locator('.gantt-viewport');
  const initial = await geometry(page);
  assertRealRows(initial);

  await viewport.evaluate(el => {
    el.scrollLeft = 430;
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(300);
  const after = await geometry(page);
  assertRealRows(after);
  closeEnough(after.maskLeft, after.viewportLeft, 3.5);
  closeEnough(after.labelLeft, after.viewportLeft, 3.5);
  closeEnough(after.maskWidth, after.labelWidth, 2.5);
  if (initial.scrollHeight > initial.clientHeight + 60) {
    expect(after.scrollTop).toBeGreaterThan(50);
    expect(after.maskTop).toBeLessThan(after.viewportTop - 30);
  } else {
    // An exact-fit mobile canvas must not gain a fake scroll row.
    expect(after.scrollHeight - after.clientHeight).toBeLessThanOrEqual(60);
  }

  const dependencies = page.locator('.gantt-dep-toggle');
  const pressed = await dependencies.getAttribute('aria-pressed');
  await dependencies.click();
  await expect(dependencies).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true');
  assertRealRows(await geometry(page));
  await dependencies.click();
  await expect(dependencies).toHaveAttribute('aria-pressed', pressed);
  assertRealRows(await geometry(page));
  await page.screenshot({
    path: 'test-results/preflight-scrolled-' + test.info().project.name + '.png',
    animations: 'disabled'
  });
});

test('release-preflight: inspector collapse and resizing preserve chart height, handle and footer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile uses a separate fixed modal drawer, covered by existing browser tests');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/roadmap/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const search = page.locator('.ws-header .ws-search input');
  await search.fill('TAL-PROGRESS-001');
  await expect(page.locator('.gantt-row')).toHaveCount(1);
  const state = () => page.evaluate(() => ({
    gridHeight: document.querySelector('.ws-content-grid').getBoundingClientRect().height,
    handleTop: document.querySelector('.ws-inspector-handle').getBoundingClientRect().top,
    footerTop: document.querySelector('.ws-footer').getBoundingClientRect().top,
    documentHeight: document.documentElement.scrollHeight
  }));
  const before = await state();
  const initialChart = await geometry(page);
  assertRealRows(initialChart);
  await page.locator('.gantt-item-name').first().click();
  const grid = page.locator('.ws-content-grid');
  const inspector = page.locator('#roadmap-inspector');
  const handle = page.locator('.ws-inspector-handle');
  await expect(grid).toHaveAttribute('data-inspector-open', 'true');
  await expect(inspector).toHaveAttribute('aria-hidden', 'false');
  await expect(inspector).toContainText('TAL-PROGRESS-001');
  await expect.poll(() => inspector.evaluate(el => el.getBoundingClientRect().width))
    .toBeGreaterThan(300);
  assertRealRows(await geometry(page));
  await handle.click();
  await expect(grid).toHaveAttribute('data-inspector-open', 'false');
  await expect(inspector).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(async () => Math.abs((await state()).gridHeight - before.gridHeight))
    .toBeLessThan(4);
  const after = await state();
  closeEnough(after.gridHeight, before.gridHeight, 4);
  closeEnough(after.handleTop, before.handleTop, 4);
  closeEnough(after.footerTop, before.footerTop, 4);
  closeEnough(after.documentHeight, before.documentHeight, 5);
  assertRealRows(await geometry(page));

  const initialViewportHeight = initialChart.viewportHeight;
  for (const [width, height] of [[1100, 680], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const g = await geometry(page);
    assertRealRows(g);
    expect(g.viewportHeight).toBeGreaterThan(260);
    expect(g.documentHeight).toBeLessThanOrEqual(height + 6);
  }
  const big = await geometry(page);
  expect(big.viewportHeight).toBeGreaterThan(initialViewportHeight + 80);
  await handle.click();
  await expect(inspector).toHaveAttribute('aria-hidden', 'false');
  assertRealRows(await geometry(page));
});
