import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../shared/components/Button/Button';
import { InvoiceSearchSelect } from '../../shared/components/SearchSelect/InvoiceSearchSelect';
import { Select } from '../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { roundToDecimals } from '../../shared/utils/numberInput';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../shared/types/index';
import type { CreatePaymentInput, Invoice, Payment, PaymentMethod } from '../../shared/types/index';

type Props = {
  initial?: Payment;
  fixedInvoice?: { id: string; label: string };
  onSubmit: (data: CreatePaymentInput) => Promise<void>;
  onCancel: () => void;
};

export function PaymentForm({ initial, fixedInvoice, onSubmit, onCancel }: Props) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    // Round on load — a server value can carry more precision than the UI
    // ever writes back, so an existing payment must already display 2
    // decimals instead of only reformatting once the field is blurred.
    amount: initial?.hsInitialAmount ? roundToDecimals(String(initial.hsInitialAmount), 2) : '',
    paymentDate: initial?.hsInitiatedDate ? initial.hsInitiatedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    paymentMethod: (initial?.hsPaymentMethodType as PaymentMethod) ?? ('wire_transfer' as PaymentMethod),
    referenceNumber: initial?.hsReferenceNumber ?? '',
    internalNote: initial?.hsInternalComment ?? '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set(field: 'amount' | 'paymentDate' | 'referenceNumber' | 'internalNote') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const invoiceId = fixedInvoice?.id ?? selectedInvoice?.id;
    if (!invoiceId) {
      setError('Select an invoice');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        invoiceId,
        amount: form.amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        ...(form.referenceNumber && { referenceNumber: form.referenceNumber }),
        ...(form.internalNote && { internalNote: form.internalNote }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register payment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Invoice *</label>
        {fixedInvoice ? (
          <input value={fixedInvoice.label} readOnly disabled />
        ) : (
          <InvoiceSearchSelect value={selectedInvoice} onChange={setSelectedInvoice} unpaidOnly />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Amount *</label>
          <CurrencyMaskedInput value={form.amount} onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))} required />
        </div>
        <div className="form-group">
          <label>Payment date *</label>
          <input type="date" value={form.paymentDate} onChange={set('paymentDate')} required />
        </div>
      </div>

      <div className="form-group">
        <label>Payment method *</label>
        <Select
          value={form.paymentMethod}
          onChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }))}
          options={PAYMENT_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }))}
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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Register payment'}
        </Button>
      </div>
    </form>
  );
}
