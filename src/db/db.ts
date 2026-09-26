import Dexie, { type EntityTable } from 'dexie';
import type { DayRecord, MonthNote, Settings } from '../types';

export class DojangDB extends Dexie {
  records!: EntityTable<DayRecord, 'date'>;
  months!: EntityTable<MonthNote, 'month'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'chulgeun-dojang') {
    super(name);
    this.version(1).stores({
      records: 'date',
      settings: 'id',
    });
    // v2: 월별 정리 메모. 하루 기록의 반나절·근무시간 필드는 선택 값이라 변환 불필요.
    this.version(2).stores({
      months: 'month',
    });
  }
}

// 미리보기판은 저장소를 따로 써서 테스트 기록이 실제 기록과 섞이지 않게 한다.
export const db = new DojangDB(__PREVIEW__ ? 'chulgeun-dojang-preview' : 'chulgeun-dojang');

// 새 버전 앱이 다른 창에서 DB 구조를 올리면, 이 (예전) 화면은 더 이상 저장할 수 없다.
// 저장이 조용히 실패하지 않도록 바로 새로고침해 새 버전으로 바꾼다.
db.on('versionchange', () => {
  db.close();
  if (typeof location !== 'undefined') location.reload();
  return false;
});
