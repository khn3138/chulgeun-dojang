import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ensureInstallInfo } from './db/settings';
import { initPwaUpdate } from './lib/pwaUpdate';
import { initSync } from './sync/sync';
import './styles.css';

initPwaUpdate();

// 크롬이 저장 공간 부족 시 데이터를 지우지 않도록 요청.
void navigator.storage?.persist?.();

void ensureInstallInfo();
initSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
