/** Pure UTC calendar and edge geometry for the public, read-only roadmap. */
export type Scale = 'month' | 'quarter';
export type RouteMode = 'standard' | 'optimized';
export interface CalendarWindow { startMonth: string; months: number; }
export interface Tick { label: string; left: number; width: number; start: number; end: number; }
export interface Bar { hidden: boolean; left: number; width: number; right: number; }
export interface GanttItem { id: string; start: string; end: string; deps: string[]; }
export interface GanttGroup<T extends GanttItem> { id: string; items: T[]; }
export interface Edge { key: string; from: string; to: string; d: string; active: boolean; trunk?: string; laneX?: number; }
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

/**
 * Route A keeps conventional orthogonal connectors; Route B has a separate
 * source trunk and deterministic, obstacle-aware branch corridors. Routing
 * depends on the canonical item graph, not hover or selection, so geometry
 * remains stable when inspecting a dependency.
 */
/**
 * Route A keeps conventional orthogonal connectors; Route B has a separate
 * source trunk and deterministic, obstacle-aware branch corridors. Routing
 * depends on the canonical item graph, not hover or selection, so geometry
 * remains stable when inspecting a dependency.
 */
/**
 * Route A keeps conventional orthogonal connectors; Route B has a separate
 * source trunk and deterministic, obstacle-aware branch corridors. Routing
 * depends on the canonical item graph, not hover or selection, so geometry
 * remains stable when inspecting a dependency.
 */
export function dependencyPaths<T extends GanttItem>(
  groups: GanttGroup<T>[], expanded: Record<string, boolean>, range: CalendarWindow,
  trackWidth: number, focusedId: string | null, mode: RouteMode = 'standard'
): Edge[] {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return [];
  const { centers } = visibleRows(groups, expanded);
  const items = new Map(groups.flatMap(g => g.items.map(item => [item.id, item] as const)));
  type Rect = { start:number; end:number; y:number };
  const visible = new Map<string,Rect>();
  for (const item of items.values()) {
    const y = centers.get(item.id), bar = barPosition(item, range);
    if (y!==undefined && !bar.hidden) visible.set(item.id,{start:bar.left/100*trackWidth,end:bar.right/100*trackWidth,y});
  }
  type Proposed = {from:string;to:string;source:Rect;target:Rect};
  const proposed:Proposed[]=[];
  for (const item of items.values()) {
    const target=visible.get(item.id);
    if (!target || target.start<28) continue; // clipped left edge cannot accept an arrow
    for (const dep of item.deps) {
      const source=visible.get(dep);
      if (!source || dep===item.id || source.end>trackWidth-28 || source.y===target.y) continue;
      proposed.push({from:dep,to:item.id,source,target});
    }
  }
  proposed.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const arrivals=new Map<string,number>();
  const departures=new Map<string,number>();
  const edges:Edge[]=[];
  for(const edge of proposed) {
    const inbound=arrivals.get(edge.to)||0;
    const outbound=departures.get(edge.from)||0;
    arrivals.set(edge.to,inbound+1);
    departures.set(edge.from,outbound+1);
    const optimized=mode==='optimized';
    const sx=edge.source.end, sy=edge.source.y;
    const tx=edge.target.start, ty=edge.target.y+(optimized?(inbound%3-1)*5:0);
    const tipX=tx-6; // SVG marker tip (refX=8) exactly meets this terminal point
    const trunkX=sx+22;
    const overlap=tipX-sx<46;
    let points:Point[];
    let laneX:number;
    let trunk:string|undefined;

    if (!optimized) {
      // The A path remains bare orthogonal elbows with a deterministic gutter
      // bridge when a predecessor overlaps the successor in calendar time.
      if (!overlap) {
        laneX=Math.max(sx+14,Math.min(sx+18,tipX-16));
        points=[{x:sx,y:sy},{x:laneX,y:sy},{x:laneX,y:ty},{x:tipX,y:ty}];
      } else {
        const gutterY=sy+(ty>sy?31:-31);
        laneX=Math.max(8,Math.min(tx-24,tipX-14));
        points=[{x:sx,y:sy},{x:sx+18,y:sy},{x:sx+18,y:gutterY},
          {x:laneX,y:gutterY},{x:laneX,y:ty},{x:tipX,y:ty}];
      }
    } else {
      // B draws this segment ONCE per source (see unique trunks in Vue),
      // so multiple successor branches do not re-stroke the same exit.
      trunk=`M ${pathNumber(sx)} ${pathNumber(sy)} H ${pathNumber(trunkX)}`;
      if (!overlap && tipX>trunkX+26) {
        // Center-of-gap corridor is visibly different from A's near-source
        // dogleg. Stable fanout separates vertical channels by 12px.
        const minLane=trunkX+12, maxLane=tipX-17;
        const preferred=trunkX+(maxLane-trunkX)*0.56+outbound*12-inbound*5;
        const blockers=[...visible.entries()]
          .filter(([id,r])=>id!==edge.from&&id!==edge.to &&
            r.y>Math.min(sy,ty)&&r.y<Math.max(sy,ty))
          .map(([,r])=>({left:r.start-14,right:r.end+14}));
        laneX=chooseFreeLane(preferred,minLane,maxLane,blockers);
        points=[{x:trunkX,y:sy},{x:laneX,y:sy},{x:laneX,y:ty},{x:tipX,y:ty}];
      } else {
        // For overlapping schedules, keep the long horizontal run in the
        // inter-row gutter, not over another task bar, then enter from left.
        const gutterY=sy+(ty>sy?31:-31)+(outbound%3)*4*(ty>sy?1:-1);
        const minLane=8,maxLane=tipX-16;
        const preferred=tx-30-inbound*10-outbound*4;
        const blockers=[...visible.entries()]
          .filter(([id,r])=>id!==edge.from&&id!==edge.to&&
            r.y>Math.min(gutterY,ty)&&r.y<Math.max(gutterY,ty))
          .map(([,r])=>({left:r.start-14,right:r.end+14}));
        laneX=chooseFreeLane(preferred,minLane,maxLane,blockers);
        points=[{x:trunkX,y:sy},{x:trunkX,y:gutterY},
          {x:laneX,y:gutterY},{x:laneX,y:ty},{x:tipX,y:ty}];
      }
    }
    const d=orthogonalPath(points,optimized?6:0);
    if(d) edges.push({key:`${edge.from}>${edge.to}`,from:edge.from,to:edge.to,d,
      active:focusedId===edge.from||focusedId===edge.to,trunk,laneX:rounded(laneX)});
  }
  return edges;
}

function chooseFreeLane(preferred:number,min:number,max:number,blockers:{left:number;right:number}[]):number {
  if(max<=min) return min;
  const clamp=(v:number)=>Math.max(min,Math.min(max,v));
  const occupied=(x:number)=>blockers.some(r=>x>=r.left&&x<=r.right);
  const candidate=clamp(preferred);
  if(!occupied(candidate)) return candidate;
  // Search both sides in small, deterministic steps; never reposition links
  // in response to hover or focus, and never use unbounded retry loops.
  for(let shift=8;shift<=max-min+8;shift+=8){
    const left=clamp(candidate-shift),right=clamp(candidate+shift);
    if(!occupied(left)) return left;
    if(!occupied(right)) return right;
  }
  return candidate;
}
