import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { creditMemosApi } from './api/creditMemos';
import type { Company, Contact, CreateCreditMemoInput } from '../../shared/types/index';

type Props = {
  onCreated: () => void;
  onClose: () => void;
};

// Page-level "+ Issue Credit Memo" flow. Distinct from CreditMemoForm.tsx
// (kept as-is, same field set), which InvoiceDetailContent.tsx's own "Issue
// Credit Memo" action still uses inside a plain Modal — that's a contextual
// action nested within an already-open invoice, not the top-level list-page
// create flow this replaces.
export function CreateCreditMemoPanel({ onCreated, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Contact is scoped to whichever company is picked — clear it whenever the
  // company changes so a stale contact from a different company can't linger.
  function handleCompanyChange(next: Company | null) {
    setCompany(next);
    setContact(null);
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateCreditMemoInput = {
        amount,
        ...(reason && { reason }),
        ...(company && { companyId: company.id }),
        ...(contact && { contactId: contact.id }),
      };
      await creditMemosApi.create(input);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue credit memo');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Credit Memo" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
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
    </CreateSlideOver>
  );
}
