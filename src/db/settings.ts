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
