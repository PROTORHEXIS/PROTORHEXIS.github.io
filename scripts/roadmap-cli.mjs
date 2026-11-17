#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'content/roadmap/public.json');
const read=()=>JSON.parse(readFileSync(source,'utf8'));
const fail=(msg)=>{console.error(`ROADMAP_INVALID: ${msg}`);process.exitCode=1;};
const kinds=['programs','items','events'];
const stages=['planned','development','qualification','review','published'];
const validDate=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));
function validate(d){
 if(d.schema!=='public-roadmap/v1'||!Number.isInteger(d.revision)||d.revision<1)throw Error('schema/revision');
 if(!['APPROVED_PUBLIC_SOURCE','PREVIEW_ONLY'].includes(d.publicationStatus))throw Error('publicationStatus');
 const ids=new Set();const programs=new Set((d.programs||[]).map(x=>x.id));
 for(const kind of kinds){if(!Array.isArray(d[kind]))throw Error(`missing ${kind}`);for(const x of d[kind]){
  if(typeof x.id!=='string'||!/^[-A-Z0-9]{3,40}$/.test(x.id)||ids.has(x.id))throw Error(`duplicate/invalid id ${x.id}`);ids.add(x.id);
  if(!x.titleZh && kind!=='programs')throw Error(`missing title ${x.id}`);
  if(kind!=='programs'&&!programs.has(x.program))throw Error(`unknown program ${x.id}`);
  if(kind==='items'){
   if(!validDate(x.start)||!validDate(x.end)||x.start>x.end)throw Error(`invalid historical window ${x.id}`);
   if(!stages.includes(x.stage))throw Error(`invalid stage ${x.id}`);
   if(!['platform','product','infrastructure'].includes(x.stream))throw Error(`invalid stream ${x.id}`);
   if(!Array.isArray(x.deps))throw Error(`deps required ${x.id}`);
  }
  if(kind==='events' && (!validDate(x.date)||!['milestone','verification','decision'].includes(x.kind)))throw Error(`event ${x.id}`);
  if(kind!=='programs' && (!Array.isArray(x.evidence)||x.evidence.length===0||x.evidence.some(url=>typeof url!=='string'||!url.startsWith('https://github.com/'))))throw Error(`public evidence required ${x.id}`);
 }}
 const itemIds=new Set(d.items.map(x=>x.id));for(const x of d.items)for(const dep of x.deps)if(!itemIds.has(dep)||dep===x.id)throw Error(`invalid dependency ${x.id} -> ${dep}`);
 return d;
}
function context(d,ids){const selection=new Set(ids);return {schema:d.schema,revision:d.revision,editable:['titleZh','titleEn','descZh','descEn','stage','evidence'],items:d.items.filter(x=>selection.has(x.id)),events:d.events.filter(x=>selection.has(x.id))};}
function intake(file){const lines=readFileSync(file,'utf8').split(/\r?\n/).filter(x=>x.trim()).map((s,i)=>{try{return JSON.parse(s)}catch{throw Error(`invalid JSONL line ${i+1}`)}});
 const head=lines.shift();if(head?.schema!=='roadmap-intake/v1'||!Number.isInteger(head.base)||typeof head.batch!=='string'||!head.source)throw Error('invalid intake header');
 const d=read();validate(d);if(head.base!==d.revision)throw Error(`stale revision ${head.base}; expected ${d.revision}`);
 const allowed=new Set(['titleZh','titleEn','descZh','descEn','stage','evidence']);const touched=new Set();
 for(const op of lines){if(op.op!=='patch'||typeof op.id!=='string'||!op.set||typeof op.set!=='object'||Array.isArray(op.set))throw Error('only patch operations supported in v1');
  if(touched.has(op.id))throw Error(`duplicate patch ${op.id}`);touched.add(op.id);
  const item=d.items.find(x=>x.id===op.id);if(!item)throw Error(`unknown item ${op.id}`);
  for(const [key,value] of Object.entries(op.set)){if(!allowed.has(key))throw Error(`protected field ${key}`);if(value===null)throw Error(`null not supported ${key}`);if(key==='stage')throw Error('stage changes require a separate reviewed public release decision');item[key]=value;}
  if(op.evidence){if(!Array.isArray(op.evidence))throw Error('invalid evidence');item.evidence=[...new Set([...item.evidence,...op.evidence])];}
 }
 validate(d);return {batch:head.batch,source:head.source,base:head.base,changes:lines,preview:d};
}
const [command,...args]=process.argv.slice(2);
try{
 if(command==='validate'){const d=validate(read());console.log(JSON.stringify({result:'PASS',revision:d.revision,items:d.items.length,events:d.events.length}));}
 else if(command==='context'){const d=validate(read());console.log(JSON.stringify(context(d,args),null,2));}
 else if(command==='intake'){if(args.length!==1)throw Error('usage: roadmap intake changes.jsonl');const proposal=intake(args[0]);const digest=createHash('sha256').update(JSON.stringify(proposal)).digest('hex').slice(0,16);const path=resolve(root,`private-candidates/${proposal.batch}-${digest}.json`);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'CANDIDATE_ONLY',path,digest,publication:'NOT_AUTHORIZED'}));}
 else throw Error('usage: roadmap validate | context ID... | intake file.jsonl');
}catch(e){fail(e.message)}
