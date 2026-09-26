import { forwardRef } from 'react';
import { computeDayNumbers, describeDay, formatHours, formatNumber, summarizeMonth } from '../lib/dayCount';
import { dayOfMonth, formatMonthTitle, weekdayIndex, weekdayKo } from '../lib/date';
import type { DayRecord } from '../types';

interface Props {
  month: string;
  workerName: string;
  records: DayRecord[];
  includeMemoOnly: boolean;
  monthMemo: string;
  generatedAt: Date;
}

/** 내보내기 이미지로 찍히는 근무일지 표. 글자 크기 설정과 무관하게 고정 크기(px)로 그린다. */
export const ExportSheet = forwardRef<HTMLDivElement, Props>(function ExportSheet(
  { month, workerName, records, includeMemoOnly, monthMemo, generatedAt },
  ref,
) {
  const dayNumbers = computeDayNumbers(records, month);
  const summary = summarizeMonth(records, month);
  const hours = formatHours(summary.hours);
  const rows = records
    .filter((r) => r.worked || (includeMemoOnly && r.memo.trim() !== ''))
    .sort((a, b) => a.date.localeCompare(b.date));
  const title = `${formatMonthTitle(month)} 근무일지${workerName.trim() ? ` — ${workerName.trim()}` : ''}`;
  const stamp = `${generatedAt.getFullYear()}.${generatedAt.getMonth() + 1}.${generatedAt.getDate()} ${String(generatedAt.getHours()).padStart(2, '0')}:${String(generatedAt.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="export-sheet" ref={ref}>
      <h1 className="es-title">{title}</h1>
      <table className="es-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>요일</th>
            <th>일차</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="es-empty">
                기록이 없어요
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.date} className={r.worked ? '' : 'es-rest'}>
              <td>{dayOfMonth(r.date)}일</td>
              <td className={`wd-${weekdayIndex(r.date)}`}>{weekdayKo(r.date)}</td>
              <td>{r.worked ? `${dayNumbers.get(r.date)}일차` : '쉼'}</td>
              <td className="es-memo">{[describeDay(r), r.memo].filter(Boolean).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="es-summary">
        <p className="es-total">
          총 근무 <strong>{formatNumber(summary.days)}일</strong>
          {summary.days !== summary.workedCount && <span className="es-sub"> (출근 {summary.workedCount}일)</span>}
        </p>
        {hours && <p className="es-hours">{hours}</p>}
      </div>
      {monthMemo.trim() && <p className="es-month-memo">{monthMemo}</p>}
      <p className="es-generated">만든 날: {stamp} · 출근도장</p>
    </div>
  );
});
