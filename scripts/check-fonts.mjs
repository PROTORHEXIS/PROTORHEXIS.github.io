import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const layout=read('src/layouts/BaseLayout.astro');
const css=read('src/styles/site.css');
const pkg=JSON.parse(read('package.json'));
assert(layout.includes("import '@fontsource-variable/noto-sans/wght.css'"));
assert(layout.includes("import '@fontsource-variable/noto-sans-sc/wght.css'"));
assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(layout),'No third-party font requests');
assert(css.includes("--font-sans:'Noto Sans Variable','Noto Sans SC Variable',sans-serif"),'Shared font stack must be self-hosted sans');
assert(css.includes('--font-reading:var(--font-sans)') && css.includes('--font-structure:var(--font-sans)'));
assert(pkg.dependencies['@fontsource-variable/noto-sans'] && pkg.dependencies['@fontsource-variable/noto-sans-sc']);
for(const file of readdirSync('src/styles').filter(n=>n.endsWith('.css'))){
 const source=read('src/styles/'+file);
 assert(!/(?:'Space Mono'|'Microsoft YaHei'|'Courier New'|\bInter\b|\bsystem-ui\b|\bmonospace\b)/.test(source),file+': no OS default font or old font stack');
}
console.log('SITE_FONT_CONTRACT_PASS: self-hosted variable Noto Sans + Noto Sans SC; CSS stacks unified');
