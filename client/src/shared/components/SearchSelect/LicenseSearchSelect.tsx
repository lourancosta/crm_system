import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { licensesApi } from '../../../features/licenses/api/licenses';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { License } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: License | null;
  onChange: (license: License | null) => void;
};

export function LicenseSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<License[]>([]);
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
      licensesApi
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
          <strong>{value.name ?? 'Unnamed license'}</strong>
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
        placeholder="Search by license name…"
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
              <div className={styles['invoice-search-empty']}>No licenses found</div>
            ) : (
              results.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(l);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{l.name ?? 'Unnamed license'}</strong>
                  <span>{[l.customerName, l.status].filter(Boolean).join(' · ') || '—'}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
