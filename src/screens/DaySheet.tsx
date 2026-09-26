import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HourStepper } from '../components/HourStepper';
import { useDismissToast, useToast } from '../components/Toast';
import { getRecord, restoreRecord, saveRecord } from '../db/records';
import { formatDayTitle } from '../lib/date';
import { appendQuickMemo, shouldAskWorked } from '../lib/memoRule';
import { scheduleSync } from '../sync/sync';
import { SAVE_FAILED } from '../lib/messages';
import { HOUR_KINDS, HOUR_LABELS, normalizeDayData, type DayData, type HourKind } from '../types';

// 연장·야간·추가근무는 시간 버튼으로 입력하므로 메모 버튼에서는 뺐다.
const QUICK_MEMOS = ['조퇴', '지각'];
const EMPTY: DayData = { worked: false, memo: '' };

export interface DaySheetHandle {
  /** 뒤로 가기 버튼 등으로 닫힐 때. 필요하면 출근 여부를 묻고 저장한 뒤 onClosed를 부른다. */
  requestClose: () => void;
}

interface Props {
  date: string;
  onClosed: () => void;
}

export const DaySheet = forwardRef<DaySheetHandle, Props>(function DaySheet({ date, onClosed }, ref) {
  const toast = useToast();
  const dismissToast = useDismissToast();
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<DayData>(EMPTY);
  const [asking, setAsking] = useState(false);
  const original = useRef<DayData>(EMPTY);
  const workedTouched = useRef(false);
  const closing = useRef(false);
  const state = useRef(data);
  state.current = data;
  const { worked, memo } = data;
  const setMemo = (fn: (m: string) => string) => setData((d) => ({ ...d, memo: fn(d.memo) }));

  useEffect(dismissToast, [dismissToast]);

  useEffect(() => {
    let alive = true;
    void getRecord(date).then((r) => {
      if (!alive) return;
      const init: DayData = r ? normalizeDayData(r) : EMPTY;
      original.current = init;
      setData(init);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [date]);

  // 앱을 내리거나 화면이 꺼지면 묻지 않고 지금 상태 그대로 저장해 둔다.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && loaded && !closing.current) {
        void saveRecord(date, state.current)
          .then(({ changed }) => {
            if (changed) {
              original.current = { ...state.current };
              scheduleSync(0);
            }
          })
          .catch((e) => console.error(e));
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [date, loaded]);

  const finish = async (final: DayData) => {
    closing.current = true;
    // 저장을 기다리지 않고 바로 닫는다 (느린 폰에서 버튼이 안 눌린 것처럼 보이지 않게).
    onClosed();
    let result;
    try {
      result = await saveRecord(date, final);
    } catch (e) {
      console.error(e);
      toast(SAVE_FAILED);
      return;
    }
    const { previous, changed } = result;
    if (changed) {
      scheduleSync();
      toast('저장됐어요 ✓', {
        undo: async () => {
          await restoreRecord(date, previous);
          scheduleSync();
        },
      });
    }
  };

  const requestClose = () => {
    if (closing.current || asking) return;
    if (!loaded) {
      onClosed();
      return;
    }
    const cur = state.current;
    if (
      shouldAskWorked({
        worked: cur.worked,
        memo: cur.memo,
        originalMemo: original.current.memo,
        workedTouched: workedTouched.current,
      })
    ) {
      setAsking(true);
      return;
    }
    void finish(cur);
  };

  useImperativeHandle(ref, () => ({ requestClose }));

  const toggleWorked = (value: boolean) => {
    workedTouched.current = true;
    // [안 함]을 누르면 반나절·근무시간도 비운다.
    setData((d) => (value ? { ...d, worked: true } : normalizeDayData({ ...d, worked: false })));
  };

  const setHalf = (half: boolean) => setData((d) => ({ ...d, worked: true, half }));

  // 시간을 넣으면 출근한 날로 본다.
  const setHours = (kind: HourKind, value: number) => setData((d) => ({ ...d, worked: d.worked || value > 0, [kind]: value }));

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && requestClose()}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        // 메모 입력 중(키보드가 떠 있을 때) 버튼을 누르면, 먼저 키보드가 내려가며 화면이 움직여
        // 누른 버튼이 빗나가는 일이 생긴다. 버튼을 누를 때는 입력칸 포커스를 유지해 이를 막는다.
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) e.preventDefault();
        }}
      >
        <h2 id="sheet-title" className="sheet-title">
          {formatDayTitle(date)}
        </h2>

        <div className="worked-toggle" role="radiogroup" aria-label="출근 여부">
          <button
            type="button"
            role="radio"
            aria-checked={worked}
            className={`toggle-btn ${worked ? 'on-worked' : ''}`}
            onClick={() => toggleWorked(true)}
            disabled={!loaded}
          >
            {worked ? '● ' : ''}출근함
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!worked}
            className={`toggle-btn ${!worked ? 'on-off' : ''}`}
            onClick={() => toggleWorked(false)}
            disabled={!loaded}
          >
            안 함
          </button>
        </div>

        {worked && (
          <div className="seg day-amount" role="radiogroup" aria-label="근무량">
            <button type="button" role="radio" aria-checked={!data.half} className={!data.half ? 'active' : ''} onClick={() => setHalf(false)}>
              하루
            </button>
            <button type="button" role="radio" aria-checked={!!data.half} className={data.half ? 'active' : ''} onClick={() => setHalf(true)}>
              반나절
            </button>
          </div>
        )}

        <div className="steppers">
          {HOUR_KINDS.map((k) => (
            <HourStepper key={k} label={HOUR_LABELS[k]} value={data[k] ?? 0} onChange={(v) => setHours(k, v)} disabled={!loaded} />
          ))}
        </div>

        <label className="memo-label" htmlFor="memo">
          메모
        </label>
        <textarea
          id="memo"
          className="memo-input"
          rows={3}
          value={memo}
          placeholder="예: 조퇴, 현장 이동"
          onChange={(e) => setData((d) => ({ ...d, memo: e.target.value }))}
          disabled={!loaded}
        />
        <div className="quick-memos">
          {QUICK_MEMOS.map((w) => (
            <button type="button" key={w} className="chip" onClick={() => setMemo((m) => appendQuickMemo(m, w))} disabled={!loaded}>
              + {w}
            </button>
          ))}
        </div>

        <div className="sheet-footer">
          <BigButton variant="primary" onClick={requestClose}>
            닫기 (자동 저장)
          </BigButton>
        </div>
      </section>

      {asking && (
        <ConfirmDialog
          title="이 날 출근하셨나요?"
          message="메모만 적은 날(쉬는 날)일 수도 있어서 여쭤봐요."
          actions={[
            {
              label: '네, 출근으로 등록',
              variant: 'primary',
              onClick: () => {
                setAsking(false);
                void finish({ ...state.current, worked: true });
              },
            },
            {
              label: '아니요, 메모만 저장',
              variant: 'secondary',
              onClick: () => {
                setAsking(false);
                void finish({ ...state.current, worked: false });
              },
            },
          ]}
        />
      )}
    </div>
  );
});
