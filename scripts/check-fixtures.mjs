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
assert(fixture.includes('SYNTHETIC visual-demo fixtures ONLY'), 'demo fixture must disclose provenance');
const component = read('src/components/vue/EngineeringWorkbench.vue');
assert(component.includes('DEMONSTRATION DATA'), 'demo warning must remain visible');
assert(component.includes('NOT VERIFIED'), 'verification warning must remain visible');
const stylesheet = read('src/styles/workstation.css');
assert(!/(?:^|[;{\s])box-shadow\s*:\s*(?!none\s*!important)/m.test(stylesheet), 'workstation must not introduce shadows');
assert(!/filter\s*:\s*drop-shadow\s*\(/.test(stylesheet), 'no drop-shadow in workstation');
assert(!/\.ws-content-grid\s*\{[^}]*max-width/.test(stylesheet), 'main workbench must not be artificially max-width constrained');
assert.equal(read('public/CNAME').trim(), 'protorhexis.com');
assert(read('src/pages/index.astro').includes('建设中'), 'root must remain under construction');
assert(read('src/layouts/EngineeringLayout.astro').includes('noIndex={true}'), 'synthetic engineering pages must be noindex until reviewed public data exists');
assert.equal(JSON.parse(read('src/data/public-milestones.json')).milestones.length,0,'no unapproved factual milestones');
console.log('Source invariants: PASS (4 routes, 2 warnings, full-width, no shadows, domain, no public data claims)');
