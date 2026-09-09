import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { ChevronDown, Eye, Handshake, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { dealsApi } from './api/deals';
import { quotesApi } from '../quotes/api/quotes';
import { historyApi } from '../../shared/api/history';
import { pipelinesApi } from '../../shared/api/pipelines';
import { AssociatedRecordsPanel } from '../../shared/components/RecordDetail/AssociatedRecordsPanel';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { InvoiceSearchSelect } from '../../shared/components/SearchSelect/InvoiceSearchSelect';
import { CreateQuoteWizard } from '../quotes/wizard/CreateQuoteWizard';
import { AutomaticQuoteModal } from '../quotes/wizard/AutomaticQuoteModal';
import { InvoiceActionsMenu } from '../invoices/InvoiceActionsMenu';
import { QuoteStatusBadge } from '../../shared/components/StatusBadge/QuoteStatusBadge';
import { InvoiceStatusBadge } from '../../shared/components/StatusBadge/InvoiceStatusBadge';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { lookupPipelineLabel, lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type {
  ActivityAssociationOption,
  AssociatedCompany,
  AssociatedContact,
  AssociatedInvoice,
  AssociatedQuote,
  Deal,
  HistoryEntry,
  LogActivityInput,
  PipelineWithStages,
} from '../../shared/types/index';

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtCurrency(val: string | null, currency: string | null = 'USD') {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(Number(val));
}

function fmtModules(raw: string | null) {
  if (!raw) return null;
  return raw.split(';').map((m) => m.trim()).filter(Boolean).join(', ');
}

function buildSections(d: Deal, pipelines: PipelineWithStages[]): SectionDef[] {
  return [
    {
      title: 'Deal Information',
      fields: [
        { label: 'Deal name', value: d.dealname },
        { label: 'Pipeline', value: lookupPipelineLabel(pipelines, d.pipeline) ?? d.pipeline },
        { label: 'Stage', value: lookupStageLabel(pipelines, d.pipeline, d.dealstage) ?? d.dealstage },
        { label: 'Amount', value: fmtCurrency(d.amount) },
        { label: 'Close date', value: fmt(d.closedate) },
        { label: 'Modules', value: fmtModules(d.certificationModules) },
        { label: 'Owner', value: d.controllerDealOwnerName },
      ],
    },
  ];
}

function buildHistoryEvents(d: Deal, entries: HistoryEntry[], showSyntheticCreated: boolean): HistoryEvent[] {
  return [
    ...(showSyntheticCreated
      ? [{ date: d.createdate ?? d.createdAt, title: 'Deal created', description: 'by System' }]
      : []),
    ...toHistoryEvents(entries),
  ];
}

type Props = {
  // Full-page mode shows a "← Deals" back link since it's the only way out;
  // the slide-over panel already has its own close affordance, so it omits
  // this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function DealDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [quotes, setQuotes] = useState<AssociatedQuote[]>([]);
  const [invoices, setInvoices] = useState<AssociatedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [isAutomaticQuoteOpen, setIsAutomaticQuoteOpen] = useState(false);
  const [resumeQuoteId, setResumeQuoteId] = useState<string | null>(null);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<AssociatedQuote | null>(null);
  const [recallQuoteTarget, setRecallQuoteTarget] = useState<AssociatedQuote | null>(null);

  const timeline = useHistoryTimeline('deals', id);

  function loadDeal() {
    if (!id) return;
    dealsApi.getById(id).then(setDeal);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      dealsApi.getById(id),
      pipelinesApi.list('deals'),
      dealsApi.getCompanies(id),
      dealsApi.getContacts(id),
      dealsApi.getQuotes(id),
      dealsApi.getInvoices(id),
    ])
      .then(([d, pipes, cos, cts, qts, invs]) => {
        setDeal(d);
        setPipelines(pipes);
        setCompanies(cos);
        setContacts(cts);
        setQuotes(qts);
        setInvoices(invs);
      })
      .catch(() => setError('Deal not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function refetchAssociations() {
    if (!id) return;
    const [cos, cts, invs] = await Promise.all([
      dealsApi.getCompanies(id),
      dealsApi.getContacts(id),
      dealsApi.getInvoices(id),
    ]);
    setCompanies(cos);
    setContacts(cts);
    setInvoices(invs);
  }

  function refetchQuotes() {
    if (!id) return;
    dealsApi.getQuotes(id).then(setQuotes);
  }

  async function handleDeleteQuote() {
    if (!deleteQuoteTarget) return;
    await quotesApi.delete(deleteQuoteTarget.id);
    setDeleteQuoteTarget(null);
    refetchQuotes();
  }

  // Recalls the quote to Draft (its public link stops working — see
  // public.routes.ts's requirePublishedQuote) and immediately reopens the
  // wizard to edit it, matching QuoteDetailContent.tsx's "Recall & edit".
  async function handleRecallQuote() {
    if (!recallQuoteTarget) return;
    await quotesApi.recall(recallQuoteTarget.id);
    setEditQuoteId(recallQuoteTarget.id);
    setRecallQuoteTarget(null);
    refetchQuotes();
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!deal) return;
    await historyApi.logActivity('deals', deal.id, input);
    timeline.refresh();
  }

  async function handleUpdateActivity(id: string, input: LogActivityInput) {
    if (!deal) return;
    await historyApi.updateActivity(id, input);
    timeline.refresh();
  }

  function handleFetchActivityAssociations(id: string) {
    return historyApi.getActivityAssociations(id);
  }

  async function handleDeleteActivity(id: string) {
    if (!deal) return;
    await historyApi.deleteActivity(id);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await dealsApi.delete(id);
    navigate('/deals');
  }

  const activityAssociationOptions: ActivityAssociationOption[] = [
    ...companies.map((c) => ({ objectType: 'companies' as const, id: c.id, label: c.name ?? '—' })),
    ...contacts.map((c) => ({
      objectType: 'contacts' as const,
      id: c.id,
      label: [c.firstname, c.lastname].filter(Boolean).join(' ') || '—',
    })),
  ];

  if (error) {
    return <div className="page"><div className="alert alert-error">{error}</div></div>;
  }

  // "Deal created" is logged to the persisted history table by the create
  // flow itself (with real user attribution) — only fall back to the synced
  // createdAt timestamp for deals that predate that (e.g. HubSpot-synced).
  // Gated on the timeline being fully loaded (no more pages, not mid-fetch)
  // since the real entry — being the oldest — would otherwise only surface
  // on the last page, well after the first page renders.
  const showSyntheticCreated =
    !timeline.isLoading && !timeline.hasMore && !timeline.entries.some((h) => h.title === 'Deal created');

  return (
    <>
    <RecordDetail
      title={deal?.dealname ?? ''}
      icon={Handshake}
      sections={deal ? buildSections(deal, pipelines) : []}
      extraTabs={
        deal
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="deals" recordId={deal.id} onSaved={loadDeal} /> }]
          : []
      }
      backTo={showBackLink ? '/deals' : undefined}
      backLabel="Deals"
      isLoading={isLoading}
      historyEvents={deal ? buildHistoryEvents(deal, timeline.entries, showSyntheticCreated) : []}
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
        deal && (
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
            sourceType="deals"
            sourceId={deal.id}
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
            sourceType="deals"
            sourceId={deal.id}
            targetType="contacts"
            renderPicker={(onSelect) => <ContactSearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
            onChange={refetchAssociations}
          />

          <AssociatedRecordsPanel
            title="Quotes"
            items={quotes}
            keyExtractor={(q) => q.id}
            renderItem={(q) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RecordLink to={`/quotes/${q.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                    {q.hsTitle ?? q.hsQuoteNumber ?? '—'}
                  </RecordLink>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <QuoteStatusBadge status={q.hsQuoteStatus} isSigned={q.isSigned} />
                    {fmtCurrency(q.hsQuoteAmount, q.hsCurrency) && (
                      <span style={{ color: '#6b7280' }}>{fmtCurrency(q.hsQuoteAmount, q.hsCurrency)}</span>
                    )}
                    {!q.hsQuoteStatus && !fmtCurrency(q.hsQuoteAmount, q.hsCurrency) && <span style={{ color: '#6b7280' }}>—</span>}
                  </div>
                  {q.isSigned && q.hsSignedDate ? (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Signed {fmt(q.hsSignedDate)}</div>
                  ) : (
                    q.hsExpirationDate && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Expires {fmt(q.hsExpirationDate)}</div>
                    )
                  )}
                </div>
                <RowActionsMenu
                  actions={[
                    // Its public link 404s while the quote is Draft (see
                    // public.routes.ts's requirePublishedQuote) — no point
                    // offering a preview that won't load. Mirrors
                    // QuoteDetailContent.tsx's own Actions menu rules exactly.
                    ...(q.hsQuoteStatus !== 'DRAFT'
                      ? [{ label: 'Preview', icon: Eye, onClick: () => window.open(`/quotes/${q.id}/preview`, '_blank') }]
                      : []),
                    // A signed quote is a finalized, signed contract — never
                    // editable again, recall included.
                    ...(q.isSigned
                      ? []
                      : [
                          q.hsQuoteStatus === 'PUBLISHED' || q.hsQuoteStatus === 'EXPIRED'
                            ? { label: 'Recall & edit', icon: RotateCcw, onClick: () => setRecallQuoteTarget(q) }
                            : { label: 'Edit', icon: Pencil, onClick: () => setEditQuoteId(q.id) },
                        ]),
                    { label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: () => setDeleteQuoteTarget(q) },
                  ]}
                />
              </div>
            )}
            headerAction={
              // Unlike AssociationPanel's "+ Add" (which associates an
              // *existing* record), quotes are never freely associated —
              // this always starts a brand-new quote for this deal, either
              // built by hand (Manual, via CreateQuoteWizard's initialDeal
              // prop) or generated from a billing profile + product list
              // (Automatic, via AutomaticQuoteModal), never a picker over
              // already-created quotes.
              <RowActionsMenu
                label="+ Add"
                actions={[
                  { label: 'Manual', onClick: () => setIsCreateQuoteOpen(true) },
                  { label: 'Automatic', onClick: () => setIsAutomaticQuoteOpen(true) },
                ]}
              />
            }
          />

          <AssociationPanel
            title="Invoices"
            items={invoices}
            keyExtractor={(inv) => inv.id}
            itemLabel={(inv) => inv.hsNumber ?? 'this invoice'}
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
            rowAction={(inv) => <InvoiceActionsMenu invoice={inv} onChange={refetchAssociations} />}
            sourceType="deals"
            sourceId={deal.id}
            targetType="invoices"
            renderPicker={(onSelect) => <InvoiceSearchSelect value={null} onChange={(inv) => inv && onSelect(inv.id)} />}
            onChange={refetchAssociations}
          />
        </>
        )
      }
    />

    {isCreateQuoteOpen && deal && (
      <CreateQuoteWizard
        initialDeal={deal}
        onClose={() => {
          setIsCreateQuoteOpen(false);
          refetchQuotes();
        }}
      />
    )}

    {isAutomaticQuoteOpen && deal && (
      <AutomaticQuoteModal
        deal={deal}
        onClose={() => setIsAutomaticQuoteOpen(false)}
        onCreated={(newQuoteId) => {
          setIsAutomaticQuoteOpen(false);
          setResumeQuoteId(newQuoteId);
        }}
      />
    )}

    {resumeQuoteId && deal && (
      <CreateQuoteWizard
        initialDeal={deal}
        resumeQuoteId={resumeQuoteId}
        onClose={() => {
          setResumeQuoteId(null);
          refetchQuotes();
        }}
      />
    )}

    {editQuoteId && (
      <CreateQuoteWizard
        editQuoteId={editQuoteId}
        onClose={() => {
          setEditQuoteId(null);
          refetchQuotes();
        }}
      />
    )}

    {deleteQuoteTarget && (
      <ConfirmDialog
        title="Delete Quote?"
        message={`You are about to delete ${deleteQuoteTarget.hsTitle ?? deleteQuoteTarget.hsQuoteNumber ?? 'this quote'}. This can't be undone.`}
        onConfirm={handleDeleteQuote}
        onCancel={() => setDeleteQuoteTarget(null)}
      />
    )}

    {recallQuoteTarget && (
      <ConfirmDialog
        title="Recall Quote?"
        message="This quote will return to Draft status and its public link will stop working until it's created again."
        confirmLabel="Recall & edit"
        onConfirm={handleRecallQuote}
        onCancel={() => setRecallQuoteTarget(null)}
      />
    )}

    {isDeleteOpen && deal && (
      <ConfirmDialog
        title="Delete Deal?"
        message={`You are about to delete ${deal.dealname || 'this deal'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}
    </>
  );
}
