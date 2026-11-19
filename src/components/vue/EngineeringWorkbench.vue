<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, watch, shallowRef, type Component } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { usePublicLocale } from './usePublicLocale';
import EngineeringIcon from './EngineeringIcon.vue';
import RoadmapStatusIcon from './RoadmapStatusIcon.vue';
import { publicSnapshot, publicItems, publicEvents, publicPrograms, type WorkItem, type ProgramId, type PublicEvent, type Stage, type Stream } from '../../data/workstation-public';
import { monthIndex, monthString, validateWindow, windowEnds, axisTicks, barPosition, visibleRows, dependencyPaths } from '../../lib/gantt';

const props = defineProps<{ view: 'schedule' | 'board' | 'activity' | 'systems' }>();
const graphComponent = shallowRef<Component | null>(null);
const labelWidth = ref(256);
function selectGraphProgram(id:string) {
  if (id === 'all') { switchProgram('all'); return; }
  if (publicPrograms.some(p=>p.id===id)) {
    activeProgram.value = id as ProgramId;
    selectedId.value = id;
    inspectorOpen.value = true;
  }
}

const { locale } = usePublicLocale();
const tr = (zh: string, en: string) => locale.value === 'zh' ? zh : en;
const activeProgram = ref<ProgramId | 'all'>('all');
const search = ref('');
const stream = ref<'all' | Stream>('all');
const eventKind = ref<'all' | PublicEvent['kind']>('all');
const eventKinds: Array<'all' | PublicEvent['kind']> = ['all','milestone','verification','decision'];
// Do not confuse a public record's existence with an explicit selection.
const selectedId = ref('');
const inspectorOpen = ref(false);
const isNarrow = ref(false);
const reducedMotion = ref(true); // Safe SSR default until the media query is known.
let viewportQuery: MediaQueryList | null = null;
let motionQuery: MediaQueryList | null = null;
let previousBodyOverflow: string | null = null;
const inspectorRef = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;
const showRangePanel = ref(false);
// Do not mount a body-targeted Teleport during Astro SSR hydration.
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
    if (hasInspectorSelection.value) inspectorRef.value?.querySelector<HTMLElement>('.inspector-close')?.focus();
    else inspectorRef.value?.focus();
  } else restoreBodyScroll();
});
function closeInspector() {
  inspectorOpen.value = false;
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function toggleInspector() {
  if (inspectorOpen.value) { closeInspector(); return; }
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement)
    returnFocus = document.activeElement;
  inspectorOpen.value = true;
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (showRangePanel.value) { event.preventDefault(); closeRangePanel(true); return; }
    if (inspectorOpen.value) { event.preventDefault(); closeInspector(); }
  }
  if (event.key === 'Tab' && inspectorOpen.value && isNarrow.value && inspectorRef.value) {
    const controls = [...inspectorRef.value.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hasAttribute('inert') && el.getClientRects().length > 0);
    if (!controls.length) {
      // Empty inspector has no inner links; make the always-visible edge toggle
      // the keyboard escape route instead of trapping Tab on an empty drawer.
      event.preventDefault();
      document.querySelector<HTMLElement>('.ws-inspector-handle')?.focus();
      return;
    }
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
  // Deep links reference stable public IDs; no cross-view record is duplicated.
  const params=new URLSearchParams(window.location.search);
  const requestedProgram=params.get('program');
  if(requestedProgram && publicPrograms.some(p=>p.id===requestedProgram))
    activeProgram.value=requestedProgram as ProgramId;
  const requestedItem=params.get('item');
  const deepItem=publicItems.find(x=>x.id===requestedItem);
  if(deepItem && props.view!=='activity' && props.view!=='systems' && !(props.view==='schedule' && deepItem.stage==='future')){
    activeProgram.value=deepItem.program;selectedId.value=deepItem.id;inspectorOpen.value=true;
  }
  const requestedEvent=params.get('event');
  if(props.view==='activity' && publicEvents.some(x=>x.id===requestedEvent)){
    selectedId.value=requestedEvent!;inspectorOpen.value=true;
  }
  viewportQuery = window.matchMedia('(max-width: 1050px)');
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  onViewportChange(); onMotionChange();
  viewportQuery.addEventListener('change', onViewportChange);
  motionQuery.addEventListener('change', onMotionChange);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('pointerdown', onGlobalPointerDown, true);
  window.addEventListener('resize', positionRangePanel);
  window.addEventListener('resize', syncBoardScroll);
  window.addEventListener('resize', measureGanttLabels);
  nextTick(syncBoardScroll);
  if (props.view === 'systems') import('./SystemRelationshipGraph.vue').then(mod=>{graphComponent.value=mod.default;}).catch(()=>{graphComponent.value=null;});
  if (props.view === 'schedule') nextTick(measureGanttLabels);

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
  window.removeEventListener('resize', syncBoardScroll);
  window.removeEventListener('resize', measureGanttLabels);
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
const boardViewport = ref<HTMLElement | null>(null);
const boardScrollRatio = ref(0);
const boardOverflow = ref(false);
function syncBoardScroll() {
  const el = boardViewport.value;
  if (!el) return;
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  boardOverflow.value = max > 4;
  boardScrollRatio.value = max ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0;
}
function scrollBoard(direction: -1 | 1) {
  const el = boardViewport.value;
  if (!el) return;
  const lane = el.querySelector<HTMLElement>('.kanban-column');
  const distance = (lane?.getBoundingClientRect().width || 260) + 10;
  el.scrollBy({ left: direction * distance, behavior: reducedMotion.value ? 'auto' : 'smooth' });
}
const trackWidth = ref(900);
// Measure the full visible label text (not clipped DOM widths), then share one CSS variable
// between the frozen labels, header, chart coordinate origin, and opaque continuous mask.
function measureGanttLabels() {
  if (typeof document === 'undefined' || !ganttViewport.value || props.view !== 'schedule') return;
  const strong = ganttViewport.value.querySelector<HTMLElement>('.gantt-item-name strong');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = strong ? getComputedStyle(strong).font : '500 12px Inter';
  const titles = publicItems.map(item => tr(item.titleZh,item.titleEn));
  const widest = titles.reduce((max,title)=>Math.max(max,ctx.measureText(title).width),0);
  const needed = Math.ceil(Math.max(156,widest + 34));
  const narrow = window.matchMedia('(max-width:740px)').matches;
  labelWidth.value = narrow
    ? Math.min(needed, Math.max(108, Math.floor(window.innerWidth * .36)))
    : Math.max(190, Math.min(420,needed));
}
watch(locale,()=>nextTick(measureGanttLabels));

let resizeObserver: ResizeObserver | null = null;
const showDependencies = ref(true);
const hoveredId = ref<string | null>(null);
let pan: { id:number; pointerX:number; scrollLeft:number; dragged:boolean } | null = null;
const expanded = ref<Record<string, boolean>>({});
const stages: {id:Stage,zh:string,en:string,code:string}[] = [
  {id:'future',zh:'未来方向',en:'FUTURE',code:'01'},
  {id:'planned',zh:'已规划',en:'PLANNED',code:'02'},
  {id:'development',zh:'开发中',en:'IN DEVELOPMENT',code:'03'},
  {id:'qualification',zh:'验证中',en:'QUALIFICATION',code:'04'},
  {id:'review',zh:'发布评审',en:'RELEASE REVIEW',code:'05'},
  {id:'published',zh:'已发布',en:'PUBLISHED',code:'06'},
];
const stageName = (stage: Stage) => { const s = stages.find(x => x.id === stage); return s ? tr(s.zh, s.en) : stage; };
const streamName = (s: Stream) => ({platform:tr('平台','PLATFORM'),product:tr('产品','PRODUCT'),infrastructure:tr('基础设施','INFRASTRUCTURE')})[s];
const eventName = (k:PublicEvent['kind']) => ({milestone:tr('里程碑','MILESTONE'),verification:tr('验证','VERIFICATION'),decision:tr('决策变更','DECISION')})[k];
const deliveryName = (state:WorkItem['deliveryState']) => ({
  unassigned:tr('未指定交付','UNASSIGNED'),
  tentative:tr('暂定交付','TENTATIVE'),
  committed:tr('已通过交付门禁','COMMITTED'),
  released:tr('已发布','RELEASED')
})[state];
const workLink=(view:'schedule'|'board',item:WorkItem) => `${view==='board'?'/roadmap/board/':'/roadmap/'}?item=${encodeURIComponent(item.id)}&program=${encodeURIComponent(item.program)}`;
const projectEventsLink=(item:WorkItem) => `/roadmap/evidence/?program=${encodeURIComponent(item.program)}`;
const viewLinks = [
  {id:'schedule',href:'/roadmap/',code:'01',zh:'开发排期',en:'PROGRESS TRACKER'},
  {id:'board',href:'/roadmap/board/',code:'02',zh:'交付看板',en:'RELEASE BOARD'},
  {id:'activity',href:'/roadmap/evidence/',code:'03',zh:'事件时间线',en:'ACTIVITY'},
  {id:'systems',href:'/roadmap/systems/',code:'04',zh:'系统图谱',en:'SYSTEM MAP'},
] as const;
const activeView = computed(() => viewLinks.find(v=>v.id===props.view)!);
const matching = (zh:string,en:string) => `${zh} ${en}`.toLowerCase().includes(search.value.trim().toLowerCase());
const visibleItems = computed(() => publicItems.filter(item =>
  (props.view !== 'schedule' || item.stage !== 'future') &&
  (activeProgram.value==='all' || item.program===activeProgram.value) &&
  (stream.value==='all' || item.stream===stream.value) &&
  (!search.value || matching(item.titleZh+' '+item.id+' '+item.program,item.titleEn))
));
const visibleEvents = computed(() => publicEvents.filter(event =>
  (activeProgram.value==='all' || event.program===activeProgram.value) &&
  (eventKind.value==='all' || event.kind===eventKind.value) &&
  (!search.value || matching(event.titleZh+' '+event.id+' '+event.program,event.titleEn))
));
const chosenItem = computed(() => publicItems.find(x => x.id === selectedId.value) ?? null);
const chosenEvent = computed(() => publicEvents.find(x => x.id === selectedId.value) ?? null);
const chosenProgram = computed(() => publicPrograms.find(x => x.id === activeProgram.value) ?? null);
const hasInspectorSelection = computed(() => props.view === 'activity'
  ? Boolean(chosenEvent.value)
  : props.view === 'systems'
    ? Boolean(chosenProgram.value && selectedId.value === chosenProgram.value.id)
    : Boolean(chosenItem.value));
const dependents = computed(() => chosenItem.value ? publicItems.filter(x => x.deps.includes(chosenItem.value!.id)) : []);
function select(id:string) { if (document.activeElement instanceof HTMLElement) returnFocus = document.activeElement; selectedId.value=id; inspectorOpen.value=true; }
function switchProgram(id:ProgramId|'all') { activeProgram.value=id; selectedId.value=''; inspectorOpen.value=false; closeRangePanel(); }
function toggleGroup(id:string) { expanded.value[id] = expanded.value[id] === false ? true : false; }
function groupExpanded(id:string) { return expanded.value[id] !== false; }
const grouped = computed(() => publicPrograms.map(prog => ({...prog, items: visibleItems.value.filter(item=>item.program===prog.id)})).filter(group=>group.items.length));
const totalCount = computed(()=>props.view==='activity'? visibleEvents.value.length:visibleItems.value.length);
const windowBounds = computed(() => windowEnds(calendarWindow.value));
const ticks = computed(() => axisTicks(calendarWindow.value, zoom.value));
const unitCount = computed(() => ticks.value.length);
const gridMinWidth = computed(() => labelWidth.value + Math.max(8,unitCount.value)*(zoom.value === 'month' ? 120 : 164));
const rangeStart = computed(() => windowBounds.value.start);
const rangeEnd = computed(() => windowBounds.value.end);
function durationPosition(item:WorkItem) {
  const bar = item.start && item.end ? barPosition({start:item.start,end:item.end}, calendarWindow.value) : {hidden:true,left:0,width:0,right:0};
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
  const t=Date.parse(`${publicSnapshot.updatedAt ?? '2026-11-17'}T00:00:00Z`);
  return t >= rangeStart.value && t < rangeEnd.value?`${((t-rangeStart.value)/(rangeEnd.value-rangeStart.value))*100}%`:null;
});
const ganttLayout=computed(()=>visibleRows(grouped.value,expanded.value));
const focusedId=computed(()=>hoveredId.value || (chosenItem.value ? selectedId.value : null));
// Compute geometry only when bars, dates or visibility change, never on mouse hover.
const routingEdges=computed(()=>dependencyPaths(grouped.value, expanded.value, calendarWindow.value, trackWidth.value,null));
const dependencyEdges=computed(()=>routingEdges.value.map(edge=>({...edge,active:focusedId.value===edge.from||focusedId.value===edge.to})));
const dependencyTrunks = computed(() => {
  const trunks = new Map<string,{key:string;d:string;active:boolean}>();
  for (const edge of dependencyEdges.value) {
    if (!edge.trunk) continue;
    const existing=trunks.get(edge.from);
    if(existing) existing.active ||= edge.active;
    else trunks.set(edge.from,{key:edge.from,d:edge.trunk,active:edge.active});
  }
  return [...trunks.values()];
});
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
  const item=publicItems.find(x=>x.id===id);
  if (!item) return;
  if (activeProgram.value!=='all' && activeProgram.value!==item.program) activeProgram.value='all';
  if (stream.value!=='all' && stream.value!==item.stream) stream.value='all';
  search.value='';
  expanded.value[item.program]=true;
  if(!item.start || !item.end) { selectedId.value=id; inspectorOpen.value=true; return; }
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
function fmtDate(s:string|null) { return s ? s.replaceAll('-','.') : tr('未确定','NOT SCHEDULED'); }
function filteredCount(program:ProgramId){return publicItems.filter(x=>x.program===program).length;}
const stats=computed(()=>({items:visibleItems.value.length,programs:new Set(visibleItems.value.map(x=>x.program)).size,events:visibleEvents.value.length}));
</script>

