import { useState } from 'react';
import { BigButton } from '../components/BigButton';
import { InAppBanner } from '../components/InAppBanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { restoreRecord, saveRecord } from '../db/records';
import { computeDayNumbers, describeDay, formatHours, formatNumber, summarizeMonth } from '../lib/dayCount';
import { formatDayTitle, monthKeyOf } from '../lib/date';
import { scheduleSync } from '../sync/sync';
import { SAVE_FAILED } from '../lib/messages';
import { useMonthRecords, useToday } from '../hooks';
import type { Screen } from '../App';

interface Props {
  navigate: (screen: Exclude<Screen, 'home'>) => void;
  openDay: (date: string) => void;
}

export function Home({ navigate, openDay }: Props) {
  const today = useToday();
  const ym = monthKeyOf(today);
  const records = useMonthRecords(ym);
  const toast = useToast();
  const [confirmUnstamp, setConfirmUnstamp] = useState(false);

  const todayRecord = records?.find((r) => r.date === today);
  const worked = todayRecord?.worked ?? false;
  const dayNumbers = computeDayNumbers(records ?? [], ym);
  const summary = summarizeMonth(records ?? [], ym);
  const monthHours = formatHours(summary.hours);
  const todayDetail = todayRecord ? describeDay(todayRecord) : '';

  const setWorked = async (value: boolean) => {
    let result;
    try {
      result = await saveRecord(today, { ...(todayRecord ?? { memo: '' }), worked: value });
    } catch (e) {
      console.error(e);
      toast(SAVE_FAILED);
      return;
    }
    const { previous, changed } = result;
    if (!changed) return;
    scheduleSync();
    toast(value ? '저장됐어요 ✓' : '출근 기록을 지웠어요', {
      undo: async () => {
        await restoreRecord(today, previous);
        scheduleSync();
      },
    });
  };

  return (
    <main className="screen home">
      <InAppBanner />
      <h1 className="home-date">{formatDayTitle(today)}</h1>

      <BigButton
        size="huge"
        variant={worked ? 'done' : 'primary'}
        className="stamp-btn"
        disabled={records === undefined}
        onClick={() => (worked ? setConfirmUnstamp(true) : void setWorked(true))}
      >
        {records === undefined ? (
          '불러오는 중…'
        ) : worked ? (
          <>
            <span className="stamp-mark" aria-hidden="true">●</span>
            오늘 출근 완료 ✓
            <span className="stamp-sub">({dayNumbers.get(today)}일차)</span>
          </>
        ) : (
          <>
            오늘 출근 도장
            <br />
            찍기 ✓
          </>
        )}
      </BigButton>

      <p className="home-count">
        이번 달 출근 <strong>{summary.workedCount}일</strong> · 공수 <strong>{formatNumber(summary.days)}</strong>
      </p>
      {monthHours && <p className="home-hours">{monthHours}</p>}
      {(todayDetail || todayRecord?.memo) && (
        <p className="home-memo">📝 오늘: {[todayDetail, todayRecord?.memo].filter(Boolean).join(' · ')}</p>
      )}

      <div className="home-actions">
        <BigButton onClick={() => openDay(today)}>📝 메모 · 연장 쓰기</BigButton>
        <div className="row-2">
          <BigButton onClick={() => navigate('calendar')}>📅 달력 보기</BigButton>
          <BigButton onClick={() => navigate('export')}>📤 보내기</BigButton>
        </div>
        <BigButton variant="ghost" onClick={() => navigate('settings')}>
          ⚙️ 설정
        </BigButton>
      </div>

      {confirmUnstamp && (
        <ConfirmDialog
          title="출근 기록을 지울까요?"
          message={`${formatDayTitle(today)} 출근 도장을 지워요.`}
          actions={[
            {
              label: '네, 지울게요',
              variant: 'danger',
              onClick: () => {
                setConfirmUnstamp(false);
                void setWorked(false);
              },
            },
            { label: '아니요', variant: 'secondary', onClick: () => setConfirmUnstamp(false) },
          ]}
        />
      )}
    </main>
  );
}
