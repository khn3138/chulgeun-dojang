import { db } from '../db/db';
import { toRemote } from '../db/records';
import { getSettings, updateSettings } from '../db/settings';
import { mergeRecords } from './merge';
import { fetchSheetRecords, pushSheetRecords, type SheetConfig } from './sheetApi';
import type { DayRecord } from '../types';

const DEBOUNCE_MS = 3000;

async function getConfig(): Promise<SheetConfig | null> {
  const s = await getSettings();
  const endpoint = s.sheetEndpoint?.trim();
  if (!endpoint) return null;
  return { endpoint, token: s.syncToken?.trim() ?? '' };
}

/** 시트 데이터를 받아 updatedAt이 큰 쪽 우선으로 병합한다. */
async function pullAndMerge(cfg: SheetConfig): Promise<void> {
  const remote = await fetchSheetRecords(cfg);
  await db.transaction('rw', db.records, async () => {
    const local = await db.records.toArray();
    const { toSaveLocal, markSynced, toPush } = mergeRecords(local, remote, true);
    if (toSaveLocal.length) await db.records.bulkPut(toSaveLocal);
    for (const date of markSynced) await db.records.update(date, { synced: true });
    for (const date of toPush) await db.records.update(date, { synced: false });
  });
}

/** synced=false 인 기록을 시트로 올린다. */
async function pushPending(cfg: SheetConfig): Promise<void> {
  const pending = await db.records.filter((r) => !r.synced).toArray();
  if (pending.length === 0) return;
  await pushSheetRecords(cfg, pending.map(toRemote));
  // 올리는 동안 다시 수정된 기록은 그대로 미동기화로 둔다.
  const sent = new Map<string, DayRecord>(pending.map((r) => [r.date, r]));
  await db.transaction('rw', db.records, async () => {
    for (const [date, r] of sent) {
      const cur = await db.records.get(date);
      if (cur && cur.updatedAt === r.updatedAt) await db.records.update(date, { synced: true });
    }
  });
}

const PULL_INTERVAL_MS = 10 * 60 * 1000;
let lastPullAt = 0;
let queue: Promise<unknown> = Promise.resolve();

export interface SyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

async function runSync(pull: boolean | undefined): Promise<SyncResult> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, skipped: true, error: '시트 주소가 설정되지 않았어요' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: '인터넷에 연결되어 있지 않아요' };
  }
  try {
    if (pull ?? Date.now() - lastPullAt > PULL_INTERVAL_MS) {
      await pullAndMerge(cfg);
      lastPullAt = Date.now();
    }
    await pushPending(cfg);
    await updateSettings({ lastSyncAt: Date.now() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 동기화 실행 (한 번에 하나씩 차례로). 실패해도 예외를 던지지 않는다 —
 * 어르신에게는 에러를 보이지 않고, 설정 화면의 [지금 백업하기]만 결과를 보여준다.
 * @param opts.pull true면 시트에서 받아와 병합, 생략하면 10분에 한 번만 받아온다.
 */
export function syncNow(opts: { pull?: boolean } = {}): Promise<SyncResult> {
  const next = queue.then(() => runSync(opts.pull));
  queue = next.catch(() => undefined);
  return next;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** 저장할 때마다 호출. 3초 동안 추가 입력이 없으면 올린다. */
export function scheduleSync(delay = DEBOUNCE_MS): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void syncNow({ pull: false });
  }, delay);
}

/** 앱 시작 시 한 번 받아오고, 온라인으로 돌아오면 다시 시도한다. */
export function initSync(): void {
  void syncNow({ pull: true });
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
}
