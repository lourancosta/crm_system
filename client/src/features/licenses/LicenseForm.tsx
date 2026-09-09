import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { Select } from '../../shared/components/Dropdown/Select';
import { AssociationPicker } from '../../shared/components/AssociationPicker/AssociationPicker';
import type { AssociationItem } from '../../shared/components/AssociationPicker/AssociationPicker';
import { associationsApi } from '../../shared/api/associations';
import { licensesApi } from './api/licenses';
import type { CreateLicenseInput } from '../../shared/types/index';
import { roundToInteger } from '../../shared/utils/numberInput';

const TYPE_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'subscriber', label: 'Subscriber' },
];

const SUBSCRIPTION_OPTIONS = [
  { value: 'msp', label: 'MSP' },
  { value: 'reseller', label: 'Reseller' },
];

const MODULE_OPTIONS = [
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Leak', label: 'Leak' },
  { value: 'Fraud/Leak', label: 'Fraud/Leak' },
  { value: 'Cloud', label: 'Cloud' },
  { value: 'Infra', label: 'Infra' },
  { value: 'App', label: 'App' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
];

type FormState = {
  name: string;
  typeObj: string;
  subscription: string;
  module: string;
  quantity: string;
  status: string;
  platformCreatedDate: string;
  activationDate: string;
  expirationDate: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  typeObj: 'subscriber',
  subscription: 'msp',
  module: '',
  quantity: '',
  status: 'active',
  platformCreatedDate: '',
  activationDate: '',
  expirationDate: '',
};

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add license" flow — LicenseForm isn't reused as a nested
// inline-create target anywhere else, so this rewrites in place.
export function LicenseForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [companies, setCompanies] = useState<AssociationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: 'name' | 'quantity') {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function setDate(field: 'platformCreatedDate' | 'activationDate' | 'expirationDate') {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateLicenseInput = {
        name: form.name,
        typeObj: form.typeObj,
        subscription: form.subscription,
        status: form.status,
        ...(form.module && { module: form.module }),
        ...(form.quantity && { quantity: form.quantity }),
        ...(form.platformCreatedDate && { platformCreatedDate: form.platformCreatedDate }),
        ...(form.activationDate && { activationDate: form.activationDate }),
        ...(form.expirationDate && { expirationDate: form.expirationDate }),
      };
      const created = await licensesApi.create(input);
      await Promise.all(
        companies.map((c) =>
          associationsApi.create({ sourceType: 'licenses', sourceId: created.id, targetType: 'companies', targetId: c.id }),
        ),
      );
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save license');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateSlideOver title="License" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input label="License name *" value={form.name} onChange={set('name')} required />

      <div className="form-group">
        <label>Type</label>
        <Select value={form.typeObj} onChange={(v) => setForm((prev) => ({ ...prev, typeObj: v }))} options={TYPE_OPTIONS} ariaLabel="Type" />
      </div>

      <div className="form-group">
        <label>Subscription</label>
        <Select
          value={form.subscription}
          onChange={(v) => setForm((prev) => ({ ...prev, subscription: v }))}
          options={SUBSCRIPTION_OPTIONS}
          ariaLabel="Subscription"
        />
      </div>

      <div className="form-group">
        <label>Module</label>
        <Select value={form.module} onChange={(v) => setForm((prev) => ({ ...prev, module: v }))} options={MODULE_OPTIONS} ariaLabel="Module" />
      </div>

      <Input
        label="Quantity"
        type="number"
        step="1"
        min="0"
        value={form.quantity}
        onChange={set('quantity')}
        onBlur={() => setForm((prev) => ({ ...prev, quantity: roundToInteger(prev.quantity) }))}
      />

      <div className="form-group">
        <label>Status</label>
        <Select value={form.status} onChange={(v) => setForm((prev) => ({ ...prev, status: v }))} options={STATUS_OPTIONS} ariaLabel="Status" />
      </div>

      <Input label="Platform Created Date" type="date" value={form.platformCreatedDate} onChange={setDate('platformCreatedDate')} />
      <Input label="Activation Date" type="date" value={form.activationDate} onChange={setDate('activationDate')} />
      <Input label="Expiration Date" type="date" value={form.expirationDate} onChange={setDate('expirationDate')} />

      <AssociationPicker label="Companies" targetType="companies" selected={companies} onChange={setCompanies} />
    </CreateSlideOver>
  );
}
