import { db } from './db';
import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  workerName: '',
  fontScale: 1,
};

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('main')) };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    await db.settings.put({ ...current, ...patch, id: 'main' });
  });
}

/** 처음 실행 시 저장소 ID와 시작 시각을 남긴다 (기록이 사라졌을 때 원인 확인용). */
export async function ensureInstallInfo(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    if (current.installId) return;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const id = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => chars[n % chars.length]).join('');
    await db.settings.put({ ...current, id: 'main', installId: id, installedAt: Date.now() });
  });
}
