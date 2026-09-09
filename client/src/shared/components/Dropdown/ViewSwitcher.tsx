import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './ViewSwitcher.module.css';

export type ViewOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  options: ViewOption<T>[];
  onChange: (value: T) => void;
};

export function ViewSwitcher<T extends string>({ value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();
  const current = options.find((o) => o.value === value) ?? options[0];
  const CurrentIcon = current.icon;

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
    <div className={styles['view-switcher']}>
      <button
        ref={triggerRef}
        type="button"
        className={styles['view-switcher-trigger']}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <CurrentIcon size={15} />
        <span>{current.label}</span>
        <ChevronDown size={14} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['view-switcher-menu']}
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          >
            {options.map((opt) => {
              const OptIcon = opt.icon;
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={`${styles['view-switcher-option']}${opt.value === value ? ` ${styles['view-switcher-option--active']}` : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    closeMenu();
                  }}
                >
                  <OptIcon size={15} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
