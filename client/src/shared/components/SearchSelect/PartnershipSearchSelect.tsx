import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { partnershipsApi } from '../../../features/partnerships/api/partnerships';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { Partnership } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: Partnership | null;
  onChange: (partnership: Partnership | null) => void;
};

export function PartnershipSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partnership[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(() => {
      partnershipsApi
        .list(1, 15, query)
        .then((r) => setResults(r.data))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function openMenu() {
    openAt(inputRef.current);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
    resetPos();
  }

  if (value) {
    return (
      <div className={styles['invoice-search-selected']}>
        <span>
          <strong>{value.name ?? 'Unnamed partnership'}</strong>
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className={styles['invoice-search']}>
      <input
        ref={inputRef}
        placeholder="Search by partnership name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          openMenu();
        }}
        onFocus={openMenu}
        onBlur={() => setTimeout(closeMenu, 150)}
      />
      {isOpen &&
        query &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['invoice-search-dropdown']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
          >
            {isLoading ? (
              <div className={styles['invoice-search-empty']}>Searching…</div>
            ) : results.length === 0 ? (
              <div className={styles['invoice-search-empty']}>No partnerships found</div>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(p);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{p.name ?? 'Unnamed partnership'}</strong>
                  <span>{[p.typeObj, p.mspLevel].filter(Boolean).join(' · ') || '—'}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
