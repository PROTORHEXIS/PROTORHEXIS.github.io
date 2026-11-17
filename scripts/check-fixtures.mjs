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
const fixture = read('src/data/workstation-demo.ts');
assert(fixture.includes('SYNTHETIC visual-demo fixtures ONLY'), 'retained fixture must disclose provenance');
assert(!read('src/components/vue/EngineeringWorkbench.vue').includes("from '../../data/workstation-demo';\nimport { demoItems" ) || read('src/components/vue/EngineeringWorkbench.vue').includes('public-roadmap'), 'must not render synthetic records');
const component = read('src/components/vue/EngineeringWorkbench.vue');
assert(component.includes('PUBLIC SOURCE RECORDS'), 'public source warning must remain visible');
assert(component.includes('PUBLIC SOURCES'), 'public source label must remain visible');
const stylesheet = read('src/styles/workstation.css');
assert(!/(?:^|[;{\s])box-shadow\s*:\s*(?!none\s*!important)/m.test(stylesheet), 'workstation must not introduce shadows');
assert(!/filter\s*:\s*drop-shadow\s*\(/.test(stylesheet), 'no drop-shadow in workstation');
assert(!/\.ws-content-grid\s*\{[^}]*max-width/.test(stylesheet), 'main workbench must not be artificially max-width constrained');
assert.equal(read('public/CNAME').trim(), 'protorhexis.com');
assert(read('src/pages/index.astro').includes('建设中'), 'root must remain under construction');
assert(read('src/data/public-roadmap.ts').includes('content/roadmap/public.json'),'workbench must use reviewed public feed');
console.log('Source invariants: PASS (4 routes, public source warning, full-width, no shadows, domain, reviewed public feed)');
