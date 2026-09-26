import { db } from './db';
import { isEmptyRecord, normalizeDayData, sameDayData, type DayData, type DayRecord, type RemoteRecord } from '../types';

export async function getRecord(date: string): Promise<DayRecord | undefined> {
  return db.records.get(date);
}

/** 해당 월('YYYY-MM')의 기록 (지워진 빈 기록 제외) */
export async function getMonthRecords(ym: string): Promise<DayRecord[]> {
  const rows = await db.records.where('date').startsWith(ym + '-').toArray();
  return rows.filter((r) => !isEmptyRecord(r));
}

export async function getAllRecords(): Promise<DayRecord[]> {
  return db.records.toArray();
}

/**
 * 하루치 기록 저장. 출근도 메모도 없으면 worked=false, memo='' 로 남겨
 * 시트에도 지워졌다는 사실이 전달되게 한다. 바뀐 게 없으면 아무것도 하지 않는다.
 * @returns 저장 전 기록 (되돌리기용)
 */
export async function saveRecord(
  date: string,
  patch: DayData,
): Promise<{ previous: DayRecord | undefined; changed: boolean }> {
  return db.transaction('rw', db.records, async () => {
    const previous = await db.records.get(date);
    const data = normalizeDayData(patch);
    if (previous ? sameDayData(previous, data) : isEmptyRecord(data)) {
      return { previous, changed: false };
    }
    await db.records.put({ date, ...data, updatedAt: Date.now(), synced: false });
    return { previous, changed: true };
  });
}

/** 되돌리기: 저장 전 상태로 복원 (새 변경으로 기록해 시트에도 반영) */
export async function restoreRecord(date: string, previous: DayRecord | undefined): Promise<void> {
  await saveRecord(date, previous ?? { worked: false, memo: '' });
}

export function toRemote(r: DayRecord): RemoteRecord {
  const { synced: _synced, ...rest } = r;
  return rest;
}
