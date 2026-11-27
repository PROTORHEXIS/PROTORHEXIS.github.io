/** Adapter from a signed-off, statically generated public snapshot. No private feed. */
import snapshot from './roadmap.v2.generated.json';
import { primarySchedule } from '../lib/roadmap-projection.mjs';
export type ProgramId = 'TALOS'|'MAXWELL'|'THOULESS'|'TESSERACT'|'PROTORHEXIS';
export type Stage = 'future'|'planned'|'development'|'qualification'|'review'|'published';
export type Stream = 'platform'|'product'|'infrastructure';
export type DeliveryState = 'unassigned'|'tentative'|'committed'|'released';
export type Source = { url:string; sha?:string;note?:string };
export type ScheduleWindow = {id:string;kind:'planned'|'forecast'|'actual'|'observed';start:string|null;end:string|null;commitment:'none'|'tentative'|'committed'};
export type Localized = {zh:string;en:string};
export type ChangeKind = 'added'|'changed'|'improved'|'fixed'|'security'|'deprecated'|'removed'|'known_issue'|'migration';
export type Verification = 'pass'|'fail'|'not_run'|'blocked'|'unknown'|'conflict';
export type PublicRelease = {id:string;program:ProgramId;displayName:Localized;version:string|null;channel:string;date:string|null;preview:boolean;summary:Localized;availability:'unknown'|'unavailable'|'preview'|'available'|'withdrawn';changeIds:string[];components?:{name:Localized;version:string|null}[];sources:Source[];publicUpdatedAt:string};
export type PublicChange = {id:string;releaseId:string;kind:ChangeKind;text:Localized;implementation:'planned'|'implemented';verification:Verification;workIds?:string[];sources:Source[];publicUpdatedAt:string};
export interface WorkItem { id:string;program:ProgramId;titleZh:string;titleEn:string;descZh:string;descEn:string;start:string|null;end:string|null;stage:Stage;stream:Stream;deps:string[];evidence:Source[];scheduleKind:string|null;reviewReceipt:string|null;deliveryState:DeliveryState;releaseTarget:string|null;verifiedAt:string|null;updatedAt:string; lifecycle:string|null;disposition:string|null;verificationSummary:{result:Verification;scope:string;asOf:string|null}|null;scheduleWindows:ScheduleWindow[];linkedReleaseIds:string[]; }
export interface PublicEvent { id:string; date:string;program:ProgramId;itemId:string|null;kind:'milestone'|'verification'|'decision'|'release';releaseId:string|null;titleZh:string;titleEn:string;descZh:string;descEn:string;evidence:Source[];change:null|{field:string;before:string;after:string;reason:{zh:string;en:string}}; }
export const publicSnapshot=snapshot;
export const publicPrograms = snapshot.programs.map(p=>({id:p.id as ProgramId, code:p.code,zh:p.title.zh,en:p.title.en,summaryZh:p.description.zh,summaryEn:p.description.en}));
export const publicItems:WorkItem[] = snapshot.workItems.map(i=>{const selected=primarySchedule(i);return ({
  id:i.id,program:i.program as ProgramId,titleZh:i.title.zh,titleEn:i.title.en,
  descZh:i.description.zh,descEn:i.description.en,start:selected?.start??null,end:selected?.end??null,
  stage:i.phase as Stage,stream:i.category as Stream,deps:i.dependsOn,evidence:i.sources,scheduleKind:selected?.kind??null,reviewReceipt:'reviewReceipt' in i && typeof i.reviewReceipt === 'string' ? i.reviewReceipt : null,
  deliveryState:i.delivery.state as DeliveryState,releaseTarget:'target' in i.delivery ? i.delivery.target??null : null,
  verifiedAt:i.verifiedAt,updatedAt:i.updatedAt,
  lifecycle:'lifecycle' in i?String(i.lifecycle):null,disposition:'disposition' in i?String(i.disposition):null,
  verificationSummary:'verificationSummary' in i?i.verificationSummary as WorkItem['verificationSummary']:null,
  scheduleWindows:i.scheduleWindows as ScheduleWindow[],linkedReleaseIds:'linkedReleaseIds' in i?i.linkedReleaseIds as string[]:[]
});});
type EventRecord={id:string;date:string;program:string;item?:string;kind:string;releaseId?:string;title:Localized;description:Localized;sources:Source[];change?:NonNullable<PublicEvent['change']>};
export function toPublicEvents(events:EventRecord[]):PublicEvent[] {return events.map(e=>({
  id:e.id,date:e.date,program:e.program as ProgramId,itemId:'item' in e ? e.item??null:null,kind:e.kind as PublicEvent['kind'],releaseId:e.releaseId??null,
  titleZh:e.title.zh,titleEn:e.title.en,descZh:e.description.zh,descEn:e.description.en,evidence:e.sources,
  change:e.change??null
}));}
export const publicEvents=toPublicEvents(snapshot.events);
export const publicReleaseRecords=snapshot.releases as PublicRelease[];
export const publicChangeRecords=snapshot.changes as PublicChange[];
