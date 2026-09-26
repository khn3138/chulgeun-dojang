import { formatMonthShort, formatMonthTitle, shiftMonth } from '../lib/date';

interface Props {
  month: string;
  onChange: (month: string) => void;
}

export function MonthNav({ month, onChange }: Props) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <div className="month-nav">
      <button type="button" className="month-nav-btn" onClick={() => onChange(prev)} aria-label={`이전 달 ${formatMonthTitle(prev)}`}>
        ◀ {formatMonthShort(prev)}
      </button>
      <h2 className="month-nav-title">{formatMonthTitle(month)}</h2>
      <button type="button" className="month-nav-btn" onClick={() => onChange(next)} aria-label={`다음 달 ${formatMonthTitle(next)}`}>
        {formatMonthShort(next)} ▶
      </button>
    </div>
  );
}