<template>
  <section class="workbench" :data-view="view">
    <!-- The header owns the search position; Vue owns its reactive filtering state.
         Portal after hydration to avoid Astro SSR/Teleport mismatch. -->
    <Teleport v-if="portalReady" to="#ws-header-search-slot">
      <label class="ws-search">
        <EngineeringIcon name="search" />
        <input v-model="search" type="search" :placeholder="tr('搜索项目 / 任务 / 编号','Search project / task / ID')" :aria-label="tr('搜索','Search')" />
      </label>
    </Teleport>
    <div class="ws-content-grid" :data-inspector-open="inspectorOpen ? 'true' : 'false'">
      <aside class="ws-project-index" :aria-label="tr('路线图导航与项目索引','Roadmap navigation and project index')">
        <nav class="ws-view-nav" :aria-label="tr('路线图视图','Roadmap views')">
          <div class="rail-title"><span>VIEWS</span><span>04 / NAV</span></div>
          <a v-for="link in viewLinks" :key="link.id" class="ws-view-link" :class="{'is-current':view===link.id}"
            :href="link.href" :aria-current="view===link.id?'page':undefined">
            <span class="ws-view-index">{{link.code}}</span><span>{{tr(link.zh,link.en)}}</span>
          </a>
        </nav>
        <details class="ws-view-mobile">
          <summary><span>{{tr('视图','VIEW')}}</span><strong>{{tr(activeView.zh,activeView.en)}}</strong><span class="ws-view-mobile-chevron" aria-hidden="true">⌄</span></summary>
          <nav class="ws-view-mobile-list" :aria-label="tr('路线图视图','Roadmap views')">
            <a v-for="link in viewLinks" :key="link.id" :href="link.href" :aria-current="view===link.id?'page':undefined">{{link.code}} / {{tr(link.zh,link.en)}}</a>
          </nav>
        </details>
        <div class="ws-project-filters">
        <div class="rail-title"><span>PROJECT INDEX</span><span>{{String(publicPrograms.length).padStart(2,'0')}} / SYS</span></div>
        <button class="rail-item" :class="{'is-current':activeProgram==='all'}" @click="switchProgram('all')"><span class="rail-symbol rail-symbol-all">✳</span><span class="rail-copy"><strong>{{tr('全部系统','ALL SYSTEMS')}}</strong><small>OVERVIEW / ALL</small></span><span class="rail-count">{{publicItems.length.toString().padStart(2,'0')}}</span></button>
        <div class="rail-separator">{{tr('系统与产品','SYSTEMS & PRODUCTS')}}</div>
        <button v-for="program in publicPrograms" :key="program.id" class="rail-item" :class="{'is-current':activeProgram===program.id}" @click="switchProgram(program.id)"><span class="rail-symbol">{{program.id.slice(0,1)}}</span><span class="rail-copy"><strong>{{program.id}}</strong><small>{{tr(program.zh,program.en)}}</small></span><span class="rail-count">{{filteredCount(program.id).toString().padStart(2,'0')}}</span></button>
        <div class="rail-block"><div class="rail-block-title">DATA SCOPE</div><div class="rail-block-value"><span class="ws-signal"></span> PUBLIC / REVIEWED</div><p>{{tr('公开页面仅读取独立的脱敏数据模型，不能直接读取内部仓库。','Public pages must use an independent reviewed feed, never internal repository access.')}}</p></div>
        <div class="rail-bottom"><span>INDEX REV. 004</span><span>PROTORHEXIS</span></div>
        </div>
      </aside>

      <div class="ws-primary">
        <div class="ws-view-toolbar"><div class="ws-view-state"><span class="ws-mini-square"></span><span>{{activeProgram==='all' ? 'ALL PROGRAMS' : activeProgram}}</span><span class="v-divider">/</span><span>{{totalCount.toString().padStart(2,'0')}} {{view==='activity'?'EVENTS':'ENTRIES'}}</span></div>
          <div v-if="view==='schedule'" class="ws-view-sub">{{rangeLabel}} <span class="v-divider">·</span> {{tr('拖动空白处平移 · 只读','Drag empty track to pan · read-only')}}</div>
          <div v-else-if="view==='board'" class="ws-view-sub">{{tr('状态代表公开交付阶段','PUBLIC DELIVERY STAGES')}}</div>
          <div v-else-if="view==='activity'" class="ws-view-sub">{{tr('按时间倒序排列','NEWEST FIRST')}}</div>
          <div v-else class="ws-view-sub">{{tr('公开项目概览','PUBLIC PROGRAM OVERVIEW')}}</div>
        </div>

        <div v-if="view==='schedule'" class="ws-timeline">
          <div class="gantt-controls">
            <div class="gantt-presets" :aria-label="tr('时间范围','Time range')"><span class="gantt-controls-label">RANGE</span>
              <button v-for="m in presets" :key="m" type="button" :class="{current:activePreset===`${m}m`}" :aria-pressed="activePreset===`${m}m`" @click="setPreset(m)">{{m}}M</button>
              <button ref="rangeTrigger" type="button" class="gantt-range-trigger" :class="{current:activePreset==='custom'}" :aria-expanded="showRangePanel" aria-controls="gantt-range-panel" aria-haspopup="dialog" @click="toggleRangePanel"><EngineeringIcon name="expand" />{{tr('自定义','CUSTOM')}}</button>
            </div>
            <div class="gantt-control-actions">
              <div class="ws-toolset gantt-scale-switch" :aria-label="tr('时间粒度','Time scale')">
                <button type="button" :aria-pressed="zoom==='month'" :class="{current:zoom==='month'}" @click="zoom='month'">{{tr('月','MONTH')}}</button>
                <button type="button" :aria-pressed="zoom==='quarter'" :class="{current:zoom==='quarter'}" @click="zoom='quarter'">{{tr('季度','QUARTER')}}</button>
              </div>
              <div class="ws-toolset ws-pager gantt-period-pager" :aria-label="tr('时间轴位置','Timeline position')">
                <button type="button" :aria-label="tr('前移时间轴','Previous period')" @click="shift(-1)"><EngineeringIcon name="back" /></button>
                <button type="button" @click="resetAxis"><EngineeringIcon name="reset" />{{tr('复位','RESET')}}</button>
                <button type="button" :aria-label="tr('后移时间轴','Next period')" @click="shift(1)"><EngineeringIcon name="next" /></button>
              </div>
              <button type="button" class="gantt-dep-toggle" :aria-pressed="showDependencies" @click="showDependencies=!showDependencies"><span class="ws-dep-dot"></span>{{tr('依赖关系','DEPENDENCIES')}}<strong>{{showDependencies?tr('显示','ON'):tr('隐藏','OFF')}}</strong></button>
            </div>
          </div>
          <div ref="ganttViewport" class="gantt-viewport" tabindex="0" :aria-label="tr('可横向滚动的只读甘特排期图','Scrollable read-only Gantt timeline')" @pointerdown="panStart" @pointermove="panMove" @pointerup="panEnd" @pointercancel="panEnd" @lostpointercapture="panEnd">
            <div class="gantt-canvas" :style="{'--tick-count':unitCount,'--gantt-label-width':`${labelWidth}px`,'--gantt-masked-height':`${ganttLayout.height+56}px`,minWidth:`${gridMinWidth}px`}"><div class="gantt-label-mask" aria-hidden="true"></div>
              <div class="gantt-head"><div class="gantt-head-name"><strong>{{tr('工作项 / 交付物','WORK PACKAGE / DELIVERABLE')}}</strong><small>WBS INDEX</small></div><div class="gantt-axis"><span v-for="(tick,i) in ticks" :key="i" :style="{width:`${tick.width}%`,flex:`0 0 ${tick.width}%`}">{{tick.label}}</span></div></div>
              <svg v-if="showDependencies && dependencyEdges.length" class="gantt-dependency-layer" :viewBox="`0 0 ${trackWidth} ${ganttLayout.height}`" :style="{height:`${ganttLayout.height}px`}" preserveAspectRatio="none" aria-hidden="true">
                <defs><marker id="dep-arrow" markerUnits="userSpaceOnUse" viewBox="0 0 10 8" refX="1" refY="4" markerWidth="10" markerHeight="8" orient="auto"><path d="M1 1 L9 4 L1 7 Z" fill="#777781"/></marker><marker id="dep-arrow-active" markerUnits="userSpaceOnUse" viewBox="0 0 10 8" refX="1" refY="4" markerWidth="10" markerHeight="8" orient="auto"><path d="M1 1 L9 4 L1 7 Z" fill="#ff453a"/></marker></defs>
                <path v-for="trunk in dependencyTrunks" :key="`trunk-${trunk.key}`" class="gantt-dependency-trunk" :data-dependency-trunk="trunk.key" :class="{active:trunk.active}" :d="trunk.d" />
                <path v-for="edge in dependencyEdges" :key="edge.key" :data-dependency-key="edge.key" :d="edge.d" :class="{active:edge.active}" :marker-end="edge.active?'url(#dep-arrow-active)':'url(#dep-arrow)'"/>
              </svg>
              <template v-for="group in grouped" :key="group.id">
                <button class="gantt-group" type="button" @click="toggleGroup(group.id)" :aria-expanded="groupExpanded(group.id)"><span class="gantt-group-name"><span class="chevron" :class="{collapsed:!groupExpanded(group.id)}"><EngineeringIcon name="gantt-chevron" /></span><strong>{{group.id}}</strong><small>{{tr(group.zh,group.en)}}</small></span><span class="gantt-group-suffix">{{group.items.length}} {{tr('个工作项','WORK ITEMS')}}</span></button>
                <template v-if="groupExpanded(group.id)"><div v-for="item in group.items" :key="item.id" class="gantt-row" :class="{selected:selectedId===item.id}"><button class="gantt-item-name" @click="focusItem(item.id)"><small>{{item.id}} <span>·</span> {{streamName(item.stream)}}</small><strong>{{tr(item.titleZh,item.titleEn)}}</strong></button><div class="gantt-track"><span v-for="(tick,i) in ticks" :key="i" class="gantt-gridline" :style="{left:`${tick.left}%`}"></span><span v-if="currentLine" class="gantt-today" :style="{left:currentLine}"></span><button v-if="!durationPosition(item).hidden" class="gantt-bar" :data-gantt-id="item.id" :class="[item.stage,{selected:selectedId===item.id,related:focusedId===item.id}]" @pointerenter="hoveredId=item.id" @pointerleave="hoveredId=null" :aria-pressed="selectedId===item.id" :aria-label="`${item.id} · ${tr(item.titleZh,item.titleEn)} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · ${stageName(item.stage)}`" :style="{left:durationPosition(item).left,width:durationPosition(item).width}" :title="`${item.id} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · PUBLIC RECORD`" @click="select(item.id)"><span>{{item.id}}</span></button><span v-if="!item.start || !item.end" class="gantt-undated">{{tr('未安排公开时间','NO PUBLIC DATE')}}</span></div></div></template>
              </template>
              <div v-if="grouped.length===0" class="ws-no-results">{{tr('没有匹配的工作项。','No matching work items.')}}</div>
            </div>
          </div>
          <div class="ws-chart-foot"><span><i class="legend-swatch swatch-plan"></i>{{tr('规划','Planned')}}</span><span><i class="legend-swatch swatch-progress"></i>{{tr('开发中','Development')}}</span><span><i class="legend-swatch swatch-valid"></i>{{tr('验证中','Qualification')}}</span><span><i class="legend-swatch swatch-cursor"></i>{{tr('时间参照线','Reference date')}}</span><span class="chart-foot-note">{{tr('只读排期 · 拖动背景平移 · 点击依赖编号跳转','Read-only schedule · drag background to pan · follow dependency IDs')}}</span></div>
        </div>

        <template v-else-if="view==='board'">
          <div class="ws-board-transport" :aria-label="tr('看板横向导航','Board horizontal navigation')">
            <span class="ws-board-transport-title">{{String(stages.length).padStart(2,'0')}} / {{tr('交付阶段','DELIVERY STAGES')}} <small>{{tr('左右滑动查看全部阶段','Scroll horizontally for every stage')}}</small></span>
            <div class="ws-board-transport-progress" role="progressbar" :aria-label="tr('看板横向滚动进度','Board horizontal scroll progress')" :aria-valuenow="Math.round(boardScrollRatio*100)" aria-valuemin="0" aria-valuemax="100"><span :style="{width:`${Math.max(4,boardScrollRatio*100)}%`}"></span></div>
            <button type="button" :aria-label="tr('上一阶段','Previous stage')" :disabled="!boardOverflow || boardScrollRatio<0.01" @click="scrollBoard(-1)"><EngineeringIcon name="back" /></button>
            <button type="button" :aria-label="tr('下一阶段','Next stage')" :disabled="!boardOverflow || boardScrollRatio>0.99" @click="scrollBoard(1)"><EngineeringIcon name="next" /></button>
          </div>
          <div ref="boardViewport" class="ws-board-viewport" tabindex="0" @scroll.passive="syncBoardScroll" :aria-label="tr('可横向滚动的交付看板','Scrollable release board')"><div class="ws-board" :style="{'--board-stage-count':stages.length,'--board-min-width':`${stages.length*260}px`}">
          <section v-for="stage in stages" :key="stage.id" class="kanban-column"><div class="kanban-heading" :data-stage="stage.id"><span class="kanban-stage-label"><RoadmapStatusIcon :status="stage.id" />{{stage.code}} / {{tr(stage.zh,stage.en)}}</span><span class="kanban-count">{{visibleItems.filter(x=>x.stage===stage.id).length.toString().padStart(2,'0')}}</span></div><div class="kanban-stack"><motion.button v-for="item in visibleItems.filter(x=>x.stage===stage.id)" :key="item.id" layout :initial="false" :whileHover="reducedMotion ? undefined : { y: -2 }" :whilePress="reducedMotion ? undefined : { scale: 0.99 }" :transition="{ duration: reducedMotion ? 0 : 0.14 }" class="kanban-card" :class="{selected:selectedId===item.id}" :aria-pressed="selectedId===item.id" @click="select(item.id)"><span class="kanban-card-head"><small>{{item.id}}</small><small>{{item.program}}</small></span><strong>{{tr(item.titleZh,item.titleEn)}}</strong><p>{{tr(item.descZh,item.descEn)}}</p><span class="kanban-card-foot"><span>{{streamName(item.stream)}}</span><span class="kanban-delivery" :data-delivery="item.deliveryState"><RoadmapStatusIcon :status="item.deliveryState" />{{deliveryName(item.deliveryState)}}</span><span class="ws-action-glyph"><EngineeringIcon name="next" /></span></span></motion.button><div v-if="!visibleItems.some(x=>x.stage===stage.id)" class="kanban-empty">NO ITEMS</div></div></section>
        </div></div>
        </template>

        <div v-else-if="view==='activity'" class="ws-activity"><div class="activity-filters"><span>{{tr('事件类型','EVENT TYPE')}}</span><div class="ws-toolset"><button v-for="kind in eventKinds" :key="kind" :class="{current:eventKind===kind}" @click="eventKind=kind">{{kind==='all'?tr('全部','ALL'):eventName(kind)}}</button></div></div><div class="event-stream"><button v-for="event in visibleEvents" :key="event.id" class="event-entry" :class="{selected:selectedId===event.id}" :aria-pressed="selectedId===event.id" @click="select(event.id)"><span class="event-date">{{fmtDate(event.date)}}<small>{{event.program}}</small></span><span class="event-marker"><i></i></span><span class="event-body"><span class="event-kind">{{eventName(event.kind)}} <span>/ {{event.id}}</span></span><strong>{{tr(event.titleZh,event.titleEn)}}</strong><span class="event-summary">{{tr(event.descZh,event.descEn)}}</span><span class="event-arrow" aria-hidden="true"><EngineeringIcon name="next" /></span></span></button><div v-if="visibleEvents.length===0" class="ws-no-results">{{tr('没有匹配的事件。','No matching events.')}}</div></div></div>

        <div v-else class="ws-systemmap"><div class="systemmap-topline">PROTORHEXIS / DISTRIBUTED RESEARCH & ENGINEERING <span>PUBLIC INDEX / VERIFIED ONLY</span></div><div class="systemmap-stage"><component :is="graphComponent" v-if="graphComponent" :programs="publicPrograms" :relations="publicSnapshot.relations" :locale="locale" :active-program="activeProgram" @select="selectGraphProgram" /><div v-else class="systemmap-fallback" role="group" :aria-label="tr('系统列表','System list')"><button v-for="prog in publicPrograms" :key="prog.id" type="button" @click="selectGraphProgram(prog.id)">{{prog.id}}</button></div></div><p class="systemmap-note">{{tr('仅绘制经公开审核的组织级项目归属关系；不代表系统之间已实现技术集成或依赖。','Only reviewed organizational grouping is shown; no technical integration or dependencies are implied.')}}</p></div>
      </div>

      <button v-if="inspectorOpen" class="ws-inspector-scrim" type="button" :aria-label="tr('关闭详情面板','Close detail panel')" @click="closeInspector"></button>
      <aside ref="inspectorRef" id="roadmap-inspector" class="ws-inspector" :class="{'inspector-visible':inspectorOpen}" :aria-label="tr('详情检查器','Inspector')" :aria-hidden="inspectorOpen ? 'false' : 'true'" :inert="!inspectorOpen" tabindex="-1">
        <div v-if="!hasInspectorSelection" class="inspector-empty-state" role="status">
          <p>{{tr('请选择一个项目以显示内容','Select an item to display its details')}}</p>
        </div>
        <template v-else>
        <div class="inspector-title"><span>DETAIL INSPECTOR</span><button type="button" class="inspector-close" :aria-label="tr('关闭详情','Close inspector')" @click="closeInspector"><EngineeringIcon name="close" /></button></div>
        <AnimatePresence mode="wait">
          <motion.div :key="`${view}:${selectedId}:${activeProgram}`" class="inspector-motion-body"
            :initial="reducedMotion ? false : { opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }"
            :transition="{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }">
        <template v-if="chosenItem && view!=='activity' && view!=='systems'"><div class="inspector-hero"><small>{{chosenItem.id}} / {{chosenItem.program}}</small><h2>{{tr(chosenItem.titleZh,chosenItem.titleEn)}}</h2><span class="inspector-status" :data-stage="chosenItem.stage"><RoadmapStatusIcon :status="chosenItem.stage" />{{stageName(chosenItem.stage)}}</span></div><div class="inspector-section"><span class="inspector-label">{{tr('工作概要','DESCRIPTION')}}</span><p>{{tr(chosenItem.descZh,chosenItem.descEn)}}</p></div><dl class="inspector-spec"><div><dt>{{tr('公开时间记录','PUBLIC DATE RECORD')}}</dt><dd>{{fmtDate(chosenItem.start)}}<br/>— {{fmtDate(chosenItem.end)}}<small v-if="chosenItem.scheduleKind==='observed'">{{tr('公开 PR 观察窗口','Observed PR window')}}</small></dd></div><div><dt>{{tr('工作类别','STREAM')}}</dt><dd>{{streamName(chosenItem.stream)}}</dd></div>
        <div><dt>{{tr('交付可信度','DELIVERY CONFIDENCE')}}</dt><dd class="inspector-delivery" :data-delivery="chosenItem.deliveryState"><span class="inspector-delivery-label"><RoadmapStatusIcon :status="chosenItem.deliveryState" />{{deliveryName(chosenItem.deliveryState)}}</span><small v-if="chosenItem.releaseTarget">{{chosenItem.releaseTarget}}</small></dd></div>
        <div><dt>{{tr('来源核验','SOURCE VERIFICATION')}}</dt><dd>{{chosenItem.verifiedAt?fmtDate(chosenItem.verifiedAt):tr('未单独核验','NOT SEPARATELY VERIFIED')}}<small>{{tr('记录更新','Record updated')}}: {{fmtDate(chosenItem.updatedAt)}}</small></dd></div><div class="inspector-dep-row"><dt>{{tr('前置依赖','PREDECESSORS')}}</dt><dd><template v-if="chosenItem.deps.length"><button v-for="dep in chosenItem.deps" :key="dep" class="inspector-dep-link" type="button" :title="tr('定位并打开依赖任务','Locate dependency')" @click="focusItem(dep)">{{dep}} <EngineeringIcon name="next" /></button></template><span v-else>{{tr('无','NONE')}}</span></dd></div><div class="inspector-dep-row"><dt>{{tr('后续工作','SUCCESSORS')}}</dt><dd><template v-if="dependents.length"><button v-for="next in dependents" :key="next.id" class="inspector-dep-link" type="button" :title="tr('定位后续任务','Locate successor')" @click="focusItem(next.id)">{{next.id}} <EngineeringIcon name="next" /></button></template><span v-else>{{tr('无','NONE')}}</span></dd></div><div><dt>{{tr('数据级别','PROVENANCE')}}</dt><dd>{{chosenItem.evidence.length ? 'PUBLIC / SOURCE-LINKED' : chosenItem.reviewReceipt ? 'PRIVATE / REVIEWED SUMMARY' : 'FUTURE INTENT / NO DATE'}}</dd></div><div v-if="chosenItem.reviewReceipt"><dt>{{tr('审核编号','REVIEW RECEIPT')}}</dt><dd>{{chosenItem.reviewReceipt}}</dd></div><div v-if="chosenItem.evidence.length"><dt>{{tr('公开来源','PUBLIC SOURCES')}}</dt><dd><a v-for="src in chosenItem.evidence" :key="src.url" :href="src.url" target="_blank" rel="noopener noreferrer" class="inspector-dep-link">GitHub ↗</a></dd></div></dl><nav class="inspector-crossviews" :aria-label="tr('同一工作项的其他视图','Other views of this work item')">
          <a v-if="chosenItem.stage!=='future' && view!=='schedule'" :href="workLink('schedule',chosenItem)">{{tr('查看排期','Open schedule')}} →</a>
          <a v-if="view!=='board'" :href="workLink('board',chosenItem)">{{tr('查看看板','Open board')}} →</a>
          <a :href="projectEventsLink(chosenItem)">{{tr('查看项目事件','Project events')}} →</a>
        </nav></template>
        <template v-else-if="chosenEvent && view==='activity'"><div class="inspector-hero"><small>{{chosenEvent.id}} / {{chosenEvent.program}}</small><h2>{{tr(chosenEvent.titleZh,chosenEvent.titleEn)}}</h2><span class="inspector-status" :data-event-kind="chosenEvent.kind"><RoadmapStatusIcon :status="chosenEvent.kind" />{{eventName(chosenEvent.kind)}}</span></div><div class="inspector-section"><span class="inspector-label">{{tr('事件说明','EVENT DETAILS')}}</span><p>{{tr(chosenEvent.descZh,chosenEvent.descEn)}}</p></div><dl class="inspector-spec"><div><dt>{{tr('事件时间','EVENT DATE')}}</dt><dd>{{fmtDate(chosenEvent.date)}}</dd></div>
        <div v-if="chosenEvent.change"><dt>{{tr('变化与原因','CHANGE / REASON')}}</dt><dd>{{chosenEvent.change.before}} → {{chosenEvent.change.after}}<small>{{tr(chosenEvent.change.reason.zh,chosenEvent.change.reason.en)}}</small></dd></div><div><dt>{{tr('公开来源','PUBLIC SOURCES')}}</dt><dd><a v-for="src in chosenEvent.evidence" :key="src.url" :href="src.url" target="_blank" rel="noopener noreferrer" class="inspector-dep-link">GitHub ↗</a></dd></div></dl><nav v-if="chosenEvent.itemId" class="inspector-crossviews" :aria-label="tr('关联工作项','Linked work item')">
          <a :href="`/roadmap/board/?item=${encodeURIComponent(chosenEvent.itemId)}`">{{tr('查看对应交付物','Open linked deliverable')}} →</a>
        </nav></template>
        <template v-else-if="view==='systems'"><div class="inspector-hero"><small>SYSTEM MAP / {{chosenProgram?.code??'OVERVIEW'}}</small><h2>{{chosenProgram?.id??'PROTORHEXIS'}}</h2><span class="inspector-status" data-status="project"><RoadmapStatusIcon status="project" />PUBLIC PROJECT / LIMITED RECORD</span></div><div class="inspector-section"><span class="inspector-label">{{tr('系统范围','SYSTEM SCOPE')}}</span><p>{{chosenProgram?tr(chosenProgram.zh,chosenProgram.en):tr('分布式科研和工程协作网络','Distributed research and engineering network')}}</p></div><dl class="inspector-spec"><div><dt>PUBLICATION</dt><dd>PUBLIC OVERVIEW ONLY</dd></div></dl></template>
        <template v-else><div class="inspector-placeholder"><span class="placeholder-cross">⌖</span><strong>{{tr('选择一个条目','Select an item')}}</strong><p>{{tr('在主视图中点击时间条、卡片或事件，查看对应详细信息。','Choose a bar, card or event to inspect its details.')}}</p></div></template>
          </motion.div>
        </AnimatePresence>
        <div class="inspector-warning"><span><EngineeringIcon name="warning" /></span><p>{{tr('公开事实由来源链接支持，未公布的项目没有推定进度或日期。','Public facts are source-linked. Undisclosed projects have no inferred status or dates.')}}</p></div>
        <div class="inspector-foot">INSPECTOR / REV 004 <span>PUBLIC SNAPSHOT</span></div>
        </template>
      </aside>
      <button class="ws-inspector-handle" type="button"
        :aria-label="inspectorOpen ? tr('收起右侧详情栏','Collapse detail sidebar') : tr('展开右侧详情栏','Expand detail sidebar')"
        aria-controls="roadmap-inspector" :aria-expanded="inspectorOpen ? 'true' : 'false'"
        :title="inspectorOpen ? tr('收起详情','Collapse details') : tr('展开详情','Expand details')"
        @click="toggleInspector">
        <EngineeringIcon name="inspector-toggle" />
      </button>
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
    <div class="ws-statusline"><span><i class="ws-mini-square"></i>{{tr('公开记录工作台','PUBLIC RECORDS')}}</span><span>{{stats.programs.toString().padStart(2,'0')}} PROGRAMS</span><span>{{stats.items.toString().padStart(2,'0')}} WORK ITEMS</span><span>{{stats.events.toString().padStart(2,'0')}} EVENTS</span><span class="status-right">STATIC APPROVED PUBLIC SNAPSHOT</span></div>
  </section>
</template>
