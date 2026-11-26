import { test, expect } from '@playwright/test';

/* V3.6.5: nearest-edge visibility inside native or transformed viewports. */
async function metrics(page, viewport, target, inset=8) {
  return page.evaluate(({viewport,target,inset})=>{
    const parent=document.querySelector(viewport), child=document.querySelector(target);
    if(!parent||!child) return {missing:true};
    const p=parent.getBoundingClientRect(),c=child.getBoundingClientRect();
    return {missing:false, left:p.left+inset-c.left,right:c.right-(p.right-inset),
      top:p.top+inset-c.top,bottom:c.bottom-(p.bottom-inset),
      vw:p.width,vh:p.height,cw:c.width,ch:c.height,
      x:parent.scrollLeft,y:parent.scrollTop,scrollWidth:parent.scrollWidth};
  },{viewport,target,inset});
}
function visible(m) {
  return m && !m.missing && m.vw>m.cw+14 && m.vh>m.ch+14 &&
    Math.max(m.left,m.right,m.top,m.bottom)<=3;
}
test('V3.6.5 all board semantic icons inherit their actual stage or delivery text color', async({page})=>{
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const values=await page.evaluate(()=>{
    const color=x=>getComputedStyle(x).color;
    const stages=Array.from(document.querySelectorAll('.kanban-heading[data-stage]')).map(h=>{
      const t=h.querySelector('.kanban-stage-label');
      return {state:h.dataset.stage,text:color(t),icon:color(t.querySelector('.ws-status-icon'))};
    });
    const deliveries=Array.from(document.querySelectorAll('.kanban-card .kanban-delivery')).map(t=>({
      state:t.dataset.delivery,text:color(t),icon:color(t.querySelector('.ws-status-icon'))
    }));
    return {stages,deliveries};
  });
  expect(values.stages.map(s=>s.state)).toEqual(['future','planned','development','qualification','review','published']);
  for(const group of [values.stages,values.deliveries]){
    expect(group.length).toBeGreaterThan(0);
    for(const state of group){
      expect(state.icon).toBe(state.text);
      expect(state.icon).not.toBe('rgb(255, 69, 58)');
    }
  }
  await page.locator('.kanban-card[data-item-id="WEB-SITE-001"]').click();
  await expect(page.locator('.inspector-status')).toBeVisible();
  const detail=await page.evaluate(()=>{
    const status=document.querySelector('.ws-inspector .inspector-status');
    const delivery=document.querySelector('.ws-inspector .inspector-delivery-label');
    return [status,delivery].map(el=>({
      text:getComputedStyle(el).color,
      icon:getComputedStyle(el.querySelector('.ws-status-icon')).color
    }));
  });
  for(const item of detail) expect(item.icon).toBe(item.text);
});
test('V3.6.5 selected far-right board card is fully revealed after inspector opens and viewport resizes',async({page,isMobile})=>{
  test.skip(isMobile,'Mobile drawer overlays content');
  await page.setViewportSize({width:1500,height:860});
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const view=page.locator('.ws-board-viewport'),target='.kanban-card[data-item-id="WEB-SITE-001"]';
  await view.evaluate(el=>el.scrollLeft=el.scrollWidth);
  const card=page.locator(target);
  await card.click();
  await expect(page.locator('.ws-content-grid')).toHaveAttribute('data-inspector-open','true');
  await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport',target))).toBe(true);
  // The inspector's grid track keeps shrinking for 260ms after the click.
  // Compare two settled frames, not a transient early "visible" snapshot.
  await expect.poll(async()=>{
    const a=await view.evaluate(el=>el.clientWidth);
    await page.waitForTimeout(85);
    const b=await view.evaluate(el=>el.clientWidth);
    return Math.abs(b-a);
  },{timeout:4000}).toBeLessThan(1);
  await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport',target))).toBe(true);
  const start=await metrics(page,'.ws-board-viewport',target);
  await card.click();
  await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport',target))).toBe(true);
  expect(Math.abs((await metrics(page,'.ws-board-viewport',target)).x-start.x)).toBeLessThan(4);
  for(const width of [1250,1800,1200]){
    await page.setViewportSize({width,height:860});
    await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport',target))).toBe(true);
  }
  await page.locator('.ws-inspector-handle').click();
  await expect(page.locator('.ws-content-grid')).toHaveAttribute('data-inspector-open','false');
  await page.locator('.kanban-card[data-item-id="MAX-FUTURE-001"]').click();
  await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport','.kanban-card[data-item-id="MAX-FUTURE-001"]'))).toBe(true);
});
test('V3.6.5 board and Gantt deep links reveal the chosen work item in the resized pane',async({page,isMobile})=>{
  test.skip(isMobile,'Mobile overlay inspector');
  await page.setViewportSize({width:1440,height:800});
  await page.goto('/roadmap/board/?item=WEB-SITE-001&program=PROTORHEXIS',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#roadmap-inspector')).toContainText('WEB-SITE-001');
  await expect.poll(async()=>visible(await metrics(page,'.ws-board-viewport','.kanban-card[data-item-id="WEB-SITE-001"]'))).toBe(true);
  await page.goto('/roadmap/?item=WEB-SITE-001&program=PROTORHEXIS',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#roadmap-inspector')).toContainText('WEB-SITE-001');
  const bar='.gantt-bar[data-gantt-id="WEB-SITE-001"]';
  await expect(page.locator(bar)).toHaveCount(1);
  const barVisible=async()=>{
    const b=await page.locator(bar).boundingBox();
    const view=await page.locator('.gantt-viewport').boundingBox();
    const label=await page.locator('.gantt-head-name').boundingBox();
    return Boolean(b&&view&&label&&b.x>=view.x+label.width-3&&
      b.x+b.width<=view.x+view.width+3&&b.y>=view.y-2&&b.y+b.height<=view.y+view.height+3);
  };
  await expect.poll(barVisible).toBe(true);
  await page.locator('.gantt-item-name[data-item-id="WEB-SITE-001"]').click();
  await expect.poll(barVisible).toBe(true);
});
test('V3.6.5 activity record stays inside its own scrollport when inspector opens',async({page,isMobile})=>{
  test.skip(isMobile,'Mobile overlay inspector');
  await page.setViewportSize({width:1400,height:680});
  await page.goto('/roadmap/evidence/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.locator('.event-entry').last().click();
  await expect(page.locator('#roadmap-inspector')).not.toContainText('Select an item to display');
  await expect.poll(async()=>visible(await metrics(page,'.ws-activity','.event-entry.selected'))).toBe(true);
});
test('Changelog program filter retains an empty authorized release list',async({page})=>{
  await page.goto('/roadmap/changelog/');
  await page.locator('.rail-item').filter({hasText:'THOULESS'}).click();
  await expect(page.locator('.rail-item.is-current')).toContainText('THOULESS');
  await expect(page.locator('.changelog-empty')).toBeVisible();
  await expect(page.locator('[data-release-id]')).toHaveCount(0);
});
test('V3.6.5 mobile selection preserves Escape and return focus on the fixed inspector drawer',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile-only focus behavior');
  await page.goto('/roadmap/board/',{waitUntil:'domcontentloaded'});
  const card=page.locator('.kanban-card[data-item-id="WEB-SITE-001"]');
  await card.click();
  await expect(page.locator('#roadmap-inspector')).toHaveClass(/inspector-visible/);
  await expect(page.locator('body')).toHaveCSS('overflow','hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('#roadmap-inspector')).not.toHaveClass(/inspector-visible/);
  await expect(card).toBeFocused();
});
