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
    await expect(page.locator('header .ws-header-notice')).toBeVisible();
    await expect(page.locator('header .ws-header-notice')).toContainText('PARTIAL');
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

test('mobile sidebar view selector replaces clipped horizontal top navigation', async ({page,isMobile}) => {
  test.skip(!isMobile,'mobile sidebar dropdown');
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.ws-tabbar')).toHaveCount(0);
  await expect(page.locator('.ws-view-nav')).toBeHidden();
  const selector=page.locator('.ws-view-mobile');
  await expect(selector.locator('summary')).toBeVisible();
  await selector.locator('summary').click();
  const target=selector.getByRole('link',{name:/02 \/ (交付看板|RELEASE BOARD)/});
  await expect(target).toBeVisible();
  await target.click({noWaitAfter:true});
  await expect(page).toHaveURL(/\/roadmap\/board\/?$/);
  await expect(page.locator('.ws-view-mobile summary')).toContainText(/交付看板|RELEASE BOARD/);
});

test('desktop navigation lives in the project sidebar without page-description header',async({page,isMobile})=>{
  test.skip(isMobile,'desktop sidebar');
  await page.goto('/roadmap/systems/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.ws-tabbar,.ws-notice,.ws-command-title')).toHaveCount(0);
  const nav=page.locator('.ws-project-index .ws-view-nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a')).toHaveCount(4);
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('a[aria-current="page"]')).toContainText(/系统图谱|SYSTEM MAP/);
  await expect(page.locator('header .ws-header-notice')).toBeVisible();
  await nav.getByRole('link',{name:/02.*(交付看板|RELEASE BOARD)/}).click({noWaitAfter:true});
  await expect(page).toHaveURL(/\/roadmap\/board\/?$/);
});

