import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../shared/components/Modal/Modal';
import { Button } from '../../shared/components/Button/Button';
import { Select } from '../../shared/components/Dropdown/Select';
import type { SelectOption } from '../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { formatCurrency } from '../../shared/utils/currency';
import { invoicesApi } from './api/invoices';
import { creditMemosApi } from '../credit-memos/api/creditMemos';
import type { AssociatedCreditMemo, AvailableCreditMemo, CreditMemoApplication, Invoice } from '../../shared/types/index';
import styles from './CreateInvoiceForm.module.css';

const CURRENCY = 'USD';

// Same id-presence convention as CreateInvoiceForm's own credit-memo rows —
// id set = already saved (mutate via update/delete), absent = added this
// session (mutate via create).
type CreditMemoApplicationRow = {
  key: string;
  id?: string;
  creditMemoId: string;
  amount: string;
};

function rowFromCreditMemoApplication(a: CreditMemoApplication): CreditMemoApplicationRow {
  return { key: a.id, id: a.id, creditMemoId: a.creditMemoId, amount: a.amount };
}

function newCreditMemoApplicationRow(creditMemoId: string): CreditMemoApplicationRow {
  return { key: crypto.randomUUID(), creditMemoId, amount: '0' };
}

function creditMemoLabel(hsNumber: string | null, availableBalance: string | number): string {
  return `${hsNumber || 'Credit memo'} (Available balance: ${formatCurrency(availableBalance, CURRENCY)})`;
}

type Props = {
  invoice: Invoice;
  companyId: string;
  initialApplications: CreditMemoApplication[];
  existingCreditMemos: AssociatedCreditMemo[];
  onClose: () => void;
  onSaved: () => void;
};

