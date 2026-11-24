import type { Stage, Stream, PublicEvent, WorkItem } from '../../data/workstation-public';

export type Translate = (zh: string, en: string) => string;
export const stages: {id:Stage,zh:string,en:string,code:string}[] = [
  {id:'future',zh:'未来方向',en:'FUTURE',code:'01'},
  {id:'planned',zh:'已规划',en:'PLANNED',code:'02'},
  {id:'development',zh:'开发中',en:'IN DEVELOPMENT',code:'03'},
  {id:'qualification',zh:'验证中',en:'QUALIFICATION',code:'04'},
  {id:'review',zh:'发布评审',en:'RELEASE REVIEW',code:'05'},
  {id:'published',zh:'已发布',en:'PUBLISHED',code:'06'},
];

export function roadmapLabels(tr: Translate) {
  const stageName = (stage: Stage) => { const s = stages.find(x => x.id === stage); return s ? tr(s.zh, s.en) : stage; };
  const streamName = (s: Stream) => ({platform:tr('平台','PLATFORM'),product:tr('产品','PRODUCT'),infrastructure:tr('基础设施','INFRASTRUCTURE')})[s];
  const eventName = (k:PublicEvent['kind']) => ({milestone:tr('里程碑','MILESTONE'),verification:tr('验证','VERIFICATION'),decision:tr('决策变更','DECISION')})[k];
  const deliveryName = (state:WorkItem['deliveryState']) => ({
    unassigned:tr('未指定交付','UNASSIGNED'),
    tentative:tr('暂定交付','TENTATIVE'),
    committed:tr('已通过交付门禁','COMMITTED'),
    released:tr('已发布','RELEASED')
  })[state];
  function fmtDate(s:string|null) { return s ? s.replaceAll('-','.') : tr('未确定','NOT SCHEDULED'); }
  return { stageName, streamName, eventName, deliveryName, fmtDate };
}
