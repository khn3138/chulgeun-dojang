import { normalizeRemote } from './merge';
import type { RemoteRecord } from '../types';

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

export async function fetchSheetRecords(cfg: SheetConfig): Promise<RemoteRecord[]> {
  const url = new URL(cfg.endpoint);
  url.searchParams.set('token', cfg.token);
  const body = (await request(url.toString())) as { records?: unknown };
  return normalizeRemote(body.records);
}

export async function pushSheetRecords(cfg: SheetConfig, records: RemoteRecord[]): Promise<void> {
  // text/plain 으로 보내야 CORS 프리플라이트(OPTIONS)가 생기지 않는다 (Apps Script는 OPTIONS 미지원).
  await request(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: cfg.token, records }),
  });
}
