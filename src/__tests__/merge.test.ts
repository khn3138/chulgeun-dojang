import { describe, expect, it } from 'vitest';
import { mergeRecords, normalizeRemote } from '../sync/merge';
import type { DayRecord } from '../types';

const L = (date: string, updatedAt: number, synced = true, worked = true, memo = ''): DayRecord => ({
  date,
  worked,
  memo,
  updatedAt,
  synced,
});

describe('mergeRecords (시트)', () => {
  it('updatedAt이 큰 쪽이 이긴다', () => {
    const local = [L('2026-09-01', 100), L('2026-09-02', 300, false), L('2026-09-03', 200, false)];
    const remote = [
      { date: '2026-09-01', worked: true, memo: '연장', updatedAt: 200 }, // 보호자가 시트에서 수정
      { date: '2026-09-02', worked: false, memo: '', updatedAt: 100 },
      { date: '2026-09-03', worked: true, memo: '', updatedAt: 200 },
      { date: '2026-09-04', worked: true, memo: '', updatedAt: 50 }, // 로컬에 없음
    ];
    const res = mergeRecords(local, remote, true);
    expect(res.toSaveLocal.map((r) => r.date)).toEqual(['2026-09-01', '2026-09-04']);
    expect(res.toSaveLocal[0]).toMatchObject({ memo: '연장', synced: true });
    expect(res.toPush).toEqual(['2026-09-02']);
    expect(res.markSynced).toEqual(['2026-09-03']);
  });

  it('시트에 없는 로컬 기록은 올린다', () => {
    const res = mergeRecords([L('2026-09-05', 1)], [], true);
    expect(res.toPush).toEqual(['2026-09-05']);
  });

  it('백업 파일 가져오기: 더 최신인 것만 synced=false로 저장, 올리기 목록 없음', () => {
    const res = mergeRecords(
      [L('2026-09-01', 500)],
      [
        { date: '2026-09-01', worked: false, memo: '', updatedAt: 100 },
        { date: '2026-09-02', worked: true, memo: '', updatedAt: 100 },
      ],
      false,
    );
    expect(res.toSaveLocal).toEqual([{ date: '2026-09-02', worked: true, memo: '', updatedAt: 100, synced: false }]);
    expect(res.toPush).toEqual([]);
  });
});

describe('normalizeRemote', () => {
  it('시트 값 형태를 정규화하고 잘못된 행은 버린다', () => {
    expect(
      normalizeRemote([
        { date: '2026-09-01', worked: 'TRUE', memo: null, updatedAt: '123' },
        { date: '2026/09/02', worked: true },
        { date: '2026-09-03', worked: false, memo: 5 },
        null,
      ]),
    ).toEqual([
      { date: '2026-09-01', worked: true, memo: '', updatedAt: 123 },
      { date: '2026-09-03', worked: false, memo: '5', updatedAt: 0 },
    ]);
    expect(normalizeRemote('x')).toEqual([]);
  });
});
