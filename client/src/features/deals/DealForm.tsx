import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { Select } from '../../shared/components/Dropdown/Select';
import { MultiSelect } from '../../shared/components/Dropdown/MultiSelect';
import { PipelineStageSelect } from '../../shared/components/Pipeline/PipelineStageSelect';
import { AssociationPicker } from '../../shared/components/AssociationPicker/AssociationPicker';
import type { AssociationItem } from '../../shared/components/AssociationPicker/AssociationPicker';
import { associationsApi } from '../../shared/api/associations';
import { dealsApi } from './api/deals';
import type { CreateDealInput } from '../../shared/types/index';

const DEAL_PARTNER_TYPES = [
  { value: '', label: '— Select type —' },
  { value: 'msp', label: 'MSP' },
  { value: 'reseller', label: 'Reseller' },
];

const MODULE_OPTIONS = [
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Leak', label: 'Leak' },
  { value: 'Cloud', label: 'Cloud' },
  { value: 'Infra', label: 'Infra' },
  { value: 'App', label: 'App' },
];

type FormState = {
  dealname: string;
  pipeline: string;
  dealstage: string;
  dealPartnerType: string;
};

const EMPTY_FORM: FormState = { dealname: '', pipeline: '', dealstage: '', dealPartnerType: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add deal" flow — DealForm isn't reused as a nested
// inline-create target anywhere else (only Companies/Contacts are, via
// AssociationPicker), so unlike Contact/Company this rewrites in place
// rather than needing a separate small-modal sibling component.
export function DealForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [modules, setModules] = useState<string[]>([]);
  const [contacts, setContacts] = useState<AssociationItem[]>([]);
  const [companies, setCompanies] = useState<AssociationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateDealInput = {
        dealname: form.dealname,
        ...(form.pipeline && { pipeline: form.pipeline }),
        ...(form.dealstage && { dealstage: form.dealstage }),
        ...(form.dealPartnerType && { dealPartnerType: form.dealPartnerType }),
        ...(modules.length > 0 && { certificationModules: modules.join('; ') }),
      };
      const created = await dealsApi.create(input);
      await Promise.all([
        ...contacts.map((c) =>
          associationsApi.create({ sourceType: 'deals', sourceId: created.id, targetType: 'contacts', targetId: c.id }),
        ),
        ...companies.map((c) =>
          associationsApi.create({ sourceType: 'deals', sourceId: created.id, targetType: 'companies', targetId: c.id }),
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
    <CreateSlideOver title="Deal" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input label="Deal name *" value={form.dealname} onChange={set('dealname')} required />

      <PipelineStageSelect
        objectType="deals"
        pipeline={form.pipeline}
        onPipelineChange={(v) => setForm((prev) => ({ ...prev, pipeline: v }))}
        stage={form.dealstage}
        onStageChange={(v) => setForm((prev) => ({ ...prev, dealstage: v }))}
      />

      <div className="form-group">
        <label>Modules</label>
        <MultiSelect
          options={MODULE_OPTIONS}
          selected={modules}
          onChange={setModules}
          placeholder="Select modules…"
          ariaLabel="Modules"
        />
      </div>

      <div className="form-group">
        <label>Type</label>
        <Select
          value={form.dealPartnerType}
          onChange={(v) => setForm((prev) => ({ ...prev, dealPartnerType: v }))}
          options={DEAL_PARTNER_TYPES}
          ariaLabel="Type"
        />
      </div>

      <AssociationPicker label="Contacts" targetType="contacts" selected={contacts} onChange={setContacts} />
      <AssociationPicker label="Companies" targetType="companies" selected={companies} onChange={setCompanies} />
    </CreateSlideOver>
  );
}
