import type { ProgramId } from '../../data/workstation-public';
import type { Translate } from './roadmap-presentation';

// Presentation contract only. The authoritative release/change schema is RM-06.
export const changeKinds = ['added','changed','improved','fixed','security','deprecated','removed','known_issue','migration'] as const;
export type ChangeKind = typeof changeKinds[number];
export type Localized = { zh:string; en:string };
export type ReleaseChange = { id:string; kind:ChangeKind; text:Localized; state:'planned'|'unconfirmed'|'verified'|'failed' };
export type ReleaseView = { id:string; program:ProgramId; version:string; channel:string; date:string|null; preview:boolean; summary:Localized; availability:Localized|null; changes:ReleaseChange[]; compatibility?:Localized; migration?:Localized; knownIssues?:Localized };
// No approved release projection exists yet. Never infer releases from work or events.
export const publicReleases: ReleaseView[] = [];
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
