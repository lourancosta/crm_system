import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { contactsApi } from '../../../features/contacts/api/contacts';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { Contact } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: Contact | null;
  onChange: (contact: Contact | null) => void;
  // Restricts search to contacts associated with this company (matched
  // server-side via dynamic_associations).
  companyId?: string;
  // Renders a disabled, unfocusable input instead of the real search box —
  // for callers that need a company picked first before contacts make sense
  // (e.g. CreditMemoForm).
  disabled?: boolean;
  disabledPlaceholder?: string;
};

function contactName(c: Contact) {
  return [c.firstname, c.lastname].filter(Boolean).join(' ') || c.email || '—';
}

export function ContactSearchSelect({ value, onChange, companyId, disabled, disabledPlaceholder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
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
      contactsApi
        .list(1, 15, query, companyId)
        .then((r) => setResults(r.data))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, companyId]);

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
          <strong>{contactName(value)}</strong>
          {value.email ? ` — ${value.email}` : ''}
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={styles['invoice-search']}>
        <input placeholder={disabledPlaceholder ?? 'Select a company first…'} disabled />
      </div>
    );
  }

  return (
    <div className={styles['invoice-search']}>
      <input
        ref={inputRef}
        placeholder="Search by contact name or email…"
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
              <div className={styles['invoice-search-empty']}>No contacts found</div>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(c);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{contactName(c)}</strong>
                  <span>{c.email ?? '—'}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
