import { isDateKey } from '../lib/date';
import type { DayRecord, RemoteRecord } from '../types';

/** 외부(시트, 백업 파일)에서 받은 값을 검증·정규화한다. 이상한 행은 버린다. */
export function normalizeRemote(input: unknown): RemoteRecord[] {
  if (!Array.isArray(input)) return [];
  const out: RemoteRecord[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!isDateKey(r.date)) continue;
    const worked = r.worked === true || r.worked === 'TRUE' || r.worked === 'true' || r.worked === 1;
    const memo = r.memo == null ? '' : String(r.memo);
    const updatedAt = Number(r.updatedAt);
    out.push({ date: r.date, worked, memo, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 });
  }
  return out;
}

export interface MergeResult {
  /** 로컬에 덮어쓸 기록 (원격이 더 최신이거나 로컬에 없음) */
  toSaveLocal: DayRecord[];
  /** 원격과 같아서 synced=true 로 표시할 날짜 */
  markSynced: string[];
  /** 로컬이 더 최신이라 올려야 할 날짜 */
  toPush: string[];
}

/**
 * updatedAt이 더 큰 쪽이 이긴다. 같으면 내용이 같다고 보고 동기화 완료로 표시.
 * @param remoteSynced 원격이 시트면 true(가져온 기록은 이미 시트에 있음),
 *   백업 파일이면 false(가져온 뒤 시트에 올려야 함)
 */
export function mergeRecords(
  local: DayRecord[],
  remote: RemoteRecord[],
  remoteSynced = true,
): MergeResult {
  const localMap = new Map(local.map((r) => [r.date, r]));
  const remoteMap = new Map<string, RemoteRecord>();
  for (const r of remote) {
    const prev = remoteMap.get(r.date);
    if (!prev || r.updatedAt > prev.updatedAt) remoteMap.set(r.date, r);
  }

  const result: MergeResult = { toSaveLocal: [], markSynced: [], toPush: [] };

  for (const [date, r] of remoteMap) {
    const l = localMap.get(date);
    if (!l || r.updatedAt > l.updatedAt) {
      result.toSaveLocal.push({ ...r, synced: remoteSynced });
    } else if (r.updatedAt === l.updatedAt) {
      if (remoteSynced && !l.synced) result.markSynced.push(date);
    } else if (remoteSynced) {
      result.toPush.push(date);
    }
  }

  if (remoteSynced) {
    for (const l of local) {
      if (!remoteMap.has(l.date)) result.toPush.push(l.date);
    }
  }
  return result;
}
