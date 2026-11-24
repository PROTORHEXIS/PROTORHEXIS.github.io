import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const file='src/data/roadmap.generated.json';
const s=JSON.parse(readFileSync(file,'utf8'));
assert.equal(s.schemaVersion,1);
assert.equal(s.publicationStatus,'APPROVED_PUBLIC_SNAPSHOT');
assert.equal(s.programs.length,5);
const baselineWork=['MAX-FUTURE-001','MAX-PROGRESS-001','PRO-FUTURE-001','PRO-FUTURE-002','TAL-FUTURE-001','TAL-PROGRESS-001','TES-FUTURE-001','TES-PROGRESS-001','THO-FUTURE-001','THO-PROGRESS-001','WEB-SITE-001','WEB-SITE-002','WEB-SITE-003','WEB-SITE-004','WEB-SITE-005'];
assert(baselineWork.every(id=>s.workItems.some(w=>w.id===id)),'Historical work IDs must be retained');
assert(s.workItems.filter(x=>x.phase==='future').every(x=>x.schedule===null));
assert(s.workItems.filter(x=>x.reviewReceipt).every(x=>x.delivery.state==='unassigned'),'Private source disclosure never proves product release readiness');
assert(s.workItems.filter(x=>x.phase==='future').every(x=>x.delivery.state==='unassigned'));
const reviewed=s.workItems.filter(x=>x.reviewReceipt);
assert.equal(new Set(reviewed.map(x=>x.reviewReceipt)).size,reviewed.length,'Duplicate review receipt');
assert(reviewed.every(x=>x.publication==='approved' && !x.sources.length),'No raw/private source');
for(const id of ['MAX-PROGRESS-001','TAL-PROGRESS-001','TES-PROGRESS-001','THO-PROGRESS-001']){const w=s.workItems.find(x=>x.id===id);assert(w.reviewReceipt||w.sources.length,'Progress needs current provenance');}
assert(['SITE-EV-001','SITE-EV-002','SITE-EV-003','SITE-EV-004'].every(id=>s.events.some(e=>e.id===id)),'Historical events must be retained');
assert.equal(new Set(s.events.map(e=>e.id)).size,s.events.length,'Duplicate event ID');
for(const r of [...s.events,...s.workItems])for(const src of r.sources){const prefix='https://github.com/PROTORHEXIS/PROTORHEXIS.github.io/blob/main/docs/roadmap-disclosures/';if(src.url.startsWith(prefix)){const name=src.url.slice(prefix.length);assert(/^[a-z][a-z0-9-]*\.md$/.test(name),'Invalid disclosure path');assert(existsSync('docs/roadmap-disclosures/'+name),'Missing disclosure note');}}
assert.equal(s.relations.length,4);
assert.deepEqual(s.relations.map(r=>r.id),['REL-ORG-MAXWELL','REL-ORG-TALOS','REL-ORG-TESSERACT','REL-ORG-THOULESS']);
assert(s.relations.every(r=>r.publication==='approved' && r.kind==='contains' && r.from==='PROTORHEXIS' && r.to!=='PROTORHEXIS'));
assert.equal(new Set(s.relations.map(r=>r.to)).size,4,'Every target must be unique');
assert(s.relations.every(r=>r.sources.length>0 && r.sources.every(src=>{
  const u=new URL(src.url);
  return u.hostname==='github.com' && /^\/PROTORHEXIS\/(?:\.github|PROTORHEXIS\.github\.io)\//.test(u.pathname);
})),'Organizational relations must have allowlisted public sources');
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
  // Agent may append a sanitized draft work item, but cannot declare review or publication.
  const candidate={op:'append',kind:'work',id:'SAMPLE-STATUS-001',record:{
    id:'SAMPLE-STATUS-001',program:'TALOS',title:{zh:'测试候选',en:'Test candidate'},
    description:{zh:'仅用于测试。',en:'Test only.'},phase:'development',category:'platform',
    schedule:null,dependsOn:[],sources:[],updatedAt:'2026-11-18',delivery:{state:'unassigned'},verifiedAt:null
  }};
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(candidate)+'\n');
  r=cli('intake','--input',input);assert.equal(r.status,0,r.stderr);
  candidate.record.reviewReceipt='PUB-RM-20261118-FAKE';
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(candidate)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
  delete candidate.record.reviewReceipt;
  candidate.record.delivery={state:'committed',target:'NEXT',gateReceipt:'UNVERIFIED'};
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(candidate)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
  candidate.record.delivery={state:'unassigned'};
  candidate.record.publication='approved';
  writeFileSync(input,JSON.stringify(header)+'\n'+JSON.stringify(candidate)+'\n');
  r=cli('intake','--input',input);assert.notEqual(r.status,0);
}finally{rmSync(input,{force:true})}
const roundup=cli('roundup','--since','2026-11-17');
assert.equal(roundup.status,0,roundup.stderr);
assert(roundup.stdout.includes('SITE-EV-004') && roundup.stdout.includes('Sources:'),'Roundup must cite already-approved events');
assert(!/https:\/\/github\.com\/(?!PROTORHEXIS\/)/.test(roundup.stdout),'Only approved public GitHub sources may appear');
console.log('Roadmap content and intake: PASS');
