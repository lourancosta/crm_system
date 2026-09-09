import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Toggle } from '../../../shared/components/Toggle/Toggle';
import { useSubmitGuard } from '../../../shared/hooks/useSubmitGuard';
import { PERMISSION_MODULES, PERMISSION_SCOPES } from '../../../shared/types/index';
import type {
  CreatePermissionSetInput,
  PermissionModule,
  PermissionScope,
  PermissionSetModuleRow,
  PermissionSetWithModules,
} from '../../../shared/types/index';
import styles from './PermissionSetForm.module.css';

const MODULE_LABELS: Record<PermissionModule, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
  tickets: 'Tickets',
  invoices: 'Invoices',
  quotes: 'Quotes',
  licenses: 'Licenses',
  partnerships: 'Partnerships',
  products: 'Products',
  payments: 'Payments',
  creditMemos: 'Credit Memos',
  users: 'Users',
};

const MODULE_DESCRIPTIONS: Record<PermissionModule, string> = {
  contacts: "People associated with your team's deals and companies.",
  companies: 'Organizations your team works with.',
  deals: 'Opportunities your team is tracking.',
  tickets: 'Support conversations from customers and partners.',
  invoices: 'Billing documents sent to customers and partners.',
  quotes: 'Sales quotes and their approval/expiration status.',
  licenses: 'Active product licenses and their terms.',
  partnerships: 'Partner organizations and their program status.',
  products: 'Catalog items available on invoices and deals.',
  payments: 'Recorded payments against invoices.',
  creditMemos: 'Credits issued against invoices.',
  users: 'Logins for internal staff, partners, and customers.',
};

const SCOPE_LABELS: Record<PermissionScope, string> = { none: 'None', own: 'Own records', all: 'All records' };
const SCOPE_OPTIONS = PERMISSION_SCOPES.map((s) => ({ value: s, label: SCOPE_LABELS[s] }));

function defaultRow(module: PermissionModule): PermissionSetModuleRow {
  return { module, viewScope: 'none', canCreate: false, editScope: 'none', deleteScope: 'none', mergeScope: 'none' };
}

// Mirrors the reference pattern: "View (Own), Create, Edit (Own), and Delete
// (All)" — only lists the actions actually granted, action names bold.
function ModuleSummary({ row }: { row: PermissionSetModuleRow }) {
  const parts: { label: string; scope?: string }[] = [];
  if (row.viewScope !== 'none') parts.push({ label: 'View', scope: SCOPE_LABELS[row.viewScope] });
  if (row.canCreate) parts.push({ label: 'Create' });
  if (row.editScope !== 'none') parts.push({ label: 'Edit', scope: SCOPE_LABELS[row.editScope] });
  if (row.deleteScope !== 'none') parts.push({ label: 'Delete', scope: SCOPE_LABELS[row.deleteScope] });
  if (row.mergeScope !== 'none') parts.push({ label: 'Merge' });

  if (parts.length === 0) return <div className={styles['module-summary']}>No access</div>;

  return (
    <div className={styles['module-summary']}>
      {parts.map((p, i) => (
        <span key={p.label}>
          {i > 0 && (i === parts.length - 1 ? ', and ' : ', ')}
          <strong>{p.label}</strong>
          {p.scope ? ` (${p.scope})` : ''}
        </span>
      ))}
    </div>
  );
}

function ModuleCard({
  row,
  onChange,
}: {
  row: PermissionSetModuleRow;
  onChange: (patch: Partial<PermissionSetModuleRow>) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasAccess = row.viewScope !== 'none';

  function toggleModuleAccess(next: boolean) {
    if (next) {
      onChange({ viewScope: 'own' });
      setOpen(true);
    } else {
      onChange({ viewScope: 'none', canCreate: false, editScope: 'none', deleteScope: 'none', mergeScope: 'none' });
    }
  }

  return (
    <div className={styles['module-row']}>
      <div className={styles['module-header']} onClick={() => setOpen((v) => !v)}>
        <ChevronRight size={16} className={`${styles['module-chevron']}${open ? ` ${styles['module-chevron--open']}` : ''}`} />
        <div className={styles['module-header-main']}>
          <div className={styles['module-title']}>{MODULE_LABELS[row.module]}</div>
          <div className={styles['module-description']}>{MODULE_DESCRIPTIONS[row.module]}</div>
          <ModuleSummary row={row} />
        </div>
        <div className={styles['module-toggle']} onClick={(e) => e.stopPropagation()}>
          <Toggle checked={hasAccess} onChange={toggleModuleAccess} />
        </div>
      </div>

      {open && (
        <div className={styles['module-body']}>
          <div className={styles['action-row']}>
            <span className={styles['action-label']}>View</span>
            <div className={styles['action-control']}>
              <Select value={row.viewScope} options={SCOPE_OPTIONS} onChange={(v) => onChange({ viewScope: v })} />
            </div>
          </div>
          <div className={styles['action-row']}>
            <span className={styles['action-label']}>Create</span>
            <div className={styles['action-control']}>
              <Toggle checked={row.canCreate} onChange={(v) => onChange({ canCreate: v })} />
            </div>
          </div>
          <div className={styles['action-row']}>
            <span className={styles['action-label']}>Edit</span>
            <div className={styles['action-control']}>
              <Select value={row.editScope} options={SCOPE_OPTIONS} onChange={(v) => onChange({ editScope: v })} />
            </div>
          </div>
          <div className={styles['action-row']}>
            <span className={styles['action-label']}>
              Delete
              <span className={styles['action-badge']}>Critical</span>
            </span>
            <div className={styles['action-control']}>
              <Select value={row.deleteScope} options={SCOPE_OPTIONS} onChange={(v) => onChange({ deleteScope: v })} />
            </div>
          </div>
          <div className={styles['action-row']}>
            <span className={styles['action-label']}>Merge</span>
            <div className={styles['action-control']}>
              <span className={styles['action-control--inert']}>
                <Select value={row.mergeScope} options={SCOPE_OPTIONS} onChange={() => {}} />
              </span>
              <span className={styles['action-hint']}>Coming soon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const PERMISSION_SET_FORM_ID = 'permission-set-form';

type PermissionSetFormProps = {
  initial?: PermissionSetWithModules;
  onSubmit: (input: CreatePermissionSetInput) => void;
  // The Save button lives in the Modal's pinned footer (outside this <form>,
  // wired via `form={PERMISSION_SET_FORM_ID}`), so the submitting state has
  // to be reported back up to whoever renders that button.
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

export function PermissionSetForm({ initial, onSubmit, onSubmittingChange }: PermissionSetFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [rows, setRows] = useState<Record<PermissionModule, PermissionSetModuleRow>>(() => {
    const byModule = new Map((initial?.modules ?? []).map((m) => [m.module, m]));
    return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, byModule.get(m) ?? defaultRow(m)])) as Record<
      PermissionModule,
      PermissionSetModuleRow
    >;
  });

  function patchRow(module: PermissionModule, patch: Partial<PermissionSetModuleRow>) {
    setRows((prev) => ({ ...prev, [module]: { ...prev[module], ...patch } }));
  }

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, modules: Object.values(rows) });
  });

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  return (
    <form id={PERMISSION_SET_FORM_ID} onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="e.g. Sales Rep" />
      </div>

      <div className={styles['module-list']}>
        {PERMISSION_MODULES.map((module) => (
          <ModuleCard key={module} row={rows[module]} onChange={(patch) => patchRow(module, patch)} />
        ))}
      </div>
    </form>
  );
}
