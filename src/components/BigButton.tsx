import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'done' | 'secondary' | 'danger' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'normal' | 'huge';
}

export function BigButton({ variant = 'secondary', size = 'normal', className = '', ...rest }: Props) {
  return <button type="button" className={`btn btn-${variant} ${size === 'huge' ? 'btn-huge' : ''} ${className}`} {...rest} />;
}
