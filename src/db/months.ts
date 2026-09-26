import { db } from './db';
import type { MonthNote, RemoteMonth } from '../types';

export async function getMonthNote(month: string): Promise<MonthNote | undefined> {
  return db.months.get(month);
}

/** 월별 정리 메모 저장. 바뀐 게 없으면 저장하지 않는다. */
export async function saveMonthNote(month: string, memo: string): Promise<boolean> {
  return db.transaction('rw', db.months, async () => {
    const prev = await db.months.get(month);
    const value = memo.trim() === '' ? '' : memo;
    if ((prev?.memo ?? '') === value) return false;
    await db.months.put({ month, memo: value, updatedAt: Date.now(), synced: false });
    return true;
  });
}

export function monthToRemote(m: MonthNote): RemoteMonth {
  return { month: m.month, memo: m.memo, updatedAt: m.updatedAt };
}
