import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path,'utf8');
const vue=read('src/components/vue/EngineeringWorkbench.vue');
const graph=read('src/components/vue/SystemRelationshipGraph.vue');
const css=read('src/styles/workstation-v26.css');
const layout=read('src/layouts/EngineeringLayout.astro');
const pkg=JSON.parse(read('package.json'));
const cases=[
  ['event arrow inside event card',vue.includes('event-arrow" aria-hidden="true"') && /class="event-summary"[^>]*>.*<\/span><span class="event-arrow"/.test(vue)],
  ['three grid tracks only',css.includes('grid-template-columns:118px 27px minmax(0,1fr)') && css.includes('grid-template-columns:77px 17px minmax(0,1fr)')],
  ['event arrow retained on mobile',css.includes('.event-arrow { display:inline-flex;')],
  ['Gantt opaque mask allocated',vue.includes('class="gantt-label-mask"') && css.includes('.gantt-label-mask::after') && css.includes('background:#1e1e21')],
  ['Gantt measures complete label set',vue.includes('demoItems.map(item => tr(item.titleZh,item.titleEn))') && vue.includes('measureGanttLabels')],
  ['Gantt adapts to mobile viewport',vue.includes('window.innerWidth * .36') && css.includes('--gantt-label-width')],
  ['Gantt width consistent with calendar',vue.includes('labelWidth.value + Math.max(8') && css.includes('left:var(--gantt-label-width)')],
  ['Architecture uses Vue Flow nodes/edges',graph.includes("from '@vue-flow/core'") && graph.includes('<VueFlow') && graph.includes('graphNodes') && graph.includes('graphEdges')],
  ['Graph uses actual Handles',graph.includes('<Handle type="source"') && graph.includes('<Handle type="target"')],
  ['Architecture graph after Astro hydration only',vue.includes("import('./SystemRelationshipGraph.vue')") && vue.includes('v-if="graphComponent"')],
  ['Graph model remains illustrative',graph.includes('publicly safe example topology only') && vue.includes('真实接口依赖必须在经过公开审查后才会显示')],
  ['Reduced motion styling retained',read('src/styles/workstation-layer-motion.css').includes('prefers-reduced-motion')],
  ['Styling actually bundled',layout.includes("import '../styles/workstation-v26.css'")],
  ['Test coverage uploaded',read('tests/e2e/workstation.spec.mjs').includes('Gantt labels have one opaque sticky mask')],
  ['No shadows introduced', !/box-shadow\s*:\s*(?!none\b)/i.test(css)],
  ['Dependency available',pkg.dependencies['@vue-flow/core']?.startsWith('^1.')],
];
for(const [name,ok] of cases) assert.ok(ok,`V2.6 regression: ${name}`);
console.log(`V2.6 source contract: PASS (${cases.length} checks)`);
