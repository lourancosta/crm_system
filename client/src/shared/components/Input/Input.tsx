import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} {...props} />
      {error && <span className={styles['field-error']}>{error}</span>}
    </div>
  );
}
