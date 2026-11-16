import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('src/styles/workstation-refinements.css', root), 'utf8');
const layout = readFileSync(new URL('src/layouts/EngineeringLayout.astro', root), 'utf8');
const vue = readFileSync(new URL('src/components/vue/EngineeringWorkbench.vue', root), 'utf8');
assert.match(layout, /workstation-refinements\.css/, 'Refinement CSS must be imported');
for (const s of ['--ws-radius-xl','--ws-radius-lg','--ws-radius-md','--ws-radius-sm','--ws-radius-xs']) {
  assert(css.includes(s), `${s} radius token is missing`);
}
assert.match(css, /@supports\s*\(corner-shape:\s*squircle\)/, 'Progressive continuous-corner support missing');
assert.match(css, /@media\s*\(max-width:\s*740px\)/, 'Mobile layout override missing');
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Reduced-motion override missing');
assert(!/box-shadow\s*:\s*(?!none\b)[^;\n}]+/i.test(css), 'No decorative shadows allowed');
assert.match(vue, /class="ws-inspector-scrim"/, 'Mobile inspector overlay is missing');
assert.match(vue, /event\.key === 'Escape'/, 'Inspector must support Escape');
for (const selector of ['gantt-controls','gantt-dependency-layer','inspector-dep-link']) {
  assert(css.includes(`.${selector}`), `V2.3 interactive selector ${selector} missing`);
}
assert.match(vue, /@pointerdown="panStart"/, 'Gantt pan interaction missing');
assert.match(vue, /@submit\.prevent="applyCustomRange"/, 'Custom range submission missing');
assert.match(vue, /:d="edge\.d"/, 'Dependency geometry binding missing');
console.log('V2.3 design assertions: PASS (radius scale, squircle fallback, responsive, reduced-motion, inspector keyboard, zero shadows)');
