/** Pure UTC calendar and edge geometry for the public, read-only roadmap. */
export type Scale = 'month' | 'quarter';
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
 * The sole public-roadmap dependency router (formerly route B).
 * A finish-before-start dependency uses a shared right-hand source trunk.
 * For overlapping schedules, a short exit from the SOURCE BAR EDGE avoids
 * forcing a large U-turn around the bar's far-right endpoint. These cases are
 * common in the SYNTHETIC demo and must not visually resemble loop arrows.
 *
 * Every target receives a positive-X final segment, with the SVG marker
 * ending 6px before its left edge. Geometry is focus-independent.
 */
type Point = { x: number; y: number };
type Rect = { start: number; end: number; y: number };
const round = (n: number) => Number(n.toFixed(1));
const fmt = (n: number) => round(n).toFixed(1);
const clamp = (n:number,lo:number,hi:number) => Math.max(lo, Math.min(hi, n));

function orthogonalPath(points: Point[], radius=5): string {
  // Remove zero-length AND collinear internal points before rounding corners:
  // unneeded micro-elbows are responsible for many near-circular artifacts.
  const clean: Point[] = [];
  for (const p of points) {
    const last = clean.at(-1);
    if (last && Math.hypot(last.x-p.x,last.y-p.y)<.05) continue;
    clean.push(p);
    while (clean.length>=3) {
      const [a,b,c]=clean.slice(-3);
      if ((Math.abs(a.x-b.x)<.05 && Math.abs(b.x-c.x)<.05) ||
          (Math.abs(a.y-b.y)<.05 && Math.abs(b.y-c.y)<.05)) clean.splice(-2,1);
      else break;
    }
  }
  if(clean.length<2)return '';
  let d=`M ${fmt(clean[0].x)} ${fmt(clean[0].y)}`;
  for(let i=1;i<clean.length-1;i++) {
    const a=clean[i-1],b=clean[i],c=clean[i+1];
    const inLen=Math.hypot(b.x-a.x,b.y-a.y),outLen=Math.hypot(c.x-b.x,c.y-b.y);
    const r=Math.min(radius,inLen/3,outLen/3);
    const ux=(b.x-a.x)/inLen,uy=(b.y-a.y)/inLen;
    const vx=(c.x-b.x)/outLen,vy=(c.y-b.y)/outLen;
    if(!Number.isFinite(r)||r<.5||Math.abs(ux*vx+uy*vy)>.01){d+=` L ${fmt(b.x)} ${fmt(b.y)}`;continue;}
    d+=` L ${fmt(b.x-ux*r)} ${fmt(b.y-uy*r)} Q ${fmt(b.x)} ${fmt(b.y)} ${fmt(b.x+vx*r)} ${fmt(b.y+vy*r)}`;
  }
  const end=clean.at(-1)!;
  return d+` L ${fmt(end.x)} ${fmt(end.y)}`;
}

/**
 * Route through one free x-lane per intermediate bar row. Horizontal lane
 * changes occur ONLY in gaps between rows (outside their 26px bar boxes).
 * A bounded dynamic program minimizes sideways distance + unnecessary turns;
 * no giant left-edge gutter is chosen just because one row has a blocker.
 */
function overlappingRoute(source: Rect, target: Rect, tipX:number,
  all: Map<string,Rect>, from:string, to:string): {points:Point[],laneX:number} {
  const direction=target.y>source.y?1:-1;
  const entryX=tipX-24;
  const startX=clamp(entryX,source.start+16,source.end-16);
  const middle=[...all.entries()]
    .filter(([id,r])=>id!==from&&id!==to&&direction*(r.y-source.y)>0&&direction*(target.y-r.y)>0)
    .map(([,r])=>r).sort((a,b)=>direction*(a.y-b.y));
  const candidates=[startX,entryX,...middle.flatMap(r=>[r.start-18,r.end+18])]
    .filter(x=>x>=8 && x<=Math.max(8,tipX+250))
    .map(round).filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b);
  // Normally candidate set is < 30; never search pixels or loop indefinitely.
  const layers:Map<number,{cost:number,prev:number|null}>[]=[];
  let prior=new Map<number,{cost:number,prev:number|null}>([[round(startX),{cost:0,prev:null}]]);
  for(const rect of middle){
    const next=new Map<number,{cost:number,prev:number|null}>();
    for(const x of candidates){
      if(x>=rect.start-13.5 && x<=rect.end+13.5) continue;
      let winner:{cost:number,prev:number|null}|undefined;
      for(const [px,state] of prior){
        const cost=state.cost+Math.abs(x-px)+(Math.abs(x-px)>1?13:0);
        if(!winner||cost<winner.cost-.001||(Math.abs(cost-winner.cost)<.001&&Math.abs(x-entryX)<Math.abs((winner.prev??0)-entryX)))
          winner={cost,prev:px};
      }
      if(winner)next.set(x,winner);
    }
    // In a fully blocked row (should not occur on a wide timeline), bail out
    // to the closest unclipped left or right lane without an infinite search.
    if(!next.size){
      const x=round(Math.max(8,rect.start-18));
      const [px,state]=[...prior].sort((a,b)=>Math.abs(a[0]-x)-Math.abs(b[0]-x))[0];
      next.set(x,{cost:state.cost+Math.abs(x-px)+13,prev:px});
    }
    layers.push(next); prior=next;
  }
  let currentX=round(entryX);
  const chosen:number[]=[];
  for(let i=layers.length-1;i>=0;i--){
    const state=[...layers[i]].sort((a,b)=>
      a[1].cost+Math.abs(a[0]-currentX)-(b[1].cost+Math.abs(b[0]-currentX)))[0];
    // When unwinding, a chosen intermediate x must match its predecessor
    // in the preceding layer; reconstruct from the final optimal state below.
    if(i===layers.length-1){
      chosen[i]=state[0];
    }else{
      chosen[i]=layers[i+1].get(chosen[i+1])!.prev!;
    }
    currentX=chosen[i];
  }
  const sourceEdgeY=source.y+direction*13; // exact top/bottom of 26px task bar
  const points:Point[]=[{x:startX,y:sourceEdgeY}];
  let priorX=startX,priorY=source.y;
  for(let i=0;i<=middle.length;i++){
    const nextY=i<middle.length?middle[i].y:target.y;
    const nextX=i<middle.length?chosen[i]:entryX;
    if(Math.abs(nextX-priorX)>.05){
      const gutterY=(priorY+nextY)/2;
      points.push({x:priorX,y:gutterY},{x:nextX,y:gutterY});
    }
    points.push({x:nextX,y:nextY});
    priorX=nextX;priorY=nextY;
  }
  points.push({x:tipX,y:target.y});
  return {points,laneX:round(chosen.at(-1)??startX)};
}

