import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { DEFAULT_SETTINGS } from './db/settings';
import { todayKey } from './lib/date';
import { isEmptyRecord, type DayRecord, type Settings } from './types';

export function useSettings(): Settings {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('main')) }), [], DEFAULT_SETTINGS);
}

/** 해당 월의 기록 (지워진 빈 기록 제외). 로딩 중이면 undefined */
export function useMonthRecords(ym: string): DayRecord[] | undefined {
  return useLiveQuery(
    async () => (await db.records.where('date').startsWith(ym + '-').toArray()).filter((r) => !isEmptyRecord(r)),
    [ym],
  );
}

/** 오늘 날짜. 자정이 지나거나 앱으로 돌아오면 갱신된다. */
export function useToday(): string {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const t = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
