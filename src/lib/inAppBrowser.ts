/**
 * 카카오톡·네이버 등 앱 안의 브라우저(인앱 브라우저)는 크롬과 저장 공간이 따로다.
 * 거기서 기록하면 크롬/홈 화면 앱에서는 보이지 않으므로 크롬으로 열도록 안내한다.
 */
export function detectInAppBrowser(ua = navigator.userAgent): string | null {
  if (/KAKAOTALK/i.test(ua)) return '카카오톡';
  if (/NAVER\(inapp/i.test(ua)) return '네이버';
  if (/Instagram/i.test(ua)) return '인스타그램';
  if (/FBAN|FBAV/i.test(ua)) return '페이스북';
  if (/Line\//i.test(ua)) return '라인';
  if (/; wv\)/.test(ua)) return '다른 앱';
  return null;
}

/** 크롬(안드로이드) 또는 기본 브라우저로 지금 주소를 연다. */
export function openInChrome(url = location.href): void {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return;
  }
  if (/Android/i.test(ua)) {
    const u = new URL(url);
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
    return;
  }
  window.open(url, '_blank');
}
