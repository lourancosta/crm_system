import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './CheckboxDropdown.module.css';

export type CheckboxOption<T extends string> = { value: T; label: string };

type CheckboxDropdownProps<T extends string> = {
  label: string;
  options: CheckboxOption<T>[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  className?: string;
  ariaLabel?: string;
};

export function CheckboxDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  className,
  ariaLabel,
}: CheckboxDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  function openMenu() {
    openAt(triggerRef.current);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    resetPos();
  }

  function toggleOption(value: T) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      closeMenu();
    }
    function onDismiss(e: Event) {
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
    <div className={`${styles['checkbox-dropdown']}${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles['checkbox-dropdown-trigger']}
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-label={ariaLabel}
      >
        <span>
          {label}
          {selected.size > 0 && selected.size < options.length ? ` (${selected.size})` : ''}
        </span>
        <ChevronDown size={14} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['checkbox-dropdown-menu']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: Math.max(pos.width, 180) }}
          >
            {options.map((opt) => {
              const checked = selected.has(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={`${styles['checkbox-dropdown-option']}${checked ? ` ${styles['checkbox-dropdown-option--checked']}` : ''}`}
                  onClick={() => toggleOption(opt.value)}
                >
                  <span className={`${styles['checkbox-box']}${checked ? ` ${styles['checkbox-box--checked']}` : ''}`}>
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
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
