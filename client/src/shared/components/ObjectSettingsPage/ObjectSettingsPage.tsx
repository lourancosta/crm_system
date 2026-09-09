import { useSearchParams } from 'react-router-dom';
import { PipelineManager } from '../Pipeline/PipelineManager';
import { LifecycleStagesManager } from '../Pipeline/LifecycleStagesManager';
import { SupportInboxSettings } from '../../../features/tickets/SupportInboxSettings';
import { InvoiceReminderRulesPage } from '../../../features/settings/invoice-reminders/InvoiceReminderRulesPage';
import { InvoiceSetupPage } from '../../../features/settings/invoice-setup/InvoiceSetupPage';
import { QuoteSetupPage } from '../../../features/settings/quote-setup/QuoteSetupPage';
import { QuoteSignatureSettingsPage } from '../../../features/settings/quote-setup/QuoteSignatureSettingsPage';
import { TicketInboxBanner } from '../SetupBanner/TicketInboxBanner';
import { InvoiceRemindersBanner } from '../SetupBanner/InvoiceRemindersBanner';
import { QuoteReminderBanner } from '../SetupBanner/QuoteReminderBanner';
import { QuoteCountersignerBanner } from '../SetupBanner/QuoteCountersignerBanner';
import type { LifecycleObjectType, PipelineObjectType } from '../../types/index';

export type ObjectSettingsType = PipelineObjectType | LifecycleObjectType | 'invoices' | 'quotes' | 'payments' | 'licenses' | 'creditMemos' | 'products';

type TabKind =
  | 'pipeline'
  | 'support-inbox'
  | 'lifecycle'
  | 'reminder-rules'
  | 'invoice-setup'
  | 'quote-setup'
  | 'quote-signature'
  | 'none';

const TAB_LABELS: Record<TabKind, string> = {
  pipeline: 'Pipeline',
  'support-inbox': 'Support Inbox',
  lifecycle: 'Lifecycle',
  'reminder-rules': 'Reminder Rules',
  'invoice-setup': 'Setup',
  'quote-setup': 'Setup',
  'quote-signature': 'Signature',
  none: 'Setup',
};

// Which tabs each object shows, in order. Extend this when an object gains
// a new settings feature — everything else here is generic.
const OBJECT_TABS: Record<ObjectSettingsType, TabKind[]> = {
  deals: ['pipeline'],
  tickets: ['pipeline', 'support-inbox'],
  partnerships: ['pipeline'],
  contacts: ['lifecycle'],
  companies: ['lifecycle'],
  invoices: ['invoice-setup', 'reminder-rules'],
  quotes: ['quote-setup', 'quote-signature'],
  payments: ['none'],
  licenses: ['none'],
  creditMemos: ['none'],
  products: ['none'],
};

function isLifecycleType(objectType: ObjectSettingsType): objectType is LifecycleObjectType {
  return objectType === 'contacts' || objectType === 'companies';
}

function isPipelineType(objectType: ObjectSettingsType): objectType is PipelineObjectType {
  return objectType === 'deals' || objectType === 'tickets' || objectType === 'partnerships';
}

export function ObjectSettingsPage({
  title,
  objectType,
  hideHeader,
}: {
  title: string;
  objectType: ObjectSettingsType;
  hideHeader?: boolean;
}) {
  const tabs = OBJECT_TABS[objectType];
  // Deep-linkable via ?tab= (e.g. setup banners linking straight to
  // ?object=tickets&tab=support-inbox), same pattern as ObjectsPage's
  // ?object= — falls back to this object's first tab if missing/invalid.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabKind | null;
  const activeTab = tabFromUrl && tabs.includes(tabFromUrl) ? tabFromUrl : tabs[0];

  function selectTab(next: TabKind) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div>
      {!hideHeader && (
        <div className="page-header">
          <h1>{title}</h1>
        </div>
      )}

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t}
            className={`detail-tab${activeTab === t ? ' detail-tab--active' : ''}`}
            onClick={() => selectTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {objectType === 'tickets' && <TicketInboxBanner />}
      {objectType === 'invoices' && <InvoiceRemindersBanner />}
      {objectType === 'quotes' && (
        <>
          <QuoteReminderBanner />
          <QuoteCountersignerBanner />
        </>
      )}

      {activeTab === 'lifecycle' && isLifecycleType(objectType) && <LifecycleStagesManager objectType={objectType} />}
      {activeTab === 'pipeline' && isPipelineType(objectType) && <PipelineManager objectType={objectType} />}
      {activeTab === 'support-inbox' && objectType === 'tickets' && <SupportInboxSettings />}
      {activeTab === 'reminder-rules' && objectType === 'invoices' && <InvoiceReminderRulesPage hideHeader />}
      {activeTab === 'invoice-setup' && objectType === 'invoices' && <InvoiceSetupPage hideHeader />}
      {activeTab === 'quote-setup' && objectType === 'quotes' && <QuoteSetupPage hideHeader />}
      {activeTab === 'quote-signature' && objectType === 'quotes' && <QuoteSignatureSettingsPage hideHeader />}
      {activeTab === 'none' && (
        <p style={{ color: 'var(--text-muted)' }}>No settings are configurable for this object yet.</p>
      )}
    </div>
  );
}
