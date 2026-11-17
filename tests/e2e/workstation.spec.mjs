import { test, expect } from '@playwright/test';

const routes = ['/roadmap/', '/roadmap/board/', '/roadmap/evidence/', '/roadmap/systems/'];
for (const route of routes) {
  test(`Astro hydration preserves the full workstation: ${route}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(page.locator('.ws-root')).toBeVisible();
    await expect(page.locator('.workbench')).toBeVisible();
    await expect(page.getByText('DEMONSTRATION DATA')).toBeVisible();
    await expect(page.locator('.ws-project-index')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(errors).toEqual([]);
    if (route === '/roadmap/' || route === '/roadmap/board/') {
      const label = route.includes('/board/') ? 'board' : 'schedule';
      await page.screenshot({ path: `test-results/v25-${label}-${test.info().project.name}.png`, fullPage: true, animations: 'disabled' });
    }
  });
}

test('date range overlay stays visible, Escape restores focus', async ({ page }) => {
  await page.goto('/roadmap/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /自定义|CUSTOM/ }).click();
  const floating = page.locator('.gantt-floating-range');
  await expect(floating).toBeVisible();
  const clipped = await floating.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1;
  });
  expect(clipped).toBe(false);
  await page.keyboard.press('Escape');
  await expect(floating).toHaveCount(0);
  await expect(page.getByRole('button', { name: /自定义|CUSTOM/ })).toBeFocused();
});

test('board scroll advances by a stage using an accessible control', async ({ page }) => {
  await page.goto('/roadmap/board/', { waitUntil: 'domcontentloaded' });
  const scroller = page.locator('.ws-board-viewport');
  const before = await scroller.evaluate(el => el.scrollLeft);
  await page.getByRole('button', { name: /下一阶段|Next stage/ }).click();
  await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(before);
  await expect(page.getByRole('progressbar', {name:/看板横向滚动进度|Board horizontal scroll progress/})).toHaveAttribute('aria-valuenow', /[1-9]/);
});

test('small-screen navigation gives a working hint for clipped tabs', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'overflow navigation is a mobile affordance');
  await page.goto('/roadmap/', { waitUntil: 'domcontentloaded' });
  const more = page.locator('.ws-tabs-more');
  await expect(more).toBeVisible();
  // Locale script must not replace the compact arrow with a multi-line label.
  await expect(more).toHaveText('→');
  const bounds = await more.boundingBox();
  const navBounds = await page.locator('.ws-tabbar').boundingBox();
  expect(bounds && navBounds && bounds.y + bounds.height <= navBounds.y + navBounds.height + 1 && bounds.y >= navBounds.y - 1).toBeTruthy();
  const strip = page.locator('.ws-tabs');
  const before = await strip.evaluate(el => el.scrollLeft);
  await more.click();
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBeGreaterThan(before);
});

test('mobile inspector can close via Escape and return focus', async ({page,isMobile}) => {
  test.skip(!isMobile, 'inspector is a modal drawer on narrow screens');
  await page.goto('/roadmap/board/', {waitUntil:'domcontentloaded'});
  const first = page.locator('.kanban-card').first();
  await first.click();
  const inspector = page.locator('#roadmap-inspector');
  await expect(inspector).toHaveClass(/inspector-visible/);
  await expect(page.locator('body')).toHaveCSS('overflow','hidden');
  await page.keyboard.press('Escape');
  await expect(inspector).not.toHaveClass(/inspector-visible/);
  await expect(first).toBeFocused();
});

test('timeline entry arrow stays inside its own card with no extra mobile row', async ({page}) => {
  await page.goto('/roadmap/evidence/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const entry=page.locator('.event-entry').first();
  const body=entry.locator('.event-body');
  const arrow=body.locator('.event-arrow');
  await expect(arrow).toBeVisible();
  const [a,b,e]=await Promise.all([arrow.boundingBox(),body.boundingBox(),entry.boundingBox()]);
  expect(a && b && e).toBeTruthy();
  expect(a.x).toBeGreaterThanOrEqual(b.x-1);
  expect(a.x+a.width).toBeLessThanOrEqual(b.x+b.width+1);
  expect(a.y).toBeGreaterThanOrEqual(b.y-1);
  expect(a.y+a.height).toBeLessThanOrEqual(b.y+b.height+1);
  expect(e.height).toBeLessThan(245);
  const following=await page.locator('.event-entry').nth(1).boundingBox();
  expect(following.y - (e.y+e.height)).toBeLessThan(24);
  await page.screenshot({path:`test-results/v26-activity-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});

