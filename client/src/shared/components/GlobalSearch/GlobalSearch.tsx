import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, CreditCard, FileSpreadsheet, FileText, Handshake, KeySquare, Receipt, Search, Target, Ticket, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { searchApi } from '../../api/search';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import type { SearchResultGroup, SearchResultItem, SearchResultType } from '../../types/index';
import styles from './GlobalSearch.module.css';

const MIN_QUERY_LENGTH = 2;

// Same path prefixes used by every list page's own row links.
const ROUTE_PREFIX: Record<SearchResultType, string> = {
  contact: '/contacts',
  company: '/companies',
  deal: '/deals',
  ticket: '/tickets',
  invoice: '/invoices',
  payment: '/payments',
  creditMemo: '/credit-memos',
  license: '/licenses',
  partnership: '/partnerships',
  quote: '/quotes',
};

// Mirrors the icon already assigned to each object type in
// shared/constants/navGroups.ts, so a search result reads as "the same
// Contacts/Companies/etc." the sidebar already trained the user on.
const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  contact: User,
  company: Building2,
  deal: Target,
  ticket: Ticket,
  invoice: FileText,
  payment: CreditCard,
  creditMemo: Receipt,
  license: KeySquare,
  partnership: Handshake,
  quote: FileSpreadsheet,
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();
  const navigate = useNavigate();
  const location = useLocation();

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function openMenu() {
    // Anchor to the outer pill container, not the bare <input> — the input
    // alone doesn't span the icon/⌘K-hint area, so anchoring to it left the
    // dropdown's bottom/right edges misaligned with the field's own border.
    openAt(containerRef.current);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
    resetPos();
  }

  // Debounced search-as-you-type, same 300ms convention as
  // ContactSearchSelect.tsx and friends.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(() => {
      searchApi
        .search(term)
        .then((r) => setGroups(r.groups))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [groups]);

  // Outside-click/scroll/resize dismissal — identical shape to
  // Select.tsx/RowActionsMenu.tsx.
  useEffect(() => {
    if (!isOpen) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
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
  }, [isOpen]);

  // Global ⌘K / Ctrl+K — focuses the box from anywhere in the app.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Passing `backgroundLocation` mirrors RecordLink — a search result opens
  // the same slide-over panel a normal record link would, not a full nav.
  function goToResult(item: SearchResultItem) {
    navigate(`${ROUTE_PREFIX[item.type]}/${item.id}`, { state: { backgroundLocation: location } });
    setQuery('');
    setGroups([]);
    closeMenu();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      closeMenu();
      return;
    }
    if (!isOpen || flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) goToResult(item);
    }
  }

  const showPanel = isOpen && query.trim().length >= MIN_QUERY_LENGTH && pos;
  let flatIndex = -1;

  return (
    <div ref={containerRef} className={styles['global-search']}>
      <Search size={16} className={styles['global-search-icon']} />
      <input
        ref={inputRef}
        type="text"
        className={styles['global-search-input']}
        placeholder="Search contacts, companies, deals & more…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          openMenu();
        }}
        onFocus={openMenu}
        onBlur={() => setTimeout(closeMenu, 150)}
        onKeyDown={handleKeyDown}
      />
      <kbd className={styles['global-search-hint']}>⌘K</kbd>

      {showPanel &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['global-search-menu']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
          >
            {isLoading ? (
              <div className={styles['global-search-empty']}>Searching…</div>
            ) : groups.length === 0 ? (
              <div className={styles['global-search-empty']}>No results for &quot;{query.trim()}&quot;</div>
            ) : (
              groups.map((group) => {
                const GroupIcon = TYPE_ICON[group.type];
                return (
                  <div key={group.type} className={styles['global-search-group']}>
                    <div className={styles['global-search-group-label']}>{group.label}</div>
                    {group.items.map((item) => {
                      flatIndex += 1;
                      const isActive = flatIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles['global-search-option']}${isActive ? ` ${styles['global-search-option--active']}` : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            goToResult(item);
                          }}
                        >
                          <GroupIcon size={16} className={styles['global-search-option-icon']} />
                          <span className={styles['global-search-option-text']}>
                            <span className={styles['global-search-option-title']}>{item.title}</span>
                            {item.subtitle && <span className={styles['global-search-option-subtitle']}>{item.subtitle}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
