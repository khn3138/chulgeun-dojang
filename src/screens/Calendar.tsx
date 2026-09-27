import { useState } from 'react';
import { MonthNav } from '../components/MonthNav';
import { MonthSummaryView } from '../components/MonthSummaryView';
import { MonthMemo } from '../components/MonthMemo';
import { Stamp } from '../components/Stamp';
import { ScreenHeader } from '../components/ScreenHeader';
import { computeDayNumbers, describeDay, formatNumber, summarizeMonth } from '../lib/dayCount';
import { dayOfMonth, daysOfMonth, firstWeekdayOfMonth, formatMonthShort, weekdayIndex, weekdayKo } from '../lib/date';
import { useLoadedSettings, useMonthRecords, useToday } from '../hooks';
import { HOUR_KINDS } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  onBack: () => void;
  openDay: (date: string) => void;
}

export function Calendar({ month, onMonthChange, onBack, openDay }: Props) {
  const today = useToday();
  const settings = useLoadedSettings();
  const showNumber = settings?.calShowNumber ?? true;
  const icon = settings?.calIcon ?? 'circle';
  const color = settings?.calColor ?? 'green';
  const records = useMonthRecords(month) ?? [];
  const [listView, setListView] = useState(false);
  const byDate = new Map(records.map((r) => [r.date, r]));
  const dayNumbers = computeDayNumbers(records, month);
  const summary = summarizeMonth(records, month);
  const days = daysOfMonth(month);
  const lead = firstWeekdayOfMonth(month);

  return (
    <main className="screen">
      <ScreenHeader title="달력" onBack={onBack} />
      <MonthNav month={month} onChange={onMonthChange} />

      <MonthSummaryView label={formatMonthShort(month)} summary={summary} showEquivalent={settings?.showOvertimeEquivalent} />

      <div className="view-toggle" role="tablist">
        <button type="button" role="tab" aria-selected={!listView} className={!listView ? 'active' : ''} onClick={() => setListView(false)}>
          달력으로 보기
        </button>
        <button type="button" role="tab" aria-selected={listView} className={listView ? 'active' : ''} onClick={() => setListView(true)}>
          목록으로 보기
        </button>
      </div>

      {!listView ? (
        <div className={`cal stamp-${color}`}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`cal-head wd-${i}`}>
              {w}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} className="cal-cell empty" />
          ))}
          {days.map((date) => {
            const r = byDate.get(date);
            const n = dayNumbers.get(date);
            const detail = r ? describeDay(r) : '';
            const extraHours = r ? HOUR_KINDS.reduce((sum, k) => sum + (r[k] ?? 0), 0) : 0;
            const label = `${dayOfMonth(date)}일${n ? `, 출근 ${n}일차` : ''}${detail ? `, ${detail}` : ''}${r?.memo ? `, 메모 ${r.memo}` : ''}`;
            return (
              <button
                type="button"
                key={date}
                className={`cal-cell wd-${weekdayIndex(date)} ${date === today ? 'today' : ''} ${n ? 'worked' : ''}`}
                onClick={() => openDay(date)}
                aria-label={label}
              >
                <span className="cal-day">{dayOfMonth(date)}</span>
                {n && settings ? <Stamp icon={icon} half={r?.half} number={showNumber ? n : undefined} /> : <span className="cal-stamp-empty" />}
                {extraHours > 0 && <span className="cal-hours">+{formatNumber(extraHours)}h</span>}
                {r?.memo ? <span className="cal-memo">📝</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <ul className="day-list">
          {records.length === 0 && <li className="day-list-empty">이 달에는 기록이 없어요</li>}
          {[...records]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r) => (
              <li key={r.date}>
                <button type="button" className="day-list-item" onClick={() => openDay(r.date)}>
                  <span className="dl-date">
                    {dayOfMonth(r.date)}일 ({weekdayKo(r.date)})
                  </span>
                  <span className={`dl-num ${r.worked ? 'worked' : ''}`}>{r.worked ? `${dayNumbers.get(r.date)}일차` : '쉼'}</span>
                  <span className="dl-memo">{[describeDay(r), r.memo].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
        </ul>
      )}

      <MonthMemo month={month} />
    </main>
  );
}
