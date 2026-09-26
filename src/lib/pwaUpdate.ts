import { registerSW } from 'virtual:pwa-register';

// 새 버전(서비스 워커) 받기·적용.
// - 앱을 켤 때뿐 아니라 내렸다가 다시 볼 때도 새 버전을 확인한다.
//   (홈 화면 앱은 다시 열어도 페이지를 새로 불러오지 않아 브라우저가 스스로 확인하지 않는다)
// - 적용(새로고침)은 입력 중인 내용이 날아가지 않을 때만 한다:
//   화면에 돌아온 직후 아직 아무것도 누르지 않았을 때, 또는 앱을 내렸을 때.

const QUIET_MS = 8000;

let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let pending = false;
let visibleSince = Date.now();
let touchedSinceVisible = false;

function editorOpen(): boolean {
  return document.querySelector('.sheet, .dialog, input:focus, textarea:focus') !== null;
}

function apply() {
  if (!pending || !updateSW) return;
  pending = false;
  void updateSW(true);
}

/** 돌아온 직후 아직 아무것도 안 눌렀다면 바로 적용해도 잃을 게 없다. */
function applyIfQuiet() {
  if (!touchedSinceVisible && !editorOpen() && Date.now() - visibleSince < QUIET_MS) apply();
}

export function initPwaUpdate(): void {
  updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registration = r;
    },
    onNeedRefresh() {
      pending = true;
      if (document.visibilityState === 'hidden') apply();
      else applyIfQuiet();
    },
  });

  document.addEventListener(
    'pointerdown',
    () => {
      touchedSinceVisible = true;
    },
    { capture: true },
  );

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      visibleSince = Date.now();
      touchedSinceVisible = false;
      if (pending) applyIfQuiet();
      else void registration?.update().catch(() => undefined);
    } else if (pending) {
      // 바텀시트가 숨김 시 저장을 끝내도록 잠깐 기다린다 (백그라운드에서 타이머가 멈추면 돌아왔을 때 적용)
      setTimeout(apply, 1000);
    }
  });
}

/** 설정의 [새 버전 확인] 버튼용 */
export async function checkForUpdateNow(): Promise<'updating' | 'latest' | 'unavailable'> {
  if (!registration) return 'unavailable';
  try {
    await registration.update();
  } catch {
    return 'unavailable';
  }
  // 새 버전을 내려받아 설치할 때까지 잠깐 기다린다
  for (let i = 0; i < 40 && !pending && (registration.installing || i < 4); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!pending && registration.waiting) pending = true;
  if (!pending) return 'latest';
  setTimeout(apply, 600);
  return 'updating';
}
