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


test('single B router uses invariant right/left ports, minimum bends and shortened stroke before arrowhead', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/roadmap/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const layer=page.locator('.gantt-dependency-layer');
  await expect(layer).toBeVisible();
  await expect(page.locator('[data-route-option],.gantt-route-selector')).toHaveCount(0);
  const snapshot=await layer.evaluate(svg=>{
    const result={},r=svg.getBoundingClientRect();
    const marker=svg.querySelector('#dep-arrow');
    for(const key of ['TAL-01>TAL-02','MAX-01>MAX-02','TAL-02>TES-02','TAL-02>TAL-03','THO-01>THO-02','TES-01>TES-02']){
      const [from,to]=key.split('>');
      const path=svg.querySelector(`path[data-dependency-key="${key}"]`);
      const trunk=svg.querySelector(`[data-dependency-trunk="${from}"]`);
      if(!path||!trunk)continue;
      const len=path.getTotalLength(),start=path.getPointAtLength(0);
      const end=path.getPointAtLength(len),prior=path.getPointAtLength(Math.max(0,len-3));
      const s=document.querySelector(`[data-gantt-id="${from}"]`).getBoundingClientRect();
      const t=document.querySelector(`[data-gantt-id="${to}"]`).getBoundingClientRect();
      const trunkStart=trunk.getPointAtLength(0),trunkEnd=trunk.getPointAtLength(trunk.getTotalLength());
      let minX=Infinity;for(let n=0;n<=len;n+=3)minX=Math.min(minX,path.getPointAtLength(n).x);
      result[key]={
        sourceRight:s.right,sourceCenterY:s.top+s.height/2,targetLeft:t.left,
        trunkStartX:trunkStart.x+r.left,trunkStartY:trunkStart.y+r.top,
        trunkEndX:trunkEnd.x+r.left,branchStartX:start.x+r.left,
        strokeEndX:end.x+r.left,strokeEndY:end.y+r.top,
        dx:end.x-prior.x,dy:end.y-prior.y,
        bends:(path.getAttribute('d').match(/ Q /g)||[]).length,
        minX:minX+r.left,cap:getComputedStyle(path).strokeLinecap,
        marker:path.getAttribute('marker-end')
      };
    }
    return {result,marker:{units:marker.getAttribute('markerUnits'),refX:Number(marker.getAttribute('refX')),
      tipX:Number(marker.querySelector('path').getAttribute('d').match(/L(\d+) 4/)[1])}};
  });
  expect(snapshot.marker.units).toBe('userSpaceOnUse');
  expect(snapshot.marker.tipX-snapshot.marker.refX).toBe(8);
  const cases=snapshot.result;
  expect(Object.keys(cases)).toHaveLength(6);
  for(const [key,e] of Object.entries(cases)) {
    expect(Math.abs(e.trunkStartX-e.sourceRight)).toBeLessThan(3);
    expect(Math.abs(e.trunkStartY-e.sourceCenterY)).toBeLessThan(3);
    expect(e.trunkEndX-e.trunkStartX).toBeGreaterThan(10);
    expect(Math.abs(e.branchStartX-e.trunkEndX)).toBeLessThan(3);
    // 8px of marker, i.e. > half the arrow length, lies beyond the stroke endpoint.
    expect(Math.abs(e.strokeEndX+8-(e.targetLeft-6))).toBeLessThan(3);
    expect(e.targetLeft-e.strokeEndX).toBeGreaterThanOrEqual(12);
    expect(e.dx).toBeGreaterThan(2);
    expect(Math.abs(e.dy)).toBeLessThan(.8);
    expect(e.cap).toBe('butt');
    expect(e.marker).toContain('dep-arrow');
  }
  for(const k of ['TAL-01>TAL-02','MAX-01>MAX-02'])expect(cases[k].bends).toBe(3);
  for(const k of ['TAL-02>TAL-03','THO-01>THO-02','TES-01>TES-02'])expect(cases[k].bends).toBe(2);
  expect(cases['TAL-02>TES-02'].minX).toBeGreaterThan(cases['TAL-02>TES-02'].targetLeft-155);
  await page.screenshot({path:`test-results/v30-right-left-arrow-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:/依赖关系|DEPENDENCIES/}).click();
  await expect(layer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('single router does not cross unrelated task bars in overlapping example', async ({page}) => {
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const collision=await page.locator('path[data-dependency-key="TAL-02>TES-02"]').evaluate(path=>{
    const svg=path.ownerSVGElement;
    const total=path.getTotalLength(),xy=svg.getBoundingClientRect();
    const candidates=[...document.querySelectorAll('[data-gantt-id]')].filter(el=>!['TAL-02','TES-02'].includes(el.getAttribute('data-gantt-id')))
      .map(el=>({id:el.getAttribute('data-gantt-id'),r:el.getBoundingClientRect()}));
    for(let at=0;at<=total;at+=3){
      const p=path.getPointAtLength(at),x=xy.left+p.x,y=xy.top+p.y;
      for(const {id,r} of candidates){
        if(x>r.left-2&&x<r.right+2&&y>r.top-2&&y<r.bottom+2)return {id,x,y};
      }
    }
    return null;
  });
  expect(collision).toBe(null);
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
