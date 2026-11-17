/** Pure UTC calendar and edge geometry for the public, read-only roadmap. */
export type Scale = 'month' | 'quarter';
export type RouteMode = 'standard' | 'optimized';
export interface CalendarWindow { startMonth: string; months: number; }
export interface Tick { label: string; left: number; width: number; start: number; end: number; }
export interface Bar { hidden: boolean; left: number; width: number; right: number; }
export interface GanttItem { id: string; start: string; end: string; deps: string[]; }
export interface GanttGroup<T extends GanttItem> { id: string; items: T[]; }
export interface Edge { key: string; from: string; to: string; d: string; active: boolean; }
const DAY = 86_400_000;

export function monthIndex(month: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, mm] = month.split('-').map(Number);
  return year * 12 + mm - 1;
}
export function monthString(index: number): string {
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}
export function monthMs(index: number): number {
  const m = monthString(index);
  return Date.parse(`${m}-01T00:00:00Z`);
}
export function validateWindow(startMonth: string, endMonthInclusive: string, maxMonths = 36): CalendarWindow {
  const start = monthIndex(startMonth), end = monthIndex(endMonthInclusive);
  if (end < start) throw new Error('End date is earlier than start date');
  if (end - start + 1 > maxMonths) throw new Error(`Maximum range is ${maxMonths} months`);
  return { startMonth, months: end - start + 1 };
}
export function windowEnds(range: CalendarWindow): { start: number; end: number } {
  if (!Number.isInteger(range.months) || range.months < 1 || range.months > 36) throw new Error('Invalid window length');
  const idx = monthIndex(range.startMonth);
  return { start: monthMs(idx), end: monthMs(idx + range.months) };
}
export function axisTicks(range: CalendarWindow, scale: Scale): Tick[] {
  const base = monthIndex(range.startMonth);
  const bounds = windowEnds(range);
  const ticks: Tick[] = [];
  for (let i = 0; i < range.months;) {
    const ix = base + i;
    const step = scale === 'month' ? 1 : Math.min(3 - ((ix % 3 + 3) % 3), range.months - i);
    const endIx = ix + step;
    const date = new Date(monthMs(ix));
    const label = scale === 'month'
      ? `${date.getUTCFullYear()} / ${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      : `${date.getUTCFullYear()} / Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    const start = monthMs(ix), end = monthMs(endIx);
    ticks.push({ label, start, end, left: (start - bounds.start) / (bounds.end - bounds.start) * 100, width: (end - start) / (bounds.end - bounds.start) * 100 });
    i += step;
  }
  return ticks;
}
export function barPosition(item: Pick<GanttItem, 'start' | 'end'>, range: CalendarWindow): Bar {
  const { start, end } = windowEnds(range);
  const from = Date.parse(`${item.start}T00:00:00Z`);
  const to = Date.parse(`${item.end}T00:00:00Z`) + DAY; // inclusive public end date
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to <= start || from >= end)
    return { hidden: true, left: 0, width: 0, right: 0 };
  const clippedStart = Math.max(from, start), clippedEnd = Math.min(to, end);
  const left = (clippedStart - start) / (end - start) * 100;
  const right = (clippedEnd - start) / (end - start) * 100;
  return { hidden: false, left, right, width: right - left };
}
export function visibleRows<T extends GanttItem>(groups: GanttGroup<T>[], expanded: Record<string, boolean>, headerHeight = 56, groupHeight = 39, rowHeight = 62): { centers: Map<string, number>; height: number } {
  const centers = new Map<string, number>();
  let y = headerHeight;
  for (const group of groups) {
    y += groupHeight;
    if (expanded[group.id] !== false) {
      for (const item of group.items) { centers.set(item.id, y + rowHeight / 2); y += rowHeight; }
    }
  }
  return { centers, height: y };
}
/**
 * Consistent routing for dependency arrows. All arrowheads approach targets
 * from the LEFT with a positive-X final segment. The old 3-segment dogleg
 * reversed its last segment when predecessor/successor schedules overlapped,
 * producing the ring-shaped arrow seen in the browser.
 *
 * A — standard: orthogonal elbows and a clearance bridge when bars overlap.
 * B — optimized: stable per-edge channels, intermediate-bar avoidance and
 * subtly rounded corners. Both stay in the read-only Gantt SVG coordinate frame.
 */
type Point = { x: number; y: number };
const rounded = (n:number) => Number(n.toFixed(1));
const pathNumber = (n:number) => rounded(n).toFixed(1);

function orthogonalPath(points:Point[], radius = 0):string {
  const clean:Point[] = [];
  for (const p of points) {
    if (clean.length && Math.abs(clean[clean.length-1].x-p.x)<0.01 && Math.abs(clean[clean.length-1].y-p.y)<0.01) continue;
    clean.push(p);
  }
  if (clean.length < 2) return '';
  if (radius <= 0) {
    return `M ${pathNumber(clean[0].x)} ${pathNumber(clean[0].y)}` + clean.slice(1).map((p,i) =>
      Math.abs(p.y-clean[i].y)<0.01 ? ` H ${pathNumber(p.x)}` : ` V ${pathNumber(p.y)}`
    ).join('');
  }
  let d = `M ${pathNumber(clean[0].x)} ${pathNumber(clean[0].y)}`;
  for (let i=1;i<clean.length-1;i++) {
    const prev=clean[i-1],p=clean[i],next=clean[i+1];
    const inLen=Math.hypot(p.x-prev.x,p.y-prev.y), outLen=Math.hypot(next.x-p.x,next.y-p.y);
    // The incoming and outgoing straight portions stay nonzero even for short turns.
    const r=Math.min(radius,inLen/3,outLen/3);
    const ux=(p.x-prev.x)/inLen, uy=(p.y-prev.y)/inLen;
    const vx=(next.x-p.x)/outLen, vy=(next.y-p.y)/outLen;
    if (!Number.isFinite(r) || r<0.5 || Math.abs(ux*vx+uy*vy)>0.01) {
      d+=` L ${pathNumber(p.x)} ${pathNumber(p.y)}`;
      continue;
    }
    d+=` L ${pathNumber(p.x-ux*r)} ${pathNumber(p.y-uy*r)} Q ${pathNumber(p.x)} ${pathNumber(p.y)} ${pathNumber(p.x+vx*r)} ${pathNumber(p.y+vy*r)}`;
  }
  const end=clean[clean.length-1];
  return d+` L ${pathNumber(end.x)} ${pathNumber(end.y)}`;
}

