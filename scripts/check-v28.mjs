import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dependencyPaths,validateWindow,barPosition} from '../src/lib/gantt.ts';
import {demoItems,demoPrograms} from '../src/data/workstation-demo.ts';
const read=p=>readFileSync(p,'utf8');
const comp=read('src/components/vue/EngineeringWorkbench.vue');
const css=read('src/styles/workstation-v28.css');
const layout=read('src/layouts/EngineeringLayout.astro');
const page=read('src/pages/index.astro');
const notfound=read('src/pages/404.astro');
const xml=read('public/brand/mark.svg');
assert.ok(!comp.includes('<motion.button v-for="event in visibleEvents"'), 'events should not animate date/axis via parent Motion');
assert.ok(comp.includes('<button v-for="event in visibleEvents"'));
assert.ok(css.includes('.event-entry:hover .event-body') && css.includes('.event-entry {transform:none!important;}'));
assert.ok(css.includes('stroke-linecap:butt'), 'arrow line must have a flat terminal cap');
assert.ok(comp.includes('refX="8"') && comp.includes('L8 4'), 'marker tip must meet path endpoint');
assert.ok(comp.includes('gantt-dependency-trunk') && comp.includes('dependencyTrunks'), 'branch and trunk must render independently');
assert.ok(layout.includes("import '../styles/workstation-v28.css';"));
assert.ok(existsSync('public/brand/mark.svg') && xml.includes('<svg') && xml.includes('logo placeholder'));
assert.ok(layout.includes('<img src="/brand/mark.svg"'));
assert.ok(page.includes('<img src="/brand/mark.svg"') && notfound.includes('<img src="/brand/mark.svg"'));
for(const content of [layout,notfound,page]) assert.ok(!/href\s*=\s*['"]\/['"]/.test(content), 'construction page must have no internal entry');
assert.ok(layout.includes('noIndex={true}'));
assert.ok(read('src/data/workstation-demo.ts').includes('SYNTHETIC visual-demo fixtures ONLY'));
const groups=demoPrograms.map(p=>({...p,items:demoItems.filter(x=>x.program===p.id)}));
const range=validateWindow('2026-11','2027-10'), width=1440;
const standard=dependencyPaths(groups,{},range,width,null,'standard');
const optimized=dependencyPaths(groups,{},range,width,null,'optimized');
assert.equal(standard.length,optimized.length);
assert.ok(standard.length>=5);
const shared=optimized.filter(e=>e.from==='TAL-01');
assert.ok(shared.length>=2 && shared.every(e=>e.trunk===shared[0].trunk));
assert.ok(standard.every(e=>!e.trunk));
const distinct=optimized.filter(e=> {
  const a=standard.find(x=>x.key===e.key);
  return a && Number.isFinite(a.laneX) && Number.isFinite(e.laneX) && Math.abs(a.laneX-e.laneX)>9;
});
assert.ok(distinct.length>=1, 'B needs a genuinely distinct routing lane, not just rounded corners');
for(const edge of [...standard,...optimized]){
  const target=demoItems.find(x=>x.id===edge.to);
  const tip=barPosition(target,range).left/100*width-6;
  const final=edge.trunk
    ? Number(edge.d.match(/ L (-?[\d.]+) (-?[\d.]+)$/)?.[1])
    : Number(edge.d.match(/ H (-?[\d.]+)$/)?.[1]);
  assert.ok(Number.isFinite(final) && Math.abs(tip-final)<.12,`marker tip mismatch: ${edge.key}`);
  const matches=edge.trunk?edge.d.match(/ Q (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)$/):edge.d.match(/ H (-?[\d.]+) V (-?[\d.]+) H (-?[\d.]+)$/);
  assert.ok(matches,`no forward final segment ${edge.key}`);
  const prev=+matches[edge.trunk?3:1];
  assert.ok(final-prev>1,`backward entry ${edge.key}`);
}
assert.equal(dependencyPaths(groups,{TALOS:false},range,width,null,'optimized').some(e=>e.from==='TAL-01'),false);
console.log(`V2.8 brand/nav, hover isolation, shared optimized routes and arrow endpoints: PASS (${optimized.length} edges; ${distinct.length} distinct corridors)`);
