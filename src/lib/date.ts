import { addMonths, format, getDaysInMonth, parse } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜는 항상 로컬 시간 기준 'YYYY-MM-DD' 문자열로만 다룬다.
// toISOString()은 UTC로 바뀌어 한국 시간 오전에 날짜가 하루 밀리므로 쓰지 않는다.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export function isDateKey(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s);
}

export function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date(2000, 0, 1));
}

/** 'YYYY-MM' */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function isMonthKey(s: unknown): s is string {
  return typeof s === 'string' && MONTH_RE.test(s);
}

export function parseMonthKey(ym: string): { year: number; month: number } {
  return { year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) };
}

export function shiftMonth(ym: string, delta: number): string {
  const { year, month } = parseMonthKey(ym);
  return format(addMonths(new Date(year, month - 1, 1), delta), 'yyyy-MM');
}

/** 해당 월의 모든 날짜 키 */
export function daysOfMonth(ym: string): string[] {
  const { year, month } = parseMonthKey(ym);
  const n = getDaysInMonth(new Date(year, month - 1, 1));
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

/** 1일의 요일 (0=일요일) */
export function firstWeekdayOfMonth(ym: string): number {
  const { year, month } = parseMonthKey(ym);
  return new Date(year, month - 1, 1).getDay();
}

export function weekdayKo(dateKey: string): string {
  return format(parseDateKey(dateKey), 'EEEEE', { locale: ko });
}

export function weekdayIndex(dateKey: string): number {
  return parseDateKey(dateKey).getDay();
}

export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** '9월 4일 (금)' */
export function formatDayTitle(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdayKo(dateKey)})`;
}

/** '2026년 9월' */
export function formatMonthTitle(ym: string): string {
  const { year, month } = parseMonthKey(ym);
  return `${year}년 ${month}월`;
}

/** '9월' */
export function formatMonthShort(ym: string): string {
  return `${parseMonthKey(ym).month}월`;
}
