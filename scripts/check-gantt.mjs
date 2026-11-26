import assert from 'node:assert/strict';
import { ARROW_LENGTH, TIP_GAP } from '../src/lib/gantt.ts';
import { demoItems, demoPrograms } from '../tests/fixtures-geometry.ts';
import { monthIndex, monthString, validateWindow, windowEnds, axisTicks, barPosition, visibleRows, dependencyPaths } from '../src/lib/gantt.ts';
const equals=(a,b)=>assert.deepEqual(a,b);
for (const m of ['2026-11','2027-01','2028-12']) equals(monthString(monthIndex(m)),m);
for (const m of ['2026-00','2026-13','abc','2026-1']) assert.throws(()=>monthIndex(m));
assert.throws(()=>validateWindow('2027-08','2027-07'));
assert.throws(()=>validateWindow('2026-01','2029-02'));
const range=validateWindow('2026-11','2027-10');
equals(range,{startMonth:'2026-11',months:12});
const ends=windowEnds(range);
assert.equal(new Date(ends.start).toISOString().slice(0,10),'2026-11-01');
assert.equal(new Date(ends.end).toISOString().slice(0,10),'2027-11-01');
const months=axisTicks(range,'month');
assert.equal(months.length,12);
assert.ok(Math.abs(months.reduce((v,t)=>v+t.width,0)-100)<.00001);
const quarters=axisTicks(range,'quarter');
assert.equal(quarters.length,5);
assert.equal(quarters[0].label,'2026 / Q4');
assert.equal(quarters[4].label,'2027 / Q4');
const task={id:'ONE',start:'2026-11-10',end:'2027-02-10',deps:[]};
assert.ok(!barPosition(task,range).hidden);
assert.equal(barPosition({start:'2026-01-01',end:'2026-01-10'},range).hidden,true);
assert.equal(barPosition({start:'2027-11-01',end:'2027-11-10'},range).hidden,true);
assert.ok(barPosition({start:'2026-09-01',end:'2026-12-01'},range).left===0);
const dependent={id:'TWO',start:'2027-02-01',end:'2027-04-01',deps:['ONE']};
const groups=[{id:'first',items:[task]},{id:'second',items:[dependent]}];
const rows=visibleRows(groups,{});
assert.equal(rows.centers.get('ONE'),56+39+31);
assert.equal(rows.centers.get('TWO'),56+39+62+39+31);
assert.equal(dependencyPaths(groups,{},range,1200,'TWO').length,1);
assert.equal(dependencyPaths(groups,{},range,1200,'TWO')[0].active,true);
assert.equal(dependencyPaths(groups,{first:false},range,1200,'TWO').length,0);
assert.equal(dependencyPaths([{id:'a',items:[task]}],{},range,1200,'ONE').length,0); // missing dependency hidden
assert.equal(dependencyPaths([{id:'a',items:[{...dependent,deps:['MISSING']}]}],{},range,1200,'TWO').length,0);
console.log('Gantt calendar, clipping, edges, collapse, negatives: PASS');

// Routing geometry: overlap, ports, arrow clearance and minimum turns.
{
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
 // Only parse x/y pairs from point commands; the SVG path uses absolute coordinates.
 const parts=e.d.match(/-?\d+\.\d+/g).map(Number);
 const xs=parts.filter((_,i)=>i%2===0);
 assert.ok(xs.every(x=>x>=minx-2),`far-off detour: ${key}`);
}
assert.equal(dependencyPaths(groups,{TALOS:false},range,width,null).some(e=>e.from==='TAL-01'),false);
assert.equal(dependencyPaths(groups,{},range,0,null).length,0);
assert.ok(dependencyPaths(groups,{},range,width,'TAL-01').filter(e=>e.active).every(e=>e.from==='TAL-01'||e.to==='TAL-01'));
console.log(`Gantt orthogonal routing: PASS (${edges.length} edges)`);
}
