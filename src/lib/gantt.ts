/** Pure UTC calendar and edge geometry for the public, read-only roadmap. */
export type Scale = 'month' | 'quarter';
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
export function dependencyPaths<T extends GanttItem>(groups: GanttGroup<T>[], expanded: Record<string, boolean>, range: CalendarWindow, trackWidth: number, focusedId: string | null): Edge[] {
  const { centers } = visibleRows(groups, expanded);
  const items = new Map(groups.flatMap(group => group.items.map(item => [item.id, item] as const)));
  const edges: Edge[] = [];
  for (const to of items.values()) {
    const toY = centers.get(to.id), toBar = barPosition(to, range);
    if (toY === undefined || toBar.hidden) continue;
    for (const depId of to.deps) {
      const from = items.get(depId), fromY = centers.get(depId);
      if (!from || fromY === undefined) continue;
      const fromBar = barPosition(from, range);
      if (fromBar.hidden) continue;
      const a = fromBar.right / 100 * trackWidth;
      const b = toBar.left / 100 * trackWidth;
      // A dogleg outside the start bar also works for overlapping schedules.
      const corridor = Math.min(trackWidth - 4, Math.max(a + 13, b - 15));
      const target = Math.max(1, b - 5);
      const d = `M ${a.toFixed(1)} ${fromY.toFixed(1)} H ${corridor.toFixed(1)} V ${toY.toFixed(1)} H ${target.toFixed(1)}`;
      edges.push({ key: `${depId}>${to.id}`, from: depId, to: to.id, d, active: focusedId === depId || focusedId === to.id });
    }
  }
  return edges;
}
