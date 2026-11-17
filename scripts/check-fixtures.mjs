import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const pages = [
  ['src/pages/roadmap/index.astro', 'schedule'],
  ['src/pages/roadmap/board/index.astro', 'board'],
  ['src/pages/roadmap/evidence/index.astro', 'activity'],
  ['src/pages/roadmap/systems/index.astro', 'systems'],
];
for (const [path, view] of pages) {
  assert(existsSync(resolve(root, path)), `missing route: ${path}`);
  assert(read(path).includes(`view="${view}"`), `wrong view: ${path}`);
}
const snapshot=JSON.parse(read('src/data/roadmap.generated.json'));
assert.equal(snapshot.publicationStatus,'APPROVED_PUBLIC_SNAPSHOT');
assert(snapshot.events.length>0&&snapshot.programs.length===5, 'Public data missing');
assert.equal(snapshot.relations.length,4,'Public graph must have four reviewed organization-level relations');
assert(snapshot.relations.every(x=>x.kind==='contains' && x.from==='PROTORHEXIS'),'Unverified technical dependencies must not be drawn');
assert(snapshot.workItems.every(x=>x.sources.length || x.phase==='planned' || x.phase==='future' || Boolean(x.reviewReceipt)), 'Public facts must have provenance');
assert(snapshot.workItems.every(x=>x.schedule===null || x.schedule.kind==='observed' || x.schedule.kind==='tentative'), 'No invented committed dates');
assert(!existsSync(resolve(root,'src/data/workstation-demo.ts')), 'Synthetic demo feed must be removed from production');
assert(existsSync(resolve(root,'src/data/roadmap.generated.json')), 'Generated public data missing');
const layout = read('src/layouts/EngineeringLayout.astro');
assert(layout.includes('PUBLIC RECORDS / LIMITED') && layout.includes('PUBLIC SNAPSHOT / LIMITED COVERAGE'),'public data must not retain DEMO labels');
const component = read('src/components/vue/EngineeringWorkbench.vue');
const graph = read('src/components/vue/SystemRelationshipGraph.vue');
const brand = read('src/components/BrandLockup.astro');
const header = read('src/layouts/EngineeringLayout.astro');
const v33 = read('src/styles/workstation-v33.css');
assert(component.includes(':relations="publicSnapshot.relations"'),'Vue Flow must be driven by approved public relations');
assert(graph.includes('props.relations') && !graph.includes('shallowRef<Edge[]>([])'),'Graph cannot hardcode empty edges');
assert(component.includes('--board-stage-count') && v33.includes('grid-template-columns:repeat(var(--board-stage-count'),'Stage count must drive one row of lanes');
assert(header.includes('<BrandLockup />') && !header.includes('ws-brandtext'),'Header cannot retain old HTML wordmark');
assert(brand.includes('fill="currentColor"') && !brand.includes('#262626'),'Brand geometry must inherit CSS color');
assert(component.includes('VERIFIED PUBLIC RECORDS'), 'public partial coverage banner missing');
assert(component.includes('import { publicSnapshot,') && component.includes('publicSnapshot.updatedAt'), 'public content snapshot must be imported before SSR rendering');
assert(component.includes('PARTIAL COVERAGE'), 'missing partial coverage warning');
const stylesheet = read('src/styles/workstation.css');
assert(!/(?:^|[;{\s])box-shadow\s*:\s*(?!none\s*!important)/m.test(stylesheet), 'workstation must not introduce shadows');
assert(!/filter\s*:\s*drop-shadow\s*\(/.test(stylesheet), 'no drop-shadow in workstation');
assert(!/\.ws-content-grid\s*\{[^}]*max-width/.test(stylesheet), 'main workbench must not be artificially max-width constrained');
assert.equal(read('public/CNAME').trim(), 'protorhexis.com');
assert(read('src/pages/index.astro').includes('建设中'), 'root must remain under construction');
assert(!read('src/components/vue/EngineeringWorkbench.vue').includes('SYNTHETIC'), 'No fabricated claims in UI');
console.log('Source invariants: PASS (4 routes, reviewed public data only, no synthetic UI, no shadows)');
