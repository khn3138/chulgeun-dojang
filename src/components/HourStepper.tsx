import { formatNumber } from '../lib/dayCount';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** [+][−] 한 번에 바뀌는 시간 (0.5 = 30분, 1 = 1시간) */
  step?: number;
}

const MAX = 24;

/** 연장 [−] 1.5시간 [+] — 설정의 입력 단위(30분/1시간)만큼 바뀐다 */
export function HourStepper({ label, value, onChange, disabled, step = 0.5 }: Props) {
  const unit = step === 1 ? '1시간' : '30분';
  return (
    <div className={`stepper ${value > 0 ? 'has-value' : ''}`}>
      <span className="stepper-label">{label}</span>
      <span className="stepper-controls">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(0, value - step))}
        disabled={disabled || value <= 0}
        aria-label={`${label} ${unit} 줄이기`}
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {value > 0 ? `${formatNumber(value)}시간` : '없음'}
      </span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(MAX, value + step))}
        disabled={disabled || value >= MAX}
        aria-label={`${label} ${unit} 늘리기`}
      >
        +
      </button>
      </span>
    </div>
  );
}
