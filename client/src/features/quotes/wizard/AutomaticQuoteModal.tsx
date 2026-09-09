import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import { formatCurrency } from '../../../shared/utils/currency';
import { ProductPickerModal } from '../../invoices/ProductPickerModal';
import { quotesApi } from '../api/quotes';
import { BILLING_FREQUENCY_OPTIONS, recomputeTotalQuantity } from './LineItemsStep';
import type { BillingFrequency, Deal, Product } from '../../../shared/types/index';

// Same humanizer as ProductPickerModal.tsx's own local copy (module is a raw
// snake_case code like "asset_protect" — this just title-cases it for display).
function moduleLabel(module: string | null): string {
  if (!module) return 'Other';
  return module
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type Row = { product: Product; quantityPerMonth: number };

// Default a newly-added row starts at — only edited afterward per-row in the
// table, there's no top-level default field anymore.
const DEFAULT_ROW_QUANTITY_PER_MONTH = 1;

type Props = {
  deal: Deal;
  onClose: () => void;
  onCreated: (quoteId: string) => void;
};

// Builds a quote's Draft + line items in one shot from a single billing
// profile (frequency/term applied to every line item, only quantity per
// month varies per product), instead of the manual wizard's one-at-a-time
// Line Items step. Hands off to CreateQuoteWizard's resumeQuoteId mode once
// done, which picks up right at Buyer Information.
export function AutomaticQuoteModal({ deal, onClose, onCreated }: Props) {
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('one_time');
  const [termMonths, setTermMonths] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handlePickProduct(product: Product) {
    setRows((prev) =>
      prev.some((r) => r.product.id === product.id) ? prev : [...prev, { product, quantityPerMonth: DEFAULT_ROW_QUANTITY_PER_MONTH }],
    );
  }

  function updateRowQuantity(productId: string, quantityPerMonth: number) {
    setRows((prev) => prev.map((r) => (r.product.id === productId ? { ...r, quantityPerMonth } : r)));
  }

  function removeRow(productId: string) {
    setRows((prev) => prev.filter((r) => r.product.id !== productId));
  }

  async function handleCreateQuote() {
    setError('');
    setIsSubmitting(true);
    try {
      const quote = await quotesApi.create(deal.id);
      // Sequential, not Promise.all — each createLineItem call triggers a
      // server-side recalculation of the quote's amount; running them in
      // parallel risks a lost-update race on that recalculation.
      for (const row of rows) {
        await quotesApi.createLineItem(quote.id, {
          productId: row.product.id,
          quantity: Number(recomputeTotalQuantity(String(row.quantityPerMonth), String(termMonths), billingFrequency)),
          hsTermInMonths: termMonths,
          recurringbillingfrequency: billingFrequency,
        });
      }
      onCreated(quote.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
      setIsSubmitting(false);
    }
  }

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Product name', render: (r) => <span style={{ fontWeight: 600 }}>{r.product.name ?? '—'}</span> },
    { key: 'module', header: 'Module', render: (r) => moduleLabel(r.product.module) },
    { key: 'price', header: 'Price', render: (r) => formatCurrency(r.product.hsPriceUsd, 'USD') },
    {
      key: 'quantityPerMonth',
      header: 'Quantity per month',
      render: (r) => (
        <input
          type="number"
          min={0}
          value={r.quantityPerMonth}
          onChange={(e) => updateRowQuantity(r.product.id, Number(e.target.value))}
          style={{ width: 80 }}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          type="button"
          title="Remove product"
          aria-label={`Remove ${r.product.name ?? 'product'}`}
          onClick={() => removeRow(r.product.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <Modal title="Automatic quote creation process" onClose={onClose} variant="medium">
        <div className="form">
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Billing frequency</label>
              <Select value={billingFrequency} onChange={setBillingFrequency} options={BILLING_FREQUENCY_OPTIONS} ariaLabel="Billing frequency" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Term (months)</label>
              <input type="number" min={1} value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Products</span>
            <Button variant="accent" size="sm" type="button" onClick={() => setIsPickerOpen(true)}>
              + Add product
            </Button>
          </div>

          <Table columns={columns} data={rows} keyExtractor={(r) => r.product.id} emptyMessage="No products added yet." />

          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleCreateQuote}
              disabled={rows.length === 0 || termMonths < 1 || isSubmitting}
            >
              {isSubmitting ? 'Creating quote' : 'Create Quote'}
            </Button>
          </div>
        </div>
      </Modal>

      {isPickerOpen && <ProductPickerModal onPick={handlePickProduct} onClose={() => setIsPickerOpen(false)} />}
    </>
  );
}
