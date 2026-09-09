import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { AssociationPicker } from '../../shared/components/AssociationPicker/AssociationPicker';
import type { AssociationItem } from '../../shared/components/AssociationPicker/AssociationPicker';
import { associationsApi } from '../../shared/api/associations';
import { contactsApi } from './api/contacts';
import type { CreateContactInput } from '../../shared/types/index';

type FormState = {
  email: string;
  firstname: string;
  lastname: string;
  jobtitle: string;
  phone: string;
};

const EMPTY_FORM: FormState = { email: '', firstname: '', lastname: '', jobtitle: '', phone: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add contact" flow — the wide slide-over version. Distinct
// from ContactForm.tsx (kept as-is, small-field-set), which AssociationPicker
// still reuses for its own nested "+ Create new contact" affordance —
// nesting this same slide-over inside another slide-over would be a
// confusing stacked-panel UI, so that path deliberately stays on the small
// Modal-based form instead.
export function CreateContactPanel({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [company, setCompany] = useState<AssociationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateContactInput = {
        firstname: form.firstname,
        email: form.email,
        ...(form.lastname && { lastname: form.lastname }),
        ...(form.jobtitle && { jobtitle: form.jobtitle }),
        ...(form.phone && { phone: form.phone }),
        ...(company[0] && { company: company[0].label }),
      };
      const created = await contactsApi.create(input);
      if (company[0]) {
        await associationsApi.create({
          sourceType: 'contacts',
          sourceId: created.id,
          targetType: 'companies',
          targetId: company[0].id,
        });
      }
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Contact" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input label="Email *" type="email" value={form.email} onChange={set('email')} required />
      <Input label="First name *" value={form.firstname} onChange={set('firstname')} required />
      <Input label="Last name" value={form.lastname} onChange={set('lastname')} />
      <Input label="Job title" value={form.jobtitle} onChange={set('jobtitle')} />
      <Input label="Phone number" value={form.phone} onChange={set('phone')} />
      <AssociationPicker label="Company" targetType="companies" selected={company} onChange={setCompany} max={1} />
    </CreateSlideOver>
  );
}