export function ManageCreditMemoModal({ invoice, companyId, initialApplications, existingCreditMemos, onClose, onSaved }: Props) {
  const [availableCreditMemos, setAvailableCreditMemos] = useState<AvailableCreditMemo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<CreditMemoApplicationRow[]>(() => initialApplications.map(rowFromCreditMemoApplication));
  const [baseline] = useState<CreditMemoApplicationRow[]>(() => initialApplications.map(rowFromCreditMemoApplication));
  const [error, setError] = useState('');

  useEffect(() => {
    creditMemosApi
      .getAvailableForCompany(companyId, invoice.id)
      .then(setAvailableCreditMemos)
      .finally(() => setIsLoading(false));
  }, [companyId, invoice.id]);

  // The first not-yet-used available memo — what a freshly-added row starts
  // out pointing at.
  function nextUnusedCreditMemo(currentRows: CreditMemoApplicationRow[]): AvailableCreditMemo | undefined {
    const usedIds = new Set(currentRows.map((r) => r.creditMemoId));
    return availableCreditMemos.find((cm) => !usedIds.has(cm.id));
  }

  function addRow() {
    setRows((prev) => {
      const next = nextUnusedCreditMemo(prev);
      return next ? [...prev, newCreditMemoApplicationRow(next.id)] : prev;
    });
  }

  function patchRow(key: string, patch: Partial<CreditMemoApplicationRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const balanceBeforeCredit = Math.max(0, (Number(invoice.hsAmountBilled) || 0) - (Number(invoice.hsAmountPaid) || 0));
  const creditAppliedTotal = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remainingBalance = Math.max(0, balanceBeforeCredit - creditAppliedTotal);
  const canAddMore = !!nextUnusedCreditMemo(rows) && remainingBalance > 0;

  const [handleSave, isSubmitting] = useSubmitGuard(async () => {
    setError('');
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      const memo = availableCreditMemos.find((cm) => cm.id === row.creditMemoId);
      // The row's own baseline amount (if it was already saved) counts back
      // toward the memo's available balance — only re-adjusting past what
      // was already applied should be blocked.
      const alreadyApplied = row.id ? Number(baseline.find((b) => b.id === row.id)?.amount ?? 0) : 0;
      const cap = (memo ? Number(memo.availableBalance) : 0) + alreadyApplied;
      if (!memo || amount <= 0 || amount > cap) {
        setError('Enter a valid amount for each applied credit memo, no more than its available balance.');
        return;
      }
    }

    try {
      const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id!));
      for (const original of baseline) {
        if (!currentIds.has(original.id!)) {
          await invoicesApi.deleteCreditMemoApplication(invoice.id, original.id!);
        }
      }
      const originalById = new Map(baseline.map((b) => [b.id, b]));
      for (const row of rows) {
        const amount = Number(row.amount) || 0;
        if (!row.id) {
          await invoicesApi.createCreditMemoApplication(invoice.id, { creditMemoId: row.creditMemoId, amount });
          continue;
        }
        const original = originalById.get(row.id);
        if (!original || Number(original.amount) !== amount) {
          await invoicesApi.updateCreditMemoApplication(invoice.id, row.id, { amount });
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credit memo changes');
    }
  });

  return (
    <Modal
      title="Apply or Manage Credit"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      }
    >
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {isLoading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className={styles['summary-card']}>
          {rows.length === 0 && (
            <div className={styles['summary-row']}>
              <span className={`${styles['summary-label']} ${styles['summary-label--muted']}`}>No credit memos applied yet.</span>
            </div>
          )}

          {rows.map((row) => {
            const isExisting = !!row.id;
            const availableMemo = availableCreditMemos.find((cm) => cm.id === row.creditMemoId);
            const existingMemo = existingCreditMemos.find((cm) => cm.id === row.creditMemoId);
            const usedElsewhere = new Set(rows.filter((r) => r.key !== row.key).map((r) => r.creditMemoId));
            const options: SelectOption<string>[] = availableCreditMemos
              .filter((cm) => cm.id === row.creditMemoId || !usedElsewhere.has(cm.id))
              .map((cm) => ({ value: cm.id, label: creditMemoLabel(cm.hsNumber, cm.availableBalance) }));

            return (
              <div key={row.key} className={styles['summary-row']} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className={styles['discount-name-block']}>
                      <label className={styles['discount-name-static-label']}>Credit memo *</label>
                      {isExisting ? (
                        <div style={{ padding: '4px 0', fontSize: 14, color: 'var(--text-muted)' }}>
                          {creditMemoLabel(
                            availableMemo?.hsNumber ?? existingMemo?.hsNumber ?? null,
                            availableMemo?.availableBalance ?? '0',
                          )}
                        </div>
                      ) : (
                        <Select
                          value={row.creditMemoId}
                          onChange={(value) => patchRow(row.key, { creditMemoId: value })}
                          options={options}
                          ariaLabel="Credit memo"
                        />
                      )}
                    </div>
                    <div className="form-group">
                      <label className={styles['discount-name-static-label']}>Amount applied *</label>
                      <CurrencyMaskedInput value={row.amount} onChange={(v) => patchRow(row.key, { amount: v })} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles['discount-remove-btn']}
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove credit memo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <span className={`${styles['summary-value']} ${styles['summary-value--accent']}`} style={{ textAlign: 'right' }}>
                  −{formatCurrency(Number(row.amount) || 0, CURRENCY)}
                </span>
              </div>
            );
          })}

          <div className={styles['summary-row']}>
            <button
              type="button"
              className={styles['add-discount-link']}
              onClick={addRow}
              disabled={!canAddMore}
              style={!canAddMore ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              + Add available credit
            </button>
          </div>

          <div className={styles['summary-row']}>
            <span className={`${styles['summary-label']} ${styles['summary-label--muted']}`}>Invoice balance before credit</span>
            <span className={styles['summary-dots']} />
            <span className={styles['summary-value']}>{formatCurrency(balanceBeforeCredit, CURRENCY)}</span>
          </div>

          <div className={styles['summary-row']}>
            <span className={`${styles['summary-label']} ${styles['summary-label--muted']}`}>Credit applied to this invoice</span>
            <span className={styles['summary-dots']} />
            <span className={`${styles['summary-value']} ${styles['summary-value--accent']}`}>
              −{formatCurrency(creditAppliedTotal, CURRENCY)}
            </span>
          </div>

          <div className={`${styles['summary-row']} ${styles['summary-row--bold']}`}>
            <span className={styles['summary-label']}>Remaining invoice balance</span>
            <span className={styles['summary-dots']} />
            <span className={styles['summary-value']}>{formatCurrency(remainingBalance, CURRENCY)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
