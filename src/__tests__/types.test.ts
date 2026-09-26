import { describe, expect, it } from 'vitest';
import { normalizeDayData, roundHalfHour, sameDayData } from '../types';

describe('normalizeDayData', () => {
  it('출근 안 한 날은 반나절·시간을 비운다', () => {
    expect(normalizeDayData({ worked: false, memo: 'x', half: true, overtime: 2 })).toEqual({ worked: false, memo: 'x' });
  });
  it('0은 빼고 30분 단위로 맞춘다', () => {
    expect(normalizeDayData({ worked: true, memo: ' ', half: false, overtime: 1.26, night: 0 })).toEqual({
      worked: true,
      memo: '',
      overtime: 1.5,
    });
  });
  it('roundHalfHour', () => {
    expect(roundHalfHour(-1)).toBe(0);
    expect(roundHalfHour(NaN)).toBe(0);
    expect(roundHalfHour(0.74)).toBe(0.5);
    expect(roundHalfHour(99)).toBe(24);
  });
  it('sameDayData는 빈 필드와 0을 같게 본다', () => {
    expect(sameDayData({ worked: true, memo: '', overtime: 0 }, { worked: true, memo: '' })).toBe(true);
    expect(sameDayData({ worked: true, memo: '', overtime: 1 }, { worked: true, memo: '' })).toBe(false);
  });
});
