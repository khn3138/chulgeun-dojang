import type { StampColor, StampIcon } from '../types';

interface Props {
  /** N일차. 숫자 표시를 끄면 넘기지 않는다 */
  number?: number;
  half?: boolean;
  icon: StampIcon;
}

/** 달력의 출근 도장. 색은 부모의 stamp-{color} 클래스(CSS 변수)로 정한다. */
export function Stamp({ number, half, icon }: Props) {
  if (icon === 'hammer') {
    return (
      <span className={`cal-stamp hammer ${half ? 'half' : ''}`}>
        <HammerIcon />
        {number !== undefined && <b className="cal-stamp-num">{number}</b>}
      </span>
    );
  }
  return <span className={`cal-stamp circle ${half ? 'half' : ''}`}>{number}</span>;
}

// Tabler Icons "hammer" (MIT) 기반, 머리 부분을 채움
function HammerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="hammer-svg">
      <path d="M11.414 10l-7.383 7.418a2.091 2.091 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0l7.407 -7.385" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.121 15.293l2.586 -2.586a1 1 0 0 0 0 -1.414l-7.586 -7.586a1 1 0 0 0 -1.414 0l-2.586 2.586a1 1 0 0 0 0 1.414l7.586 7.586a1 1 0 0 0 1.414 0z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export const STAMP_COLORS: { value: StampColor; label: string }[] = [
  { value: 'green', label: '초록' },
  { value: 'red', label: '빨강' },
  { value: 'blue', label: '파랑' },
  { value: 'yellow', label: '노랑' },
];

export const STAMP_ICONS: { value: StampIcon; label: string }[] = [
  { value: 'circle', label: '● 동그라미' },
  { value: 'hammer', label: '🔨 망치' },
];
