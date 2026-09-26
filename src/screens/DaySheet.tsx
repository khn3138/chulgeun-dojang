import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { getRecord, restoreRecord, saveRecord } from '../db/records';
import { formatDayTitle } from '../lib/date';
import { appendQuickMemo, shouldAskWorked } from '../lib/memoRule';
import { scheduleSync } from '../sync/sync';

const QUICK_MEMOS = ['연장', '야간', '추가근무', '조퇴', '반차'];

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
  const [loaded, setLoaded] = useState(false);
  const [worked, setWorked] = useState(false);
  const [memo, setMemo] = useState('');
  const [asking, setAsking] = useState(false);
  const original = useRef({ worked: false, memo: '' });
  const workedTouched = useRef(false);
  const closing = useRef(false);
  const state = useRef({ worked, memo });
  state.current = { worked, memo };

  useEffect(() => {
    let alive = true;
    void getRecord(date).then((r) => {
      if (!alive) return;
      const init = { worked: r?.worked ?? false, memo: r?.memo ?? '' };
      original.current = init;
      setWorked(init.worked);
      setMemo(init.memo);
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
        void saveRecord(date, state.current).then(({ changed }) => {
          if (changed) {
            original.current = { ...state.current };
            scheduleSync(0);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [date, loaded]);

  const finish = async (final: { worked: boolean; memo: string }) => {
    closing.current = true;
    const { previous, changed } = await saveRecord(date, final);
    onClosed();
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
    setWorked(value);
  };

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && requestClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
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

        <label className="memo-label" htmlFor="memo">
          메모
        </label>
        <textarea
          id="memo"
          className="memo-input"
          rows={3}
          value={memo}
          placeholder="예: 연장, 야간"
          onChange={(e) => setMemo(e.target.value)}
          disabled={!loaded}
        />
        <div className="quick-memos">
          {QUICK_MEMOS.map((w) => (
            <button type="button" key={w} className="chip" onClick={() => setMemo((m) => appendQuickMemo(m, w))} disabled={!loaded}>
              + {w}
            </button>
          ))}
        </div>

        <BigButton variant="primary" onClick={requestClose}>
          닫기 (자동 저장)
        </BigButton>
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
                void finish({ worked: true, memo: state.current.memo });
              },
            },
            {
              label: '아니요, 메모만 저장',
              variant: 'secondary',
              onClick: () => {
                setAsking(false);
                void finish({ worked: false, memo: state.current.memo });
              },
            },
          ]}
        />
      )}
    </div>
  );
});
