import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './RowActionsMenu.module.css';

export type RowAction = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
};

type RowActionsMenuProps = {
  actions: RowAction[];
  icon?: LucideIcon;
  // When set, the trigger renders as a text label (e.g. a user's name)
  // instead of the default icon-only kebab button.
  label?: string;
  // Icon shown to the left of `label` (e.g. a user avatar icon) — distinct
  // from `icon`, which renders on the trailing side as the menu indicator.
  leadingIcon?: LucideIcon;
  triggerClassName?: string;
  // Extra content rendered above the actions list (e.g. a user profile
  // summary) — receives `close` so its own links/buttons can dismiss the
  // menu before navigating.
  header?: (close: () => void) => ReactNode;
};

export function RowActionsMenu({ actions, icon: Icon, label, leadingIcon: LeadingIcon, triggerClassName, header }: RowActionsMenuProps) {
  const TriggerIcon = Icon ?? (label ? undefined : MoreVertical);
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
    <div className={styles['row-actions-menu']} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles['row-actions-trigger']}${label ? ` ${styles['row-actions-trigger--label']}` : ''}${triggerClassName ? ` ${triggerClassName}` : ''}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-label={label ?? 'Actions'}
      >
        {LeadingIcon && <LeadingIcon size={15} />}
        {label && <span className={styles['row-actions-trigger-label-text']}>{label}</span>}
        {TriggerIcon && <TriggerIcon size={16} />}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['row-actions-dropdown']}
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          >
            {header && <div className={styles['row-actions-header']}>{header(closeMenu)}</div>}
            {actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  title={action.title}
                  className={`${styles['row-actions-item']}${action.variant === 'danger' ? ` ${styles['row-actions-item--danger']}` : ''}`}
                  onClick={() => {
                    closeMenu();
                    action.onClick();
                  }}
                >
                  {ActionIcon && <ActionIcon size={15} />}
                  {action.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
