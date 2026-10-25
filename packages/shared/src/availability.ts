/**
 * Shared presentation helpers for the weekly availability overview shown to
 * helpers on web and mobile. Keeping the layout maths in one place guarantees
 * that both platforms render the same week at the same positions.
 */

export interface AvailabilityWeekday {
  /** 0 = Sunday … 6 = Saturday (matches helper_availabilities.day_of_week). */
  value: number;
  short: string;
  long: string;
}

/** Monday-first display order used by the weekly overview. */
export const AVAILABILITY_WEEKDAYS: readonly AvailabilityWeekday[] = [
  { value: 1, short: 'Mo', long: 'Montag' },
  { value: 2, short: 'Di', long: 'Dienstag' },
  { value: 3, short: 'Mi', long: 'Mittwoch' },
  { value: 4, short: 'Do', long: 'Donnerstag' },
  { value: 5, short: 'Fr', long: 'Freitag' },
  { value: 6, short: 'Sa', long: 'Samstag' },
  { value: 0, short: 'So', long: 'Sonntag' },
];

export function availabilityWeekday(dayOfWeek: number): AvailabilityWeekday | undefined {
  return AVAILABILITY_WEEKDAYS.find((day) => day.value === dayOfWeek);
}

export function availabilityWeekdayLabel(
  dayOfWeek: number,
  format: 'long' | 'short' = 'long'
): string {
  return availabilityWeekday(dayOfWeek)?.[format] ?? '–';
}

/** "09:30" or "09:30:00" → minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [hoursPart = '0', minutesPart = '0'] = value.split(':');
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.min(24 * 60, Math.max(0, hours * 60 + minutes));
}

/** Minutes since midnight → "HH:MM"; 1440 → "24:00". */
export function minutesToTime(minutes: number): string {
  const clamped = Math.min(24 * 60, Math.max(0, Math.round(minutes)));
  if (clamped === 24 * 60) return '24:00';
  const hours = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const rest = (clamped % 60).toString().padStart(2, '0');
  return `${hours}:${rest}`;
}

export function formatAvailabilityTime(value: string): string {
  return value.slice(0, 5);
}

export function formatAvailabilityRange(start: string, end: string): string {
  return `${formatAvailabilityTime(start)}–${formatAvailabilityTime(end)} Uhr`;
}

/** Availability editing snaps to half-hour steps in the weekly grid. */
export const AVAILABILITY_SNAP_MINUTES = 30;

/** Rounds minutes to the nearest half hour and clamps them to one day. */
export function snapAvailabilityMinutes(minutes: number): number {
  const step = AVAILABILITY_SNAP_MINUTES;
  return Math.min(24 * 60, Math.max(0, Math.round(minutes / step) * step));
}

