import { useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';
import { Select } from '../Dropdown/Select';
import type { ActivityAssociationOption, HistoryLoggableObjectType, LogActivityInput, LoggableActivityType } from '../../types/index';
import styles from './LogActivityModal.module.css';

const TYPE_OPTIONS: { value: LoggableActivityType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
];

const TYPE_PLACEHOLDERS: Record<LoggableActivityType, string> = {
  note: 'Start typing to leave a note…',
  call: 'Start typing to log this call…',
  meeting: 'Start typing to log this meeting…',
  email: 'Start typing to log this email…',
};

// Only object types that fetch their own associated records (contacts,
// companies, deals, tickets) pass a non-empty associationOptions — every
// other object type simply never populates it.
const OBJECT_TYPE_LABELS: Partial<Record<HistoryLoggableObjectType, string>> = {
  contacts: 'Contact',
  companies: 'Company',
  deals: 'Deal',
  tickets: 'Ticket',
};

type Props = {
  onSubmit: (input: LogActivityInput) => Promise<void>;
  onClose: () => void;
  associationOptions?: ActivityAssociationOption[];
  // When set, the modal edits an existing entry instead of creating a new
  // one. type: 'email' means associations-only editing — content/type are
  // never user-editable for synced emails.
  initial?: { type: LoggableActivityType | 'email'; content: string };
  // Which of associationOptions are currently associated — only meaningful
  // (and only fetched by the caller) when editing.
  initialAssociationKeys?: Set<string>;
  // Which activity types are selectable — defaults to Note/Call/Meeting.
  allowedTypes?: LoggableActivityType[];
};

function optionKey(objectType: HistoryLoggableObjectType, id: string) {
  return `${objectType}:${id}`;
}

export function LogActivityModal({
  onSubmit,
  onClose,
  associationOptions = [],
  initial,
  initialAssociationKeys,
  allowedTypes = TYPE_OPTIONS.map((o) => o.value),
}: Props) {
  const isEmailEdit = initial?.type === 'email';
  const typeOptions = TYPE_OPTIONS.filter((o) => allowedTypes.includes(o.value));
  const [type, setType] = useState<LoggableActivityType>(
    isEmailEdit ? (allowedTypes[0] ?? 'note') : ((initial?.type as LoggableActivityType | undefined) ?? allowedTypes[0] ?? 'note'),
  );
  const [content, setContent] = useState(initial?.content ?? '');
  const [selectedAssociations, setSelectedAssociations] = useState<Set<string>>(
    () => new Set(initialAssociationKeys),
  );
  const [isAssociationsOpen, setIsAssociationsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleAssociation(key: string) {
    setSelectedAssociations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const associations = associationOptions
        .filter((opt) => selectedAssociations.has(optionKey(opt.objectType, opt.id)))
        .map((opt) => ({ objectType: opt.objectType, objectId: opt.id }));
      // Only the exact records actually offered here as checkboxes are safe
      // to add/remove — an existing association this screen never displayed
      // (e.g. a synced email's ticket association, or a contact unrelated to
      // the company being edited from) must be preserved, not dropped just
      // because it wasn't shown as an option.
      const associationScopeTargets = associationOptions.map((opt) => ({ objectType: opt.objectType, objectId: opt.id }));
      await onSubmit(
        isEmailEdit
          ? { associations, associationScopeTargets }
          : { type, content, associations, associationScopeTargets },
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeLabel = isEmailEdit ? 'Email' : (TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Activity');
  const recordCount = 1 + selectedAssociations.size;

  return (
    <Modal title={typeLabel} onClose={onClose} variant="accent" width="533px">
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="alert alert-error">{error}</div>}
        {!isEmailEdit && typeOptions.length > 1 && (
          <div className="form-group">
            <label>Type</label>
            <Select value={type} options={typeOptions} onChange={setType} />
          </div>
        )}
        <div className="form-group">
          {isEmailEdit && <label>Content (not editable)</label>}
          <textarea
            className={`${styles['content-textarea']}${isEmailEdit ? ` ${styles['content-textarea--readonly']}` : ''}`}
            rows={15}
            value={content}
            onChange={isEmailEdit ? undefined : (e) => setContent(e.target.value)}
            placeholder={isEmailEdit ? undefined : TYPE_PLACEHOLDERS[type]}
            required={!isEmailEdit}
            readOnly={isEmailEdit}
          />
        </div>
        <div className={styles['associated-section']}>
          {associationOptions.length > 0 ? (
            <button
              type="button"
              className={styles['associated-toggle']}
              onClick={() => setIsAssociationsOpen((open) => !open)}
            >
              Associated with {recordCount} record{recordCount === 1 ? '' : 's'}
              <ChevronDown size={14} className={isAssociationsOpen ? styles['chevron--open'] : ''} />
            </button>
          ) : (
            <span className={styles['associated-static']}>Associated with 1 record</span>
          )}
          {isAssociationsOpen && associationOptions.length > 0 && (
            <div className={styles['associated-list']}>
              {associationOptions.map((opt) => {
                const key = optionKey(opt.objectType, opt.id);
                return (
                  <label key={key} className={styles['associated-option']}>
                    <input
                      type="checkbox"
                      checked={selectedAssociations.has(key)}
                      onChange={() => toggleAssociation(key)}
                    />
                    <span>{opt.label}</span>
                    <span className={styles['associated-type']}>{OBJECT_TYPE_LABELS[opt.objectType]}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
