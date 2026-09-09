import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { NAV_GROUPS } from '../../constants/navGroups';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import styles from './PageTitleSwitcher.module.css';

// Flattened, alphabetized CRM object list for the title switcher — Knowledge
// Base is excluded per product decision (it's a content/help section, not a
// record-list object like the others).
const OBJECT_LINKS = NAV_GROUPS.flatMap((g) => g.items)
  .filter((item) => item.to !== '/knowledge-base')
  .sort((a, b) => a.label.localeCompare(b.label));

export function PageTitleSwitcher({ current }: { current: string }) {
  const navigate = useNavigate();
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
    <div className={styles['title-switcher']}>
      <button
        ref={triggerRef}
        type="button"
        className={styles['title-switcher-trigger']}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <h1>{current}</h1>
        <ChevronDown size={20} className={styles['title-switcher-chevron']} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div ref={menuRef} className={styles['title-switcher-menu']} style={{ top: pos.top, left: pos.left }}>
            {OBJECT_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.to}
                  className={`${styles['title-switcher-option']}${item.label === current ? ` ${styles['title-switcher-option--active']}` : ''}`}
                  onClick={() => {
                    closeMenu();
                    navigate(item.to);
                  }}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
