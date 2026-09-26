import { useEffect, useRef } from 'react';
import { BigButton } from './BigButton';

export interface DialogAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

interface Props {
  title: string;
  message?: string;
  actions: DialogAction[];
}

export function ConfirmDialog({ title, message, actions }: Props) {
  const firstBtn = useRef<HTMLDivElement>(null);
  useEffect(() => {
    firstBtn.current?.querySelector('button')?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>
        {message && <p className="dialog-message">{message}</p>}
        <div className="dialog-actions" ref={firstBtn}>
          {actions.map((a) => (
            <BigButton key={a.label} variant={a.variant ?? 'secondary'} onClick={a.onClick}>
              {a.label}
            </BigButton>
          ))}
        </div>
      </div>
    </div>
  );
}
