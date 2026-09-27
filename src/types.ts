/** 시간 합계를 내는 근무 항목 */
export const HOUR_KINDS = ['overtime', 'early', 'night', 'extra'] as const;
export type HourKind = (typeof HOUR_KINDS)[number];
export const HOUR_LABELS: Record<HourKind, string> = {
  overtime: '연장',
  early: '조기출근',
  night: '야간',
  extra: '추가근무',
};

/** 사용자가 고치는 하루치 내용 */
export interface DayData {
  /** 출근 여부 */
  worked: boolean;
  /** 자유 메모. 빈 문자열 허용 */
  memo: string;
  /** 반공수 (월 공수 합계에서 0.5) */
  half?: boolean;
  /** 연장근무 시간 (30분 단위) */
  overtime?: number;
  /** 조기출근 시간 (연장 수당 2배) */
  early?: number;
  /** 야간근무 시간 */
  night?: number;
  /** 추가근무 시간 */
  extra?: number;
}

/** 하루치 기록. 기본 키는 date('YYYY-MM-DD', 로컬 날짜). */
export interface DayRecord extends DayData {
  date: string;
  /** epoch ms, 동기화 충돌 판단용 */
  updatedAt: number;
  /** 구글 시트 반영 여부 */
  synced: boolean;
}

/** 월별 정리 메모. 기본 키는 month('YYYY-MM') */
export interface MonthNote {
  month: string;
  memo: string;
  updatedAt: number;
  synced: boolean;
}

export type FontScale = 1 | 1.2 | 1.4;
export type StampIcon = 'circle' | 'hammer';
export type StampColor = 'green' | 'red' | 'blue' | 'yellow';
/** 연장·야간·추가근무 [+][−] 한 번에 바뀌는 시간 */
export type HourStep = 0.5 | 1;

export interface Settings {
  id: 'main';
  /** 내보내기 이미지 상단에 표시할 이름 */
  workerName: string;
  /** Apps Script 웹앱 URL */
  sheetEndpoint?: string;
  /** Apps Script에 함께 보내는 간단한 비밀값 */
  syncToken?: string;
  fontScale: FontScale;
  /** 연장·야간·추가근무 입력 단위 (기본 30분) */
  hourStep?: HourStep;
  /** 날짜 창에 보일 시간 줄 (연장은 항상). 기본: 조기출근만 보임 */
  showEarly?: boolean;
  showNight?: boolean;
  showExtra?: boolean;
  /** 합계에 "연장 환산 = 연장 + 조기출근×2" 표시 (기본 꺼짐) */
  showOvertimeEquivalent?: boolean;
  /** 달력: 출근 도장 안에 N일차 숫자 표시 (기본 켜짐) */
  calShowNumber?: boolean;
  /** 달력: 출근 도장 모양 (기본 동그라미) */
  calIcon?: StampIcon;
  /** 달력: 출근 도장 색 (기본 초록) */
  calColor?: StampColor;
  /** 마지막으로 시트 백업에 성공한 시각 (epoch ms) */
  lastSyncAt?: number;
  /** 이 저장소(폰의 이 앱)를 구분하는 짧은 ID. 저장소가 지워지면 새로 생긴다. */
  installId?: string;
  /** 이 저장소를 처음 쓴 시각. 데이터가 지워졌는지 확인하는 용도 */
  installedAt?: number;
}

/** 시트/백업 파일과 주고받는 형태 (synced 플래그 제외) */
export type RemoteRecord = Omit<DayRecord, 'synced'>;
export type RemoteMonth = Omit<MonthNote, 'synced'>;

export function hoursOf(r: DayData, kind: HourKind): number {
  return r[kind] ?? 0;
}

/** 출근도 메모도 없는 기록 = 지워진 날(삭제 표시). 동기화를 위해 행은 남겨 둔다. */
export function isEmptyRecord(r: DayData): boolean {
  return !r.worked && r.memo.trim() === '';
}

/**
 * 저장 전 정리: 출근 안 한 날은 반공수·근무시간을 비우고,
 * 시간은 30분 단위로 맞춘다. 0인 값은 필드를 두지 않는다.
 */
export function normalizeDayData(d: DayData): DayData {
  const out: DayData = { worked: d.worked, memo: d.memo.trim() === '' ? '' : d.memo };
  if (!d.worked) return out;
  if (d.half) out.half = true;
  for (const k of HOUR_KINDS) {
    const h = roundHalfHour(d[k] ?? 0);
    if (h > 0) out[k] = h;
  }
  return out;
}

export function roundHalfHour(h: number): number {
  if (!Number.isFinite(h) || h <= 0) return 0;
  return Math.min(24, Math.round(h * 2) / 2);
}

export function sameDayData(a: DayData, b: DayData): boolean {
  const x = normalizeDayData(a);
  const y = normalizeDayData(b);
  return (
    x.worked === y.worked &&
    x.memo === y.memo &&
    !!x.half === !!y.half &&
    HOUR_KINDS.every((k) => (x[k] ?? 0) === (y[k] ?? 0))
  );
}

/** 조기출근은 연장 수당 2배 */
export const EARLY_MULTIPLIER = 2;

/** 날짜 창에 보일 시간 줄. 숨긴 항목이라도 값이 있으면 보여 준다(기록이 안 보이게 되지 않도록). */
export function visibleHourKinds(settings: Pick<Settings, 'showEarly' | 'showNight' | 'showExtra'>, data?: DayData): HourKind[] {
  const on: Record<HourKind, boolean> = {
    overtime: true,
    early: settings.showEarly ?? true,
    night: settings.showNight ?? false,
    extra: settings.showExtra ?? false,
  };
  return HOUR_KINDS.filter((k) => on[k] || (data?.[k] ?? 0) > 0);
}
