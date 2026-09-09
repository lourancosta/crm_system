import { Check } from 'lucide-react';
import styles from './Toggle.module.css';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, id, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`${styles['toggle-switch']}${checked ? ` ${styles['toggle-switch--checked']}` : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles['toggle-switch-knob']}>{checked && <Check size={12} strokeWidth={3} />}</span>
    </button>
  );
}
