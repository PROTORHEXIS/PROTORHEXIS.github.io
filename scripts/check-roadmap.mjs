import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const file='src/data/roadmap.generated.json';
const s=JSON.parse(readFileSync(file,'utf8'));
assert.equal(s.schemaVersion,1);
assert.equal(s.publicationStatus,'APPROVED_PUBLIC_SNAPSHOT');
assert.equal(s.programs.length,5);
assert.equal(s.workItems.length,15);
assert.equal(s.workItems.filter(x=>x.phase==='future').length,6);
assert(s.workItems.filter(x=>x.phase==='future').every(x=>x.schedule===null && x.sources.length===0));
assert(s.workItems.every(x=>x.delivery && x.verifiedAt===null),'No invented independent verification date');
assert(s.workItems.filter(x=>x.reviewReceipt).every(x=>x.delivery.state==='unassigned'),'Private source disclosure never proves product release readiness');
assert(s.workItems.filter(x=>x.phase==='published').every(x=>x.program==='PROTORHEXIS' && x.delivery.state==='released'),'Only evidenced public website artifacts are released');
assert(s.workItems.filter(x=>x.phase==='future').every(x=>x.delivery.state==='unassigned'));
const reviewed=s.workItems.filter(x=>x.reviewReceipt);
assert.equal(reviewed.length,4,'Four approved sanitized private-source summaries expected');
assert.equal(new Set(reviewed.map(x=>x.reviewReceipt)).size,4,'Duplicate review receipt');
assert(reviewed.every(x=>x.publication==='approved' && !x.sources.length && x.schedule===null),'No raw/private source or invented schedule');
assert.deepEqual(reviewed.map(x=>x.id).sort(),['MAX-PROGRESS-001','TAL-PROGRESS-001','TES-PROGRESS-001','THO-PROGRESS-001']);
assert.equal(s.events.length,4);
assert.equal(s.relations.length,4);
assert.deepEqual(s.relations.map(r=>r.id),['REL-ORG-MAXWELL','REL-ORG-TALOS','REL-ORG-TESSERACT','REL-ORG-THOULESS']);
assert(s.relations.every(r=>r.publication==='approved' && r.kind==='contains' && r.from==='PROTORHEXIS' && r.to!=='PROTORHEXIS'));
assert.equal(new Set(s.relations.map(r=>r.to)).size,4,'Every target must be unique');
assert(s.relations.every(r=>r.sources.length>0 && r.sources.every(src=>{
  const u=new URL(src.url);
  return u.hostname==='github.com' && /^\/PROTORHEXIS\/(?:\.github|PROTORHEXIS\.github\.io)\//.test(u.pathname);
})),'Organizational relations must have allowlisted public sources');
assert(s.workItems.some(x=>x.schedule===null && x.phase==='planned'));
assert(s.workItems.some(x=>x.program==='TALOS') && s.workItems.some(x=>x.program==='MAXWELL'));
assert.equal(s.workItems.filter(x=>x.id.endsWith('PROGRESS-001')).length,4);
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
assert(!roundup.stdout.includes('HoshiriAki/'),'No private links may appear');
console.log('ROADMAP_V3.4_PASS: separate delivery and disclosure, source-backed roundup, agent constraints and review boundaries');
