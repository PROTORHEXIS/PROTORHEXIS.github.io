import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dependencyPaths,validateWindow,barPosition} from '../src/lib/gantt.ts';
import {demoItems,demoPrograms} from '../src/data/workstation-demo.ts';
const code=readFileSync('src/components/vue/EngineeringWorkbench.vue','utf8');
const css=readFileSync('src/styles/workstation-v27.css','utf8');
const layout=readFileSync('src/layouts/EngineeringLayout.astro','utf8');
assert.ok(code.includes('data-route-option="standard"') && code.includes('data-route-option="optimized"'));
assert.ok(code.includes('dependencyRouteMode.value'));
assert.ok(code.includes('data-dependency-key="edge.key"'));
assert.ok(code.includes('protorhexis-roadmap-route-v1'));
assert.ok(code.includes('orient="auto"') && !code.includes('orient="auto-start-reverse"'));
assert.ok(layout.includes("import '../styles/workstation-v27.css';"));
assert.ok(css.includes('.gantt-route-tools') && css.includes('margin-left:auto'));
assert.ok(css.includes('prefers-reduced-motion'));
const groups=demoPrograms.map(p=>({...p,items:demoItems.filter(i=>i.program===p.id)}));
const range=validateWindow('2026-11','2027-10');
const width=1440;
const a=dependencyPaths(groups,{},range,width,'TAL-01','standard');
const b=dependencyPaths(groups,{},range,width,'TAL-01','optimized');
assert.ok(a.length>=5 && b.length===a.length);
const a12=a.find(e=>e.key==='TAL-01>TAL-02'),b12=b.find(e=>e.key==='TAL-01>TAL-02');
assert.ok(a12 && b12 && a12.active && b12.active);
assert.ok(!a12.d.includes(' Q ') && b12.d.includes(' Q '));
assert.notEqual(a12.d,b12.d);
// Last segment *always* approaches target from the left. Regression for the ring-shaped arrow.
for(const mode of ['standard','optimized']){
  for(const edge of dependencyPaths(groups,{},range,width,null,mode)){
    const p=edge.d;
    const destination=demoItems.find(i=>i.id===edge.to);
    const expected=barPosition(destination,range).left/100*width-6;
    const final=mode==='standard' ? Number(p.match(/ H (-?[\d.]+)$/)?.[1]) : Number(p.match(/ L (-?[\d.]+) (-?[\d.]+)$/)?.[1]);
    assert.ok(Number.isFinite(final) && Math.abs(final-expected)<0.11,`bad terminal: ${edge.key} ${mode}: ${p}`);
    // All forward-going paths have a positive terminal entry, even if dates overlap.
    const match=mode==='standard' ? p.match(/ H (-?[\d.]+) V (-?[\d.]+) H (-?[\d.]+)$/) : p.match(/ Q (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)$/);
    assert.ok(match,`missing terminal approach: ${edge.key} ${mode}`);
    const before=mode==='standard' ? +match[1] : +match[3];
    assert.ok(final-before>=1,`backward arrow: ${edge.key} ${mode}: ${p}`);
  }
}
assert.deepEqual(dependencyPaths(groups,{TALOS:false},range,width,null,'optimized').some(x=>x.key==='TAL-01>TAL-02'),false);
assert.equal(dependencyPaths(groups,{},range,0,null,'optimized').length,0);
console.log(`V2.7 dual-route geometry, forward arrowheads, toolbar and persistence: PASS (${a.length} edges)`);
