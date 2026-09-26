import { describe, expect, it } from 'vitest';
import { computeDayNumbers, countWorkedDays } from '../lib/dayCount';

describe('N일차 계산', () => {
  const records = [
    { date: '2026-09-10', worked: true },
    { date: '2026-09-03', worked: true },
    { date: '2026-09-05', worked: false }, // 메모만 있는 날
    { date: '2026-09-04', worked: true },
    { date: '2026-08-31', worked: true }, // 다른 달
    { date: '2026-10-01', worked: true },
  ];

  it('해당 월 출근일을 날짜순으로 센다', () => {
    const map = computeDayNumbers(records, '2026-09');
    expect([...map.entries()]).toEqual([
      ['2026-09-03', 1],
      ['2026-09-04', 2],
      ['2026-09-10', 3],
    ]);
    expect(map.has('2026-09-05')).toBe(false);
  });

  it('월 합계', () => {
    expect(countWorkedDays(records, '2026-09')).toBe(3);
    expect(countWorkedDays(records, '2026-08')).toBe(1);
    expect(countWorkedDays(records, '2026-07')).toBe(0);
  });

  it('중간 날짜를 지우면 뒤 일차가 당겨진다', () => {
    const map = computeDayNumbers(
      records.map((r) => (r.date === '2026-09-04' ? { ...r, worked: false } : r)),
      '2026-09',
    );
    expect(map.get('2026-09-10')).toBe(2);
  });
});
