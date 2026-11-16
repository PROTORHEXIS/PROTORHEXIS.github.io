<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { usePublicLocale } from './usePublicLocale';
import EngineeringIcon from './EngineeringIcon.vue';
import { demoItems, demoEvents, demoPrograms, type WorkItem, type ProgramId, type PublicEvent, type Stage, type Stream } from '../../data/workstation-demo';
import { monthIndex, monthString, validateWindow, windowEnds, axisTicks, barPosition, visibleRows, dependencyPaths } from '../../lib/gantt';

const props = defineProps<{ view: 'schedule' | 'board' | 'activity' | 'systems' }>();
const { locale } = usePublicLocale();
const tr = (zh: string, en: string) => locale.value === 'zh' ? zh : en;
const activeProgram = ref<ProgramId | 'all'>('all');
const search = ref('');
const stream = ref<'all' | Stream>('all');
const eventKind = ref<'all' | PublicEvent['kind']>('all');
const eventKinds: Array<'all' | PublicEvent['kind']> = ['all','milestone','verification','decision'];
const selectedId = ref(props.view === 'activity' ? 'EV-01' : 'TAL-01');
const inspectorOpen = ref(false);
const isNarrow = ref(false);
const reducedMotion = ref(true); // Safe SSR default until the media query is known.
let viewportQuery: MediaQueryList | null = null;
let motionQuery: MediaQueryList | null = null;
let previousBodyOverflow: string | null = null;
const inspectorRef = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;
const showRangePanel = ref(false);
// Gate Teleport until after Astro has hydrated the SSR island. Vue SSR cannot hydrate a body-targeted Teleport safely.
const portalReady = ref(false);
const rangeTrigger = ref<HTMLElement | null>(null);
const rangePanel = ref<HTMLElement | null>(null);
const rangePosition = ref({ left: 0, top: 0 });
const rangePanelStyle = computed(() => ({ left: `${rangePosition.value.left}px`, top: `${rangePosition.value.top}px` }));
function positionRangePanel() {
  if (!showRangePanel.value || !rangeTrigger.value || typeof window === 'undefined') return;
  const r = rangeTrigger.value.getBoundingClientRect();
  const width = Math.min(342, window.innerWidth - 24);
  const panelHeight = rangePanel.value?.offsetHeight || 240;
  const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
  const top = r.bottom + panelHeight + 12 > window.innerHeight && r.top > panelHeight + 12
    ? r.top - panelHeight - 8 : Math.min(r.bottom + 8, window.innerHeight - 12 - Math.min(panelHeight, window.innerHeight - 24));
  rangePosition.value = { left, top: Math.max(12, top) };
}
async function toggleRangePanel() {
  showRangePanel.value = !showRangePanel.value;
  if (showRangePanel.value) {
    await nextTick();
    positionRangePanel();
    rangePanel.value?.querySelector('input')?.focus();
  } else rangeTrigger.value?.focus();
}
function closeRangePanel(restoreFocus = false) {
  if (!showRangePanel.value) return;
  showRangePanel.value = false;
  if (restoreFocus) nextTick(() => rangeTrigger.value?.focus());
}
function onGlobalPointerDown(event: PointerEvent) {
  if (!showRangePanel.value) return;
  const target = event.target;
  if (target instanceof Node && !rangePanel.value?.contains(target) && !rangeTrigger.value?.contains(target)) closeRangePanel();
}
function onViewportChange() { isNarrow.value = Boolean(viewportQuery?.matches); }
function onMotionChange() { reducedMotion.value = Boolean(motionQuery?.matches); }
function restoreBodyScroll() {
  if (previousBodyOverflow !== null && typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
  }
}
watch([inspectorOpen, isNarrow], async ([open, narrow]) => {
  if (typeof document === 'undefined') return;
  if (open && narrow) {
    if (previousBodyOverflow === null) previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    inspectorRef.value?.querySelector<HTMLElement>('.inspector-close')?.focus();
  } else restoreBodyScroll();
});
function closeInspector() {
  inspectorOpen.value = false;
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (showRangePanel.value) { event.preventDefault(); closeRangePanel(true); return; }
    if (inspectorOpen.value && isNarrow.value) { event.preventDefault(); closeInspector(); }
  }
  if (event.key === 'Tab' && inspectorOpen.value && isNarrow.value && inspectorRef.value) {
    const controls = [...inspectorRef.value.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hasAttribute('inert') && el.getClientRects().length > 0);
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !inspectorRef.value.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !inspectorRef.value.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
}
onMounted(() => {
  portalReady.value = true;
  viewportQuery = window.matchMedia('(max-width: 1050px)');
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  onViewportChange(); onMotionChange();
  viewportQuery.addEventListener('change', onViewportChange);
  motionQuery.addEventListener('change', onMotionChange);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('pointerdown', onGlobalPointerDown, true);
  window.addEventListener('resize', positionRangePanel);
  window.addEventListener('scroll', positionRangePanel, true);
  if (props.view === 'schedule' && ganttViewport.value) {
    const axis = ganttViewport.value.querySelector<HTMLElement>('.gantt-axis');
    if (axis) {
      const measure = () => { trackWidth.value = axis.getBoundingClientRect().width || 900; };
      measure();
      if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(measure); resizeObserver.observe(axis); }
    }
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pointerdown', onGlobalPointerDown, true);
  window.removeEventListener('resize', positionRangePanel);
  window.removeEventListener('scroll', positionRangePanel, true);
  viewportQuery?.removeEventListener('change', onViewportChange);
  motionQuery?.removeEventListener('change', onMotionChange);
  resizeObserver?.disconnect();
  restoreBodyScroll();
});
const zoom = ref<'month' | 'quarter'>('month');
const calendarWindow = ref({startMonth:'2026-11',months:12});
const activePreset = ref<'6m'|'12m'|'24m'|'custom'>('12m');
const presets = [6, 12, 24] as const;
const customStart = ref('2026-11');
const customEnd = ref('2027-10');
const rangeError = ref('');
const ganttViewport = ref<HTMLElement | null>(null);
const trackWidth = ref(900);
let resizeObserver: ResizeObserver | null = null;
const showDependencies = ref(true);
const hoveredId = ref<string | null>(null);
let pan: { id:number; pointerX:number; scrollLeft:number; dragged:boolean } | null = null;
const expanded = ref<Record<string, boolean>>({});
const stages: {id:Stage,zh:string,en:string,code:string}[] = [
  {id:'planned',zh:'已规划',en:'PLANNED',code:'01'},
  {id:'development',zh:'开发中',en:'IN DEVELOPMENT',code:'02'},
  {id:'qualification',zh:'验证中',en:'QUALIFICATION',code:'03'},
  {id:'review',zh:'发布评审',en:'RELEASE REVIEW',code:'04'},
  {id:'published',zh:'已发布',en:'PUBLISHED',code:'05'},
];
const stageName = (stage: Stage) => { const s = stages.find(x => x.id === stage); return s ? tr(s.zh, s.en) : stage; };
const streamName = (s: Stream) => ({platform:tr('平台','PLATFORM'),product:tr('产品','PRODUCT'),infrastructure:tr('基础设施','INFRASTRUCTURE')})[s];
const eventName = (k:PublicEvent['kind']) => ({milestone:tr('里程碑','MILESTONE'),verification:tr('验证','VERIFICATION'),decision:tr('决策变更','DECISION')})[k];
const panelTitle = computed(() => ({schedule:tr('开发排期','Development schedule'),board:tr('交付状态看板','Release status board'),activity:tr('事件与证据轨迹','Activity & evidence trail'),systems:tr('系统关系图谱','System relationship map')})[props.view]);
const panelSubtitle = computed(() => ({schedule:tr('时间窗口表示开发计划，并非发布日期承诺','Planning windows are not release-date commitments'),board:tr('按公开交付阶段组织，非内部 Issue 状态','Grouped by public delivery stage, not internal issue state'),activity:tr('按实际发生顺序追溯变更与核验','Trace change and verification events chronologically'),systems:tr('跨系统关系与依赖结构（示例）','Cross-system relations and dependencies (demo)')})[props.view]);
const matching = (zh:string,en:string) => `${zh} ${en}`.toLowerCase().includes(search.value.trim().toLowerCase());
const visibleItems = computed(() => demoItems.filter(item =>
  (activeProgram.value==='all' || item.program===activeProgram.value) &&
  (stream.value==='all' || item.stream===stream.value) &&
  (!search.value || matching(item.titleZh+' '+item.id+' '+item.program,item.titleEn))
));
const visibleEvents = computed(() => demoEvents.filter(event =>
  (activeProgram.value==='all' || event.program===activeProgram.value) &&
  (eventKind.value==='all' || event.kind===eventKind.value) &&
  (!search.value || matching(event.titleZh+' '+event.id+' '+event.program,event.titleEn))
));
const chosenItem = computed(() => demoItems.find(x => x.id === selectedId.value) ?? null);
const chosenEvent = computed(() => demoEvents.find(x => x.id === selectedId.value) ?? null);
const chosenProgram = computed(() => demoPrograms.find(x => x.id === activeProgram.value) ?? null);
const dependents = computed(() => chosenItem.value ? demoItems.filter(x => x.deps.includes(chosenItem.value!.id)) : []);
function select(id:string) { if (document.activeElement instanceof HTMLElement) returnFocus = document.activeElement; selectedId.value=id; inspectorOpen.value=true; }
function switchProgram(id:ProgramId|'all') { activeProgram.value=id; selectedId.value=''; inspectorOpen.value=false; closeRangePanel(); }
function toggleGroup(id:string) { expanded.value[id] = expanded.value[id] === false ? true : false; }
function groupExpanded(id:string) { return expanded.value[id] !== false; }
const grouped = computed(() => demoPrograms.map(prog => ({...prog, items: visibleItems.value.filter(item=>item.program===prog.id)})).filter(group=>group.items.length));
const totalCount = computed(()=>props.view==='activity'? visibleEvents.value.length:visibleItems.value.length);
const windowBounds = computed(() => windowEnds(calendarWindow.value));
const ticks = computed(() => axisTicks(calendarWindow.value, zoom.value));
const unitCount = computed(() => ticks.value.length);
const gridMinWidth = computed(() => 256 + Math.max(8,unitCount.value)*(zoom.value === 'month' ? 120 : 164));
const rangeStart = computed(() => windowBounds.value.start);
const rangeEnd = computed(() => windowBounds.value.end);
function durationPosition(item:WorkItem) {
  const bar = barPosition(item, calendarWindow.value);
  return { hidden:bar.hidden, left:`${bar.left}%`, width:`${Math.max(0.6,bar.width)}%` };
}
function setPreset(months: 6 | 12 | 24) {
  calendarWindow.value = {...calendarWindow.value,months};
  activePreset.value = `${months}m` as typeof activePreset.value;
  rangeError.value = '';
}
function applyCustomRange() {
  try {
    const next = validateWindow(customStart.value, customEnd.value);
    calendarWindow.value = next;
    activePreset.value = 'custom';
    rangeError.value = '';
    closeRangePanel(true);
  } catch (e) {
    rangeError.value = (e as Error).message;
  }
}
function shift(direction:number) {
  const start = monthIndex(calendarWindow.value.startMonth);
  const step = Math.max(1,Math.ceil(calendarWindow.value.months / 2));
  calendarWindow.value = {...calendarWindow.value, startMonth:monthString(start + direction*step)};
}
function resetAxis() {
  calendarWindow.value = {startMonth:'2026-11',months:12};
  zoom.value='month';
  activePreset.value='12m';
  rangeError.value='';
}
const rangeLabel=computed(()=>{
  const end=new Date(rangeEnd.value-86400000), start=new Date(rangeStart.value);
  return `${start.getUTCFullYear()}.${String(start.getUTCMonth()+1).padStart(2,'0')} — ${end.getUTCFullYear()}.${String(end.getUTCMonth()+1).padStart(2,'0')}`;
});
// Fixed reference date for a synthetic 2026 fixture, NOT today's actual date.
const currentLine=computed(()=>{
  const t=Date.UTC(2026,10,16);
  return t >= rangeStart.value && t < rangeEnd.value?`${((t-rangeStart.value)/(rangeEnd.value-rangeStart.value))*100}%`:null;
});
const ganttLayout=computed(()=>visibleRows(grouped.value,expanded.value));
const focusedId=computed(()=>hoveredId.value || (chosenItem.value ? selectedId.value : null));
const dependencyEdges=computed(()=>dependencyPaths(grouped.value, expanded.value, calendarWindow.value, trackWidth.value,focusedId.value));
function panStart(event:PointerEvent) {
  if (event.pointerType==='touch' || (event.pointerType==='mouse' && event.button !== 0)) return;
  const el=event.target;
  if (!(el instanceof Element) || el.closest('button,input,a,summary')) return;
  const viewport=ganttViewport.value;
  if (!viewport) return;
  pan={id:event.pointerId,pointerX:event.clientX,scrollLeft:viewport.scrollLeft,dragged:false};
  viewport.setPointerCapture(event.pointerId);
}
function panMove(event:PointerEvent) {
  if (!pan || pan.id!==event.pointerId || !ganttViewport.value) return;
  const dx=event.clientX-pan.pointerX;
  if (Math.abs(dx)>3) pan.dragged=true;
  if (pan.dragged) ganttViewport.value.scrollLeft=pan.scrollLeft-dx;
}
function panEnd(event:PointerEvent) {
  if (pan?.id!==event.pointerId) return;
  if (ganttViewport.value?.hasPointerCapture(event.pointerId)) ganttViewport.value.releasePointerCapture(event.pointerId);
  pan=null;
}
async function focusItem(id:string) {
  const item=demoItems.find(x=>x.id===id);
  if (!item) return;
  if (activeProgram.value!=='all' && activeProgram.value!==item.program) activeProgram.value='all';
  if (stream.value!=='all' && stream.value!==item.stream) stream.value='all';
  search.value='';
  expanded.value[item.program]=true;
  const itemStart=Date.parse(`${item.start}T00:00:00Z`);
  const itemEnd=Date.parse(`${item.end}T00:00:00Z`);
  if (itemStart>=rangeEnd.value || itemEnd<rangeStart.value) {
    calendarWindow.value={...calendarWindow.value,startMonth:monthString(monthIndex(item.start.slice(0,7))-1)};
  }
  // Inspector navigation does not overwrite returnFocus with a control inside the inspector.
  if (!inspectorOpen.value && document.activeElement instanceof HTMLElement) returnFocus=document.activeElement;
  selectedId.value=id;
  inspectorOpen.value=true;
  await nextTick();
  if (props.view==='schedule' && ganttViewport.value) {
    const target=Array.from(ganttViewport.value.querySelectorAll<HTMLElement>('[data-gantt-id]')).find(el=>el.dataset.ganttId===id);
    if (target) {
      const bounds=target.getBoundingClientRect(), parent=ganttViewport.value.getBoundingClientRect();
      const delta=bounds.left-parent.left;
      ganttViewport.value.scrollLeft += delta-ganttViewport.value.clientWidth*0.5;
      const viewportTop=ganttViewport.value.scrollTop;
      const rowTop=target.closest('.gantt-row')?.getBoundingClientRect().top ?? bounds.top;
      ganttViewport.value.scrollTop=Math.max(0,viewportTop + rowTop-parent.top-92);
    }
  }
}
function fmtDate(s:string) { return s.replaceAll('-','.'); }
function filteredCount(program:ProgramId){return demoItems.filter(x=>x.program===program).length;}
const stats=computed(()=>({items:visibleItems.value.length,programs:new Set(visibleItems.value.map(x=>x.program)).size,events:visibleEvents.value.length}));
</script>

