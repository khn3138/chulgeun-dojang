import { describe, expect, it } from 'vitest';
import { detectInAppBrowser } from '../lib/inAppBrowser';

describe('인앱 브라우저 감지', () => {
  it('카카오톡', () => {
    expect(
      detectInAppBrowser('Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36;KAKAOTALK 2410230'),
    ).toBe('카카오톡');
  });
  it('일반 크롬은 아님', () => {
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36')).toBeNull();
  });
});