export interface AvailabilityMinuteRange {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Turns a pointer gesture (anchor + current position) into a valid range of at
 * least 30 minutes. Dragging up/left works just like dragging down/right.
 */
export function normalizeAvailabilityRange(
  anchorMinutes: number,
  currentMinutes: number
): AvailabilityMinuteRange {
  const anchor = snapAvailabilityMinutes(anchorMinutes);
  const current = snapAvailabilityMinutes(currentMinutes);
  const startMinutes = Math.min(anchor, current);
  const endMinutes = Math.max(anchor, current);
  if (endMinutes - startMinutes >= AVAILABILITY_SNAP_MINUTES) {
    return { startMinutes, endMinutes };
  }
  const start = Math.min(startMinutes, 24 * 60 - AVAILABILITY_SNAP_MINUTES);
  return { startMinutes: start, endMinutes: start + AVAILABILITY_SNAP_MINUTES };
}

/** Moves an existing range by a delta while keeping its duration. */
export function shiftAvailabilityRange(
  startMinutes: number,
  endMinutes: number,
  deltaMinutes: number
): AvailabilityMinuteRange {
  const duration = Math.max(AVAILABILITY_SNAP_MINUTES, endMinutes - startMinutes);
  const start = Math.min(
    24 * 60 - duration,
    Math.max(0, snapAvailabilityMinutes(startMinutes + deltaMinutes))
  );
  return { startMinutes: start, endMinutes: start + duration };
}

/** Rounded down to whole hours so the week graph starts on a clean tick. */
function floorToHour(minutes: number): number {
  return Math.floor(minutes / 60) * 60;
}

function ceilToHour(minutes: number): number {
  return Math.ceil(minutes / 60) * 60;
}

export interface AvailabilitySlotLike {
  /** The slot id only needs to be unique within the given list. */
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean | null;
}

export interface AvailabilityBlock<T extends AvailabilitySlotLike> {
  slot: T;
  startMinutes: number;
  endMinutes: number;
  /** Position inside the overlapping cluster (0-based). */
  lane: number;
  /** Number of parallel lanes needed by the cluster. */
  lanes: number;
  isActive: boolean;
}

export interface AvailabilityDay<T extends AvailabilitySlotLike> {
  dayOfWeek: number;
  short: string;
  long: string;
  blocks: AvailabilityBlock<T>[];
  /** Union of active minutes for this weekday (overlaps counted once). */
  totalMinutes: number;
}

export interface AvailabilityHourTick {
  minutes: number;
  label: string;
}

export interface AvailabilityWeek<T extends AvailabilitySlotLike> {
  startMinutes: number;
  endMinutes: number;
  hourTicks: AvailabilityHourTick[];
  days: AvailabilityDay<T>[];
  /** Union of active minutes across the week (overlaps counted once). */
  totalMinutes: number;
}

/**
 * Assigns overlapping slots of one day to parallel lanes. Non-overlapping
 * clusters restart at lane 0, so blocks never get needlessly narrow.
 */
export function layoutAvailabilityDay<T extends AvailabilitySlotLike>(
  slots: readonly T[]
): AvailabilityBlock<T>[] {
  const sorted = slots
    .map((slot) => {
      const startMinutes = timeToMinutes(slot.start_time);
      const endMinutes = Math.max(startMinutes, timeToMinutes(slot.end_time));
      return { slot, startMinutes, endMinutes };
    })
    .sort(
      (a, b) =>
        a.startMinutes - b.startMinutes ||
        a.endMinutes - b.endMinutes ||
        a.slot.id.localeCompare(b.slot.id)
    );

  const clusters: (typeof sorted)[] = [];
  for (const item of sorted) {
    const current = clusters[clusters.length - 1];
    if (current === undefined) {
      clusters.push([item]);
      continue;
    }
    const clusterEnd = current.reduce((max, entry) => Math.max(max, entry.endMinutes), 0);
    if (item.startMinutes >= clusterEnd) {
      clusters.push([item]);
    } else {
      current.push(item);
    }
  }

  const blocks: AvailabilityBlock<T>[] = [];
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const assigned = cluster.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMinutes);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMinutes);
      } else {
        laneEnds[lane] = item.endMinutes;
      }
      return { ...item, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    for (const item of assigned) {
      blocks.push({
        slot: item.slot,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        lane: item.lane,
        lanes,
        isActive: item.slot.is_active !== false,
      });
    }
  }
  return blocks;
}

function unionMinutes(intervals: readonly { start: number; end: number }[]): number {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let currentStart: number | null = null;
  let currentEnd = 0;
  for (const interval of sorted) {
    if (currentStart === null) {
      currentStart = interval.start;
      currentEnd = interval.end;
      continue;
    }
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
      continue;
    }
    total += currentEnd - currentStart;
    currentStart = interval.start;
    currentEnd = interval.end;
  }
  if (currentStart !== null) total += currentEnd - currentStart;
  return total;
}

