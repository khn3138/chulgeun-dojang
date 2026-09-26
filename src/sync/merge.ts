import { isDateKey, isMonthKey } from '../lib/date';
import { HOUR_KINDS, normalizeDayData, roundHalfHour, type DayData, type RemoteMonth, type RemoteRecord } from '../types';

function toBool(v: unknown): boolean {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

function toTime(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 외부(시트, 백업 파일)에서 받은 하루 기록을 검증·정규화한다. 이상한 행은 버린다. */
export function normalizeRemote(input: unknown): RemoteRecord[] {
  if (!Array.isArray(input)) return [];
  const out: RemoteRecord[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!isDateKey(r.date)) continue;
    const data: DayData = {
      worked: toBool(r.worked),
      memo: r.memo == null ? '' : String(r.memo),
      // 시트는 amount 열(1 / 0.5), 백업 파일은 half 필드
      half: toBool(r.half) || Number(r.amount) === 0.5,
    };
    for (const k of HOUR_KINDS) data[k] = roundHalfHour(Number(r[k]) || 0);
    out.push({ date: r.date, ...normalizeDayData(data), updatedAt: toTime(r.updatedAt) });
  }
  return out;
}

export function normalizeRemoteMonths(input: unknown): RemoteMonth[] {
  if (!Array.isArray(input)) return [];
  const out: RemoteMonth[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!isMonthKey(r.month)) continue;
    out.push({ month: r.month, memo: r.memo == null ? '' : String(r.memo), updatedAt: toTime(r.updatedAt) });
  }
  return out;
}

export interface MergeResult<T> {
  /** 로컬에 덮어쓸 항목 (원격이 더 최신이거나 로컬에 없음) */
  toSaveLocal: (T & { synced: boolean })[];
  /** 원격과 같아서 synced=true 로 표시할 키 */
  markSynced: string[];
  /** 로컬이 더 최신이라 올려야 할 키 */
  toPush: string[];
}

/**
 * updatedAt이 더 큰 쪽이 이긴다. 같으면 내용이 같다고 보고 동기화 완료로 표시.
 * @param remoteSynced 원격이 시트면 true(가져온 항목은 이미 시트에 있음),
 *   백업 파일이면 false(가져온 뒤 시트에 올려야 함)
 */
export function mergeByKey<T extends { updatedAt: number }>(
  local: (T & { synced: boolean })[],
  remote: T[],
  keyOf: (item: T) => string,
  remoteSynced = true,
): MergeResult<T> {
  const localMap = new Map(local.map((r) => [keyOf(r), r]));
  const remoteMap = new Map<string, T>();
  for (const r of remote) {
    const prev = remoteMap.get(keyOf(r));
    if (!prev || r.updatedAt > prev.updatedAt) remoteMap.set(keyOf(r), r);
  }

  const result: MergeResult<T> = { toSaveLocal: [], markSynced: [], toPush: [] };

  for (const [key, r] of remoteMap) {
    const l = localMap.get(key);
    if (!l || r.updatedAt > l.updatedAt) {
      result.toSaveLocal.push({ ...r, synced: remoteSynced });
    } else if (r.updatedAt === l.updatedAt) {
      if (remoteSynced && !l.synced) result.markSynced.push(key);
    } else if (remoteSynced) {
      result.toPush.push(key);
    }
  }

  if (remoteSynced) {
    for (const [key] of localMap) {
      if (!remoteMap.has(key)) result.toPush.push(key);
    }
  }
  return result;
}

export function mergeRecords(
  local: (RemoteRecord & { synced: boolean })[],
  remote: RemoteRecord[],
  remoteSynced = true,
): MergeResult<RemoteRecord> {
  return mergeByKey(local, remote, (r) => r.date, remoteSynced);
}

export function mergeMonths(
  local: (RemoteMonth & { synced: boolean })[],
  remote: RemoteMonth[],
  remoteSynced = true,
): MergeResult<RemoteMonth> {
  return mergeByKey(local, remote, (m) => m.month, remoteSynced);
}
