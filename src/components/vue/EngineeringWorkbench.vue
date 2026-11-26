<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, watch, provide } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { usePublicLocale } from './usePublicLocale';
import EngineeringIcon from './EngineeringIcon.vue';
import RoadmapBoardLanes from './RoadmapBoardLanes.vue';
import RoadmapActivityStream from './RoadmapActivityStream.vue';
import RoadmapInspectorDetails from './RoadmapInspectorDetails.vue';
import RoadmapChangelog from './RoadmapChangelog.vue';
import ReleaseDetails from './ReleaseDetails.vue';
import { publicReleases, changeKinds, changeLabel, type ChangeKind } from './release-presentation';
import { roadmapLabels, stages, reducedMotionKey } from './roadmap-presentation';
import { publicSnapshot, publicItems, publicEvents, publicPrograms, type WorkItem, type ProgramId, type PublicEvent, type Stream } from '../../data/workstation-public';
import { monthIndex, monthString, validateWindow, windowEnds, axisTicks, barPosition, visibleRows, dependencyPaths } from '../../lib/gantt';

const props = defineProps<{ view: 'schedule' | 'board' | 'activity' | 'changelog' }>();
const labelWidth = ref(256);

const { locale } = usePublicLocale();
const tr = (zh: string, en: string) => locale.value === 'zh' ? zh : en;
const activeProgram = ref<ProgramId | 'all'>('all');
const search = ref('');
const stream = ref<'all' | Stream>('all');
const channelFilter = ref('all');
const changeFilter = ref<ChangeKind | 'all'>('all');
const eventKind = ref<'all' | PublicEvent['kind']>('all');
const eventKinds: Array<'all' | PublicEvent['kind']> = ['all','milestone','verification','decision'];
// Do not confuse a public record's existence with an explicit selection.
const selectedId = ref('');
const inspectorOpen = ref(false);
const isNarrow = ref(false);
const reducedMotion = ref(true); // Static icons and motion on SSR until the preference is known.
provide(reducedMotionKey, reducedMotion);
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
  if (!showRangePanel.value || !rangeTrigger.value) return;
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
  if(deepItem && (props.view==='schedule' || props.view==='board') && !(props.view==='schedule' && deepItem.stage==='future')){
    activeProgram.value=deepItem.program;selectedId.value=deepItem.id;inspectorOpen.value=true;
  }
  const requestedEvent=params.get('event');
  if(props.view==='activity' && publicEvents.some(x=>x.id===requestedEvent)){
    selectedId.value=requestedEvent!;inspectorOpen.value=true;
  }
  const deepRelease = publicReleases.find(release => release.id === params.get('release'));
  if (props.view === 'changelog' && deepRelease) {
    activeProgram.value = deepRelease.program; selectedId.value = deepRelease.id; inspectorOpen.value = true;
  }
  viewportQuery = window.matchMedia('(max-width: 1050px)');
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  onViewportChange(); onMotionChange();
  viewportQuery.addEventListener('change', onViewportChange);
  motionQuery.addEventListener('change', onMotionChange);
  window.addEventListener('keydown', onKeydown);
  if (props.view === 'board') {
    window.addEventListener('resize', syncBoardScroll);
    nextTick(syncBoardScroll);
  }
  if (props.view === 'schedule') {
    window.addEventListener('pointerdown', onGlobalPointerDown, true);
    window.addEventListener('resize', positionRangePanel);
    window.addEventListener('resize', measureGanttLabels);
    window.addEventListener('scroll', positionRangePanel, true);
    nextTick(measureGanttLabels);
  }
  nextTick(()=>{
    const primary=document.querySelector<HTMLElement>('.workbench .ws-primary');
    if (primary && typeof ResizeObserver!=='undefined') {
      selectionResizeObserver=new ResizeObserver(scheduleSelectionReveal);
      selectionResizeObserver.observe(primary);
    }
    scheduleSelectionReveal(); // Deep-link selection initialized during onMounted.
  });
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
  selectionResizeObserver?.disconnect();
  if (selectionRaf) cancelAnimationFrame(selectionRaf);
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
const activityViewport = ref<HTMLElement | null>(null);
const changelogViewport = ref<HTMLElement | null>(null);
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

