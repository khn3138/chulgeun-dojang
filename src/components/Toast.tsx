import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  undo?: () => void;
}

type ShowToast = (message: string, opts?: { undo?: () => void }) => void;

const ToastContext = createContext<ShowToast>(() => undefined);
const DismissContext = createContext<() => void>(() => undefined);

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/** 떠 있는 토스트를 바로 닫는다 (바텀시트를 열 때 화면을 가리지 않게) */
export function useDismissToast(): () => void {
  return useContext(DismissContext);
}

const DURATION_MS = 2000;
const DURATION_WITH_UNDO_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const seq = useRef(0);

  const show = useCallback<ShowToast>((message, opts) => {
    seq.current += 1;
    setToast({ id: seq.current, message, undo: opts?.undo });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? DURATION_WITH_UNDO_MS : DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      <DismissContext.Provider value={dismiss}>{children}</DismissContext.Provider>
      <div className="toast-area" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                className="toast-undo"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                되돌리기
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
