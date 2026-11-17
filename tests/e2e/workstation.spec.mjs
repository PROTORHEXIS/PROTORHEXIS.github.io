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
    await expect(page.getByText('PUBLIC SOURCE RECORDS')).toBeVisible();
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
  await expect(page.locator('.rail-item')).toHaveCount(2); // all + public website only
  await page.screenshot({path:`test-results/v26-systems-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);
});


test('public source feed renders real GitHub-backed items without synthetic program bars',async ({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('.gantt-bar')).toHaveCount(3);
  await expect(page.locator('[data-gantt-id="WEB-001"]')).toBeVisible();
  await expect(page.locator('[data-gantt-id="WEB-003"]')).toBeVisible();
  await expect(page.locator('[data-gantt-id="TAL-01"]')).toHaveCount(0);
  await expect(page.locator('[data-route-option],.gantt-route-selector')).toHaveCount(0);
  await page.screenshot({path:`test-results/v31-public-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});

test('V2.8: hovering a timeline card does not move its date or axis marker', async ({page}) => {
  await page.goto('/roadmap/evidence/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const entry=page.locator('.event-entry').first();
  const date=entry.locator('.event-date'),marker=entry.locator('.event-marker'),card=entry.locator('.event-body');
  const [dateBefore,markerBefore,cardBefore]=await Promise.all([date.boundingBox(),marker.boundingBox(),card.boundingBox()]);
  await card.hover();
  const [dateAfter,markerAfter,cardAfter]=await Promise.all([date.boundingBox(),marker.boundingBox(),card.boundingBox()]);
  for(const [before,after] of [[dateBefore,dateAfter],[markerBefore,markerAfter]]){
    for(const k of ['x','y','width','height']) expect(Math.abs(before[k]-after[k])).toBeLessThan(.6);
  }
  expect(await entry.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  if(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: no-preference)').matches && matchMedia('(hover: hover)').matches)){
    await expect.poll(async()=>card.evaluate(el=>getComputedStyle(el).transform)).not.toBe('none');
    expect(cardAfter.width).toBeGreaterThanOrEqual(cardBefore.width);
  }
  await page.screenshot({path:`test-results/v28-timeline-hover-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});

test('V2.8: brand uses replaceable SVG and has no entry to the unpublished home', async ({page}) => {
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  const brand=page.locator('.ws-header .ws-brand');
  await expect(brand).toBeVisible();
  expect(await brand.evaluate(el=>el.tagName)).toBe('DIV');
  const mark=brand.locator('img[src="/brand/mark.svg"]');
  await expect(mark).toBeVisible();
  await expect.poll(()=>mark.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
  await expect(page.locator('a[href="/"]')).toHaveCount(0);
});
