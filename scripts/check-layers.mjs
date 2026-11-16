import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync('src/components/vue/EngineeringWorkbench.vue', 'utf8');
const css = readFileSync('src/styles/workstation-layer-motion.css', 'utf8');
const layout = readFileSync('src/layouts/EngineeringLayout.astro', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const checks = [
  ['Popover is teleported outside clipped grid', code.includes('<Teleport v-if="portalReady" to="body">') && code.includes('class="gantt-floating-range"')],
  ['Client-only Teleport preserves SSR hydration', code.includes('const portalReady = ref(false)') && code.includes('portalReady.value = true;') && code.includes('<Teleport v-if="portalReady" to="body">')],
  ['Range button uses expanded semantics', code.includes('aria-controls="gantt-range-panel"') && code.includes(':aria-expanded="showRangePanel"')],
  ['Range popover closes on outside pointer and Escape', code.includes('onGlobalPointerDown') && code.includes("event.key === 'Escape'")],
  ['Popover positions within viewport', code.includes('window.innerWidth - width - 12') && code.includes('window.innerHeight')],
  ['Mobile inspector has inert and hidden state', code.includes(':inert="isNarrow && !inspectorOpen"') && code.includes(':aria-hidden="isNarrow && !inspectorOpen')],
  ['Mobile inspector traps focus and restores scroll', code.includes("event.key === 'Tab'") && code.includes('restoreBodyScroll()')],
  ['Scoped stacking layers defined', css.includes('--ws-layer-dependency: 2;') && css.includes('--ws-layer-header: 6;') && css.includes('isolation: isolate')],
  ['Date popup escapes workbench and has own z-index', css.includes('position: fixed; z-index: var(--ws-layer-popover)')],
  ['Motion library declared', pkg.dependencies['motion-v']?.startsWith('^2.')],
  ['Motion is used for accessible detail and board feedback', code.includes('AnimatePresence mode="wait"') && code.includes('<motion.button') && code.includes('reducedMotion')],
  ['Reduced motion disables effects', css.includes('prefers-reduced-motion:reduce') && css.includes('animation-duration: 0ms!important')],
  ['Layer CSS bundled in Astro', layout.includes("import '../styles/workstation-layer-motion.css';")],
  ['No shadows introduced', [...css.matchAll(/box-shadow\s*:\s*([^;]+);/gi)].every(m => m[1].trim() === 'none')],
];
for (const [name, ok] of checks) assert.ok(ok, `FAIL: ${name}`);
console.log(`Layer and motion guards PASS (${checks.length} checks)`);