// Keep the *selected object* inside its own scrollport, not the page.
// Smallest necessary correction is preferred; never center an already-visible
// card. The WBS sticky label occupies the left edge of the Gantt viewport.
let selectionRaf = 0;
let selectionResizeObserver: ResizeObserver | null = null;
function revealInside(viewport: HTMLElement, target: HTMLElement, leftInset = 0) {
  const view = viewport.getBoundingClientRect(), item = target.getBoundingClientRect();
  const left = view.left + leftInset + 8, right = view.right - 8;
  const top = view.top + 8, bottom = view.bottom - 8;
  if (right <= left + 2 || bottom <= top + 2) return;
  // An object larger than the scrollport cannot fit; reveal its leading edge.
  const dx = item.width > right - left
    ? item.left - left
    : item.left < left ? item.left - left : item.right > right ? item.right - right : 0;
  const dy = item.height > bottom - top
    ? item.top - top
    : item.top < top ? item.top - top : item.bottom > bottom ? item.bottom - bottom : 0;
  if (Math.abs(dx) > 0.5) viewport.scrollLeft = Math.max(0,Math.min(viewport.scrollWidth-viewport.clientWidth,viewport.scrollLeft+dx));
  if (Math.abs(dy) > 0.5) viewport.scrollTop = Math.max(0,Math.min(viewport.scrollHeight-viewport.clientHeight,viewport.scrollTop+dy));
}
function findSelected(nodes: NodeListOf<HTMLElement>, id: string, key: keyof DOMStringMap) {
  return Array.from(nodes).find(node=>node.dataset[key]===id) ?? null;
}
function revealSelection() {
  const id=selectedId.value;
  if (!id || (isNarrow.value && inspectorOpen.value)) return; // Mobile inspector is a modal overlay.
  if (props.view==='board' && boardViewport.value) {
    const target=findSelected(boardViewport.value.querySelectorAll<HTMLElement>('.kanban-card[data-item-id]'),id,'itemId');
    if (target) { revealInside(boardViewport.value,target);syncBoardScroll(); }
  } else if (props.view==='schedule' && ganttViewport.value) {
    const viewport=ganttViewport.value;
    const bar=findSelected(viewport.querySelectorAll<HTMLElement>('.gantt-bar[data-gantt-id]'),id,'ganttId');
    const label=findSelected(viewport.querySelectorAll<HTMLElement>('.gantt-item-name[data-item-id]'),id,'itemId');
    // Exclude the opaque frozen WBS column from usable bar space.
    if (bar) revealInside(viewport,bar,Math.min(labelWidth.value,Math.max(0,viewport.clientWidth-80)));
    else if (label) revealInside(viewport,label);
  } else if (props.view==='activity' && activityViewport.value) {
    const target=findSelected(activityViewport.value.querySelectorAll<HTMLElement>('.event-entry[data-event-id]'),id,'eventId');
    if (target) revealInside(activityViewport.value,target);
  } else if (props.view==='changelog' && changelogViewport.value) {
    const target=findSelected(changelogViewport.value.querySelectorAll<HTMLElement>('[data-release-id]'),id,'releaseId');
    if (target) revealInside(changelogViewport.value,target);
  }
}
function scheduleSelectionReveal() {
  if (typeof window==='undefined') return;
  if (selectionRaf) window.cancelAnimationFrame(selectionRaf);
  selectionRaf=window.requestAnimationFrame(()=>{selectionRaf=0;revealSelection();});
}
// Post-render selection and measured pane resizing are separate: opening an
// inspector animates the CSS grid for 260ms after Vue's nextTick. ResizeObserver
// continues to correct visibility throughout the animation without a timeout.
watch([selectedId,inspectorOpen,activeProgram,search,locale,isNarrow],()=>{
  nextTick(scheduleSelectionReveal);
},{flush:'post'});

