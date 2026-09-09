import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { companiesApi } from './api/companies';
import type { CreateCompanyInput } from '../../shared/types/index';

type FormState = {
  domain: string;
  name: string;
  industry: string;
  salesRegion: string;
  country: string;
  city: string;
};

const EMPTY_FORM: FormState = { domain: '', name: '', industry: '', salesRegion: '', country: '', city: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add company" flow. Distinct from CompanyForm.tsx (kept
// as-is), which AssociationPicker still reuses for its own nested
// "+ Create new company" affordance from within other objects' forms.
export function CreateCompanyPanel({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateCompanyInput = {
        name: form.name,
        ...(form.domain && { domain: form.domain }),
        ...(form.industry && { industry: form.industry }),
        ...(form.salesRegion && { salesRegion: form.salesRegion }),
        ...(form.country && { country: form.country }),
        ...(form.city && { city: form.city }),
      };
      const created = await companiesApi.create(input);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Company" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input label="Domain" value={form.domain} onChange={set('domain')} />
      <Input label="Company name *" value={form.name} onChange={set('name')} required />
      <Input label="Industry" value={form.industry} onChange={set('industry')} />
      <Input label="Sales Region" value={form.salesRegion} onChange={set('salesRegion')} />
      <Input label="Country" value={form.country} onChange={set('country')} />
      <Input label="City" value={form.city} onChange={set('city')} />
    </CreateSlideOver>
  );
}
