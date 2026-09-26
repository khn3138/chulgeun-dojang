import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BigButton } from '../components/BigButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { updateSettings } from '../db/settings';
import { buildBackup, importBackup } from '../lib/backup';
import { downloadFile } from '../lib/share';
import { todayKey } from '../lib/date';
import { syncNow } from '../sync/sync';
import { useSettings } from '../hooks';
import type { FontScale } from '../types';

const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 1, label: '보통' },
  { value: 1.2, label: '크게' },
  { value: 1.4, label: '아주 크게' },
];

/** 입력칸: 타이핑하는 동안은 화면 상태만 바꾸고, 칸을 벗어날 때 저장한다. */
function SettingInput(props: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(props.value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(props.value);
  }, [props.value]);
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={draft}
        placeholder={props.placeholder}
        autoComplete="off"
        onFocus={() => (focused.current = true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          focused.current = false;
          if (draft !== props.value) props.onSave(draft);
        }}
      />
    </div>
  );
}

export function Settings({ onBack }: { onBack: () => void }) {
  const settings = useSettings();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const save = async (patch: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(patch);
    toast('저장됐어요 ✓');
  };

  const backupNow = async () => {
    // 입력 중인 칸이 있으면 먼저 저장되도록 포커스를 뺀다.
    (document.activeElement as HTMLElement | null)?.blur();
    await new Promise((r) => setTimeout(r, 50));
    setSyncing(true);
    setSyncMessage(null);
    const res = await syncNow({ pull: true });
    setSyncing(false);
    setSyncMessage(res.ok ? '백업을 마쳤어요 ✓' : `백업하지 못했어요: ${res.error ?? ''}`);
  };

  const exportJson = async () => {
    const backup = await buildBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadFile(blob, `chulgeun-dojang-backup-${todayKey()}.json`);
    toast(`${backup.records.length}일치 기록을 파일로 저장했어요 ✓`);
  };

  const importJson = async (file: File) => {
    try {
      const n = await importBackup(await file.text());
      toast(n > 0 ? `${n}일치 기록을 가져왔어요 ✓` : '새로 가져올 기록이 없어요');
      if (n > 0) void syncNow({ pull: false });
    } catch (e) {
      toast(e instanceof Error ? e.message : '가져오지 못했어요');
    }
  };

  const lastSync = settings.lastSyncAt
    ? `${formatDistanceToNow(settings.lastSyncAt, { locale: ko, addSuffix: true })}`
    : '아직 없음';

  return (
    <main className="screen settings">
      <ScreenHeader title="설정" onBack={onBack} />

      <section className="card">
        <h2>기본</h2>
        <SettingInput
          id="workerName"
          label="이름 (근무일지 제목에 들어가요)"
          value={settings.workerName}
          placeholder="예: 홍길동"
          onSave={(v) => void save({ workerName: v.trim() })}
        />
        <div className="field">
          <span className="field-label">글자 크기</span>
          <div className="seg">
            {FONT_SCALES.map((f) => (
              <button
                type="button"
                key={f.value}
                className={settings.fontScale === f.value ? 'active' : ''}
                aria-pressed={settings.fontScale === f.value}
                onClick={() => void save({ fontScale: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>구글 시트 백업</h2>
        <p className="hint">보호자가 한 번만 설정하면 돼요. 설정 방법은 안내 문서(README)를 보세요.</p>
        <SettingInput
          id="endpoint"
          label="Apps Script 웹앱 주소"
          type="url"
          value={settings.sheetEndpoint ?? ''}
          placeholder="https://script.google.com/macros/s/…/exec"
          onSave={(v) => void save({ sheetEndpoint: v.trim() })}
        />
        <SettingInput
          id="token"
          label="비밀값 (SYNC_TOKEN)"
          value={settings.syncToken ?? ''}
          onSave={(v) => void save({ syncToken: v.trim() })}
        />
        <BigButton variant="primary" onClick={() => void backupNow()} disabled={syncing || !settings.sheetEndpoint}>
          {syncing ? '백업하는 중…' : '☁️ 지금 백업하기'}
        </BigButton>
        <p className="hint">마지막 백업: {lastSync}</p>
        {syncMessage && <p className="sync-message">{syncMessage}</p>}
      </section>

      <section className="card">
        <h2>백업 파일</h2>
        <p className="hint">폰을 바꿀 때 쓰세요. 시트 연동 없이도 기록을 옮길 수 있어요.</p>
        <BigButton onClick={() => void exportJson()}>💾 백업 파일 만들기</BigButton>
        <BigButton onClick={() => fileInput.current?.click()}>📂 백업 파일 가져오기</BigButton>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importJson(f);
          }}
        />
      </section>

      <p className="version">출근도장 v{__APP_VERSION__}</p>
    </main>
  );
}
