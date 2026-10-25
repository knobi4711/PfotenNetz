import { describe, expect, it } from 'vitest';
import {
  availabilityWeekdayLabel,
  buildAvailabilityWeek,
  findAvailabilityBlockAt,
  formatAvailabilityDuration,
  formatAvailabilityRange,
  layoutAvailabilityDay,
  minutesToTime,
  normalizeAvailabilityRange,
  shiftAvailabilityRange,
  snapAvailabilityMinutes,
  timeToMinutes,
} from './availability';

describe('availability time helpers', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('09:30:00')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('formats minutes back to a clock time', () => {
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(1440)).toBe('24:00');
    expect(minutesToTime(-30)).toBe('00:00');
  });

  it('formats a readable range and duration', () => {
    expect(formatAvailabilityRange('09:00:00', '12:00:00')).toBe('09:00–12:00 Uhr');
    expect(formatAvailabilityDuration(750)).toBe('12,5 Std.');
  });

  it('maps weekday values to German labels', () => {
    expect(availabilityWeekdayLabel(1)).toBe('Montag');
    expect(availabilityWeekdayLabel(0, 'short')).toBe('So');
    expect(availabilityWeekdayLabel(9)).toBe('–');
  });
});

describe('graphical availability editing helpers', () => {
  it('snaps to half-hour steps and clamps to a day', () => {
    expect(snapAvailabilityMinutes(9 * 60 + 17)).toBe(9 * 60 + 30);
    expect(snapAvailabilityMinutes(-10)).toBe(0);
    expect(snapAvailabilityMinutes(24 * 60 + 40)).toBe(24 * 60);
  });

  it('normalizes drag ranges in both directions and enforces 30 minutes', () => {
    expect(normalizeAvailabilityRange(10 * 60, 12 * 60)).toEqual({
      startMinutes: 10 * 60,
      endMinutes: 12 * 60,
    });
    expect(normalizeAvailabilityRange(12 * 60, 10 * 60)).toEqual({
      startMinutes: 10 * 60,
      endMinutes: 12 * 60,
    });
    expect(normalizeAvailabilityRange(10 * 60, 10 * 60)).toEqual({
      startMinutes: 10 * 60,
      endMinutes: 10 * 60 + 30,
    });
  });

  it('shifts ranges while keeping their duration inside the day', () => {
    expect(shiftAvailabilityRange(9 * 60, 12 * 60, 60)).toEqual({
      startMinutes: 10 * 60,
      endMinutes: 13 * 60,
    });
    expect(shiftAvailabilityRange(9 * 60, 12 * 60, -10 * 60)).toEqual({
      startMinutes: 0,
      endMinutes: 3 * 60,
    });
  });

  it('finds the block under a pointer position', () => {
    const blocks = layoutAvailabilityDay([
      { id: 'a', day_of_week: 1, start_time: '09:00', end_time: '12:00' },
    ]);
    const window = { startMinutes: 6 * 60, endMinutes: 22 * 60 };
    // 10:00 is one quarter into a 16-hour window.
    expect(findAvailabilityBlockAt(blocks, window, { x: 250, y: 10, width: 1000 })?.slot.id).toBe(
      'a'
    );
    expect(findAvailabilityBlockAt(blocks, window, { x: 750, y: 10, width: 1000 })).toBeNull();
    expect(findAvailabilityBlockAt(blocks, window, { x: 250, y: 40, width: 1000 })).toBeNull();
  });
});

describe('layoutAvailabilityDay', () => {
  const slot = (id: string, start: string, end: string) => ({
    id,
    day_of_week: 1,
    start_time: start,
    end_time: end,
  });

  it('keeps non-overlapping slots on a single lane', () => {
    const blocks = layoutAvailabilityDay([
      slot('a', '09:00', '12:00'),
      slot('b', '13:00', '15:00'),
    ]);
    expect(blocks.map((block) => block.lane)).toEqual([0, 0]);
    expect(blocks.map((block) => block.lanes)).toEqual([1, 1]);
  });

  it('assigns overlapping slots to parallel lanes', () => {
    const blocks = layoutAvailabilityDay([
      slot('a', '09:00', '12:00'),
      slot('b', '10:00', '11:00'),
      slot('c', '11:00', '13:00'),
    ]);
    expect(blocks.map((block) => block.lane)).toEqual([0, 1, 1]);
    expect(blocks.every((block) => block.lanes === 2)).toBe(true);
  });

  it('restarts lane counting for a later cluster', () => {
    const blocks = layoutAvailabilityDay([
      slot('a', '09:00', '12:00'),
      slot('b', '10:00', '11:00'),
      slot('c', '14:00', '16:00'),
    ]);
    expect(blocks.map((block) => block.lane)).toEqual([0, 1, 0]);
    expect(blocks.map((block) => block.lanes)).toEqual([2, 2, 1]);
  });
});

describe('buildAvailabilityWeek', () => {
  const slots = [
    {
      id: 'a',
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '12:00:00',
      is_active: true,
    },
    {
      id: 'b',
      day_of_week: 1,
      start_time: '11:00:00',
      end_time: '13:00:00',
      is_active: true,
    },
    {
      id: 'c',
      day_of_week: 3,
      start_time: '23:00:00',
      end_time: '23:30:00',
      is_active: false,
    },
  ];

  it('uses Monday-first order and unions overlapping active time', () => {
    const week = buildAvailabilityWeek(slots);
    expect(week.days.map((day) => day.short)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(week.days[0]?.totalMinutes).toBe(4 * 60);
    expect(week.days[2]?.totalMinutes).toBe(0);
    expect(week.totalMinutes).toBe(4 * 60);
  });

  it('expands the visible window to cover early and late slots', () => {
    const week = buildAvailabilityWeek(slots);
    expect(week.startMinutes).toBe(6 * 60);
    expect(week.endMinutes).toBe(24 * 60);
  });

  it('provides hour ticks including the window end', () => {
    const week = buildAvailabilityWeek([
      { id: 'a', day_of_week: 2, start_time: '08:00', end_time: '10:00' },
    ]);
    expect(week.hourTicks[0]).toEqual({ minutes: 6 * 60, label: '06:00' });
    expect(week.hourTicks[week.hourTicks.length - 1]?.label).toBe('22:00');
    expect(week.totalMinutes).toBe(2 * 60);
  });
});
