import { describe, expect, it } from 'vitest';
import { daysOfMonth, firstWeekdayOfMonth, formatDayTitle, shiftMonth, toDateKey, weekdayKo } from '../lib/date';

describe('date', () => {
  it('로컬 날짜 기준으로 키를 만든다 (UTC로 밀리지 않음)', () => {
    // 한국 시간 새벽 0시 30분 = UTC 전날 15:30
    expect(toDateKey(new Date(2026, 8, 4, 0, 30))).toBe('2026-09-04');
    expect(toDateKey(new Date(2026, 8, 4, 23, 59))).toBe('2026-09-04');
  });

  it('요일과 제목', () => {
    expect(weekdayKo('2026-09-04')).toBe('금');
    expect(formatDayTitle('2026-09-26')).toBe('9월 26일 (토)');
  });

  it('월 이동은 연도를 넘긴다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('월의 날짜 목록', () => {
    expect(daysOfMonth('2026-02')).toHaveLength(28);
    expect(daysOfMonth('2028-02')).toHaveLength(29);
    expect(daysOfMonth('2026-09')[0]).toBe('2026-09-01');
    expect(firstWeekdayOfMonth('2026-09')).toBe(2); // 화요일
  });
});
