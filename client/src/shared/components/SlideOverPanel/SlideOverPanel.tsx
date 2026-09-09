import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './SlideOverPanel.module.css';

type Props = {
  onClose: () => void;
  children: ReactNode;
  // Overrides the default wide (min(90vw, 1440px)) panel width — for objects
  // whose RecordDetail has no aside (e.g. Products, which dropped its
  // association panels), so the panel doesn't leave a large empty gap next
  // to RecordDetail's narrower single-column max-width: 720px content.
  width?: string;
  // Overrides the default panel background (#eff2f4) — e.g. CreateSlideOver
  // uses a lighter shade for create forms.
  background?: string;
};

// Generic slide-in-from-the-right overlay, sibling to Modal.tsx — no
// contact/object-specific knowledge, meant to be reused for every object
// type's detail panel. Content supplies its own header/title (e.g.
// RecordDetail already renders one); this only owns the chrome + close
// affordance.
export function SlideOverPanel({ onClose, children, width, background }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={`${styles.overlay}${open ? ` ${styles['overlay--open']}` : ''}`} onClick={onClose}>
      <div
        className={`${styles.panel}${open ? ` ${styles['panel--open']}` : ''}`}
        style={width || background ? { ...(width && { width }), ...(background && { background }) } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Positioned relative to .panel and half-overlapping its left edge,
            so it reads as attached to the panel (slides in with it) while
            still sitting mostly over the backdrop, not the panel's content.
            Plain <button> (not the shared Button component) since it needs
            fully custom shape/color styling, not the standard btn variants. */}
        <button
          type="button"
          aria-label="Close"
          className={styles['close-btn']}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