<template>
  <section class="workbench" :data-view="view">
    <div class="ws-notice"><span class="notice-indicator"><EngineeringIcon name="warning" /></span><strong>DEMONSTRATION DATA</strong><span>{{tr('当前所有日期、状态与事件均为界面测试样本，不代表 PROTORHEXIS 真实进度或发布承诺。','All dates, stages and events are synthetic UI fixtures, not real project progress or release commitments.')}}</span><span class="notice-tag">NOT VERIFIED</span></div>
    <div class="ws-commandbar">
      <div class="ws-command-title"><small>{{({schedule:'01 / PLANNING',board:'02 / DELIVERABLES',activity:'03 / HISTORY',systems:'04 / ARCHITECTURE'})[view]}}</small><h1>{{panelTitle}}</h1><p>{{panelSubtitle}}</p></div>
      <div class="ws-tools">
        <label class="ws-search"><EngineeringIcon name="search" /><input v-model="search" type="search" :placeholder="tr('搜索项目 / 任务 / 编号','Search project / task / ID')" :aria-label="tr('搜索','Search')" /></label>
        <div v-if="view==='schedule'" class="ws-toolset" :aria-label="tr('时间粒度','Time scale')"><button :class="{current:zoom==='month'}" @click="zoom='month'">{{tr('月','MONTH')}}</button><button :class="{current:zoom==='quarter'}" @click="zoom='quarter'">{{tr('季度','QUARTER')}}</button></div>
        <div v-if="view==='schedule'" class="ws-toolset ws-pager"><button :aria-label="tr('前移时间轴','Previous period')" @click="shift(-1)"><EngineeringIcon name="back" /></button><button @click="resetAxis"><EngineeringIcon name="reset" />{{tr('复位','RESET')}}</button><button :aria-label="tr('后移时间轴','Next period')" @click="shift(1)"><EngineeringIcon name="next" /></button></div>
      </div>
    </div>
    <div class="ws-content-grid">
      <aside class="ws-project-index" :aria-label="tr('项目索引','Project index')">
        <div class="rail-title"><span>PROJECT INDEX</span><span>05 / SYS</span></div>
        <button class="rail-item" :class="{'is-current':activeProgram==='all'}" @click="switchProgram('all')"><span class="rail-symbol rail-symbol-all">✳</span><span class="rail-copy"><strong>{{tr('全部系统','ALL SYSTEMS')}}</strong><small>OVERVIEW / ALL</small></span><span class="rail-count">{{demoItems.length.toString().padStart(2,'0')}}</span></button>
        <div class="rail-separator">{{tr('系统与产品','SYSTEMS & PRODUCTS')}}</div>
        <button v-for="program in demoPrograms" :key="program.id" class="rail-item" :class="{'is-current':activeProgram===program.id}" @click="switchProgram(program.id)"><span class="rail-symbol">{{program.id.slice(0,1)}}</span><span class="rail-copy"><strong>{{program.id}}</strong><small>{{tr(program.zh,program.en)}}</small></span><span class="rail-count">{{filteredCount(program.id).toString().padStart(2,'0')}}</span></button>
        <div class="rail-block"><div class="rail-block-title">DATA SCOPE</div><div class="rail-block-value"><span class="ws-signal"></span> PUBLIC / SYNTHETIC</div><p>{{tr('公开页面仅读取独立的脱敏数据模型，不能直接读取内部仓库。','Public pages must use an independent reviewed feed, never internal repository access.')}}</p></div>
        <div class="rail-bottom"><span>INDEX REV. 003</span><span>PROTORHEXIS</span></div>
      </aside>

      <div class="ws-primary">
        <div class="ws-view-toolbar"><div class="ws-view-state"><span class="ws-mini-square"></span><span>{{activeProgram==='all' ? 'ALL PROGRAMS' : activeProgram}}</span><span class="v-divider">/</span><span>{{totalCount.toString().padStart(2,'0')}} {{view==='activity'?'EVENTS':'ENTRIES'}}</span></div>
          <div v-if="view==='schedule'" class="ws-view-sub">{{rangeLabel}} <span class="v-divider">·</span> {{tr('拖动空白处平移 · 只读','Drag empty track to pan · read-only')}}</div>
          <div v-else-if="view==='board'" class="ws-view-sub">{{tr('状态代表公开交付阶段','PUBLIC DELIVERY STAGES')}}</div>
          <div v-else-if="view==='activity'" class="ws-view-sub">{{tr('按时间倒序排列','NEWEST FIRST')}}</div>
          <div v-else class="ws-view-sub">{{tr('体系关联概览','SYSTEM RELATIONSHIP OVERVIEW')}}</div>
        </div>

        <div v-if="view==='schedule'" class="ws-timeline">
          <div class="gantt-controls">
            <div class="gantt-presets" :aria-label="tr('时间范围','Time range')"><span class="gantt-controls-label">RANGE</span>
              <button v-for="m in presets" :key="m" type="button" :class="{current:activePreset===`${m}m`}" :aria-pressed="activePreset===`${m}m`" @click="setPreset(m)">{{m}}M</button>
              <button ref="rangeTrigger" type="button" class="gantt-range-trigger" :class="{current:activePreset==='custom'}" :aria-expanded="showRangePanel" aria-controls="gantt-range-panel" aria-haspopup="dialog" @click="toggleRangePanel"><EngineeringIcon name="expand" />{{tr('自定义','CUSTOM')}}</button>
            </div>
            <button type="button" class="gantt-dep-toggle" :aria-pressed="showDependencies" @click="showDependencies=!showDependencies"><span class="ws-dep-dot"></span>{{tr('依赖关系','DEPENDENCIES')}}<strong>{{showDependencies?tr('显示','ON'):tr('隐藏','OFF')}}</strong></button>
          </div>
          <div ref="ganttViewport" class="gantt-viewport" tabindex="0" :aria-label="tr('可横向滚动的只读甘特排期图','Scrollable read-only Gantt timeline')" @pointerdown="panStart" @pointermove="panMove" @pointerup="panEnd" @pointercancel="panEnd" @lostpointercapture="panEnd">
            <div class="gantt-canvas" :style="{'--tick-count':unitCount,minWidth:`${gridMinWidth}px`}">
              <div class="gantt-head"><div class="gantt-head-name"><strong>{{tr('工作项 / 交付物','WORK PACKAGE / DELIVERABLE')}}</strong><small>WBS INDEX</small></div><div class="gantt-axis"><span v-for="(tick,i) in ticks" :key="i" :style="{width:`${tick.width}%`,flex:`0 0 ${tick.width}%`}">{{tick.label}}</span></div></div>
              <svg v-if="showDependencies && dependencyEdges.length" class="gantt-dependency-layer" :viewBox="`0 0 ${trackWidth} ${ganttLayout.height}`" :style="{height:`${ganttLayout.height}px`}" preserveAspectRatio="none" aria-hidden="true">
                <defs><marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#777781"/></marker><marker id="dep-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#ff453a"/></marker></defs>
                <path v-for="edge in dependencyEdges" :key="edge.key" :d="edge.d" :class="{active:edge.active}" :marker-end="edge.active?'url(#dep-arrow-active)':'url(#dep-arrow)'"/>
              </svg>
              <template v-for="group in grouped" :key="group.id">
                <button class="gantt-group" type="button" @click="toggleGroup(group.id)" :aria-expanded="groupExpanded(group.id)"><span class="gantt-group-name"><span class="chevron" :class="{collapsed:!groupExpanded(group.id)}"><EngineeringIcon name="expand" :key="`${group.id}:${groupExpanded(group.id)}`" /></span><strong>{{group.id}}</strong><small>{{tr(group.zh,group.en)}}</small></span><span class="gantt-group-suffix">{{group.items.length}} {{tr('个工作项','WORK ITEMS')}}</span></button>
                <template v-if="groupExpanded(group.id)"><div v-for="item in group.items" :key="item.id" class="gantt-row" :class="{selected:selectedId===item.id}"><button class="gantt-item-name" @click="focusItem(item.id)"><small>{{item.id}} <span>·</span> {{streamName(item.stream)}}</small><strong>{{tr(item.titleZh,item.titleEn)}}</strong></button><div class="gantt-track"><span v-for="(tick,i) in ticks" :key="i" class="gantt-gridline" :style="{left:`${tick.left}%`}"></span><span v-if="currentLine" class="gantt-today" :style="{left:currentLine}"></span><button v-if="!durationPosition(item).hidden" class="gantt-bar" :data-gantt-id="item.id" :class="[item.stage,{selected:selectedId===item.id,related:focusedId===item.id}]" @pointerenter="hoveredId=item.id" @pointerleave="hoveredId=null" :aria-pressed="selectedId===item.id" :aria-label="`${item.id} · ${tr(item.titleZh,item.titleEn)} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · ${stageName(item.stage)}`" :style="{left:durationPosition(item).left,width:durationPosition(item).width}" :title="`${item.id} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · DEMO`" @click="select(item.id)"><span>{{item.id}}</span></button></div></div></template>
              </template>
              <div v-if="grouped.length===0" class="ws-no-results">{{tr('没有匹配的工作项。','No matching work items.')}}</div>
            </div>
          </div>
          <div class="ws-chart-foot"><span><i class="legend-swatch swatch-plan"></i>{{tr('规划','Planned')}}</span><span><i class="legend-swatch swatch-progress"></i>{{tr('开发中','Development')}}</span><span><i class="legend-swatch swatch-valid"></i>{{tr('验证中','Qualification')}}</span><span><i class="legend-swatch swatch-cursor"></i>{{tr('时间参照线','Reference date')}}</span><span class="chart-foot-note">{{tr('只读排期 · 拖动背景平移 · 点击依赖编号跳转','Read-only schedule · drag background to pan · follow dependency IDs')}}</span></div>
        </div>

        <div v-else-if="view==='board'" class="ws-board-viewport" tabindex="0" :aria-label="tr('可横向滚动的交付看板','Scrollable release board')"><div class="ws-board">
          <section v-for="stage in stages" :key="stage.id" class="kanban-column"><div class="kanban-heading"><span>{{stage.code}} / {{tr(stage.zh,stage.en)}}</span><span class="kanban-count">{{visibleItems.filter(x=>x.stage===stage.id).length.toString().padStart(2,'0')}}</span></div><div class="kanban-stack"><motion.button v-for="item in visibleItems.filter(x=>x.stage===stage.id)" :key="item.id" layout :initial="false" :whileHover="reducedMotion ? undefined : { y: -2 }" :whilePress="reducedMotion ? undefined : { scale: 0.99 }" :transition="{ duration: reducedMotion ? 0 : 0.14 }" class="kanban-card" :class="{selected:selectedId===item.id}" :aria-pressed="selectedId===item.id" @click="select(item.id)"><span class="kanban-card-head"><small>{{item.id}}</small><small>{{item.program}}</small></span><strong>{{tr(item.titleZh,item.titleEn)}}</strong><p>{{tr(item.descZh,item.descEn)}}</p><span class="kanban-card-foot"><span>{{streamName(item.stream)}}</span><span class="ws-action-glyph"><EngineeringIcon name="next" /></span></span></motion.button><div v-if="!visibleItems.some(x=>x.stage===stage.id)" class="kanban-empty">NO ITEMS</div></div></section>
        </div></div>

        <div v-else-if="view==='activity'" class="ws-activity"><div class="activity-filters"><span>{{tr('事件类型','EVENT TYPE')}}</span><div class="ws-toolset"><button v-for="kind in eventKinds" :key="kind" :class="{current:eventKind===kind}" @click="eventKind=kind">{{kind==='all'?tr('全部','ALL'):eventName(kind)}}</button></div></div><div class="event-stream"><motion.button v-for="event in visibleEvents" :key="event.id" layout :initial="false" :whileHover="reducedMotion ? undefined : { x: 2 }" :transition="{ duration: reducedMotion ? 0 : 0.14 }" class="event-entry" :class="{selected:selectedId===event.id}" :aria-pressed="selectedId===event.id" @click="select(event.id)"><span class="event-date">{{fmtDate(event.date)}}<small>{{event.program}}</small></span><span class="event-marker"><i></i></span><span class="event-body"><span class="event-kind">{{eventName(event.kind)}} <span>/ {{event.id}}</span></span><strong>{{tr(event.titleZh,event.titleEn)}}</strong><span class="event-summary">{{tr(event.descZh,event.descEn)}}</span></span><span class="event-arrow"><EngineeringIcon name="next" /></span></motion.button><div v-if="visibleEvents.length===0" class="ws-no-results">{{tr('没有匹配的事件。','No matching events.')}}</div></div></div>

        <div v-else class="ws-systemmap"><div class="systemmap-topline">PROTORHEXIS / DISTRIBUTED RESEARCH & ENGINEERING <span>RELATIONSHIP MODEL / DEMO</span></div><div class="systemmap-shell"><div class="systemmap-hub"><span>ORG / 00</span><strong>PROTORHEXIS</strong><small>{{tr('协作与公开工程入口','Collaborative engineering network')}}</small></div><div class="systemmap-connect"></div><div class="systemmap-nodes"><button v-for="prog in demoPrograms.filter(x=>x.id!=='PROTORHEXIS')" :key="prog.id" :class="{selected:activeProgram===prog.id}" @click="switchProgram(prog.id)"><small>{{prog.code}}</small><strong>{{prog.id}}</strong><span>{{tr(prog.zh,prog.en)}}</span></button></div></div><p class="systemmap-note">{{tr('这是用于演示导航关系的抽象结构图；真实接口依赖必须在经过公开审查后才会显示。','This is an illustrative relationship diagram. Real integration dependencies require public review before publication.')}}</p></div>
      </div>

      <button v-if="inspectorOpen" class="ws-inspector-scrim" type="button" :aria-label="tr('关闭详情面板','Close detail panel')" @click="closeInspector"></button>
      <aside ref="inspectorRef" id="roadmap-inspector" class="ws-inspector" :class="{'inspector-visible':inspectorOpen}" :aria-label="tr('详情检查器','Inspector')" :aria-hidden="isNarrow && !inspectorOpen ? 'true' : undefined" :inert="isNarrow && !inspectorOpen" tabindex="-1"><div class="inspector-title"><span>DETAIL INSPECTOR</span><button type="button" class="inspector-close" :aria-label="tr('关闭详情','Close inspector')" @click="closeInspector"><EngineeringIcon name="close" /></button></div>
        <AnimatePresence mode="wait">
          <motion.div :key="`${view}:${selectedId}:${activeProgram}`" class="inspector-motion-body"
            :initial="reducedMotion ? false : { opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }"
            :transition="{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }">
        <template v-if="chosenItem && view!=='activity' && view!=='systems'"><div class="inspector-hero"><small>{{chosenItem.id}} / {{chosenItem.program}}</small><h2>{{tr(chosenItem.titleZh,chosenItem.titleEn)}}</h2><span class="inspector-status"><i></i>{{stageName(chosenItem.stage)}}</span></div><div class="inspector-section"><span class="inspector-label">{{tr('工作概要','DESCRIPTION')}}</span><p>{{tr(chosenItem.descZh,chosenItem.descEn)}}</p></div><dl class="inspector-spec"><div><dt>{{tr('时间窗口','WINDOW')}}</dt><dd>{{fmtDate(chosenItem.start)}}<br/>— {{fmtDate(chosenItem.end)}}</dd></div><div><dt>{{tr('工作类别','STREAM')}}</dt><dd>{{streamName(chosenItem.stream)}}</dd></div><div class="inspector-dep-row"><dt>{{tr('前置依赖','PREDECESSORS')}}</dt><dd><template v-if="chosenItem.deps.length"><button v-for="dep in chosenItem.deps" :key="dep" class="inspector-dep-link" type="button" :title="tr('定位并打开依赖任务','Locate dependency')" @click="focusItem(dep)">{{dep}} <EngineeringIcon name="next" /></button></template><span v-else>{{tr('无','NONE')}}</span></dd></div><div class="inspector-dep-row"><dt>{{tr('后续工作','SUCCESSORS')}}</dt><dd><template v-if="dependents.length"><button v-for="next in dependents" :key="next.id" class="inspector-dep-link" type="button" :title="tr('定位后续任务','Locate successor')" @click="focusItem(next.id)">{{next.id}} <EngineeringIcon name="next" /></button></template><span v-else>{{tr('无','NONE')}}</span></dd></div><div><dt>{{tr('数据级别','PROVENANCE')}}</dt><dd>DEMO / SYNTHETIC</dd></div></dl></template>
        <template v-else-if="chosenEvent && view==='activity'"><div class="inspector-hero"><small>{{chosenEvent.id}} / {{chosenEvent.program}}</small><h2>{{tr(chosenEvent.titleZh,chosenEvent.titleEn)}}</h2><span class="inspector-status"><i></i>{{eventName(chosenEvent.kind)}}</span></div><div class="inspector-section"><span class="inspector-label">{{tr('事件说明','EVENT DETAILS')}}</span><p>{{tr(chosenEvent.descZh,chosenEvent.descEn)}}</p></div><dl class="inspector-spec"><div><dt>{{tr('事件时间','EVENT DATE')}}</dt><dd>{{fmtDate(chosenEvent.date)}}</dd></div><div><dt>{{tr('证据状态','EVIDENCE')}}</dt><dd>NOT PROVIDED / DEMO</dd></div></dl></template>
        <template v-else-if="view==='systems'"><div class="inspector-hero"><small>SYSTEM MAP / {{chosenProgram?.code??'OVERVIEW'}}</small><h2>{{chosenProgram?.id??'PROTORHEXIS'}}</h2><span class="inspector-status"><i></i>RELATIONSHIP / DEMO</span></div><div class="inspector-section"><span class="inspector-label">{{tr('系统范围','SYSTEM SCOPE')}}</span><p>{{chosenProgram?tr(chosenProgram.zh,chosenProgram.en):tr('分布式科研和工程协作网络','Distributed research and engineering network')}}</p></div><dl class="inspector-spec"><div><dt>PUBLICATION</dt><dd>NOT VERIFIED</dd></div></dl></template>
        <template v-else><div class="inspector-placeholder"><span class="placeholder-cross">⌖</span><strong>{{tr('选择一个条目','Select an item')}}</strong><p>{{tr('在主视图中点击时间条、卡片或事件，查看对应详细信息。','Choose a bar, card or event to inspect its details.')}}</p></div></template>
          </motion.div>
        </AnimatePresence>
        <div class="inspector-warning"><span><EngineeringIcon name="warning" /></span><p>{{tr('样例数据无任何发布承诺。真实项目记录将由公开审批的数据快照替换。','This synthetic fixture contains no release promise. Reviewed public data will replace it.')}}</p></div>
        <div class="inspector-foot">INSPECTOR / REV 003 <span>STATIC PREVIEW</span></div>
      </aside>
    </div>
    <Teleport v-if="portalReady" to="body">
      <Transition name="ws-pop">
        <div v-if="showRangePanel" ref="rangePanel" id="gantt-range-panel" class="gantt-floating-range" role="dialog"
          :aria-label="tr('自定义时间范围','Custom date range')" :style="rangePanelStyle">
          <div class="range-panel-header"><strong>{{tr('自定义时间范围','CUSTOM RANGE')}}</strong><button type="button" :aria-label="tr('关闭','Close')" @click="closeRangePanel(true)"><EngineeringIcon name="close" /></button></div>
          <form class="gantt-custom-form" @submit.prevent="applyCustomRange">
            <label>{{tr('开始月份','FROM')}}<input v-model="customStart" type="month" required /></label>
            <label>{{tr('结束月份（含）','TO (INCLUSIVE)')}}<input v-model="customEnd" type="month" required /></label>
            <button type="submit">{{tr('应用范围','APPLY RANGE')}}</button>
            <p v-if="rangeError" role="alert">{{rangeError}}</p>
            <small>{{tr('最多 36 个月；不修改计划数据','Up to 36 months; does not modify task dates')}}</small>
          </form>
        </div>
      </Transition>
    </Teleport>
    <div class="ws-statusline"><span><i class="ws-mini-square"></i>{{tr('演示工作台','DEMO WORKSTATION')}}</span><span>{{stats.programs.toString().padStart(2,'0')}} PROGRAMS</span><span>{{stats.items.toString().padStart(2,'0')}} WORK ITEMS</span><span>{{stats.events.toString().padStart(2,'0')}} EVENTS</span><span class="status-right">NO LIVE DATA / PUBLIC PREVIEW</span></div>
  </section>
</template>
