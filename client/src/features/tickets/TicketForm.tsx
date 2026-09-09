import { useState } from 'react';
import { CreateSlideOver } from '../../shared/components/SlideOverPanel/CreateSlideOver';
import { Input } from '../../shared/components/Input/Input';
import { PipelineStageSelect } from '../../shared/components/Pipeline/PipelineStageSelect';
import { AssociationPicker } from '../../shared/components/AssociationPicker/AssociationPicker';
import type { AssociationItem } from '../../shared/components/AssociationPicker/AssociationPicker';
import { associationsApi } from '../../shared/api/associations';
import { ticketsApi } from './api/tickets';
import type { CreateTicketInput } from '../../shared/types/index';

type FormState = {
  subject: string;
  hsPipeline: string;
  hsPipelineStage: string;
  content: string;
};

const EMPTY_FORM: FormState = { subject: '', hsPipeline: '', hsPipelineStage: '', content: '' };

type Props = {
  onCreated: (id: string) => void;
  onClose: () => void;
};

// Page-level "+ Add ticket" flow — TicketForm isn't reused as a nested
// inline-create target anywhere else, so this rewrites in place.
export function TicketForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [contacts, setContacts] = useState<AssociationItem[]>([]);
  const [companies, setCompanies] = useState<AssociationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, content: e.target.value }));
  }

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const input: CreateTicketInput = {
        subject: form.subject,
        ...(form.content && { content: form.content }),
        ...(form.hsPipeline && { hsPipeline: form.hsPipeline }),
        ...(form.hsPipelineStage && { hsPipelineStage: form.hsPipelineStage }),
      };
      const created = await ticketsApi.create(input);
      await Promise.all([
        ...contacts.map((c) =>
          associationsApi.create({ sourceType: 'tickets', sourceId: created.id, targetType: 'contacts', targetId: c.id }),
        ),
        ...companies.map((c) =>
          associationsApi.create({ sourceType: 'tickets', sourceId: created.id, targetType: 'companies', targetId: c.id }),
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
    <CreateSlideOver title="Ticket" onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={error}>
      <Input
        label="Ticket name *"
        value={form.subject}
        onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
        required
        autoFocus
      />

      <PipelineStageSelect
        objectType="tickets"
        pipeline={form.hsPipeline}
        onPipelineChange={(v) => setForm((prev) => ({ ...prev, hsPipeline: v }))}
        stage={form.hsPipelineStage}
        onStageChange={(v) => setForm((prev) => ({ ...prev, hsPipelineStage: v }))}
      />

      <div className="form-group">
        <label>Ticket description</label>
        <textarea value={form.content} onChange={handleContentChange} rows={3} style={{ resize: 'vertical' }} />
      </div>

      <AssociationPicker label="Contacts" targetType="contacts" selected={contacts} onChange={setContacts} />
      <AssociationPicker label="Companies" targetType="companies" selected={companies} onChange={setCompanies} />
    </CreateSlideOver>
  );
}
