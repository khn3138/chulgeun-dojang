import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { saveMonthNote } from '../db/months';
import { getMonthRecords, restoreRecord, saveRecord } from '../db/records';
import { buildBackup, importBackup } from '../lib/backup';

beforeEach(async () => {
  await db.records.clear();
  await db.months.clear();
  await db.settings.clear();
});

describe('records 저장소', () => {
  it('저장하면 미동기화로 표시된다', async () => {
    const { changed } = await saveRecord('2026-09-03', { worked: true, memo: '' });
    expect(changed).toBe(true);
    expect(await db.records.get('2026-09-03')).toMatchObject({ worked: true, synced: false });
  });

  it('바뀐 게 없으면 저장하지 않는다', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '연장' });
    await db.records.update('2026-09-03', { synced: true });
    const { changed } = await saveRecord('2026-09-03', { worked: true, memo: '연장' });
    expect(changed).toBe(false);
    expect((await db.records.get('2026-09-03'))?.synced).toBe(true);
  });

  it('출근·메모를 모두 지우면 빈 기록으로 남기고 월 목록에서는 빠진다', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '' });
    await saveRecord('2026-09-03', { worked: false, memo: '  ' });
    expect(await db.records.get('2026-09-03')).toMatchObject({ worked: false, memo: '', synced: false });
    expect(await getMonthRecords('2026-09')).toEqual([]);
  });

  it('되돌리기', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '야간' });
    const { previous } = await saveRecord('2026-09-03', { worked: false, memo: '' });
    await restoreRecord('2026-09-03', previous);
    expect(await db.records.get('2026-09-03')).toMatchObject({ worked: true, memo: '야간' });
  });

  it('메모만 있는 날은 출근 아님으로 저장된다', async () => {
    await saveRecord('2026-09-05', { worked: false, memo: '병원' });
    const month = await getMonthRecords('2026-09');
    expect(month).toHaveLength(1);
    expect(month[0]).toMatchObject({ worked: false, memo: '병원' });
  });
});

describe('반나절·근무시간', () => {
  it('저장되고, 출근을 지우면 함께 지워진다', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '', half: true, overtime: 1.5 });
    expect(await db.records.get('2026-09-03')).toMatchObject({ half: true, overtime: 1.5 });
    const { previous } = await saveRecord('2026-09-03', { worked: false, memo: '', half: true, overtime: 1.5 });
    const cleared = await db.records.get('2026-09-03');
    expect(cleared?.half).toBeUndefined();
    expect(cleared?.overtime).toBeUndefined();
    await restoreRecord('2026-09-03', previous);
    expect(await db.records.get('2026-09-03')).toMatchObject({ worked: true, half: true, overtime: 1.5 });
  });

  it('시간만 바꿔도 변경으로 본다', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '' });
    expect((await saveRecord('2026-09-03', { worked: true, memo: '', overtime: 1 })).changed).toBe(true);
    expect((await saveRecord('2026-09-03', { worked: true, memo: '', overtime: 1 })).changed).toBe(false);
  });
});

describe('월 메모', () => {
  it('바뀐 것만 저장', async () => {
    expect(await saveMonthNote('2026-09', '')).toBe(false);
    expect(await saveMonthNote('2026-09', '21.5일')).toBe(true);
    expect(await saveMonthNote('2026-09', '21.5일')).toBe(false);
    expect(await db.months.get('2026-09')).toMatchObject({ memo: '21.5일', synced: false });
  });
});

describe('JSON 백업', () => {
  it('내보낸 파일을 다른 폰(빈 DB)에 가져오면 그대로 복원된다', async () => {
    await saveRecord('2026-09-03', { worked: true, memo: '' });
    await saveRecord('2026-09-04', { worked: true, memo: '연장', half: true, overtime: 2 });
    await saveMonthNote('2026-09', '정리');
    const text = JSON.stringify(await buildBackup());
    await db.records.clear();
    await db.months.clear();
    expect(await importBackup(text)).toBe(2);
    const month = await getMonthRecords('2026-09');
    expect(month.map((r) => r.memo)).toEqual(['', '연장']);
    expect(month[1]).toMatchObject({ half: true, overtime: 2, synced: false });
    expect(await db.months.get('2026-09')).toMatchObject({ memo: '정리', synced: false });
  });

  it('다른 파일은 거절한다', async () => {
    await expect(importBackup('{"foo":1}')).rejects.toThrow('출근도장 백업 파일이 아니에요');
    await expect(importBackup('not json')).rejects.toThrow();
  });
});
