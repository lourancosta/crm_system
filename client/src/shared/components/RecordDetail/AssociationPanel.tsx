import { useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { associationsApi } from '../../api/associations';
import type { AssociableType } from '../../types/index';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import styles from './AssociatedRecordsPanel.module.css';

type Props<T> = {
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  // Short name shown in the remove confirmation dialog (e.g. a company's name).
  itemLabel: (item: T) => string;
  emptyMessage?: string;
  defaultOpen?: boolean;
  accentBorder?: boolean;
  sourceType: AssociableType;
  sourceId: string;
  targetType: AssociableType;
  // Renders the picker used to add a new association — the caller supplies
  // the right *SearchSelect for targetType and calls onSelect(id) once a
  // record is chosen (e.g. `(onSelect) => <CompanySearchSelect value={null}
  // onChange={(c) => c && onSelect(c.id)} />`).
  renderPicker: (onSelect: (targetId: string) => void) => ReactNode;
  // Called after a successful add or remove so the parent can refetch.
  onChange: () => void;
  // Optional extra per-row control (e.g. an Actions kebab) rendered as a
  // sibling of the built-in remove button, in the same small flex group —
  // keeps the two aligned instead of the caller nesting it inside
  // renderItem's own layout.
  rowAction?: (item: T) => ReactNode;
};

// Editable counterpart to AssociatedRecordsPanel — same look, plus an "Add"
// picker in the header and a remove action per row, wired to the generic
// /api/associations endpoints. Panels that should stay read-only (quote
// associations, most invoice/payment/credit-memo associations) keep using
// plain AssociatedRecordsPanel instead of this component.
export function AssociationPanel<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  itemLabel,
  emptyMessage,
  defaultOpen = true,
  accentBorder = true,
  sourceType,
  sourceId,
  targetType,
  renderPicker,
  onChange,
  rowAction,
}: Props<T>) {
  const [open, setOpen] = useState(defaultOpen);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removing, setRemoving] = useState<T | null>(null);

  async function handleSelect(targetId: string) {
    setAddError('');
    try {
      await associationsApi.create({ sourceType, sourceId, targetType, targetId });
      setIsAdding(false);
      onChange();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add association');
    }
  }

  async function handleRemove(item: T) {
    await associationsApi.remove({ sourceType, sourceId, targetType, targetId: keyExtractor(item) });
    onChange();
  }

  return (
    <div className={styles['aside-panel']}>
      <div className={styles['aside-panel-header']}>
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
        <button
          type="button"
          aria-label={isAdding ? `Cancel adding ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
          onClick={() => {
            setAddError('');
            setIsAdding((v) => !v);
            setOpen(true);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--link)', display: 'flex', alignItems: 'center', padding: 0, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
        >
          {isAdding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {open && (
        <>
          {isAdding && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              {renderPicker(handleSelect)}
              {addError && (
                <div className="alert alert-error" style={{ marginTop: 8, fontSize: 12 }}>
                  {addError}
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className={styles['aside-panel-empty']}>{emptyMessage ?? `No associated ${title.toLowerCase()}`}</div>
          ) : (
            <div className={styles['aside-panel-body']}>
              {items.map((item) => (
                <div
                  key={keyExtractor(item)}
                  className={styles['line-item-card']}
                  style={{
                    borderLeft: accentBorder ? '3px solid var(--link)' : undefined,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {rowAction?.(item)}
                    <button
                      type="button"
                      title="Remove association"
                      aria-label={`Remove ${itemLabel(item)}`}
                      onClick={() => setRemoving(item)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove association?"
          message={`${itemLabel(removing)} will no longer be linked here. This won't delete the record itself.`}
          confirmLabel="Remove"
          onConfirm={async () => {
            await handleRemove(removing);
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
