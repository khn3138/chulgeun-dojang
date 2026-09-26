import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '../db/db';
import { isEmptyRecord, type Settings } from '../types';

function fmt(ms: number | undefined): string {
  return ms ? format(ms, 'M/d HH:mm') : '-';
}

/**
 * 기록이 사라졌을 때 원인을 찾기 위한 저장 상태.
 * - 저장소 ID·시작 시각이 바뀌었다면: 폰의 이 앱 데이터가 지워졌거나 다른 앱(아이콘)을 연 것
 * - 실행 방식: 홈 화면 앱 / 브라우저 탭 (둘은 같은 크롬이면 기록을 같이 씀)
 */
export function StorageStatus({ settings }: { settings: Settings }) {
  const stats = useLiveQuery(async () => {
    const all = await db.records.toArray();
    const kept = all.filter((r) => !isEmptyRecord(r));
    return {
      count: kept.length,
      worked: kept.filter((r) => r.worked).length,
      lastSaved: all.reduce((m, r) => Math.max(m, r.updatedAt), 0),
      unsynced: all.filter((r) => !r.synced).length,
    };
  }, []);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  const standalone = typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches;

  return (
    <dl className="status-list">
      <dt>저장소 ID</dt>
      <dd>
        {settings.installId ?? '-'} (처음 사용 {fmt(settings.installedAt)})
      </dd>
      <dt>실행 방식</dt>
      <dd>{standalone ? '홈 화면 앱' : '브라우저 탭'}</dd>
      <dt>이 폰에 저장된 기록</dt>
      <dd>
        {stats ? `${stats.count}일 (출근 ${stats.worked}일)` : '…'} · 마지막 저장 {fmt(stats?.lastSaved)}
      </dd>
      {settings.sheetEndpoint && (
        <>
          <dt>시트에 아직 안 올라간 기록</dt>
          <dd>{stats ? `${stats.unsynced}건` : '…'}</dd>
        </>
      )}
      <dt>데이터 보호(자동 삭제 방지)</dt>
      <dd>{persisted === null ? '확인 불가' : persisted ? '켜짐' : '꺼짐'}</dd>
      <dt>앱 버전</dt>
      <dd>
        v{__APP_VERSION__} ({__BUILD_TIME__})
      </dd>
    </dl>
  );
}
