import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { ChevronDown, Ticket as TicketIcon, Trash2 } from 'lucide-react';
import { ticketsApi } from './api/tickets';
import { historyApi } from '../../shared/api/history';
import { pipelinesApi } from '../../shared/api/pipelines';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { ExpandableText } from '../../shared/components/ExpandableText/ExpandableText';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { DealSearchSelect } from '../../shared/components/SearchSelect/DealSearchSelect';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { TicketConversationPanel } from './TicketConversationPanel';
import { TicketFieldsPanel } from './TicketFieldsPanel';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { htmlToPlainText } from '../../shared/utils/htmlToPlainText';
import { lookupPipelineLabel, lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type {
  ActivityAssociationOption,
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  HistoryEntry,
  LogActivityInput,
  LoggableActivityType,
  PipelineWithStages,
  Ticket,
} from '../../shared/types/index';

// Tickets aren't "people you'd call or meet with" the way a contact/deal is —
// only Note makes sense here (see RecordDetail's loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtAmt(val: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

// Ticket's own fields, shown in the persistent right rail (alongside
// Contacts/Companies/Deals) now that the Information tab's main content is
// the email conversation instead.
function buildTicketFields(t: Ticket, pipelines: PipelineWithStages[]) {
  return [
    { label: 'Priority', value: t.hsTicketPriority },
    { label: 'Category', value: t.hsTicketCategory },
    { label: 'Pipeline', value: lookupPipelineLabel(pipelines, t.hsPipeline) ?? t.hsPipeline },
    { label: 'Stage', value: lookupStageLabel(pipelines, t.hsPipeline, t.hsPipelineStage) ?? t.hsPipelineStage },
    {
      label: 'Description',
      value: t.content ? <ExpandableText text={htmlToPlainText(t.content)} limit={300} /> : null,
    },
  ];
}

function buildHistoryEvents(t: Ticket, entries: HistoryEntry[], showSyntheticCreated: boolean): HistoryEvent[] {
  return [
    ...(showSyntheticCreated ? [{ date: t.createdAt, title: 'Ticket created', description: 'by System' }] : []),
    ...toHistoryEvents(entries),
  ];
}

// Conversation panel's max backend page size (see history.schema.ts).
const CONVERSATION_LIMIT = 100;

type Props = {
  // Full-page mode shows a "← Tickets" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function TicketDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [deals, setDeals] = useState<AssociatedDeal[]>([]);
  // The conversation panel needs the full email thread (independent of the
  // Activities tab's type filter/pagination), so it's fetched separately
  // rather than sharing the useHistoryTimeline hook below.
  const [conversation, setConversation] = useState<HistoryEntry[]>([]);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('tickets', id);

  function loadTicket() {
    if (!id) return;
    ticketsApi.getById(id).then(setTicket);
  }

  function refreshConversation() {
    if (!id) return;
    historyApi
      .listForRecord('tickets', id, { types: ['email'], limit: CONVERSATION_LIMIT })
      .then((page) => setConversation(page.entries));
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      ticketsApi.getById(id),
      ticketsApi.getContacts(id),
      ticketsApi.getCompanies(id),
      ticketsApi.getDeals(id),
      pipelinesApi.list('tickets'),
    ])
      .then(([t, cts, cos, dls, pipes]) => {
        setTicket(t);
        setContacts(cts);
        setCompanies(cos);
        setDeals(dls);
        setPipelines(pipes);
      })
      .catch(() => setError('Ticket not found'))
      .finally(() => setIsLoading(false));
    refreshConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refetchAssociations() {
    if (!id) return;
    const [cts, cos, dls] = await Promise.all([ticketsApi.getContacts(id), ticketsApi.getCompanies(id), ticketsApi.getDeals(id)]);
    setContacts(cts);
    setCompanies(cos);
    setDeals(dls);
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!ticket) return;
    await historyApi.logActivity('tickets', ticket.id, input);
    timeline.refresh();
  }

  async function handleUpdateActivity(id: string, input: LogActivityInput) {
    await historyApi.updateActivity(id, input);
    timeline.refresh();
  }

  function handleFetchActivityAssociations(id: string) {
    return historyApi.getActivityAssociations(id);
  }

  async function handleDelete() {
    if (!id) return;
    await ticketsApi.delete(id);
    navigate('/tickets');
  }

  // Lets a note logged on this ticket also be tagged onto its associated
  // contacts/companies/deals — same cross-object association mechanism
  // already used by Contact/Company/Deal (see LogActivityModal).
  const activityAssociationOptions: ActivityAssociationOption[] = [
    ...contacts.map((c) => ({
      objectType: 'contacts' as const,
      id: c.id,
      label: [c.firstname, c.lastname].filter(Boolean).join(' ') || '—',
    })),
    ...companies.map((c) => ({ objectType: 'companies' as const, id: c.id, label: c.name ?? '—' })),
    ...deals.map((d) => ({ objectType: 'deals' as const, id: d.id, label: d.dealname ?? '—' })),
  ];

  if (error) {
    return <div className="page"><div className="alert alert-error">{error}</div></div>;
  }

  // "Ticket created" is logged to the persisted history table by the create
  // flow itself (with real user attribution) — only fall back to the synced
  // createdAt timestamp for tickets that predate that (e.g. HubSpot-synced).
  // Gated on the timeline being fully loaded (no more pages, not mid-fetch)
  // since the real entry — being the oldest — would otherwise only surface
  // on the last page, well after the first page renders.
  const showSyntheticCreated =
    !timeline.isLoading && !timeline.hasMore && !timeline.entries.some((h) => h.title === 'Ticket created');

  return (
    <>
    <RecordDetail
      title={ticket?.subject ?? ''}
      icon={TicketIcon}
      sections={[]}
      backTo={showBackLink ? '/tickets' : undefined}
      backLabel="Tickets"
      isLoading={isLoading}
      historyEvents={ticket ? buildHistoryEvents(ticket, timeline.entries, showSyntheticCreated) : []}
      activeHistoryTypes={timeline.activeTypes}
      onActiveHistoryTypesChange={timeline.setActiveTypes}
      hasMoreHistory={timeline.hasMore}
      isLoadingMoreHistory={timeline.isLoading}
      onLoadMoreHistory={timeline.loadMore}
      onLogActivity={handleLogActivity}
      loggableActivityTypes={NOTE_ONLY}
      activityAssociationOptions={activityAssociationOptions}
      onUpdateActivity={handleUpdateActivity}
      onFetchActivityAssociations={handleFetchActivityAssociations}
      actions={
        <RowActionsMenu
          label="Actions"
          icon={ChevronDown}
          actions={[{ label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => setIsDeleteOpen(true) }]}
        />
      }
      informationTabLabel="Conversation"
      extraTabs={
        ticket
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="tickets" recordId={ticket.id} onSaved={loadTicket} /> }]
          : []
      }
      informationContent={
        ticket ? (
          <TicketConversationPanel
            ticketId={ticket.id}
            history={conversation}
            onSent={() => {
              refreshConversation();
              timeline.refresh();
            }}
          />
        ) : undefined
      }
      aside={
        <>
          {ticket && <TicketFieldsPanel fields={buildTicketFields(ticket, pipelines)} />}

          {ticket && (
            <>
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
                sourceType="tickets"
                sourceId={ticket.id}
                targetType="contacts"
                renderPicker={(onSelect) => <ContactSearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
                onChange={refetchAssociations}
              />

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
                sourceType="tickets"
                sourceId={ticket.id}
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
                        Close date: <span style={{ color: '#6b7280' }}>{fmt(d.closedate)}</span>
                      </div>
                    )}
                  </>
                )}
                sourceType="tickets"
                sourceId={ticket.id}
                targetType="deals"
                renderPicker={(onSelect) => <DealSearchSelect value={null} onChange={(d) => d && onSelect(d.id)} />}
                onChange={refetchAssociations}
              />
            </>
          )}
        </>
      }
    />

    {isDeleteOpen && ticket && (
      <ConfirmDialog
        title="Delete Ticket?"
        message={`You are about to delete ${ticket.subject || 'this ticket'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}
    </>
  );
}
