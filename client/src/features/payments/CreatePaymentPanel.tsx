import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { InvoiceSearchSelect } from '../../shared/components/SearchSelect/InvoiceSearchSelect';
import { Select } from '../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { paymentsApi } from './api/payments';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../shared/types/index';
import type { CreatePaymentInput, Invoice, PaymentMethod } from '../../shared/types/index';

type FormState = {
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  internalNote: string;
};

function emptyForm(): FormState {
  return {
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'wire_transfer',
    referenceNumber: '',
    internalNote: '',
  };
}

type Props = {
  onCreated: () => void;
  onClose: () => void;
};

// Page-level "+ Register Payment" flow. Distinct from PaymentForm.tsx (kept
// as-is, same field set), which InvoiceDetailContent.tsx's own "Register
// Payment" action still uses inside a plain Modal — that's a contextual
// action nested within an already-open invoice, not the top-level list-page
// create flow this replaces.
export function CreatePaymentPanel({ onCreated, onClose }: Props) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: 'amount' | 'paymentDate' | 'referenceNumber' | 'internalNote') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    if (!selectedInvoice) {
      setError('Select an invoice');
      return;
    }
    setIsSubmitting(true);
    try {
      const input: CreatePaymentInput = {
        invoiceId: selectedInvoice.id,
        amount: form.amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        ...(form.referenceNumber && { referenceNumber: form.referenceNumber }),
        ...(form.internalNote && { internalNote: form.internalNote }),
      };
      await paymentsApi.create(input);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register payment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Payment" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <div className="form-group">
        <label>Invoice *</label>
        <InvoiceSearchSelect value={selectedInvoice} onChange={setSelectedInvoice} unpaidOnly />
      </div>

      <div className="form-group">
        <label>Amount *</label>
        <CurrencyMaskedInput value={form.amount} onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))} required />
      </div>

      <div className="form-group">
        <label>Payment date *</label>
        <input type="date" value={form.paymentDate} onChange={set('paymentDate')} required />
      </div>

      <div className="form-group">
        <label>Payment method *</label>
        <Select
          value={form.paymentMethod}
          onChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }))}
          options={PAYMENT_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }))}
          ariaLabel="Payment method"
        />
      </div>

      <div className="form-group">
        <label>Reference number</label>
        <input value={form.referenceNumber} onChange={set('referenceNumber')} placeholder="e.g. wire confirmation number" />
      </div>

      <div className="form-group">
        <label>Internal note</label>
        <textarea
          value={form.internalNote}
          onChange={set('internalNote')}
          rows={3}
          style={{ resize: 'vertical' }}
          placeholder="Notes visible only inside the CRM…"
        />
      </div>
    </CreateSlideOver>
  );
}
