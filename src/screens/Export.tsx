import { useLayoutEffect, useRef, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { MonthNav } from '../components/MonthNav';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { pngToPdf, renderPng } from '../lib/exportImage';
import { shareOrDownload } from '../lib/share';
import { formatMonthTitle } from '../lib/date';
import { useMonthRecords, useSettings } from '../hooks';
import { ExportSheet } from './ExportSheet';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  onBack: () => void;
}

const SHEET_WIDTH = 720;

export function Export({ month, onMonthChange, onBack }: Props) {
  const settings = useSettings();
  const records = useMonthRecords(month);
  const toast = useToast();
  const [includeMemoOnly, setIncludeMemoOnly] = useState(false);
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  // 미리보기: 실제 크기(720px)로 그린 표를 화면 폭에 맞게 줄여 보여준다.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const sheet = sheetRef.current;
    if (!wrap || !sheet) return;
    const update = () => {
      setScale(Math.min(1, wrap.clientWidth / SHEET_WIDTH));
      setSheetHeight(sheet.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  const fileBase = `work-diary-${month}`; // 한글 파일명은 일부 브라우저에서 깨져 영문으로
  const title = `${formatMonthTitle(month)} 근무일지`;

  const makePng = async () => {
    setGeneratedAt(new Date());
    // 생성 시각이 표에 반영된 뒤 찍는다.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return renderPng(sheetRef.current!);
  };

  const run = async (kind: 'png' | 'pdf') => {
    if (busy || !sheetRef.current) return;
    setBusy(kind);
    try {
      const png = await makePng();
      const file =
        kind === 'png'
          ? new File([png], `${fileBase}.png`, { type: 'image/png' })
          : new File([await pngToPdf(png)], `${fileBase}.pdf`, { type: 'application/pdf' });
      const result = await shareOrDownload(file, title);
      if (result === 'downloaded') toast(kind === 'png' ? '사진을 저장했어요 ✓' : 'PDF를 저장했어요 ✓');
    } catch (e) {
      console.error(e);
      toast('만들지 못했어요. 앱을 다시 열어 주세요');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="screen">
      <ScreenHeader title="보내기" onBack={onBack} />
      <MonthNav month={month} onChange={onMonthChange} />

      <div className="export-actions">
        <BigButton variant="primary" onClick={() => void run('png')} disabled={!!busy || !records}>
          {busy === 'png' ? '만드는 중…' : '📷 사진으로 보내기'}
        </BigButton>
        <BigButton onClick={() => void run('pdf')} disabled={!!busy || !records}>
          {busy === 'pdf' ? '만드는 중…' : '📄 PDF로 저장'}
        </BigButton>
        <label className="check-row">
          <input type="checkbox" checked={includeMemoOnly} onChange={(e) => setIncludeMemoOnly(e.target.checked)} />
          메모만 있는 날(쉬는 날)도 넣기
        </label>
      </div>

      <p className="preview-label">미리보기</p>
      <div className="preview-wrap" ref={wrapRef} style={{ height: sheetHeight * scale }}>
        <div className="preview-scale" style={{ transform: `scale(${scale})`, width: SHEET_WIDTH }}>
          <ExportSheet
            ref={sheetRef}
            month={month}
            workerName={settings.workerName}
            records={records ?? []}
            includeMemoOnly={includeMemoOnly}
            generatedAt={generatedAt}
          />
        </div>
      </div>
    </main>
  );
}
