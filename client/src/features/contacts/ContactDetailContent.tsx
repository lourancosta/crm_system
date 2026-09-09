import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { ChevronDown, Trash2, User } from 'lucide-react';
import { contactsApi } from './api/contacts';
import { historyApi } from '../../shared/api/history';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { DealSearchSelect } from '../../shared/components/SearchSelect/DealSearchSelect';
import { PartnershipSearchSelect } from '../../shared/components/SearchSelect/PartnershipSearchSelect';
import { TicketSearchSelect } from '../../shared/components/SearchSelect/TicketSearchSelect';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import type {
  ActivityAssociationOption,
  AssociatedCompany,
  AssociatedDeal,
  AssociatedPartnership,
  AssociatedTicket,
  Contact,
  LogActivityInput,
} from '../../shared/types/index';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fmtAmt(val: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

type Props = {
  // Full-page mode shows a "← Contacts" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this to match the Bitrix24-style reference (no redundant back nav).
  showBackLink?: boolean;
};

// The actual contact-detail content (data fetching + RecordDetail rendering),
// with no assumptions about its container. Rendered directly by
// ContactDetailPage.tsx (full page) and by ContactPanel.tsx (slide-over) —
// same logic either way, only the chrome around it differs.
export function ContactDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [deals, setDeals] = useState<AssociatedDeal[]>([]);
  const [partnerships, setPartnerships] = useState<AssociatedPartnership[]>([]);
  const [tickets, setTickets] = useState<AssociatedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('contacts', id);

  function loadContact() {
    if (!id) return;
    contactsApi.getById(id).then(setContact);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      contactsApi.getById(id),
      contactsApi.getCompanies(id),
      contactsApi.getDeals(id),
      contactsApi.getPartnerships(id),
      contactsApi.getTickets(id),
    ])
      .then(([c, cos, dls, prts, tkts]) => {
        setContact(c);
        setCompanies(cos);
        setDeals(dls);
        setPartnerships(prts);
        setTickets(tkts);
      })
      .catch(() => setError('Contact not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function refetchAssociations() {
    if (!id) return;
    const [cos, dls, prts, tkts] = await Promise.all([
      contactsApi.getCompanies(id),
      contactsApi.getDeals(id),
      contactsApi.getPartnerships(id),
      contactsApi.getTickets(id),
    ]);
    setCompanies(cos);
    setDeals(dls);
    setPartnerships(prts);
    setTickets(tkts);
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!contact) return;
    await historyApi.logActivity('contacts', contact.id, input);
    timeline.refresh();
  }

  async function handleUpdateActivity(id: string, input: LogActivityInput) {
    if (!contact) return;
    await historyApi.updateActivity(id, input);
    timeline.refresh();
  }

  function handleFetchActivityAssociations(id: string) {
    return historyApi.getActivityAssociations(id);
  }

  async function handleDeleteActivity(id: string) {
    if (!contact) return;
    await historyApi.deleteActivity(id);
    timeline.refresh();
  }

  const activityAssociationOptions: ActivityAssociationOption[] = [
    ...companies.map((c) => ({ objectType: 'companies' as const, id: c.id, label: c.name ?? '—' })),
    ...deals.map((d) => ({ objectType: 'deals' as const, id: d.id, label: d.dealname ?? '—' })),
  ];

  async function handleDelete() {
    if (!contact) return;
    await contactsApi.delete(contact.id);
    navigate('/');
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const fullName = contact
    ? [contact.firstname, contact.lastname].filter(Boolean).join(' ')
    : '';

  const sections: SectionDef[] = contact
    ? [
        {
          title: 'Contact Information',
          fields: [
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone },
            { label: 'Mobile', value: contact.mobilephone },
            { label: 'Company', value: contact.company },
            { label: 'Job title', value: contact.jobtitle },
            { label: 'Website', value: contact.website },
          ],
        },
        {
          title: 'Location',
          fields: [
            { label: 'Address', value: contact.address },
            { label: 'City', value: contact.city },
            { label: 'State', value: contact.state },
            { label: 'Zip', value: contact.zip },
            { label: 'Country', value: contact.country },
          ],
        },
        {
          title: 'CRM Info',
          fields: [
            { label: 'Lifecycle stage', value: contact.lifecyclestage },
            { label: 'Lead status', value: contact.hsLeadStatus },
          ],
        },
      ]
    : [];

  // "Contact created" is logged to the persisted history table by the create
  // flow itself (with real user attribution) — only fall back to the synced
  // createdAt timestamp for contacts that predate that (e.g. HubSpot-synced).
  // Gated on the timeline being fully loaded (no more pages, not mid-fetch)
  // since the real entry — being the oldest — would otherwise only surface
  // on the last page, well after the first page renders.
  const showSyntheticCreated =
    !timeline.isLoading && !timeline.hasMore && !timeline.entries.some((h) => h.title === 'Contact created');
  const historyEvents: HistoryEvent[] = contact
    ? [
        ...(showSyntheticCreated ? [{ date: contact.createdAt, title: 'Contact created', description: 'by System' }] : []),
        ...toHistoryEvents(timeline.entries),
      ]
    : [];

  return (
    <>
      <RecordDetail
        title={fullName}
        icon={User}
        sections={sections}
        extraTabs={
          contact
            ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="contacts" recordId={contact.id} onSaved={loadContact} /> }]
            : []
        }
        backTo={showBackLink ? '/contacts' : undefined}
        backLabel="Contacts"
        isLoading={isLoading}
        historyEvents={historyEvents}
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
          contact && (
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
              sourceType="contacts"
              sourceId={contact!.id}
              targetType="companies"
              renderPicker={(onSelect) => <CompanySearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
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
                      Close date: <span style={{ color: '#6b7280' }}>{formatDate(d.closedate)}</span>
                    </div>
                  )}
                </>
              )}
              sourceType="contacts"
              sourceId={contact!.id}
              targetType="deals"
              renderPicker={(onSelect) => <DealSearchSelect value={null} onChange={(d) => d && onSelect(d.id)} />}
              onChange={refetchAssociations}
            />

            <AssociationPanel
              title="Partnerships"
              items={partnerships}
              keyExtractor={(p) => p.id}
              itemLabel={(p) => p.name ?? 'this partnership'}
              renderItem={(p) => (
                <>
                  <RecordLink to={`/partnerships/${p.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                    {p.name ?? '—'}
                  </RecordLink>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {[p.typeObj, p.mspLevel].filter(Boolean).join(' · ') || '—'}
                  </div>
                </>
              )}
              sourceType="contacts"
              sourceId={contact!.id}
              targetType="partnerships"
              renderPicker={(onSelect) => <PartnershipSearchSelect value={null} onChange={(p) => p && onSelect(p.id)} />}
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
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{formatDate(t.createdAt)}</div>
                  )}
                </>
              )}
              sourceType="contacts"
              sourceId={contact!.id}
              targetType="tickets"
              renderPicker={(onSelect) => <TicketSearchSelect value={null} onChange={(t) => t && onSelect(t.id)} />}
              onChange={refetchAssociations}
            />
            </>
          )
        }
      />

      {isDeleteOpen && contact && (
        <ConfirmDialog
          title="Delete Contact?"
          message={`You are about to delete ${fullName || 'this contact'}. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