const trackWidth = ref(900);
// Measure the full visible label text (not clipped DOM widths), then share one CSS variable
// between the frozen labels, header, chart coordinate origin, and opaque continuous mask.
function measureGanttLabels() {
  if (!ganttViewport.value) return;
  const strong = ganttViewport.value.querySelector<HTMLElement>('.gantt-item-name strong');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = strong ? getComputedStyle(strong).font : '500 12px "Noto Sans Variable", "Noto Sans SC Variable"';
  const titles = publicItems.map(item => tr(item.titleZh,item.titleEn));
  const widest = titles.reduce((max,title)=>Math.max(max,ctx.measureText(title).width),0);
  const needed = Math.ceil(Math.max(156,widest + 34));
  const narrow = window.matchMedia('(max-width:740px)').matches;
  labelWidth.value = narrow
    ? Math.min(needed, Math.max(108, Math.floor(window.innerWidth * .36)))
    : Math.max(190, Math.min(420,needed));
}
if (props.view === 'schedule') watch(locale,()=>nextTick(measureGanttLabels));

let resizeObserver: ResizeObserver | null = null;
const showDependencies = ref(true);
const hoveredId = ref<string | null>(null);
let pan: { id:number; pointerX:number; scrollLeft:number; dragged:boolean } | null = null;
const expanded = ref<Record<string, boolean>>({});
const { stageName, streamName, eventName, fmtDate } = roadmapLabels(tr);
const viewLinks = [
  {id:'schedule',href:'/roadmap/',code:'01',zh:'开发排期',en:'PROGRESS TRACKER'},
  {id:'board',href:'/roadmap/board/',code:'02',zh:'交付看板',en:'RELEASE BOARD'},
  {id:'activity',href:'/roadmap/evidence/',code:'03',zh:'事件时间线',en:'ACTIVITY'},
  {id:'changelog',href:'/roadmap/changelog/',code:'04',zh:'版本日志',en:'CHANGELOG'},
] as const;
const activeView = computed(() => viewLinks.find(v=>v.id===props.view)!);
const matching = (zh:string,en:string) => `${zh} ${en}`.toLowerCase().includes(search.value.trim().toLowerCase());
const visibleItems = computed(() => publicItems.filter(item =>
  (props.view !== 'schedule' || item.stage !== 'future') &&
  (activeProgram.value==='all' || item.program===activeProgram.value) &&
  (stream.value==='all' || item.stream===stream.value) &&
  matching(item.titleZh+' '+item.id+' '+item.program,item.titleEn)
));
const visibleEvents = computed(() => publicEvents.filter(event =>
  (activeProgram.value==='all' || event.program===activeProgram.value) &&
  (eventKind.value==='all' || event.kind===eventKind.value) &&
  matching(event.titleZh+' '+event.id+' '+event.program,event.titleEn)
));
const chosenItem = computed(() => publicItems.find(x => x.id === selectedId.value) ?? null);
const chosenEvent = computed(() => publicEvents.find(x => x.id === selectedId.value) ?? null);
const channels = computed(() => [...new Set(publicReleases.map(release=>release.channel))]);
const visibleReleases = computed(() => publicReleases.filter(release =>
  (activeProgram.value==='all' || release.program===activeProgram.value) &&
  (channelFilter.value==='all' || release.channel===channelFilter.value) &&
  (changeFilter.value==='all' || release.changes.some(change=>change.kind===changeFilter.value)) &&
  matching([release.id,release.program,release.version,release.summary.zh,...release.changes.map(change=>change.text.zh)].join(' '),[release.channel,release.summary.en,...release.changes.map(change=>change.text.en)].join(' '))
).sort((a,b)=>(b.date??'').localeCompare(a.date??'') || a.id.localeCompare(b.id)));
const chosenRelease = computed(() => publicReleases.find(release=>release.id===selectedId.value) ?? null);
const hasInspectorSelection = computed(() => props.view === 'activity'
  ? Boolean(chosenEvent.value)
  : props.view === 'changelog' ? Boolean(chosenRelease.value) : Boolean(chosenItem.value));