test('Gantt labels have one opaque sticky mask with shared dynamic width', async ({page,isMobile}) => {
  await page.goto('/roadmap/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const mask=page.locator('.gantt-label-mask');
  await expect(mask).toBeAttached();
  const viewport=page.locator('.gantt-viewport');
  const label=page.locator('.gantt-item-name').first();
  const sizes=await page.evaluate(()=>{
    const m=document.querySelector('.gantt-label-mask');
    const l=document.querySelector('.gantt-item-name');
    const head=document.querySelector('.gantt-head-name');
    const p=getComputedStyle(m,'::after');
    return {mask:m.getBoundingClientRect().width,label:l.getBoundingClientRect().width,head:head.getBoundingClientRect().width,
      background:p.backgroundColor,maskHeight:Number.parseFloat(p.height)};
  });
  expect(Math.abs(sizes.mask-sizes.label)).toBeLessThan(1);
  expect(Math.abs(sizes.head-sizes.label)).toBeLessThan(1);
  expect(sizes.maskHeight).toBeGreaterThan(200);
  expect(sizes.background).toMatch(/^rgb\(/);
  if(isMobile) expect(sizes.label).toBeLessThanOrEqual(390*.36+2);
  await viewport.evaluate(el=>el.scrollLeft=560);
  await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(300);
  const labelAfter=await label.boundingBox();
  const canvasAfter=await viewport.boundingBox();
  expect(labelAfter.x).toBeGreaterThanOrEqual(canvasAfter.x-1);
  await page.screenshot({path:`test-results/v26-gantt-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});

test('system map uses real Vue Flow nodes and edges, not a CSS-only illustration', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/roadmap/systems/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('.system-graph .vue-flow')).toBeVisible({timeout:15000});
  await expect(page.locator('.vue-flow__node')).toHaveCount(5);
  await expect(page.locator('.vue-flow__edge')).toHaveCount(4);
  await expect(page.locator('.system-graph-node').filter({hasText:'TALOS'})).toBeVisible();
  if (test.info().project.name.includes('mobile')) {
    const viewport=await page.locator('.system-graph-viewport').boundingBox();
    for(const node of await page.locator('.system-graph-node').all()) {
      const box=await node.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(viewport.x-2);
      expect(box.x+box.width).toBeLessThanOrEqual(viewport.x+viewport.width+2);
    }
  }
  await page.locator('.system-graph-node').filter({hasText:'TALOS'}).click();
  await expect(page.locator('.rail-item.is-current')).toContainText('TALOS');
  await page.screenshot({path:`test-results/v26-systems-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);
});


test('two Gantt route modes switch without reversed arrowheads or layout shifts', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const layer=page.locator('.gantt-dependency-layer');
  const edge=layer.locator('path[data-dependency-key="TAL-01>TAL-02"]');
  await expect(edge).toBeAttached();
  const standard=page.locator('[data-route-option="standard"]');
  const optimized=page.locator('[data-route-option="optimized"]');
  await expect(standard).toBeVisible();
  await expect(optimized).toBeVisible();
  await expect(layer).toHaveAttribute('data-route-mode','optimized');
  const viewport=page.locator('.gantt-viewport');
  const startingScroll=await viewport.evaluate(el=>el.scrollLeft);
  async function geometry() {
    return await edge.evaluate(el=>{
      const total=el.getTotalLength();
      const end=el.getPointAtLength(total);
      const before=el.getPointAtLength(Math.max(0,total-3));
      const layer=el.ownerSVGElement;
      const bar=document.querySelector('[data-gantt-id="TAL-02"]');
      return {d:el.getAttribute('d'), deltaX:end.x-before.x,deltaY:end.y-before.y,
        tipX:end.x+layer.getBoundingClientRect().left, targetX:bar.getBoundingClientRect().left,
        marker:el.getAttribute('marker-end')};
    });
  }
  const advanced=await geometry();
  expect(advanced.d).toContain(' Q ');
  expect(advanced.deltaX).toBeGreaterThan(2);
  expect(Math.abs(advanced.deltaY)).toBeLessThan(0.5);
  expect(Math.abs(advanced.tipX-(advanced.targetX-6))).toBeLessThan(3);
  expect(advanced.marker).toContain('dep-arrow');
  await page.screenshot({path:`test-results/v27-route-B-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  await standard.click();
  await expect(layer).toHaveAttribute('data-route-mode','standard');
  await expect(standard).toHaveAttribute('aria-pressed','true');
  const classic=await geometry();
  expect(classic.d).not.toEqual(advanced.d);
  expect(classic.d).not.toContain(' Q ');
  expect(classic.deltaX).toBeGreaterThan(2);
  expect(Math.abs(classic.deltaY)).toBeLessThan(0.5);
  expect(Math.abs(classic.tipX-(classic.targetX-6))).toBeLessThan(3);
  expect(await viewport.evaluate(el=>el.scrollLeft)).toBe(startingScroll);
  await page.screenshot({path:`test-results/v27-route-A-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('.gantt-dependency-layer')).toHaveAttribute('data-route-mode','standard');
  await page.locator('[data-route-option="optimized"]').click();
  await expect(page.locator('.gantt-dependency-layer')).toHaveAttribute('data-route-mode','optimized');
  expect(errors).toEqual([]);
});
