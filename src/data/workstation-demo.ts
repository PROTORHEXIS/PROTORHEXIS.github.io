/**
 * SYNTHETIC visual-demo fixtures ONLY. Not pulled from PROTORHEXIS engineering records.
 * Dates, stages, durations and events are invented for UI validation. Do not publish as factual.
 * Public facts must come from an approved, provenance-checked feed later.
 */
export type ProgramId = 'TALOS' | 'MAXWELL' | 'THOULESS' | 'TESSERACT' | 'PROTORHEXIS';
export type Stage = 'planned' | 'development' | 'qualification' | 'review' | 'published';
export type Stream = 'platform' | 'product' | 'infrastructure';
export interface WorkItem {
  id: string; program: ProgramId; titleZh: string; titleEn: string;
  descZh: string; descEn: string; start: string; end: string;
  stage: Stage; stream: Stream; deps: string[];
}
export interface PublicEvent {
  id: string; date: string; program: ProgramId; kind: 'milestone' | 'verification' | 'decision';
  titleZh: string; titleEn: string; descZh: string; descEn: string;
}
export const demoPrograms: {id: ProgramId; code: string; zh: string; en: string}[] = [
  {id:'TALOS',code:'SYS-01',zh:'通用系统平台',en:'System platform'},
  {id:'MAXWELL',code:'SYS-02',zh:'执行与自动化',en:'Execution automation'},
  {id:'THOULESS',code:'PRD-01',zh:'租赁产品',en:'Rental product'},
  {id:'TESSERACT',code:'PRD-02',zh:'仓储业务',en:'Warehousing'},
  {id:'PROTORHEXIS',code:'ORG-01',zh:'公共工程站点',en:'Public engineering web'},
];
export const demoItems: WorkItem[] = [
  {id:'TAL-01',program:'TALOS',titleZh:'系统通信契约',titleEn:'Communication contract',descZh:'统一跨模块通信结构与兼容边界。',descEn:'Unified inter-module messaging and compatibility boundaries.',start:'2026-11-01',end:'2027-01-23',stage:'development',stream:'platform',deps:[]},
  {id:'TAL-02',program:'TALOS',titleZh:'执行上下文与隔离',titleEn:'Context & isolation',descZh:'围绕租户上下文、故障域与访问控制进行有界验证。',descEn:'Bounded review of tenant contexts, fault domains and access boundaries.',start:'2027-01-03',end:'2027-04-13',stage:'qualification',stream:'platform',deps:['TAL-01']},
  {id:'TAL-03',program:'TALOS',titleZh:'生产候选验证',titleEn:'Production candidate',descZh:'版本能力门禁和部署资格评估示例。',descEn:'Example version qualification and deployment-readiness evaluation.',start:'2027-05-05',end:'2027-08-15',stage:'planned',stream:'platform',deps:['TAL-02']},
  {id:'MAX-01',program:'MAXWELL',titleZh:'任务操作账本',titleEn:'Execution ledger',descZh:'Agent 任务与操作轨迹的可追踪结构。',descEn:'Traceable agent task and action history.',start:'2026-11-20',end:'2027-03-05',stage:'development',stream:'infrastructure',deps:['TAL-01']},
  {id:'MAX-02',program:'MAXWELL',titleZh:'执行产线适配',titleEn:'Execution pipeline',descZh:'执行器契约与模块接入示例。',descEn:'Example executor contract and module integration.',start:'2027-03-03',end:'2027-06-19',stage:'planned',stream:'infrastructure',deps:['MAX-01']},
  {id:'THO-01',program:'THOULESS',titleZh:'租赁基础流程',titleEn:'Rental workflow',descZh:'订单、租约和归还流程的独立产品化示例。',descEn:'Illustrative productization of order, lease and return flows.',start:'2026-12-05',end:'2027-03-17',stage:'qualification',stream:'product',deps:[]},
  {id:'THO-02',program:'THOULESS',titleZh:'公开测试阶段',titleEn:'Public test phase',descZh:'示意版本测试入口与回归检查。',descEn:'Illustrative test access and regression checks.',start:'2027-04-02',end:'2027-07-05',stage:'review',stream:'product',deps:['THO-01']},
  {id:'TES-01',program:'TESSERACT',titleZh:'仓储数据域',titleEn:'Warehouse data domain',descZh:'业务状态、库存事件及结构化传递。',descEn:'Warehouse state, inventory events and structured exchanges.',start:'2026-11-12',end:'2027-02-19',stage:'development',stream:'product',deps:[]},
  {id:'TES-02',program:'TESSERACT',titleZh:'跨系统场景测试',titleEn:'Integration scenarios',descZh:'产品交互与边界行为联动测试。',descEn:'Cross-product interaction and boundary scenario tests.',start:'2027-04-06',end:'2027-08-01',stage:'planned',stream:'product',deps:['TES-01','TAL-02']},
  {id:'PRO-01',program:'PROTORHEXIS',titleZh:'工程信息公开接口',titleEn:'Public data interface',descZh:'经过审查的数据快照映射到公共网站。',descEn:'Project reviewed snapshots into the public website.',start:'2026-11-16',end:'2027-02-09',stage:'development',stream:'infrastructure',deps:[]},
  {id:'PRO-02',program:'PROTORHEXIS',titleZh:'路线图首个版本',titleEn:'Roadmap first release',descZh:'展示和交互组件的公开发布示例。',descEn:'Illustrative public rollout of navigation and UI components.',start:'2027-02-10',end:'2027-05-07',stage:'planned',stream:'infrastructure',deps:['PRO-01']},
];
export const demoEvents: PublicEvent[] = [
  {id:'EV-01',date:'2027-06-04',program:'TALOS',kind:'verification',titleZh:'通信兼容性测试完成',titleEn:'Protocol compatibility tests complete',descZh:'此为虚构的测试事件，用于验证证据时间线的密度与筛选。',descEn:'Synthetic event used to validate event density and filtering.'},
  {id:'EV-02',date:'2027-05-20',program:'THOULESS',kind:'milestone',titleZh:'租赁测试里程碑更新',titleEn:'Rental test milestone updated',descZh:'模拟里程碑及其公共说明。',descEn:'Simulated milestone and public explanation.'},
  {id:'EV-03',date:'2027-04-12',program:'MAXWELL',kind:'decision',titleZh:'执行产线范围调整',titleEn:'Execution pipeline scope revised',descZh:'模拟范围变更事件，不包含真实审批与发布结论。',descEn:'Simulated scope revision; no real approval or release conclusion.'},
  {id:'EV-04',date:'2027-03-19',program:'TESSERACT',kind:'verification',titleZh:'跨租户负例校验',titleEn:'Cross-tenant negative tests',descZh:'模拟测试轨迹。实际工程结果必须来自经过审核的证据。',descEn:'Synthetic testing trace; real results require reviewed evidence.'},
  {id:'EV-05',date:'2027-02-22',program:'PROTORHEXIS',kind:'milestone',titleZh:'公开路线图界面预览',titleEn:'Public roadmap interface preview',descZh:'模拟公开页面迭代事件。',descEn:'Simulated public UI iteration event.'},
  {id:'EV-06',date:'2026-12-18',program:'TALOS',kind:'decision',titleZh:'交付时间窗口调整',titleEn:'Delivery window adjusted',descZh:'模拟计划变更，避免将时间条误认为承诺日期。',descEn:'Illustrative schedule change that must not be read as a committed deadline.'},
];
