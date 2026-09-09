import { useSearchParams } from 'react-router-dom';
import { Building2, CreditCard, FileSpreadsheet, FileText, Handshake, KeySquare, Package, Receipt, Target, Ticket, User } from 'lucide-react';
import { Select } from '../../../shared/components/Dropdown/Select';
import { ObjectSettingsPage } from '../../../shared/components/ObjectSettingsPage/ObjectSettingsPage';

export const OBJECT_OPTIONS = [
  { value: 'contacts', label: 'Contacts', icon: User },
  { value: 'companies', label: 'Companies', icon: Building2 },
  { value: 'deals', label: 'Deals', icon: Target },
  { value: 'tickets', label: 'Tickets', icon: Ticket },
  { value: 'partnerships', label: 'Partnerships', icon: Handshake },
  { value: 'quotes', label: 'Quotes', icon: FileSpreadsheet },
  { value: 'invoices', label: 'Invoices', icon: FileText },
  { value: 'payments', label: 'Payments', icon: CreditCard },
  { value: 'licenses', label: 'Licenses', icon: KeySquare },
  { value: 'creditMemos', label: 'Credit Memos', icon: Receipt },
  { value: 'products', label: 'Products', icon: Package },
] as const;

export type ObjectValue = (typeof OBJECT_OPTIONS)[number]['value'];
const OBJECT_VALUES = OBJECT_OPTIONS.map((o) => o.value) as string[];

export const OBJECT_LABELS: Record<ObjectValue, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
  tickets: 'Tickets',
  partnerships: 'Partnerships',
  quotes: 'Quotes',
  invoices: 'Invoices',
  payments: 'Payments',
  licenses: 'Licenses',
  creditMemos: 'Credit Memos',
  products: 'Products',
};

export function isObjectValue(value: string | null): value is ObjectValue {
  return value !== null && OBJECT_VALUES.includes(value);
}

export function ObjectsPage() {
  // Deep-linkable via ?object=companies (used by e.g. the Contacts lifecycle
  // banner to jump straight to Companies' lifecycle tab) — selection is
  // derived straight from the URL so a Link to this same route with a
  // different query param always takes effect, even without a remount.
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('object');
  const selected: ObjectValue = isObjectValue(fromUrl) ? fromUrl : 'contacts';

  function selectObject(value: ObjectValue) {
    setSearchParams({ object: value }, { replace: true });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Objects</h1>
      </div>

      <div className="tab-panel-section" style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>Select an object:</label>
        <Select value={selected} onChange={selectObject} options={[...OBJECT_OPTIONS]} ariaLabel="Select an object" />
      </div>

      <ObjectSettingsPage title={OBJECT_LABELS[selected]} objectType={selected} hideHeader />
    </div>
  );
}
