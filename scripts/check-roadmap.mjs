import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const file='src/data/roadmap.generated.json';
const s=JSON.parse(readFileSync(file,'utf8'));
assert.equal(s.schemaVersion,1);
assert.equal(s.publicationStatus,'APPROVED_PUBLIC_SNAPSHOT');
assert.equal(s.programs.length,5);
assert.equal(s.workItems.length,5);
assert.equal(s.events.length,4);
assert.equal(s.relations.length,0);
assert(s.workItems.some(x=>x.schedule===null && x.phase==='planned'));
assert(s.workItems.every(x=>x.program==='PROTORHEXIS'));
assert(!existsSync('src/data/workstation-demo.ts'));
assert(s.events.every(x=>x.sources.every(y=>new URL(y.url).hostname==='github.com')));
const cli=(...args)=>spawnSync(process.execPath,['scripts/roadmap-cli.mjs',...args],{encoding:'utf8'});
const validate=cli('validate');assert.equal(validate.status,0,validate.stderr);
const work=s.workItems.find(x=>x.id==='WEB-SITE-005');
const sha=(obj)=>'sha256:'+createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const input='.roadmap-cli-test.jsonl';
const header={schema:'roadmap-intake/v1',batch:'check-roadmap-001',source:'public/agent-test'};
const patch={op:'patch',id:work.id,base:sha(work),set:{phase:'development'},evidence:[{url:'https://github.com/PROTORHEXIS/PROTORHEXIS.github.io/pull/9'}]};
try{
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(patch)+'\n');
  let r=cli('intake','--input',input);assert.equal(r.status,0,r.stderr);
  // Intakes are candidate-only; never touch compiled public snapshot.
  assert.equal(cli('validate').status,0);
  patch.base='sha256:'+'0'.repeat(64);
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(patch)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
  patch.base=sha(work);patch.set={publication:'approved'};
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(patch)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
  patch.set={phase:'development'};patch.evidence=[];
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(patch)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
}finally{rmSync(input,{force:true})}
console.log('ROADMAP_V3.1_PASS: approved data, unknown dates, agent delta, stale revision, forbidden fields and evidence gate');
