/** Adapter from a signed-off, statically generated public snapshot. No private feed. */
import snapshot from './roadmap.generated.json';
export type ProgramId = 'TALOS'|'MAXWELL'|'THOULESS'|'TESSERACT'|'PROTORHEXIS';
export type Stage = 'planned'|'development'|'qualification'|'review'|'published';
export type Stream = 'platform'|'product'|'infrastructure';
export type Source = { url:string; sha?:string;note?:string };
export interface WorkItem { id:string;program:ProgramId;titleZh:string;titleEn:string;descZh:string;descEn:string;start:string|null;end:string|null;stage:Stage;stream:Stream;deps:string[];evidence:Source[];scheduleKind:string|null; }
export interface PublicEvent { id:string; date:string;program:ProgramId;kind:'milestone'|'verification'|'decision';titleZh:string;titleEn:string;descZh:string;descEn:string;evidence:Source[]; }
export const publicSnapshot=snapshot;
export const publicPrograms = snapshot.programs.map(p=>({id:p.id as ProgramId, code:p.code,zh:p.title.zh,en:p.title.en,summaryZh:p.description.zh,summaryEn:p.description.en}));
export const publicItems:WorkItem[] = snapshot.workItems.map(i=>({
  id:i.id,program:i.program as ProgramId,titleZh:i.title.zh,titleEn:i.title.en,
  descZh:i.description.zh,descEn:i.description.en,start:i.schedule?.start??null,end:i.schedule?.end??null,
  stage:i.phase as Stage,stream:i.category as Stream,deps:i.dependsOn,evidence:i.sources,scheduleKind:i.schedule?.kind??null
}));
export const publicEvents:PublicEvent[] = snapshot.events.map(e=>({
  id:e.id,date:e.date,program:e.program as ProgramId,kind:e.kind as PublicEvent['kind'],
  titleZh:e.title.zh,titleEn:e.title.en,descZh:e.description.zh,descEn:e.description.en,evidence:e.sources
}));
