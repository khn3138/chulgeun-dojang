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

describe('월 합계 (반나절·근무시간)', () => {
  const R = (date: string, extra: Partial<import('../types').DayRecord> = {}) => ({
    date, worked: true, memo: '', updatedAt: 0, synced: true, ...extra,
  });
  const records = [
    R('2026-09-01', { overtime: 1 }),
    R('2026-09-02', { half: true }),
    R('2026-09-03', { overtime: 1, night: 2 }),
    R('2026-09-04', { worked: false, memo: '쉼' }),
    R('2026-08-31', { overtime: 5 }),
  ];

  it('반나절은 0.5일, 시간은 항목별로 더한다', async () => {
    const { summarizeMonth, formatHours, formatNumber } = await import('../lib/dayCount');
    const s = summarizeMonth(records, '2026-09');
    expect(s).toEqual({ days: 2.5, workedCount: 3, hours: { overtime: 2, night: 2, extra: 0 } });
    expect(formatNumber(s.days)).toBe('2.5');
    expect(formatHours(s.hours)).toBe('연장 2시간 · 야간 2시간');
  });

  it('출근일수 · 공수 표시', async () => {
    const { summarizeMonth, formatAttendance } = await import('../lib/dayCount');
    expect(formatAttendance(summarizeMonth(records, '2026-09'))).toBe('출근 3일 · 공수 2.5');
  });

  it('반공수도 일차 순번은 1씩', () => {
    expect(computeDayNumbers(records, '2026-09').get('2026-09-03')).toBe(3);
  });

  it('하루 요약', async () => {
    const { describeDay } = await import('../lib/dayCount');
    expect(describeDay(R('2026-09-02', { half: true, extra: 1.5 }))).toBe('반공수 · 추가근무 1.5시간');
    expect(describeDay(R('2026-09-02', { worked: false }))).toBe('');
  });
});
