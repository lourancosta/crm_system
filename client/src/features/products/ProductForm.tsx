import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { Select } from '../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { productsApi } from './api/products';
import { BILLING_FREQUENCIES } from '../../shared/types/index';
import type { BillingFrequency, CreateProductInput } from '../../shared/types/index';

// Same set quote line items use (client/src/shared/types/quotes.ts) —
// deliberately not this form's old 5-option list (which also had
// semi_annually), per explicit instruction to match quote line items exactly.
const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const BILLING_FREQUENCY_OPTIONS = BILLING_FREQUENCIES.map((value) => ({ value, label: BILLING_FREQUENCY_LABELS[value] }));

type FormState = {
  name: string;
  hsSku: string;
  description: string;
  recurringbillingfrequency: BillingFrequency;
  controllerUnitPrice: string;
};

const EMPTY_FORM: FormState = { name: '', hsSku: '', description: '', recurringbillingfrequency: 'monthly', controllerUnitPrice: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add product" flow — ProductForm isn't reused as a nested
// inline-create target anywhere else, so this rewrites in place.
export function ProductForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: 'name' | 'hsSku' | 'description' | 'controllerUnitPrice') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateProductInput = {
        name: form.name,
        ...(form.hsSku && { hsSku: form.hsSku }),
        ...(form.description && { description: form.description }),
        recurringbillingfrequency: form.recurringbillingfrequency,
        ...(form.controllerUnitPrice && { controllerUnitPrice: form.controllerUnitPrice }),
      };
      const created = await productsApi.create(input);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="Product" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input label="Product name *" value={form.name} onChange={set('name')} required />
      <Input label="SKU" value={form.hsSku} onChange={set('hsSku')} />
      <div className="form-group">
        <label>Product description</label>
        <textarea value={form.description} onChange={set('description')} rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group">
        <label>Billing frequency</label>
        <Select
          value={form.recurringbillingfrequency}
          onChange={(v) => setForm((prev) => ({ ...prev, recurringbillingfrequency: v }))}
          options={BILLING_FREQUENCY_OPTIONS}
          ariaLabel="Billing frequency"
        />
      </div>
      <div className="form-group">
        <label>Unit price</label>
        <CurrencyMaskedInput value={form.controllerUnitPrice} onChange={(v) => setForm((prev) => ({ ...prev, controllerUnitPrice: v }))} />
      </div>
    </CreateSlideOver>
  );
}