export interface AvailabilityWeekOptions {
  /** Start of the visible window when no earlier slot exists. Default: 06:00. */
  minHour?: number;
  /** End of the visible window when no later slot exists. Default: 22:00. */
  maxHour?: number;
  /** Distance between hour ticks. Default: 120 minutes. */
  tickStepMinutes?: number;
}

/**
 * Builds the seven-day overview window. The window always contains all slots;
 * the defaults only define how much empty space is shown around them.
 */
export function buildAvailabilityWeek<T extends AvailabilitySlotLike>(
  slots: readonly T[],
  options: AvailabilityWeekOptions = {}
): AvailabilityWeek<T> {
  const minHour = options.minHour ?? 6;
  const maxHour = options.maxHour ?? 22;
  const tickStepMinutes = options.tickStepMinutes ?? 120;

  let startMinutes = Math.max(0, minHour * 60);
  let endMinutes = Math.min(24 * 60, maxHour * 60);
  for (const slot of slots) {
    startMinutes = Math.min(startMinutes, floorToHour(timeToMinutes(slot.start_time)));
    endMinutes = Math.max(endMinutes, ceilToHour(timeToMinutes(slot.end_time)));
  }
  startMinutes = Math.max(0, startMinutes);
  endMinutes = Math.min(24 * 60, Math.max(endMinutes, startMinutes + 60));

  const days = AVAILABILITY_WEEKDAYS.map((weekday) => {
    const blocks = layoutAvailabilityDay(
      slots.filter((slot) => slot.day_of_week === weekday.value)
    );
    const totalMinutes = unionMinutes(
      blocks
        .filter((block) => block.isActive)
        .map((block) => ({ start: block.startMinutes, end: block.endMinutes }))
    );
    return {
      dayOfWeek: weekday.value,
      short: weekday.short,
      long: weekday.long,
      blocks,
      totalMinutes,
    };
  });

  const hourTicks: AvailabilityHourTick[] = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += tickStepMinutes) {
    hourTicks.push({ minutes, label: minutesToTime(minutes) });
  }
  const lastTick = hourTicks[hourTicks.length - 1];
  if (lastTick === undefined || lastTick.minutes !== endMinutes) {
    hourTicks.push({ minutes: endMinutes, label: minutesToTime(endMinutes) });
  }

  return {
    startMinutes,
    endMinutes,
    hourTicks,
    days,
    totalMinutes: days.reduce((total, day) => total + day.totalMinutes, 0),
  };
}

/** Total time per week covered by active slots, e.g. "12,5 Std.". */
export function formatAvailabilityDuration(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.`;
}

export interface AvailabilityBlockMetrics {
  laneTop?: number;
  laneHeight?: number;
  blockHeight?: number;
  tolerance?: number;
}

/**
 * Hit test for the weekly editor: which block lies under a pointer/touch?
 * Coordinates are relative to the day track in pixels.
 */
export function findAvailabilityBlockAt<T extends AvailabilitySlotLike>(
  blocks: readonly AvailabilityBlock<T>[],
  window: { startMinutes: number; endMinutes: number },
  point: { x: number; y: number; width: number },
  metrics: AvailabilityBlockMetrics = {}
): AvailabilityBlock<T> | null {
  if (point.width <= 0) return null;
  const laneTop = metrics.laneTop ?? 4;
  const laneHeight = metrics.laneHeight ?? 26;
  const blockHeight = metrics.blockHeight ?? 22;
  const tolerance = metrics.tolerance ?? 2;
  const span = Math.max(1, window.endMinutes - window.startMinutes);
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block === undefined) continue;
    const top = laneTop + block.lane * laneHeight;
    if (point.y < top || point.y > top + blockHeight) continue;
    const startX = ((block.startMinutes - window.startMinutes) / span) * point.width;
    const endX = ((block.endMinutes - window.startMinutes) / span) * point.width;
    if (point.x >= startX - tolerance && point.x <= endX + tolerance) return block;
  }
  return null;
}