const dependents = computed(() => chosenItem.value ? publicItems.filter(x => x.deps.includes(chosenItem.value!.id)) : []);
function select(id:string) { if (document.activeElement instanceof HTMLElement) returnFocus = document.activeElement; selectedId.value=id; inspectorOpen.value=true; }
function switchProgram(id:ProgramId|'all') { activeProgram.value=id; selectedId.value=''; inspectorOpen.value=false; closeRangePanel(); }
function toggleGroup(id:string) { expanded.value[id] = expanded.value[id] === false ? true : false; }
function groupExpanded(id:string) { return expanded.value[id] !== false; }
const grouped = computed(() => publicPrograms.map(prog => ({...prog, items: visibleItems.value.filter(item=>item.program===prog.id)})).filter(group=>group.items.length));
const totalCount = computed(()=>props.view==='activity'? visibleEvents.value.length:props.view==='changelog'?visibleReleases.value.length:visibleItems.value.length);
const windowBounds = computed(() => windowEnds(calendarWindow.value));
const ticks = computed(() => axisTicks(calendarWindow.value, zoom.value));
const unitCount = computed(() => ticks.value.length);
const gridMinWidth = computed(() => labelWidth.value + Math.max(8,unitCount.value)*(zoom.value === 'month' ? 120 : 164));
const rangeStart = computed(() => windowBounds.value.start);
const rangeEnd = computed(() => windowBounds.value.end);
const durationPositions = computed(() => Object.fromEntries(visibleItems.value.map(item => {
  const bar = barPosition(item, calendarWindow.value);
  return [item.id, { hidden:bar.hidden, left:`${bar.left}%`, width:`${Math.max(0.6,bar.width)}%` }];
})));
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
// Mark the source snapshot's update date.
const currentLine=computed(()=>{
  if (!publicSnapshot.updatedAt) return null;
  const t=Date.parse(`${publicSnapshot.updatedAt}T00:00:00Z`);
  return t >= rangeStart.value && t < rangeEnd.value?`${((t-rangeStart.value)/(rangeEnd.value-rangeStart.value))*100}%`:null;
});
// visibleRows.height includes the 56px calendar header; never add it twice.
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
  if(item.start && item.end) {
    const itemStart=Date.parse(`${item.start}T00:00:00Z`);
    const itemEnd=Date.parse(`${item.end}T00:00:00Z`);
    if(itemStart>=rangeEnd.value || itemEnd<rangeStart.value)
      calendarWindow.value={...calendarWindow.value,startMonth:monthString(monthIndex(item.start.slice(0,7))-1)};
  }
  // Inspector navigation does not overwrite returnFocus with a control inside the inspector.
  if (!inspectorOpen.value && document.activeElement instanceof HTMLElement) returnFocus=document.activeElement;
  selectedId.value=id;
  inspectorOpen.value=true;
  await nextTick();
  scheduleSelectionReveal(); // Container-local nearest edge, not forced centering.
}
function filteredCount(program:ProgramId){return (props.view==='changelog'?publicReleases:props.view==='activity'?publicEvents:publicItems).filter(x=>x.program===program).length;}
const totalRecords = computed(() => props.view==='changelog'?publicReleases.length:props.view==='activity'?publicEvents.length:publicItems.length);
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
        <button class="rail-item" :class="{'is-current':activeProgram==='all'}" @click="switchProgram('all')"><span class="rail-symbol rail-symbol-all">✳</span><span class="rail-copy"><strong>{{tr('全部系统','ALL SYSTEMS')}}</strong><small>OVERVIEW / ALL</small></span><span class="rail-count">{{totalRecords.toString().padStart(2,'0')}}</span></button>
        <div class="rail-separator">{{tr('系统与产品','SYSTEMS & PRODUCTS')}}</div>
        <button v-for="program in publicPrograms" :key="program.id" class="rail-item" :class="{'is-current':activeProgram===program.id}" @click="switchProgram(program.id)"><span class="rail-symbol">{{program.id.slice(0,1)}}</span><span class="rail-copy"><strong>{{program.id}}</strong><small>{{tr(program.zh,program.en)}}</small></span><span class="rail-count">{{filteredCount(program.id).toString().padStart(2,'0')}}</span></button>
        <div class="rail-block"><div class="rail-block-title">DATA SCOPE</div><div class="rail-block-value"><span class="ws-signal"></span> PUBLIC / REVIEWED</div><p>{{tr('公开页面仅读取独立的脱敏数据模型，不能直接读取内部仓库。','Public pages must use an independent reviewed feed, never internal repository access.')}}</p></div>
        <div class="rail-bottom"><span>INDEX REV. 004</span><span>PROTORHEXIS</span></div>
        </div>
      </aside>

      <div class="ws-primary">
        <div class="ws-view-toolbar"><div class="ws-view-state"><span class="ws-mini-square"></span><span>{{activeProgram==='all' ? 'ALL PROGRAMS' : activeProgram}}</span><span class="v-divider">/</span><span>{{totalCount.toString().padStart(2,'0')}} {{view==='activity'?'EVENTS':view==='changelog'?'RELEASES':'ENTRIES'}}</span></div>
          <div v-if="view==='schedule'" class="ws-view-sub">{{rangeLabel}} <span class="v-divider">·</span> {{tr('拖动空白处平移 · 只读','Drag empty track to pan · read-only')}}</div>
          <div v-else-if="view==='board'" class="ws-view-sub">{{tr('状态代表公开交付阶段','PUBLIC DELIVERY STAGES')}}</div>
          <div v-else-if="view==='activity'" class="ws-view-sub">{{tr('按时间倒序排列','NEWEST FIRST')}}</div>
          <div v-else class="ws-view-sub">{{tr('版本与变更记录','RELEASES & CHANGES')}}</div>
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
            <div class="gantt-canvas" :style="{'--tick-count':unitCount,'--gantt-label-width':`${labelWidth}px`,'--gantt-masked-height':`${ganttLayout.height}px`,minWidth:`${gridMinWidth}px`}"><div class="gantt-label-mask" aria-hidden="true"></div>
              <div class="gantt-head"><div class="gantt-head-name"><strong>{{tr('工作项 / 交付物','WORK PACKAGE / DELIVERABLE')}}</strong><small>WBS INDEX</small></div><div class="gantt-axis"><span v-for="(tick,i) in ticks" :key="i" :style="{width:`${tick.width}%`,flex:`0 0 ${tick.width}%`}">{{tick.label}}</span></div></div>
              <svg v-if="showDependencies && dependencyEdges.length" class="gantt-dependency-layer" :viewBox="`0 0 ${trackWidth} ${ganttLayout.height}`" :style="{height:`${ganttLayout.height}px`}" preserveAspectRatio="none" aria-hidden="true">
                <defs><marker id="dep-arrow" markerUnits="userSpaceOnUse" viewBox="0 0 10 8" refX="1" refY="4" markerWidth="10" markerHeight="8" orient="auto"><path d="M1 1 L9 4 L1 7 Z" fill="#777781"/></marker><marker id="dep-arrow-active" markerUnits="userSpaceOnUse" viewBox="0 0 10 8" refX="1" refY="4" markerWidth="10" markerHeight="8" orient="auto"><path d="M1 1 L9 4 L1 7 Z" fill="#ff453a"/></marker></defs>
                <path v-for="trunk in dependencyTrunks" :key="`trunk-${trunk.key}`" class="gantt-dependency-trunk" :data-dependency-trunk="trunk.key" :class="{active:trunk.active}" :d="trunk.d" />
                <path v-for="edge in dependencyEdges" :key="edge.key" :data-dependency-key="edge.key" :d="edge.d" :class="{active:edge.active}" :marker-end="edge.active?'url(#dep-arrow-active)':'url(#dep-arrow)'"/>
              </svg>
              <template v-for="group in grouped" :key="group.id">
                <button class="gantt-group" type="button" @click="toggleGroup(group.id)" :aria-expanded="groupExpanded(group.id)"><span class="gantt-group-name"><span class="chevron" :class="{collapsed:!groupExpanded(group.id)}"><EngineeringIcon name="gantt-chevron" /></span><strong>{{group.id}}</strong><small>{{tr(group.zh,group.en)}}</small></span><span class="gantt-group-suffix">{{group.items.length}} {{tr('个工作项','WORK ITEMS')}}</span></button>
                <template v-if="groupExpanded(group.id)"><div v-for="item in group.items" :key="item.id" class="gantt-row" :class="{selected:selectedId===item.id}"><button class="gantt-item-name" :data-item-id="item.id" @click="focusItem(item.id)"><small>{{item.id}} <span>·</span> {{streamName(item.stream)}}</small><strong>{{tr(item.titleZh,item.titleEn)}}</strong></button><div class="gantt-track"><span v-for="(tick,i) in ticks" :key="i" class="gantt-gridline" :style="{left:`${tick.left}%`}"></span><span v-if="currentLine" class="gantt-today" :style="{left:currentLine}"></span><button v-if="!durationPositions[item.id].hidden" class="gantt-bar" :data-gantt-id="item.id" :class="[item.stage,{selected:selectedId===item.id,related:focusedId===item.id}]" @pointerenter="hoveredId=item.id" @pointerleave="hoveredId=null" :aria-pressed="selectedId===item.id" :aria-label="`${item.id} · ${tr(item.titleZh,item.titleEn)} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · ${stageName(item.stage)}`" :style="{left:durationPositions[item.id].left,width:durationPositions[item.id].width}" :title="`${item.id} · ${fmtDate(item.start)} – ${fmtDate(item.end)} · PUBLIC RECORD`" @click="select(item.id)"><span>{{item.id}}</span></button><span v-if="!item.start || !item.end" class="gantt-undated">{{tr('未安排公开时间','NO PUBLIC DATE')}}</span></div></div></template>
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
          <div ref="boardViewport" class="ws-board-viewport" tabindex="0" @scroll.passive="syncBoardScroll" :aria-label="tr('可横向滚动的交付看板','Scrollable release board')"><RoadmapBoardLanes :items="visibleItems" :selected-id="selectedId" :reduced-motion="reducedMotion" :tr="tr" @select="select" />
        </div>
        </template>

        <div v-else-if="view==='activity'" ref="activityViewport" class="ws-activity"><div class="activity-filters"><span>{{tr('事件类型','EVENT TYPE')}}</span><div class="ws-toolset"><button v-for="kind in eventKinds" :key="kind" :class="{current:eventKind===kind}" @click="eventKind=kind">{{kind==='all'?tr('全部','ALL'):eventName(kind)}}</button></div></div><RoadmapActivityStream :events="visibleEvents" :selected-id="selectedId" :tr="tr" @select="select" /></div>

        <div v-else ref="changelogViewport" class="ws-activity ws-changelog">
          <div class="activity-filters changelog-filters">
            <label>{{tr('发布渠道','CHANNEL')}} <select v-model="channelFilter"><option value="all">{{tr('全部','ALL')}}</option><option v-for="channel in channels" :key="channel" :value="channel">{{channel}}</option></select></label>
            <label>{{tr('变更类型','CHANGE KIND')}} <select v-model="changeFilter"><option value="all">{{tr('全部','ALL')}}</option><option v-for="kind in changeKinds" :key="kind" :value="kind">{{changeLabel(kind,tr)}}</option></select></label>
          </div>
          <RoadmapChangelog :releases="visibleReleases" :selected-id="selectedId" :tr="tr" @select="select" />
        </div>
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
        <ReleaseDetails v-if="view==='changelog' && chosenRelease" :release="chosenRelease" :tr="tr" />
        <RoadmapInspectorDetails v-else-if="view!=='changelog'" :view="view" :chosen-item="chosenItem" :chosen-event="chosenEvent" :dependents="dependents" :tr="tr" @focus="focusItem" />
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
