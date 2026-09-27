// apps-script/Code.gs 를 가짜 SpreadsheetApp 위에서 실행해 본다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Cell = string | number | boolean | Date;

class FakeSheet {
  data: Cell[][] = [];
  constructor(public name: string) {}
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) if ((this.data[r - 1] ?? []).some((c) => c !== '' && c != null)) return r;
    return 0;
  }
  setFrozenRows() {}
  cell(r: number, c: number): Cell { return this.data[r - 1]?.[c - 1] ?? ''; }
  set(r: number, c: number, v: Cell) {
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v;
  }
  getRange(a: number | string, col = 1, rows = 1, cols = 1) {
    if (typeof a === 'string') return new FakeRange(this, 1, 1, 1000, 1);
    return new FakeRange(this, a, col, rows, cols);
  }
}

class FakeRange {
  constructor(private s: FakeSheet, private r: number, private c: number, private nr: number, private nc: number) {}
  getValues() {
    return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => this.s.cell(this.r + i, this.c + j)));
  }
  getDisplayValues() { return this.getValues().map((row) => row.map((v) => String(v))); }
  setValues(v: Cell[][]) {
    v.forEach((row, i) => row.forEach((val, j) => this.s.set(this.r + i, this.c + j, val)));
    return this;
  }
  setFontWeight() { return this; }
  setNumberFormat() { return this; }
  sort({ column }: { column: number }) {
    const rows = this.getValues().sort((x, y) => String(x[column - 1]).localeCompare(String(y[column - 1])));
    this.setValues(rows);
  }
  getSheet() { return this.s; }
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getLastRow() { return this.r + this.nr - 1; }
  getLastColumn() { return this.c + this.nc - 1; }
}

function load() {
  const sheets: FakeSheet[] = [];
  const ss = {
    getSheetByName: (n: string) => sheets.find((s) => s.name === n) ?? null,
    insertSheet: (n: string) => { const s = new FakeSheet(n); sheets.push(s); return s; },
    getSheets: () => sheets,
  };
  const logs: string[] = [];
  const env = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'tok' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: (t: string) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 'json' } },
    Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'Asia/Seoul' },
    Logger: { log: (m: string) => logs.push(m) },
  };
  const src = readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
  const names = ['doGet', 'doPost', 'setup', 'onEdit', 'migrateLegacy'];
  const fns = new Function(...Object.keys(env), `${src}\nreturn { ${names.join(', ')} };`)(...Object.values(env));
  return { ss, sheets, logs, ...fns } as {
    ss: typeof ss;
    sheets: FakeSheet[];
    logs: string[];
    doGet: (e: unknown) => any;
    doPost: (e: unknown) => any;
    setup: () => void;
    onEdit: (e: unknown) => void;
    migrateLegacy: () => void;
  };
}

const post = (body: unknown) => ({ postData: { contents: JSON.stringify(body) } });

