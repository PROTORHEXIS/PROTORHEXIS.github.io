import {publicReleaseRecords,publicChangeRecords,type PublicRelease,type PublicChange,type ProgramId,type Source} from '../../data/workstation-public';
import type { Translate } from './roadmap-presentation';

// Presentation adapter for the approved public V2 snapshot.
export const changeKinds = ['added','changed','improved','fixed','security','deprecated','removed','known_issue','migration'] as const;
export type ChangeKind = typeof changeKinds[number];
export type Localized = { zh:string; en:string };
export type ReleaseChange = { id:string; kind:ChangeKind; text:Localized; state:'planned'|'unconfirmed'|'verified'|'failed' };
export type ReleaseView = { id:string; program:ProgramId; version:string|null; displayName?:Localized; channel:string; date:string|null; preview:boolean; summary:Localized; availability:Localized|null; changes:ReleaseChange[]; compatibility?:Localized; migration?:Localized; knownIssues?:Localized; evidence?:Source[]; components?:PublicRelease['components'] };
const availabilityNames:Record<PublicRelease['availability'],Localized>={
  unknown:{zh:'可用状态未知',en:'Availability unknown'},unavailable:{zh:'暂不可用',en:'Unavailable'},
  preview:{zh:'预览可用',en:'Preview available'},available:{zh:'已可用',en:'Available'},withdrawn:{zh:'已撤回',en:'Withdrawn'}
};
export function toReleaseViews(releases:PublicRelease[],changes:PublicChange[]):ReleaseView[]{
  const byId=new Map(changes.map(c=>[c.id,c]));
  return releases.map(r=>({id:r.id,program:r.program,version:r.version,displayName:r.displayName,channel:r.channel,date:r.date,preview:r.preview,
    summary:r.summary,availability:availabilityNames[r.availability],evidence:r.sources,components:r.components,
    changes:r.changeIds.map(id=>{const c=byId.get(id)!;return {id:c.id,kind:c.kind,text:c.text,
      state:c.implementation==='planned'?'planned':c.verification==='pass'?'verified':c.verification==='fail'?'failed':'unconfirmed'};})
  }));
}
export const publicReleases=toReleaseViews(publicReleaseRecords,publicChangeRecords);
export const releaseTitle=(r:ReleaseView,tr:Translate)=>r.version??(r.displayName?tr(r.displayName.zh,r.displayName.en):r.id);
const names:Record<ChangeKind,Localized> = {
  added:{zh:'新增',en:'Added'},changed:{zh:'变更',en:'Changed'},improved:{zh:'改进',en:'Improved'},fixed:{zh:'修复',en:'Fixed'},security:{zh:'安全',en:'Security'},deprecated:{zh:'弃用',en:'Deprecated'},removed:{zh:'移除',en:'Removed'},known_issue:{zh:'已知问题',en:'Known issue'},migration:{zh:'迁移',en:'Migration'}
};
export const changeLabel=(kind:ChangeKind,tr:Translate)=>tr(names[kind].zh,names[kind].en);
export function changeStateLabel(change:ReleaseChange,tr:Translate) {
  if(change.state==='planned') return tr('计划中','Planned');
  if(change.kind==='fixed' && change.state==='unconfirmed') return tr('可能修复','Potential fix');
  if(change.state==='failed') return tr('验证失败','Verification failed');
  if(change.state==='verified') return change.kind==='fixed'?tr('已确认修复','Verified fix'):tr('已验证','Verified');
  return tr('尚未确认','Unconfirmed');
}
