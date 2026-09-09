import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import type { PropertyGroup } from '../../../shared/api/objectProperties';

const NO_GROUP = '';

type Props = {
  initialLabel: string;
  initialGroupId: string | null;
  groups: PropertyGroup[];
  onSubmit: (data: { label: string; groupId: string | null }) => Promise<void>;
  onCancel: () => void;
};

export function PropertyEditForm({ initialLabel, initialGroupId, groups, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initialLabel);
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? NO_GROUP);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({ label, groupId: groupId || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Property name</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} required autoFocus />
      </div>
      <div className="form-group">
        <label>Group</label>
        <Select
          value={groupId}
          onChange={setGroupId}
          options={[{ value: NO_GROUP, label: 'No group' }, ...groups.map((g) => ({ value: g.id, label: g.label }))]}
          ariaLabel="Group"
        />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="settings-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
