import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./Table.module.css";

export type Column<T> = {
  key: string;
  // Usually a plain string, but any ReactNode is fine — e.g. a header with
  // an inline info-tooltip icon next to the label.
  header: ReactNode;
  render: (row: T) => ReactNode;
};

export type TablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: TablePagination;
  // Enables native HTML5 drag-and-drop row reordering. Pair with a drag
  // handle column (see dragHandleColumn.tsx) whose render sets `draggable` +
  // `onDragStart` (dataTransfer key = keyExtractor(row)). This is the app's
  // one reordering pattern — reused for invoice line items, pipeline stages,
  // lifecycle stages, KB subcategories, etc. Only wired up on the flat
  // (non-grouped) render path.
  onReorder?: (draggedKey: string, targetKey: string) => void;
  // Optional grouping: rows are bucketed by this key (preserving first-
  // appearance order, merging non-contiguous rows that share a key) and a
  // header row is inserted before each group. Only kicks in when there's
  // more than one distinct group — a single-group table renders flat, same
  // as if groupBy were omitted, so this is safe to pass unconditionally.
  groupBy?: (row: T) => string | null;
  // One cell per column for a summary row rendered after each group (e.g. a
  // subtotal). Return null to skip the summary row for that group.
  renderGroupSummary?: (groupKey: string | null, rows: T[]) => ReactNode[] | null;
  // Caps the scrollable body to roughly this many rows tall (measured from
  // the actual rendered row height, so it adapts to whatever's in each
  // column) instead of growing to fit all rows or the flex parent. Omit for
  // the default behavior (fills available flex space, e.g. a full-page list).
  // Relies entirely on native scrolling (default overscroll-behavior) - no
  // custom wheel handling. If this table sits inside another scrollable
  // ancestor, give that ancestor's own flex children `flex-shrink: 0` where
  // needed (see CreateInvoiceForm.module.css's .summary-card comment) -
  // otherwise the flexbox spec can silently collapse them to ~0 height
  // whenever content overflows, with no relation to scrolling at all.
  maxVisibleRows?: number;
};

function groupRows<T>(data: T[], groupBy: (row: T) => string | null) {
  const order: (string | null)[] = [];
  const byKey = new Map<string | null, T[]>();
  for (const row of data) {
    const key = groupBy(row);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(row);
  }
  return order.map((key) => ({ key, rows: byKey.get(key)! }));
}

