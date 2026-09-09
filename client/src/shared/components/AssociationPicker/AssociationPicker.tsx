import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CompanySearchSelect } from '../SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../SearchSelect/ContactSearchSelect';
import styles from './AssociationPicker.module.css';

export type AssociationItem = { id: string; label: string };

type Props = {
  label: string;
  targetType: 'companies' | 'contacts';
  selected: AssociationItem[];
  onChange: (items: AssociationItem[]) => void;
  // Omitted/undefined = unlimited (multi-select, add-one-at-a-time via the
  // "+ Add" link). max={1} collapses this to a single-slot picker (e.g.
  // Contact's own Company field) — the search box shows directly whenever
  // empty, no reveal step needed since there's only ever one slot.
  max?: number;
};

function contactLabel(c: { firstname: string | null; lastname: string | null; email: string | null }): string {
  return [c.firstname, c.lastname].filter(Boolean).join(' ') || c.email || 'Untitled contact';
}

function companyLabel(c: { name: string | null; domain: string | null }): string {
  return c.name || c.domain || 'Untitled company';
}

// Bordered "associate with X" card — search an existing Company/Contact and
// link it to the record still being created (no real id to associate
// against yet, so selections are only batched into real POST /api/associations
// calls once the parent form actually submits — see each XForm's
// handleSubmit). Creating a brand-new Company/Contact here is intentionally
// not supported: that's a chicken-and-egg-prone shortcut this app removed in
// favor of "go create the record on its own page, then come back and
// associate it" — kept simple and predictable.
export function AssociationPicker({ label, targetType, selected, onChange, max }: Props) {
  const [isAddingAnother, setIsAddingAnother] = useState(false);
  const isMulti = max === undefined;
  const atMax = max !== undefined && selected.length >= max;
  const objectLabel = targetType === 'companies' ? 'company' : 'contact';
  const objectLabelPlural = targetType === 'companies' ? 'companies' : 'contacts';
  const objectPageHref = `/${targetType}`;

  function addItem(item: AssociationItem) {
    if (selected.some((s) => s.id === item.id)) return;
    onChange(isMulti ? [...selected, item] : [item]);
    setIsAddingAnother(false);
  }

  function removeItem(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  // Single-select: show the search box directly whenever the one slot is
  // empty. Multi-select: only show it while actively adding (after "+ Add"
  // is clicked), otherwise show the link instead.
  const showSearch = isMulti ? isAddingAnother : selected.length === 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>{label}</div>
      <div className={styles.body}>
        <p className={styles.description}>
          Search for an existing {objectLabel} to associate. To create a new one, use the{' '}
          <a href={objectPageHref} target="_blank" rel="noopener noreferrer" className="link">
            {targetType === 'companies' ? 'Companies' : 'Contacts'}
          </a>{' '}
          page.
        </p>

        {selected.map((item) => (
          <div key={item.id} className={styles.selectedRow}>
            <span className={styles.selectedName}>{item.label}</span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {showSearch &&
          (targetType === 'companies' ? (
            <CompanySearchSelect value={null} onChange={(c) => c && addItem({ id: c.id, label: companyLabel(c) })} />
          ) : (
            <ContactSearchSelect value={null} onChange={(c) => c && addItem({ id: c.id, label: contactLabel(c) })} />
          ))}

        {isMulti && !atMax && !isAddingAnother && (
          <button type="button" className={`link ${styles.addLink}`} onClick={() => setIsAddingAnother(true)}>
            + Add {selected.length > 0 ? objectLabel : objectLabelPlural}
          </button>
        )}
      </div>
    </div>
  );
}
