import { normalizeRemote, normalizeRemoteMonths } from './merge';
import { HOUR_KINDS, type RemoteMonth, type RemoteRecord } from '../types';

export interface SheetConfig {
  endpoint: string;
  token: string;
}

const TIMEOUT_MS = 20_000;

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!body || body.ok !== true) throw new Error(body?.error || '알 수 없는 응답');
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export interface SheetData {
  records: RemoteRecord[];
  /** 예전 버전 Apps Script는 월 메모를 모르므로 null */
  months: RemoteMonth[] | null;
}

export async function fetchSheet(cfg: SheetConfig): Promise<SheetData> {
  const url = new URL(cfg.endpoint);
  url.searchParams.set('token', cfg.token);
  const body = (await request(url.toString())) as { records?: unknown; months?: unknown };
  return {
    records: normalizeRemote(body.records),
    months: Array.isArray(body.months) ? normalizeRemoteMonths(body.months) : null,
  };
}

/** 시트 한 줄 형태: amount(1 / 0.5 / 0)와 시간 열을 채워 보낸다. */
function toSheetRow(r: RemoteRecord) {
  const row: Record<string, unknown> = {
    date: r.date,
    worked: r.worked,
    memo: r.memo,
    updatedAt: r.updatedAt,
    amount: r.worked ? (r.half ? 0.5 : 1) : 0,
  };
  for (const k of HOUR_KINDS) row[k] = r[k] ?? 0;
  return row;
}

export async function pushSheet(cfg: SheetConfig, records: RemoteRecord[], months: RemoteMonth[]): Promise<void> {
  // text/plain 으로 보내야 CORS 프리플라이트(OPTIONS)가 생기지 않는다 (Apps Script는 OPTIONS 미지원).
  await request(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: cfg.token, records: records.map(toSheetRow), months }),
  });
}
