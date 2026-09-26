import { db } from '../db/db';
import { toRemote } from '../db/records';
import { getSettings, updateSettings } from '../db/settings';
import { mergeRecords, normalizeRemote } from '../sync/merge';
import { isEmptyRecord, type RemoteRecord } from '../types';

export interface BackupFile {
  app: 'chulgeun-dojang';
  version: 1;
  exportedAt: number;
  workerName: string;
  records: RemoteRecord[];
}

export async function buildBackup(): Promise<BackupFile> {
  const [records, settings] = await Promise.all([db.records.toArray(), getSettings()]);
  return {
    app: 'chulgeun-dojang',
    version: 1,
    exportedAt: Date.now(),
    workerName: settings.workerName,
    records: records.filter((r) => !isEmptyRecord(r)).map(toRemote).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export class BackupFormatError extends Error {}

/**
 * 백업 파일을 가져온다. 기존 기록은 지우지 않고, 날짜별로 더 최근에 고친 쪽을 남긴다.
 * @returns 반영된 기록 수
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
  const applied = await db.transaction('rw', db.records, async () => {
    const local = await db.records.toArray();
    // 가져온 기록은 아직 시트에 없을 수 있으므로 synced=false 로 저장해 다음 동기화 때 올린다.
    const { toSaveLocal } = mergeRecords(local, remote, false);
    if (toSaveLocal.length) await db.records.bulkPut(toSaveLocal);
    return toSaveLocal.length;
  });
  const settings = await getSettings();
  if (!settings.workerName && typeof file.workerName === 'string' && file.workerName) {
    await updateSettings({ workerName: file.workerName });
  }
  return applied;
}