// This component never owns its own scroll container that could nest inside
// an already-scrolling ancestor (a page, a modal) - that combination is what
// caused a long chain of scroll bugs (sticky-header jitter, dead zones where
// neither region would scroll, wheel semantics that behaved differently
// across devices). The table just renders its full height and relies on
// whichever ancestor is actually meant to scroll (the page, or a modal's own
// scroll container) to do so - one scrollable region, always reliable,
// nothing custom to fight the browser over.
export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No records found.",
  onRowClick,
  pagination,
  groupBy,
  renderGroupSummary,
  onReorder,
  maxVisibleRows,
}: TableProps<T>) {
  const groups = groupBy ? groupRows(data, groupBy) : null;
  const showGroups = !!groups && groups.length > 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;
  const from = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(0);

  function updateShadows() {
    const el = scrollRef.current;
    if (!el) return;
    // scrollHeight === clientHeight whenever content doesn't overflow (there's
    // more table space than rows), so both shadows naturally stay off then.
    setShowTopShadow(el.scrollTop > 0);
    setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }

  useEffect(() => {
    updateShadows();
    const thead = theadRef.current;
    if (!thead) return;
    setHeaderHeight(thead.offsetHeight);
    const observer = new ResizeObserver(() => setHeaderHeight(thead.offsetHeight));
    observer.observe(thead);
    return () => observer.disconnect();
  }, [data, isLoading]);

  // Measured from the actual first rendered row rather than assumed from
  // padding/font-size, so maxVisibleRows adapts to whatever a given table's
  // columns render (plain text vs. inputs vs. badges all differ in height).
  // useLayoutEffect (not useEffect) so the cap applies before paint - avoids
  // a one-frame flash at full height before snapping down.
  useLayoutEffect(() => {
    if (maxVisibleRows == null) return;
    const firstRow = tbodyRef.current?.rows[0];
    if (!firstRow) {
      setRowHeight(0);
      return;
    }
    setRowHeight(firstRow.offsetHeight);
    const observer = new ResizeObserver(() => setRowHeight(firstRow.offsetHeight));
    observer.observe(firstRow);
    return () => observer.disconnect();
  }, [data, isLoading, showGroups, maxVisibleRows]);

  const maxScrollHeight =
    maxVisibleRows != null && rowHeight > 0 ? headerHeight + rowHeight * maxVisibleRows : undefined;

  return (
    <>
      <div
        className={styles["table-wrapper"]}
        style={maxScrollHeight != null ? { flex: "none", flexShrink: 0 } : undefined}
      >
        <div
          className={`${styles["table-scroll-shadow"]} ${styles["table-scroll-shadow--top"]}${showTopShadow ? ` ${styles["table-scroll-shadow--visible"]}` : ""}`}
          style={{ top: headerHeight }}
        />
        <div
          className={styles["table-scroll"]}
          ref={scrollRef}
          onScroll={updateShadows}
          style={maxScrollHeight != null ? { maxHeight: maxScrollHeight, flex: "none" } : undefined}
        >
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : data.length === 0 ? (
            <div className="empty">{emptyMessage}</div>
          ) : (
            <table className={styles.table}>
              <thead ref={theadRef}>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {showGroups
                  ? groups!.map((group, groupIndex) => {
                      const summary = renderGroupSummary?.(group.key, group.rows) ?? null;
                      return (
                        <Fragment key={group.key ?? "__none__"}>
                          {groupIndex > 0 && (
                            <tr className={styles["table-group-spacer"]} aria-hidden="true">
                              <td colSpan={columns.length} />
                            </tr>
                          )}
                          <tr className={styles["table-group-row"]}>
                            <td colSpan={columns.length} className={styles["table-group-cell"]}>
                              {group.key ?? "Other"}
                            </td>
                          </tr>
                          {group.rows.map((row) => (
                            <tr
                              key={keyExtractor(row)}
                              onClick={() => onRowClick?.(row)}
                              className={onRowClick ? styles["table-row-clickable"] : undefined}
                            >
                              {columns.map((col) => (
                                <td key={col.key}>{col.render(row)}</td>
                              ))}
                            </tr>
                          ))}
                          {summary && (
                            <tr className={styles["table-group-summary-row"]}>
                              {summary.map((cell, i) => (
                                <td key={columns[i]?.key ?? i} className={styles["table-group-summary-cell"]}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  : data.map((row) => {
                      const rowKey = keyExtractor(row);
                      return (
                        <tr
                          key={rowKey}
                          onClick={() => onRowClick?.(row)}
                          className={`${onRowClick ? styles["table-row-clickable"] : ""}${onReorder && dragOverKey === rowKey ? ` ${styles["table-row-drag-over"]}` : ""}`}
                          onDragOver={
                            onReorder
                              ? (e) => {
                                  e.preventDefault();
                                  setDragOverKey(rowKey);
                                }
                              : undefined
                          }
                          onDragLeave={onReorder ? () => setDragOverKey((k) => (k === rowKey ? null : k)) : undefined}
                          onDrop={
                            onReorder
                              ? (e) => {
                                  e.preventDefault();
                                  setDragOverKey(null);
                                  const draggedKey = e.dataTransfer.getData("text/plain");
                                  if (draggedKey && draggedKey !== rowKey) onReorder(draggedKey, rowKey);
                                }
                              : undefined
                          }
                        >
                          {columns.map((col) => (
                            <td key={col.key}>{col.render(row)}</td>
                          ))}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
        <div className={`${styles["table-scroll-shadow"]} ${styles["table-scroll-shadow--bottom"]}${showBottomShadow ? ` ${styles["table-scroll-shadow--visible"]}` : ""}`} />
      </div>

      {pagination && !isLoading && (
        <div className={styles["table-pagination"]}>
          <span className={styles["table-pagination-info"]}>
            {pagination.total === 0 ? "No records" : `${from}–${to} of ${pagination.total.toLocaleString()}`}
          </span>
          <div className={styles["table-pagination-controls"]}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              ← Prev
            </button>
            <span className={styles["table-pagination-pages"]}>
              Page {pagination.page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
