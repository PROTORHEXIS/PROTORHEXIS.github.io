function scheduleWindowsFor(w){
 if(w.scheduleWindows!==undefined)return [...w.scheduleWindows].sort((a,b)=>a.id.localeCompare(b.id));
 if(!w.schedule)return [];
 const s=w.schedule;
 return [{id:"LEGACY-"+w.id,kind:s.kind==="observed"?"observed":"planned",start:s.start,end:s.end,commitment:s.kind==="observed"?"none":s.kind}];
}

function primarySchedule(w){
 const order={actual:0,forecast:1,planned:2,observed:3};
 return scheduleWindowsFor(w).filter(x=>x.start&&x.end).sort((a,b)=>order[a.kind]-order[b.kind]||a.start.localeCompare(b.start)||a.id.localeCompare(b.id))[0]??null;
}

function unique(values){return new Set(values).size===values.length;}

function validateExtensions(store){
 const programs=new Set(store.program.map(x=>x.id)),works=new Map(store.work.map(x=>[x.id,x])),releases=new Map(store.release.map(x=>[x.id,x])),changes=new Map(store.change.map(x=>[x.id,x])),events=new Map(store.event.map(x=>[x.id,x]));
 function require(condition,message){if(!condition)throw Error(message);}
 for(const w of store.work){
  const windows=scheduleWindowsFor(w);
  require(unique(windows.map(x=>x.id)),`Duplicate schedule window: ${w.id}`);
  require(!(w.phase==="future"||w.lifecycle==="future")||(!windows.length&&w.schedule===null&&w.delivery.state==="unassigned"),`Future must remain undated: ${w.id}`);
  for(const s of windows){require(!s.start||!s.end||s.start<=s.end,`Invalid schedule window: ${w.id}/${s.id}`);require(s.kind==="planned"||s.commitment==="none",`Non-plan commitment: ${w.id}/${s.id}`);require(s.commitment!=="committed"||["committed","released"].includes(w.delivery.state),`Committed plan lacks existing delivery authority: ${w.id}/${s.id}`);}
  require(unique(w.linkedReleaseIds??[])&&(w.linkedReleaseIds??[]).every(id=>releases.get(id)?.program===w.program),`Unresolved work release reference: ${w.id}`);
 }
 for(const r of store.release){
  require(programs.has(r.program),`Unknown release program: ${r.id}`);
  require(!r.preview||r.date===null,`Unreleased preview cannot have an actual release date: ${r.id}`);
  require(!r.date||r.date<=r.publicUpdatedAt,`Release update precedes actual date: ${r.id}`);
  require(unique(r.changeIds)&&r.changeIds.every(id=>changes.get(id)?.releaseId===r.id),`Unresolved release changes: ${r.id}`);
 }
 for(const c of store.change){
  const r=releases.get(c.releaseId);
  require(r&&r.changeIds.includes(c.id),`Unresolved change release: ${c.id}`);
  require(unique(c.workIds??[])&&(c.workIds??[]).every(id=>works.has(id)),`Unresolved change work reference: ${c.id}`);
  require(c.implementation!=="planned"||!["pass","fail"].includes(c.verification),`Planned change cannot have implementation verification: ${c.id}`);
 }
 const releaseEvents=new Set();
 for(const e of store.event){
  if(e.kind==="release"){const r=releases.get(e.releaseId);require(r&&!r.preview&&r.program===e.program&&r.date===e.date&&!releaseEvents.has(r.id),`Invalid/duplicate release event: ${e.id}`);releaseEvents.add(r.id);}
  require(!e.publicUpdatedAt||e.publicUpdatedAt>=e.date,`Public update precedes event: ${e.id}`);
  if(e.corrects){const prior=events.get(e.corrects);require(prior&&prior.program===e.program&&prior.id!==e.id,`Unresolved event correction: ${e.id}`);}
 }
 for(const e of store.event){let x=e;const seen=new Set();while(x.corrects){require(!seen.has(x.id),`Correction cycle: ${e.id}`);seen.add(x.id);x=events.get(x.corrects);}}
}

function legacyWork(w){const {lifecycle,disposition,verificationSummary,scheduleWindows,linkedReleaseIds,...legacy}=w;return legacy;}

function legacyEvent(e,releases){
 const {publicUpdatedAt,occurredAt,corrects,releaseId,...legacy}=e;
 if(e.kind!=="release")return legacy;
 const r=releases.get(releaseId);return {...legacy,kind:"milestone",title:r.displayName,description:r.summary};
}

function compileSnapshots(store,hash){
 validateExtensions(store);
 const releases=new Map(store.release.map(r=>[r.id,r]));
 const v1={schemaVersion:1,publicationStatus:"APPROVED_PUBLIC_SNAPSHOT",
 updatedAt:[...store.work.map(x=>x.updatedAt),...store.event.map(x=>x.date)].sort().at(-1)??null,
 programs:store.program,workItems:store.work.map(legacyWork),events:store.event.map(e=>legacyEvent(e,releases)),relations:store.relation};
 const publicUpdatedAt=[...store.work.map(x=>x.updatedAt),...store.event.map(x=>x.publicUpdatedAt??x.date),...store.release.map(x=>x.publicUpdatedAt),...store.change.map(x=>x.publicUpdatedAt)].sort().at(-1)??null;
 const v2={...v1,schemaVersion:2,updatedAt:publicUpdatedAt,publicUpdatedAt,
 workItems:store.work.map(w=>({...w,scheduleWindows:scheduleWindowsFor(w)})),
 events:store.event.map(e=>e.kind==="release"?{...e,title:releases.get(e.releaseId).displayName,description:releases.get(e.releaseId).summary}:e),
 releases:store.release,changes:store.change};
 return [{...v1,sourceRevision:hash(v1)},{...v2,sourceRevision:hash(v2)}];
}

export { scheduleWindowsFor,primarySchedule,validateExtensions,compileSnapshots };
