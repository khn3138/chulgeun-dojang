import { describe, expect, it } from 'vitest';
import { appendQuickMemo, shouldAskWorked } from '../lib/memoRule';

describe('출근 안 한 날 메모 저장 시 확인', () => {
  const base = { worked: false, memo: '병원', originalMemo: '', workedTouched: false };

  it('출근 안 한 날에 새 메모를 쓰면 묻는다', () => {
    expect(shouldAskWorked(base)).toBe(true);
  });
  it('이미 출근 체크된 날은 묻지 않는다', () => {
    expect(shouldAskWorked({ ...base, worked: true })).toBe(false);
  });
  it('메모가 비어 있으면 묻지 않는다', () => {
    expect(shouldAskWorked({ ...base, memo: '   ' })).toBe(false);
  });
  it('메모를 바꾸지 않았으면 다시 묻지 않는다', () => {
    expect(shouldAskWorked({ ...base, originalMemo: '병원' })).toBe(false);
  });
  it('직접 [안 함]을 눌렀으면 묻지 않는다', () => {
    expect(shouldAskWorked({ ...base, workedTouched: true })).toBe(false);
  });
});

describe('빠른 메모', () => {
  it('빈 메모에는 그대로', () => expect(appendQuickMemo('', '연장')).toBe('연장'));
  it('뒤에 붙인다', () => expect(appendQuickMemo('연장', '야간')).toBe('연장, 야간'));
  it('중복은 붙이지 않는다', () => expect(appendQuickMemo('연장, 야간', '연장')).toBe('연장, 야간'));
});
