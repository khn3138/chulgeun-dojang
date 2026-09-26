/**
 * 날짜 상세를 닫을 때 "이 날 출근하셨나요?"를 물어볼지 결정한다.
 * - 이미 출근으로 체크된 날은 묻지 않는다.
 * - 메모가 비어 있으면 묻지 않는다.
 * - 메모를 바꾸지 않았으면 (이미 저장된 쉬는 날 메모) 다시 묻지 않는다.
 * - 이번에 직접 [안 함]을 누른 경우는 이미 답한 것이므로 묻지 않는다.
 */
export function shouldAskWorked(input: {
  worked: boolean;
  memo: string;
  originalMemo: string;
  workedTouched: boolean;
}): boolean {
  if (input.worked) return false;
  if (input.memo.trim() === '') return false;
  if (input.workedTouched) return false;
  return input.memo.trim() !== input.originalMemo.trim();
}

/** 빠른 메모 버튼: 기존 메모 뒤에 붙인다. 이미 있으면 그대로 둔다. */
export function appendQuickMemo(memo: string, word: string): string {
  const trimmed = memo.trimEnd();
  if (trimmed === '') return word;
  const parts = trimmed.split(/[,\s]+/);
  if (parts.includes(word)) return memo;
  return `${trimmed}, ${word}`;
}
