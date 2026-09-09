import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { Select } from '../../shared/components/Dropdown/Select';
import { AssociationPicker } from '../../shared/components/AssociationPicker/AssociationPicker';
import type { AssociationItem } from '../../shared/components/AssociationPicker/AssociationPicker';
import { associationsApi } from '../../shared/api/associations';
import { partnershipsApi } from './api/partnerships';
import type { CreatePartnershipInput } from '../../shared/types/index';

const TYPE_OPTIONS = [
  { value: '', label: '— Select type —' },
  { value: 'MSP', label: 'MSP' },
  { value: 'Reseller', label: 'Reseller' },
  { value: 'MSP/Reseller', label: 'MSP/Reseller' },
];

type FormState = {
  companyName: string;
  closeDate: string;
  typeObj: string;
};

const EMPTY_FORM: FormState = { companyName: '', closeDate: '', typeObj: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add partnership" flow — PartnershipForm isn't reused as a
// nested inline-create target anywhere else, so this rewrites in place.
// The backend's own `name` (required) mirrors the visible "Partner company
// name" field — there's no separate generic "Name" input here, since the
// requested field set only asks for the company name.
export function PartnershipForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [companies, setCompanies] = useState<AssociationItem[]>([]);
  const [contacts, setContacts] = useState<AssociationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreatePartnershipInput = {
        name: form.companyName,
        companyName: form.companyName,
        ...(form.closeDate && { closeDate: form.closeDate }),
        ...(form.typeObj && { typeObj: form.typeObj }),
      };
      const created = await partnershipsApi.create(input);
      await Promise.all([
        ...companies.map((c) =>
          associationsApi.create({ sourceType: 'partnerships', sourceId: created.id, targetType: 'companies', targetId: c.id }),
        ),
        ...contacts.map((c) =>
          associationsApi.create({ sourceType: 'partnerships', sourceId: created.id, targetType: 'contacts', targetId: c.id }),
        ),
      ]);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Partnership" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input
        label="Partner company name *"
        value={form.companyName}
        onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
        required
      />
      <Input
        label="Close date"
        type="date"
        value={form.closeDate}
        onChange={(e) => setForm((prev) => ({ ...prev, closeDate: e.target.value }))}
      />
      <div className="form-group">
        <label>Type</label>
        <Select value={form.typeObj} onChange={(v) => setForm((prev) => ({ ...prev, typeObj: v }))} options={TYPE_OPTIONS} ariaLabel="Type" />
      </div>

      <AssociationPicker label="Companies" targetType="companies" selected={companies} onChange={setCompanies} />
      <AssociationPicker label="Contacts" targetType="contacts" selected={contacts} onChange={setContacts} />
    </CreateSlideOver>
  );
}
