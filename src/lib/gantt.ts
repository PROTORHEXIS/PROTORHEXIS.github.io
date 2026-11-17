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
 * One production dependency router. A relationship always departs to the RIGHT
 * of the predecessor and arrives from the LEFT of the successor, even for
 * overlapping dates. Overlap is not a reason to change attachment ports.
 *
 * Route search is a finite rectilinear visibility graph. A Dijkstra state
 * includes the previous heading and minimizes (bend count, distance) in
 * lexicographic order. Its nodes are formed from the two fixed ports and
 * obstacle boundaries. Edges crossing any padded task bar are forbidden.
 *
 * Marker geometry: branch stroke stops ARROW_LENGTH pixels BEFORE its actual
 * arrow tip. The marker is anchored at the stroke endpoint and extends
 * ARROW_LENGTH pixels forward; its tip stops TIP_GAP short of the target bar.
 */
type Point = {x:number; y:number};
type Rect = {start:number; end:number; y:number};
export const ARROW_LENGTH = 8;
export const TIP_GAP = 6;
const EXIT_LENGTH = 14;
const BOX_PADDING_X = 7;
const BOX_PADDING_Y = 19;
const round = (n:number) => Number(n.toFixed(1));
const fmt = (n:number) => round(n).toFixed(1);
const almost = (a:number,b:number) => Math.abs(a-b)<.05;

type Bounds = {left:number;right:number;top:number;bottom:number};
function paddedBoxes(rects:Iterable<Rect>):Bounds[] {
  return [...rects].map(r=>({
    left:r.start-BOX_PADDING_X,right:r.end+BOX_PADDING_X,
    top:r.y-BOX_PADDING_Y,bottom:r.y+BOX_PADDING_Y
  }));
}
function inside(p:Point,box:Bounds):boolean {
  return p.x>box.left+.01&&p.x<box.right-.01&&p.y>box.top+.01&&p.y<box.bottom-.01;
}
function segmentIntersects(a:Point,b:Point,box:Bounds):boolean {
  if(almost(a.y,b.y))return a.y>box.top+.01&&a.y<box.bottom-.01 &&
    Math.max(a.x,b.x)>box.left+.01&&Math.min(a.x,b.x)<box.right-.01;
  if(almost(a.x,b.x))return a.x>box.left+.01&&a.x<box.right-.01 &&
    Math.max(a.y,b.y)>box.top+.01&&Math.min(a.y,b.y)<box.bottom-.01;
  return true;
}

/** In-place orthogonal simplification; corners are gently rounded only after routing. */
function orthogonalPath(points:Point[],radius=4):string {
  const clean:Point[]=[];
  for(const p of points) {
    if(clean.length&&almost(clean.at(-1)!.x,p.x)&&almost(clean.at(-1)!.y,p.y))continue;
    clean.push(p);
    while(clean.length>=3) {
      const [a,b,c]=clean.slice(-3);
      if((almost(a.x,b.x)&&almost(b.x,c.x))||(almost(a.y,b.y)&&almost(b.y,c.y)))clean.splice(-2,1);
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
    if(!Number.isFinite(r)||r<.5||Math.abs(ux*vx+uy*vy)>.01) {d+=` L ${fmt(b.x)} ${fmt(b.y)}`;continue;}
    d+=` L ${fmt(b.x-ux*r)} ${fmt(b.y-uy*r)} Q ${fmt(b.x)} ${fmt(b.y)} ${fmt(b.x+vx*r)} ${fmt(b.y+vy*r)}`;
  }
  const end=clean.at(-1)!;
  return d+` L ${fmt(end.x)} ${fmt(end.y)}`;
}

/** A binary heap, ordered by bend count FIRST, then route length. */
type State={node:number;dir:number;bends:number;length:number};
function better(a:Pick<State,'bends'|'length'>,b:Pick<State,'bends'|'length'>):boolean {
  return a.bends<b.bends||(a.bends===b.bends&&a.length<b.length-1e-6);
}
class Heap {
  private q:State[]=[];
  push(s:State) {
    const q=this.q;q.push(s);let i=q.length-1;
    while(i>0){const parent=(i-1)>>1;if(!better(q[i],q[parent]))break;[q[i],q[parent]]=[q[parent],q[i]];i=parent;}
  }
  pop():State|undefined {
    const q=this.q;if(!q.length)return;
    const top=q[0],last=q.pop()!;
    if(q.length){q[0]=last;let i=0;while(true){let l=i*2+1,r=l+1,best=i;
      if(l<q.length&&better(q[l],q[best]))best=l;
      if(r<q.length&&better(q[r],q[best]))best=r;
      if(best===i)break;[q[i],q[best]]=[q[best],q[i]];i=best;
    }}return top;
  }
  get size(){return this.q.length;}
}

const EAST=0,SOUTH=1,WEST=2,NORTH=3;
function findRoute(start:Point,end:Point,boxes:Bounds[],width:number,detour:number):Point[]|null {
  // Search locally first. A fewer-bend route that circles the entire chart
  // is less legible than a compact route with one additional turn.
  const minX=Math.max(9,Math.min(start.x,end.x)-detour);
  const maxX=Math.min(width-8,Math.max(start.x,end.x)+detour);
  const xs=[start.x,end.x,end.x-14,Math.max(9,end.x-28),Math.max(9,start.x-14),minX,maxX];
  const ys=[start.y,end.y];
  for(const b of boxes){
    xs.push(b.left,b.right);
    ys.push(b.top,b.bottom);
  }
  const xvals=[...new Set(xs.filter(x=>x>=minX-.01&&x<=maxX+.01).map(round))].sort((a,b)=>a-b);
  const yvals=[...new Set(ys.filter(y=>y>=9).map(round))].sort((a,b)=>a-b);
  const nx=xvals.length,ny=yvals.length;
  const si=xvals.findIndex(x=>almost(x,start.x)),sj=yvals.findIndex(y=>almost(y,start.y));
  const ti=xvals.findIndex(x=>almost(x,end.x)),tj=yvals.findIndex(y=>almost(y,end.y));
  if(si<0||sj<0||ti<0||tj<0)return null;
  const total=nx*ny,valid=new Uint8Array(total);
  const point=(id:number):Point=>({x:xvals[id%nx],y:yvals[Math.floor(id/nx)]});
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const id=j*nx+i;valid[id]=boxes.some(b=>inside(point(id),b))?0:1;
  }
  const begin=sj*nx+si,goal=tj*nx+ti;
  if(!valid[begin]||!valid[goal])return null;
  const weights=total*4,bends=new Int16Array(weights).fill(32767),lengths=new Float64Array(weights).fill(Infinity);
  const predecessors=new Int32Array(weights).fill(-1);
  // Route starts immediately AFTER the shared right-facing exit trunk.
  const startState=begin*4+EAST;
  bends[startState]=0;lengths[startState]=0;
  const heap=new Heap();heap.push({node:begin,dir:EAST,bends:0,length:0});
  let final=-1;
  while(heap.size){
    const s=heap.pop()!,key=s.node*4+s.dir;
    if(s.bends!==bends[key]||s.length>lengths[key]+1e-6)continue;
    // The final approach must be eastward into the target's LEFT attachment.
    if(s.node===goal&&s.dir===EAST){final=key;break;}
    const j=Math.floor(s.node/nx),i=s.node%nx,a=point(s.node);
    const neighbours:[number,number][]=[];
    if(i+1<nx)neighbours.push([s.node+1,EAST]);
    if(j+1<ny)neighbours.push([s.node+nx,SOUTH]);
    if(i>0)neighbours.push([s.node-1,WEST]);
    if(j>0)neighbours.push([s.node-nx,NORTH]);
    for(const [next,dir] of neighbours){
      if(!valid[next])continue;
      const b=point(next);
      if(boxes.some(box=>segmentIntersects(a,b,box)))continue;
      const key2=next*4+dir,bb=s.bends+(dir===s.dir?0:1),ll=s.length+Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
      if(bb<bends[key2]||(bb===bends[key2]&&ll<lengths[key2]-1e-6)){
        bends[key2]=bb;lengths[key2]=ll;predecessors[key2]=key;
        heap.push({node:next,dir,bends:bb,length:ll});
      }
    }
  }
  if(final<0)return null;
  const ids:number[]=[];
  for(let state=final;state>=0;state=predecessors[state])ids.push(Math.floor(state/4));
  return ids.reverse().map(point);
}