export function dependencyPaths<T extends GanttItem>(
  groups: GanttGroup<T>[], expanded: Record<string, boolean>, range: CalendarWindow,
  trackWidth: number, focusedId: string | null, mode: RouteMode = 'standard'
): Edge[] {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return [];
  const { centers } = visibleRows(groups, expanded);
  const items = new Map(groups.flatMap(group => group.items.map(item => [item.id, item] as const)));
  const visible = new Map<string,{start:number;end:number;y:number}>();
  for(const item of items.values()) {
    const y=centers.get(item.id), bar=barPosition(item,range);
    if(y!==undefined && !bar.hidden) visible.set(item.id,{start:bar.left/100*trackWidth,end:bar.right/100*trackWidth,y});
  }
  const proposed:{from:string;to:string;source:{start:number;end:number;y:number};target:{start:number;end:number;y:number}}[]=[];
  for (const item of items.values()) {
    const target=visible.get(item.id);
    if (!target || target.start<28) continue; // no room to draw an arrow outside a left-clipped task
    for(const from of item.deps) {
      const source=visible.get(from);
      if(!source || from===item.id || source.end>trackWidth-12 || source.y===target.y) continue;
      proposed.push({from,to:item.id,source,target});
    }
  }
  // Stable channels are assigned independently from selection/hover state.
  proposed.sort((a,b)=>a.to.localeCompare(b.to)||a.from.localeCompare(b.from));
  const incoming=new Map<string,number>(),outgoing=new Map<string,number>();
  const edges:Edge[]=[];
  for(const e of proposed) {
    const sibling=incoming.get(e.to)||0;incoming.set(e.to,sibling+1);
    const sourceSibling=outgoing.get(e.from)||0;outgoing.set(e.from,sourceSibling+1);
    const optimized=mode==='optimized';
    const sourceY=e.source.y + (optimized ? (sourceSibling%3-1)*3 : 0);
    const targetY=e.target.y + (optimized ? (sibling%3-1)*5 : 0);
    const sx=e.source.end, tx=e.target.start;
    const arrowTip=tx-6;
    const exitGap=optimized ? 18+(sourceSibling%3)*5 : 18;
    const entryGap=optimized ? 24+(sibling%3)*7 : 24;
    const hasOverlap=arrowTip-sx<42;
    let points:Point[];
    if (!hasOverlap) {
      // One clean, forward-going entry. Optimized mode spreads multiple routes
      // and detours around a visible task between the two row centers.
      const corridor=Math.max(sx+14,Math.min(sx+exitGap+(optimized?(sibling%3)*6:0),arrowTip-17));
      const obstacles=optimized && [...visible.entries()].some(([id,v])=>id!==e.from&&id!==e.to&&
        v.y>Math.min(sourceY,targetY) && v.y<Math.max(sourceY,targetY) &&
        v.start-10<corridor && v.end+10>corridor);
      if(!obstacles) points=[{x:sx,y:sourceY},{x:corridor,y:sourceY},{x:corridor,y:targetY},{x:arrowTip,y:targetY}];
      else points=detourPoints(e,visible,sourceY,targetY,sx,arrowTip,exitGap,entryGap,true);
    } else points=detourPoints(e,visible,sourceY,targetY,sx,arrowTip,exitGap,entryGap,optimized);
    const d=orthogonalPath(points,optimized?6:0);
    if(d) edges.push({key:`${e.from}>${e.to}`,from:e.from,to:e.to,d,active:focusedId===e.from||focusedId===e.to});
  }
  return edges;
}

function detourPoints(
  e:{from:string;to:string;source:{start:number;end:number;y:number};target:{start:number;end:number;y:number}},
  visible:Map<string,{start:number;end:number;y:number}>,
  sourceY:number,targetY:number,sx:number,arrowTip:number,exitGap:number,entryGap:number,optimized:boolean
):Point[] {
  // Crossing the inter-row gutter avoids the source/target bar overlap.
  const down=targetY>sourceY;
  const bridgeY=e.source.y+(down?31:-31);
  let entryX=e.target.start-entryGap;
  if (optimized) {
    // Prefer a vertical lane outside the occupied ranges of intervening tasks.
    // Never place that lane to the RIGHT of the target entry.
    for(const [id,v] of visible) {
      if(id===e.from||id===e.to)continue;
      if(v.y>Math.min(bridgeY,targetY)&&v.y<Math.max(bridgeY,targetY))
        entryX=Math.min(entryX,v.start-14);
    }
  }
  entryX=Math.max(8,Math.min(entryX,arrowTip-14));
  return [
    {x:sx,y:sourceY}, {x:sx+exitGap,y:sourceY},
    {x:sx+exitGap,y:bridgeY}, {x:entryX,y:bridgeY},
    {x:entryX,y:targetY}, {x:arrowTip,y:targetY}
  ];
}
