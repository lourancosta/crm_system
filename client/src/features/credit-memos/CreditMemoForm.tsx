import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../shared/components/Button/Button';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { roundToDecimals } from '../../shared/utils/numberInput';
import type { Company, Contact, CreateCreditMemoInput, CreditMemo } from '../../shared/types/index';

type Props = {
  initial?: CreditMemo;
  onSubmit: (data: CreateCreditMemoInput) => Promise<void>;
  onCancel: () => void;
};

// A credit memo is a company-level reusable balance (applied to invoices ad
// hoc later — see the invoice form's "Credit memo" section), so it no longer
// needs to originate from one specific invoice at creation time.
export function CreditMemoForm({ initial, onSubmit, onCancel }: Props) {
  // Round on load — a server value can carry more precision than the UI
  // ever writes back, so an existing credit memo must already display 2
  // decimals instead of only reformatting once the field is blurred.
  const [amount, setAmount] = useState(initial?.hsAmountCredited ? roundToDecimals(String(initial.hsAmountCredited), 2) : '');
  const [reason, setReason] = useState(initial?.hsComments ?? '');
  const [company, setCompany] = useState<Company | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact is scoped to whichever company is picked — clear it whenever the
  // company changes so a stale contact from a different company can't linger.
  function handleCompanyChange(next: Company | null) {
    setCompany(next);
    setContact(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        ...(reason && { reason }),
        // Company/contact associations are only set at creation time — not
        // reassignable when editing an existing credit memo.
        ...(!initial && company && { companyId: company.id }),
        ...(!initial && contact && { contactId: contact.id }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue credit memo');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Amount *</label>
        <CurrencyMaskedInput value={amount} onChange={setAmount} required />
      </div>

      <div className="form-group">
        <label>Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
          placeholder="Why this credit memo is being issued…"
        />
      </div>

      {!initial && (
        <>
          <div className="form-group">
            <label>Company</label>
            <CompanySearchSelect value={company} onChange={handleCompanyChange} />
          </div>

          <div className="form-group">
            <label>Contact</label>
            <ContactSearchSelect
              value={contact}
              onChange={setContact}
              companyId={company?.id}
              disabled={!company}
              disabledPlaceholder="Select a company first…"
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Issue credit memo'}
        </Button>
      </div>
    </form>
  );
}
