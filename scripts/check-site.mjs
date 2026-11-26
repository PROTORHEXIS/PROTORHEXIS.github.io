import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
assert.equal(read('public/CNAME').trim(), 'protorhexis.com');
// Keep the visual policy independent of stylesheet filenames and declaration formatting.
for (const name of readdirSync(new URL('../src/styles/', import.meta.url))) {
  if (!name.startsWith('workstation') || !name.endsWith('.css')) continue;
  const css = read('src/styles/' + name).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, value] of css.matchAll(/box-shadow\s*:\s*([^;}]+)/gi)) {
    assert.match(value.trim(), /^none(?:\s*!important)?$/, name + ': decorative shadow');
  }
  assert(!/filter\s*:\s*drop-shadow\s*\(/i.test(css), name + ': drop shadow');
}
console.log('Site contract: PASS');
