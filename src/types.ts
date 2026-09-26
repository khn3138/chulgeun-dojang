/** 하루치 기록. 기본 키는 date('YYYY-MM-DD', 로컬 날짜). */
export interface DayRecord {
  date: string;
  /** 출근 여부 */
  worked: boolean;
  /** 자유 메모 (연장, 야간, 추가근무 등). 빈 문자열 허용 */
  memo: string;
  /** epoch ms, 동기화 충돌 판단용 */
  updatedAt: number;
  /** 구글 시트 반영 여부 */
  synced: boolean;
}

export type FontScale = 1 | 1.2 | 1.4;

export interface Settings {
  id: 'main';
  /** 내보내기 이미지 상단에 표시할 이름 */
  workerName: string;
  /** Apps Script 웹앱 URL */
  sheetEndpoint?: string;
  /** Apps Script에 함께 보내는 간단한 비밀값 */
  syncToken?: string;
  fontScale: FontScale;
  /** 마지막으로 시트 백업에 성공한 시각 (epoch ms) */
  lastSyncAt?: number;
}

/** 시트/백업 파일과 주고받는 형태 (synced 플래그 제외) */
export interface RemoteRecord {
  date: string;
  worked: boolean;
  memo: string;
  updatedAt: number;
}

/** 출근도 메모도 없는 기록 = 지워진 날(삭제 표시). 동기화를 위해 행은 남겨 둔다. */
export function isEmptyRecord(r: Pick<DayRecord, 'worked' | 'memo'>): boolean {
  return !r.worked && r.memo.trim() === '';
}