describe('Apps Script', () => {
  it('토큰이 틀리면 거절', () => {
    const gs = load();
    expect(gs.doGet({ parameter: { token: 'x' } })).toMatchObject({ ok: false });
  });

  it('기록·월 메모 upsert 후 그대로 읽힌다', () => {
    const gs = load();
    gs.setup();
    const r = gs.doPost(post({
      token: 'tok',
      records: [
        { date: '2026-09-04', worked: true, memo: '', updatedAt: 10, amount: 0.5, overtime: 1 },
        { date: '2026-09-03', worked: true, memo: '야간', updatedAt: 10, amount: 1, night: 2 },
      ],
      months: [{ month: '2026-09', memo: '정리', updatedAt: 5 }],
    }));
    expect(r).toEqual({ ok: true, count: 3 });
    // 오래된 수정은 무시, 새 수정은 반영
    gs.doPost(post({ token: 'tok', records: [{ date: '2026-09-03', worked: false, memo: '', updatedAt: 5 }] }));
    gs.doPost(post({ token: 'tok', records: [{ date: '2026-09-04', worked: true, memo: '연장', updatedAt: 20, amount: 1, overtime: 1.5 }] }));
    const got = gs.doGet({ parameter: { token: 'tok' } });
    expect(got.records).toEqual([
      { date: '2026-09-03', worked: true, memo: '야간', updatedAt: 10, amount: 1, overtime: 0, night: 2, extra: 0, early: 0 },
      { date: '2026-09-04', worked: true, memo: '연장', updatedAt: 20, amount: 1, overtime: 1.5, night: 0, extra: 0, early: 0 },
    ]);
    expect(got.months).toEqual([{ month: '2026-09', memo: '정리', updatedAt: 5 }]);
  });

  it('예전(4열) 시트도 헤더를 채워 그대로 쓴다', () => {
    const gs = load();
    const s = gs.ss.insertSheet('records');
    s.data = [['date', 'worked', 'memo', 'updatedAt'], ['2026-09-01', true, '', 7]];
    const got = gs.doGet({ parameter: { token: 'tok' } });
    expect(got.records).toEqual([{ date: '2026-09-01', worked: true, memo: '', updatedAt: 7, amount: 1, overtime: 0, night: 0, extra: 0, early: 0 }]);
    expect(s.data[0]).toHaveLength(9);
  });

  it('시트에서 직접 고치면 updatedAt 갱신', () => {
    const gs = load();
    gs.setup();
    gs.doPost(post({ token: 'tok', records: [{ date: '2026-09-01', worked: true, memo: '', updatedAt: 1 }] }));
    const s = gs.ss.getSheetByName('records')!;
    gs.onEdit({ range: s.getRange(2, 3, 1, 1) });
    expect(Number(s.cell(2, 4))).toBeGreaterThan(1000);
  });

  it('migrateLegacy: A열 일차, B열 메모, 32행부터 월 정리', () => {
    const gs = load();
    gs.setup();
    const legacy = gs.ss.insertSheet('9월');
    legacy.set(1, 1, 1); legacy.set(1, 2, '연장 1시간');
    legacy.set(2, 1, 2);
    legacy.set(3, 2, '병원'); // 쉬는 날 메모만
    legacy.set(4, 1, 3); legacy.set(4, 2, '반차');
    legacy.set(10, 1, 4); legacy.set(10, 2, '연장근무 1시간 30분, 야간 2');
    legacy.set(11, 1, 5); legacy.set(11, 2, '반공수');
    legacy.set(12, 1, 6); legacy.set(12, 2, '조기출근 1시간');
    legacy.set(32, 1, '21.5일 근무');
    legacy.set(33, 1, '연장 3시간');
    gs.ss.insertSheet('월별요약').set(1, 1, 99); // 월 탭이 아니면 무시

    gs.migrateLegacy();
    expect(gs.logs.at(-1)).toBe('옮긴 기록: 7일, 월 정리 메모: 1개월');
    const year = new Date().getFullYear();
    const got = gs.doGet({ parameter: { token: 'tok' } });
    const brief = got.records.map((r: any) => [r.date.slice(5), r.worked, r.memo, r.amount, r.overtime, r.night]);
    expect(brief).toEqual([
      ['09-01', true, '연장 1시간', 1, 1, 0],
      ['09-02', true, '', 1, 0, 0],
      ['09-03', false, '병원', 0, 0, 0],
      ['09-04', true, '반차', 0.5, 0, 0],
      ['09-10', true, '연장근무 1시간 30분, 야간 2', 1, 1.5, 2],
      ['09-11', true, '반공수', 0.5, 0, 0],
      ['09-12', true, '조기출근 1시간', 1, 0, 0],
    ]);
    expect(got.records.find((r: any) => r.date.endsWith('09-12')).early).toBe(1);
    expect(got.records[0].date).toBe(`${year}-09-01`);
    expect(got.months[0]).toMatchObject({ month: `${year}-09`, memo: '21.5일 근무\n연장 3시간' });

    // 다시 실행해도 중복·덮어쓰기 없음
    gs.migrateLegacy();
    expect(gs.logs.at(-1)).toBe('옮긴 기록: 0일, 월 정리 메모: 0개월');
  });

  it('migrateLegacy: 일차가 0.5 늘어난 날은 반나절', () => {
    const gs = load();
    gs.setup();
    const legacy = gs.ss.insertSheet('2025년 12월');
    legacy.set(1, 1, 1); legacy.set(2, 1, 1.5); legacy.set(3, 1, 2.5);
    gs.migrateLegacy();
    const got = gs.doGet({ parameter: { token: 'tok' } });
    expect(got.records.map((r: any) => [r.date, r.amount])).toEqual([
      ['2025-12-01', 1], ['2025-12-02', 0.5], ['2025-12-03', 1],
    ]);
  });
});
