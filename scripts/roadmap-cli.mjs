#!/usr/bin/env node
/** Read-only public content builder + private/local agent intake candidate validator. */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseDocument, stringify as yamlStringify } from 'yaml';
import { schemas, identifier } from '../src/lib/roadmap-content-schema.mjs';

const root=resolve(import.meta.dirname,'..');
const contentRoot=join(root,'src/content/roadmap');
const definitions=[['program','programs','.yaml'],['work','work-items','.md'],['event','updates','.md'],['relation','relations','.yaml']];
const inputArgs=process.argv.slice(2);
const action=inputArgs.shift() || 'help';
const option=(flag,fallback)=>{const i=inputArgs.indexOf(flag);return i<0?fallback:inputArgs[i+1];};
const hash=s=>'sha256:'+createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');
function fail(message){ throw new Error(message); }
function readSource(path) {
  const raw=readFileSync(path,'utf8');
  let yaml=raw;
  if(path.endsWith('.md')) {
    const match=raw.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if(!match)fail(`Missing Markdown frontmatter: ${path}`);
    yaml=match[1];
  }
  const doc=parseDocument(yaml,{uniqueKeys:true,strict:true});
  if(doc.errors.length)fail(`${path}: ${doc.errors[0].message}`);
  const parsed=doc.toJS();
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')fail(`Object required: ${path}`);
  return parsed;
}
function loadContent(){
  const store={program:[],work:[],event:[],relation:[]};
  const seen=new Set();
  for(const [kind,folder,ext] of definitions){
    for(const filename of readdirSync(join(contentRoot,folder)).filter(n=>n.endsWith(ext)).sort()){
      const data=readSource(join(contentRoot,folder,filename));
      const checked=schemas[kind].safeParse(data);
      if(!checked.success)fail(`${folder}/${filename}: ${checked.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')}`);
      if(seen.has(data.id))fail(`Duplicate globally unique ID: ${data.id}`);
      if(filename!==`${data.id.toLowerCase()}${ext}`)fail(`Filename must match stable ID: ${filename}`);
      seen.add(data.id);
      if(data.publication!=='approved')continue; // no draft can reach generated public feed
      for(const s of data.sources||[]){
        const url=new URL(s.url);
        if(url.hostname!=='github.com' && url.hostname!=='protorhexis.com')fail(`Source must be publicly approved: ${s.url}`);
        if(url.hostname==='github.com'&&!(/^(\/PROTORHEXIS\/(?:\.github|PROTORHEXIS\.github\.io)\/)/.test(url.pathname)))
          fail(`Unreviewed source repo. Private GitHub URLs cannot be published: ${s.url}`);
      }
      store[kind].push(data);
    }
  }
  const programs=new Set(store.program.map(x=>x.id));
  const works=new Map(store.work.map(x=>[x.id,x]));
  for(const w of store.work){
    if(!programs.has(w.program))fail(`Unknown program ${w.program} for ${w.id}`);
    if(w.schedule && w.schedule.end<w.schedule.start)fail(`Invalid schedule ${w.id}`);
    if(w.phase==='published'&&!w.sources.length)fail(`Published work needs public evidence ${w.id}`);
    if(w.reviewReceipt && w.sources.length)fail(`A private review receipt cannot be mixed with public sources ${w.id}`);
    if(w.phase==='future' && (w.schedule!==null || w.reviewReceipt))fail(`Future must be undated intent without a review receipt: ${w.id}`);
    if(['development','qualification','review'].includes(w.phase)&&!w.sources.length&&!w.reviewReceipt)fail(`Active public work needs sources or a reviewed receipt: ${w.id}`);
    if(w.phase==='planned'&&w.schedule?.kind==='committed')fail(`Unverified planned item cannot promise a deadline ${w.id}`);
  }
  for(const w of store.work)for(const dep of w.dependsOn){if(!works.has(dep)||dep===w.id)fail(`Missing/self dependency: ${w.id} => ${dep}`)}
  const visiting=new Set(),visited=new Set();
  function visit(id){if(visiting.has(id))fail(`Dependency cycle at ${id}`);if(visited.has(id))return;visiting.add(id);for(const d of works.get(id).dependsOn)visit(d);visiting.delete(id);visited.add(id)}
  for(const id of works.keys())visit(id);
  for(const e of store.event){if(!programs.has(e.program)||e.item&&!works.has(e.item))fail(`Unresolved event reference: ${e.id}`)}
  for(const r of store.relation){if(!programs.has(r.from)||!programs.has(r.to)||r.from===r.to)fail(`Invalid relation: ${r.id}`)}
  store.program.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  store.work.sort((a,b)=>a.id.localeCompare(b.id));
  store.event.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  store.relation.sort((a,b)=>a.id.localeCompare(b.id));
  return store;
}
function snapshot(store){
  const compiled={schemaVersion:1,publicationStatus:'APPROVED_PUBLIC_SNAPSHOT',
    updatedAt:[...store.work.map(x=>x.updatedAt),...store.event.map(x=>x.date)].sort().at(-1)||null,
    programs:store.program,workItems:store.work,events:store.event,relations:store.relation};
  return {...compiled,sourceRevision:hash(compiled)};
}
function generated(){return join(root,'src/data/roadmap.generated.json')}
function recordContext(id){
  const store=loadContent();let obj,kind;
  for(const [k,records] of Object.entries(store)){obj=records.find(r=>r.id===id);if(obj){kind=k;break}}
  if(!obj)fail(`Unknown public record ID: ${id}`);
  const {description,documentation,...compact}=obj;
  return {kind,base:hash(obj),record:compact,contentHints:{hasDescription:Boolean(description),hasBody:Boolean(documentation)}};
}
function parseIntake(path){
  const lines=readFileSync(path,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<2)fail('JSONL requires header and at least one operation');
  let records;try{records=lines.map((x,i)=>{try{return JSON.parse(x)}catch(e){fail(`Invalid JSONL line ${i+1}: ${e.message}`)}})}catch(e){throw e}
  const [head,...ops]=records;
  if(head.schema!=='roadmap-intake/v1'||!/^[-\w]{4,96}$/.test(head.batch||'')||Object.keys(head).some(k=>!['schema','batch','source'].includes(k)))fail('Invalid intake header');
  if(!head.source||typeof head.source!=='string')fail('Intake source reference required');
  const current=loadContent();const indexed=new Map(Object.entries(current).flatMap(([kind,rows])=>rows.map(r=>[r.id,{kind,record:r}])));
  const seen=new Set();
  const out=[];
  for(const op of ops){
    if(!op.id||!identifier.safeParse(op.id).success||seen.has(op.id))fail(`Invalid or repeated ID in batch: ${op.id}`);
    seen.add(op.id);
    if(op.op==='patch'){
      const orig=indexed.get(op.id);
      if(!orig||orig.kind!=='work')fail(`Patch work ID not found: ${op.id}`);
      if(op.base!==hash(orig.record))fail(`Stale base revision for ${op.id}`);
      if(Object.keys(op).some(k=>!['op','id','base','set','evidence'].includes(k)))fail(`Unauthorized patch field ${op.id}`);
      if(!op.set||typeof op.set!=='object'||Array.isArray(op.set)||!Object.keys(op.set).length)fail(`Patch fields required: ${op.id}`);
      if(Object.keys(op.set).some(k=>!['phase','schedule','description','dependsOn'].includes(k)))fail(`Patch includes forbidden fields: ${op.id}`);
      if(!Array.isArray(op.evidence)||!op.evidence.length)fail(`Each patch needs evidence ${op.id}`);
      const next={...orig.record,...op.set,sources:[...orig.record.sources,...op.evidence],publication:'draft'};
      const result=schemas.work.safeParse(next);if(!result.success)fail(`Invalid patch ${op.id}: ${result.error.message}`);
      out.push({op:'patch',kind:'work',id:op.id,before:hash(orig.record),after:hash(next),record:next});
    }else if(op.op==='append'){
      if(!['work','event','relation'].includes(op.kind)||!op.record)fail(`Only work/event/relation append is allowed: ${op.id}`);
      if(indexed.has(op.id))fail(`Append ID already exists: ${op.id}`);
      if(op.record.id!==op.id)fail(`Append id mismatch: ${op.id}`);
      if('reviewReceipt' in op.record || 'publication' in op.record)fail(`Agent cannot issue review receipts or publication approval: ${op.id}`);
      if(op.kind==='work' && op.record.sources?.some(s=>!s.url||!/^https:\/\/github\.com\/PROTORHEXIS\/(?:\.github|PROTORHEXIS\.github\.io)\//.test(s.url)))fail(`Agent work candidate sources must be allowlisted public URLs: ${op.id}`);
      if(Object.keys(op).some(k=>!['op','id','kind','record'].includes(k)))fail(`Unknown append field: ${op.id}`);
      const r=schemas[op.kind].safeParse({...op.record,publication:'draft'});
      if(!r.success)fail(`Invalid append: ${op.id}: ${r.error.message}`);
      out.push({op:'append',kind:op.kind,id:op.id,record:r.data});
    }else fail(`Unknown operation: ${op.op}`);
  }
  return {batch:head.batch,source:head.source,digest:hash(records),changes:out};
}
try{
  if(action==='compile'||action==='validate'){
    const data=snapshot(loadContent());
    const serialized=JSON.stringify(data,null,2)+'\n';
    if(action==='compile'){writeFileSync(generated(),serialized);console.log(`PUBLIC_SNAPSHOT_WRITTEN ${data.sourceRevision} programs=${data.programs.length} work=${data.workItems.length} events=${data.events.length} relations=${data.relations.length}`)}
    else {if(!existsSync(generated())||readFileSync(generated(),'utf8')!==serialized)fail('Generated snapshot differs: run roadmap:compile');console.log(`PUBLIC_SNAPSHOT_VALID ${data.sourceRevision}`)}
  } else if(action==='context'){
    const id=option('--id');if(!id)fail('--id required');
    console.log(JSON.stringify(recordContext(id)));
  } else if(action==='new'){
    const kind=option('--kind');const id=option('--id');
    if(!schemas[kind]||!identifier.safeParse(id).success)fail('Specify --kind program|work|event|relation --id ID');
    const def=definitions.find(x=>x[0]===kind);const file=join(contentRoot,def[1],`${id.toLowerCase()}${def[2]}`);
    if(existsSync(file))fail('Refusing to overwrite existing content');
    const stub={id,publication:'draft'};
    writeFileSync(file,def[2]==='.md'?`---\n${yamlStringify(stub)}---\n\n待填写内容。\n`:yamlStringify(stub));
    console.log(file);
  } else if(action==='intake'){
    const file=option('--input');if(!file)fail('--input required');
    const packet=parseIntake(resolve(file));
    if(inputArgs.includes('--stage')){
      const dir=join(root,'.roadmap-candidates');mkdirSync(dir,{recursive:true});
      const target=join(dir,packet.batch+'.json');
      if(existsSync(target)){
        const old=JSON.parse(readFileSync(target,'utf8'));
        if(old.digest!==packet.digest)fail('Batch ID reuse with different payload');
        console.log(`IDEMPOTENT_NOOP ${packet.batch}`);
      } else {writeFileSync(target,JSON.stringify(packet,null,2)+'\n');console.log(`PRIVATE_CANDIDATE_STAGED ${target} (never auto-published)`)}
    } else console.log(JSON.stringify({batch:packet.batch,digest:packet.digest,changes:packet.changes.map(x=>({op:x.op,id:x.id,kind:x.kind}))}));
  } else if(action==='help') console.log('roadmap-cli: compile | validate | new --kind work --id XXX | context --id XXX | intake --input changes.jsonl [--stage]');
  else fail(`Unknown action ${action}`);
}catch(e){console.error('ROADMAP_REJECTED:',e.message);process.exitCode=1}