test('search keeps one parent focus indication without a second native input outline', async({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const input=page.getByRole('searchbox',{name:/搜索|Search/});
  await input.focus();
  await expect(input).toBeFocused();
  const css=await input.evaluate(el=>({
    inner:getComputedStyle(el).outlineStyle,
    parentBorder:getComputedStyle(el.closest('.ws-search')).borderTopColor,
    parentOutline:getComputedStyle(el.closest('.ws-search')).outlineStyle
  }));
  expect(css.inner).toBe('none');
  expect(css.parentOutline).toBe('none');
  await expect.poll(()=>input.evaluate(el=>getComputedStyle(el.closest('.ws-search')).borderTopColor),{timeout:3000}).toBe('rgb(255, 117, 110)');
  await input.fill('TALOS');
  await expect(input).toHaveValue('TALOS');
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

test('system map renders four reviewed organizational edges without inferred dependencies', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/roadmap/systems/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('.system-graph .vue-flow')).toBeVisible({timeout:15000});
  await expect(page.locator('.vue-flow__node')).toHaveCount(5);
  await expect(page.locator('.vue-flow__edge')).toHaveCount(4);
  await expect(page.locator('.vue-flow__edge-path')).toHaveCount(4);
  for(const edge of await page.locator('.vue-flow__edge-path').all()){
    expect((await edge.getAttribute('d')||'').length).toBeGreaterThan(20);
  }
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


test('actual records never display invented Gantt dependencies or promised dates',async({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('header .ws-header-notice')).toBeVisible();
    await expect(page.locator('header .ws-header-notice')).toContainText('PARTIAL');
  await expect(page.locator('[data-gantt-id="TAL-01"]')).toHaveCount(0);
  await expect(page.locator('.gantt-bar')).toHaveCount(4);
  await expect(page.locator('.gantt-undated')).toHaveCount(5);
  await expect(page.locator('.gantt-dependency-layer')).toHaveCount(0);
  await expect(page.locator('[data-route-option],.gantt-route-selector')).toHaveCount(0);
  await page.screenshot({path:`test-results/v31-actual-schedule-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});

test('approved public JSON API has sources and no synthetic fixture',async({request})=>{
  const res=await request.get('/api/roadmap/v1.json');
  expect(res.ok()).toBe(true);
  const data=await res.json();
  expect(data.publicationStatus).toBe('APPROVED_PUBLIC_SNAPSHOT');
  expect(data.programs).toHaveLength(5);
  expect(data.workItems.length).toBeGreaterThanOrEqual(4);
  expect(data.events.length).toBeGreaterThanOrEqual(4);
  expect(data.relations).toHaveLength(4);
  expect(data.relations.every(r=>r.kind==='contains' && r.from==='PROTORHEXIS')).toBe(true);
  for(const item of data.workItems){
    expect(item.title.zh).not.toMatch(/TAL-01/);
    if(item.phase==='published')expect(item.sources.length).toBeGreaterThan(0);
    if(item.schedule===null)expect(['planned','future','development','qualification','review']).toContain(item.phase);
    for(const src of item.sources)expect(new URL(src.url).hostname).toBe('github.com');
  }
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
  const brand=page.locator('.ws-header .site-brand');
  await expect(brand).toBeVisible();
  expect(await brand.evaluate(el=>el.tagName)).toBe('SPAN');
  const mark=brand.locator('svg.site-brand-vector');
  await expect(mark).toBeVisible();
  await expect(brand.locator('.ws-brandtext')).toHaveCount(0);
  await expect(brand.getByText('ENGINEERING INTERFACE')).toHaveCount(0);
  expect(await mark.getAttribute('fill')).toBe('currentColor');
  expect(await mark.locator('path,polygon').count()).toBe(20);
  const css=await mark.evaluate(el=>({fill:getComputedStyle(el).fill,color:getComputedStyle(el).color}));
  expect(css.fill).toBe(css.color);
  await expect(page.locator('a[href="/"]')).toHaveCount(0);
});


test('Future is undated and reviewed private-source summaries are sanitized',async({page,request})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.kanban-heading').filter({hasText:/未来方向|FUTURE/})).toBeVisible();
  await expect(page.locator('.kanban-card').filter({hasText:'TAL-FUTURE-001'})).toBeVisible();
  await expect(page.locator('.kanban-card').filter({hasText:'TAL-PROGRESS-001'})).toBeVisible();
  const res=await request.get('/api/roadmap/v1.json');
  expect(res.ok()).toBeTruthy();
  const data=await res.json();
  expect(data.workItems.filter(x=>x.phase==='future')).toHaveLength(6);
  const reviewed=data.workItems.filter(x=>x.id.endsWith('PROGRESS-001'));
  expect(reviewed).toHaveLength(4);
  expect(reviewed.every(x=>x.reviewReceipt && x.schedule===null && x.sources.length===0)).toBe(true);
  for(const w of reviewed){expect(JSON.stringify(w)).not.toMatch(/HoshiriAki\/|TALOS-LEGACY|RUSTSEC-|github\.com\/PROTORHEXIS\/(?:talos|thouless|tesseract|maxwell)/i);}
  expect(data.workItems.filter(x=>x.phase==='future').every(x=>x.schedule===null)).toBe(true);
});


test('six board stages occupy one horizontal row and the rightmost Published column is scrollable', async ({page}) => {
  await page.goto('/roadmap/board/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const lanes=page.locator('.kanban-column');
  await expect(lanes).toHaveCount(6);
  const first=await lanes.first().boundingBox();
  const last=await lanes.last().boundingBox();
  expect(first && last).toBeTruthy();
  expect(Math.abs(last.y-first.y)).toBeLessThan(2);
  expect(last.x).toBeGreaterThan(first.x+5*200);
  await expect(lanes.last().locator('.kanban-heading')).toContainText(/已发布|PUBLISHED/);
  const viewport=page.locator('.ws-board-viewport');
  const metrics=await viewport.evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  await viewport.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await expect(lanes.last().locator('.kanban-heading')).toBeInViewport();
  await page.screenshot({path:`test-results/v33-published-stage-${test.info().project.name}.png`,fullPage:true,animations:'disabled'});
});


test('global SiteBrand renders identical SVG on home, 404 and all roadmap routes', async ({page}) => {
  const routes=['/','/404.html','/roadmap/','/roadmap/board/','/roadmap/evidence/','/roadmap/systems/'];
  let canonicalMarkup;
  for(const route of routes){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const header=page.locator('header').first();
    const brand=header.locator('.site-brand');
    await expect(brand).toHaveCount(1);
    await expect(brand).toBeVisible();
    const svg=brand.locator('svg.site-brand-vector');
    await expect(svg).toBeVisible();
    await expect(svg.locator('path,polygon')).toHaveCount(20);
    await expect(header.locator('img[src="/brand/mark.svg"], .ws-brandtext, .identity-copy, .mark')).toHaveCount(0);
    expect(await header.getByText('ENGINEERING INTERFACE').count()).toBe(0);
    const markup=await svg.innerHTML();
    if(canonicalMarkup === undefined) canonicalMarkup=markup;
    else expect(markup).toBe(canonicalMarkup);
    const colors=await svg.evaluate(el=>({
      fill:getComputedStyle(el).fill,
      color:getComputedStyle(el).color,
      width:el.getBoundingClientRect().width,
      viewport:document.documentElement.clientWidth
    }));
    expect(colors.fill).toBe(colors.color);
    expect(colors.width).toBeGreaterThan(100);
    expect(colors.width).toBeLessThan(colors.viewport);
  }
});

test('global brand color is controlled by a CSS custom property on every layout',async({page})=>{
  for(const route of ['/','/roadmap/']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const brand=page.locator('header .site-brand');
    await expect(brand).toBeVisible();
    await brand.evaluate(el=>el.style.setProperty('--site-brand-color','rgb(72, 152, 209)'));
    const svg=brand.locator('svg.site-brand-vector');
    // Global brand intentionally animates color changes for 150ms.
    await expect.poll(()=>svg.evaluate(el=>getComputedStyle(el).fill),{timeout:3000}).toBe('rgb(72, 152, 209)');
    const color=await svg.evaluate(el=>({fill:getComputedStyle(el).fill,color:getComputedStyle(el).color}));
    expect(color.color).toBe(color.fill);
  }
});


test('global loading gate is composed as logo above progress bar on all public routes',async({page})=>{
  const all=['/','/404.html','/roadmap/','/roadmap/board/','/roadmap/evidence/','/roadmap/systems/'];
  for(const route of all){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const gate=page.locator('#site-loading-gate');
    await expect(gate).toHaveCount(1);
    const brand=gate.locator('.site-brand svg.site-brand-vector');
    await expect(brand).toHaveCount(1);
    await expect(brand.locator('path,polygon')).toHaveCount(20);
    const bar=gate.locator('[role="progressbar"]');
    await expect(bar).toHaveCount(1);
    await expect(bar).not.toHaveAttribute('aria-valuenow', /./);
    const relative=await gate.evaluate(el=>{
      const logo=el.querySelector('.site-brand-vector').getBoundingClientRect();
      const track=el.querySelector('.site-loading-gate__track').getBoundingClientRect();
      return {logoY:logo.y,logoBottom:logo.bottom,barY:track.y};
    });
    expect(relative.barY).toBeGreaterThan(relative.logoBottom);
    await expect(gate).toHaveAttribute('data-state','idle',{timeout:13000});
    await expect(page.locator('body')).toHaveAttribute('aria-busy','false');
  }
});

test('same-origin navigation uses the orbital mask and reveals the new route',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#site-loading-gate')).toHaveAttribute('data-state','idle',{timeout:13000});
  await page.getByRole('link',{name:/进入开发路线图|Open roadmap/}).click({noWaitAfter:true});
  await expect(page).toHaveURL(/\/roadmap\/?$/,{timeout:13000});
  await expect(page.locator('#site-loading-gate')).toHaveAttribute('data-state','idle',{timeout:13000});
  await expect(page.locator('.ws-root')).toBeVisible();
  expect(await page.locator('body').getAttribute('aria-busy')).toBe('false');
});

test('reduced-motion mode bypasses the clip-path sweep and still navigates',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#site-loading-gate')).toHaveAttribute('data-state','idle');
  await page.getByRole('link',{name:/进入开发路线图|Open roadmap/}).click({noWaitAfter:true});
  await expect(page).toHaveURL(/\/roadmap\/?$/,{timeout:13000});
  await expect(page.locator('#site-loading-gate')).toHaveAttribute('data-state','idle',{timeout:13000});
  const motion=await page.locator('.site-loading-gate__fill').evaluate(el=>getComputedStyle(el).animationName);
  expect(motion).toBe('none');
});


test('V3.4 public delivery confidence never treats private progress as committed release',async({request,page})=>{
  const response=await request.get('/api/roadmap/v1.json');
  const data=await response.json();
  expect(data.workItems.filter(x=>x.reviewReceipt)).toHaveLength(4);
  expect(data.workItems.filter(x=>x.reviewReceipt).every(x=>x.delivery.state==='unassigned' && x.verifiedAt===null)).toBe(true);
  expect(data.workItems.filter(x=>x.phase==='published').every(x=>x.program==='PROTORHEXIS' && x.delivery.state==='released')).toBe(true);
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const card=page.locator('.kanban-card').filter({hasText:'TAL-PROGRESS-001'});
  await expect(card.locator('.kanban-delivery')).toHaveAttribute('data-delivery','unassigned');
  await card.click();
  const inspector=page.locator('#roadmap-inspector');
  await expect(inspector).toContainText(/未指定交付|UNASSIGNED/);
  await expect(inspector).toContainText(/未单独核验|NOT SEPARATELY VERIFIED/);
});

test('V3.4 same work ID links between board and schedule without duplicating source',async({page})=>{
  await page.goto('/roadmap/board/?item=TAL-PROGRESS-001&program=TALOS',{waitUntil:'domcontentloaded'});
  const inspector=page.locator('#roadmap-inspector');
  await expect(inspector).toHaveClass(/inspector-visible/);
  await expect(inspector).toContainText('TAL-PROGRESS-001');
  const target=inspector.getByRole('link',{name:/查看排期|Open schedule/});
  await target.click({noWaitAfter:true});
  await expect(page).toHaveURL(/\/roadmap\/\?item=TAL-PROGRESS-001/);
  await expect(page.locator('#roadmap-inspector')).toContainText('TAL-PROGRESS-001');
});


test('navbar owns the only search input; no standalone tools band remains', async({page})=>{
  for(const route of ['/roadmap/','/roadmap/board/','/roadmap/evidence/','/roadmap/systems/']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(page.locator('.ws-commandbar,.ws-tools')).toHaveCount(0);
    await expect(page.locator('.ws-header #ws-header-search-slot .ws-search')).toBeVisible();
    await expect(page.getByRole('searchbox',{name:/搜索|Search/})).toHaveCount(1);
    await expect(page.locator('.ws-primary .ws-search')).toHaveCount(0);
  }
});

test('navbar search still filters the board using Vue state',async({page})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const field=page.locator('.ws-header .ws-search input');
  await expect(field).toBeVisible();
  await field.fill('TAL-PROGRESS-001');
  await expect(page.locator('.kanban-card')).toHaveCount(1);
  await expect(page.locator('.kanban-card')).toContainText('TAL-PROGRESS-001');
  await field.fill('');
  await expect(page.locator('.kanban-card')).toHaveCount(15);
});

test('Gantt month-quarter and pager are inside the timeline, left of dependencies',async({page,isMobile})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const actions=page.locator('.ws-timeline .gantt-control-actions');
  await expect(actions).toBeVisible();
  await expect(actions.locator('.gantt-scale-switch button')).toHaveCount(2);
  await expect(actions.locator('.gantt-period-pager button')).toHaveCount(3);
  await expect(actions.locator('.gantt-dep-toggle')).toHaveCount(1);
  await actions.getByRole('button',{name:/季度|QUARTER/}).click();
  await expect(actions.getByRole('button',{name:/季度|QUARTER/})).toHaveAttribute('aria-pressed','true');
  await actions.getByRole('button',{name:/月|MONTH/,exact:true}).click();
  await expect(actions.getByRole('button',{name:/月|MONTH/,exact:true})).toHaveAttribute('aria-pressed','true');
  const scroller=page.locator('.gantt-viewport');
  await actions.getByRole('button',{name:/后移时间轴|Next period/}).click();
  await actions.getByRole('button',{name:/复位|RESET/}).click();
  if(!isMobile){
    const [scale,pager,dep]=await Promise.all([
      actions.locator('.gantt-scale-switch').boundingBox(),
      actions.locator('.gantt-period-pager').boundingBox(),
      actions.locator('.gantt-dep-toggle').boundingBox()
    ]);
    expect(scale.x + scale.width).toBeLessThanOrEqual(pager.x+2);
    expect(pager.x + pager.width).toBeLessThanOrEqual(dep.x+2);
  }
  await expect(scroller).toBeVisible();
});

test('navbar search remains reachable and within viewport on mobile',async({page,isMobile})=>{
  test.skip(!isMobile,'mobile navbar layout');
  await page.goto('/roadmap/evidence/',{waitUntil:'domcontentloaded'});
  const field=page.locator('.ws-header .ws-search input');
  await expect(field).toBeVisible();
  const info=await field.evaluate(el=>{const r=el.getBoundingClientRect();const h=el.closest('.ws-header').getBoundingClientRect();return {input:r.toJSON(),header:h.toJSON(),w:innerWidth}});
  expect(info.input.left).toBeGreaterThanOrEqual(0);
  expect(info.input.right).toBeLessThanOrEqual(info.w+1);
  expect(info.input.top).toBeGreaterThanOrEqual(info.header.top);
  expect(info.input.bottom).toBeLessThanOrEqual(info.header.bottom+1);
  await field.fill('TALOS');
  await expect(field).toHaveValue('TALOS');
});


test('notice hover opens transiently and closes after pointer leaves both trigger and popup',async({page,isMobile})=>{
  test.skip(isMobile,'Hover is for fine-pointer desktop');
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice');
  const summary=notice.locator('summary');
  await expect(notice).not.toHaveAttribute('open');
  await summary.hover();
  await expect(notice).toHaveAttribute('data-mode','hover');
  await expect(notice).toHaveAttribute('open');
  const popup=notice.locator('p');
  await expect(popup).toBeVisible();
  // Mouse must be able to cross the real 8px visual gap into the panel.
  const triggerBox=await summary.boundingBox(), popupBox=await popup.boundingBox();
  await page.mouse.move(triggerBox.x+Math.min(55,triggerBox.width/2),triggerBox.y+triggerBox.height-3);
  await page.mouse.move(popupBox.x+Math.min(55,popupBox.width/2),popupBox.y+12,{steps:12});
  await expect(notice).toHaveAttribute('data-mode','hover');
  await page.mouse.move(3,350,{steps:8});
  await expect(notice).not.toHaveAttribute('open');
  await expect(notice).toHaveAttribute('data-mode','closed');
});

test('notice click pins open across pointer leave, and outside click dismisses it',async({page,isMobile})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice');
  const summary=notice.locator('summary');
  await summary.click();
  await expect(notice).toHaveAttribute('data-mode','pinned');
  await expect(notice).toHaveAttribute('open');
  if(!isMobile) await page.mouse.move(3,350,{steps:8});
  await expect(notice.locator('p')).toBeVisible();
  await page.locator('.ws-project-index .rail-item').first().click();
  await expect(notice).toHaveAttribute('data-mode','closed');
  await expect(notice).not.toHaveAttribute('open');
  await summary.click();
  await expect(notice).toHaveAttribute('data-mode','pinned');
  await summary.click();
  await expect(notice).not.toHaveAttribute('open');
});

test('notice Escape closes pinned and supports keyboard activation',async({page})=>{
  await page.goto('/roadmap/systems/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice');
  const summary=notice.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(notice).toHaveAttribute('data-mode','pinned');
  await page.keyboard.press('Escape');
  await expect(notice).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
});

test('moving focus away closes a pinned notice without interrupting the target',async({page})=>{
  await page.goto('/roadmap/evidence/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice');
  await notice.locator('summary').click();
  await expect(notice).toHaveAttribute('data-mode','pinned');
  await page.locator('.ws-header .ws-search input').focus();
  await expect(notice).not.toHaveAttribute('open');
  await expect(page.locator('.ws-header .ws-search input')).toBeFocused();
});


test('notice animates open and closed without disturbing click-pinned mode',async({page,isMobile})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice'),trigger=notice.locator('summary');
  await trigger.click();
  await expect(notice).toHaveAttribute('data-mode','pinned');
  const panel=notice.locator('p');
  await expect(panel).toBeVisible();
  if(!isMobile) {
    const openMotion=await panel.evaluate(el=>getComputedStyle(el).animationName);
    expect(openMotion).toContain('ws-notice-appear');
  }
  await page.locator('.ws-project-index .rail-item').first().click();
  if(!isMobile){
    await expect(notice).toHaveAttribute('data-mode','closing',{timeout:1000});
    await expect(panel).toHaveCSS('animation-name','ws-notice-disappear');
  }
  await expect(notice).not.toHaveAttribute('open',{timeout:2000});
  await expect(notice).toHaveAttribute('data-mode','closed');
});

test('moving back into the notice cancels exit animation and restores transient hover',async({page,isMobile})=>{
  test.skip(isMobile,'Pointer-hover only');
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  const notice=page.locator('.ws-header-notice'),trigger=notice.locator('summary'),panel=notice.locator('p');
  await trigger.hover();
  await expect(notice).toHaveAttribute('data-mode','hover');
  await page.mouse.move(4,360);
  await expect(notice).toHaveAttribute('data-mode','closing');
  await trigger.hover();
  await expect(notice).toHaveAttribute('data-mode','hover');
  await expect(panel).toBeVisible();
  await page.mouse.move(4,360);
  await expect(notice).not.toHaveAttribute('open',{timeout:3000});
});

test('Gantt bottom edge hugs its actual final row after filtering to one item',async({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const input=page.locator('.ws-header .ws-search input');
  await input.fill('TAL-PROGRESS-001');
  await expect(page.locator('.gantt-row')).toHaveCount(1);
  const geometry=await page.locator('.gantt-viewport').evaluate(view=>{
    const canvas=view.querySelector('.gantt-canvas');
    const last=view.querySelector('.gantt-row:last-of-type');
    const v=view.getBoundingClientRect(),c=canvas.getBoundingClientRect(),l=last.getBoundingClientRect();
    return {viewportHeight:v.height,canvasHeight:c.height,
      afterLast:c.bottom-l.bottom,extraBelowCanvas:v.bottom-c.bottom,
      scrollHeight:view.scrollHeight,clientHeight:view.clientHeight};
  });
  expect(geometry.afterLast).toBeGreaterThanOrEqual(-2);
  expect(geometry.afterLast).toBeLessThanOrEqual(2);
  // Extra scrollbar allowance is okay; a ~62px phantom row is not.
  expect(geometry.extraBelowCanvas).toBeGreaterThanOrEqual(-3);
  expect(geometry.extraBelowCanvas).toBeLessThanOrEqual(22);
});

test('Gantt last row, zero results and collapsed group never create a phantom row',async({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const search=page.locator('.ws-header .ws-search input');
  await search.fill('TAL-PROGRESS-001');
  await expect(page.locator('.gantt-row')).toHaveCount(1);
  const group=page.locator('.gantt-group');
  await group.click();
  await expect(page.locator('.gantt-row')).toHaveCount(0);
  let gap=await page.locator('.gantt-viewport').evaluate(el=>el.getBoundingClientRect().bottom-el.querySelector('.gantt-canvas').getBoundingClientRect().bottom);
  expect(gap).toBeLessThanOrEqual(22);
  await search.fill('NO_SUCH_PUBLIC_WORK_ITEM_000');
  await expect(page.locator('.ws-no-results')).toBeVisible();
  gap=await page.locator('.gantt-viewport').evaluate(el=>el.getBoundingClientRect().bottom-el.querySelector('.gantt-canvas').getBoundingClientRect().bottom);
  expect(gap).toBeLessThanOrEqual(22);
  await search.fill('');
  // Count the current reviewed public rows; never hardcode the quantity
  // because Future, planned and filtered records vary independently of layout.
  await expect.poll(()=>page.locator('.gantt-row').count()).toBeGreaterThan(1);
  const sizes=await page.locator('.gantt-viewport').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight}));
  expect(sizes.scrollHeight).toBeGreaterThan(sizes.height);
});


test('V3.5 exterior panels are flush, radius-free, and internal cards keep their corners',async({page,isMobile})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const dimensions=await page.locator('.ws-content-grid').evaluate(grid=>{
    const rail=grid.querySelector('.ws-project-index'),main=grid.querySelector('.ws-primary'),card=grid.querySelector('.kanban-card');
    const outer=grid.getBoundingClientRect(),left=rail.getBoundingClientRect(),center=main.getBoundingClientRect();
    return {outerLeft:outer.left,outerRight:outer.right,leftLeft:left.left,leftRight:left.right,
      centerLeft:center.left,centerRight:center.right,
      padding:getComputedStyle(grid).paddingLeft,
      gap:getComputedStyle(grid).columnGap,
      leftRadius:getComputedStyle(rail).borderTopLeftRadius,
      centerRadius:getComputedStyle(main).borderTopLeftRadius,
      cardRadius:getComputedStyle(card).borderTopLeftRadius};
  });
  expect(dimensions.padding).toBe('0px');
  expect(dimensions.leftRadius).toBe('0px');
  expect(dimensions.centerRadius).toBe('0px');
  expect(parseFloat(dimensions.cardRadius)).toBeGreaterThan(0);
  expect(Math.abs(dimensions.outerLeft-dimensions.leftLeft)).toBeLessThanOrEqual(1);
  if(!isMobile){
    expect(Math.abs(dimensions.leftRight-dimensions.centerLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(dimensions.centerRight-dimensions.outerRight)).toBeLessThanOrEqual(1);
  }
});

test('V3.5 default collapsed inspector has a left-arrow wall handle and empty manual opening',async({page,isMobile})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const grid=page.locator('.ws-content-grid'),inspector=page.locator('#roadmap-inspector');
  const handle=page.getByRole('button',{name:/展开右侧详情栏|Expand detail sidebar/});
  await expect(grid).toHaveAttribute('data-inspector-open','false');
  await expect(inspector).toHaveAttribute('aria-hidden','true');
  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute('aria-expanded','false');
  const mainBefore=await page.locator('.ws-primary').boundingBox();
  await handle.click();
  await expect(grid).toHaveAttribute('data-inspector-open','true');
  await expect(inspector).not.toHaveAttribute('aria-hidden','true');
  await expect(inspector).toHaveClass(/inspector-visible/);
  await expect(inspector.locator('.inspector-empty-state')).toContainText(/请选择一个项目以显示内容|Select an item to display its details/);
  await expect(inspector.locator('.inspector-hero')).toHaveCount(0);
  if(!isMobile) {
    await expect.poll(()=>page.locator('.ws-primary').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThan(mainBefore.width-150);
  }
  await page.getByRole('button',{name:/收起右侧详情栏|Collapse detail sidebar/}).click();
  await expect(grid).toHaveAttribute('data-inspector-open','false');
  await expect(inspector).toHaveAttribute('aria-hidden','true');
});

test('V3.5 real task selection auto-opens details; manual collapse and reopen preserve selection',async({page})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const inspector=page.locator('#roadmap-inspector');
  await page.locator('.kanban-card').filter({hasText:'TAL-PROGRESS-001'}).click();
  await expect(inspector).toHaveClass(/inspector-visible/);
  await expect(inspector).toContainText('TAL-PROGRESS-001');
  await expect(inspector.locator('.inspector-empty-state')).toHaveCount(0);
  await page.getByRole('button',{name:/收起右侧详情栏|Collapse detail sidebar/}).click();
  await expect(inspector).toHaveAttribute('aria-hidden','true');
  await page.getByRole('button',{name:/展开右侧详情栏|Expand detail sidebar/}).click();
  await expect(inspector).not.toHaveAttribute('aria-hidden','true');
  await expect(inspector).toContainText('TAL-PROGRESS-001');
});

test('V3.5 handle hover visibly increases opacity and reduced-motion closes instantly',async({page,isMobile})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const handle=page.locator('.ws-inspector-handle');
  await expect(handle).toBeVisible();
  if(!isMobile){
    const opacity=await handle.evaluate(el=>Number(getComputedStyle(el).opacity));
    await handle.hover();
    await expect.poll(()=>handle.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(opacity+.25);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await handle.click();
  await expect(page.locator('#roadmap-inspector')).toHaveAttribute('aria-hidden','false');
  await expect(handle).toHaveCSS('transition-duration',/^0s(, 0s)*$/);
});

test('V3.5 a system-map node explicitly selects and opens its inspector',async({page})=>{
  await page.goto('/roadmap/systems/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('#roadmap-inspector')).toHaveAttribute('aria-hidden','true');
  await page.locator('.system-graph-node').filter({hasText:'TALOS'}).click();
  const inspector=page.locator('#roadmap-inspector');
  await expect(inspector).toHaveClass(/inspector-visible/);
  await expect(inspector).toContainText('TALOS');
});


test('V3.5 compact tab has a 20%-area graphite/red visual with a 44px hit target and static chevrons',async({page})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const handle=page.locator('.ws-inspector-handle');
  const svg=handle.locator('svg');
  await expect(svg).toHaveCount(1);
  const initial=await handle.evaluate(el=>{
    const css=getComputedStyle(el),tab=getComputedStyle(el,'::before');
    const bounds=el.getBoundingClientRect();
    return {
      hitWidth:bounds.width,hitHeight:bounds.height,
      tabWidth:parseFloat(tab.width),tabHeight:parseFloat(tab.height),
      background:tab.backgroundColor,color:css.color,
      radiusTL:tab.borderTopLeftRadius,radiusTR:tab.borderTopRightRadius,
      radiusBL:tab.borderBottomLeftRadius,radiusBR:tab.borderBottomRightRadius,
      rotation:getComputedStyle(el.querySelector('svg')).transform,
      right:Math.abs(innerWidth-bounds.right)
    };
  });
  expect(initial.hitWidth).toBe(44);
  expect(initial.hitHeight).toBe(44);
  expect(initial.tabWidth).toBe(29);
  expect(initial.tabHeight).toBe(44);
  expect(initial.tabWidth*initial.tabHeight/(29*220)).toBeCloseTo(.2,6);
  expect(initial.background).toBe('rgb(41, 38, 42)');
  expect(initial.color).toBe('rgb(255, 138, 129)');
  expect(initial.radiusTL).toBe('11px');
  expect(initial.radiusBL).toBe('11px');
  expect(initial.radiusTR).toBe('0px');
  expect(initial.radiusBR).toBe('0px');
  expect(initial.right).toBeLessThanOrEqual(2);
  const probe='static-icon-'+test.info().project.name;
  await svg.evaluate((el,p)=>el.dataset.rotationProbe=p,probe);
  await handle.click();
  await expect(handle).toHaveAttribute('aria-expanded','true');
  await expect.poll(()=>svg.evaluate(el=>getComputedStyle(el).transform),{timeout:2500})
    .not.toBe(initial.rotation);
  await expect(svg).toHaveAttribute('data-rotation-probe',probe);
  // Mobile drawers can be 96vw wide: the tab must not move offscreen.
  const onScreen=await handle.evaluate(el=>{const rect=el.getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth+1;});
  expect(onScreen).toBe(true);
  await handle.click();
  await expect(handle).toHaveAttribute('aria-expanded','false');
  await expect(svg).toHaveAttribute('data-rotation-probe',probe);
});

test('V3.5 Gantt project group uses the same static right-chevron while CSS rotates it',async({page})=>{
  await page.goto('/roadmap/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const group=page.locator('.gantt-group').first();
  const chevron=group.locator('.chevron svg');
  await expect(chevron).toHaveCount(1);
  await expect(group).toHaveAttribute('aria-expanded','true');
  const original=await chevron.evaluate(el=>getComputedStyle(el).transform);
  await chevron.evaluate(el=>el.dataset.sameStaticSvg='yes');
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded','false');
  await expect(chevron).toHaveAttribute('data-same-static-svg','yes');
  await expect.poll(()=>chevron.evaluate(el=>getComputedStyle(el).transform),{timeout:2500})
    .not.toBe(original);
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded','true');
  await expect(chevron).toHaveAttribute('data-same-static-svg','yes');
  await expect.poll(()=>chevron.evaluate(el=>getComputedStyle(el).transform),{timeout:2500})
    .toBe(original);
});
