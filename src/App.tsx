import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { monthKeyOf, todayKey } from './lib/date';
import { useSettings } from './hooks';
import { Calendar } from './screens/Calendar';
import { DaySheet, type DaySheetHandle } from './screens/DaySheet';
import { Export } from './screens/Export';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';

export type Screen = 'home' | 'calendar' | 'export' | 'settings';

interface NavState {
  screen: Screen;
  sheet?: string;
}

const BASE_FONT_PX = 20;
const BUILD_KEY = 'chulgeun-dojang:build';

/** 새 버전으로 바뀐 뒤 처음 열면 한 번 알려 준다. (처음 설치 때는 조용히) */
function UpdateNotice() {
  const toast = useToast();
  useEffect(() => {
    try {
      const seen = localStorage.getItem(BUILD_KEY);
      if (seen && seen !== __BUILD_TIME__) toast(`새 버전으로 업데이트됐어요 ✓ (${__BUILD_TIME__})`);
      localStorage.setItem(BUILD_KEY, __BUILD_TIME__);
    } catch {
      /* 저장소를 못 쓰면 안내만 생략 */
    }
  }, [toast]);
  return null;
}

// 휴대폰 [뒤로] 버튼이 앱을 닫지 않고 이전 화면/바텀시트 닫기로 동작하도록 history를 쓴다.
export function App() {
  const settings = useSettings();
  const [screen, setScreen] = useState<Screen>('home');
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthKeyOf(todayKey()));
  const sheetRef = useRef<DaySheetHandle>(null);
  const sheetOpen = useRef(false);
  sheetOpen.current = sheetDate !== null;

  useEffect(() => {
    document.documentElement.style.fontSize = `${BASE_FONT_PX * settings.fontScale}px`;
  }, [settings.fontScale]);

  useEffect(() => {
    history.replaceState({ screen: 'home' } satisfies NavState, '');
    const onPop = (e: PopStateEvent) => {
      const st = (e.state as NavState | null) ?? { screen: 'home' };
      setScreen(st.screen);
      if (!st.sheet && sheetOpen.current) sheetRef.current?.requestClose();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: Exclude<Screen, 'home'>) => {
    history.pushState({ screen: next } satisfies NavState, '');
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  const goHome = useCallback(() => {
    if ((history.state as NavState | null)?.screen !== 'home') history.back();
    else setScreen('home');
  }, []);

  const openDay = useCallback(
    (date: string) => {
      history.pushState({ screen, sheet: date } satisfies NavState, '');
      setSheetDate(date);
    },
    [screen],
  );

  const onSheetClosed = useCallback(() => {
    setSheetDate(null);
    // 화면의 [닫기]로 닫았으면 바텀시트용 history 항목을 정리한다.
    if ((history.state as NavState | null)?.sheet) history.back();
  }, []);

  return (
    <ToastProvider>
      <UpdateNotice />
      {screen === 'home' && <Home navigate={navigate} openDay={openDay} />}
      {screen === 'calendar' && <Calendar month={month} onMonthChange={setMonth} onBack={goHome} openDay={openDay} />}
      {screen === 'export' && <Export month={month} onMonthChange={setMonth} onBack={goHome} />}
      {screen === 'settings' && <Settings onBack={goHome} />}
      {sheetDate && <DaySheet key={sheetDate} ref={sheetRef} date={sheetDate} onClosed={onSheetClosed} />}
    </ToastProvider>
  );
}
