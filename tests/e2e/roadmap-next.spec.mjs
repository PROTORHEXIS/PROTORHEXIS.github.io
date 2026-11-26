import { test, expect } from '@playwright/test';

const fixture='http://127.0.0.1:4322/roadmap/changelog/';
test('test-only Changelog renders release distinctions, filters and stable deep links',async({page})=>{
  await page.goto(fixture+'?release=FIXTURE-RELEASE-A');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const inspector=page.locator('#roadmap-inspector');
  await expect(inspector).toContainText('已确认修复');
  await expect(inspector).toContainText('可能修复');
  await expect(inspector).toContainText('计划中');
  await expect(inspector).toContainText('迁移步骤');
  await expect(inspector).toContainText('已知问题记录');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Switch to English'}).click();
  await page.locator('.rail-item').first().click();
  await expect(page.locator('.changelog-card')).toHaveCount(2);
  await page.getByLabel('CHANNEL').selectOption('preview');
  await expect(page.locator('.changelog-card')).toHaveCount(1);
  await expect(page.locator('.changelog-card')).toContainText('Unreleased preview');
  await page.getByLabel('CHANNEL').selectOption('all');
  await page.getByLabel('CHANGE KIND').selectOption('fixed');
  await expect(page.locator('.changelog-card')).toHaveCount(1);
  await page.locator('[data-release-id="FIXTURE-RELEASE-A"]').click();
  await expect(inspector).toContainText('Verified fix');
  await expect(inspector).toContainText('Potential fix');
  await expect(inspector).toContainText('Planned');
  await expect(inspector.getByRole('link',{name:'Release link'})).toHaveAttribute('href','/roadmap/changelog/?release=FIXTURE-RELEASE-A');
  await page.screenshot({path:'test-results/changelog-fixture-'+test.info().project.name+'.png',animations:'disabled'});
});