export function dependencyPaths<T extends GanttItem>(
  groups:GanttGroup<T>[],expanded:Record<string,boolean>,range:CalendarWindow,
  trackWidth:number,focusedId:string|null
):Edge[] {
  if(!Number.isFinite(trackWidth)||trackWidth<=0)return [];
  const {centers}=visibleRows(groups,expanded);
  const items=new Map(groups.flatMap(g=>g.items.map(i=>[i.id,i] as const)));
  const visible=new Map<string,Rect>();
  for(const item of items.values()) {
    const y=centers.get(item.id),bar=barPosition(item,range);
    if(y!==undefined&&!bar.hidden)visible.set(item.id,{start:bar.left/100*trackWidth,end:bar.right/100*trackWidth,y});
  }
  type Proposed={from:string,to:string,source:Rect,target:Rect};
  const proposed:Proposed[]=[];
  for(const item of items.values()) {
    const target=visible.get(item.id);
    if(!target||target.start<28)continue;
    for(const dep of item.deps){
      const source=visible.get(dep);
      if(source&&dep!==item.id&&source.y!==target.y)proposed.push({from:dep,to:item.id,source,target});
    }
  }
  proposed.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const arrivals=new Map<string,number>(),departures=new Map<string,number>();
  const edges:Edge[]=[];
  for(const edge of proposed) {
    const inbound=arrivals.get(edge.to)||0,outbound=departures.get(edge.from)||0;
    arrivals.set(edge.to,inbound+1);departures.set(edge.from,outbound+1);
    const {source,target}=edge,tipX=target.start-6;
    const ty=target.y+(inbound%3-1)*5;
    let d='',trunk:string|undefined,laneX=0;
    // A short finish-before-start gap supports the ordinary right-exit trunk.
    // All overlapping/nearby bars use an edge exit instead of the giant U.
    if(tipX-source.end>=54 && source.end<=trackWidth-28) {
      const trunkX=source.end+22;
      trunk=`M ${fmt(source.end)} ${fmt(source.y)} H ${fmt(trunkX)}`;
      const minLane=trunkX+12,maxLane=tipX-17;
      const preferred=trunkX+(maxLane-trunkX)*.56+outbound*12-inbound*5;
      const blockers=[...visible.entries()].filter(([id,r])=>id!==edge.from&&id!==edge.to&&
        r.y>Math.min(source.y,target.y)&&r.y<Math.max(source.y,target.y))
        .map(([,r])=>({left:r.start-14,right:r.end+14}));
      laneX=chooseFreeLane(preferred,minLane,maxLane,blockers);
      d=orthogonalPath([{x:trunkX,y:source.y},{x:laneX,y:source.y},
        {x:laneX,y:ty},{x:tipX,y:ty}]);
    }else{
      const routed=overlappingRoute(source,{...target,y:ty},tipX,visible,edge.from,edge.to);
      laneX=routed.laneX;
      d=orthogonalPath(routed.points);
    }
    if(d)edges.push({key:`${edge.from}>${edge.to}`,from:edge.from,to:edge.to,
      d,trunk,laneX:round(laneX),active:focusedId===edge.from||focusedId===edge.to});
  }
  return edges;
}

function chooseFreeLane(preferred:number,min:number,max:number,blockers:{left:number;right:number}[]):number {
  if(max<=min)return min;
  const candidate=clamp(preferred,min,max);
  const occupied=(x:number)=>blockers.some(r=>x>=r.left&&x<=r.right);
  if(!occupied(candidate))return candidate;
  for(let shift=8;shift<=max-min+8;shift+=8){
    const left=clamp(candidate-shift,min,max),right=clamp(candidate+shift,min,max);
    if(!occupied(left))return left;
    if(!occupied(right))return right;
  }
  return candidate;
}
