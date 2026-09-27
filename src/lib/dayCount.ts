import { EARLY_MULTIPLIER, HOUR_KINDS, HOUR_LABELS, hoursOf, type DayRecord, type HourKind } from '../types';

type Countable = Pick<DayRecord, 'date' | 'worked'>;

/**
 * "N일차" 계산: 해당 월에서 출근한 날을 날짜순으로 셌을 때의 순번.
 * 반공수로 일한 날도 순번은 1씩 올라간다 (공수 합계만 0.5).
 * 저장하지 않고 항상 계산한다 (기존 엑셀 A열 숫자와 같은 방식).
 */
export function computeDayNumbers(records: Countable[], ym: string): Map<string, number> {
  const worked = records
    .filter((r) => r.worked && r.date.startsWith(ym + '-'))
    .map((r) => r.date)
    .sort();
  const map = new Map<string, number>();
  worked.forEach((date, i) => map.set(date, i + 1));
  return map;
}

export function countWorkedDays(records: Countable[], ym: string): number {
  return records.filter((r) => r.worked && r.date.startsWith(ym + '-')).length;
}

export interface MonthSummary {
  /** 공수 합계 (하루 1공수, 반공수 0.5) */
  days: number;
  /** 출근일수 (반공수인 날도 1) */
  workedCount: number;
  hours: Record<HourKind, number>;
}

export function summarizeMonth(records: DayRecord[], ym: string): MonthSummary {
  const summary: MonthSummary = { days: 0, workedCount: 0, hours: { overtime: 0, early: 0, night: 0, extra: 0 } };
  for (const r of records) {
    if (!r.worked || !r.date.startsWith(ym + '-')) continue;
    summary.workedCount += 1;
    summary.days += r.half ? 0.5 : 1;
    for (const k of HOUR_KINDS) summary.hours[k] += hoursOf(r, k);
  }
  return summary;
}

/** 21.5 → '21.5', 3 → '3' */
export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** '연장 3시간 · 야간 1.5시간' (0인 항목은 뺌) */
export function formatHours(hours: Record<HourKind, number>): string {
  return HOUR_KINDS.filter((k) => hours[k] > 0)
    .map((k) => `${HOUR_LABELS[k]} ${formatNumber(hours[k])}시간`)
    .join(' · ');
}

/** 하루치 근무 내용 요약: '반공수 · 연장 1시간' */
export function describeDay(r: DayRecord): string {
  if (!r.worked) return '';
  const parts: string[] = [];
  if (r.half) parts.push('반공수');
  for (const k of HOUR_KINDS) {
    const h = hoursOf(r, k);
    if (h > 0) parts.push(`${HOUR_LABELS[k]} ${formatNumber(h)}시간`);
  }
  return parts.join(' · ');
}

/** '출근 3일 · 공수 2.5' */
export function formatAttendance(summary: MonthSummary): string {
  return `출근 ${summary.workedCount}일 · 공수 ${formatNumber(summary.days)}`;
}

/** 연장 환산 시간 = 연장 + 조기출근×2. 둘 다 없으면 null */
export function overtimeEquivalent(hours: Record<HourKind, number>): number | null {
  if (hours.overtime <= 0 && hours.early <= 0) return null;
  return hours.overtime + hours.early * EARLY_MULTIPLIER;
}

/** '연장 환산 5시간 (연장 3 + 조기출근 1×2)' */
export function formatOvertimeEquivalent(hours: Record<HourKind, number>): string {
  const eq = overtimeEquivalent(hours);
  if (eq === null) return '';
  return `연장 환산 ${formatNumber(eq)}시간 (연장 ${formatNumber(hours.overtime)} + 조기출근 ${formatNumber(hours.early)}×${EARLY_MULTIPLIER})`;
}
