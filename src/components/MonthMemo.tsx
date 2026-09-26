import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { saveMonthNote } from '../db/months';
import { formatMonthShort } from '../lib/date';
import { scheduleSync } from '../sync/sync';
import { useToast } from './Toast';

/** 월별 정리 메모. 칸을 벗어나면 자동 저장. */
export function MonthMemo({ month }: { month: string }) {
  const note = useLiveQuery(() => db.months.get(month), [month]);
  const [draft, setDraft] = useState('');
  const focused = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (!focused.current) setDraft(note?.memo ?? '');
  }, [note?.memo, month]);

  const save = async () => {
    if (await saveMonthNote(month, draft)) {
      scheduleSync();
      toast('저장됐어요 ✓');
    }
  };

  return (
    <section className="month-memo">
      <label htmlFor={`month-memo-${month}`} className="memo-label">
        📝 {formatMonthShort(month)} 정리 메모
      </label>
      <textarea
        id={`month-memo-${month}`}
        className="memo-input"
        rows={3}
        value={draft}
        placeholder="예: 9월분 일당 받음"
        onFocus={() => (focused.current = true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          focused.current = false;
          void save();
        }}
      />
    </section>
  );
}
