import { formatHours, formatNumber, type MonthSummary } from '../lib/dayCount';

/** '근무 21.5일' + '연장 3시간 · 야간 1시간' */
export function MonthSummaryView({ label, summary }: { label: string; summary: MonthSummary }) {
  const hours = formatHours(summary.hours);
  return (
    <div className="month-summary">
      <p className="month-total">
        {label} <strong>{formatNumber(summary.days)}일</strong>
      </p>
      {hours && <p className="month-hours">{hours}</p>}
    </div>
  );
}
