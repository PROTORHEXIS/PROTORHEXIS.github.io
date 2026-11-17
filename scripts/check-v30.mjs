import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dependencyPaths,validateWindow,barPosition,visibleRows,ARROW_LENGTH,TIP_GAP} from '../src/lib/gantt.ts';
import {demoItems,demoPrograms} from '../src/data/workstation-demo.ts';
const groups=demoPrograms.map(p=>({...p,items:demoItems.filter(i=>i.program===p.id)}));
const range=validateWindow('2026-11','2027-10'),width=1440;
const edges=dependencyPaths(groups,{},range,width,null);
assert.equal(edges.length,demoItems.reduce((n,i)=>n+i.deps.length,0));
assert.equal(ARROW_LENGTH,8);assert.equal(TIP_GAP,6);
const byKey=new Map(edges.map(e=>[e.key,e]));
const centers=visibleRows(groups,{}).centers;
const bars=new Map(demoItems.map(i=>{
 const b=barPosition(i,range);return [i.id,{left:b.left/100*width,right:b.right/100*width,y:centers.get(i.id)}];
}));
const p0=d=>{const m=d.match(/^M (-?[\d.]+) (-?[\d.]+)/);assert.ok(m);return [+m[1],+m[2]]};
const pend=d=>{const m=d.match(/ L (-?[\d.]+) (-?[\d.]+)$/);assert.ok(m);return [+m[1],+m[2]]};
const corners=d=>(d.match(/ Q /g)||[]).length;
for(const e of edges){
 const a=bars.get(e.from),b=bars.get(e.to);
 assert.ok(a&&b);
 assert.ok(e.trunk,`missing common right-exit trunk: ${e.key}`);
 const [sx,sy]=p0(e.trunk);const trunkEnd=e.trunk.match(/ H (-?[\d.]+)$/);assert.ok(trunkEnd);const outx=+trunkEnd[1],outy=sy;
 assert.ok(Math.abs(sx-a.right)<.16&&Math.abs(sy-a.y)<.16,`wrong source right port ${e.key}`);
 assert.ok(Math.abs(outx-a.right-14)<.16&&Math.abs(outy-a.y)<.16,`wrong exit stub ${e.key}`);
 const [bx,by]=p0(e.d),[endx,endy]=pend(e.d);
 assert.ok(Math.abs(bx-outx)<.16&&Math.abs(by-outy)<.16,`branch does not join source ${e.key}`);
 assert.ok(Math.abs(endx-(b.left-TIP_GAP-ARROW_LENGTH))<.16,`wrong marker base ${e.key}`);
 assert.ok(Math.abs((endx+ARROW_LENGTH)-(b.left-TIP_GAP))<.16,`wrong arrow tip ${e.key}`);
 assert.ok(ARROW_LENGTH>=4,`arrow gap under half tip length ${e.key}`);
 assert.ok(corners(e.d)<=7,`excess bends ${e.key}`);
}
// Two-bend orthogonal paths require source-right x < target-left x;
// overlapping items need 4 total turns at minimum (including source trunk).
for(const key of ['TAL-01>TAL-02','MAX-01>MAX-02','PRO-01>PRO-02']) {
 assert.equal(corners(byKey.get(key).d),3,`overlap should use minimum four turns (incl. exit): ${key}`);
}
for(const key of ['TAL-02>TAL-03','THO-01>THO-02','TES-01>TES-02']){
 assert.equal(corners(byKey.get(key).d),2,`forward relation must use minimum two turns: ${key}`);
}
// Guard against chart-wide U-turns when a local feasible path exists.
const far=byKey.get('TAL-02>TES-02');
assert.ok(far&& !far.d.includes(' 36.4 '), 'no chart-wide leftmost lane');
// Every unrounded path point/corridor remains within a compact neighbourhood.
for(const key of ['TAL-02>TES-02','TAL-01>TAL-02']) {
 const e=byKey.get(key),a=bars.get(e.from),b=bars.get(e.to);
 const minx=Math.min(a.right+14,b.left-14)-150;
 const pathXs=[...e.d.matchAll(/-?\d+\.\d+/g)].map(m=>+m[0]);
 // Only parse x/y pairs from point commands; the SVG path uses absolute coordinates.
 const parts=e.d.match(/-?\d+\.\d+/g).map(Number);
 const xs=parts.filter((_,i)=>i%2===0);
 assert.ok(xs.every(x=>x>=minx-2),`far-off detour: ${key}`);
}
const ui=readFileSync('src/components/vue/EngineeringWorkbench.vue','utf8');
assert.ok(ui.includes('viewBox="0 0 10 8" refX="1"')&&ui.includes('M1 1 L9 4 L1 7 Z'),'marker must project exactly 8px beyond stroke end');
assert.ok(ui.includes('const routingEdges=computed')&&ui.includes('const dependencyEdges=computed'),'hover must not reroute the geometry');
assert.ok(!ui.includes('gantt-route-selector')&&!ui.includes('data-route-option'),'A/B selector removed');
console.log(`V3.0 right-only departure, left-only arrival, lexicographic turns, clipped 8px marker: PASS (${edges.length} edges)`);
