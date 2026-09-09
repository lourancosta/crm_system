import { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './AssociatedRecordsPanel.module.css';

type Props<T> = {
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  defaultOpen?: boolean;
  accentBorder?: boolean;
  // Optional header-right control (e.g. a "+ New Quote" button) for panels
  // that need an action beyond plain add/remove association — for that,
  // use AssociationPanel instead.
  headerAction?: ReactNode;
};

export function AssociatedRecordsPanel<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  emptyMessage,
  defaultOpen = true,
  accentBorder = true,
  headerAction,
}: Props<T>) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles['aside-panel']}>
      <div className={styles['aside-panel-header']} style={open ? undefined : { borderBottom: 'none' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
        >
          <span className={`${styles['aside-panel-arrow']}${open ? '' : ` ${styles['aside-panel-arrow--closed']}`}`}>›</span>
          <span>
            {title} ({items.length})
          </span>
        </button>
        {headerAction}
      </div>
      {open &&
        (items.length === 0 ? (
          <div className={styles['aside-panel-empty']}>{emptyMessage ?? `No associated ${title.toLowerCase()}`}</div>
        ) : (
          <div className={styles['aside-panel-body']}>
            {items.map((item) => (
              <div
                key={keyExtractor(item)}
                className={styles['line-item-card']}
                style={accentBorder ? { borderLeft: '3px solid var(--link)' } : undefined}
              >
                {renderItem(item)}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
