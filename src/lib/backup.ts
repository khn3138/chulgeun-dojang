import { db } from '../db/db';
import { monthToRemote } from '../db/months';
import { toRemote } from '../db/records';
import { getSettings, updateSettings } from '../db/settings';
import { mergeMonths, mergeRecords, normalizeRemote, normalizeRemoteMonths } from '../sync/merge';
import { isEmptyRecord, type RemoteMonth, type RemoteRecord } from '../types';

export interface BackupFile {
  app: 'chulgeun-dojang';
  /** 1: 하루 기록만, 2: 반나절·근무시간·월 메모 추가 */
  version: 1 | 2;
  exportedAt: number;
  workerName: string;
  records: RemoteRecord[];
  months?: RemoteMonth[];
}

export async function buildBackup(): Promise<BackupFile> {
  const [records, months, settings] = await Promise.all([db.records.toArray(), db.months.toArray(), getSettings()]);
  return {
    app: 'chulgeun-dojang',
    version: 2,
    exportedAt: Date.now(),
    workerName: settings.workerName,
    records: records.filter((r) => !isEmptyRecord(r)).map(toRemote).sort((a, b) => a.date.localeCompare(b.date)),
    months: months.filter((m) => m.memo !== '').map(monthToRemote).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export class BackupFormatError extends Error {}

/**
 * 백업 파일을 가져온다. 기존 기록은 지우지 않고, 날짜별로 더 최근에 고친 쪽을 남긴다.
 * @returns 반영된 하루 기록 수
 */
export async function importBackup(text: string): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupFormatError('백업 파일을 읽을 수 없어요');
  }
  const file = parsed as Partial<BackupFile>;
  if (!file || file.app !== 'chulgeun-dojang' || !Array.isArray(file.records)) {
    throw new BackupFormatError('출근도장 백업 파일이 아니에요');
  }
  const remote = normalizeRemote(file.records);
  const remoteMonths = normalizeRemoteMonths(file.months);
  const applied = await db.transaction('rw', db.records, db.months, async () => {
    // 가져온 항목은 아직 시트에 없을 수 있으므로 synced=false 로 저장해 다음 동기화 때 올린다.
    const r = mergeRecords(await db.records.toArray(), remote, false);
    if (r.toSaveLocal.length) await db.records.bulkPut(r.toSaveLocal);
    const m = mergeMonths(await db.months.toArray(), remoteMonths, false);
    if (m.toSaveLocal.length) await db.months.bulkPut(m.toSaveLocal);
    return r.toSaveLocal.length;
  });
  const settings = await getSettings();
  if (!settings.workerName && typeof file.workerName === 'string' && file.workerName) {
    await updateSettings({ workerName: file.workerName });
  }
  return applied;
}