test('inspector maintains full text width and slides outside the viewport',async({page,isMobile})=>{
  await page.addInitScript(()=>localStorage.removeItem('protorhexis.public.locale'));
  for(const width of isMobile?[390]:[1100,1440,1920]){
    if(!isMobile)await page.setViewportSize({width,height:900});
    await page.goto('/roadmap/board/?item=TAL-PROGRESS-001');
    const inspector=page.locator('#roadmap-inspector');
    await expect(inspector.locator('.inspector-hero h2')).toBeVisible();
    await expect.poll(()=>inspector.evaluate(el=>getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    for(const locale of ['zh','en']){
      if(locale==='en'){
        await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Switch to English'}).click();
        await page.locator('.ws-inspector-handle').click();
        await expect.poll(()=>inspector.evaluate(el=>getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
      }
      const frames=await page.evaluate(async()=>{
        const panel=document.querySelector('#roadmap-inspector'),handle=document.querySelector('.ws-inspector-handle');
        const snap=()=>{const r=panel.getBoundingClientRect(),title=panel.querySelector('.inspector-hero h2'),range=document.createRange();range.selectNodeContents(title);return {x:r.x,width:r.width,textWidth:title.getBoundingClientRect().width,lines:range.getClientRects().length,overflow:document.documentElement.scrollWidth-innerWidth}};
        const result=[snap()];
        handle.click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const motion=panel.getAnimations().find(a=>a.transitionProperty==='transform');
        if(!motion)throw Error('No whole-panel transform transition');
        motion.pause();
        const duration=Number(motion.effect.getTiming().duration);
        for(const time of [0,duration/2,duration]){motion.currentTime=time;result.push(snap());}
        motion.finish();
        return result;
      });
      for(const frame of frames){expect(Math.abs(frame.width-frames[0].width)).toBeLessThan(1);expect(Math.abs(frame.textWidth-frames[0].textWidth)).toBeLessThan(1);expect(frame.lines).toBe(frames[0].lines);expect(frame.overflow).toBeLessThanOrEqual(1);}
      expect(frames[2].x).toBeGreaterThan(frames[0].x);
      expect(frames.at(-1).x).toBeGreaterThanOrEqual(width-1);
      await expect(inspector).toBeHidden();
      await page.locator('.ws-inspector-handle').click();
      await expect(inspector).toBeVisible();
      await expect.poll(()=>inspector.evaluate(el=>getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.keyboard.press('Escape');
  await expect(page.locator('#roadmap-inspector')).toBeHidden();
});

test('Gantt row group transitions keep label and track together and settle exactly',async({page})=>{
  await page.goto('/roadmap/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const canvas=page.locator('.gantt-canvas');
  const group=page.locator('.gantt-group').first();
  const frames=await page.evaluate(async()=>{
    const group=document.querySelector('.gantt-group'),canvas=document.querySelector('.gantt-canvas');
    const snap=()=>{const row=group.nextElementSibling,r=row?.getBoundingClientRect(),label=row?.querySelector('.gantt-item-name')?.getBoundingClientRect(),track=row?.querySelector('.gantt-track')?.getBoundingClientRect();return {height:r?.height??0,aligned:!!label&&!!track&&Math.abs(label.top-track.top)<1,transitioning:canvas.dataset.rowTransitioning};};
    const frames=[snap()];group.click();
    for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);frames.push(snap());}
    return frames;
  });
  expect(frames[0].height).toBeGreaterThan(50);
  expect(frames.some(f=>f.transitioning==='true'&&f.height>0&&f.height<frames[0].height)).toBe(true);
  expect(frames.filter(f=>f.height>0&&f.transitioning==='true').every(f=>f.aligned)).toBe(true);
  await expect(canvas).toHaveAttribute('data-row-transitioning','false');
  await expect(group).toHaveAttribute('aria-expanded','false');
  await group.click();
  await expect(canvas).toHaveAttribute('data-row-transitioning','false');
  await expect(group).toHaveAttribute('aria-expanded','true');
  // Reverse twice before the first collapse finishes.
  await group.evaluate(async el=>{el.click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);el.click();});
  await expect(group).toHaveAttribute('aria-expanded','true');
  await expect(canvas).toHaveAttribute('data-row-transitioning','false');
  await expect.poll(()=>group.evaluate(el=>el.nextElementSibling.getBoundingClientRect().height)).toBeGreaterThan(60);
  await page.screenshot({path:'test-results/gantt-motion-'+test.info().project.name+'.png',animations:'disabled'});
});

test('canonical favicon resources and theme contrast across public routes',async({page,request})=>{
  const svg=await request.get('/favicon.svg'),ico=await request.get('/favicon.ico');
  expect(svg.ok()).toBe(true);expect(svg.headers()['content-type']).toMatch(/image\/svg\+xml/);
  const xml=await svg.text();expect((xml.match(/<polygon\b/g)||[]).length).toBe(4);expect(xml).toContain('prefers-color-scheme:dark');
  const bytes=await ico.body();expect(bytes.readUInt16LE(2)).toBe(1);expect(bytes.readUInt16LE(4)).toBe(2);expect([bytes[6],bytes[22]]).toEqual([16,32]);
  for(const route of ['/','/404.html','/roadmap/','/roadmap/board/','/roadmap/evidence/','/roadmap/changelog/']){
    await page.goto(route);
    await expect(page.locator('link[rel="icon"]')).toHaveCount(2);
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href','/favicon.svg');
  }
  await page.goto('/favicon.svg');
  for(const colorScheme of ['light','dark']){
    await page.emulateMedia({colorScheme});
    await expect(page.locator('polygon').first()).toHaveCSS('fill',colorScheme==='dark'?'rgb(237, 237, 240)':'rgb(38, 38, 42)');
    for(const size of [16,32]){
      await page.locator('svg').evaluate((el,size)=>{el.style.width=size+'px';el.style.height=size+'px';},size);
      await page.locator('svg').screenshot({path:'test-results/favicon-'+colorScheme+'-'+size+'-'+test.info().project.name+'.png'});
    }
  }
});


test('Timeline release opens the same compiled Changelog record',async({page})=>{
  await page.goto('http://127.0.0.1:4322/roadmap/evidence/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.locator('[data-event-id="FIXTURE-RELEASE-EVENT"]').click();
  await expect(page).toHaveURL(/changelog\/\?release=FIXTURE-RELEASE-A/);
  await expect(page.locator('#roadmap-inspector')).toContainText('已确认修复');
});

test('V2 API contains the same historical record identities',async({request})=>{
  const a=await request.get('/api/roadmap/v1.json'),b=await request.get('/api/roadmap/v2.json');
  expect(a.ok()).toBe(true);expect(b.ok()).toBe(true);
  const v1=await a.json(),v2=await b.json();expect(v2.schemaVersion).toBe(2);
  expect(v2.workItems.map(w=>w.id)).toEqual(v1.workItems.map(w=>w.id));
  expect(v2.events.map(e=>e.id)).toEqual(v1.events.map(e=>e.id));
  expect(v2.releases.every(r=>!r.id.startsWith('FIXTURE-'))).toBe(true);
  expect(v2.changes.every(c=>!c.id.startsWith('FIXTURE-'))).toBe(true);
});
