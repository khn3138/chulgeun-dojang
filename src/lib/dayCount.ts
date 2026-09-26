import type { DayRecord } from '../types';

/**
 * "N일차" 계산: 해당 월에서 출근한 날을 날짜순으로 셌을 때의 순번.
 * 저장하지 않고 항상 계산한다 (기존 엑셀 B열 숫자와 같은 방식).
 */
export function computeDayNumbers(
  records: Pick<DayRecord, 'date' | 'worked'>[],
  ym: string,
): Map<string, number> {
  const worked = records
    .filter((r) => r.worked && r.date.startsWith(ym + '-'))
    .map((r) => r.date)
    .sort();
  const map = new Map<string, number>();
  worked.forEach((date, i) => map.set(date, i + 1));
  return map;
}

export function countWorkedDays(records: Pick<DayRecord, 'date' | 'worked'>[], ym: string): number {
  return records.filter((r) => r.worked && r.date.startsWith(ym + '-')).length;
}
