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

export const db = new DojangDB();