export function dependencyPaths<T extends GanttItem>(
  groups:GanttGroup<T>[],expanded:Record<string,boolean>,range:CalendarWindow,
  trackWidth:number,focusedId:string|null
):Edge[] {
  if(!Number.isFinite(trackWidth)||trackWidth<=0)return [];
  const {centers}=visibleRows(groups,expanded);
  const items=new Map(groups.flatMap(g=>g.items.map(i=>[i.id,i] as const)));
  const visible=new Map<string,Rect>();
  for(const item of items.values()){
    const y=centers.get(item.id),bar=barPosition(item,range);
    if(y!==undefined&&!bar.hidden)visible.set(item.id,{start:bar.left/100*trackWidth,end:bar.right/100*trackWidth,y});
  }
  const boxes=paddedBoxes(visible.values());
  const proposed:{from:string;to:string;source:Rect;target:Rect}[]=[];
  for(const item of items.values()) {
    const target=visible.get(item.id);
    if(!target||target.start<TIP_GAP+ARROW_LENGTH+16)continue;
    for(const dep of item.deps){
      const source=visible.get(dep);
      if(source&&dep!==item.id&&source.y!==target.y)
        proposed.push({from:dep,to:item.id,source,target});
    }
  }
  proposed.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const inboundCounts=new Map<string,number>(),edges:Edge[]=[];
  for(const e of proposed){
    const inbound=inboundCounts.get(e.to)||0;inboundCounts.set(e.to,inbound+1);
    const {source,target}=e;
    const exitX=round(source.end+EXIT_LENGTH);
    const markerTipX=target.start-TIP_GAP;
    const strokeEndX=round(markerTipX-ARROW_LENGTH);
    if(exitX>trackWidth-8||strokeEndX<10)continue;
    const targetY=round(target.y+(inbound%3-1)*4);
    const start={x:exitX,y:source.y},end={x:strokeEndX,y:targetY};
    // Widen the search only if no bounded collision-free route exists.
    // Within each bound, choose minimum bends first and length second.
    const routed=[150,240,400,trackWidth].reduce<Point[]|null>(
      (found,detour)=>found??findRoute(start,end,boxes,trackWidth,detour),null);
    // Do not render a misleading straight-line fallback through obstacles.
    if(!routed)continue;
    const trunk=`M ${fmt(source.end)} ${fmt(source.y)} H ${fmt(exitX)}`;
    const d=orthogonalPath(routed);
    if(!d)continue;
    edges.push({key:`${e.from}>${e.to}`,from:e.from,to:e.to,d,trunk,
      active:focusedId===e.from||focusedId===e.to});
  }
  return edges;
}
