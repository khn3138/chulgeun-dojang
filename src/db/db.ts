import Dexie, { type EntityTable } from 'dexie';
import type { DayRecord, Settings } from '../types';

export class DojangDB extends Dexie {
  records!: EntityTable<DayRecord, 'date'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'chulgeun-dojang') {
    super(name);
    this.version(1).stores({
      records: 'date',
      settings: 'id',
    });
  }
}

export const db = new DojangDB();
