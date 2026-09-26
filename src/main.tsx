import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initSync } from './sync/sync';
import './styles.css';

// 새 버전이 배포되면 서비스 워커가 알아서 받아 적용한다 (어르신은 아무것도 안 해도 됨).
registerSW({ immediate: true });

// 크롬이 저장 공간 부족 시 데이터를 지우지 않도록 요청.
void navigator.storage?.persist?.();

initSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
