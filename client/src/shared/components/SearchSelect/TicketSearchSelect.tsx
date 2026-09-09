import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ticketsApi } from '../../../features/tickets/api/tickets';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { Ticket } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: Ticket | null;
  onChange: (ticket: Ticket | null) => void;
};

export function TicketSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Ticket[]>([]);
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
      ticketsApi
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
          <strong>{value.subject ?? 'Untitled ticket'}</strong>
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
        placeholder="Search by ticket subject…"
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
              <div className={styles['invoice-search-empty']}>No tickets found</div>
            ) : (
              results.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(t);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{t.subject ?? 'Untitled ticket'}</strong>
                  <span>{[t.hsPipelineStage, t.hsTicketPriority].filter(Boolean).join(' · ') || '—'}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
