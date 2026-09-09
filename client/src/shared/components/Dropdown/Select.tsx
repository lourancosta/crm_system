import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './Select.module.css';

export type SelectOption<T extends string> = { value: T; label: string; disabled?: boolean; icon?: LucideIcon; color?: string };

type SelectProps<T extends string> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
  // Overrides the trigger's own text with something more specific than the
  // selected option's static label — e.g. the quote line item Billing start
  // date column shows "15 days after payment" instead of just "Delayed
  // start (days)". The dropdown list itself always shows each option's real
  // label regardless.
  triggerLabel?: string;
};

export function Select<T extends string>({ value, options, onChange, className, ariaLabel, triggerLabel }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();
  const current = options.find((o) => o.value === value);

  function openMenu() {
    openAt(triggerRef.current);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    resetPos();
  }

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      closeMenu();
    }
    function onDismiss(e: Event) {
      // Scrolling inside the menu's own scrollable list also fires a
      // (capture-phase) window scroll event — ignore that one so long
      // lists can actually be scrolled instead of instantly closing.
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      closeMenu();
    }

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={`${styles['custom-select']}${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles['custom-select-trigger']}
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-label={ariaLabel}
      >
        {current?.color ? (
          <span className="status-badge">
            <span className="status-dot" style={{ background: current.color }} />
            {triggerLabel ?? current.label}
          </span>
        ) : (
          <span>{triggerLabel ?? current?.label ?? ''}</span>
        )}
        <ChevronDown size={14} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['custom-select-menu']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: Math.max(pos.width, 160) }}
          >
            {options.map((opt) => {
              const OptIcon = opt.icon;
              return (
                <button
                  type="button"
                  key={opt.value}
                  disabled={opt.disabled}
                  className={`${styles['custom-select-option']}${opt.value === value ? ` ${styles['custom-select-option--active']}` : ''}${opt.disabled ? ` ${styles['custom-select-option--disabled']}` : ''}`}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    closeMenu();
                  }}
                >
                  {OptIcon && <OptIcon size={15} />}
                  {opt.color && <span className="status-dot" style={{ background: opt.color }} />}
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
