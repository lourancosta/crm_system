import { useLayoutEffect, useRef, useState } from 'react';

export type DropdownPos = { top?: number; bottom?: number; left: number; right: number; width: number };

// Shared positioning for portal-rendered dropdowns (menus, view switchers,
// search selects, etc.): anchors below the trigger by default, flipping above
// it if there isn't enough room before the bottom of the viewport. Re-checks
// via ResizeObserver so it stays correct as content (e.g. search results)
// changes height while open.
export function useDropdownPosition() {
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function recalc() {
    const menuEl = menuRef.current;
    const rect = triggerRectRef.current;
    if (!rect) return;
    const menuHeight = menuEl?.getBoundingClientRect().height ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const base = { left: rect.left, right: window.innerWidth - rect.right, width: rect.width };
    if (menuHeight > spaceBelow && spaceAbove > spaceBelow) {
      setPos({ ...base, bottom: window.innerHeight - rect.top + 4 });
    } else {
      setPos({ ...base, top: rect.bottom + 4 });
    }
  }

  function open(triggerEl: HTMLElement | null) {
    const rect = triggerEl?.getBoundingClientRect();
    if (!rect) return;
    triggerRectRef.current = rect;
    setPos({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right, width: rect.width });
  }

  function close() {
    setPos(null);
    triggerRectRef.current = null;
  }

  useLayoutEffect(() => {
    if (!pos || !menuRef.current) return;
    recalc();
    const observer = new ResizeObserver(() => recalc());
    observer.observe(menuRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!pos]);

  return { pos, menuRef, open, close };
}
