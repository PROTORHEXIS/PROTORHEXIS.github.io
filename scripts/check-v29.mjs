import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dependencyPaths,validateWindow,barPosition,visibleRows} from '../src/lib/gantt.ts';
import {demoItems,demoPrograms} from '../src/data/workstation-demo.ts';
const source=readFileSync('src/lib/gantt.ts','utf8');
const ui=readFileSync('src/components/vue/EngineeringWorkbench.vue','utf8');
const layout=readFileSync('src/layouts/EngineeringLayout.astro','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const css=readFileSync('src/styles/workstation-v28.css','utf8');
for(const needle of ['RouteMode','mode: RouteMode','protorhexis-roadmap-route-v1','data-route-option','gantt-route-selector','setDependencyRouteMode'])
  assert.ok(!source.includes(needle)&&!ui.includes(needle),`retired A/B UI or algorithm remains: ${needle}`);
assert.ok(!layout.includes('workstation-v27.css'));
assert.ok(!Object.keys(pkg.scripts).includes('check:v27')&&!Object.keys(pkg.scripts).includes('check:v28'));
assert.ok(ui.includes('dependencyTrunks')&&ui.includes('gantt-dep-toggle'));
assert.ok(css.includes('stroke-linecap:butt'));
const range=validateWindow('2026-11','2027-10');
const width=1440;
const groups=demoPrograms.map(p=>({...p,items:demoItems.filter(i=>i.program===p.id)}));
const edges=dependencyPaths(groups,{},range,width,'TAL-01');
const map=new Map(edges.map(e=>[e.key,e]));
assert.ok(edges.length>=7);
function start(d){const m=d.match(/^M (-?[\d.]+) (-?[\d.]+)/);assert.ok(m);return {x:+m[1],y:+m[2]}}
function tip(d){const m=d.match(/ L (-?[\d.]+) (-?[\d.]+)$/);assert.ok(m);return {x:+m[1],y:+m[2]}}
for(const [key,fromId,toId] of [['TAL-01>TAL-02','TAL-01','TAL-02'],['TAL-01>MAX-01','TAL-01','MAX-01'],['TAL-02>TES-02','TAL-02','TES-02']]){
  const e=map.get(key);assert.ok(e,`missing ${key}`);
  const a=barPosition(demoItems.find(i=>i.id===fromId),range),b=barPosition(demoItems.find(i=>i.id===toId),range);
  const s=start(e.d),end=tip(e.d);
  const center=visibleRows(groups,{}).centers.get(fromId);
  assert.ok(s.x>a.left/100*width+10&&s.x<a.right/100*width-10,`overlap source must leave bar edge: ${key}`);
  assert.ok(Math.abs(s.y-(center+13))<.12,`source must exit at bottom edge: ${key}`);
  assert.ok(Math.abs(end.x-(b.left/100*width-6))<.12,`target tip incorrect: ${key}`);
  assert.ok(!e.trunk,`overlapping edge must not draw right-hand U-turn trunk: ${key}`);
  assert.ok(e.d.endsWith(`L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`));
}
assert.ok(map.get('TAL-02>TAL-03')?.trunk,'forward edge still needs source-side trunk');
assert.equal(dependencyPaths(groups,{TALOS:false},range,width,null).some(e=>e.from==='TAL-01'),false);
assert.equal(dependencyPaths(groups,{},range,0,null).length,0);
assert.ok(!readFileSync('.github/workflows/pages.yml','utf8').includes('check:v27'));
console.log(`V2.9 sole router, overlapping bar-edge exits and no legacy A mode: PASS (${edges.length} edges)`);
