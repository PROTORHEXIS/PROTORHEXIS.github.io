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
assert(snapshot.workItems.every(x=>x.delivery && x.verifiedAt===null),'Separate release status and unknown verification date required');
assert(snapshot.workItems.filter(x=>x.reviewReceipt).every(x=>x.delivery.state==='unassigned'),'Private disclosure does not authorize a release');
assert(read('src/data/workstation-public.ts').includes('deliveryState:i.delivery.state'),'Separate delivery status must reach browser adapter');
assert(!existsSync(resolve(root,'src/data/workstation-demo.ts')), 'Synthetic demo feed must be removed from production');
assert(existsSync(resolve(root,'src/data/roadmap.generated.json')), 'Generated public data missing');
const layout = read('src/layouts/EngineeringLayout.astro');
assert(layout.includes('ws-header-notice') && layout.includes('PUBLIC SNAPSHOT / LIMITED COVERAGE'),'review disclosure must live in header, not in a stacked banner');
const component = read('src/components/vue/EngineeringWorkbench.vue');
const graph = read('src/components/vue/SystemRelationshipGraph.vue');
const brand = read('src/components/BrandLockup.astro');
const sharedBrand = read('src/components/SiteBrand.astro');
const mainPage = read('src/pages/index.astro');
const notFoundPage = read('src/pages/404.astro');
const globalStyle = read('src/styles/site.css');
const gateComponent = read('src/components/SiteLoadingGate.astro');
const gateScript = read('src/scripts/site-loading.ts');
const gateStyle = read('src/styles/site-loading.css');
const baseLayout = read('src/layouts/BaseLayout.astro');
const header = read('src/layouts/EngineeringLayout.astro');
const v33 = read('src/styles/workstation-v33.css');
const noticeLogic = read('src/scripts/roadmap-notice.ts');
const v34 = read('src/styles/workstation-v34.css');
assert(component.includes(':relations="publicSnapshot.relations"'),'Vue Flow must be driven by approved public relations');
assert(graph.includes('props.relations') && !graph.includes('shallowRef<Edge[]>([])'),'Graph cannot hardcode empty edges');
assert(component.includes('--board-stage-count') && v33.includes('grid-template-columns:repeat(var(--board-stage-count'),'Stage count must drive one row of lanes');
assert(header.includes('<SiteBrand />') && mainPage.includes('<SiteBrand />') && notFoundPage.includes('<SiteBrand />'), 'All public page headers must use the single global SiteBrand component');
assert([header,mainPage,notFoundPage].every(x=>!x.includes('/brand/mark.svg') && !x.includes('identity-copy') && !x.includes('ws-brandtext')),'No old logo or duplicate HTML wordmark may survive');
assert(sharedBrand.includes("import BrandLockup from './BrandLockup.astro'") && sharedBrand.includes('<BrandLockup />'),'SiteBrand must share one source of vector geometry');
assert(globalStyle.includes('.site-brand .site-brand-vector') && globalStyle.includes('--site-brand-color'),'Global CSS must own vector sizing and color');
assert(baseLayout.includes('<SiteLoadingGate />') && baseLayout.includes('site-loading.css') && baseLayout.includes('site-loading.ts'),'Loading gate must be mounted once by BaseLayout');
assert(gateComponent.includes('<SiteBrand />') && gateComponent.includes('site-loading-gate__track'),'Loading screen must reuse the canonical logo above its bar');
assert(gateStyle.includes('clip-path:polygon') && gateScript.includes('animateClip') && gateScript.includes('awaitHydration'),'Global transition must adapt supplied polygon mask and await real readiness');
assert(!gateComponent.includes('gate-percent') && !gateScript.includes('Math.random'),'Do not simulate a quantitative loading percentage');
assert(brand.includes('fill="currentColor"') && brand.includes('class="site-brand-vector"') && !brand.includes('#262626'),'Brand geometry must inherit CSS color');
assert(!component.includes('class="ws-notice"') && !component.includes('ws-command-title') && component.includes('ws-view-nav'), 'No redundant warning band or generic page description; sidebar navigation required');
assert(!component.includes('class="ws-commandbar"') && !component.includes('class="ws-tools"'), 'No standalone tools bar may remain in the workbench');
assert(layout.includes('id="ws-header-search-slot"') && component.includes('to="#ws-header-search-slot"'), 'Navbar must host the Vue-owned search portal');
assert(component.includes('class="gantt-control-actions"') && component.indexOf('class="gantt-control-actions"') < component.indexOf('class="gantt-dep-toggle"'), 'Gantt scale/pager controls must precede dependencies in the view');
assert(component.includes('inspector-crossviews') && component.includes('new URLSearchParams(window.location.search)'),'Stable-ID cross-view navigation is required');
assert(component.includes('import { publicSnapshot,') && component.includes('publicSnapshot.updatedAt'), 'public content snapshot must be imported before SSR rendering');
assert(layout.includes('PARTIAL') && layout.includes('data-zh="已审查公开内容"'), 'partial coverage must remain available in the header');
assert(layout.includes('roadmap-notice.ts') && layout.includes('data-mode="closed"'), 'Shared disclosure must mount its hover / pin controller');
assert(noticeLogic.includes("pointerenter") && noticeLogic.includes("pointerleave") && noticeLogic.includes("pointerdown") && noticeLogic.includes("keydown"), 'Disclosure must support hover, leave, outside click and Escape');
assert(noticeLogic.includes("event.preventDefault()") && noticeLogic.includes("open('pinned')"), 'Click must pin instead of toggling native details from hover');
assert(v34.includes('.ws-header-notice[open]::after') && v34.includes('height:9px'), 'Hover bridge must cover the trigger-to-popover gap');
assert(noticeLogic.includes("setMode('closing')") && noticeLogic.includes("cancelPendingClose"), 'Animated exit must be cancelable and restore hover');
assert(v34.includes('ws-notice-appear') && v34.includes('ws-notice-disappear'), 'Notice must animate opening and closing');
assert(v34.includes('.workbench[data-view="schedule"] .gantt-viewport') && v34.includes('flex:0 0 auto'), 'Gantt viewport must size to actual content and remove trailing phantom row');
const stylesheet = read('src/styles/workstation.css');
assert(!/(?:^|[;{\s])box-shadow\s*:\s*(?!none\s*!important)/m.test(stylesheet), 'workstation must not introduce shadows');
assert(!/filter\s*:\s*drop-shadow\s*\(/.test(stylesheet), 'no drop-shadow in workstation');
assert(!/\.ws-content-grid\s*\{[^}]*max-width/.test(stylesheet), 'main workbench must not be artificially max-width constrained');
assert.equal(read('public/CNAME').trim(), 'protorhexis.com');
assert(read('src/pages/index.astro').includes('建设中'), 'root must remain under construction');
assert(!read('src/components/vue/EngineeringWorkbench.vue').includes('SYNTHETIC'), 'No fabricated claims in UI');
console.log('Source invariants: PASS (4 routes, reviewed public data only, no synthetic UI, no shadows)');
