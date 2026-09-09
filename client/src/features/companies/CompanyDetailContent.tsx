import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Building2, ChevronDown, Trash2 } from 'lucide-react';
import { companiesApi } from './api/companies';
import { historyApi } from '../../shared/api/history';
import { AssociatedRecordsPanel } from '../../shared/components/RecordDetail/AssociatedRecordsPanel';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { DealSearchSelect } from '../../shared/components/SearchSelect/DealSearchSelect';
import { LicenseSearchSelect } from '../../shared/components/SearchSelect/LicenseSearchSelect';
import { TicketSearchSelect } from '../../shared/components/SearchSelect/TicketSearchSelect';
import { LicenseStatusBadge } from '../../shared/components/StatusBadge/LicenseStatusBadge';
import { InvoiceStatusBadge } from '../../shared/components/StatusBadge/InvoiceStatusBadge';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { formatQuantity } from '../../shared/utils/numberInput';
import type {
  ActivityAssociationOption,
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  AssociatedInvoice,
  AssociatedLicense,
  AssociatedTicket,
  Company,
  HistoryEntry,
  LogActivityInput,
} from '../../shared/types/index';

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtIndustry(val: string | null) {
  if (!val) return null;
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(val: string | null, currency: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(Number(val));
}

function fmtAmt(val: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

function buildSections(c: Company): SectionDef[] {
  return [
    {
      title: 'Company Information',
      fields: [
        { label: 'Name', value: c.name },
        { label: 'Domain', value: c.domain },
        { label: 'Website', value: c.website },
        { label: 'Phone', value: c.phone },
        { label: 'Industry', value: fmtIndustry(c.industry) },
        { label: 'Lifecycle stage', value: c.lifecyclestage },
        { label: 'Employees', value: formatQuantity(c.numberofemployees) },
        { label: 'Annual revenue', value: fmtCurrency(c.annualrevenue, null) },
      ],
    },
    {
      title: 'Location',
      fields: [
        { label: 'Address', value: c.address },
        { label: 'City', value: c.city },
        { label: 'State', value: c.state },
        { label: 'Zip', value: c.zip },
        { label: 'Country', value: c.country },
      ],
    },
  ];
}

function buildHistoryEvents(c: Company, entries: HistoryEntry[], showSyntheticCreated: boolean): HistoryEvent[] {
  return [
    ...(showSyntheticCreated
      ? [{ date: c.createdate ?? c.createdAt, title: 'Company created', description: 'by System' }]
      : []),
    ...toHistoryEvents(entries),
  ];
}

type Props = {
  // Full-page mode shows a "← Companies" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function CompanyDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [deals, setDeals] = useState<AssociatedDeal[]>([]);
  const [tickets, setTickets] = useState<AssociatedTicket[]>([]);
  const [licenses, setLicenses] = useState<AssociatedLicense[]>([]);
  const [invoices, setInvoices] = useState<AssociatedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('companies', id);

  function loadCompany() {
    if (!id) return;
    companiesApi.getById(id).then(setCompany);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      companiesApi.getById(id),
      companiesApi.getCompanies(id),
      companiesApi.getContacts(id),
      companiesApi.getDeals(id),
      companiesApi.getTickets(id),
      companiesApi.getLicenses(id),
      companiesApi.getInvoices(id),
    ])
      .then(([c, cos, cts, dls, tkts, lics, invs]) => {
        setCompany(c);
        setCompanies(cos);
        setContacts(cts);
        setDeals(dls);
        setTickets(tkts);
        setLicenses(lics);
        setInvoices(invs);
      })
      .catch(() => setError('Company not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function refetchAssociations() {
    if (!id) return;
    const [cos, cts, dls, tkts, lics] = await Promise.all([
      companiesApi.getCompanies(id),
      companiesApi.getContacts(id),
      companiesApi.getDeals(id),
      companiesApi.getTickets(id),
      companiesApi.getLicenses(id),
    ]);
    setCompanies(cos);
    setContacts(cts);
    setDeals(dls);
    setTickets(tkts);
    setLicenses(lics);
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!company) return;
    await historyApi.logActivity('companies', company.id, input);
    timeline.refresh();
  }

  async function handleUpdateActivity(id: string, input: LogActivityInput) {
    if (!company) return;
    await historyApi.updateActivity(id, input);
    timeline.refresh();
  }

  function handleFetchActivityAssociations(id: string) {
    return historyApi.getActivityAssociations(id);
  }

  async function handleDeleteActivity(id: string) {
    if (!company) return;
    await historyApi.deleteActivity(id);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await companiesApi.delete(id);
    navigate('/companies');
  }

  const activityAssociationOptions: ActivityAssociationOption[] = [
    ...contacts.map((c) => ({
      objectType: 'contacts' as const,
      id: c.id,
      label: [c.firstname, c.lastname].filter(Boolean).join(' ') || '—',
    })),
    ...deals.map((d) => ({ objectType: 'deals' as const, id: d.id, label: d.dealname ?? '—' })),
  ];

  if (error) {
    return <div className="page"><div className="alert alert-error">{error}</div></div>;
  }

  // "Company created" is logged to the persisted history table by the create
  // flow itself (with real user attribution) — only fall back to the synced
  // createdAt timestamp for companies that predate that (e.g. HubSpot-synced).
  // Gated on the timeline being fully loaded (no more pages, not mid-fetch)
  // since the real entry — being the oldest — would otherwise only surface
  // on the last page, well after the first page renders.
  const showSyntheticCreated =
    !timeline.isLoading && !timeline.hasMore && !timeline.entries.some((h) => h.title === 'Company created');

  return (
    <>
    <RecordDetail
      title={company?.name ?? ''}
      icon={Building2}
      sections={company ? buildSections(company) : []}
      extraTabs={
        company
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="companies" recordId={company.id} onSaved={loadCompany} /> }]
          : []
      }
      backTo={showBackLink ? '/companies' : undefined}
      backLabel="Companies"
      isLoading={isLoading}
      historyEvents={company ? buildHistoryEvents(company, timeline.entries, showSyntheticCreated) : []}
      activeHistoryTypes={timeline.activeTypes}
      onActiveHistoryTypesChange={timeline.setActiveTypes}
      hasMoreHistory={timeline.hasMore}
      isLoadingMoreHistory={timeline.isLoading}
      onLoadMoreHistory={timeline.loadMore}
      onLogActivity={handleLogActivity}
      activityAssociationOptions={activityAssociationOptions}
      onUpdateActivity={handleUpdateActivity}
      onDeleteActivity={handleDeleteActivity}
      onFetchActivityAssociations={handleFetchActivityAssociations}
      actions={
        <RowActionsMenu
          label="Actions"
          icon={ChevronDown}
          actions={[{ label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => setIsDeleteOpen(true) }]}
        />
      }
      aside={
        company && (
        <>
          <AssociationPanel
            title="Companies"
            items={companies}
            keyExtractor={(c) => c.id}
            itemLabel={(c) => c.name ?? 'this company'}
            renderItem={(c) => (
              <>
                <RecordLink to={`/companies/${c.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {c.name ?? '—'}
                </RecordLink>
                {c.domain && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Domain:{' '}
                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="link" style={{ fontWeight: 600 }}>
                      {c.domain}
                    </a>
                  </div>
                )}
              </>
            )}
            sourceType="companies"
            sourceId={company.id}
            targetType="companies"
            renderPicker={(onSelect) => <CompanySearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
            onChange={refetchAssociations}
          />

          <AssociationPanel
            title="Contacts"
            items={contacts}
            keyExtractor={(c) => c.id}
            itemLabel={(c) => [c.firstname, c.lastname].filter(Boolean).join(' ') || 'this contact'}
            renderItem={(c) => (
              <>
                <RecordLink to={`/contacts/${c.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {[c.firstname, c.lastname].filter(Boolean).join(' ') || '—'}
                </RecordLink>
                {(c.jobtitle || c.company) && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{[c.jobtitle, c.company].filter(Boolean).join(' at ')}</div>
                )}
                {c.email && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Email:{' '}
                    <a href={`mailto:${c.email}`} className="link">
                      {c.email}
                    </a>
                  </div>
                )}
              </>
            )}
            sourceType="companies"
            sourceId={company.id}
            targetType="contacts"
            renderPicker={(onSelect) => <ContactSearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
            onChange={refetchAssociations}
          />

          <AssociationPanel
            title="Deals"
            items={deals}
            keyExtractor={(d) => d.id}
            itemLabel={(d) => d.dealname ?? 'this deal'}
            renderItem={(d) => (
              <>
                <RecordLink to={`/deals/${d.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {d.dealname ?? '—'}
                </RecordLink>
                {d.amount && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Amount: <span style={{ color: '#6b7280' }}>{fmtAmt(d.amount)}</span>
                  </div>
                )}
                {d.closedate && (
                  <div style={{ fontSize: 12 }}>
                    Close date: <span style={{ color: '#6b7280' }}>{fmt(d.closedate)}</span>
                  </div>
                )}
              </>
            )}
            sourceType="companies"
            sourceId={company.id}
            targetType="deals"
            renderPicker={(onSelect) => <DealSearchSelect value={null} onChange={(d) => d && onSelect(d.id)} />}
            onChange={refetchAssociations}
          />

          <AssociationPanel
            title="Tickets"
            items={tickets}
            keyExtractor={(t) => t.id}
            itemLabel={(t) => t.subject ?? 'this ticket'}
            renderItem={(t) => (
              <>
                <RecordLink to={`/tickets/${t.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {t.subject ?? '—'}
                </RecordLink>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {[t.hsPipelineStage, t.hsTicketPriority].filter(Boolean).join(' · ') || '—'}
                </div>
                {t.createdAt && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{fmt(t.createdAt)}</div>
                )}
              </>
            )}
            sourceType="companies"
            sourceId={company.id}
            targetType="tickets"
            renderPicker={(onSelect) => <TicketSearchSelect value={null} onChange={(t) => t && onSelect(t.id)} />}
            onChange={refetchAssociations}
          />

          <AssociationPanel
            title="Licenses"
            items={licenses}
            keyExtractor={(l) => l.id}
            itemLabel={(l) => l.name ?? 'this license'}
            renderItem={(l) => (
              <>
                <RecordLink to={`/licenses/${l.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {l.name ?? '—'}
                </RecordLink>
                <div style={{ fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LicenseStatusBadge status={l.status} />
                  {l.customerName && <span style={{ color: '#6b7280' }}>{l.customerName}</span>}
                  {!l.status && !l.customerName && <span style={{ color: '#6b7280' }}>—</span>}
                </div>
                {l.expirationDate && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Expires {fmt(l.expirationDate)}</div>
                )}
              </>
            )}
            sourceType="companies"
            sourceId={company.id}
            targetType="licenses"
            renderPicker={(onSelect) => <LicenseSearchSelect value={null} onChange={(l) => l && onSelect(l.id)} />}
            onChange={refetchAssociations}
          />

          <AssociatedRecordsPanel
            title="Invoices"
            items={invoices}
            keyExtractor={(inv) => inv.id}
            renderItem={(inv) => (
              <>
                <RecordLink to={`/invoices/${inv.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {inv.hsNumber ?? '—'}
                </RecordLink>
                <div style={{ fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InvoiceStatusBadge status={inv.hsInvoiceStatus} />
                  {fmtCurrency(inv.hsBalanceDue, inv.hsCurrency) && (
                    <span style={{ color: '#6b7280' }}>{fmtCurrency(inv.hsBalanceDue, inv.hsCurrency)}</span>
                  )}
                  {!inv.hsInvoiceStatus && !fmtCurrency(inv.hsBalanceDue, inv.hsCurrency) && <span style={{ color: '#6b7280' }}>—</span>}
                </div>
                {inv.hsDueDate && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Due {fmt(inv.hsDueDate)}</div>
                )}
              </>
            )}
          />
        </>
        )
      }
    />

    {isDeleteOpen && company && (
      <ConfirmDialog
        title="Delete Company?"
        message={`You are about to delete ${company.name || 'this company'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}
    </>
  );
}
