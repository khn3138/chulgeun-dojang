import { formatNumber } from '../lib/dayCount';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const STEP = 0.5;
const MAX = 24;

/** 연장 [−] 1.5시간 [+] — 30분 단위 */
export function HourStepper({ label, value, onChange, disabled }: Props) {
  return (
    <div className={`stepper ${value > 0 ? 'has-value' : ''}`}>
      <span className="stepper-label">{label}</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(0, value - STEP))}
        disabled={disabled || value <= 0}
        aria-label={`${label} 30분 줄이기`}
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {value > 0 ? `${formatNumber(value)}시간` : '없음'}
      </span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(MAX, value + STEP))}
        disabled={disabled || value >= MAX}
        aria-label={`${label} 30분 늘리기`}
      >
        +
      </button>
    </div>
  );
}
