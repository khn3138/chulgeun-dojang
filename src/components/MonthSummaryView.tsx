import { formatHours, formatNumber, formatOvertimeEquivalent, type MonthSummary } from '../lib/dayCount';

/** '9월 출근 3일 · 공수 2.5' + '연장 3시간 · 야간 1시간' */
export function MonthSummaryView({ label, summary, showEquivalent }: { label: string; summary: MonthSummary; showEquivalent?: boolean }) {
  const hours = formatHours(summary.hours);
  const equiv = showEquivalent ? formatOvertimeEquivalent(summary.hours) : '';
  return (
    <div className="month-summary">
      <p className="month-total">
        {label} 출근 <strong>{summary.workedCount}일</strong> · 공수 <strong>{formatNumber(summary.days)}</strong>
      </p>
      {hours && <p className="month-hours">{hours}</p>}
      {equiv && <p className="month-equiv">{equiv}</p>}
    </div>
  );
}
