import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ensureInstallInfo } from './db/settings';
import { initSync } from './sync/sync';
import './styles.css';

// 새 버전이 배포되면 서비스 워커가 받아 두었다가, 앱을 내렸을 때 적용한다.
// 사용 중에 새로고침하면 입력 중인 내용이 날아가므로 화면이 보일 때는 적용하지 않는다.
// (어르신은 아무것도 안 해도 다음에 열 때 새 버전)
let applyUpdate: (() => void) | null = null;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    applyUpdate = () => void updateSW(true);
    if (document.visibilityState === 'hidden') applyUpdate();
  },
});
document.addEventListener('visibilitychange', () => {
  // 바텀시트의 숨김 시 저장이 끝나도록 잠깐 기다린 뒤 적용
  if (document.visibilityState === 'hidden' && applyUpdate) setTimeout(() => applyUpdate?.(), 1000);
});

// 크롬이 저장 공간 부족 시 데이터를 지우지 않도록 요청.
void navigator.storage?.persist?.();

void ensureInstallInfo();
initSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
