import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { invoicesApi } from '../../../features/invoices/api/invoices';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { Invoice } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: Invoice | null;
  onChange: (invoice: Invoice | null) => void;
  // PaymentForm only wants invoices that still have something owed on them;
  // other callers (e.g. associating an invoice to a deal) want every invoice
  // regardless of balance, so this defaults to off.
  unpaidOnly?: boolean;
};

export function InvoiceSearchSelect({ value, onChange, unpaidOnly = false }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Invoice[]>([]);
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
      invoicesApi
        .list(1, 15, query)
        .then((r) => setResults(unpaidOnly ? r.data.filter((inv) => Number(inv.hsBalanceDue ?? 0) > 0) : r.data))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, unpaidOnly]);

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
          <strong>{value.hsNumber}</strong>
          {value.hsInvoiceLatestCompanyName ? ` — ${value.hsInvoiceLatestCompanyName}` : ''}
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
        placeholder="Search by invoice number or company…"
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
              <div className={styles['invoice-search-empty']}>No invoices found</div>
            ) : (
              results.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(inv);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{inv.hsNumber}</strong>
                  <span>{inv.hsInvoiceLatestCompanyName ?? '—'}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
