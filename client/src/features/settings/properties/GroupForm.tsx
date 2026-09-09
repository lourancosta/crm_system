import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';

type Props = {
  initialLabel?: string;
  onSubmit: (label: string) => Promise<void>;
  onCancel: () => void;
};

export function GroupForm({ initialLabel = '', onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initialLabel);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Group name</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} required autoFocus />
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
