import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './MultiSelect.module.css';

export type MultiSelectOption = { value: string; label: string };

type Props = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
};

// Form-field multi-select: selections render as removable chips inside the
// trigger itself (not just a "Label (n)" summary — see CheckboxDropdown for
// that compact filter-bar variant), with a checkbox menu below to pick more.
export function MultiSelect({ options, selected, onChange, placeholder, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  function openMenu() {
    openAt(triggerRef.current);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    resetPos();
  }

  function toggleOption(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function removeOption(value: string) {
    onChange(selected.filter((v) => v !== value));
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
    <div className={styles['multi-select']}>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className={styles['multi-select-trigger']}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open ? closeMenu() : openMenu();
          }
        }}
      >
        <div className={styles['multi-select-chips']}>
          {selected.length === 0 && <span className={styles['multi-select-placeholder']}>{placeholder}</span>}
          {selected.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <span key={value} className={styles.chip}>
                {option?.label ?? value}
                <button
                  type="button"
                  aria-label={`Remove ${option?.label ?? value}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(value);
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
        <ChevronDown size={14} className={styles['multi-select-chevron']} />
      </div>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['multi-select-menu']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: Math.max(pos.width, 180) }}
          >
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={`${styles['multi-select-option']}${checked ? ` ${styles['multi-select-option--checked']}` : ''}`}
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
